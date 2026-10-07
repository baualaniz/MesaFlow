import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore
} from "firebase-admin/firestore";

import {
  ROLES,
  canTransitionOrder,
  parseMinorAmount,
  parseOrder,
  type OrderTransitionActor,
  type Role
} from "@mesaflow/contracts";

import {
  UpdateOrderStatusError,
  type UpdatedOrderStatusResult,
  type UpdateOrderStatusCommand,
  type UpdateOrderStatusRepository
} from "../update-order-status.js";
import { orderConverter } from "./firestore-converters.js";

function denied(message: string): never {
  throw new UpdateOrderStatusError(
    "permission-denied", "unauthorized-transition", message
  );
}

function actorFromMembership(
  data: DocumentData | undefined,
  command: UpdateOrderStatusCommand
): OrderTransitionActor {
  if (data === undefined || data.active !== true ||
      data.uid !== command.actorUid || data.establishmentId !== command.establishmentId ||
      typeof data.role !== "string" || !(ROLES as readonly string[]).includes(data.role) ||
      !Array.isArray(data.permissions) ||
      data.permissions.some((permission: unknown) => typeof permission !== "string")) {
    return denied("La cuenta no tiene una membresía operativa válida.");
  }
  return Object.freeze({
    active: true,
    role: data.role as Role,
    permissions: Object.freeze([...(data.permissions as string[])])
  });
}

function idempotentResult(
  data: DocumentData,
  command: UpdateOrderStatusCommand
): UpdatedOrderStatusResult {
  if (data.action !== "order.status.changed" ||
      data.actor?.id !== command.actorUid || data.entity?.id !== command.orderId ||
      data.before?.status !== command.expectedStatus || data.after?.status !== command.nextStatus ||
      !(data.createdAt instanceof Timestamp)) {
    throw new UpdateOrderStatusError(
      "failed-precondition", "stale-order", "requestId ya fue utilizado."
    );
  }
  return Object.freeze({
    orderId: command.orderId,
    status: command.nextStatus,
    updatedAt: data.createdAt.toDate().toISOString()
  });
}

export class FirestoreOrderStatusRepository implements UpdateOrderStatusRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async transition(command: UpdateOrderStatusCommand): Promise<UpdatedOrderStatusResult> {
    const tenantRef = this.firestore.doc(`establishments/${command.establishmentId}`);
    const memberRef = tenantRef.collection("members").doc(command.actorUid);
    const orderRef = tenantRef.collection("orders").doc(command.orderId).withConverter(orderConverter);
    const auditRef = tenantRef.collection("auditLogs").doc(`order-status-${command.requestId}`);

    return this.firestore.runTransaction(async (transaction) => {
      const [memberSnapshot, orderSnapshot, auditSnapshot] = await Promise.all([
        transaction.get(memberRef),
        transaction.get(orderRef),
        transaction.get(auditRef)
      ]);
      if (auditSnapshot.exists) {
        const audit = auditSnapshot.data();
        if (audit === undefined) throw new TypeError("El registro de auditoría no contiene datos.");
        return idempotentResult(audit, command);
      }
      if (!orderSnapshot.exists) {
        throw new UpdateOrderStatusError(
          "not-found", "order-not-found", "El pedido no existe."
        );
      }
      const actor = actorFromMembership(memberSnapshot.data(), command);
      const order = orderSnapshot.data();
      if (order === undefined || order.establishmentId !== command.establishmentId) {
        throw new TypeError("El pedido almacenado no pertenece al establecimiento.");
      }
      if (order.status !== command.expectedStatus) {
        throw new UpdateOrderStatusError(
          "failed-precondition", "stale-order", "El pedido cambió en otro dispositivo."
        );
      }
      if (!canTransitionOrder(order.status, command.nextStatus, actor)) {
        return denied("El rol actual no permite esa transición.");
      }

      const timestamp = command.updatedAt.toISOString();
      let cancelledSessionUpdate: {
        readonly reference: DocumentReference;
        readonly subtotalMinor: number;
        readonly balanceMinor: number;
      } | null = null;
      if (command.nextStatus === "cancelled") {
        const sessionRef = tenantRef.collection("tableSessions").doc(order.sessionId);
        const sessionSnapshot = await transaction.get(sessionRef);
        const session = sessionSnapshot.data();
        if (session === undefined || session.establishmentId !== command.establishmentId ||
            session.tableId !== order.tableId || session.status !== "open") {
          throw new UpdateOrderStatusError(
            "failed-precondition", "stale-order", "La sesión ya no permite cancelar el pedido."
          );
        }
        const subtotalMinor = parseMinorAmount(session.subtotalMinor, "subtotalMinor");
        const paidMinor = parseMinorAmount(session.paidMinor, "paidMinor");
        const nextSubtotalMinor = subtotalMinor - order.totalMinor;
        const nextBalanceMinor = nextSubtotalMinor - paidMinor;
        if (nextSubtotalMinor < 0 || nextBalanceMinor < 0) {
          throw new UpdateOrderStatusError(
            "failed-precondition", "stale-order", "El saldo de la sesión impide cancelar el pedido."
          );
        }
        cancelledSessionUpdate = {
          reference: sessionRef,
          subtotalMinor: nextSubtotalMinor,
          balanceMinor: nextBalanceMinor
        };
      }
      const nextOrder = parseOrder({
        ...order,
        status: command.nextStatus,
        statusTimestamps: {
          ...order.statusTimestamps,
          [command.nextStatus]: timestamp
        },
        updatedAt: timestamp
      });
      transaction.set(orderRef, nextOrder);
      if (cancelledSessionUpdate !== null) {
        transaction.update(cancelledSessionUpdate.reference, {
          subtotalMinor: cancelledSessionUpdate.subtotalMinor,
          balanceMinor: cancelledSessionUpdate.balanceMinor,
          updatedAt: Timestamp.fromDate(command.updatedAt)
        });
      }
      transaction.create(auditRef, {
        establishmentId: command.establishmentId,
        actor: { type: "member", id: command.actorUid },
        action: "order.status.changed",
        entity: { type: "order", id: command.orderId },
        before: { status: command.expectedStatus },
        after: { status: command.nextStatus },
        createdAt: Timestamp.fromDate(command.updatedAt)
      });
      return Object.freeze({
        orderId: command.orderId,
        status: command.nextStatus,
        updatedAt: timestamp
      });
    });
  }
}
