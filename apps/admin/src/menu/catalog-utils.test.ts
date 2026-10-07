import { describe, expect, it } from "vitest";

import { adjacentItem, catalogId, nextSortOrder } from "./catalog-utils";

describe("utilidades del catálogo", () => {
  it("genera IDs seguros y normaliza acentos", () => {
    expect(catalogId("  Postres y Café  ")).toBe("postres-y-cafe");
    expect(() => catalogId("---")).toThrow();
  });

  it("calcula el próximo orden sin depender de huecos", () => {
    expect(nextSortOrder([])).toBe(1);
    expect(nextSortOrder([{ sortOrder: 2 }, { sortOrder: 8 }])).toBe(9);
  });

  it("encuentra vecinos según el orden estable", () => {
    const items = [
      { id: "b", sortOrder: 2 }, { id: "a", sortOrder: 1 }, { id: "c", sortOrder: 3 }
    ];
    expect(adjacentItem(items, "b", "up")?.id).toBe("a");
    expect(adjacentItem(items, "b", "down")?.id).toBe("c");
    expect(adjacentItem(items, "a", "up")).toBeNull();
  });
});
