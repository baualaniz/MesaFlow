import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase-admin/firestore";

import {
  localMetricDate,
  parseDailyMetric,
  recordCreatedOrder,
  recordOrderTransition,
  recordPaymentTransition,
  serializeDailyMetric
} from "../lib/data/firestore-daily-metrics.js";

const now = new Date("2026-10-07T03:30:00.000Z");

function metric() {
  return parseDailyMetric({
    establishmentId: "mesa-flow-demo",
    date: "2026-10-07",
    salesMinor: 620000,
    approvedPayments: 1,
    completedOrders: 1,
    activeOrders: 2,
    productQuantities: { "burger-casa": 2 },
    updatedAt: Timestamp.fromDate(now)
  }, "mesa-flow-demo", "2026-10-07", now);
}

test("calcula la fecha según la zona local del establecimiento", () => {
  assert.equal(localMetricDate(now, "America/Argentina/Buenos_Aires"), "2026-10-07");
  assert.equal(
    localMetricDate(new Date("2026-10-07T01:30:00.000Z"), "America/Argentina/Buenos_Aires"),
    "2026-10-06"
  );
  assert.throws(() => localMetricDate(now, "zona-inexistente"));
});

test("un pedido suma actividad y cantidades sin perder el acumulado", () => {
  const result = recordCreatedOrder(metric(), {
    items: [
      { productId: "burger-casa", quantity: 1 },
      { productId: "cafe-especial", quantity: 2 }
    ]
  }, now);
  assert.equal(result.activeOrders, 3);
  assert.deepEqual(result.productQuantities, {
    "burger-casa": 3,
    "cafe-especial": 2
  });
});

test("completar y cancelar actualizan contadores sin valores negativos", () => {
  const completed = recordOrderTransition(metric(), { items: [] }, "completed", now);
  assert.equal(completed.activeOrders, 1);
  assert.equal(completed.completedOrders, 2);
  const cancelled = recordOrderTransition(metric(), {
    items: [{ productId: "burger-casa", quantity: 4 }]
  }, "cancelled", now);
  assert.equal(cancelled.activeOrders, 1);
  assert.equal(cancelled.productQuantities["burger-casa"], 0);
});

test("aprobación y devolución aplican una sola contribución de venta", () => {
  const approved = recordPaymentTransition(metric(), "pending", "approved", 100000, now);
  assert.equal(approved.salesMinor, 720000);
  assert.equal(approved.approvedPayments, 2);
  const refunded = recordPaymentTransition(approved, "approved", "refunded", 100000, now);
  assert.equal(refunded.salesMinor, 620000);
  assert.equal(refunded.approvedPayments, 1);
  const duplicate = recordPaymentTransition(refunded, "refunded", "refunded", 100000, now);
  assert.equal(duplicate.salesMinor, 620000);
});

test("rechaza métricas corruptas y serializa Timestamp nativo", () => {
  assert.throws(() => parseDailyMetric({
    ...serializeDailyMetric(metric()),
    activeOrders: -1
  }, "mesa-flow-demo", "2026-10-07", now));
  assert.ok(serializeDailyMetric(metric()).updatedAt instanceof Timestamp);
});
