import type { OrderStatus } from "@mesaflow/contracts";

import type { AdminRole } from "../tenant/tenant-model";

const ALL_OPERATIONAL_STATUSES: readonly OrderStatus[] = Object.freeze([
  "created", "confirmed", "preparing", "ready", "delivered"
]);
const KITCHEN_STATUSES: readonly OrderStatus[] = Object.freeze([
  "confirmed", "preparing", "ready"
]);

export function visibleOperationalStatuses(role: AdminRole): readonly OrderStatus[] {
  return role === "kitchen" ? KITCHEN_STATUSES : ALL_OPERATIONAL_STATUSES;
}
