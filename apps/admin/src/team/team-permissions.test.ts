import { describe, expect, it } from "vitest";

import { ASSIGNABLE_ROLES, canEditTeamMember, canManageTeam } from "./team-permissions";

describe("matriz administrativa del equipo", () => {
  it("owner puede administrar y asignar todos los roles", () => {
    expect(canManageTeam({ active: true, role: "owner" })).toBe(true);
    expect(ASSIGNABLE_ROLES.owner).toEqual(["owner", "manager", "staff", "kitchen"]);
  });

  it("manager solo administra salón y cocina", () => {
    expect(canManageTeam({ active: true, role: "manager" })).toBe(true);
    expect(canEditTeamMember("manager", "staff")).toBe(true);
    expect(canEditTeamMember("manager", "owner")).toBe(false);
    expect(ASSIGNABLE_ROLES.manager).toEqual(["staff", "kitchen"]);
  });

  it("roles operativos y cuentas inactivas no administran", () => {
    expect(canManageTeam({ active: true, role: "staff" })).toBe(false);
    expect(canManageTeam({ active: false, role: "owner" })).toBe(false);
  });
});
