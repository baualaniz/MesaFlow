import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertSafeDemoSeedEnvironment,
  buildDemoDocuments,
  materializeDemoValue,
  validateDemoSeed
} from "./lib/demo-seed.mjs";

const seed = JSON.parse(await readFile(
  new URL("../firebase/seeds/demo-emulator.json", import.meta.url), "utf8"
));

test("el dataset demo tiene cuatro roles, diez mesas y dieciocho productos", () => {
  const result = validateDemoSeed(seed);
  assert.equal(result.counts.users, 4);
  assert.equal(result.counts.members, 4);
  assert.equal(result.counts.tables, 10);
  assert.equal(result.counts.products, 18);
  assert.ok(result.counts.orders >= 3);
  assert.ok(result.counts.payments >= 2);
});

test("genera rutas únicas bajo el establecimiento demo", () => {
  const documents = buildDemoDocuments(seed);
  assert.equal(documents.length, validateDemoSeed(seed).documentCount);
  assert.equal(new Set(documents.map(({ path }) => path)).size, documents.length);
  assert.ok(documents.some(({ path }) => path.endsWith("/members/demo-owner")));
  assert.equal(documents.filter(({ path }) => path.includes("/products/")).length, 18);
  assert.equal(documents.filter(({ path }) => path.includes("/tables/")).length, 10);
});

test("rechaza producción, otro proyecto y un destino que no sea emulador", () => {
  for (const target of [
    { environment: "prod", projectId: "mesaflow-produccion", databaseId: "(default)" },
    { environment: "emulator", projectId: "mesaflow-desarrollo", databaseId: "(default)" },
    { environment: "dev", projectId: "demo-mesaflow", databaseId: "(default)" }
  ]) {
    assert.throws(() => validateDemoSeed({ ...structuredClone(seed), target }), /solo puede apuntar/);
  }
});

test("rechaza IDs duplicados y referencias cruzadas inválidas", () => {
  const duplicate = structuredClone(seed);
  duplicate.products.push(structuredClone(duplicate.products[0]));
  assert.throws(() => validateDemoSeed(duplicate), /duplicado/);
  const missingCategory = structuredClone(seed);
  missingCategory.products[0].categoryId = "no-existe";
  assert.throws(() => validateDemoSeed(missingCategory), /Producto demo inválido/);
  const missingSession = structuredClone(seed);
  missingSession.payments[0].sessionId = "no-existe";
  assert.throws(() => validateDemoSeed(missingSession), /Pago demo inválido/);
  const mismatchedTable = structuredClone(seed);
  mismatchedTable.orders[0].tableId = "mesa-02";
  assert.throws(() => validateDemoSeed(mismatchedTable), /no corresponde/);
});

test("rechaza totales manipulados y mesas incompletas", () => {
  const manipulatedOrder = structuredClone(seed);
  manipulatedOrder.orders[0].totalMinor += 1;
  assert.throws(() => validateDemoSeed(manipulatedOrder), /Totales inconsistentes/);
  const missingTable = structuredClone(seed);
  missingTable.tables.pop();
  assert.throws(() => validateDemoSeed(missingTable), /no conserva/);
  const manipulatedMetric = structuredClone(seed);
  manipulatedMetric.dailyMetrics[0].salesMinor += 1;
  assert.throws(() => validateDemoSeed(manipulatedMetric), /métricas demo/);
});

test("materializa timestamps sin aceptar marcadores inválidos", () => {
  const marker = { nested: [{ $timestamp: "2026-09-17T12:00:00.000Z" }] };
  assert.deepEqual(materializeDemoValue(marker, (value) => `timestamp:${value}`), {
    nested: ["timestamp:2026-09-17T12:00:00.000Z"]
  });
  assert.throws(
    () => materializeDemoValue({ $timestamp: "mañana" }, (value) => value),
    /Timestamp inválido/
  );
});

test("el entorno seguro admite solo el proyecto demo y loopback fijo", () => {
  assert.deepEqual(assertSafeDemoSeedEnvironment({}), {
    projectId: "demo-mesaflow",
    firestoreHost: "127.0.0.1:8080",
    authHost: "127.0.0.1:9099"
  });
  assert.doesNotThrow(() => assertSafeDemoSeedEnvironment({
    GCLOUD_PROJECT: "demo-mesaflow",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080"
  }));
  for (const environment of [
    { FIREBASE_TOKEN: "not-a-real-token" },
    { GOOGLE_APPLICATION_CREDENTIALS: "account.json" },
    { GCLOUD_PROJECT: "mesaflow-produccion" },
    { FIRESTORE_EMULATOR_HOST: "firestore.googleapis.com:443" },
    { FIREBASE_AUTH_EMULATOR_HOST: "identitytoolkit.googleapis.com:443" }
  ]) assert.throws(() => assertSafeDemoSeedEnvironment(environment));
});
