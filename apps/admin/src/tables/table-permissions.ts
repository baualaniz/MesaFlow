import type { TenantMembership } from "../tenant/tenant-model";

export function canManageTables(
  membership: Pick<TenantMembership, "active" | "permissions" | "role">
): boolean {
  return membership.active && ["owner", "manager"].includes(membership.role) &&
    membership.permissions.some((permission) =>
      permission === "orders.manage" || permission === "establishment.manage");
}
