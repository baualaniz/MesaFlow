import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import { parseAdminCategory, parseAdminProduct } from "./menu-model";

const now = Timestamp.fromDate(new Date("2026-10-07T12:00:00.000Z"));

describe("contratos administrativos del menú", () => {
  it("convierte categorías y productos completos", () => {
    const category = parseAdminCategory("principales", {
      active: true,
      createdAt: now,
      description: "Platos de la casa",
      establishmentId: "tenant-a",
      name: "Principales",
      sortOrder: 2,
      updatedAt: now
    }, "tenant-a");
    const product = parseAdminProduct("burger", {
      active: true,
      available: true,
      categoryId: "principales",
      createdAt: now,
      currency: "ARS",
      description: "Burger completa",
      establishmentId: "tenant-a",
      imagePath: "menu.burger-casa",
      name: "Burger",
      priceMinor: 120000,
      sortOrder: 1,
      updatedAt: now
    }, "tenant-a");
    expect(category.sortOrder).toBe(2);
    expect(product.priceMinor).toBe(120000);
  });

  it("rechaza otro tenant, campos desconocidos y totales inválidos", () => {
    const category = {
      active: true, createdAt: now, description: "", establishmentId: "tenant-a",
      name: "Entradas", sortOrder: 1, updatedAt: now
    };
    expect(() => parseAdminCategory("entradas", category, "tenant-b")).toThrow();
    expect(() => parseAdminCategory("entradas", { ...category, secret: true }, "tenant-a")).toThrow();
    expect(() => parseAdminProduct("x", {
      active: true, available: true, categoryId: "entradas", createdAt: now,
      currency: "ARS", description: "", establishmentId: "tenant-a", imagePath: null,
      name: "X", priceMinor: -1, sortOrder: 1, updatedAt: now
    }, "tenant-a")).toThrow();
  });
});
