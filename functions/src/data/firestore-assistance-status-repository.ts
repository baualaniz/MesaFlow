import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type Firestore
} from "firebase-admin/firestore";

import { parseAssistanceRequest } from "@mesaflow/contracts";

import {
  UpdateAssistanceStatusError,
  type UpdatedAssistanceStatusResult,
  type UpdateAssistanceStatusCommand,
  type UpdateAssistanceStatusRepository
} from "../update-assistance-status.js";
import { assistanceRequestConverter } from "./firestore-converters.js";

function denied(message: string): never {
  throw new UpdateAssistanceStatusError(
    "permission-denied", "unauthorized-transition", message
  );
}

function requireActor(data: DocumentData | undefined, command: UpdateAssistanceStatusCommand): void {
  if (data === undefined || data.active !== true || data.uid !== command.actorUid ||
      data.establishmentId !== command.establishmentId || typeof data.role !== "string" ||
      !Array.isArray(data.permissions) ||
      data.permissions.some((permission: unknown) => typeof permission !== "string")) {
    denied("La cuenta no tiene una membresía operativa válida.");
  }
  if (!["owner", "manager"].includes(data.role) &&
      !(data.permissions as string[]).includes("assistance.manage")) {
    denied("Tu rol no permite atender solicitudes de asistencia.");
  }
}

function idempotentResult(
  data: DocumentData,
  command: UpdateAssistanceStatusCommand
): UpdatedAssistanceStatusResult {
  if (data.action !== "assistance.status.changed" ||
      data.actor?.id !== command.actorUid || data.entity?.id !== command.requestId ||
      data.before?.status !== command.expectedStatus || data.after?.status !== command.nextStatus ||
      !(data.createdAt instanceof Timestamp)) {
    throw new UpdateAssistanceStatusError(
      "failed-precondition", "stale-assistance", "operationId ya fue utilizado."
    );
  }
  return Object.freeze({
    requestId: command.requestId,
    status: command.nextStatus,
    updatedAt: data.createdAt.toDate().toISOString()
  });
}

export class FirestoreAssistanceStatusRepository implements UpdateAssistanceStatusRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async transition(command: UpdateAssistanceStatusCommand): Promise<UpdatedAssistanceStatusResult> {
    const tenantRef = this.firestore.doc(`establishments/${command.establishmentId}`);
    const memberRef = tenantRef.collection("members").doc(command.actorUid);
    const requestRef = tenantRef.collection("assistanceRequests")
      .doc(command.requestId).withConverter(assistanceRequestConverter);
    const auditRef = tenantRef.collection("auditLogs")
      .doc(`assistance-status-${command.operationId}`);

    return this.firestore.runTransaction(async (transaction) => {
      const [memberSnapshot, requestSnapshot, auditSnapshot] = await Promise.all([
        transaction.get(memberRef),
        transaction.get(requestRef),
        transaction.get(auditRef)
      ]);
      if (auditSnapshot.exists) {
        const audit = auditSnapshot.data();
        if (audit === undefined) throw new TypeError("El registro de auditoría no contiene datos.");
        return idempotentResult(audit, command);
      }
      requireActor(memberSnapshot.data(), command);
      if (!requestSnapshot.exists) {
        throw new UpdateAssistanceStatusError(
          "not-found", "assistance-not-found", "La solicitud de asistencia no existe."
        );
      }
      const request = requestSnapshot.data();
      if (request === undefined || request.establishmentId !== command.establishmentId) {
        throw new TypeError("La solicitud almacenada no pertenece al establecimiento.");
      }
      if (request.status !== command.expectedStatus) {
        throw new UpdateAssistanceStatusError(
          "failed-precondition", "stale-assistance",
          "La solicitud cambió en otro dispositivo."
        );
      }

      const timestamp = command.updatedAt.toISOString();
      const nextRequest = parseAssistanceRequest({
        ...request,
        status: command.nextStatus,
        acknowledgedBy: command.nextStatus === "acknowledged"
          ? command.actorUid
          : request.acknowledgedBy,
        resolvedBy: command.nextStatus === "resolved" ? command.actorUid : null,
        updatedAt: timestamp
      });
      transaction.set(requestRef, nextRequest);
      transaction.create(auditRef, {
        establishmentId: command.establishmentId,
        actor: { type: "member", id: command.actorUid },
        action: "assistance.status.changed",
        entity: { type: "assistanceRequest", id: command.requestId },
        before: { status: command.expectedStatus },
        after: { status: command.nextStatus },
        createdAt: Timestamp.fromDate(command.updatedAt)
      });
      return Object.freeze({
        requestId: command.requestId,
        status: command.nextStatus,
        updatedAt: timestamp
      });
    });
  }
}
