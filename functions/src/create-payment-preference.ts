import { createHash } from "node:crypto";

import { parseId } from "@mesaflow/contracts";

export type PaymentPreferenceErrorCode =
  | "failed-precondition"
  | "invalid-argument"
  | "permission-denied"
  | "unauthenticated";

export type PaymentPreferenceFailureReason =
  | "balance-unavailable"
  | "preference-in-progress"
  | "provider-unavailable"
  | "session-unavailable";

export class PaymentPreferenceError extends Error {
  constructor(
    readonly code: PaymentPreferenceErrorCode,
    readonly reason: PaymentPreferenceFailureReason,
    message: string
  ) {
    super(message);
    this.name = "PaymentPreferenceError";
  }
}

export interface PaymentPreferenceCommand {
  readonly intentId: string;
  readonly uid: string;
  readonly establishmentId: string;
  readonly sessionId: string;
  readonly tableId: string;
  readonly createdAt: Date;
}

export interface PaymentPreferenceResult {
  readonly intentId: string;
  readonly preferenceId: string;
  readonly checkoutUrl: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly status: "ready";
}

export interface PaymentPreferenceRepository {
  create(command: PaymentPreferenceCommand): Promise<PaymentPreferenceResult>;
}

function invalid(message: string): never {
  throw new PaymentPreferenceError(
    "invalid-argument",
    "session-unavailable",
    message
  );
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    invalid("La solicitud de pago debe ser un objeto.");
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

export function buildPaymentIntentId(
  establishmentId: string,
  sessionId: string
): string {
  return createHash("sha256")
    .update(establishmentId, "utf8")
    .update("\0", "utf8")
    .update(sessionId, "utf8")
    .digest("hex");
}

export async function createPaymentPreference(
  data: unknown,
  uid: string | undefined,
  repository: PaymentPreferenceRepository,
  now = new Date()
): Promise<PaymentPreferenceResult> {
  if (!uid) {
    throw new PaymentPreferenceError(
      "unauthenticated",
      "session-unavailable",
      "Iniciá una sesión de mesa para pagar el consumo."
    );
  }
  const input = record(data);
  const expected = ["establishmentId", "sessionId", "tableId"].sort();
  const actual = Object.keys(input).sort();
  if (actual.length !== expected.length ||
      actual.some((key, index) => key !== expected[index])) {
    invalid("La solicitud de pago contiene campos inválidos.");
  }
  if (Number.isNaN(now.getTime())) invalid("No se pudo establecer el momento del pago.");

  const establishmentId = id(input.establishmentId, "establishmentId");
  const sessionId = id(input.sessionId, "sessionId");
  return repository.create(Object.freeze({
    intentId: buildPaymentIntentId(establishmentId, sessionId),
    uid: id(uid, "uid"),
    establishmentId,
    sessionId,
    tableId: id(input.tableId, "tableId"),
    createdAt: new Date(now)
  }));
}
