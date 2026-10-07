import { ADMIN_ROLES, type AdminRole } from "../tenant/tenant-model";

export interface AdminTeamMember {
  readonly uid: string;
  readonly displayName: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly permissions: readonly string[];
  readonly active: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const MEMBER_FIELDS = [
  "active", "createdAt", "displayName", "email", "permissions", "role", "uid", "updatedAt"
].sort();
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
const PERMISSION_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/u;

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("El miembro no es un objeto.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > max) {
    throw new TypeError(`${label} no es válido.`);
  }
  return value.trim();
}

function date(value: unknown, label: string): Date {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${label} no es una fecha válida.`);
  }
  const parsed = new Date(value);
  if (parsed.toISOString() !== value) throw new TypeError(`${label} no usa UTC canónico.`);
  return parsed;
}

export function parseAdminTeamMember(value: unknown): AdminTeamMember {
  const data = record(value);
  const keys = Object.keys(data).sort();
  if (keys.length !== MEMBER_FIELDS.length || keys.some((key, index) => key !== MEMBER_FIELDS[index])) {
    throw new TypeError("El miembro contiene campos desconocidos.");
  }
  if (typeof data.uid !== "string" || !ID_PATTERN.test(data.uid) ||
      typeof data.email !== "string" || !data.email.includes("@") ||
      typeof data.active !== "boolean" || typeof data.role !== "string" ||
      !(ADMIN_ROLES as readonly string[]).includes(data.role) || !Array.isArray(data.permissions) ||
      data.permissions.some((permission) => typeof permission !== "string" || !PERMISSION_PATTERN.test(permission)) ||
      new Set(data.permissions).size !== data.permissions.length) {
    throw new TypeError("El miembro no cumple el contrato del equipo.");
  }
  return Object.freeze({
    uid: data.uid,
    displayName: text(data.displayName, "displayName", 120),
    email: data.email.toLowerCase(),
    role: data.role as AdminRole,
    permissions: Object.freeze([...(data.permissions as string[])]),
    active: data.active,
    createdAt: date(data.createdAt, "createdAt"),
    updatedAt: date(data.updatedAt, "updatedAt")
  });
}

export function parseTeamList(value: unknown): readonly AdminTeamMember[] {
  if (!Array.isArray(value)) throw new TypeError("La lista del equipo no es válida.");
  return Object.freeze(value.map(parseAdminTeamMember));
}
