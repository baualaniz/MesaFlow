import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { Timestamp } from "firebase-admin/firestore";

import {
  orderConverter,
  productConverter
} from "../lib/data/firestore-converters.js";
import { assertTenantOwnership } from "../lib/data/tenant-repository.js";

const fixtures = JSON.parse(await readFile(
  new URL("../../packages/contracts/fixtures/domain-fixtures.json", import.meta.url),
  "utf8"
));

function snapshot(data) {
  return { data: () => data };
}

test("converter Product conserva datos y transforma timestamps", () => {
  const stored = productConverter.toFirestore(fixtures.product);
  assert.ok(stored.createdAt instanceof Timestamp);
  assert.ok(stored.updatedAt instanceof Timestamp);
  assert.deepEqual(productConverter.fromFirestore(snapshot(stored)), fixtures.product);
});

test("converter Product rechaza timestamps no nativos y campos desconocidos", () => {
  assert.throws(() => productConverter.fromFirestore(snapshot(fixtures.product)), /Timestamp/);
  assert.throws(() => productConverter.toFirestore({
    ...fixtures.product,
    unexpected: true
  }), /campos/);
});

test("converter Order transforma timestamps raíz y de estados", () => {
  const stored = orderConverter.toFirestore(fixtures.order);
  assert.ok(stored.createdAt instanceof Timestamp);
  assert.ok(stored.statusTimestamps.created instanceof Timestamp);
  assert.deepEqual(orderConverter.fromFirestore(snapshot(stored)), fixtures.order);
});

test("repositorio exige que el documento pertenezca a su tenant", () => {
  assert.equal(
    assertTenantOwnership("mesa-flow-demo", fixtures.product),
    fixtures.product
  );
  assert.throws(
    () => assertTenantOwnership("otro-tenant", fixtures.product),
    /no pertenece/
  );
});
