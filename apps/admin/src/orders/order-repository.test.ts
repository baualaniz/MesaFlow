import { describe, expect, it } from "vitest";

import { visibleOperationalStatuses } from "./order-visibility";

describe("cola operativa por rol", () => {
  it("cocina recibe únicamente preparación", () => {
    expect(visibleOperationalStatuses("kitchen")).toEqual([
      "confirmed", "preparing", "ready"
    ]);
  });

  it("salón y administración reciben el recorrido operativo completo", () => {
    for (const role of ["owner", "manager", "staff"] as const) {
      expect(visibleOperationalStatuses(role)).toEqual([
        "created", "confirmed", "preparing", "ready", "delivered"
      ]);
    }
  });
});
