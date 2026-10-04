import { createHash } from "node:crypto";

import { CONTRACT_LIMITS, parseId } from "@mesaflow/contracts";

const REQUEST_ID = /^[a-f0-9]{32}$/u;

export type CreateOrderErrorCode =
  | "failed-precondition"
  | "invalid-argument"
  | "permission-denied"
  | "unauthenticated";

export type CreateOrderFailureReason =
  | "invalid-cart"
  | "product-unavailable"
  | "session-unavailable";

export class CreateOrderError extends Error {
  constructor(
    readonly code: CreateOrderErrorCode,
    readonly reason: CreateOrderFailureReason,
    message: string
  ) {
    super(message);
    this.name = "CreateOrderError";
  }
}

export interface CreateOrderDraftItem {
  readonly productId: string;
  readonly quantity: number;
  readonly notes: string | null;
}

export interface CreateOrderCommand {
  readonly orderId: string;
  readonly uid: string;
  readonly establishmentId: string;
  readonly sessionId: string;
  readonly tableId: string;
  readonly items: readonly CreateOrderDraftItem[];
  readonly createdAt: Date;
}

export interface CreatedOrderResult {
  readonly orderId: string;
  readonly status: "created";
  readonly itemCount: number;
  readonly totalMinor: number;
  readonly currency: string;
  readonly createdAt: string;
}

export interface CreateOrderRepository {
  create(command: CreateOrderCommand): Promise<CreatedOrderResult>;
}

function invalid(message: string): never {
  throw new CreateOrderError("invalid-argument", "invalid-cart", message);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalid("La solicitud de pedido debe ser un objeto.");
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(value: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  if (actual.length !== sorted.length || actual.some((key, index) => key !== sorted[index])) {
    invalid("La solicitud de pedido contiene campos inválidos.");
  }
}

function requireId(value: unknown, label: string): string {
  try {
    return parseId(value, label);
  } catch {
    return invalid(`${label} no es válido.`);
  }
}

function parseNotes(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string") invalid("notes debe ser texto o null.");
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > CONTRACT_LIMITS.maxItemNotesLength) {
    invalid("notes está fuera del límite permitido.");
  }
  return normalized;
}

function parseItems(value: unknown): readonly CreateOrderDraftItem[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > CONTRACT_LIMITS.maxOrderItems) {
    invalid(`items debe contener entre 1 y ${CONTRACT_LIMITS.maxOrderItems} líneas.`);
  }
  const seen = new Set<string>();
  return Object.freeze(value.map((raw) => {
    const item = requireRecord(raw);
    requireExactKeys(item, ["notes", "productId", "quantity"]);
    const productId = requireId(item.productId, "productId");
    if (!Number.isSafeInteger(item.quantity) || (item.quantity as number) < 1 ||
        (item.quantity as number) > CONTRACT_LIMITS.maxItemQuantity) {
      invalid("quantity está fuera del límite permitido.");
    }
    const notes = parseNotes(item.notes);
    const duplicateKey = `${productId}\0${notes ?? ""}`;
    if (seen.has(duplicateKey)) invalid("El pedido contiene líneas duplicadas.");
    seen.add(duplicateKey);
    return Object.freeze({
      productId,
      quantity: item.quantity as number,
      notes
    });
  }));
}

export function buildOrderId(uid: string, requestId: string): string {
  return createHash("sha256")
    .update(uid, "utf8")
    .update("\0", "utf8")
    .update(requestId, "ascii")
    .digest("hex");
}

export async function createOrder(
  data: unknown,
  uid: string | undefined,
  repository: CreateOrderRepository,
  now = new Date()
): Promise<CreatedOrderResult> {
  if (!uid) {
    throw new CreateOrderError(
      "unauthenticated",
      "session-unavailable",
      "Iniciá una sesión de mesa para enviar el pedido."
    );
  }
  const authenticatedUid = requireId(uid, "uid");
  const input = requireRecord(data);
  requireExactKeys(input, [
    "establishmentId",
    "items",
    "requestId",
    "sessionId",
    "tableId"
  ]);
  if (typeof input.requestId !== "string" || !REQUEST_ID.test(input.requestId)) {
    invalid("requestId no es válido.");
  }
  if (Number.isNaN(now.getTime())) invalid("No se pudo establecer el momento del pedido.");

  return repository.create(Object.freeze({
    orderId: buildOrderId(authenticatedUid, input.requestId),
    uid: authenticatedUid,
    establishmentId: requireId(input.establishmentId, "establishmentId"),
    sessionId: requireId(input.sessionId, "sessionId"),
    tableId: requireId(input.tableId, "tableId"),
    items: parseItems(input.items),
    createdAt: new Date(now)
  }));
}
