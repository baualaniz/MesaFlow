import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

import { FirestoreTableManagementRepository } from "./data/firestore-table-management-repository.js";
import {
  manageTable as manageTableService,
  TableManagementError,
  type TableManagementResult
} from "./manage-table.js";
import { CALLABLE_SECURITY_OPTIONS, logInternalError } from "./security.js";

const callableOptions = {
  region: "southamerica-east1",
  memory: "256MiB",
  timeoutSeconds: 15,
  minInstances: 0,
  maxInstances: 3,
  concurrency: 20,
  ...CALLABLE_SECURITY_OPTIONS
} as const;

function callableError(error: unknown): HttpsError {
  if (error instanceof TableManagementError) {
    return new HttpsError(error.code, error.message);
  }
  logInternalError("Fallo interno al administrar una mesa", error);
  return new HttpsError("internal", "No pudimos administrar la mesa en este momento.");
}

async function handleManageTable(request: CallableRequest<unknown>): Promise<TableManagementResult> {
  try {
    return await manageTableService(
      request.data,
      request.auth?.uid,
      new FirestoreTableManagementRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

export const manageTable = onCall(callableOptions, handleManageTable);
