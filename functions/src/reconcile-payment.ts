import { createHash } from "node:crypto";

import type { PaymentStatus } from "@mesaflow/contracts";

import type {
  PaymentLookupProvider,
  ProviderPayment
} from "./payments/mercado-pago-payment-provider.js";

export interface PaymentReconciliationCommand {
  readonly eventId: string;
  readonly requestId: string;
  readonly payment: ProviderPayment;
  readonly receivedAt: Date;
}

export interface PaymentReconciliationResult {
  readonly outcome: "processed" | "duplicate";
  readonly paymentId: string;
  readonly status: PaymentStatus;
}

export interface PaymentReconciliationRepository {
  reconcile(command: PaymentReconciliationCommand): Promise<PaymentReconciliationResult>;
}

export function buildWebhookEventId(requestId: string): string {
  return createHash("sha256")
    .update("mercado_pago", "utf8")
    .update("\0", "utf8")
    .update(requestId, "utf8")
    .digest("hex");
}

export async function reconcilePayment(
  providerPaymentId: string,
  requestId: string,
  provider: PaymentLookupProvider,
  repository: PaymentReconciliationRepository,
  now = new Date()
): Promise<PaymentReconciliationResult> {
  if (!/^\d+$/u.test(providerPaymentId) || requestId.trim().length === 0 ||
      requestId.length > 256 || Number.isNaN(now.getTime())) {
    throw new TypeError("La notificación de pago no es válida.");
  }
  const payment = await provider.getPayment(providerPaymentId);
  if (payment.id !== providerPaymentId) {
    throw new TypeError("El proveedor devolvió un pago distinto al notificado.");
  }
  return repository.reconcile(Object.freeze({
    eventId: buildWebhookEventId(requestId),
    requestId,
    payment,
    receivedAt: new Date(now)
  }));
}
