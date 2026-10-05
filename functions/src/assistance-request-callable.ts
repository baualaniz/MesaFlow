import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

import {
  AssistanceError,
  cancelAssistanceRequest as cancelService,
  createAssistanceRequest as createService,
  type AssistanceResult
} from "./assistance-request.js";
import { FirestoreAssistanceRepository } from "./data/firestore-assistance-repository.js";

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
  if (error instanceof AssistanceError) {
    return new HttpsError(error.code, error.message, { reason: error.reason });
  }
  console.error("Fallo interno al gestionar una solicitud de asistencia", error);
  return new HttpsError("internal", "No pudimos gestionar la solicitud en este momento.");
}

async function createHandler(request: CallableRequest<unknown>): Promise<AssistanceResult> {
  try {
    return await createService(
      request.data,
      request.auth?.uid,
      new FirestoreAssistanceRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

async function cancelHandler(request: CallableRequest<unknown>): Promise<AssistanceResult> {
  try {
    return await cancelService(
      request.data,
      request.auth?.uid,
      new FirestoreAssistanceRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

export const createAssistanceRequest = onCall(callableOptions, createHandler);
export const cancelAssistanceRequest = onCall(callableOptions, cancelHandler);
