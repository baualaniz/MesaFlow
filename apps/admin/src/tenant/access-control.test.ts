import { describe, expect, it } from "vitest";

import { canAccess } from "./access-control";
import type { AdminRole, TenantMembership } from "./tenant-model";

function membership(role: AdminRole, permissions: readonly string[]): TenantMembership {
  return {
    active: true,
    establishmentId: "mesa-flow-demo",
    permissions,
    role,
    uid: `demo-${role}`
  };
}

describe("RBAC administrativo", () => {
  it("owner accede a configuración, equipo, menú, pedidos y métricas", () => {
    const owner = membership("owner", [
      "establishment.manage", "menu.manage", "orders.manage", "metrics.read"
    ]);
    for (const capability of [
      "settings.manage", "team.view", "menu.view", "orders.view", "assistance.view", "metrics.read"
    ] as const) {
      expect(canAccess(owner, capability)).toBe(true);
    }
  });

  it("manager administra la operación y la configuración del establecimiento", () => {
    const manager = membership("manager", ["menu.manage", "orders.manage", "metrics.read"]);
    expect(canAccess(manager, "team.view")).toBe(true);
    expect(canAccess(manager, "menu.view")).toBe(true);
    expect(canAccess(manager, "settings.manage")).toBe(true);
  });

  it("salón ve menú operativo pero no equipo ni métricas", () => {
    const staff = membership("staff", ["orders.manage", "assistance.manage"]);
    expect(canAccess(staff, "orders.view")).toBe(true);
    expect(canAccess(staff, "tables.view")).toBe(true);
    expect(canAccess(staff, "menu.view")).toBe(true);
    expect(canAccess(staff, "assistance.view")).toBe(true);
    expect(canAccess(staff, "team.view")).toBe(false);
    expect(canAccess(staff, "metrics.read")).toBe(false);
  });

  it("cocina solo conserva el recorrido de pedidos", () => {
    const kitchen = membership("kitchen", ["orders.prepare"]);
    expect(canAccess(kitchen, "orders.view")).toBe(true);
    expect(canAccess(kitchen, "tables.view")).toBe(false);
    expect(canAccess(kitchen, "menu.view")).toBe(false);
    expect(canAccess(kitchen, "assistance.view")).toBe(false);
  });

  it("una membresía inactiva no habilita ninguna capacidad", () => {
    const inactive = { ...membership("owner", ["orders.manage"]), active: false };
    expect(canAccess(inactive, "dashboard.view")).toBe(false);
    expect(canAccess(inactive, "orders.view")).toBe(false);
  });
});
