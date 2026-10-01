import { createHash } from "node:crypto";

const ROUTE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const QR_TOKEN = /^[A-Za-z0-9_-]{22,128}$/u;

export type QrSessionErrorCode =
  | "already-exists"
  | "failed-precondition"
  | "invalid-argument"
  | "permission-denied"
  | "unauthenticated";

export class QrSessionError extends Error {
  constructor(
    readonly code: QrSessionErrorCode,
    message: string
  ) {
    super(message);
    this.name = "QrSessionError";
  }
}

export interface QrSessionAccess {
  readonly establishmentId: string;
  readonly establishmentName: string;
  readonly tableId: string;
  readonly tableName: string;
  readonly sessionId: string;
}

export interface QrExchangeCommand {
  readonly uid: string;
  readonly establishmentSlug: string;
  readonly tableId: string;
  readonly tokenHash: string;
  readonly exchangeId: string;
  readonly usedAt: Date;
  readonly expiresAt: Date;
}

export interface QrRestoreQuery {
  readonly uid: string;
  readonly establishmentSlug: string;
  readonly tableId: string;
}

export interface QrSessionRepository {
  exchange(command: QrExchangeCommand): Promise<QrSessionAccess>;
  restore(query: QrRestoreQuery): Promise<QrSessionAccess>;
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new QrSessionError("invalid-argument", "La solicitud QR es inválida.");
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): void {
  const actual = Object.keys(value).sort();
  const sorted = [...expected].sort();
  if (actual.length !== sorted.length || actual.some((key, index) => key !== sorted[index])) {
    throw new QrSessionError("invalid-argument", "La solicitud QR contiene campos inválidos.");
  }
}

function requireRouteSegment(value: unknown): string {
  if (typeof value !== "string" || value.length > 64 || !ROUTE_SEGMENT.test(value)) {
    throw new QrSessionError("invalid-argument", "El enlace QR no identifica una mesa válida.");
  }
  return value;
}

function requireUid(uid: string | undefined): string {
  if (!uid) {
    throw new QrSessionError("unauthenticated", "Iniciá una sesión anónima para continuar.");
  }
  return uid;
}

export function hashQrToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function buildQrExchangeId(uid: string, tokenHash: string): string {
  return createHash("sha256")
    .update(uid, "utf8")
    .update("\0", "utf8")
    .update(tokenHash, "ascii")
    .digest("hex");
}

export async function exchangeQrSessionAccess(
  data: unknown,
  uid: string | undefined,
  repository: QrSessionRepository,
  now = new Date()
): Promise<QrSessionAccess> {
  const input = requireRecord(data);
  requireExactKeys(input, ["establishmentSlug", "tableId", "token"]);
  const authenticatedUid = requireUid(uid);
  const establishmentSlug = requireRouteSegment(input.establishmentSlug);
  const tableId = requireRouteSegment(input.tableId);
  if (typeof input.token !== "string" || !QR_TOKEN.test(input.token)) {
    throw new QrSessionError("invalid-argument", "El token QR es inválido.");
  }
  if (Number.isNaN(now.getTime())) {
    throw new QrSessionError("failed-precondition", "No se pudo validar el tiempo del canje.");
  }

  const tokenHash = hashQrToken(input.token);
  return repository.exchange({
    uid: authenticatedUid,
    establishmentSlug,
    tableId,
    tokenHash,
    exchangeId: buildQrExchangeId(authenticatedUid, tokenHash),
    usedAt: new Date(now),
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
  });
}

export async function restoreQrSessionAccess(
  data: unknown,
  uid: string | undefined,
  repository: QrSessionRepository
): Promise<QrSessionAccess> {
  const input = requireRecord(data);
  requireExactKeys(input, ["establishmentSlug", "tableId"]);
  return repository.restore({
    uid: requireUid(uid),
    establishmentSlug: requireRouteSegment(input.establishmentSlug),
    tableId: requireRouteSegment(input.tableId)
  });
}
