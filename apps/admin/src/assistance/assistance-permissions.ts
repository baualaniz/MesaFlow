import type { TenantMembership } from "../tenant/tenant-model";

export function canManageAssistance(
  membership: Pick<TenantMembership, "role" | "permissions" | "active">
): boolean {
  return membership.active && (
    membership.role === "owner" ||
    membership.role === "manager" ||
    membership.permissions.includes("assistance.manage")
  );
}
