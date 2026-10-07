import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import {
  formatOrderMoney,
  parseAdminOrder,
  tableLabel
} from "./order-model";

const createdAt = Timestamp.fromDate(new Date("2026-10-06T12:00:00.000Z"));

function order(overrides: Record<string, unknown> = {}) {
  return {
    establishmentId: "mesa-flow-demo",
    sessionId: "session-a",
    tableId: "mesa-01",
    customerUid: "guest-a",
    status: "created",
    items: [{
      productId: "burger",
      name: "Burger",
      unitPriceMinor: 129000,
      quantity: 2,
      lineTotalMinor: 258000,
      notes: null
    }],
    subtotalMinor: 258000,
    totalMinor: 258000,
    currency: "ARS",
    notes: null,
    statusTimestamps: { created: createdAt },
    createdAt,
    updatedAt: createdAt,
    ...overrides
  };
}

describe("pedidos administrativos", () => {
  it("convierte timestamps nativos y conserva el snapshot del pedido", () => {
    const parsed = parseAdminOrder("order-a", order(), "mesa-flow-demo");
    expect(parsed.id).toBe("order-a");
    expect(parsed.createdAt).toBe("2026-10-06T12:00:00.000Z");
    expect(parsed.items[0]?.quantity).toBe(2);
  });

  it("rechaza pedidos cruzados y timestamps no nativos", () => {
    expect(() => parseAdminOrder("order-a", order(), "otro-tenant")).toThrow(/pertenece/u);
    expect(() => parseAdminOrder(
      "order-a", order({ updatedAt: "2026-10-06T12:00:00.000Z" }), "mesa-flow-demo"
    )).toThrow(/Timestamp/u);
  });

  it("rechaza totales manipulados mediante el contrato compartido", () => {
    expect(() => parseAdminOrder(
      "order-a", order({ totalMinor: 1 }), "mesa-flow-demo"
    )).toThrow(/totales/u);
  });

  it("formatea mesa e importes para la interfaz", () => {
    expect(tableLabel("mesa-01")).toBe("Mesa 01");
    expect(formatOrderMoney(258000, "ARS")).toContain("2.580");
  });
});
