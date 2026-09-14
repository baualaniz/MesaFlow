import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";
import {
  assessFirestoreDatabases,
  readRemoteFirestoreDatabases,
  selectFirestoreEnvironments,
  validateFirestorePolicy
} from "./lib/firestore-config.mjs";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(import.meta.url);

try {
  const environments = selectFirestoreEnvironments(process.argv.slice(2));
  const rc = JSON.parse(await readFile(new URL("../.firebaserc", import.meta.url), "utf8"));
  const projects = validateFirebaseProjects(rc);
  const policy = JSON.parse(await readFile(new URL("../firebase/firestore-policy.json", import.meta.url), "utf8"));
  validateFirestorePolicy(policy);
  for (const name of ["FIREBASE_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "FIRESTORE_EMULATOR_HOST", "FIRESTORE_URL"]) {
    if (process.env[name]) throw new Error(`No uses ${name} para este chequeo. Abrí una terminal con la sesión normal de Firebase CLI.`);
  }

  const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
  const { requireAuth } = require("firebase-tools/lib/requireAuth");
  const { Client } = require("firebase-tools/lib/apiv2");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero ejecutá npm.cmd run firebase:login.");
  const options = { project: projects[environments[0]], projectRoot: root, nonInteractive: true, ...account };
  await requireAuth(options, true);
  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", auth: true });

  for (const environment of environments) {
    console.log(`\nFirestore ${environment}: ${projects[environment]} (solo lectura)`);
    try {
      const remote = await readRemoteFirestoreDatabases(client, projects[environment]);
      const result = assessFirestoreDatabases(remote, policy);
      for (const check of result.checks) console.log(`[${check.ok ? "OK" : "PENDIENTE"}] ${check.name}`);
      if (!result.ok) process.exitCode = 1;
    } catch (error) {
      const status = error.status ?? error.context?.response?.statusCode ?? error.context?.response?.status;
      console.error(`No se encontró una base verificable${Number.isInteger(status) ? ` (HTTP ${status})` : ""}. Creala desde Firebase Console con las opciones documentadas.`);
      process.exitCode = 1;
    }
  }
  console.log("\nEste comando no crea bases, documentos, índices ni reglas.");
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND") console.error("Faltan dependencias: ejecutá npm.cmd ci --ignore-scripts.");
  else if (["EPERM", "EACCES"].includes(error.code)) console.error("No se puede leer la sesión Firebase CLI desde este entorno. Ejecutá el chequeo en tu PowerShell habitual.");
  else console.error(error.message?.startsWith("La política") || error.message?.startsWith("Usá") || error.message?.startsWith("Primero") || error.message?.startsWith("No uses")
    ? error.message : "No se pudo preparar el chequeo Firestore. Revisá configuración, conexión y sesión Firebase CLI.");
  process.exitCode = 1;
}
