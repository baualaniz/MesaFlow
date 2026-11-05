import type { AssistanceStatus } from "@mesaflow/contracts";
import { FirebaseError } from "firebase/app";
import { Timestamp, doc, runTransaction } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { adminEnvironment } from "../config/environment";
import { adminFirestore, adminFunctions } from "../firebase/firebase";

interface UpdateAssistanceStatusResult {
  readonly requestId: string;
  readonly status: AssistanceStatus;
  readonly updatedAt: string;
}

function operationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

const transition = httpsCallable<{
  readonly establishmentId: string;
  readonly expectedStatus: AssistanceStatus;
  readonly nextStatus: AssistanceStatus;
  readonly operationId: string;
  readonly requestId: string;
}, UpdateAssistanceStatusResult>(adminFunctions, "updateAssistanceStatus");

export async function updateAssistanceStatus(
  establishmentId: string,
  requestId: string,
  expectedStatus: AssistanceStatus,
  nextStatus: AssistanceStatus
): Promise<UpdateAssistanceStatusResult> {
  if (adminEnvironment !== "emulator") {
    const updatedAt = Timestamp.now();
    await runTransaction(adminFirestore, async (transaction) => {
      const reference = doc(
        adminFirestore, "establishments", establishmentId,
        "assistanceRequests", requestId
      );
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists() || snapshot.data().status !== expectedStatus) {
        throw new Error("La solicitud cambió en otro dispositivo. Revisá su estado actualizado.");
      }
      transaction.update(reference, { status: nextStatus, updatedAt });
    });
    return { requestId, status: nextStatus, updatedAt: updatedAt.toDate().toISOString() };
  }
  try {
    const result = await transition({
      establishmentId,
      expectedStatus,
      nextStatus,
      operationId: operationId(),
      requestId
    });
    return result.data;
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === "functions/failed-precondition") {
        throw new Error(
          "La solicitud cambió en otro dispositivo. Revisá su estado actualizado.",
          { cause: error }
        );
      }
      if (error.code === "functions/permission-denied") {
        throw new Error("Tu rol ya no permite realizar esta acción.", { cause: error });
      }
      if (error.code === "functions/not-found") {
        throw new Error("La solicitud ya no está disponible.", { cause: error });
      }
    }
    throw new Error("No pudimos actualizar la solicitud. Intentá nuevamente.", { cause: error });
  }
}
