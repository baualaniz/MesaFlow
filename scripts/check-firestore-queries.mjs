import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";
import {
  buildDevelopmentQuerySmoke,
  selectIndexEnvironment,
  validateFirestoreIndexes
} from "./lib/firestore-indexes.mjs";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(import.meta.url);

try {
  const environment = selectIndexEnvironment(process.argv.slice(2));
  const [rc, config, manifest] = await Promise.all([
    readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../firestore.indexes.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../firebase/query-plans.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  validateFirestoreIndexes(config, manifest);
  const projects = validateFirebaseProjects(rc);
  for (const name of ["FIREBASE_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "FIRESTORE_EMULATOR_HOST"]) {
    if (process.env[name]) throw new Error(`No uses ${name} para este chequeo.`);
  }

  const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
  const { requireAuth } = require("firebase-tools/lib/requireAuth");
  const { Client } = require("firebase-tools/lib/apiv2");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero ejecutá npm.cmd run firebase:login.");
  const projectId = projects[environment];
  const options = { project: projectId, projectRoot: root, nonInteractive: true, ...account };
  await requireAuth(options, true);
  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", auth: true });
  const requestOptions = {
    headers: { "x-goog-user-project": projectId },
    ignoreQuotaProject: true,
    timeout: 15000,
    redirect: "error"
  };
  const endpoint = `/v1/projects/${projectId}/databases/${manifest.databaseId}` +
    "/documents/establishments/mesa-flow-demo:runQuery";

  for (const smoke of buildDevelopmentQuerySmoke()) {
    const response = await client.post(endpoint, { structuredQuery: smoke.structuredQuery }, requestOptions);
    const documents = Array.isArray(response.body)
      ? response.body.filter(({ document }) => Boolean(document))
      : [];
    assert.ok(documents.length > 0, `${smoke.planId} no devolvió el fixture esperado.`);
    console.log(`[OK] ${smoke.planId}: ${documents.length} resultado(s)`);
  }
  console.log("Consultas cloud dev aprobadas en mesa-flow-demo; operación solo lectura.");
} catch (error) {
  console.error(error.message ?? "No se pudieron comprobar las consultas en desarrollo.");
  process.exitCode = 1;
}
