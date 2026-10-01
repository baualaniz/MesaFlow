import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { ProductRepository } from "../functions/lib/data/tenant-repository.js";
import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const suffix = randomUUID();
const tenantA = `stage12-a-${suffix}`;
const tenantB = `stage12-b-${suffix}`;
const productId = `product-${suffix}`;
const app = initializeApp({ projectId: DEMO_PROJECT_ID }, `stage12-${suffix}`);
const firestore = getFirestore(app);
const repositoryA = new ProductRepository(firestore, tenantA);
const repositoryB = new ProductRepository(firestore, tenantB);
const now = "2026-09-17T12:00:00.000Z";
const product = {
  establishmentId: tenantA,
  categoryId: "principales",
  name: "Producto del emulador",
  description: "Fixture temporal de la Etapa 12.",
  priceMinor: 250000,
  currency: "ARS",
  imagePath: "menu.producto-emulador",
  available: true,
  active: true,
  sortOrder: 1,
  createdAt: now,
  updatedAt: now
};

try {
  await repositoryA.create(productId, product);
  const created = await repositoryA.get(productId);
  assert.deepEqual(created?.data, product);

  assert.equal(
    await repositoryB.get(productId),
    null,
    "Un tenant no debe resolver documentos del mismo ID en otro tenant"
  );
  await assert.rejects(
    repositoryB.create(productId, product),
    /no pertenece al tenant/
  );

  const updated = { ...product, available: false, updatedAt: "2026-09-17T12:05:00.000Z" };
  await repositoryA.replace(productId, updated);
  assert.deepEqual((await repositoryA.get(productId))?.data, updated);
  assert.deepEqual((await repositoryA.list()).map(({ id }) => id), [productId]);

  await repositoryA.remove(productId);
  assert.equal(await repositoryA.get(productId), null);
  console.log("[OK] Repositorios Firestore: CRUD tipado y aislamiento por tenant");
} catch (error) {
  console.error(`Prueba de repositorios Firestore falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    await repositoryA.remove(productId);
    await repositoryB.remove(productId);
    await firestore.terminate();
    await deleteApp(app);
  } catch (error) {
    console.error(`Limpieza de repositorios Firestore falló: ${error.message}`);
    process.exitCode = 1;
  }
}
