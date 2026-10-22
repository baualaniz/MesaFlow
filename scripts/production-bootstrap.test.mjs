import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  productionBootstrapDocuments,
  productionBootstrapWrites,
  validateProductionBootstrap
} from "./lib/production-bootstrap.mjs";

const example = await readFile(
  new URL("../firebase/bootstrap-production.example.json", import.meta.url),
  "utf8"
).then(JSON.parse);
const valid = structuredClone(example);
valid.owner.uid = "firebase-auth-owner-uid";

test("el alta inicial queda limitada al proyecto productivo", () => {
  assert.equal(validateProductionBootstrap(valid).establishmentId, "mi-restaurante");
  assert.throws(() => validateProductionBootstrap({
    ...valid,
    projectId: "mesaflow-desarrollo"
  }), /exclusivamente/u);
});

test("crea solo los siete documentos mínimos y una membresía owner", () => {
  const documents = productionBootstrapDocuments(
    valid,
    new Date("2026-10-22T12:00:00.000Z")
  );
  assert.equal(documents.length, 7);
  assert.deepEqual(documents.map(({ path }) => path), [
    "users/firebase-auth-owner-uid",
    "establishmentSlugs/mi-restaurante",
    "establishments/mi-restaurante",
    "establishments/mi-restaurante/members/firebase-auth-owner-uid",
    "establishments/mi-restaurante/settings/public",
    "establishments/mi-restaurante/settings/private",
    "establishments/mi-restaurante/auditLogs/production-bootstrap"
  ]);
});

test("el commit atómico rechaza sobrescribir documentos existentes", () => {
  const writes = productionBootstrapWrites(valid);
  assert.equal(writes.length, 7);
  assert.ok(writes.every(({ currentDocument }) => currentDocument.exists === false));
});

test("rechaza placeholders, slugs cruzados y monedas no previstas", () => {
  assert.throws(() => validateProductionBootstrap(example), /UID/u);
  assert.throws(() => validateProductionBootstrap({
    ...valid,
    establishment: { ...valid.establishment, slug: "otro-restaurante" }
  }), /coincidir/u);
  assert.throws(() => validateProductionBootstrap({
    ...valid,
    establishment: { ...valid.establishment, currency: "USD" }
  }), /ARS/u);
});
