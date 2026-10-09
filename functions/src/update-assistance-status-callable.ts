import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

import { FirestoreAssistanceStatusRepository } from "./data/firestore-assistance-status-repository.js";
import {
  UpdateAssistanceStatusError,
  updateAssistanceStatus as updateAssistanceStatusService,
  type UpdatedAssistanceStatusResult
} from "./update-assistance-status.js";
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
  if (error instanceof UpdateAssistanceStatusError) {
    return new HttpsError(error.code, error.message, { reason: error.reason });
  }
  logInternalError("Fallo interno al actualizar asistencia", error);
  return new HttpsError("internal", "No pudimos actualizar la solicitud en este momento.");
}

async function handleUpdateAssistanceStatus(
  request: CallableRequest<unknown>
): Promise<UpdatedAssistanceStatusResult> {
  try {
    return await updateAssistanceStatusService(
      request.data,
      request.auth?.uid,
      new FirestoreAssistanceStatusRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

export const updateAssistanceStatus = onCall(callableOptions, handleUpdateAssistanceStatus);
