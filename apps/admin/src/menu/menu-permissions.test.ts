import { describe, expect, it } from "vitest";

import { canEditCatalog, canToggleProductAvailability } from "./menu-permissions";

describe("permisos del catálogo", () => {
  it("propietario y encargado editan el catálogo", () => {
    expect(canEditCatalog({ active: true, role: "owner", permissions: ["menu.manage"] })).toBe(true);
    expect(canEditCatalog({ active: true, role: "manager", permissions: ["menu.manage"] })).toBe(true);
  });

  it("salón solo cambia disponibilidad operativa", () => {
    const staff = { active: true, role: "staff" as const, permissions: ["orders.manage"] };
    expect(canEditCatalog(staff)).toBe(false);
    expect(canToggleProductAvailability(staff)).toBe(true);
  });

  it("cocina y membresías inactivas no modifican", () => {
    expect(canToggleProductAvailability({ active: true, role: "kitchen", permissions: ["orders.prepare"] })).toBe(false);
    expect(canEditCatalog({ active: false, role: "owner", permissions: ["menu.manage"] })).toBe(false);
  });
});
