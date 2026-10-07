import { describe, expect, it } from "vitest";

import { parseAdminTeamMember, parseTeamList } from "./team-model";

const member = {
  active: true,
  createdAt: "2026-10-07T12:00:00.000Z",
  displayName: "Ana Cocina",
  email: "ANA@example.com",
  permissions: ["orders.prepare"],
  role: "kitchen",
  uid: "ana-cocina",
  updatedAt: "2026-10-07T12:00:00.000Z"
};

describe("contrato del equipo", () => {
  it("normaliza miembros válidos devueltos por la Function", () => {
    const parsed = parseAdminTeamMember(member);
    expect(parsed.email).toBe("ana@example.com");
    expect(parsed.createdAt).toBeInstanceOf(Date);
    expect(parseTeamList([member])).toHaveLength(1);
  });

  it("rechaza roles, permisos duplicados y campos desconocidos", () => {
    expect(() => parseAdminTeamMember({ ...member, role: "superadmin" })).toThrow();
    expect(() => parseAdminTeamMember({ ...member, permissions: ["orders.prepare", "orders.prepare"] })).toThrow();
    expect(() => parseAdminTeamMember({ ...member, secret: true })).toThrow();
  });
});
