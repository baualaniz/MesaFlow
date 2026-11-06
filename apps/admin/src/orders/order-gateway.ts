import type { OrderStatus } from "@mesaflow/contracts";
import { FirebaseError } from "firebase/app";
import {
  Timestamp,
  doc,
  runTransaction,
  type DocumentReference
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { adminEnvironment } from "../config/environment";
import { adminFirestore, adminFunctions } from "../firebase/firebase";

interface UpdateOrderStatusResult {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly updatedAt: string;
}

function requestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

const transition = httpsCallable<{
  readonly establishmentId: string;
  readonly expectedStatus: OrderStatus;
  readonly nextStatus: OrderStatus;
  readonly orderId: string;
  readonly requestId: string;
}, UpdateOrderStatusResult>(adminFunctions, "updateOrderStatus");

export async function updateOrderStatus(
  establishmentId: string,
  orderId: string,
  expectedStatus: OrderStatus,
  nextStatus: OrderStatus
): Promise<UpdateOrderStatusResult> {
  if (adminEnvironment !== "emulator") {
    const updatedAt = Timestamp.now();
    await runTransaction(adminFirestore, async (transaction) => {
      const reference = doc(
        adminFirestore, "establishments", establishmentId, "orders", orderId
      );
      const snapshot = await transaction.get(reference);
      const order = snapshot.data();
      if (!snapshot.exists() || !order || order.status !== expectedStatus) {
        throw new Error("El pedido cambió en otro dispositivo. Revisá su estado actualizado.");
      }
      let sessionReference: DocumentReference | null = null;
      let sessionPatch: {
        readonly paidMinor: number;
        readonly balanceMinor: number;
        readonly status: "open" | "paid";
        readonly updatedAt: Timestamp;
      } | null = null;
      if (nextStatus === "completed") {
        sessionReference = doc(
          adminFirestore, "establishments", establishmentId,
          "tableSessions", String(order.sessionId)
        );
        const session = (await transaction.get(sessionReference)).data();
        if (!session || session.tableId !== order.tableId ||
            !Number.isSafeInteger(session.subtotalMinor) ||
            !Number.isSafeInteger(session.paidMinor) ||
            !Number.isSafeInteger(order.totalMinor)) {
          throw new Error("La cuenta de la mesa cambió o ya no está disponible.");
        }
        const paidMinor = Math.min(
          session.subtotalMinor as number,
          (session.paidMinor as number) + (order.totalMinor as number)
        );
        const balanceMinor = (session.subtotalMinor as number) - paidMinor;
        sessionPatch = {
          paidMinor,
          balanceMinor,
          status: balanceMinor === 0 ? "paid" : "open",
          updatedAt
        };
      }
      transaction.update(reference, {
        status: nextStatus,
        [`statusTimestamps.${nextStatus}`]: updatedAt,
        updatedAt
      });
      if (sessionReference !== null && sessionPatch !== null) {
        transaction.update(sessionReference, sessionPatch);
      }
    });
    return { orderId, status: nextStatus, updatedAt: updatedAt.toDate().toISOString() };
  }
  try {
    const result = await transition({
      establishmentId,
      expectedStatus,
      nextStatus,
      orderId,
      requestId: requestId()
    });
    return result.data;
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === "functions/failed-precondition") {
        throw new Error(
          "El pedido cambió en otro dispositivo. Revisá su estado actualizado.",
          { cause: error }
        );
      }
      if (error.code === "functions/permission-denied") {
        throw new Error("Tu rol ya no permite realizar esta acción.", { cause: error });
      }
      if (error.code === "functions/not-found") {
        throw new Error("El pedido ya no está disponible.", { cause: error });
      }
    }
    throw new Error("No pudimos actualizar el pedido. Intentá nuevamente.", { cause: error });
  }
}
