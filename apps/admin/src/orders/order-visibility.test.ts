import { describe, expect, it } from "vitest";

import { visibleOperationalStatuses } from "./order-visibility";

describe("visibilidad operativa por rol", () => {
  it("limita cocina a los estados que requieren preparación", () => {
    expect(visibleOperationalStatuses("kitchen")).toEqual([
      "confirmed", "preparing", "ready"
    ]);
  });

  it.each(["owner", "manager", "staff"] as const)(
    "%s conserva el flujo operativo completo",
    (role) => {
      expect(visibleOperationalStatuses(role)).toEqual([
        "created", "confirmed", "preparing", "ready", "delivered"
      ]);
    }
  );
});
