import { timingSafeEqual } from "node:crypto";

import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore
} from "firebase-admin/firestore";

import {
  QrSessionError,
  type QrExchangeCommand,
  type QrRestoreQuery,
  type QrSessionAccess,
  type QrSessionRepository
} from "../qr-session.js";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const RESTORABLE_SESSION_STATUSES = new Set(["open", "payment_pending"]);

function dataOf(snapshot: DocumentSnapshot): DocumentData {
  if (!snapshot.exists) {
    throw new QrSessionError("permission-denied", "El QR no corresponde a una mesa disponible.");
  }
  return snapshot.data() ?? {};
}

function activeSlug(snapshot: DocumentSnapshot): string {
  const data = dataOf(snapshot);
  if (data.active !== true || typeof data.establishmentId !== "string") {
    throw new QrSessionError("permission-denied", "El QR no corresponde a una mesa disponible.");
  }
  return data.establishmentId;
}

function secureHashMatches(stored: unknown, received: string): boolean {
  if (typeof stored !== "string" || !HASH_PATTERN.test(stored) || !HASH_PATTERN.test(received)) {
    return false;
  }
  return timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(received, "hex"));
}

function sessionAccess(
  establishmentId: string,
  tableId: string,
  establishment: DocumentData,
  settings: DocumentData,
  table: DocumentData,
  session: DocumentData
): QrSessionAccess {
  if (
    establishment.active !== true ||
    typeof establishment.name !== "string" ||
    settings.establishmentId !== establishmentId ||
    typeof settings.brandName !== "string" ||
    settings.brandName.trim().length < 2 ||
    table.establishmentId !== establishmentId ||
    table.active !== true ||
    typeof table.name !== "string" ||
    typeof table.currentSessionId !== "string" ||
    session.establishmentId !== establishmentId ||
    session.tableId !== tableId ||
    !RESTORABLE_SESSION_STATUSES.has(session.status)
  ) {
    throw new QrSessionError("permission-denied", "La mesa no tiene una sesión disponible.");
  }
  return Object.freeze({
    establishmentId,
    establishmentName: settings.brandName.trim(),
    tableId,
    tableName: table.name,
    sessionId: table.currentSessionId
  });
}

export class FirestoreQrSessionRepository implements QrSessionRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async exchange(command: QrExchangeCommand): Promise<QrSessionAccess> {
    const slugRef = this.firestore.doc(`establishmentSlugs/${command.establishmentSlug}`);
    return this.firestore.runTransaction(async (transaction) => {
      const slug = await transaction.get(slugRef);
      const establishmentId = activeSlug(slug);
      const establishmentRef = this.firestore.doc(`establishments/${establishmentId}`);
      const settingsRef = establishmentRef.collection("settings").doc("public");
      const tableRef = establishmentRef.collection("tables").doc(command.tableId);
      const [establishmentSnapshot, settingsSnapshot, tableSnapshot] = await Promise.all([
        transaction.get(establishmentRef),
        transaction.get(settingsRef),
        transaction.get(tableRef)
      ]);
      const establishment = dataOf(establishmentSnapshot);
      const settings = dataOf(settingsSnapshot);
      const table = dataOf(tableSnapshot);
      if (!secureHashMatches(table.qrTokenHash, command.tokenHash)) {
        throw new QrSessionError("permission-denied", "El token QR no está vigente.");
      }
      if (!Number.isSafeInteger(table.qrVersion) || (table.qrVersion as number) < 1) {
        throw new QrSessionError("failed-precondition", "La mesa no tiene una versión QR válida.");
      }
      if (typeof table.currentSessionId !== "string") {
        throw new QrSessionError("permission-denied", "La mesa no tiene una sesión disponible.");
      }

      const sessionRef = establishmentRef.collection("tableSessions").doc(table.currentSessionId);
      const participantRef = sessionRef.collection("participants").doc(command.uid);
      const exchangeRef = establishmentRef.collection("qrExchanges").doc(command.exchangeId);
      const [sessionSnapshot, participantSnapshot, exchangeSnapshot] = await Promise.all([
        transaction.get(sessionRef),
        transaction.get(participantRef),
        transaction.get(exchangeRef)
      ]);
      const session = dataOf(sessionSnapshot);
      const access = sessionAccess(
        establishmentId,
        command.tableId,
        establishment,
        settings,
        table,
        session
      );
      if (session.status !== "open") {
        throw new QrSessionError("permission-denied", "La sesión ya no admite nuevos participantes.");
      }
      if (participantSnapshot.exists || exchangeSnapshot.exists) {
        throw new QrSessionError("already-exists", "Este QR ya fue canjeado por la sesión actual.");
      }

      transaction.create(participantRef, {
        establishmentId,
        sessionId: access.sessionId,
        uid: command.uid,
        active: true,
        joinedAt: Timestamp.fromDate(command.usedAt),
        revokedAt: null
      });
      transaction.create(exchangeRef, {
        establishmentId,
        sessionId: access.sessionId,
        tableId: command.tableId,
        uid: command.uid,
        tokenHash: command.tokenHash,
        qrVersion: table.qrVersion,
        used: true,
        usedAt: Timestamp.fromDate(command.usedAt),
        expiresAt: Timestamp.fromDate(command.expiresAt)
      });
      return access;
    });
  }

  async restore(query: QrRestoreQuery): Promise<QrSessionAccess> {
    const slug = await this.firestore.doc(`establishmentSlugs/${query.establishmentSlug}`).get();
    const establishmentId = activeSlug(slug);
    const establishmentRef = this.firestore.doc(`establishments/${establishmentId}`);
    const settingsRef = establishmentRef.collection("settings").doc("public");
    const tableRef = establishmentRef.collection("tables").doc(query.tableId);
    const [establishmentSnapshot, settingsSnapshot, tableSnapshot] = await Promise.all([
      establishmentRef.get(),
      settingsRef.get(),
      tableRef.get()
    ]);
    const establishment = dataOf(establishmentSnapshot);
    const settings = dataOf(settingsSnapshot);
    const table = dataOf(tableSnapshot);
    if (typeof table.currentSessionId !== "string") {
      throw new QrSessionError("permission-denied", "La mesa no tiene una sesión disponible.");
    }
    const sessionRef = establishmentRef.collection("tableSessions").doc(table.currentSessionId);
    const [sessionSnapshot, participantSnapshot] = await Promise.all([
      sessionRef.get(),
      sessionRef.collection("participants").doc(query.uid).get()
    ]);
    const session = dataOf(sessionSnapshot);
    const participant = dataOf(participantSnapshot);
    if (
      participant.establishmentId !== establishmentId ||
      participant.sessionId !== table.currentSessionId ||
      participant.uid !== query.uid ||
      participant.active !== true
    ) {
      throw new QrSessionError("permission-denied", "La sesión local no tiene acceso a esta mesa.");
    }
    return sessionAccess(establishmentId, query.tableId, establishment, settings, table, session);
  }
}
