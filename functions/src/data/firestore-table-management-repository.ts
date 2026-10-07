import { createHash } from "node:crypto";

import {
  getFirestore,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Transaction
} from "firebase-admin/firestore";

import {
  TableManagementError,
  type TableManagementCommand,
  type TableManagementRepository,
  type TableManagementResult
} from "../manage-table.js";

const ACTIVE_ORDER_STATUSES = new Set(["created", "confirmed", "preparing", "ready", "delivered"]);

function denied(message = "La cuenta no puede administrar mesas."): never {
  throw new TableManagementError("permission-denied", message);
}

function authorize(data: DocumentData | undefined, command: TableManagementCommand): void {
  if (data === undefined || data.active !== true || data.uid !== command.actorUid ||
      data.establishmentId !== command.establishmentId ||
      !["owner", "manager"].includes(String(data.role)) ||
      !Array.isArray(data.permissions) ||
      !data.permissions.some((permission: unknown) =>
        permission === "orders.manage" || permission === "establishment.manage")) {
    denied();
  }
}

function tableData(data: DocumentData | undefined, establishmentId: string): DocumentData {
  if (data === undefined) throw new TableManagementError("not-found", "La mesa no existe.");
  if (data.establishmentId !== establishmentId || typeof data.name !== "string" ||
      !Number.isSafeInteger(data.number) || typeof data.active !== "boolean" ||
      typeof data.qrTokenHash !== "string" || !Number.isSafeInteger(data.qrVersion) ||
      !(data.updatedAt instanceof Timestamp)) {
    throw new TypeError("La mesa almacenada no cumple el contrato.");
  }
  return data;
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function tableId(number: number): string {
  return `mesa-${String(number).padStart(2, "0")}`;
}

function sessionId(requestId: string): string {
  return `session-${requestId}`;
}

function idempotentResult(data: DocumentData, command: TableManagementCommand): TableManagementResult {
  if (data.establishmentId !== command.establishmentId ||
      data.actor?.id !== command.actorUid || data.action !== `table.${command.action}` ||
      data.result === null || typeof data.result !== "object" ||
      typeof data.result.updatedAt !== "string" || data.result.action !== command.action) {
    throw new TableManagementError("failed-precondition", "requestId ya fue utilizado.");
  }
  return data.result as TableManagementResult;
}

function result(
  command: TableManagementCommand,
  extra: Omit<TableManagementResult, "action" | "updatedAt">
): TableManagementResult {
  return Object.freeze({
    action: command.action,
    ...extra,
    updatedAt: command.updatedAt.toISOString()
  });
}

function audit(
  transaction: Transaction,
  reference: DocumentReference,
  command: TableManagementCommand,
  operationResult: TableManagementResult,
  before: unknown,
  after: unknown,
  entityId: string
): void {
  transaction.create(reference, {
    establishmentId: command.establishmentId,
    actor: { type: "member", id: command.actorUid },
    action: `table.${command.action}`,
    entity: { type: "table", id: entityId },
    before,
    after,
    result: operationResult,
    createdAt: Timestamp.fromDate(command.updatedAt)
  });
}

export class FirestoreTableManagementRepository implements TableManagementRepository {
  constructor(private readonly firestore: Firestore = getFirestore()) {}

  async execute(command: TableManagementCommand): Promise<TableManagementResult> {
    const tenantRef = this.firestore.doc(`establishments/${command.establishmentId}`);
    const memberRef = tenantRef.collection("members").doc(command.actorUid);
    const auditRef = tenantRef.collection("auditLogs").doc(`table-action-${command.requestId}`);

    return this.firestore.runTransaction(async (transaction) => {
      const [memberSnapshot, auditSnapshot] = await Promise.all([
        transaction.get(memberRef),
        transaction.get(auditRef)
      ]);
      authorize(memberSnapshot.data(), command);
      if (auditSnapshot.exists) {
        const existing = auditSnapshot.data();
        if (existing === undefined) throw new TypeError("La auditoría no contiene datos.");
        return idempotentResult(existing, command);
      }

      switch (command.action) {
        case "create": {
          const id = tableId(command.number);
          const reference = tenantRef.collection("tables").doc(id);
          const snapshot = await transaction.get(reference);
          if (snapshot.exists) {
            throw new TableManagementError("already-exists", "Ya existe una mesa con ese número.");
          }
          const timestamp = Timestamp.fromDate(command.updatedAt);
          const data = {
            establishmentId: command.establishmentId,
            number: command.number,
            name: command.name,
            qrTokenHash: tokenHash(command.token),
            qrVersion: 1,
            active: true,
            currentSessionId: null,
            createdAt: timestamp,
            updatedAt: timestamp
          };
          const operationResult = result(command, { tableId: id, tables: [{ tableId: id, qrVersion: 1 }] });
          transaction.create(reference, data);
          audit(transaction, auditRef, command, operationResult, null, {
            name: command.name, number: command.number, active: true, qrVersion: 1
          }, id);
          return operationResult;
        }
        case "update": {
          const reference = tenantRef.collection("tables").doc(command.tableId);
          const snapshot = await transaction.get(reference);
          const before = tableData(snapshot.data(), command.establishmentId);
          if (before.updatedAt.toDate().toISOString() !== command.expectedUpdatedAt) {
            throw new TableManagementError("failed-precondition", "La mesa cambió en otro dispositivo.");
          }
          if (before.number !== command.number) {
            throw new TableManagementError("failed-precondition", "El número de una mesa existente no puede cambiarse.");
          }
          if (!command.active && before.currentSessionId !== null) {
            throw new TableManagementError("failed-precondition", "Cerrá la sesión antes de desactivar la mesa.");
          }
          const operationResult = result(command, { tableId: command.tableId });
          transaction.update(reference, {
            name: command.name,
            active: command.active,
            updatedAt: Timestamp.fromDate(command.updatedAt)
          });
          audit(transaction, auditRef, command, operationResult, {
            name: before.name, number: before.number, active: before.active
          }, { name: command.name, number: command.number, active: command.active }, command.tableId);
          return operationResult;
        }
        case "delete": {
          const reference = tenantRef.collection("tables").doc(command.tableId);
          const sessions = tenantRef.collection("tableSessions")
            .where("tableId", "==", command.tableId).limit(1);
          const [snapshot, sessionSnapshot] = await Promise.all([
            transaction.get(reference),
            transaction.get(sessions)
          ]);
          const before = tableData(snapshot.data(), command.establishmentId);
          if (before.updatedAt.toDate().toISOString() !== command.expectedUpdatedAt) {
            throw new TableManagementError("failed-precondition", "La mesa cambió en otro dispositivo.");
          }
          if (before.currentSessionId !== null || !sessionSnapshot.empty) {
            throw new TableManagementError(
              "failed-precondition", "Una mesa con historial no se elimina; podés desactivarla."
            );
          }
          const operationResult = result(command, { tableId: command.tableId });
          transaction.delete(reference);
          audit(transaction, auditRef, command, operationResult, {
            name: before.name, number: before.number, active: before.active
          }, null, command.tableId);
          return operationResult;
        }
        case "openSession": {
          const reference = tenantRef.collection("tables").doc(command.tableId);
          const snapshot = await transaction.get(reference);
          const table = tableData(snapshot.data(), command.establishmentId);
          if (!table.active) {
            throw new TableManagementError("failed-precondition", "La mesa está desactivada.");
          }
          if (table.currentSessionId !== null) {
            throw new TableManagementError("failed-precondition", "La mesa ya tiene una sesión abierta.");
          }
          const nextSessionId = sessionId(command.requestId);
          const sessionRef = tenantRef.collection("tableSessions").doc(nextSessionId);
          const operationResult = result(command, { tableId: command.tableId, sessionId: nextSessionId });
          const timestamp = Timestamp.fromDate(command.updatedAt);
          transaction.create(sessionRef, {
            establishmentId: command.establishmentId,
            tableId: command.tableId,
            status: "open",
            subtotalMinor: 0,
            paidMinor: 0,
            balanceMinor: 0,
            openedAt: timestamp,
            closedAt: null,
            updatedAt: timestamp
          });
          transaction.update(reference, { currentSessionId: nextSessionId, updatedAt: timestamp });
          audit(transaction, auditRef, command, operationResult, { currentSessionId: null }, {
            currentSessionId: nextSessionId, status: "open"
          }, command.tableId);
          return operationResult;
        }
        case "closeSession": {
          const reference = tenantRef.collection("tables").doc(command.tableId);
          const sessionRef = tenantRef.collection("tableSessions").doc(command.sessionId);
          const orders = tenantRef.collection("orders").where("sessionId", "==", command.sessionId).limit(101);
          const [tableSnapshot, sessionSnapshot, orderSnapshot] = await Promise.all([
            transaction.get(reference),
            transaction.get(sessionRef),
            transaction.get(orders)
          ]);
          const table = tableData(tableSnapshot.data(), command.establishmentId);
          const session = sessionSnapshot.data();
          if (table.currentSessionId !== command.sessionId || session === undefined ||
              session.establishmentId !== command.establishmentId || session.tableId !== command.tableId) {
            throw new TableManagementError("failed-precondition", "La sesión ya no pertenece a esta mesa.");
          }
          if (!["open", "paid"].includes(String(session.status)) ||
              session.balanceMinor !== 0 || session.subtotalMinor !== session.paidMinor) {
            throw new TableManagementError("failed-precondition", "La sesión debe tener saldo cero antes de cerrarse.");
          }
          if (orderSnapshot.size > 100 || orderSnapshot.docs.some((document) =>
            ACTIVE_ORDER_STATUSES.has(String(document.data().status)))) {
            throw new TableManagementError("failed-precondition", "Completá o cancelá los pedidos activos antes de cerrar.");
          }
          const operationResult = result(command, { tableId: command.tableId, sessionId: command.sessionId });
          const timestamp = Timestamp.fromDate(command.updatedAt);
          transaction.update(sessionRef, { status: "closed", closedAt: timestamp, updatedAt: timestamp });
          transaction.update(reference, { currentSessionId: null, updatedAt: timestamp });
          audit(transaction, auditRef, command, operationResult, {
            currentSessionId: command.sessionId, status: session.status
          }, { currentSessionId: null, status: "closed" }, command.tableId);
          return operationResult;
        }
        case "rotateQr": {
          const reference = tenantRef.collection("tables").doc(command.tableId);
          const snapshot = await transaction.get(reference);
          const table = tableData(snapshot.data(), command.establishmentId);
          if (table.qrVersion !== command.expectedQrVersion) {
            throw new TableManagementError("failed-precondition", "El QR ya fue rotado en otro dispositivo.");
          }
          const nextVersion = command.expectedQrVersion + 1;
          const operationResult = result(command, {
            tableId: command.tableId,
            tables: [{ tableId: command.tableId, qrVersion: nextVersion }]
          });
          transaction.update(reference, {
            qrTokenHash: tokenHash(command.token),
            qrVersion: nextVersion,
            updatedAt: Timestamp.fromDate(command.updatedAt)
          });
          audit(transaction, auditRef, command, operationResult, { qrVersion: table.qrVersion }, {
            qrVersion: nextVersion
          }, command.tableId);
          return operationResult;
        }
        case "rotateManyQrs": {
          const references = command.entries.map(({ tableId }) =>
            tenantRef.collection("tables").doc(tableId));
          const snapshots = await Promise.all(references.map((reference) => transaction.get(reference)));
          const tables = snapshots.map((snapshot, index) => {
            const entry = command.entries[index];
            if (entry === undefined) throw new TypeError("Entrada QR ausente.");
            const data = tableData(snapshot.data(), command.establishmentId);
            if (!data.active) {
              throw new TableManagementError("failed-precondition", `${data.name} está desactivada.`);
            }
            if (data.qrVersion !== entry.expectedQrVersion) {
              throw new TableManagementError("failed-precondition", `${data.name} ya tiene otro QR vigente.`);
            }
            return { data, entry, reference: references[index] as DocumentReference };
          });
          const summaries = tables.map(({ entry }) => Object.freeze({
            tableId: entry.tableId,
            qrVersion: entry.expectedQrVersion + 1
          }));
          const operationResult = result(command, { tables: Object.freeze(summaries) });
          for (const { entry, reference } of tables) {
            transaction.update(reference, {
              qrTokenHash: tokenHash(entry.token),
              qrVersion: entry.expectedQrVersion + 1,
              updatedAt: Timestamp.fromDate(command.updatedAt)
            });
          }
          audit(transaction, auditRef, command, operationResult,
            { tables: tables.map(({ entry }) => ({ tableId: entry.tableId, qrVersion: entry.expectedQrVersion })) },
            { tables: summaries }, "multiple");
          return operationResult;
        }
      }
    });
  }
}
