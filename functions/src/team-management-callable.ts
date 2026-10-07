import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

import { FirestoreTeamManagementRepository } from "./data/firestore-team-management-repository.js";
import {
  manageTeam as manageTeamService,
  TeamManagementError,
  type TeamManagementResult
} from "./team-management.js";

const callableOptions = {
  region: "southamerica-east1",
  memory: "256MiB",
  timeoutSeconds: 15,
  minInstances: 0,
  maxInstances: 3,
  concurrency: 20,
  enforceAppCheck: false
} as const;

function callableError(error: unknown): HttpsError {
  if (error instanceof TeamManagementError) return new HttpsError(error.code, error.message);
  console.error("Fallo interno al administrar el equipo", error);
  return new HttpsError("internal", "No pudimos administrar el equipo en este momento.");
}

async function handleManageTeam(request: CallableRequest<unknown>): Promise<TeamManagementResult> {
  try {
    return await manageTeamService(
      request.data,
      request.auth?.uid,
      new FirestoreTeamManagementRepository()
    );
  } catch (error) {
    throw callableError(error);
  }
}

export const manageTeam = onCall(callableOptions, handleManageTeam);
