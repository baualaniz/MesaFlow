import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import {
  chooseTenantAccess,
  parseEstablishmentSummary,
  parseTenantMembership,
  parseUserEstablishmentIds,
  type TenantAccess
} from "./tenant-model";

const time = Timestamp.fromDate(new Date("2026-09-17T12:00:00.000Z"));

function member(overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    createdAt: time,
    establishmentId: "tenant-a",
    permissions: ["orders.manage"],
    role: "staff",
    uid: "user-a",
    updatedAt: time,
    ...overrides
  };
}

function establishment(name: string, id: string): TenantAccess {
  return {
    establishment: {
      active: true,
      currency: "ARS",
      id,
      name,
      slug: id,
      timezone: "America/Argentina/Buenos_Aires"
    },
    membership: {
      active: true,
      establishmentId: id,
      permissions: ["orders.manage"],
      role: "staff",
      uid: "user-a"
    }
  };
}

describe("modelo de acceso por establecimiento", () => {
  it("valida referencias de tenant del perfil propio", () => {
    expect(parseUserEstablishmentIds({
      createdAt: time,
      displayName: "Usuario Demo",
      email: "demo@example.invalid",
      establishmentIds: ["tenant-a", "tenant-b"],
      updatedAt: time
    })).toEqual(["tenant-a", "tenant-b"]);
  });

  it("rechaza referencias duplicadas o campos añadidos", () => {
    const profile = {
      createdAt: time,
      displayName: "Usuario Demo",
      email: "demo@example.invalid",
      establishmentIds: ["tenant-a", "tenant-a"],
      updatedAt: time
    };
    expect(() => parseUserEstablishmentIds(profile)).toThrow(/duplicados/u);
    expect(() => parseUserEstablishmentIds({ ...profile, establishmentIds: [], admin: true }))
      .toThrow(/campos/u);
  });

  it("valida identidad, tenant, rol y permisos de la membresía", () => {
    expect(parseTenantMembership(member(), "user-a", "tenant-a")).toMatchObject({
      active: true,
      role: "staff",
      uid: "user-a"
    });
    expect(() => parseTenantMembership(member(), "other-user", "tenant-a"))
      .toThrow(/identidad/u);
    expect(() => parseTenantMembership(member({ role: "superadmin" }), "user-a", "tenant-a"))
      .toThrow(/rol/u);
    expect(() => parseTenantMembership(
      member({ permissions: ["orders.manage", "orders.manage"] }), "user-a", "tenant-a"
    )).toThrow(/duplicados/u);
  });

  it("valida el resumen del establecimiento", () => {
    expect(parseEstablishmentSummary({
      active: true,
      createdAt: time,
      currency: "ARS",
      name: "Bistró Demo",
      slug: "bistro-demo",
      timezone: "America/Argentina/Buenos_Aires",
      updatedAt: time
    }, "tenant-a")).toMatchObject({ id: "tenant-a", name: "Bistró Demo" });
  });

  it("restaura una selección accesible y descarta una referencia ajena", () => {
    const accesses = [establishment("Bistró A", "tenant-a"), establishment("Bistró B", "tenant-b")];
    expect(chooseTenantAccess(accesses, "tenant-b")?.establishment.id).toBe("tenant-b");
    expect(chooseTenantAccess(accesses, "tenant-x")?.establishment.id).toBe("tenant-a");
    expect(chooseTenantAccess([], "tenant-a")).toBeNull();
  });
});
