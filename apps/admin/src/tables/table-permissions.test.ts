import { describe, expect, it } from "vitest";

import { canManageTables } from "./table-permissions";

describe("permisos de mesas", () => {
  it("permite propietario o encargado con permiso operativo", () => {
    expect(canManageTables({ active: true, role: "owner", permissions: ["establishment.manage"] })).toBe(true);
    expect(canManageTables({ active: true, role: "manager", permissions: ["orders.manage"] })).toBe(true);
  });

  it("mantiene salón en solo lectura y rechaza membresías inactivas", () => {
    expect(canManageTables({ active: true, role: "staff", permissions: ["orders.manage"] })).toBe(false);
    expect(canManageTables({ active: false, role: "owner", permissions: ["establishment.manage"] })).toBe(false);
  });
});
