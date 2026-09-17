import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assessStorageBuckets,
  readRemoteStorageBuckets,
  selectStorageEnvironments,
  validateStoragePolicy
} from "./lib/storage-config.mjs";
import {
  STORAGE_MAX_IMAGE_BYTES,
  brandingImagePath,
  imageUploadMetadata,
  productImagePath
} from "../packages/contracts/src/storage.mjs";

const policy = JSON.parse(await readFile(new URL("../firebase/storage-policy.json", import.meta.url)));

test("la política Storage limita tipos, tamaño, rutas y roles", () => {
  assert.equal(validateStoragePolicy(policy), policy);
  assert.equal(STORAGE_MAX_IMAGE_BYTES, policy.maxImageBytes);
});

test("construye rutas de producto y marca dentro del tenant", () => {
  assert.equal(
    productImagePath("restaurantA", "productA", "asset-123", "image/webp"),
    "establishments/restaurantA/products/productA/asset-123.webp"
  );
  assert.equal(
    brandingImagePath("restaurantA", "logo-123", "image/png"),
    "establishments/restaurantA/branding/logo-123.png"
  );
});

test("genera metadata obligatoria para las reglas", () => {
  assert.deepEqual(imageUploadMetadata("restaurantA", "ownerA", "image/jpeg", 128), {
    contentType: "image/jpeg",
    customMetadata: { establishmentId: "restaurantA", uploadedByUid: "ownerA" }
  });
});

test("rechaza tipos, tamaños e IDs inseguros", () => {
  assert.throws(() => imageUploadMetadata("restaurantA", "ownerA", "image/svg+xml", 128), /Tipo/);
  assert.throws(() => imageUploadMetadata("restaurantA", "ownerA", "image/png", 0), /entre/);
  assert.throws(() => imageUploadMetadata("restaurantA", "ownerA", "image/png", STORAGE_MAX_IMAGE_BYTES + 1), /entre/);
  assert.throws(() => productImagePath("restaurantA", "productA", "../escape", "image/png"), /ID/);
});

test("no permite debilitar la política versionada", () => {
  for (const change of [
    { maxImageBytes: 10 * 1024 * 1024 },
    { allowedContentTypes: [...policy.allowedContentTypes, "image/svg+xml"] },
    { writeRoles: [...policy.writeRoles, "staff"] },
    { publicReadScopes: ["products", "branding", "private"] }
  ]) assert.throws(() => validateStoragePolicy({ ...policy, ...change }), /política Storage/);
});

test("evalúa nombre, región y clase del bucket", () => {
  const result = assessStorageBuckets({ items: [{
    name: "mesaflow-desarrollo.firebasestorage.app",
    location: "SOUTHAMERICA-EAST1",
    storageClass: "STANDARD"
  }] }, "mesaflow-desarrollo", policy);
  assert.equal(result.ok, true);
  assert.equal(assessStorageBuckets({ items: [] }, "mesaflow-desarrollo", policy).ok, false);
});

test("la lectura remota usa solamente GET y un proyecto validado", async () => {
  const calls = [];
  const client = { get: async (...args) => { calls.push(args); return { body: { items: [] } }; } };
  assert.deepEqual(await readRemoteStorageBuckets(client, "mesaflow-desarrollo"), { items: [] });
  assert.equal(calls[0][0], "/b");
  assert.equal(calls[0][1].queryParams.project, "mesaflow-desarrollo");
  await assert.rejects(() => readRemoteStorageBuckets(client, "INVALID"), /ID de proyecto/);
});

test("la selección de ambientes es explícita", () => {
  assert.deepEqual(selectStorageEnvironments(["all"]), ["dev", "prod"]);
  assert.deepEqual(selectStorageEnvironments(["dev"]), ["dev"]);
  assert.throws(() => selectStorageEnvironments([]), /Usá/);
  assert.throws(() => selectStorageEnvironments(["production"]), /Usá/);
});
