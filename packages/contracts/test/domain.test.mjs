import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ASSISTANCE_STATUSES,
  ASSISTANCE_TYPES,
  CONTRACT_LIMITS,
  minorToDecimalString,
  ORDER_STATUSES,
  parseAssistanceRequest,
  parseIsoTimestamp,
  parseMoney,
  parseOrder,
  parseProduct,
  PAYMENT_STATUSES,
  ROLES,
  TABLE_SESSION_STATUSES
} from "../lib/index.js";

const [spec, fixtures] = await Promise.all([
  readFile(new URL("../fixtures/contract-spec.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../fixtures/domain-fixtures.json", import.meta.url), "utf8").then(JSON.parse)
]);

test("los enums TypeScript coinciden con la especificación canónica", () => {
  assert.deepEqual(ROLES, spec.enums.role);
  assert.deepEqual(ORDER_STATUSES, spec.enums.orderStatus);
  assert.deepEqual(TABLE_SESSION_STATUSES, spec.enums.tableSessionStatus);
  assert.deepEqual(PAYMENT_STATUSES, spec.enums.paymentStatus);
  assert.deepEqual(ASSISTANCE_TYPES, spec.enums.assistanceType);
  assert.deepEqual(ASSISTANCE_STATUSES, spec.enums.assistanceStatus);
});

test("los límites TypeScript coinciden con la especificación", () => {
  assert.deepEqual(CONTRACT_LIMITS, spec.limits);
});

test("dinero conserva enteros y genera decimal determinista", () => {
  for (const fixture of fixtures.moneyCases) {
    const money = parseMoney({ amountMinor: fixture.amountMinor, currency: fixture.currency });
    assert.equal(money.amountMinor, fixture.amountMinor);
    assert.equal(minorToDecimalString(money.amountMinor), fixture.decimal);
  }
});

test("rechaza importes negativos, fraccionarios y monedas no normalizadas", () => {
  for (const fixture of fixtures.invalid.money) assert.throws(() => parseMoney(fixture));
});

test("timestamps requieren UTC RFC3339 con milisegundos", () => {
  for (const fixture of fixtures.timestampCases) assert.equal(parseIsoTimestamp(fixture), fixture);
  for (const fixture of fixtures.invalid.timestamps) {
    assert.throws(() => parseIsoTimestamp(fixture));
  }
});

test("producto válido se normaliza sin aceptar campos desconocidos", () => {
  const product = parseProduct(fixtures.product);
  assert.equal(product.name, "Burger de la casa");
  assert.equal(product.priceMinor, 1290000);
  assert.throws(() => parseProduct({ ...fixtures.product, unexpected: true }));
});

test("pedido válido recalcula líneas y exige timestamp de estado", () => {
  const order = parseOrder(fixtures.order);
  assert.equal(order.items.length, 1);
  assert.equal(order.totalMinor, 1290000);
  const wrongLine = structuredClone(fixtures.order);
  wrongLine.items[0].lineTotalMinor = 1;
  assert.throws(() => parseOrder(wrongLine));
  const missingTimestamp = structuredClone(fixtures.order);
  missingTimestamp.statusTimestamps = {};
  assert.throws(() => parseOrder(missingTimestamp));
});

test("pedido rechaza enums y totales manipulados", () => {
  const badStatus = structuredClone(fixtures.order);
  badStatus.status = "paid";
  assert.throws(() => parseOrder(badStatus));
  const badTotal = structuredClone(fixtures.order);
  badTotal.totalMinor += 100;
  assert.throws(() => parseOrder(badTotal));
});

test("solicitud de asistencia valida tipo, estado e identidades", () => {
  const request = parseAssistanceRequest(fixtures.assistanceRequest);
  assert.equal(request.type, "waiter");
  assert.equal(request.status, "pending");
  assert.throws(() => parseAssistanceRequest({
    ...fixtures.assistanceRequest,
    type: "kitchen"
  }));
  assert.throws(() => parseAssistanceRequest({
    ...fixtures.assistanceRequest,
    unexpected: true
  }));
});
