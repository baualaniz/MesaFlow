import {
  getFirestore,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore
} from "firebase-admin/firestore";

import {
  parseAssistanceRequest,
  type AssistanceRequestContract
} from "@mesaflow/contracts";

import {
  AssistanceError,
  type AssistanceCommand,
  type AssistanceRepository,
  type AssistanceResult,
  type CreateAssistanceCommand
} from "../assistance-request.js";
import { assistanceRequestConverter } from "./firestore-converters.js";

const COOLDOWN_MILLISECONDS = 60_000;

function raw(snapshot: DocumentSnapshot, message: string): DocumentData {
  if (!snapshot.exists) {
    throw new AssistanceError("permission-denied", "session-unavailable", message);
  }
  return snapshot.data() ?? {};
}

function result(requestId: string, request: AssistanceRequestContract): AssistanceResult {
  return Object.freeze({
    requestId,
    type: request.type,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt
  });
}

function requireAccess(
  command: AssistanceCommand,
  establishment: DocumentData,
  table: DocumentData,
  session: DocumentData,
  participant: DocumentData,
  settings: DocumentData,
  requireAssistanceEnabled = true
): void {
  if (
    establishment.active !== true ||
    table.establishmentId !== command.establishmentId ||
    table.active !== true ||
    table.currentSessionId !== command.sessionId ||
    session.establishmentId !== command.establishmentId ||
    session.tableId !== command.tableId ||
    !["open", "payment_pending"].includes(session.status) ||
    participant.establishmentId !== command.establishmentId ||
    participant.sessionId !== command.sessionId ||
    participant.uid !== command.uid ||
    participant.active !== true
  ) {
    throw new AssistanceError(
      "permission-denied",
      "session-unavailable",
      "La sesión de mesa ya no admite solicitudes."
    );
  }
  if (settings.establishmentId !== command.establishmentId ||
      (requireAssistanceEnabled && settings.assistanceEnabled !== true)) {
    throw new AssistanceError(
      "failed-precondition",
      "assistance-disabled",
      "La asistencia desde la mesa no está disponible."
    );
  }
}

export class FirestoreAssistanceRepository implements AssistanceRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async create(command: CreateAssistanceCommand): Promise<AssistanceResult> {
    const refs = this.references(command);
    return this.firestore.runTransaction(async (transaction) => {
      const [establishmentSnapshot, tableSnapshot, sessionSnapshot,
        participantSnapshot, settingsSnapshot, requestSnapshot] = await Promise.all([
        transaction.get(refs.establishment),
        transaction.get(refs.table),
        transaction.get(refs.session),
        transaction.get(refs.participant),
        transaction.get(refs.settings),
        transaction.get(refs.request)
      ]);
      requireAccess(
        command,
        raw(establishmentSnapshot, "El establecimiento no existe."),
        raw(tableSnapshot, "La mesa no existe."),
        raw(sessionSnapshot, "La sesión no existe."),
        raw(participantSnapshot, "La participación no existe."),
        raw(settingsSnapshot, "La configuración pública no existe.")
      );

      const existing = requestSnapshot.data();
      if (existing !== undefined &&
          (existing.establishmentId !== command.establishmentId ||
            existing.sessionId !== command.sessionId ||
            existing.tableId !== command.tableId)) {
        throw new AssistanceError(
          "permission-denied",
          "session-unavailable",
          "La solicitud no corresponde a esta sesión."
        );
      }
      if (existing?.status === "pending" || existing?.status === "acknowledged") {
        return result(requestSnapshot.id, existing);
      }
      if (existing !== undefined) {
        const updatedAt = Date.parse(existing.updatedAt);
        if (command.createdAt.getTime() - updatedAt < COOLDOWN_MILLISECONDS) {
          throw new AssistanceError(
            "failed-precondition",
            "rate-limited",
            "Esperá un minuto antes de enviar otra solicitud."
          );
        }
      }

      const timestamp = command.createdAt.toISOString();
      const request = parseAssistanceRequest({
        establishmentId: command.establishmentId,
        sessionId: command.sessionId,
        tableId: command.tableId,
        customerUid: command.uid,
        type: command.type,
        status: "pending",
        acknowledgedBy: null,
        resolvedBy: null,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      transaction.set(refs.request, request);
      return result(refs.request.id, request);
    });
  }

  async cancel(command: AssistanceCommand): Promise<AssistanceResult> {
    const refs = this.references(command);
    return this.firestore.runTransaction(async (transaction) => {
      const [establishmentSnapshot, tableSnapshot, sessionSnapshot,
        participantSnapshot, settingsSnapshot, requestSnapshot] = await Promise.all([
        transaction.get(refs.establishment),
        transaction.get(refs.table),
        transaction.get(refs.session),
        transaction.get(refs.participant),
        transaction.get(refs.settings),
        transaction.get(refs.request)
      ]);
      requireAccess(
        command,
        raw(establishmentSnapshot, "El establecimiento no existe."),
        raw(tableSnapshot, "La mesa no existe."),
        raw(sessionSnapshot, "La sesión no existe."),
        raw(participantSnapshot, "La participación no existe."),
        raw(settingsSnapshot, "La configuración pública no existe."),
        false
      );
      const existing = requestSnapshot.data();
      if (existing === undefined ||
          existing.establishmentId !== command.establishmentId ||
          existing.sessionId !== command.sessionId ||
          existing.tableId !== command.tableId) {
        throw new AssistanceError(
          "failed-precondition",
          "request-unavailable",
          "No hay una solicitud pendiente para cancelar."
        );
      }
      if (existing.status === "cancelled") return result(requestSnapshot.id, existing);
      if (existing.status !== "pending") {
        throw new AssistanceError(
          "failed-precondition",
          "request-in-progress",
          "El personal ya está atendiendo la solicitud."
        );
      }
      const cancelled = parseAssistanceRequest({
        ...existing,
        status: "cancelled",
        updatedAt: command.createdAt.toISOString()
      });
      transaction.set(refs.request, cancelled);
      return result(requestSnapshot.id, cancelled);
    });
  }

  private references(command: AssistanceCommand) {
    const establishment = this.firestore.doc(
      `establishments/${command.establishmentId}`
    );
    const session = establishment.collection("tableSessions").doc(command.sessionId);
    return {
      establishment,
      table: establishment.collection("tables").doc(command.tableId),
      session,
      participant: session.collection("participants").doc(command.uid),
      settings: establishment.collection("settings").doc("public"),
      request: establishment.collection("assistanceRequests")
        .doc(command.sessionId)
        .withConverter(assistanceRequestConverter)
    };
  }
}
