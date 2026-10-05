import {
  ASSISTANCE_TYPES,
  parseEnum,
  parseId,
  type AssistanceStatus,
  type AssistanceType
} from "@mesaflow/contracts";

export type AssistanceErrorCode =
  | "failed-precondition"
  | "invalid-argument"
  | "permission-denied"
  | "unauthenticated";

export type AssistanceFailureReason =
  | "assistance-disabled"
  | "rate-limited"
  | "request-in-progress"
  | "request-unavailable"
  | "session-unavailable";

export class AssistanceError extends Error {
  constructor(
    readonly code: AssistanceErrorCode,
    readonly reason: AssistanceFailureReason,
    message: string
  ) {
    super(message);
    this.name = "AssistanceError";
  }
}

export interface AssistanceCommand {
  readonly uid: string;
  readonly establishmentId: string;
  readonly sessionId: string;
  readonly tableId: string;
  readonly createdAt: Date;
}

export interface CreateAssistanceCommand extends AssistanceCommand {
  readonly type: AssistanceType;
}

export interface AssistanceResult {
  readonly requestId: string;
  readonly type: AssistanceType;
  readonly status: AssistanceStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AssistanceRepository {
  create(command: CreateAssistanceCommand): Promise<AssistanceResult>;
  cancel(command: AssistanceCommand): Promise<AssistanceResult>;
}

function invalid(message: string): never {
  throw new AssistanceError("invalid-argument", "request-unavailable", message);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalid("La solicitud de asistencia debe ser un objeto.");
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  if (actual.length !== sorted.length || actual.some((key, index) => key !== sorted[index])) {
    invalid("La solicitud de asistencia contiene campos inválidos.");
  }
}

function id(value: unknown, label: string): string {
  try {
    return parseId(value, label);
  } catch {
    return invalid(`${label} no es válido.`);
  }
}

function baseCommand(
  data: unknown,
  uid: string | undefined,
  expected: readonly string[],
  now: Date
): { input: Record<string, unknown>; command: AssistanceCommand } {
  if (!uid) {
    throw new AssistanceError(
      "unauthenticated",
      "session-unavailable",
      "Iniciá una sesión de mesa para pedir asistencia."
    );
  }
  const input = record(data);
  exactKeys(input, expected);
  if (Number.isNaN(now.getTime())) invalid("No se pudo establecer el momento de la solicitud.");
  return {
    input,
    command: Object.freeze({
      uid: id(uid, "uid"),
      establishmentId: id(input.establishmentId, "establishmentId"),
      sessionId: id(input.sessionId, "sessionId"),
      tableId: id(input.tableId, "tableId"),
      createdAt: new Date(now)
    })
  };
}

export async function createAssistanceRequest(
  data: unknown,
  uid: string | undefined,
  repository: AssistanceRepository,
  now = new Date()
): Promise<AssistanceResult> {
  const { input, command } = baseCommand(
    data,
    uid,
    ["establishmentId", "sessionId", "tableId", "type"],
    now
  );
  let type: AssistanceType;
  try {
    type = parseEnum(input.type, ASSISTANCE_TYPES, "type");
  } catch {
    return invalid("type no es válido.");
  }
  return repository.create(Object.freeze({ ...command, type }));
}

export async function cancelAssistanceRequest(
  data: unknown,
  uid: string | undefined,
  repository: AssistanceRepository,
  now = new Date()
): Promise<AssistanceResult> {
  const { command } = baseCommand(
    data,
    uid,
    ["establishmentId", "sessionId", "tableId"],
    now
  );
  return repository.cancel(command);
}
