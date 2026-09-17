import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertSafeSeedEnvironment,
  buildPresentationWrites,
  encodeFirestoreValue,
  validatePresentationSeed
} from "./lib/presentation-seed.mjs";

const seed = JSON.parse(await readFile(
  new URL("../firebase/seeds/presentation-dev.json", import.meta.url), "utf8"
));
const projects = { dev: "mesaflow-desarrollo", prod: "mesaflow-produccion" };

test("el dataset solo declara desarrollo y documentos únicos", () => {
  const result = validatePresentationSeed(seed, projects);
  assert.equal(result.documentCount, seed.documents.length);
  assert.ok(result.documentCount >= 20);
});

test("rechaza producción, proyecto desconocido y auditoría ausente", () => {
  const production = structuredClone(seed);
  production.projectId = projects.prod;
  assert.throws(() => validatePresentationSeed(production, projects));
  const unknown = structuredClone(seed);
  unknown.projectId = "otro-proyecto";
  assert.throws(() => validatePresentationSeed(unknown, projects));
  const noAudit = structuredClone(seed);
  noAudit.documents = noAudit.documents.filter(({ path }) => path !== noAudit.auditPath);
  assert.throws(() => validatePresentationSeed(noAudit, projects));
});

test("rechaza rutas duplicadas o inválidas", () => {
  const duplicate = structuredClone(seed);
  duplicate.documents.push(structuredClone(duplicate.documents[0]));
  assert.throws(() => validatePresentationSeed(duplicate, projects));
  const invalidPath = structuredClone(seed);
  invalidPath.documents[0].path = "users/../prod";
  assert.throws(() => validatePresentationSeed(invalidPath, projects));
});

test("convierte tipos y timestamps al protocolo Firestore", () => {
  const now = "2026-09-17T12:00:00.000Z";
  assert.deepEqual(encodeFirestoreValue(42, now), { integerValue: "42" });
  assert.deepEqual(encodeFirestoreValue({ $timestamp: "now" }, now), { timestampValue: now });
  const writes = buildPresentationWrites(seed, projects, now);
  assert.equal(writes.length, seed.documents.length);
  assert.match(writes[0].update.name, /^projects\/mesaflow-desarrollo\/databases/);
});

test("rechaza credenciales, overrides y emuladores heredados", () => {
  assertSafeSeedEnvironment({});
  for (const change of [
    { FIREBASE_TOKEN: "token" },
    { GOOGLE_APPLICATION_CREDENTIALS: "account.json" },
    { GCLOUD_PROJECT: projects.prod },
    { FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" }
  ]) assert.throws(() => assertSafeSeedEnvironment(change));
});
