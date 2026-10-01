import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";
import {
  assessRemoteIndexes,
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
  const { FirestoreApi } = require("firebase-tools/lib/firestore/api");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero ejecutá npm.cmd run firebase:login.");
  const projectId = projects[environment];
  const options = { project: projectId, projectRoot: root, nonInteractive: true, ...account };
  await requireAuth(options, true);
  const api = new FirestoreApi();
  const remote = await api.listIndexes(projectId, manifest.databaseId);
  const result = assessRemoteIndexes(remote, config, manifest);

  console.log(`Índices Firestore dev: ${projectId} (solo lectura)`);
  for (const check of result.checks) {
    const state = check.ready ? "OK" : check.deployed ? "CREANDO" : "FALTA";
    console.log(`[${state}] ${check.collectionGroup}: ${check.fields}`);
  }
  if (!result.ok) process.exitCode = 1;
  console.log("Este comando no crea, modifica ni elimina índices.");
} catch (error) {
  if (["EPERM", "EACCES"].includes(error.code)) {
    console.error("No se puede leer la sesión Firebase CLI desde este entorno.");
  } else {
    console.error(error.message ?? "No se pudo comprobar el estado remoto de los índices.");
  }
  process.exitCode = 1;
}
