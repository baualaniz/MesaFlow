import { createHash } from "node:crypto";

import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore
} from "firebase-admin/firestore";
import {
  parseCurrency,
  parseMinorAmount,
  parsePayment,
  type PaymentStatus
} from "@mesaflow/contracts";

import type {
  PaymentReconciliationCommand,
  PaymentReconciliationRepository,
  PaymentReconciliationResult
} from "../reconcile-payment.js";
import { paymentConverter } from "./firestore-converters.js";

function requiredData(snapshot: DocumentSnapshot, message: string): DocumentData {
  if (!snapshot.exists) throw new TypeError(message);
  return snapshot.data() ?? {};
}

export function buildPaymentDocumentId(externalId: string): string {
  return `mp_${createHash("sha256").update(externalId, "utf8").digest("hex").slice(0, 40)}`;
}

function keepStatus(current: PaymentStatus | undefined, incoming: PaymentStatus): PaymentStatus {
  if (current === undefined || current === "pending") return incoming;
  if (current === "approved") {
    return incoming === "refunded" || incoming === "charged_back" ? incoming : current;
  }
  if (current === "refunded" || current === "charged_back") return current;
  return incoming === "approved" || incoming === "refunded" ||
    incoming === "charged_back" ? incoming : current;
}

function sessionStatus(status: PaymentStatus, balanceMinor: number): string {
  if (balanceMinor === 0) return "paid";
  if (status === "pending" || status === "refunded" || status === "charged_back") {
    return "payment_pending";
  }
  return "open";
}

export class FirestorePaymentReconciliationRepository
implements PaymentReconciliationRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async reconcile(
    command: PaymentReconciliationCommand
  ): Promise<PaymentReconciliationResult> {
    const intentRef = this.firestore.doc(
      `paymentIntents/${command.payment.externalReference}`
    );
    const eventRef = this.firestore.doc(`webhookEvents/${command.eventId}`);

    return this.firestore.runTransaction(async (transaction) => {
      const [eventSnapshot, intentSnapshot] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(intentRef)
      ]);
      const intent = requiredData(
        intentSnapshot,
        "No existe un intento de pago asociado a la referencia externa."
      );
      if (intent.provider !== "mercado_pago" ||
          intent.intentId !== command.payment.externalReference ||
          typeof intent.establishmentId !== "string" ||
          typeof intent.sessionId !== "string") {
        throw new TypeError("El intento de pago no es conciliable.");
      }
      const amountMinor = parseMinorAmount(intent.amountMinor, "amountMinor");
      const currency = parseCurrency(intent.currency);
      if (amountMinor !== command.payment.amountMinor ||
          currency !== command.payment.currency ||
          intent.liveMode !== command.payment.liveMode) {
        throw new TypeError("El pago no coincide con el importe, moneda o ambiente esperado.");
      }
      const establishmentId = intent.establishmentId;
      const sessionId = intent.sessionId;
      const paymentId = buildPaymentDocumentId(command.payment.id);
      const sessionRef = this.firestore.doc(
        `establishments/${establishmentId}/tableSessions/${sessionId}`
      );
      const paymentRef = this.firestore
        .doc(`establishments/${establishmentId}/payments/${paymentId}`)
        .withConverter(paymentConverter);
      const preferenceRef = this.firestore.doc(
        `establishments/${establishmentId}/paymentPreferences/${command.payment.externalReference}`
      );
      const [sessionSnapshot, paymentSnapshot] = await Promise.all([
        transaction.get(sessionRef),
        transaction.get(paymentRef)
      ]);
      const existing = paymentSnapshot.data();
      const finalStatus = keepStatus(existing?.status, command.payment.status);
      if (eventSnapshot.exists && eventSnapshot.data()?.status === "processed") {
        return Object.freeze({
          outcome: "duplicate" as const,
          paymentId,
          status: finalStatus
        });
      }
      if (existing !== undefined && (existing.establishmentId !== establishmentId ||
          existing.sessionId !== sessionId || existing.idempotencyKey !== intent.intentId ||
          existing.externalId !== command.payment.id || existing.amountMinor !== amountMinor ||
          existing.currency !== currency)) {
        throw new TypeError("El pago existente no corresponde al intento conciliado.");
      }
      const session = requiredData(sessionSnapshot, "La sesión del pago no existe.");
      if (session.establishmentId !== establishmentId ||
          sessionId !== intent.sessionId) {
        throw new TypeError("La sesión del pago no corresponde al intento.");
      }
      const subtotalMinor = parseMinorAmount(session.subtotalMinor, "subtotalMinor");
      const currentPaidMinor = parseMinorAmount(session.paidMinor, "paidMinor");
      const previousContribution = existing?.status === "approved" ? existing.amountMinor : 0;
      const nextContribution = finalStatus === "approved" ? amountMinor : 0;
      const paidMinor = currentPaidMinor - previousContribution + nextContribution;
      if (!Number.isSafeInteger(paidMinor) || paidMinor < 0) {
        throw new TypeError("El total pagado de la sesión es inválido.");
      }
      const balanceMinor = Math.max(0, subtotalMinor - paidMinor);
      const receivedAt = Timestamp.fromDate(command.receivedAt);
      const createdAt = existing?.createdAt ?? command.payment.createdAt.toISOString();
      const payment = parsePayment({
        establishmentId,
        sessionId,
        provider: "mercado_pago",
        externalId: command.payment.id,
        idempotencyKey: intent.intentId,
        status: finalStatus,
        amountMinor,
        currency,
        providerStatus: command.payment.statusDetail === null
          ? command.payment.providerStatus
          : `${command.payment.providerStatus}:${command.payment.statusDetail}`.slice(0, 200),
        createdAt,
        updatedAt: command.payment.updatedAt.toISOString()
      });
      transaction.set(paymentRef, payment);
      transaction.update(sessionRef, {
        paidMinor,
        balanceMinor,
        status: sessionStatus(finalStatus, balanceMinor),
        updatedAt: receivedAt
      });
      const reconciliation = {
        paymentStatus: finalStatus,
        providerPaymentId: command.payment.id,
        providerStatus: command.payment.providerStatus,
        reconciledAt: receivedAt,
        updatedAt: receivedAt
      };
      transaction.set(intentRef, reconciliation, { merge: true });
      transaction.set(preferenceRef, reconciliation, { merge: true });
      transaction.create(eventRef, {
        provider: "mercado_pago",
        type: "payment",
        providerEventId: command.requestId,
        providerPaymentId: command.payment.id,
        intentId: intent.intentId,
        status: "processed",
        receivedAt,
        processedAt: receivedAt
      });
      return Object.freeze({
        outcome: "processed" as const,
        paymentId,
        status: finalStatus
      });
    });
  }
}
