import { describe, expect, it } from "vitest";

import { canManageAssistance } from "./assistance-permissions";

describe("permisos de asistencia", () => {
  it("habilita administración y salón autorizado", () => {
    expect(canManageAssistance({ active: true, role: "owner", permissions: [] })).toBe(true);
    expect(canManageAssistance({
      active: true,
      role: "staff",
      permissions: ["assistance.manage"]
    })).toBe(true);
  });

  it("rechaza cocina, salón sin permiso y membresías inactivas", () => {
    expect(canManageAssistance({
      active: true,
      role: "kitchen",
      permissions: ["orders.prepare"]
    })).toBe(false);
    expect(canManageAssistance({ active: true, role: "staff", permissions: [] })).toBe(false);
    expect(canManageAssistance({ active: false, role: "owner", permissions: [] })).toBe(false);
  });
});
