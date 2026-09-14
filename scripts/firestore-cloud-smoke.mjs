import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";
import { validateFirestorePolicy } from "./lib/firestore-config.mjs";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(import.meta.url);
let client;
let documentPath;
let created = false;

try {
  if (process.argv.slice(2).join(" ") !== "dev") {
    throw new Error("Esta prueba exige el argumento dev y jamás acepta prod.");
  }
  for (const name of ["FIREBASE_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_CLOUD_PROJECT", "GCLOUD_PROJECT", "FIREBASE_CONFIG", "FIRESTORE_EMULATOR_HOST", "FIRESTORE_URL"]) {
    if (process.env[name]) throw new Error(`No uses ${name} para esta prueba.`);
  }
  const rc = JSON.parse(await readFile(new URL("../.firebaserc", import.meta.url), "utf8"));
  const projects = validateFirebaseProjects(rc);
  const policy = JSON.parse(await readFile(new URL("../firebase/firestore-policy.json", import.meta.url), "utf8"));
  validateFirestorePolicy(policy);
  assert.equal(rc.projects.default, projects.dev, "El proyecto predeterminado debe ser desarrollo");
  assert.notEqual(projects.dev, projects.prod, "Desarrollo y producción deben ser distintos");

  const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
  const { requireAuth } = require("firebase-tools/lib/requireAuth");
  const { Client } = require("firebase-tools/lib/apiv2");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero ejecutá npm.cmd run firebase:login.");
  await requireAuth({ project: projects.dev, projectRoot: root, nonInteractive: true, ...account }, true);
  client = new Client({ urlPrefix: "https://firestore.googleapis.com", auth: true });
  const fixtureId = randomUUID();
  documentPath = `/v1/projects/${projects.dev}/databases/${policy.databaseId}/documents/mesaFlowStageChecks/${fixtureId}`;
  const requestOptions = () => ({
    headers: { "x-goog-user-project": projects.dev },
    ignoreQuotaProject: true,
    timeout: 15000,
    redirect: "error"
  });
  const fixture = { fields: {
    purpose: { stringValue: "stage-06-cloud-smoke" },
    schemaVersion: { integerValue: "1" },
    fixtureId: { stringValue: fixtureId }
  } };
  await client.patch(documentPath, fixture, requestOptions());
  created = true;
  const read = await client.get(documentPath, requestOptions());
  assert.equal(read.body?.fields?.purpose?.stringValue, "stage-06-cloud-smoke");
  assert.equal(read.body?.fields?.fixtureId?.stringValue, fixtureId);
  console.log("[OK] Firestore dev real: escritura y lectura temporal");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falló la prueba remota de Firestore.");
  process.exitCode = 1;
} finally {
  if (created && client && documentPath) {
    try {
      await client.delete(documentPath, { timeout: 15000, redirect: "error" });
      console.log("[OK] Documento temporal eliminado");
    } catch {
      console.error("No se pudo eliminar el documento temporal; revisá mesaFlowStageChecks en desarrollo.");
      process.exitCode = 1;
    }
  }
}

if (!process.exitCode) console.log("Smoke test Firestore cloud dev aprobado; producción no fue contactada.");
