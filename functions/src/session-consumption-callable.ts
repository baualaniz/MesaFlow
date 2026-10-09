import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

import {
  ConsumptionError,
  getSessionConsumption as getService,
  type ConsumptionResult
} from "./session-consumption.js";
import { FirestoreConsumptionRepository } from "./data/firestore-consumption-repository.js";
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
  if (error instanceof ConsumptionError) {
    return new HttpsError(error.code, error.message, { reason: error.reason });
  }
  logInternalError("Fallo interno al calcular el consumo de la sesión", error);
  return new HttpsError("internal", "No pudimos calcular el consumo en este momento.");
}

async function handleGetConsumption(
  request: CallableRequest<unknown>
): Promise<ConsumptionResult> {
  try {
    return await getService(
      request.data,
      request.auth?.uid,
      new FirestoreConsumptionRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

export const getSessionConsumption = onCall(callableOptions, handleGetConsumption);
