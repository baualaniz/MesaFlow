import {
  ORDER_STATUSES,
  parseId,
  type OrderStatus
} from "@mesaflow/contracts";

const REQUEST_ID = /^[a-f0-9]{32}$/u;

export type UpdateOrderStatusErrorCode =
  | "failed-precondition"
  | "invalid-argument"
  | "not-found"
  | "permission-denied"
  | "unauthenticated";

export type UpdateOrderStatusFailureReason =
  | "invalid-transition"
  | "order-not-found"
  | "stale-order"
  | "unauthorized-transition";

export class UpdateOrderStatusError extends Error {
  constructor(
    readonly code: UpdateOrderStatusErrorCode,
    readonly reason: UpdateOrderStatusFailureReason,
    message: string
  ) {
    super(message);
    this.name = "UpdateOrderStatusError";
  }
}

export interface UpdateOrderStatusCommand {
  readonly actorUid: string;
  readonly establishmentId: string;
  readonly orderId: string;
  readonly expectedStatus: OrderStatus;
  readonly nextStatus: OrderStatus;
  readonly requestId: string;
  readonly updatedAt: Date;
}

export interface UpdatedOrderStatusResult {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly updatedAt: string;
}

export interface UpdateOrderStatusRepository {
  transition(command: UpdateOrderStatusCommand): Promise<UpdatedOrderStatusResult>;
}

function invalid(message: string): never {
  throw new UpdateOrderStatusError("invalid-argument", "invalid-transition", message);
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalid("La transición debe ser un objeto.");
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>): void {
  const expected = [
    "establishmentId", "expectedStatus", "nextStatus", "orderId", "requestId"
  ];
  const actual = Object.keys(value).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    invalid("La transición contiene campos inválidos.");
  }
}

function id(value: unknown, label: string): string {
  try {
    return parseId(value, label);
  } catch {
    return invalid(`${label} no es válido.`);
  }
}

function status(value: unknown, label: string): OrderStatus {
  if (typeof value !== "string" || !(ORDER_STATUSES as readonly string[]).includes(value)) {
    return invalid(`${label} no es un estado válido.`);
  }
  return value as OrderStatus;
}

export async function updateOrderStatus(
  data: unknown,
  actorUid: string | undefined,
  repository: UpdateOrderStatusRepository,
  now = new Date()
): Promise<UpdatedOrderStatusResult> {
  if (!actorUid) {
    throw new UpdateOrderStatusError(
      "unauthenticated",
      "unauthorized-transition",
      "Iniciá sesión para actualizar el pedido."
    );
  }
  const input = record(data);
  exactKeys(input);
  if (typeof input.requestId !== "string" || !REQUEST_ID.test(input.requestId)) {
    invalid("requestId no es válido.");
  }
  if (Number.isNaN(now.getTime())) invalid("No se pudo establecer el momento de la transición.");

  return repository.transition(Object.freeze({
    actorUid: id(actorUid, "actorUid"),
    establishmentId: id(input.establishmentId, "establishmentId"),
    expectedStatus: status(input.expectedStatus, "expectedStatus"),
    nextStatus: status(input.nextStatus, "nextStatus"),
    orderId: id(input.orderId, "orderId"),
    requestId: input.requestId,
    updatedAt: new Date(now)
  }));
}
