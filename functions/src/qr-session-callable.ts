import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

import { FirestoreQrSessionRepository } from "./data/firestore-qr-session-repository.js";
import {
  QrSessionError,
  exchangeQrSessionAccess,
  restoreQrSessionAccess,
  type QrSessionAccess
} from "./qr-session.js";

const qrCallableOptions = {
  region: "southamerica-east1",
  memory: "256MiB",
  timeoutSeconds: 10,
  minInstances: 0,
  maxInstances: 3,
  concurrency: 20,
  enforceAppCheck: false
} as const;

function callableError(error: unknown): HttpsError {
  if (error instanceof QrSessionError) {
    return new HttpsError(error.code, error.message);
  }
  console.error("Fallo interno al procesar una sesión QR", error);
  return new HttpsError("internal", "No pudimos validar la mesa en este momento.");
}

async function handleExchange(request: CallableRequest<unknown>): Promise<QrSessionAccess> {
  try {
    return await exchangeQrSessionAccess(
      request.data,
      request.auth?.uid,
      new FirestoreQrSessionRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

async function handleRestore(request: CallableRequest<unknown>): Promise<QrSessionAccess> {
  try {
    return await restoreQrSessionAccess(
      request.data,
      request.auth?.uid,
      new FirestoreQrSessionRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

export const exchangeQrSession = onCall(
  qrCallableOptions,
  handleExchange
);

export const restoreQrSession = onCall(
  qrCallableOptions,
  handleRestore
);
