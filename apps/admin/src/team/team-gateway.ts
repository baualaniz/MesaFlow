import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

import { adminFunctions } from "../firebase/firebase";
import type { AdminRole } from "../tenant/tenant-model";
import { parseAdminTeamMember, parseTeamList, type AdminTeamMember } from "./team-model";

interface CallableResult {
  readonly action: string;
  readonly member?: unknown;
  readonly members?: unknown;
  readonly targetUid?: string;
  readonly updatedAt?: string;
}

const callable = httpsCallable<Record<string, unknown>, CallableResult>(adminFunctions, "manageTeam");

function requestId(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function execute(input: Record<string, unknown>): Promise<CallableResult> {
  try {
    return (await callable(input)).data;
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === "functions/permission-denied") {
        throw new Error(error.message || "Tu rol ya no permite administrar el equipo.", { cause: error });
      }
      if (error.code === "functions/failed-precondition") {
        throw new Error(error.message || "La membresía cambió en otro dispositivo.", { cause: error });
      }
      if (error.code === "functions/already-exists") {
        throw new Error("La persona ya pertenece a este equipo.", { cause: error });
      }
      if (error.code === "functions/not-found") {
        throw new Error("La persona ya no pertenece al equipo.", { cause: error });
      }
    }
    throw new Error("No pudimos administrar el equipo. Intentá nuevamente.", { cause: error });
  }
}

export async function loadTeam(establishmentId: string): Promise<readonly AdminTeamMember[]> {
  const result = await execute({ action: "list", establishmentId });
  if (result.action !== "list") throw new TypeError("La Function devolvió una acción inesperada.");
  return parseTeamList(result.members);
}

export async function inviteTeamMember(
  establishmentId: string,
  displayName: string,
  email: string,
  role: AdminRole
): Promise<AdminTeamMember> {
  const result = await execute({
    action: "invite", displayName, email, establishmentId, requestId: requestId(), role
  });
  if (result.action !== "invite") throw new TypeError("La Function devolvió una acción inesperada.");
  return parseAdminTeamMember(result.member);
}

export async function updateTeamMember(
  establishmentId: string,
  member: AdminTeamMember,
  role: AdminRole,
  active: boolean
): Promise<void> {
  const result = await execute({
    action: "update",
    active,
    establishmentId,
    expectedUpdatedAt: member.updatedAt.toISOString(),
    requestId: requestId(),
    role,
    targetUid: member.uid
  });
  if (result.action !== "update" || result.targetUid !== member.uid || typeof result.updatedAt !== "string") {
    throw new TypeError("La Function devolvió una actualización inválida.");
  }
}
