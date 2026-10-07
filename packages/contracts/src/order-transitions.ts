import type { OrderStatus, Role } from "./domain.js";

export interface OrderTransitionActor {
  readonly active: boolean;
  readonly role: Role;
  readonly permissions: readonly string[];
}

interface TransitionRule {
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly roles: readonly Role[];
  readonly permissionByRole: Readonly<Partial<Record<Role, readonly string[]>>>;
}

const MANAGE = Object.freeze(["orders.manage"]);
const PREPARE = Object.freeze(["orders.prepare"]);

const ORDER_TRANSITION_RULES: readonly TransitionRule[] = Object.freeze([
  {
    from: "created",
    to: "confirmed",
    roles: Object.freeze(["owner", "manager", "staff"] as const),
    permissionByRole: Object.freeze({ owner: MANAGE, manager: MANAGE, staff: MANAGE })
  },
  {
    from: "created",
    to: "cancelled",
    roles: Object.freeze(["owner", "manager", "staff"] as const),
    permissionByRole: Object.freeze({ owner: MANAGE, manager: MANAGE, staff: MANAGE })
  },
  {
    from: "confirmed",
    to: "preparing",
    roles: Object.freeze(["owner", "manager", "kitchen"] as const),
    permissionByRole: Object.freeze({ owner: MANAGE, manager: MANAGE, kitchen: PREPARE })
  },
  {
    from: "confirmed",
    to: "cancelled",
    roles: Object.freeze(["owner", "manager", "staff"] as const),
    permissionByRole: Object.freeze({
      owner: MANAGE,
      manager: MANAGE,
      staff: Object.freeze(["orders.cancel_confirmed"])
    })
  },
  {
    from: "preparing",
    to: "ready",
    roles: Object.freeze(["owner", "manager", "kitchen"] as const),
    permissionByRole: Object.freeze({ owner: MANAGE, manager: MANAGE, kitchen: PREPARE })
  },
  {
    from: "ready",
    to: "delivered",
    roles: Object.freeze(["owner", "manager", "staff"] as const),
    permissionByRole: Object.freeze({ owner: MANAGE, manager: MANAGE, staff: MANAGE })
  },
  {
    from: "delivered",
    to: "completed",
    roles: Object.freeze(["owner", "manager"] as const),
    permissionByRole: Object.freeze({ owner: MANAGE, manager: MANAGE })
  }
]);

export function canTransitionOrder(
  current: OrderStatus,
  next: OrderStatus,
  actor: OrderTransitionActor
): boolean {
  if (!actor.active) return false;
  const rule = ORDER_TRANSITION_RULES.find(({ from, to }) => from === current && to === next);
  if (rule === undefined || !rule.roles.includes(actor.role)) return false;
  const required = rule.permissionByRole[actor.role];
  return required !== undefined && required.some((permission) =>
    actor.permissions.includes(permission)
  );
}

export function availableOrderTransitions(
  current: OrderStatus,
  actor: OrderTransitionActor
): readonly OrderStatus[] {
  return Object.freeze(ORDER_TRANSITION_RULES
    .filter(({ from, to }) => from === current && canTransitionOrder(current, to, actor))
    .map(({ to }) => to));
}
