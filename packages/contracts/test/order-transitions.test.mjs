import assert from "node:assert/strict";
import test from "node:test";

import {
  availableOrderTransitions,
  canTransitionOrder
} from "../lib/index.js";

function actor(role, permissions, active = true) {
  return { active, role, permissions };
}

test("salón confirma, cancela pedidos nuevos y entrega pedidos listos", () => {
  const staff = actor("staff", ["orders.manage"]);
  assert.deepEqual(availableOrderTransitions("created", staff), ["confirmed", "cancelled"]);
  assert.deepEqual(availableOrderTransitions("ready", staff), ["delivered"]);
});

test("salón no modifica preparación ni cancela confirmados sin permiso explícito", () => {
  const staff = actor("staff", ["orders.manage"]);
  assert.equal(canTransitionOrder("confirmed", "preparing", staff), false);
  assert.equal(canTransitionOrder("confirmed", "cancelled", staff), false);
  assert.equal(canTransitionOrder(
    "confirmed", "cancelled", actor("staff", ["orders.manage", "orders.cancel_confirmed"])
  ), true);
});

test("cocina procesa confirmados pero no confirma ni entrega", () => {
  const kitchen = actor("kitchen", ["orders.prepare"]);
  assert.deepEqual(availableOrderTransitions("confirmed", kitchen), ["preparing"]);
  assert.deepEqual(availableOrderTransitions("preparing", kitchen), ["ready"]);
  assert.deepEqual(availableOrderTransitions("created", kitchen), []);
  assert.deepEqual(availableOrderTransitions("ready", kitchen), []);
});

test("propietario y encargado recorren toda la operación", () => {
  for (const role of ["owner", "manager"]) {
    const administrator = actor(role, ["orders.manage"]);
    assert.equal(canTransitionOrder("created", "confirmed", administrator), true);
    assert.equal(canTransitionOrder("confirmed", "preparing", administrator), true);
    assert.equal(canTransitionOrder("preparing", "ready", administrator), true);
    assert.equal(canTransitionOrder("ready", "delivered", administrator), true);
    assert.equal(canTransitionOrder("delivered", "completed", administrator), true);
  }
});

test("rechaza membresías inactivas, permisos ausentes y saltos inválidos", () => {
  assert.equal(canTransitionOrder("created", "confirmed", actor("owner", ["orders.manage"], false)), false);
  assert.equal(canTransitionOrder("created", "confirmed", actor("owner", [])), false);
  assert.equal(canTransitionOrder("created", "ready", actor("owner", ["orders.manage"])), false);
  assert.equal(canTransitionOrder("completed", "created", actor("owner", ["orders.manage"])), false);
});
