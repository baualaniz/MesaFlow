import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

import {
  CreateOrderError,
  createOrder as createOrderService,
  type CreatedOrderResult
} from "./create-order.js";
import { FirestoreOrderRepository } from "./data/firestore-order-repository.js";

const callableOptions = {
  region: "southamerica-east1",
  memory: "256MiB",
  timeoutSeconds: 10,
  minInstances: 0,
  maxInstances: 3,
  concurrency: 20,
  enforceAppCheck: false
} as const;

function callableError(error: unknown): HttpsError {
  if (error instanceof CreateOrderError) {
    return new HttpsError(error.code, error.message, { reason: error.reason });
  }
  console.error("Fallo interno al crear un pedido", error);
  return new HttpsError("internal", "No pudimos enviar el pedido en este momento.");
}

async function handleCreateOrder(
  request: CallableRequest<unknown>
): Promise<CreatedOrderResult> {
  try {
    return await createOrderService(
      request.data,
      request.auth?.uid,
      new FirestoreOrderRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

export const createOrder = onCall(callableOptions, handleCreateOrder);
