import type { AdminRole, TenantMembership } from "./tenant-model";

export type AdminCapability =
  "dashboard.view" |
  "orders.view" |
  "tables.view" |
  "menu.view" |
  "team.view" |
  "metrics.read" |
  "settings.manage";

export const ROLE_LABELS: Readonly<Record<AdminRole, string>> = Object.freeze({
  kitchen: "Cocina",
  manager: "Encargado",
  owner: "Propietario",
  staff: "Salón"
});

const ROLE_CAPABILITIES = {
  owner: [
    "dashboard.view", "orders.view", "tables.view", "menu.view", "team.view",
    "metrics.read", "settings.manage"
  ],
  manager: [
    "dashboard.view", "orders.view", "tables.view", "menu.view", "team.view", "metrics.read"
  ],
  staff: ["dashboard.view", "orders.view", "tables.view"],
  kitchen: ["dashboard.view", "orders.view"]
} as const satisfies Readonly<Record<AdminRole, readonly AdminCapability[]>>;

const REQUIRED_PERMISSIONS: Partial<Readonly<Record<AdminCapability, readonly string[]>>> =
  Object.freeze({
    "metrics.read": Object.freeze(["metrics.read"]),
    "menu.view": Object.freeze(["menu.manage"]),
    "orders.view": Object.freeze(["orders.manage", "orders.prepare"]),
    "settings.manage": Object.freeze(["establishment.manage"]),
    "tables.view": Object.freeze(["orders.manage"])
  });

export function canAccess(
  membership: Pick<TenantMembership, "role" | "permissions" | "active">,
  capability: AdminCapability
): boolean {
  const roleCapabilities = ROLE_CAPABILITIES[membership.role] as readonly AdminCapability[];
  if (!membership.active || !roleCapabilities.includes(capability)) return false;
  const required = REQUIRED_PERMISSIONS[capability];
  return required === undefined || required.some((permission) =>
    membership.permissions.includes(permission)
  );
}
