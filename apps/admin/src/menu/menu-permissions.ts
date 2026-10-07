import type { TenantMembership } from "../tenant/tenant-model";

export function canEditCatalog(
  membership: Pick<TenantMembership, "active" | "permissions" | "role">
): boolean {
  return membership.active && ["owner", "manager"].includes(membership.role) &&
    membership.permissions.includes("menu.manage");
}

export function canToggleProductAvailability(
  membership: Pick<TenantMembership, "active" | "permissions" | "role">
): boolean {
  return membership.active && (
    canEditCatalog(membership) ||
    (membership.role === "staff" && membership.permissions.includes("orders.manage"))
  );
}
