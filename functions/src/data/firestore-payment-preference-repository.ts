import { randomUUID } from "node:crypto";

import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore
} from "firebase-admin/firestore";
import { parseCurrency, parseMinorAmount } from "@mesaflow/contracts";

import {
  PaymentPreferenceError,
  type PaymentPreferenceCommand,
  type PaymentPreferenceRepository,
  type PaymentPreferenceResult
} from "../create-payment-preference.js";
import type { PaymentProvider } from "../payments/mercado-pago-provider.js";

const LEASE_MILLISECONDS = 30_000;

function data(snapshot: DocumentSnapshot, message: string): DocumentData {
  if (!snapshot.exists) {
    throw new PaymentPreferenceError("permission-denied", "session-unavailable", message);
  }
  return snapshot.data() ?? {};
}

function readyResult(intentId: string, value: DocumentData): PaymentPreferenceResult | null {
  if (value.status !== "ready") return null;
  if (typeof value.preferenceId !== "string" || typeof value.checkoutUrl !== "string") {
    throw new TypeError("La preferencia lista contiene datos inválidos.");
  }
  return Object.freeze({
    intentId,
    preferenceId: value.preferenceId,
    checkoutUrl: value.checkoutUrl,
    amountMinor: parseMinorAmount(value.amountMinor, "amountMinor"),
    currency: parseCurrency(value.currency),
    status: "ready" as const
  });
}

export class FirestorePaymentPreferenceRepository implements PaymentPreferenceRepository {
  constructor(
    private readonly provider: PaymentProvider,
    private readonly returnBaseUrl: string,
    private readonly firestore: Firestore = getFirestore()
  ) {}

