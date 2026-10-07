import { Timestamp } from "firebase/firestore";

export type AdminSessionStatus = "open" | "payment_pending" | "paid";

export interface AdminTable {
  readonly id: string;
  readonly establishmentId: string;
  readonly number: number;
  readonly name: string;
  readonly qrVersion: number;
  readonly active: boolean;
  readonly currentSessionId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface AdminTableSession {
  readonly id: string;
  readonly establishmentId: string;
  readonly tableId: string;
  readonly status: AdminSessionStatus;
  readonly subtotalMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  readonly openedAt: Date;
  readonly updatedAt: Date;
}

const TABLE_FIELDS = [
  "active", "createdAt", "currentSessionId", "establishmentId", "name", "number",
  "qrTokenHash", "qrVersion", "updatedAt"
].sort();
const SESSION_FIELDS = [
  "balanceMinor", "closedAt", "establishmentId", "openedAt", "paidMinor", "status",
  "subtotalMinor", "tableId", "updatedAt"
].sort();

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} no es un objeto.`);
  }
  return value as Record<string, unknown>;
}

function exactFields(data: Record<string, unknown>, expected: readonly string[], label: string): void {
  const keys = Object.keys(data).sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} contiene campos desconocidos.`);
  }
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 128) {
    throw new TypeError(`${label} no es válido.`);
  }
  return value;
}

function timestamp(value: unknown, label: string): Date {
  if (!(value instanceof Timestamp)) throw new TypeError(`${label} no es un Timestamp nativo.`);
  return value.toDate();
}

function minor(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${label} no es un importe válido.`);
  }
  return value as number;
}

export function parseAdminTable(
  id: string,
  value: unknown,
  establishmentId: string
): AdminTable {
  const data = record(value, "Table");
  exactFields(data, TABLE_FIELDS, "Table");
  if (data.establishmentId !== establishmentId || typeof data.active !== "boolean" ||
      !Number.isSafeInteger(data.number) || (data.number as number) < 1 ||
      !Number.isSafeInteger(data.qrVersion) || (data.qrVersion as number) < 1 ||
      typeof data.qrTokenHash !== "string" || !/^[a-f0-9]{64}$/u.test(data.qrTokenHash) ||
      (data.currentSessionId !== null && typeof data.currentSessionId !== "string")) {
    throw new TypeError("Table no cumple el contrato operativo.");
  }
  return Object.freeze({
    id: text(id, "tableId"),
    establishmentId,
    number: data.number as number,
    name: text(data.name, "name"),
    qrVersion: data.qrVersion as number,
    active: data.active,
    currentSessionId: data.currentSessionId as string | null,
    createdAt: timestamp(data.createdAt, "createdAt"),
    updatedAt: timestamp(data.updatedAt, "updatedAt")
  });
}

export function parseAdminTableSession(
  id: string,
  value: unknown,
  establishmentId: string
): AdminTableSession {
  const data = record(value, "TableSession");
  exactFields(data, SESSION_FIELDS, "TableSession");
  if (data.establishmentId !== establishmentId ||
      !["open", "payment_pending", "paid"].includes(String(data.status))) {
    throw new TypeError("TableSession no cumple el contrato operativo.");
  }
  const subtotalMinor = minor(data.subtotalMinor, "subtotalMinor");
  const paidMinor = minor(data.paidMinor, "paidMinor");
  const balanceMinor = minor(data.balanceMinor, "balanceMinor");
  if (balanceMinor !== subtotalMinor - paidMinor) {
    throw new TypeError("El saldo de TableSession no es consistente.");
  }
  return Object.freeze({
    id: text(id, "sessionId"),
    establishmentId,
    tableId: text(data.tableId, "tableId"),
    status: data.status as AdminSessionStatus,
    subtotalMinor,
    paidMinor,
    balanceMinor,
    openedAt: timestamp(data.openedAt, "openedAt"),
    updatedAt: timestamp(data.updatedAt, "updatedAt")
  });
}

export function tableOperationalLabel(
  table: AdminTable,
  session: AdminTableSession | null
): string {
  if (!table.active) return "Desactivada";
  if (session === null) return "Disponible";
  if (session.status === "payment_pending") return "Pago pendiente";
  if (session.status === "paid") return "Pagada";
  return "En servicio";
}
