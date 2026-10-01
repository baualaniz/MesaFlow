import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import {
  assertSafeDemoSeedEnvironment,
  buildDemoDocuments,
  materializeDemoValue,
  normalizeDemoValue,
  validateDemoSeed
} from "./lib/demo-seed.mjs";

async function applySeed(firestore, documents) {
  const prepared = documents.map(({ path, data }) => ({
    path,
    ref: firestore.doc(path),
    data: materializeDemoValue(data, (value) => Timestamp.fromDate(new Date(value)))
  }));
  const before = await firestore.getAll(...prepared.map(({ ref }) => ref));
  const changed = prepared.filter(({ data }, index) =>
    !before[index].exists || !isDeepStrictEqual(
      normalizeDemoValue(before[index].data()),
      normalizeDemoValue(data)
    )
  );
  if (changed.length > 0) {
    const batch = firestore.batch();
    for (const { ref, data } of changed) batch.set(ref, data);
    await batch.commit();
  }
  const after = await firestore.getAll(...prepared.map(({ ref }) => ref));
  assert.equal(after.every(({ exists }) => exists), true, "El seed no creó todos los documentos.");
  for (let index = 0; index < prepared.length; index += 1) {
    assert.deepEqual(normalizeDemoValue(after[index].data()), normalizeDemoValue(prepared[index].data));
  }
  return { changedCount: changed.length, documentCount: prepared.length };
}

let app;
let firestore;

try {
  if (process.argv.length !== 2) throw new Error("Este comando no admite argumentos.");
  const environment = assertSafeDemoSeedEnvironment(process.env);
  process.env.GCLOUD_PROJECT = environment.projectId;
  process.env.GOOGLE_CLOUD_PROJECT = environment.projectId;
  process.env.FIRESTORE_EMULATOR_HOST = environment.firestoreHost;

  const seed = JSON.parse(await readFile(
    new URL("../firebase/seeds/demo-emulator.json", import.meta.url), "utf8"
  ));
  const validation = validateDemoSeed(seed);
  const documents = buildDemoDocuments(seed);
  app = initializeApp({ projectId: environment.projectId }, "mesaflow-demo-seed");
  firestore = getFirestore(app);

  const first = await applySeed(firestore, documents);
  const second = await applySeed(firestore, documents);
  assert.equal(second.changedCount, 0, "La segunda carga debería ser un no-op idempotente.");
  console.log(
    `[OK] Seed demo local: ${first.documentCount} documentos verificados; ` +
    `${first.changedCount} creados/actualizados en esta ejecución.`
  );
  console.log(
    `[OK] 4 roles, ${validation.counts.tables} mesas, ${validation.counts.products} productos, ` +
    `${validation.counts.orders} pedidos y ${validation.counts.payments} pagos.`
  );
  console.log("[OK] Segunda aplicación sin cambios; desarrollo y producción no fueron contactados.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falló el seed demo local.");
  process.exitCode = 1;
} finally {
  try {
    if (firestore) await firestore.terminate();
    if (app) await deleteApp(app);
  } catch (error) {
    console.error(`No se pudo cerrar el cliente del seed: ${error.message}`);
    process.exitCode = 1;
  }
}
