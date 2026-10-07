import assert from "node:assert/strict";
import test from "node:test";

import {
  UpdateOrderStatusError,
  updateOrderStatus
} from "../lib/update-order-status.js";

const now = new Date("2026-10-06T15:00:00.000Z");
const input = Object.freeze({
  establishmentId: "mesa-flow-demo",
  expectedStatus: "created",
  nextStatus: "confirmed",
  orderId: "pedido-mesa-01-b",
  requestId: "0123456789abcdef0123456789abcdef"
});

function repository() {
  const calls = [];
  return {
    calls,
    async transition(command) {
      calls.push(command);
      return {
        orderId: command.orderId,
        status: command.nextStatus,
        updatedAt: command.updatedAt.toISOString()
      };
    }
  };
}

test("normaliza una transición autenticada y delega sin aceptar rol del cliente", async () => {
  const repo = repository();
  const result = await updateOrderStatus(input, "demo-staff", repo, now);
  assert.equal(repo.calls.length, 1);
  assert.equal(repo.calls[0].actorUid, "demo-staff");
  assert.equal(repo.calls[0].expectedStatus, "created");
  assert.equal(repo.calls[0].nextStatus, "confirmed");
  assert.equal(repo.calls[0].updatedAt.toISOString(), now.toISOString());
  assert.equal(result.status, "confirmed");
});

test("rechaza identidad ausente y campos de autorización enviados por el cliente", async () => {
  const repo = repository();
  await assert.rejects(
    updateOrderStatus(input, undefined, repo, now),
    (error) => error instanceof UpdateOrderStatusError && error.code === "unauthenticated"
  );
  await assert.rejects(
    updateOrderStatus({ ...input, role: "owner" }, "demo-staff", repo, now),
    (error) => error instanceof UpdateOrderStatusError && error.code === "invalid-argument"
  );
  assert.equal(repo.calls.length, 0);
});

test("rechaza estados, IDs y requestId inválidos", async () => {
  for (const invalid of [
    { ...input, nextStatus: "paid" },
    { ...input, orderId: "../pedido" },
    { ...input, requestId: "repetible" }
  ]) {
    await assert.rejects(
      updateOrderStatus(invalid, "demo-owner", repository(), now),
      (error) => error instanceof UpdateOrderStatusError && error.code === "invalid-argument"
    );
  }
});
