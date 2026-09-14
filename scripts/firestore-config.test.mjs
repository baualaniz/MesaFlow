import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assessFirestoreDatabases,
  readRemoteFirestoreDatabases,
  selectFirestoreEnvironments,
  validateFirestorePolicy,
  validateFirestoreSchema
} from "./lib/firestore-config.mjs";
import {
  FIRESTORE_DATABASE_ID,
  FIRESTORE_LOCATION_ID,
  TENANT_COLLECTIONS,
  assertDocumentId,
  establishmentConverter,
  participantDocumentPath,
  tenantDocumentPath
} from "../packages/contracts/src/firestore.mjs";

const policy = JSON.parse(await readFile(new URL("../firebase/firestore-policy.json", import.meta.url)));
const schema = JSON.parse(await readFile(new URL("../firebase/schema/firestore-schema.json", import.meta.url)));
const timestamp = Object.freeze({ seconds: 1, nanoseconds: 0 });

test("la política fija base default Standard nativa en São Paulo", () => {
  assert.equal(validateFirestorePolicy(policy), policy);
  assert.equal(FIRESTORE_DATABASE_ID, policy.databaseId);
  assert.equal(FIRESTORE_LOCATION_ID, policy.locationId);
});

test("el manifiesto contiene todas las rutas canónicas", () => {
  assert.equal(validateFirestoreSchema(schema), schema);
  assert.equal(schema.rootCollections.length, 4);
  assert.equal(schema.tenantCollections.length, 13);
});

test("las rutas siempre quedan bajo el tenant indicado", () => {
  assert.equal(
    tenantDocumentPath("restaurantA", TENANT_COLLECTIONS.products, "productA"),
    "establishments/restaurantA/products/productA"
  );
  assert.equal(
    participantDocumentPath("restaurantA", "sessionA", "userA"),
    "establishments/restaurantA/tableSessions/sessionA/participants/userA"
  );
});

test("rechaza IDs vacíos, rutas inyectadas y colecciones desconocidas", () => {
  for (const id of ["", ".", "..", "other/tenant", "__reserved__"]) {
    assert.throws(() => assertDocumentId(id), /no es un ID/);
  }
  assert.throws(() => tenantDocumentPath("restaurantA", "unknown", "docA"), /desconocida/);
});

test("converter valida y normaliza un establecimiento", () => {
  const value = {
    name: "  Mesa Demo  ", slug: "mesa-demo", timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS", active: true, createdAt: timestamp, updatedAt: timestamp
  };
  const converted = establishmentConverter.toFirestore(value);
  assert.equal(converted.name, "Mesa Demo");
  assert.equal(establishmentConverter.fromFirestore({ data: () => converted }).slug, "mesa-demo");
  assert.throws(() => establishmentConverter.toFirestore({ ...value, currency: "ars" }), /currency/);
  assert.throws(() => establishmentConverter.toFirestore({ ...value, extra: true }), /campos/);
});

test("evalúa existencia, región, modo y edición", () => {
  const valid = assessFirestoreDatabases({ databases: [{
    name: "projects/demo/databases/(default)", locationId: "southamerica-east1",
    type: "FIRESTORE_NATIVE", edition: "STANDARD"
  }] }, policy);
  assert.equal(valid.ok, true);
  const invalid = assessFirestoreDatabases({ databases: [{
    name: "projects/demo/databases/(default)", locationId: "us-central1",
    type: "DATASTORE_MODE", edition: "ENTERPRISE"
  }] }, policy);
  assert.equal(invalid.ok, false);
});

test("la lectura remota usa solamente GET sobre el proyecto validado", async () => {
  const calls = [];
  const client = { get: async (...args) => { calls.push(args); return { body: { databases: [] } }; } };
  assert.deepEqual(await readRemoteFirestoreDatabases(client, "mesaflow-desarrollo"), { databases: [] });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/v1/projects/mesaflow-desarrollo/databases");
  await assert.rejects(() => readRemoteFirestoreDatabases(client, "INVALID"), /ID de proyecto/);
});

test("selección de ambientes es explícita", () => {
  assert.deepEqual(selectFirestoreEnvironments(["all"]), ["dev", "prod"]);
  assert.deepEqual(selectFirestoreEnvironments(["dev"]), ["dev"]);
  assert.throws(() => selectFirestoreEnvironments([]), /Usá/);
  assert.throws(() => selectFirestoreEnvironments(["production"]), /Usá/);
});
