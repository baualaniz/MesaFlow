import { FirebaseError, deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
  updateProfile
} from "firebase/auth";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  writeBatch
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { adminEnvironment, adminFirebaseOptions } from "../config/environment";
import { adminFirestore, adminFunctions } from "../firebase/firebase";
import type { AdminRole } from "../tenant/tenant-model";
import { parseAdminTeamMember, parseTeamList, type AdminTeamMember } from "./team-model";

interface CallableResult {
  readonly action: string;
  readonly member?: unknown;
  readonly members?: unknown;
  readonly targetUid?: string;
  readonly updatedAt?: string;
}

const ROLE_PERMISSIONS: Readonly<Record<AdminRole, readonly string[]>> = Object.freeze({
  owner: Object.freeze(["establishment.manage", "menu.manage", "orders.manage", "metrics.read"]),
  manager: Object.freeze(["menu.manage", "orders.manage", "metrics.read"]),
  staff: Object.freeze(["orders.manage", "assistance.manage"]),
  kitchen: Object.freeze(["orders.prepare"])
});
const useAcademicFirestore = adminEnvironment !== "emulator";
const callable = httpsCallable<Record<string, unknown>, CallableResult>(adminFunctions, "manageTeam");

function requestId(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((value) => value.toString(16).padStart(2, "0")).join("");
}

function temporaryPassword(): string {
  const random = [...crypto.getRandomValues(new Uint8Array(24))]
    .map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${random}aA1!`;
}

function teamError(error: unknown): Error {
  if (error instanceof Error && !(error instanceof FirebaseError)) return error;
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied" || error.code === "functions/permission-denied") {
      return new Error("Tu rol ya no permite administrar el equipo.", { cause: error });
    }
    if (error.code === "auth/email-already-in-use") {
      return new Error("Ya existe una cuenta con ese correo. Usá otra dirección.", { cause: error });
    }
    if (error.code === "functions/failed-precondition") {
      return new Error(error.message || "La membresía cambió en otro dispositivo.", { cause: error });
    }
    if (error.code === "functions/already-exists") {
      return new Error("La persona ya pertenece a este equipo.", { cause: error });
    }
    if (error.code === "functions/not-found") {
      return new Error("La persona ya no pertenece al equipo.", { cause: error });
    }
  }
  return new Error("No pudimos administrar el equipo. Intentá nuevamente.", { cause: error });
}

async function execute(input: Record<string, unknown>): Promise<CallableResult> {
  try {
    return (await callable(input)).data;
  } catch (error) {
    throw teamError(error);
  }
}

function timestamp(value: unknown, label: string): string {
  if (!(value instanceof Timestamp)) throw new TypeError(`${label} no es una fecha válida.`);
  return value.toDate().toISOString();
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} no es válido.`);
  }
  return value.trim();
}

async function loadAcademicTeam(establishmentId: string): Promise<readonly AdminTeamMember[]> {
  try {
    const [membersSnapshot, profilesSnapshot] = await Promise.all([
      getDocs(query(
        collection(adminFirestore, "establishments", establishmentId, "members"),
        orderBy("createdAt", "desc"),
        limit(101)
      )),
      getDocs(query(
        collection(adminFirestore, "establishments", establishmentId, "teamProfiles"),
        limit(101)
      ))
    ]);
    if (membersSnapshot.size > 100 || profilesSnapshot.size > 100) {
      throw new Error("El equipo supera el límite operativo de 100 miembros.");
    }
    const profiles = new Map(profilesSnapshot.docs.map((profile) => [profile.id, profile.data()]));
    return Object.freeze(membersSnapshot.docs.map((member) => {
      const membership = member.data();
      const profile = profiles.get(member.id);
      if (!profile || profile.establishmentId !== establishmentId || profile.uid !== member.id) {
        throw new TypeError(`Falta el perfil de equipo para ${member.id}.`);
      }
      return parseAdminTeamMember({
        uid: member.id,
        displayName: text(profile.displayName, "displayName"),
        email: text(profile.email, "email"),
        role: membership.role,
        permissions: membership.permissions,
        active: membership.active,
        createdAt: timestamp(membership.createdAt, "createdAt"),
        updatedAt: timestamp(membership.updatedAt, "updatedAt")
      });
    }));
  } catch (error) {
    throw teamError(error);
  }
}

