import type { OrderStatus } from "@mesaflow/contracts";
import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

import { adminFunctions } from "../firebase/firebase";

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
