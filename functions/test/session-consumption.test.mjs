import assert from "node:assert/strict";
import test from "node:test";

import { parseOrder, parsePayment } from "@mesaflow/contracts";
import {
  calculateConsumption,
  ConsumptionError,
  getSessionConsumption
} from "../lib/session-consumption.js";

const timestamp = "2026-09-17T12:00:00.000Z";

function order({ status = "completed", totalMinor = 100000, quantity = 1 } = {}) {
  return parseOrder({
    establishmentId: "mesa-flow-demo",
    sessionId: "sesion-mesa-01",
    tableId: "mesa-01",
    customerUid: "guest-a",
    status,
    items: [{
      productId: "burger-casa",
      name: "Burger de la casa",
      unitPriceMinor: totalMinor / quantity,
      quantity,
      lineTotalMinor: totalMinor,
      notes: null
    }],
    subtotalMinor: totalMinor,
    totalMinor,
    currency: "ARS",
    notes: null,
    statusTimestamps: { [status]: timestamp },
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

function payment({ status = "approved", amountMinor = 40000, currency = "ARS" } = {}) {
  return parsePayment({
    establishmentId: "mesa-flow-demo",
    sessionId: "sesion-mesa-01",
    provider: "mercado_pago",
    externalId: "mp-01",
    idempotencyKey: `payment-${status}`,
    status,
    amountMinor,
    currency,
    providerStatus: status,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

test("calcula pedidos válidos y descuenta solamente pagos aprobados", () => {
  const totals = calculateConsumption(
    [order({ totalMinor: 100000, quantity: 2 }), order({ status: "cancelled" })],
    [payment(), payment({ status: "rejected", amountMinor: 90000 })],
    "ARS"
  );
  assert.deepEqual(totals, {
    orderCount: 1,
    itemCount: 2,
    subtotalMinor: 100000,
    paidMinor: 40000,
    balanceMinor: 60000
  });
});

test("rechaza moneda divergente y pagos superiores al consumo", () => {
  assert.throws(
    () => calculateConsumption([order()], [payment({ currency: "USD" })], "ARS"),
    (error) => error instanceof ConsumptionError &&
      error.reason === "consumption-inconsistent"
  );
  assert.throws(
    () => calculateConsumption([order()], [payment({ amountMinor: 100001 })], "ARS"),
    (error) => error instanceof ConsumptionError &&
      error.reason === "consumption-inconsistent"
  );
});

test("consulta autenticada normaliza el contexto y delega al repositorio", async () => {
  const calls = [];
  const expected = Object.freeze({
    sessionId: "sesion-mesa-01",
    tableId: "mesa-01",
    sessionStatus: "open",
    currency: "ARS",
    orderCount: 1,
    itemCount: 2,
    subtotalMinor: 100000,
    paidMinor: 0,
    balanceMinor: 100000,
    calculatedAt: timestamp
  });
  const result = await getSessionConsumption({
    establishmentId: "mesa-flow-demo",
    sessionId: "sesion-mesa-01",
    tableId: "mesa-01"
  }, "guest-a", {
    async get(command) {
      calls.push(command);
      return expected;
    }
  }, new Date(timestamp));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].uid, "guest-a");
  assert.equal(calls[0].calculatedAt.toISOString(), timestamp);
  assert.equal(result, expected);
});

test("consulta rechaza identidad ausente y campos manipulados", async () => {
  const repository = { async get() { throw new Error("no debe ejecutarse"); } };
  await assert.rejects(
    getSessionConsumption({}, undefined, repository),
    (error) => error instanceof ConsumptionError && error.code === "unauthenticated"
  );
  await assert.rejects(
    getSessionConsumption({
      establishmentId: "mesa-flow-demo",
      sessionId: "sesion-mesa-01",
      tableId: "mesa-01",
      subtotalMinor: 1
    }, "guest-a", repository),
    (error) => error instanceof ConsumptionError && error.code === "invalid-argument"
  );
});
