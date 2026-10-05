import {
  getFirestore,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore
} from "firebase-admin/firestore";

import {
  parseCurrency,
  parseEnum,
  parseMinorAmount,
  TABLE_SESSION_STATUSES,
  type TableSessionStatus
} from "@mesaflow/contracts";

import {
  calculateConsumption,
  ConsumptionError,
  type ConsumptionCommand,
  type ConsumptionRepository,
  type ConsumptionResult
} from "../session-consumption.js";
import { orderConverter, paymentConverter } from "./firestore-converters.js";

function data(snapshot: DocumentSnapshot, message: string): DocumentData {
  if (!snapshot.exists) {
    throw new ConsumptionError(
      "permission-denied",
      "session-unavailable",
      message
    );
  }
  return snapshot.data() ?? {};
}

function requireAccess(
  command: ConsumptionCommand,
  establishment: DocumentData,
  table: DocumentData,
  session: DocumentData,
  participant: DocumentData
): {
  currency: string;
  status: TableSessionStatus;
  subtotalMinor: number;
  paidMinor: number;
  balanceMinor: number;
} {
  if (
    establishment.active !== true ||
    table.establishmentId !== command.establishmentId ||
    table.active !== true ||
    table.currentSessionId !== command.sessionId ||
    session.establishmentId !== command.establishmentId ||
    session.tableId !== command.tableId ||
    !["open", "payment_pending"].includes(session.status) ||
    participant.establishmentId !== command.establishmentId ||
    participant.sessionId !== command.sessionId ||
    participant.uid !== command.uid ||
    participant.active !== true
  ) {
    throw new ConsumptionError(
      "permission-denied",
      "session-unavailable",
      "La sesión de mesa ya no permite consultar el consumo."
    );
  }
  try {
    return {
      currency: parseCurrency(establishment.currency),
      status: parseEnum(session.status, TABLE_SESSION_STATUSES, "status"),
      subtotalMinor: parseMinorAmount(session.subtotalMinor, "subtotalMinor"),
      paidMinor: parseMinorAmount(session.paidMinor, "paidMinor"),
      balanceMinor: parseMinorAmount(session.balanceMinor, "balanceMinor")
    };
  } catch (error) {
    throw new TypeError("La sesión contiene datos de consumo inválidos.", { cause: error });
  }
}

export class FirestoreConsumptionRepository implements ConsumptionRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async get(command: ConsumptionCommand): Promise<ConsumptionResult> {
    const establishmentRef = this.firestore.doc(
      `establishments/${command.establishmentId}`
    );
    const tableRef = establishmentRef.collection("tables").doc(command.tableId);
    const sessionRef = establishmentRef.collection("tableSessions").doc(command.sessionId);
    const participantRef = sessionRef.collection("participants").doc(command.uid);
    const ordersQuery = establishmentRef.collection("orders")
      .where("sessionId", "==", command.sessionId)
      .withConverter(orderConverter);
    const paymentsQuery = establishmentRef.collection("payments")
      .where("sessionId", "==", command.sessionId)
      .withConverter(paymentConverter);

    return this.firestore.runTransaction(async (transaction) => {
      const establishmentSnapshot = await transaction.get(establishmentRef);
      const tableSnapshot = await transaction.get(tableRef);
      const sessionSnapshot = await transaction.get(sessionRef);
      const participantSnapshot = await transaction.get(participantRef);
      const ordersSnapshot = await transaction.get(ordersQuery);
      const paymentsSnapshot = await transaction.get(paymentsQuery);

      const access = requireAccess(
        command,
        data(establishmentSnapshot, "El establecimiento no existe."),
        data(tableSnapshot, "La mesa no existe."),
        data(sessionSnapshot, "La sesión no existe."),
        data(participantSnapshot, "La participación no existe.")
      );
      const orders = ordersSnapshot.docs.map((snapshot) => snapshot.data());
      const payments = paymentsSnapshot.docs.map((snapshot) => snapshot.data());
      if (orders.some((order) =>
        order.establishmentId !== command.establishmentId ||
        order.sessionId !== command.sessionId ||
        order.tableId !== command.tableId) ||
        payments.some((payment) =>
          payment.establishmentId !== command.establishmentId ||
          payment.sessionId !== command.sessionId)) {
        throw new ConsumptionError(
          "failed-precondition",
          "consumption-inconsistent",
          "El consumo contiene documentos que no pertenecen a la sesión."
        );
      }
      const totals = calculateConsumption(orders, payments, access.currency);
      if (
        totals.subtotalMinor !== access.subtotalMinor ||
        totals.paidMinor !== access.paidMinor ||
        totals.balanceMinor !== access.balanceMinor
      ) {
        throw new ConsumptionError(
          "failed-precondition",
          "consumption-inconsistent",
          "El resumen guardado no coincide con los pedidos y pagos válidos."
        );
      }
      return Object.freeze({
        sessionId: command.sessionId,
        tableId: command.tableId,
        sessionStatus: access.status,
        currency: access.currency,
        ...totals,
        calculatedAt: command.calculatedAt.toISOString()
      });
    });
  }
}
