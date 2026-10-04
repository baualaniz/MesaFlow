import assert from "node:assert/strict";
import test from "node:test";

import {
  CreateOrderError,
  buildOrderId,
  createOrder
} from "../lib/create-order.js";

const requestId = "0123456789abcdef0123456789abcdef";
const now = new Date("2026-09-17T12:15:00.000Z");
const validInput = Object.freeze({
  establishmentId: "mesa-flow-demo",
  sessionId: "sesion-mesa-01",
  tableId: "mesa-01",
  requestId,
  items: [
    { productId: "burger-casa", quantity: 2, notes: "  Sin cebolla  " },
    { productId: "torta-chocolate", quantity: 1, notes: null }
  ]
});

function repository() {
  const calls = [];
  return {
    calls,
    async create(command) {
      calls.push(command);
      return Object.freeze({
        orderId: command.orderId,
        status: "created",
        itemCount: 3,
        totalMinor: 3200000,
        currency: "ARS",
        createdAt: command.createdAt.toISOString()
      });
    }
  };
}

test("acepta solo el borrador y genera un ID idempotente separado por usuario", async () => {
  const repo = repository();
  const result = await createOrder(validInput, "guest-a", repo, now);

  assert.equal(repo.calls.length, 1);
  assert.equal(repo.calls[0].orderId, buildOrderId("guest-a", requestId));
  assert.notEqual(
    buildOrderId("guest-a", requestId),
    buildOrderId("guest-b", requestId)
  );
  assert.equal(repo.calls[0].items[0].notes, "Sin cebolla");
  assert.equal(repo.calls[0].items[0].quantity, 2);
  assert.equal(repo.calls[0].createdAt.toISOString(), now.toISOString());
  assert.equal(result.orderId, repo.calls[0].orderId);
});

test("no admite precios, totales ni campos adicionales enviados por el cliente", async () => {
  const invalidInputs = [
    { ...validInput, totalMinor: 1 },
    {
      ...validInput,
      items: [{
        productId: "burger-casa",
        quantity: 1,
        notes: null,
        unitPriceMinor: 1
      }]
    },
    { ...validInput, requestId: "predecible" }
  ];
  for (const input of invalidInputs) {
    const repo = repository();
    await assert.rejects(
      createOrder(input, "guest-a", repo, now),
      (error) => error instanceof CreateOrderError &&
        error.code === "invalid-argument" && error.reason === "invalid-cart"
    );
    assert.equal(repo.calls.length, 0);
  }
});

test("rechaza carrito vacío, cantidades inválidas y líneas duplicadas", async () => {
  const invalidInputs = [
    { ...validInput, items: [] },
    { ...validInput, items: [{ productId: "burger-casa", quantity: 0, notes: null }] },
    {
      ...validInput,
      items: [
        { productId: "burger-casa", quantity: 1, notes: "Sin sal" },
        { productId: "burger-casa", quantity: 1, notes: " Sin sal " }
      ]
    }
  ];
  for (const input of invalidInputs) {
    await assert.rejects(
      createOrder(input, "guest-a", repository(), now),
      (error) => error instanceof CreateOrderError && error.code === "invalid-argument"
    );
  }
});

test("exige una identidad autenticada antes de invocar el repositorio", async () => {
  const repo = repository();
  await assert.rejects(
    createOrder(validInput, undefined, repo, now),
    (error) => error instanceof CreateOrderError &&
      error.code === "unauthenticated" && error.reason === "session-unavailable"
  );
  assert.equal(repo.calls.length, 0);
});
