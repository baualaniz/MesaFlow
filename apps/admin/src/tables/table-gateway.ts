import { FirebaseError } from "firebase/app";
import {
  Timestamp,
  doc,
  runTransaction
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { adminEnvironment } from "../config/environment";
import { adminFirestore, adminFunctions } from "../firebase/firebase";
import type { AdminTable } from "./table-model";

interface TableManagementResult {
  readonly action: string;
  readonly sessionId?: string;
  readonly tableId?: string;
  readonly tables?: readonly { readonly tableId: string; readonly qrVersion: number }[];
  readonly updatedAt: string;
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function requestId(): string {
  return [...randomBytes(16)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function qrToken(): string {
  const binary = [...randomBytes(32)].map((value) => String.fromCharCode(value)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

const callable = httpsCallable<Record<string, unknown>, TableManagementResult>(
  adminFunctions,
  "manageTable"
);

const useAcademicFirestore = adminEnvironment !== "emulator";

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function tableIdFor(number: number): string {
  return `mesa-${String(number).padStart(2, "0")}`;
}

function timestampIso(value: unknown): string {
  if (!(value instanceof Timestamp)) throw new Error("La mesa cambió en otro dispositivo.");
  return value.toDate().toISOString();
}

async function createAcademicTable(
  establishmentId: string,
  name: string,
  number: number,
  token: string
): Promise<TableManagementResult> {
  const tableId = tableIdFor(number);
  const hash = await sha256(token);
  const updatedAt = Timestamp.now();
  await runTransaction(adminFirestore, async (transaction) => {
    const table = doc(adminFirestore, "establishments", establishmentId, "tables", tableId);
    if ((await transaction.get(table)).exists()) throw new Error("Ya existe una mesa con ese número.");
    transaction.set(table, {
      active: true,
      createdAt: updatedAt,
      currentSessionId: null,
      establishmentId,
      name,
      number,
      qrTokenHash: hash,
      qrVersion: 1,
      updatedAt
    });
    transaction.set(
      doc(adminFirestore, "establishments", establishmentId, "qrAccess", hash),
      {
        active: true,
        createdAt: updatedAt,
        establishmentId,
        establishmentSlug: "mesa-flow-demo",
        qrVersion: 1,
        sessionId: null,
        tableId,
        tableName: name,
        updatedAt
      }
    );
  });
  return { action: "create", tableId, updatedAt: updatedAt.toDate().toISOString() };
}

async function updateAcademicTable(
  establishmentId: string,
  table: AdminTable,
  name: string,
  active: boolean
): Promise<TableManagementResult> {
  const updatedAt = Timestamp.now();
  await runTransaction(adminFirestore, async (transaction) => {
    const tableReference = doc(
      adminFirestore, "establishments", establishmentId, "tables", table.id
    );
    const snapshot = await transaction.get(tableReference);
    const data = snapshot.data();
    if (!snapshot.exists() || !data || timestampIso(data.updatedAt) !== table.updatedAt.toISOString()) {
      throw new Error("La mesa cambió en otro dispositivo.");
    }
    transaction.update(tableReference, { active, name, updatedAt });
    transaction.update(
      doc(adminFirestore, "establishments", establishmentId, "qrAccess", String(data.qrTokenHash)),
      { active, tableName: name, updatedAt }
    );
  });
  return { action: "update", tableId: table.id, updatedAt: updatedAt.toDate().toISOString() };
}

async function openAcademicSession(
  establishmentId: string,
  tableId: string
): Promise<TableManagementResult> {
  const sessionId = `sesion-${requestId()}`;
  const updatedAt = Timestamp.now();
  await runTransaction(adminFirestore, async (transaction) => {
    const tableReference = doc(
      adminFirestore, "establishments", establishmentId, "tables", tableId
    );
    const table = (await transaction.get(tableReference)).data();
    if (!table || table.active !== true || table.currentSessionId !== null) {
      throw new Error("La mesa no está disponible para abrir una sesión.");
    }
    transaction.set(
      doc(adminFirestore, "establishments", establishmentId, "tableSessions", sessionId),
      {
        balanceMinor: 0,
        closedAt: null,
        establishmentId,
        openedAt: updatedAt,
        paidMinor: 0,
        status: "open",
        subtotalMinor: 0,
        tableId,
        updatedAt
      }
    );
    transaction.update(tableReference, { currentSessionId: sessionId, updatedAt });
    transaction.update(
      doc(adminFirestore, "establishments", establishmentId, "qrAccess", String(table.qrTokenHash)),
      { sessionId, updatedAt }
    );
  });
  return { action: "openSession", sessionId, tableId, updatedAt: updatedAt.toDate().toISOString() };
}

async function closeAcademicSession(
  establishmentId: string,
  tableId: string,
  sessionId: string
): Promise<TableManagementResult> {
  const updatedAt = Timestamp.now();
  await runTransaction(adminFirestore, async (transaction) => {
    const tableReference = doc(
      adminFirestore, "establishments", establishmentId, "tables", tableId
    );
    const sessionReference = doc(
      adminFirestore, "establishments", establishmentId, "tableSessions", sessionId
    );
    const [tableSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(tableReference), transaction.get(sessionReference)
    ]);
    const table = tableSnapshot.data();
    const session = sessionSnapshot.data();
    if (!table || !session || table.currentSessionId !== sessionId ||
        session.balanceMinor !== 0) {
      throw new Error("La sesión cambió o todavía tiene saldo pendiente.");
    }
    transaction.update(sessionReference, { closedAt: updatedAt, status: "closed", updatedAt });
    transaction.update(tableReference, { currentSessionId: null, updatedAt });
    transaction.update(
      doc(adminFirestore, "establishments", establishmentId, "qrAccess", String(table.qrTokenHash)),
      { sessionId: null, updatedAt }
    );
  });
  return { action: "closeSession", sessionId, tableId, updatedAt: updatedAt.toDate().toISOString() };
}

async function execute(input: Record<string, unknown>): Promise<TableManagementResult> {
  try {
    return (await callable(input)).data;
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === "functions/permission-denied") {
        throw new Error("Tu rol ya no permite administrar mesas.", { cause: error });
      }
      if (error.code === "functions/failed-precondition") {
        throw new Error(error.message || "La mesa cambió en otro dispositivo.", { cause: error });
      }
      if (error.code === "functions/already-exists") {
        throw new Error("Ya existe una mesa con ese número.", { cause: error });
      }
      if (error.code === "functions/not-found") {
        throw new Error("La mesa ya no existe.", { cause: error });
      }
    }
    throw new Error("No pudimos completar la operación. Intentá nuevamente.", { cause: error });
  }
}

export async function createTable(
  establishmentId: string,
  name: string,
  number: number
): Promise<{ readonly result: TableManagementResult; readonly token: string }> {
  const token = qrToken();
  if (useAcademicFirestore) {
    const result = await createAcademicTable(establishmentId, name, number, token);
    return Object.freeze({ result, token });
  }
  const result = await execute({
    action: "create", establishmentId, name, number, requestId: requestId(), token
  });
  return Object.freeze({ result, token });
}

export async function updateTable(
  establishmentId: string,
  table: AdminTable,
  name: string,
  active: boolean
): Promise<TableManagementResult> {
  if (useAcademicFirestore) {
    return updateAcademicTable(establishmentId, table, name, active);
  }
  return execute({
    action: "update",
    active,
    establishmentId,
    expectedUpdatedAt: table.updatedAt.toISOString(),
    name,
    number: table.number,
    requestId: requestId(),
    tableId: table.id
  });
}

export async function deleteTable(
  establishmentId: string,
  table: AdminTable
): Promise<TableManagementResult> {
  if (useAcademicFirestore) {
    const updatedAt = Timestamp.now();
    await runTransaction(adminFirestore, async (transaction) => {
      const tableReference = doc(
        adminFirestore, "establishments", establishmentId, "tables", table.id
      );
      const snapshot = await transaction.get(tableReference);
      const data = snapshot.data();
      if (!data || data.currentSessionId !== null ||
          timestampIso(data.updatedAt) !== table.updatedAt.toISOString()) {
        throw new Error("La mesa cambió o tiene una sesión activa.");
      }
      transaction.delete(doc(
        adminFirestore, "establishments", establishmentId, "qrAccess", String(data.qrTokenHash)
      ));
      transaction.delete(tableReference);
    });
    return { action: "delete", tableId: table.id, updatedAt: updatedAt.toDate().toISOString() };
  }
  return execute({
    action: "delete",
    establishmentId,
    expectedUpdatedAt: table.updatedAt.toISOString(),
    requestId: requestId(),
    tableId: table.id
  });
}

export async function openTableSession(
  establishmentId: string,
  tableId: string
): Promise<TableManagementResult> {
  if (useAcademicFirestore) return openAcademicSession(establishmentId, tableId);
  return execute({ action: "openSession", establishmentId, requestId: requestId(), tableId });
}

export async function closeTableSession(
  establishmentId: string,
  tableId: string,
  sessionId: string
): Promise<TableManagementResult> {
  if (useAcademicFirestore) {
    return closeAcademicSession(establishmentId, tableId, sessionId);
  }
  return execute({
    action: "closeSession", establishmentId, requestId: requestId(), sessionId, tableId
  });
}

export async function rotateTableQrs(
  establishmentId: string,
  tables: readonly AdminTable[]
): Promise<ReadonlyMap<string, string>> {
  const tokens = new Map(tables.map((table) => [table.id, qrToken()]));
  if (useAcademicFirestore) {
    const hashes = new Map(await Promise.all(tables.map(async (table) => [
      table.id, await sha256(tokens.get(table.id) ?? "")
    ] as const)));
    const updatedAt = Timestamp.now();
    await runTransaction(adminFirestore, async (transaction) => {
      for (const table of tables) {
        const tableReference = doc(
          adminFirestore, "establishments", establishmentId, "tables", table.id
        );
        const snapshot = await transaction.get(tableReference);
        const current = snapshot.data();
        if (!current || current.active !== true || current.qrVersion !== table.qrVersion) {
          throw new Error(`${table.name} cambió en otro dispositivo.`);
        }
        const nextHash = hashes.get(table.id) ?? "";
        const nextVersion = table.qrVersion + 1;
        transaction.update(
          doc(
            adminFirestore, "establishments", establishmentId,
            "qrAccess", String(current.qrTokenHash)
          ),
          { active: false, updatedAt }
        );
        transaction.set(
          doc(adminFirestore, "establishments", establishmentId, "qrAccess", nextHash),
          {
            active: true,
            createdAt: updatedAt,
            establishmentId,
            establishmentSlug: "mesa-flow-demo",
            qrVersion: nextVersion,
            sessionId: current.currentSessionId,
            tableId: table.id,
            tableName: current.name,
            updatedAt
          }
        );
        transaction.update(tableReference, {
          qrTokenHash: nextHash,
          qrVersion: nextVersion,
          updatedAt
        });
      }
    });
    return tokens;
  }
  await execute({
    action: "rotateManyQrs",
    entries: tables.map((table) => ({
      expectedQrVersion: table.qrVersion,
      tableId: table.id,
      token: tokens.get(table.id)
    })),
    establishmentId,
    requestId: requestId()
  });
  return tokens;
}
