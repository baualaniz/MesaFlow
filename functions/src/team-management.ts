import { parseId } from "@mesaflow/contracts";

const REQUEST_ID = /^[a-f0-9]{32}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export const TEAM_ROLES = ["owner", "manager", "staff", "kitchen"] as const;
export type TeamRole = typeof TEAM_ROLES[number];

export type TeamManagementErrorCode =
  | "already-exists"
  | "failed-precondition"
  | "invalid-argument"
  | "not-found"
  | "permission-denied"
  | "unauthenticated";

export class TeamManagementError extends Error {
  constructor(readonly code: TeamManagementErrorCode, message: string) {
    super(message);
    this.name = "TeamManagementError";
  }
}

export interface TeamMemberSummary {
  readonly uid: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: TeamRole;
  readonly permissions: readonly string[];
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CommandBase {
  readonly actorUid: string;
  readonly establishmentId: string;
}

export type TeamManagementCommand =
  | (CommandBase & { readonly action: "list" })
  | (CommandBase & {
    readonly action: "invite";
    readonly displayName: string;
    readonly email: string;
    readonly requestId: string;
    readonly role: TeamRole;
    readonly updatedAt: Date;
  })
  | (CommandBase & {
    readonly action: "update";
    readonly active: boolean;
    readonly expectedUpdatedAt: string;
    readonly requestId: string;
    readonly role: TeamRole;
    readonly targetUid: string;
    readonly updatedAt: Date;
  });

export type TeamManagementResult =
  | { readonly action: "list"; readonly members: readonly TeamMemberSummary[] }
  | { readonly action: "invite"; readonly member: TeamMemberSummary }
  | { readonly action: "update"; readonly targetUid: string; readonly updatedAt: string };

export interface TeamManagementRepository {
  execute(command: TeamManagementCommand): Promise<TeamManagementResult>;
}

function invalid(message: string): never {
  throw new TeamManagementError("invalid-argument", message);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalid("La operación debe ser un objeto.");
  }
  return value as Record<string, unknown>;
}

function exactKeys(input: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(input).sort();
  const sorted = [...expected].sort();
  if (actual.length !== sorted.length || actual.some((key, index) => key !== sorted[index])) {
    invalid("La operación contiene campos ausentes o desconocidos.");
  }
}

function id(value: unknown, label: string): string {
  try {
    return parseId(value, label);
  } catch {
    return invalid(`${label} no es válido.`);
  }
}

function role(value: unknown): TeamRole {
  if (typeof value !== "string" || !(TEAM_ROLES as readonly string[]).includes(value)) {
    return invalid("role no es válido.");
  }
  return value as TeamRole;
}

function requestId(value: unknown): string {
  if (typeof value !== "string" || !REQUEST_ID.test(value)) return invalid("requestId no es válido.");
  return value;
}

function expectedUpdatedAt(value: unknown): string {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value) || new Date(value).toISOString() !== value) {
    return invalid("expectedUpdatedAt no es válido.");
  }
  return value;
}

function displayName(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 120) {
    return invalid("displayName debe tener entre 2 y 120 caracteres.");
  }
  return value.trim();
}

function email(value: unknown): string {
  if (typeof value !== "string" || value.trim().length > 254 || !EMAIL.test(value.trim())) {
    return invalid("email no es válido.");
  }
  return value.trim().toLowerCase();
}

export function canAssignTeamRole(actorRole: TeamRole, targetRole: TeamRole): boolean {
  return actorRole === "owner" || (actorRole === "manager" && ["staff", "kitchen"].includes(targetRole));
}

export async function manageTeam(
  data: unknown,
  actorUid: string | undefined,
  repository: TeamManagementRepository,
  now = new Date()
): Promise<TeamManagementResult> {
  if (!actorUid) throw new TeamManagementError("unauthenticated", "Iniciá sesión para administrar el equipo.");
  if (Number.isNaN(now.getTime())) invalid("No se pudo establecer el momento de la operación.");
  const input = record(data);
  const action = input.action;
  if (!["list", "invite", "update"].includes(String(action))) invalid("action no es válida.");
  const common = {
    actorUid: id(actorUid, "actorUid"),
    establishmentId: id(input.establishmentId, "establishmentId")
  };

  if (action === "list") {
    exactKeys(input, ["action", "establishmentId"]);
    return repository.execute({ ...common, action });
  }
  if (action === "invite") {
    exactKeys(input, ["action", "displayName", "email", "establishmentId", "requestId", "role"]);
    return repository.execute({
      ...common,
      action,
      displayName: displayName(input.displayName),
      email: email(input.email),
      requestId: requestId(input.requestId),
      role: role(input.role),
      updatedAt: new Date(now)
    });
  }
  exactKeys(input, [
    "action", "active", "establishmentId", "expectedUpdatedAt", "requestId", "role", "targetUid"
  ]);
  if (typeof input.active !== "boolean") invalid("active debe ser booleano.");
  return repository.execute({
    ...common,
    action: "update",
    active: input.active,
    expectedUpdatedAt: expectedUpdatedAt(input.expectedUpdatedAt),
    requestId: requestId(input.requestId),
    role: role(input.role),
    targetUid: id(input.targetUid, "targetUid"),
    updatedAt: new Date(now)
  });
}
