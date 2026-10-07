import { randomBytes } from "node:crypto";

import { getAuth, type Auth, type UserRecord } from "firebase-admin/auth";
import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type Firestore,
  type Transaction
} from "firebase-admin/firestore";

import {
  canAssignTeamRole,
  TeamManagementError,
  type TeamManagementCommand,
  type TeamManagementRepository,
  type TeamManagementResult,
  type TeamMemberSummary,
  type TeamRole
} from "../team-management.js";

const ROLE_PERMISSIONS: Readonly<Record<TeamRole, readonly string[]>> = Object.freeze({
  owner: Object.freeze(["establishment.manage", "menu.manage", "orders.manage", "metrics.read"]),
  manager: Object.freeze(["menu.manage", "orders.manage", "metrics.read"]),
  staff: Object.freeze(["orders.manage", "assistance.manage"]),
  kitchen: Object.freeze(["orders.prepare"])
});

function denied(message = "Tu rol no permite administrar este equipo."): never {
  throw new TeamManagementError("permission-denied", message);
}

function actorRole(data: DocumentData | undefined, command: TeamManagementCommand): TeamRole {
  if (data === undefined || data.active !== true || data.uid !== command.actorUid ||
      data.establishmentId !== command.establishmentId ||
      !["owner", "manager"].includes(String(data.role))) denied();
  return data.role as TeamRole;
}

function storedMember(data: DocumentData | undefined, establishmentId: string, uid: string): DocumentData {
  if (data === undefined) throw new TeamManagementError("not-found", "La persona ya no pertenece al equipo.");
  if (data.establishmentId !== establishmentId || data.uid !== uid ||
      !Object.hasOwn(ROLE_PERMISSIONS, String(data.role)) || typeof data.active !== "boolean" ||
      !Array.isArray(data.permissions) || !(data.createdAt instanceof Timestamp) ||
      !(data.updatedAt instanceof Timestamp)) {
    throw new TypeError("La membresía almacenada no cumple el contrato.");
  }
  return data;
}

function summary(data: DocumentData, user: UserRecord): TeamMemberSummary {
  if (!user.email) throw new TypeError("La cuenta del miembro no tiene email.");
  return Object.freeze({
    uid: user.uid,
    displayName: user.displayName?.trim() || user.email.split("@")[0] || "Miembro",
    email: user.email.toLowerCase(),
    role: data.role as TeamRole,
    permissions: Object.freeze([...(data.permissions as string[])]),
    active: data.active as boolean,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (data.updatedAt as Timestamp).toDate().toISOString()
  });
}

function idempotent(data: DocumentData, command: TeamManagementCommand): TeamManagementResult {
  if (data.establishmentId !== command.establishmentId || data.actor?.id !== command.actorUid ||
      data.action !== `team.${command.action}` || data.result === null || typeof data.result !== "object") {
    throw new TeamManagementError("failed-precondition", "requestId ya fue utilizado.");
  }
  return data.result as TeamManagementResult;
}

function auditData(
  command: Exclude<TeamManagementCommand, { readonly action: "list" }>,
  result: TeamManagementResult,
  before: unknown,
  after: unknown,
  entityId: string
) {
  return {
    establishmentId: command.establishmentId,
    actor: { type: "member", id: command.actorUid },
    action: `team.${command.action}`,
    entity: { type: "member", id: entityId },
    before,
    after,
    result,
    createdAt: Timestamp.fromDate(command.updatedAt)
  };
}

function temporaryPassword(): string {
  return `${randomBytes(24).toString("base64url")}aA1!`;
}

async function findOrCreateUser(auth: Auth, email: string, displayName: string): Promise<UserRecord> {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    return auth.createUser({ displayName, email, emailVerified: false, password: temporaryPassword() });
  }
}

function authorizeTarget(actor: TeamRole, current: TeamRole | null, next: TeamRole): void {
  if (!canAssignTeamRole(actor, next) ||
      (actor === "manager" && current !== null && !["staff", "kitchen"].includes(current))) {
    denied("Un encargado solo puede administrar roles de salón y cocina.");
  }
}

function updateAudit(
  transaction: Transaction,
  reference: FirebaseFirestore.DocumentReference,
  command: Exclude<TeamManagementCommand, { readonly action: "list" }>,
  result: TeamManagementResult,
  before: unknown,
  after: unknown,
  entityId: string
) {
  transaction.create(reference, auditData(command, result, before, after, entityId));
}

export class FirestoreTeamManagementRepository implements TeamManagementRepository {
  constructor(
    private readonly firestore: Firestore = getFirestore(),
    private readonly auth: Auth = getAuth()
  ) {}

