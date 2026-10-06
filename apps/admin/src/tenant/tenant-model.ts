import { Timestamp } from "firebase/firestore";

export const ADMIN_ROLES = ["owner", "manager", "staff", "kitchen"] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export interface TenantMembership {
  readonly establishmentId: string;
  readonly uid: string;
  readonly role: AdminRole;
  readonly permissions: readonly string[];
  readonly active: boolean;
}

export interface EstablishmentSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly timezone: string;
  readonly currency: string;
  readonly active: boolean;
}

export interface TenantAccess {
  readonly establishment: EstablishmentSummary;
  readonly membership: TenantMembership;
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
const PERMISSION_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/u;
const CURRENCY_PATTERN = /^[A-Z]{3}$/u;
const MEMBERSHIP_FIELDS = Object.freeze([
  "active", "createdAt", "establishmentId", "permissions", "role", "uid", "updatedAt"
]);
const ESTABLISHMENT_FIELDS = Object.freeze([
  "active", "createdAt", "currency", "name", "slug", "timezone", "updatedAt"
]);
const USER_FIELDS = Object.freeze([
  "createdAt", "displayName", "email", "establishmentIds", "updatedAt"
]);

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} debe ser un objeto.`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string) {
  const actual = Object.keys(value).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${label} contiene campos ausentes o desconocidos.`);
  }
}

function text(value: unknown, label: string, max = 160): string {
  if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > max) {
    throw new TypeError(`${label} no es texto válido.`);
  }
  return value.trim();
}

function id(value: unknown, label: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new TypeError(`${label} no es un identificador válido.`);
  }
  return value;
}

function timestamps(value: Record<string, unknown>, label: string) {
  if (!(value.createdAt instanceof Timestamp) || !(value.updatedAt instanceof Timestamp)) {
    throw new TypeError(`${label} requiere timestamps nativos.`);
  }
}

export function parseUserEstablishmentIds(value: unknown): readonly string[] {
  const data = record(value, "Perfil");
  exactKeys(data, USER_FIELDS, "Perfil");
  timestamps(data, "Perfil");
  text(data.displayName, "displayName", 120);
  text(data.email, "email", 254);
  if (!Array.isArray(data.establishmentIds)) {
    throw new TypeError("establishmentIds debe ser una lista.");
  }
  const ids = data.establishmentIds.map((value) => id(value, "establishmentId"));
  if (new Set(ids).size !== ids.length || ids.length > 50) {
    throw new TypeError("establishmentIds contiene duplicados o supera el límite.");
  }
  return Object.freeze(ids);
}

export function parseTenantMembership(
  value: unknown,
  expectedUid: string,
  establishmentId: string
): TenantMembership {
  const data = record(value, "Membresía");
  exactKeys(data, MEMBERSHIP_FIELDS, "Membresía");
  timestamps(data, "Membresía");
  if (data.uid !== expectedUid || data.establishmentId !== establishmentId) {
    throw new TypeError("La membresía no coincide con la identidad o el establecimiento.");
  }
  if (typeof data.active !== "boolean" ||
      typeof data.role !== "string" ||
      !(ADMIN_ROLES as readonly string[]).includes(data.role)) {
    throw new TypeError("La membresía tiene estado o rol inválido.");
  }
  if (!Array.isArray(data.permissions) || data.permissions.length > 50 ||
      data.permissions.some((permission) =>
        typeof permission !== "string" || !PERMISSION_PATTERN.test(permission) ||
        permission.length > 100
      )) {
    throw new TypeError("La membresía contiene permisos inválidos.");
  }
  const permissions = data.permissions as string[];
  if (new Set(permissions).size !== permissions.length) {
    throw new TypeError("La membresía contiene permisos duplicados.");
  }
  return Object.freeze({
    active: data.active,
    establishmentId,
    permissions: Object.freeze([...permissions]),
    role: data.role as AdminRole,
    uid: expectedUid
  });
}

export function parseEstablishmentSummary(
  value: unknown,
  establishmentId: string
): EstablishmentSummary {
  const data = record(value, "Establecimiento");
  exactKeys(data, ESTABLISHMENT_FIELDS, "Establecimiento");
  timestamps(data, "Establecimiento");
  if (typeof data.active !== "boolean" ||
      typeof data.currency !== "string" || !CURRENCY_PATTERN.test(data.currency)) {
    throw new TypeError("El establecimiento tiene estado o moneda inválida.");
  }
  return Object.freeze({
    active: data.active,
    currency: data.currency,
    id: id(establishmentId, "establishmentId"),
    name: text(data.name, "name", 120),
    slug: id(data.slug, "slug"),
    timezone: text(data.timezone, "timezone", 80)
  });
}

export function chooseTenantAccess(
  accesses: readonly TenantAccess[],
  preferredEstablishmentId: string | null
): TenantAccess | null {
  if (accesses.length === 0) return null;
  return accesses.find(({ establishment }) => establishment.id === preferredEstablishmentId) ??
    accesses[0] ?? null;
}
