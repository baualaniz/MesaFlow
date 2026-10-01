import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import {
  OrderRepository,
  ProductRepository
} from "../functions/lib/data/tenant-repository.js";
import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const suffix = randomUUID();
const tenantId = `stage13-${suffix}`;
const app = initializeApp({ projectId: DEMO_PROJECT_ID }, `stage13-${suffix}`);
const firestore = getFirestore(app);
const products = new ProductRepository(firestore, tenantId);
const orders = new OrderRepository(firestore, tenantId);
const productIds = ["published-2", "published-1", "unavailable", "other-category"]
  .map((name) => `${name}-${suffix}`);
const orderIds = ["created", "preparing", "ready"].map((name) => `${name}-${suffix}`);

function product(id, categoryId, sortOrder, available = true) {
  return {
    establishmentId: tenantId,
    categoryId,
    name: `Producto ${id}`,
    description: "Fixture temporal para consultas de la Etapa 13.",
    priceMinor: 10000,
    currency: "ARS",
    imagePath: null,
    available,
    active: true,
    sortOrder,
    createdAt: "2026-09-17T12:00:00.000Z",
    updatedAt: "2026-09-17T12:00:00.000Z"
  };
}

function order(status, sessionId, createdAt) {
  return {
    establishmentId: tenantId,
    sessionId,
    tableId: "mesa-consultas",
    customerUid: "guest-consultas",
    status,
    items: [{
      productId: "producto-consultas",
      name: "Producto consultas",
      unitPriceMinor: 10000,
      quantity: 1,
      lineTotalMinor: 10000,
      notes: null
    }],
    subtotalMinor: 10000,
    totalMinor: 10000,
    currency: "ARS",
    notes: null,
    statusTimestamps: { [status]: createdAt },
    createdAt,
    updatedAt: createdAt
  };
}

try {
  await Promise.all([
    products.create(productIds[0], product(productIds[0], "principales", 2)),
    products.create(productIds[1], product(productIds[1], "principales", 1)),
    products.create(productIds[2], product(productIds[2], "principales", 0, false)),
    products.create(productIds[3], product(productIds[3], "postres", 1)),
    orders.create(orderIds[0], order("created", "sesion-a", "2026-09-17T12:00:00.000Z")),
    orders.create(orderIds[1], order("preparing", "sesion-a", "2026-09-17T12:01:00.000Z")),
    orders.create(orderIds[2], order("ready", "sesion-b", "2026-09-17T12:02:00.000Z"))
  ]);

  assert.deepEqual(
    (await products.listPublishedByCategory("principales")).map(({ id }) => id),
    [productIds[1], productIds[0]]
  );
  assert.deepEqual(
    (await orders.listOperational(["created", "preparing"])).map(({ id }) => id),
    [orderIds[0], orderIds[1]]
  );
  assert.deepEqual(
    (await orders.listBySession("sesion-a")).map(({ id }) => id),
    [orderIds[0], orderIds[1]]
  );
  assert.deepEqual(
    (await orders.listRecentByTable("mesa-consultas", 2)).map(({ id }) => id),
    [orderIds[2], orderIds[1]]
  );
  await assert.rejects(orders.listOperational([]), /estados únicos/);
  await assert.rejects(orders.listRecentByTable("mesa-consultas", 0), /entre 1 y 100/);
  console.log("[OK] Consultas Firestore: filtros, orden, límites y scope de tenant");
} catch (error) {
  console.error(`Prueba de consultas Firestore falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    await Promise.all([
      ...productIds.map((id) => products.remove(id)),
      ...orderIds.map((id) => orders.remove(id))
    ]);
    await firestore.terminate();
    await deleteApp(app);
  } catch (error) {
    console.error(`Limpieza de consultas Firestore falló: ${error.message}`);
    process.exitCode = 1;
  }
}