  async execute(command: TeamManagementCommand): Promise<TeamManagementResult> {
    const tenantRef = this.firestore.doc(`establishments/${command.establishmentId}`);
    const actorRef = tenantRef.collection("members").doc(command.actorUid);

    if (command.action === "list") {
      const [actorSnapshot, membersSnapshot] = await Promise.all([
        actorRef.get(), tenantRef.collection("members").orderBy("createdAt", "desc").limit(101).get()
      ]);
      actorRole(actorSnapshot.data(), command);
      if (membersSnapshot.size > 100) {
        throw new TeamManagementError("failed-precondition", "El equipo supera el límite operativo de 100 miembros.");
      }
      const records = await this.auth.getUsers(membersSnapshot.docs.map(({ id }) => ({ uid: id })));
      if (records.notFound.length > 0) throw new TypeError("Una membresía no tiene cuenta de Authentication.");
      const users = new Map(records.users.map((user) => [user.uid, user]));
      return Object.freeze({
        action: "list",
        members: Object.freeze(membersSnapshot.docs.map((document) => {
          const user = users.get(document.id);
          if (!user) throw new TypeError("No se pudo resolver una cuenta del equipo.");
          return summary(storedMember(document.data(), command.establishmentId, document.id), user);
        }))
      });
    }

    const auditRef = tenantRef.collection("auditLogs").doc(`team-action-${command.requestId}`);
    if (command.action === "invite") {
      const preflight = await actorRef.get();
      authorizeTarget(actorRole(preflight.data(), command), null, command.role);
      const user = await findOrCreateUser(this.auth, command.email, command.displayName);
      const memberRef = tenantRef.collection("members").doc(user.uid);
      const profileRef = this.firestore.doc(`users/${user.uid}`);
      return this.firestore.runTransaction(async (transaction) => {
        const [actorSnapshot, memberSnapshot, profileSnapshot, auditSnapshot] = await Promise.all([
          transaction.get(actorRef), transaction.get(memberRef),
          transaction.get(profileRef), transaction.get(auditRef)
        ]);
        const actor = actorRole(actorSnapshot.data(), command);
        if (auditSnapshot.exists) return idempotent(auditSnapshot.data() ?? {}, command);
        authorizeTarget(actor, null, command.role);
        if (memberSnapshot.exists) throw new TeamManagementError("already-exists", "La persona ya pertenece al equipo.");
        const timestamp = Timestamp.fromDate(command.updatedAt);
        const membership = {
          establishmentId: command.establishmentId,
          uid: user.uid,
          role: command.role,
          permissions: [...ROLE_PERMISSIONS[command.role]],
          active: true,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        const profile = profileSnapshot.data();
        const ids = profile?.establishmentIds;
        const establishmentIds = Array.isArray(ids)
          ? [...new Set([...ids.filter((value): value is string => typeof value === "string"), command.establishmentId])]
          : [command.establishmentId];
        const memberSummary = summary(membership, user);
        const result = Object.freeze({ action: "invite" as const, member: memberSummary });
        transaction.create(memberRef, membership);
        transaction.set(profileRef, {
          displayName: user.displayName?.trim() || command.displayName,
          email: user.email?.toLowerCase() || command.email,
          establishmentIds,
          createdAt: profile?.createdAt instanceof Timestamp ? profile.createdAt : timestamp,
          updatedAt: timestamp
        });
        updateAudit(transaction, auditRef, command, result, null, {
          uid: user.uid, role: command.role, active: true
        }, user.uid);
        return result;
      });
    }

    const memberRef = tenantRef.collection("members").doc(command.targetUid);
    const ownersQuery = tenantRef.collection("members")
      .where("role", "==", "owner").where("active", "==", true).limit(2);
    return this.firestore.runTransaction(async (transaction) => {
      const [actorSnapshot, memberSnapshot, ownersSnapshot, auditSnapshot] = await Promise.all([
        transaction.get(actorRef), transaction.get(memberRef), transaction.get(ownersQuery), transaction.get(auditRef)
      ]);
      const actor = actorRole(actorSnapshot.data(), command);
      if (auditSnapshot.exists) return idempotent(auditSnapshot.data() ?? {}, command);
      const before = storedMember(memberSnapshot.data(), command.establishmentId, command.targetUid);
      const currentRole = before.role as TeamRole;
      authorizeTarget(actor, currentRole, command.role);
      if ((before.updatedAt as Timestamp).toDate().toISOString() !== command.expectedUpdatedAt) {
        throw new TeamManagementError("failed-precondition", "La membresía cambió en otro dispositivo.");
      }
      if (currentRole === "owner" && before.active === true &&
          (!command.active || command.role !== "owner") && ownersSnapshot.size < 2) {
        throw new TeamManagementError("failed-precondition", "El establecimiento debe conservar un propietario activo.");
      }
      const updatedAt = Timestamp.fromDate(command.updatedAt);
      const result = Object.freeze({
        action: "update" as const,
        targetUid: command.targetUid,
        updatedAt: command.updatedAt.toISOString()
      });
      transaction.update(memberRef, {
        role: command.role,
        permissions: [...ROLE_PERMISSIONS[command.role]],
        active: command.active,
        updatedAt
      });
      updateAudit(transaction, auditRef, command, result, {
        role: currentRole, permissions: before.permissions, active: before.active
      }, { role: command.role, permissions: ROLE_PERMISSIONS[command.role], active: command.active }, command.targetUid);
      return result;
    });
  }
}
