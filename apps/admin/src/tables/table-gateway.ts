import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

import { adminFunctions } from "../firebase/firebase";
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
  return execute({ action: "openSession", establishmentId, requestId: requestId(), tableId });
}

export async function closeTableSession(
  establishmentId: string,
  tableId: string,
  sessionId: string
): Promise<TableManagementResult> {
  return execute({
    action: "closeSession", establishmentId, requestId: requestId(), sessionId, tableId
  });
}

export async function rotateTableQrs(
  establishmentId: string,
  tables: readonly AdminTable[]
): Promise<ReadonlyMap<string, string>> {
  const tokens = new Map(tables.map((table) => [table.id, qrToken()]));
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
