import { parseId } from "@mesaflow/contracts";

const REQUEST_ID = /^[a-f0-9]{32}$/u;
const QR_TOKEN = /^[A-Za-z0-9_-]{43}$/u;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export const TABLE_ACTIONS = [
  "create", "update", "delete", "openSession", "closeSession", "rotateQr", "rotateManyQrs"
] as const;
export type TableAction = typeof TABLE_ACTIONS[number];

export type TableManagementErrorCode =
  | "already-exists"
  | "failed-precondition"
  | "invalid-argument"
  | "not-found"
  | "permission-denied"
  | "unauthenticated";

export class TableManagementError extends Error {
  constructor(readonly code: TableManagementErrorCode, message: string) {
    super(message);
    this.name = "TableManagementError";
  }
}

interface CommandBase {
  readonly actorUid: string;
  readonly establishmentId: string;
  readonly requestId: string;
  readonly updatedAt: Date;
}

export type TableManagementCommand =
  | (CommandBase & {
    readonly action: "create";
    readonly name: string;
    readonly number: number;
    readonly token: string;
  })
  | (CommandBase & {
    readonly action: "update";
    readonly active: boolean;
    readonly expectedUpdatedAt: string;
    readonly name: string;
    readonly number: number;
    readonly tableId: string;
  })
  | (CommandBase & {
    readonly action: "delete";
    readonly expectedUpdatedAt: string;
    readonly tableId: string;
  })
  | (CommandBase & {
    readonly action: "openSession";
    readonly tableId: string;
  })
  | (CommandBase & {
    readonly action: "closeSession";
    readonly sessionId: string;
    readonly tableId: string;
  })
  | (CommandBase & {
    readonly action: "rotateQr";
    readonly expectedQrVersion: number;
    readonly tableId: string;
    readonly token: string;
  })
  | (CommandBase & {
    readonly action: "rotateManyQrs";
    readonly entries: readonly {
      readonly expectedQrVersion: number;
      readonly tableId: string;
      readonly token: string;
    }[];
  });

export interface ManagedTableSummary {
  readonly tableId: string;
  readonly qrVersion?: number;
}

export interface TableManagementResult {
  readonly action: TableAction;
  readonly sessionId?: string;
  readonly tableId?: string;
  readonly tables?: readonly ManagedTableSummary[];
  readonly updatedAt: string;
}

export interface TableManagementRepository {
  execute(command: TableManagementCommand): Promise<TableManagementResult>;
}

function invalid(message: string): never {
  throw new TableManagementError("invalid-argument", message);
}

function record(value: unknown, label = "La operación"): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return invalid(`${label} debe ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(input: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(input).sort();
  const sorted = [...expected].sort();
  if (actual.length !== sorted.length || actual.some((key, index) => key !== sorted[index])) {
    invalid("La operación contiene campos ausentes o desconocidos.");
  }
}

function id(value: unknown, label: string): string {
  try {
    return parseId(value, label);
  } catch {
    return invalid(`${label} no es válido.`);
  }
}

function name(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 80) {
    return invalid("name debe tener entre 2 y 80 caracteres.");
  }
  return value.trim();
}

function number(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 999) {
    return invalid("number debe ser un entero entre 1 y 999.");
  }
  return value as number;
}

function token(value: unknown): string {
  if (typeof value !== "string" || !QR_TOKEN.test(value)) {
    return invalid("token no tiene la entropía requerida.");
  }
  return value;
}

function expectedUpdatedAt(value: unknown): string {
  if (typeof value !== "string" || !ISO_TIMESTAMP.test(value) ||
      new Date(value).toISOString() !== value) {
    return invalid("expectedUpdatedAt no es válido.");
  }
  return value;
}

function qrVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    return invalid("expectedQrVersion no es válido.");
  }
  return value as number;
}

function base(
  input: Record<string, unknown>,
  actorUid: string,
  now: Date
): CommandBase {
  if (typeof input.requestId !== "string" || !REQUEST_ID.test(input.requestId)) {
    invalid("requestId no es válido.");
  }
  return {
    actorUid: id(actorUid, "actorUid"),
    establishmentId: id(input.establishmentId, "establishmentId"),
    requestId: input.requestId,
    updatedAt: new Date(now)
  };
}

export async function manageTable(
  data: unknown,
  actorUid: string | undefined,
  repository: TableManagementRepository,
  now = new Date()
): Promise<TableManagementResult> {
  if (!actorUid) {
    throw new TableManagementError("unauthenticated", "Iniciá sesión para administrar mesas.");
  }
  if (Number.isNaN(now.getTime())) invalid("No se pudo establecer el momento de la operación.");
  const input = record(data);
  if (typeof input.action !== "string" ||
      !(TABLE_ACTIONS as readonly string[]).includes(input.action)) {
    invalid("action no es válida.");
  }
  const action = input.action as TableAction;
  const common = base(input, actorUid, now);

  switch (action) {
    case "create":
      exactKeys(input, ["action", "establishmentId", "name", "number", "requestId", "token"]);
      return repository.execute({ ...common, action, name: name(input.name), number: number(input.number), token: token(input.token) });
    case "update":
      exactKeys(input, ["action", "active", "establishmentId", "expectedUpdatedAt", "name", "number", "requestId", "tableId"]);
      if (typeof input.active !== "boolean") invalid("active debe ser booleano.");
      return repository.execute({
        ...common,
        action,
        active: input.active,
        expectedUpdatedAt: expectedUpdatedAt(input.expectedUpdatedAt),
        name: name(input.name),
        number: number(input.number),
        tableId: id(input.tableId, "tableId")
      });
    case "delete":
      exactKeys(input, ["action", "establishmentId", "expectedUpdatedAt", "requestId", "tableId"]);
      return repository.execute({
        ...common,
        action,
        expectedUpdatedAt: expectedUpdatedAt(input.expectedUpdatedAt),
        tableId: id(input.tableId, "tableId")
      });
    case "openSession":
      exactKeys(input, ["action", "establishmentId", "requestId", "tableId"]);
      return repository.execute({ ...common, action, tableId: id(input.tableId, "tableId") });
    case "closeSession":
      exactKeys(input, ["action", "establishmentId", "requestId", "sessionId", "tableId"]);
      return repository.execute({
        ...common,
        action,
        sessionId: id(input.sessionId, "sessionId"),
        tableId: id(input.tableId, "tableId")
      });
    case "rotateQr":
      exactKeys(input, ["action", "establishmentId", "expectedQrVersion", "requestId", "tableId", "token"]);
      return repository.execute({
        ...common,
        action,
        expectedQrVersion: qrVersion(input.expectedQrVersion),
        tableId: id(input.tableId, "tableId"),
        token: token(input.token)
      });
    case "rotateManyQrs": {
      exactKeys(input, ["action", "entries", "establishmentId", "requestId"]);
      if (!Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > 50) {
        invalid("entries debe contener entre 1 y 50 mesas.");
      }
      const entries = input.entries.map((value) => {
        const entry = record(value, "Cada entrada QR");
        exactKeys(entry, ["expectedQrVersion", "tableId", "token"]);
        return Object.freeze({
          expectedQrVersion: qrVersion(entry.expectedQrVersion),
          tableId: id(entry.tableId, "tableId"),
          token: token(entry.token)
        });
      });
      if (new Set(entries.map(({ tableId }) => tableId)).size !== entries.length) {
        invalid("entries contiene mesas repetidas.");
      }
      return repository.execute({ ...common, action, entries: Object.freeze(entries) });
    }
  }
}
