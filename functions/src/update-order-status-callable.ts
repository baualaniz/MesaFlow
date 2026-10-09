import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

import { FirestoreOrderStatusRepository } from "./data/firestore-order-status-repository.js";
import {
  UpdateOrderStatusError,
  updateOrderStatus as updateOrderStatusService,
  type UpdatedOrderStatusResult
} from "./update-order-status.js";
import { CALLABLE_SECURITY_OPTIONS, logInternalError } from "./security.js";

const callableOptions = {
  region: "southamerica-east1",
  memory: "256MiB",
  timeoutSeconds: 10,
  minInstances: 0,
  maxInstances: 3,
  concurrency: 20,
  ...CALLABLE_SECURITY_OPTIONS
} as const;

function callableError(error: unknown): HttpsError {
  if (error instanceof UpdateOrderStatusError) {
    return new HttpsError(error.code, error.message, { reason: error.reason });
  }
  logInternalError("Fallo interno al actualizar un pedido", error);
  return new HttpsError("internal", "No pudimos actualizar el pedido en este momento.");
}

async function handleUpdateOrderStatus(
  request: CallableRequest<unknown>
): Promise<UpdatedOrderStatusResult> {
  try {
    return await updateOrderStatusService(
      request.data,
      request.auth?.uid,
      new FirestoreOrderStatusRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

export const updateOrderStatus = onCall(callableOptions, handleUpdateOrderStatus);
