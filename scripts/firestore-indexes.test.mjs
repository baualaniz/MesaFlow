import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assessRemoteIndexes,
  buildDevelopmentQuerySmoke,
  selectIndexEnvironment,
  validateFirestoreIndexes,
  validateQueryPlans
} from "./lib/firestore-indexes.mjs";

const [config, manifest] = await Promise.all([
  readFile(new URL("../firestore.indexes.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../firebase/query-plans.json", import.meta.url), "utf8").then(JSON.parse)
]);

test("los ocho planes canónicos tienen un índice compuesto exacto", () => {
  assert.equal(validateQueryPlans(manifest).expectedIndexes.length, 8);
  assert.equal(validateFirestoreIndexes(config, manifest).indexes.length, 8);
});

test("rechaza índices faltantes, duplicados o de alcance global", () => {
  assert.throws(
    () => validateFirestoreIndexes({ ...config, indexes: config.indexes.slice(1) }, manifest),
    /no coinciden/
  );
  assert.throws(
    () => validateFirestoreIndexes({ ...config, indexes: [...config.indexes, config.indexes[0]] }, manifest),
    /no coinciden/
  );
  const global = structuredClone(config);
  global.indexes[0].fields[0].fieldPath = "establishmentId";
  assert.throws(() => validateFirestoreIndexes(global, manifest), /globales/);
});

test("rechaza planes incompletos o con campos mal formados", () => {
  const incomplete = structuredClone(manifest);
  incomplete.plans.pop();
  assert.throws(() => validateQueryPlans(incomplete), /exactamente/);
  const malformed = structuredClone(manifest);
  malformed.plans[0].indexFields[0] = "categoryId sideways";
  assert.throws(() => validateQueryPlans(malformed), /inválido/);
});

test("estado remoto exige que todos los índices existan y estén READY", () => {
  const remote = config.indexes.map((index, position) => ({
    name: `projects/demo/databases/(default)/collectionGroups/${index.collectionGroup}/indexes/${position}`,
    queryScope: index.queryScope,
    fields: [...index.fields, { fieldPath: "__name__", order: "ASCENDING" }],
    state: "READY"
  }));
  assert.equal(assessRemoteIndexes(remote, config, manifest).ok, true);
  remote[0].state = "CREATING";
  assert.equal(assessRemoteIndexes(remote, config, manifest).ok, false);
  assert.equal(assessRemoteIndexes(remote.slice(1), config, manifest).ok, false);
});

test("la comprobación cloud solo acepta desarrollo explícito", () => {
  assert.equal(selectIndexEnvironment(["dev"]), "dev");
  for (const args of [[], ["prod"], ["all"], ["dev", "prod"]]) {
    assert.throws(() => selectIndexEnvironment(args), /solo permite/);
  }
});

test("el smoke remoto cubre los ocho planes dentro del tenant demo", () => {
  const queries = buildDevelopmentQuerySmoke();
  assert.deepEqual(
    new Set(queries.map(({ planId }) => planId)),
    new Set(manifest.plans.map(({ id }) => id))
  );
  for (const { structuredQuery } of queries) {
    assert.equal(structuredQuery.from.length, 1);
    assert.equal(structuredQuery.from[0].allDescendants, undefined);
    assert.ok(structuredQuery.limit <= 5);
  }
});