  async create(command: PaymentPreferenceCommand): Promise<PaymentPreferenceResult> {
    const establishmentRef = this.firestore.doc(`establishments/${command.establishmentId}`);
    const tableRef = establishmentRef.collection("tables").doc(command.tableId);
    const sessionRef = establishmentRef.collection("tableSessions").doc(command.sessionId);
    const participantRef = sessionRef.collection("participants").doc(command.uid);
    const intentRef = establishmentRef.collection("paymentPreferences").doc(command.intentId);
    const leaseId = randomUUID();

    const prepared = await this.firestore.runTransaction(async (transaction) => {
      const [existing, establishmentSnapshot, tableSnapshot, sessionSnapshot,
        participantSnapshot] =
        await Promise.all([
          transaction.get(intentRef),
          transaction.get(establishmentRef),
          transaction.get(tableRef),
          transaction.get(sessionRef),
          transaction.get(participantRef)
        ]);
      const establishment = data(establishmentSnapshot, "El establecimiento no existe.");
      const table = data(tableSnapshot, "La mesa no existe.");
      const session = data(sessionSnapshot, "La sesión no existe.");
      const participant = data(participantSnapshot, "La participación no existe.");
      if (establishment.active !== true || table.active !== true ||
          table.establishmentId !== command.establishmentId ||
          table.currentSessionId !== command.sessionId ||
          session.establishmentId !== command.establishmentId ||
          session.tableId !== command.tableId ||
          !["open", "payment_pending"].includes(session.status) ||
          participant.establishmentId !== command.establishmentId ||
          participant.sessionId !== command.sessionId || participant.uid !== command.uid ||
          participant.active !== true) {
        throw new PaymentPreferenceError(
          "permission-denied",
          "session-unavailable",
          "La sesión de mesa ya no permite iniciar pagos."
        );
      }
      const amountMinor = parseMinorAmount(session.balanceMinor, "balanceMinor");
      const currency = parseCurrency(establishment.currency);
      if (typeof establishment.slug !== "string" ||
          !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(establishment.slug)) {
        throw new TypeError("El establecimiento no tiene un slug público válido.");
      }
      if (amountMinor < 1) {
        throw new PaymentPreferenceError(
          "failed-precondition",
          "balance-unavailable",
          "La mesa no tiene saldo pendiente para pagar."
        );
      }
      if (existing.exists) {
        const existingData = existing.data() ?? {};
        const result = readyResult(command.intentId, existingData);
        if (result !== null) {
          if (existingData.establishmentId !== command.establishmentId ||
              existingData.sessionId !== command.sessionId ||
              existingData.tableId !== command.tableId ||
              existingData.provider !== "mercado_pago" ||
              result.amountMinor !== amountMinor || result.currency !== currency) {
            throw new PaymentPreferenceError(
              "failed-precondition",
              "balance-unavailable",
              "El saldo cambió y la preferencia anterior ya no es válida."
            );
          }
          return { result } as const;
        }
        const leaseExpiresAt = existingData.leaseExpiresAt;
        if (existingData.status === "creating" && leaseExpiresAt instanceof Timestamp &&
            leaseExpiresAt.toMillis() > command.createdAt.getTime()) {
          throw new PaymentPreferenceError(
            "failed-precondition",
            "preference-in-progress",
            "El pago ya se está preparando. Esperá unos segundos."
          );
        }
      }
      const title = `Cuenta ${String(establishment.name)} - ${String(table.name)}`.slice(0, 120);
      const timestamp = Timestamp.fromDate(command.createdAt);
      transaction.set(intentRef, {
        establishmentId: command.establishmentId,
        sessionId: command.sessionId,
        tableId: command.tableId,
        customerUid: command.uid,
        provider: "mercado_pago",
        status: "creating",
        preferenceId: null,
        checkoutUrl: null,
        amountMinor,
        currency,
        leaseId,
        leaseExpiresAt: Timestamp.fromMillis(command.createdAt.getTime() + LEASE_MILLISECONDS),
        createdAt: existing.exists ? existing.data()?.createdAt ?? timestamp : timestamp,
        updatedAt: timestamp
      });
      const transitionedSession = session.status === "open";
      if (transitionedSession) {
        transaction.update(sessionRef, {
          status: "payment_pending",
          updatedAt: timestamp
        });
      }
      return {
        amountMinor,
        currency,
        title,
        returnPath: `/e/${establishment.slug}/table/${command.tableId}`,
        transitionedSession
      } as const;
    });
    if ("result" in prepared && prepared.result !== undefined) {
      return prepared.result;
    }

    try {
      const providerResult = await this.provider.createOrRecover({
        intentId: command.intentId,
        title: prepared.title,
        amountMinor: prepared.amountMinor,
        currency: prepared.currency,
        returnBaseUrl: this.returnBaseUrl,
        returnPath: prepared.returnPath
      });
      return await this.firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(intentRef);
        const current = data(snapshot, "La preferencia de pago desapareció.");
        const existingResult = readyResult(command.intentId, current);
        if (existingResult !== null) return existingResult;
        if (current.leaseId !== leaseId || current.status !== "creating") {
          throw new PaymentPreferenceError(
            "failed-precondition",
            "preference-in-progress",
            "Otro intento está preparando el pago."
          );
        }
        transaction.update(intentRef, {
          status: "ready",
          preferenceId: providerResult.preferenceId,
          checkoutUrl: providerResult.checkoutUrl,
          leaseId: null,
          leaseExpiresAt: null,
          updatedAt: Timestamp.fromDate(command.createdAt)
        });
        return Object.freeze({
          intentId: command.intentId,
          ...providerResult,
          amountMinor: prepared.amountMinor,
          currency: prepared.currency,
          status: "ready" as const
        });
      });
    } catch (error) {
      await this.firestore.runTransaction(async (transaction) => {
        const [snapshot, sessionSnapshot] = await Promise.all([
          transaction.get(intentRef),
          transaction.get(sessionRef)
        ]);
        if (snapshot.exists && snapshot.data()?.status === "creating" &&
            snapshot.data()?.leaseId === leaseId) {
          transaction.update(intentRef, {
            status: "failed",
            leaseId: null,
            leaseExpiresAt: null,
            updatedAt: Timestamp.fromDate(command.createdAt)
          });
          if (prepared.transitionedSession && sessionSnapshot.exists &&
              sessionSnapshot.data()?.status === "payment_pending") {
            transaction.update(sessionRef, {
              status: "open",
              updatedAt: Timestamp.fromDate(command.createdAt)
            });
          }
        }
      }).catch(() => undefined);
      throw error;
    }
  }
}
