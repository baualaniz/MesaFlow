import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";

import {
  formatMetricMoney,
  parseAdminDailyMetric,
  productMetricLabel,
  summarizeMetrics
} from "./metrics-model";

function raw(overrides: Record<string, unknown> = {}) {
  return {
    activeOrders: 2,
    approvedPayments: 1,
    completedOrders: 1,
    date: "2026-10-07",
    establishmentId: "mesa-flow-demo",
    productQuantities: { "burger-casa": 2 },
    salesMinor: 620000,
    updatedAt: Timestamp.fromDate(new Date("2026-10-07T15:00:00.000Z")),
    ...overrides
  };
}

describe("métricas administrativas", () => {
  it("valida el documento diario y convierte Timestamp", () => {
    const metric = parseAdminDailyMetric("2026-10-07", raw(), "mesa-flow-demo");
    expect(metric.salesMinor).toBe(620000);
    expect(metric.updatedAt).toBe("2026-10-07T15:00:00.000Z");
  });

  it("rechaza tenant, fecha, campos y contadores inválidos", () => {
    expect(() => parseAdminDailyMetric("2026-10-06", raw(), "mesa-flow-demo")).toThrow();
    expect(() => parseAdminDailyMetric(
      "2026-10-07", raw({ activeOrders: -1 }), "mesa-flow-demo"
    )).toThrow();
    expect(() => parseAdminDailyMetric(
      "2026-10-07", { ...raw(), unexpected: true }, "mesa-flow-demo"
    )).toThrow();
  });

  it("resume siete días y ordena productos por cantidad", () => {
    const first = parseAdminDailyMetric("2026-10-07", raw(), "mesa-flow-demo");
    const second = parseAdminDailyMetric("2026-10-06", raw({
      date: "2026-10-06",
      productQuantities: { "cafe-especial": 3 },
      salesMinor: 100000
    }), "mesa-flow-demo");
    const summary = summarizeMetrics([first, second]);
    expect(summary.salesMinor).toBe(720000);
    expect(summary.approvedPayments).toBe(2);
    expect(summary.topProducts[0]).toEqual({ productId: "cafe-especial", quantity: 3 });
  });

  it("formatea importes y nombres legibles", () => {
    expect(formatMetricMoney(620000, "ARS")).toContain("6.200");
    expect(productMetricLabel("burger-casa")).toBe("Burger Casa");
  });
});
