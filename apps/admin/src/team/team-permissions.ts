import type { AdminRole, TenantMembership } from "../tenant/tenant-model";

export const ASSIGNABLE_ROLES: Readonly<Record<"owner" | "manager", readonly AdminRole[]>> =
  Object.freeze({
    owner: Object.freeze(["owner", "manager", "staff", "kitchen"] as const),
    manager: Object.freeze(["staff", "kitchen"] as const)
  });

export function canManageTeam(
  membership: Pick<TenantMembership, "active" | "role">
): membership is Pick<TenantMembership, "active"> & { readonly role: "owner" | "manager" } {
  return membership.active && (membership.role === "owner" || membership.role === "manager");
}

export function canEditTeamMember(actorRole: AdminRole, targetRole: AdminRole): boolean {
  return actorRole === "owner" ||
    (actorRole === "manager" && (targetRole === "staff" || targetRole === "kitchen"));
}
