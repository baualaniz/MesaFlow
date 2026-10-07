import {
  ASSISTANCE_STATUSES,
  parseId,
  type AssistanceStatus
} from "@mesaflow/contracts";

const REQUEST_ID = /^[a-f0-9]{32}$/u;

export type UpdateAssistanceStatusErrorCode =
  | "failed-precondition"
  | "invalid-argument"
  | "not-found"
  | "permission-denied"
  | "unauthenticated";

export type UpdateAssistanceStatusFailureReason =
  | "assistance-not-found"
  | "invalid-transition"
  | "stale-assistance"
  | "unauthorized-transition";

export class UpdateAssistanceStatusError extends Error {
  constructor(
    readonly code: UpdateAssistanceStatusErrorCode,
    readonly reason: UpdateAssistanceStatusFailureReason,
    message: string
  ) {
    super(message);
    this.name = "UpdateAssistanceStatusError";
  }
}

export interface UpdateAssistanceStatusCommand {
  readonly actorUid: string;
  readonly establishmentId: string;
  readonly requestId: string;
  readonly expectedStatus: AssistanceStatus;
  readonly nextStatus: AssistanceStatus;
  readonly operationId: string;
  readonly updatedAt: Date;
}

export interface UpdatedAssistanceStatusResult {
  readonly requestId: string;
  readonly status: AssistanceStatus;
  readonly updatedAt: string;
}

export interface UpdateAssistanceStatusRepository {
  transition(command: UpdateAssistanceStatusCommand): Promise<UpdatedAssistanceStatusResult>;
}

function invalid(message: string): never {
  throw new UpdateAssistanceStatusError("invalid-argument", "invalid-transition", message);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalid("La transición debe ser un objeto.");
  }
  return value as Record<string, unknown>;
}

function id(value: unknown, label: string): string {
  try {
    return parseId(value, label);
  } catch {
    return invalid(`${label} no es válido.`);
  }
}

function status(value: unknown, label: string): AssistanceStatus {
  if (typeof value !== "string" ||
      !(ASSISTANCE_STATUSES as readonly string[]).includes(value)) {
    return invalid(`${label} no es un estado válido.`);
  }
  return value as AssistanceStatus;
}

export async function updateAssistanceStatus(
  data: unknown,
  actorUid: string | undefined,
  repository: UpdateAssistanceStatusRepository,
  now = new Date()
): Promise<UpdatedAssistanceStatusResult> {
  if (!actorUid) {
    throw new UpdateAssistanceStatusError(
      "unauthenticated",
      "unauthorized-transition",
      "Iniciá sesión para atender la solicitud."
    );
  }
  const input = record(data);
  const expectedKeys = [
    "establishmentId", "expectedStatus", "nextStatus", "operationId", "requestId"
  ];
  const actualKeys = Object.keys(input).sort();
  if (actualKeys.length !== expectedKeys.length ||
      actualKeys.some((key, index) => key !== expectedKeys[index])) {
    invalid("La transición contiene campos inválidos.");
  }
  if (typeof input.operationId !== "string" || !REQUEST_ID.test(input.operationId)) {
    invalid("operationId no es válido.");
  }
  if (Number.isNaN(now.getTime())) invalid("No se pudo establecer el momento de la transición.");

  const expectedStatus = status(input.expectedStatus, "expectedStatus");
  const nextStatus = status(input.nextStatus, "nextStatus");
  if (!(
    (expectedStatus === "pending" && nextStatus === "acknowledged") ||
    (expectedStatus === "acknowledged" && nextStatus === "resolved")
  )) {
    invalid("La transición de asistencia no está permitida.");
  }

  return repository.transition(Object.freeze({
    actorUid: id(actorUid, "actorUid"),
    establishmentId: id(input.establishmentId, "establishmentId"),
    requestId: id(input.requestId, "requestId"),
    expectedStatus,
    nextStatus,
    operationId: input.operationId,
    updatedAt: new Date(now)
  }));
}