export async function loadTeam(establishmentId: string): Promise<readonly AdminTeamMember[]> {
  if (useAcademicFirestore) return loadAcademicTeam(establishmentId);
  const result = await execute({ action: "list", establishmentId });
  if (result.action !== "list") throw new TypeError("La Function devolvió una acción inesperada.");
  return parseTeamList(result.members);
}

async function inviteAcademicTeamMember(
  establishmentId: string,
  displayName: string,
  email: string,
  role: AdminRole
): Promise<AdminTeamMember> {
  const app = initializeApp(adminFirebaseOptions, `team-invite-${requestId()}`);
  const auth = getAuth(app);
  let invitedUser: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>["user"] | null = null;
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, temporaryPassword());
    invitedUser = credential.user;
    await updateProfile(invitedUser, { displayName });
    const now = Timestamp.now();
    const permissions = [...ROLE_PERMISSIONS[role]];
    const batch = writeBatch(adminFirestore);
    batch.set(doc(adminFirestore, "users", invitedUser.uid), {
      createdAt: now,
      displayName,
      email,
      establishmentIds: [establishmentId],
      updatedAt: now
    });
    batch.set(doc(
      adminFirestore, "establishments", establishmentId, "members", invitedUser.uid
    ), {
      active: true,
      createdAt: now,
      establishmentId,
      permissions,
      role,
      uid: invitedUser.uid,
      updatedAt: now
    });
    batch.set(doc(
      adminFirestore, "establishments", establishmentId, "teamProfiles", invitedUser.uid
    ), {
      createdAt: now,
      displayName,
      email,
      establishmentId,
      uid: invitedUser.uid,
      updatedAt: now
    });
    await batch.commit();
    return parseAdminTeamMember({
      uid: invitedUser.uid,
      displayName,
      email,
      role,
      permissions,
      active: true,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString()
    });
  } catch (error) {
    if (invitedUser !== null) await deleteUser(invitedUser).catch(() => undefined);
    throw teamError(error);
  } finally {
    await signOut(auth).catch(() => undefined);
    await deleteApp(app);
  }
}

export async function inviteTeamMember(
  establishmentId: string,
  displayName: string,
  email: string,
  role: AdminRole
): Promise<AdminTeamMember> {
  if (useAcademicFirestore) {
    return inviteAcademicTeamMember(establishmentId, displayName, email, role);
  }
  const result = await execute({
    action: "invite", displayName, email, establishmentId, requestId: requestId(), role
  });
  if (result.action !== "invite") throw new TypeError("La Function devolvió una acción inesperada.");
  return parseAdminTeamMember(result.member);
}

async function updateAcademicTeamMember(
  establishmentId: string,
  member: AdminTeamMember,
  role: AdminRole,
  active: boolean
): Promise<void> {
  try {
    const reference = doc(
      adminFirestore, "establishments", establishmentId, "members", member.uid
    );
    await runTransaction(adminFirestore, async (transaction) => {
      const snapshot = await transaction.get(reference);
      const current = snapshot.data();
      if (!current || timestamp(current.updatedAt, "updatedAt") !== member.updatedAt.toISOString()) {
        throw new Error("La membresía cambió en otro dispositivo. Actualizá la página.");
      }
      transaction.update(reference, {
        active,
        permissions: [...ROLE_PERMISSIONS[role]],
        role,
        updatedAt: Timestamp.now()
      });
    });
  } catch (error) {
    throw teamError(error);
  }
}

export async function updateTeamMember(
  establishmentId: string,
  member: AdminTeamMember,
  role: AdminRole,
  active: boolean
): Promise<void> {
  if (useAcademicFirestore) {
    return updateAcademicTeamMember(establishmentId, member, role, active);
  }
  const result = await execute({
    action: "update",
    active,
    establishmentId,
    expectedUpdatedAt: member.updatedAt.toISOString(),
    requestId: requestId(),
    role,
    targetUid: member.uid
  });
  if (result.action !== "update" || result.targetUid !== member.uid ||
      typeof result.updatedAt !== "string") {
    throw new TypeError("La Function devolvió una actualización inválida.");
  }
}
