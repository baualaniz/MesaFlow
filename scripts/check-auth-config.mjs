import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";
import { assessAuthConfig, readRemoteAuthConfig, selectAuthEnvironments, validateAuthPolicy } from "./lib/auth-config.mjs";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(import.meta.url);

try {
  const environments = selectAuthEnvironments(process.argv.slice(2));
  const rc = JSON.parse(await readFile(new URL("../.firebaserc", import.meta.url), "utf8"));
  const projects = validateFirebaseProjects(rc);
  const policy = JSON.parse(await readFile(new URL("../firebase/auth-policy.json", import.meta.url), "utf8"));
  validateAuthPolicy(policy);
  for (const name of ["FIREBASE_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS", "FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_IDENTITY_URL", "FIREBASE_AUTH_MANAGEMENT_URL", "FIREBASE_AUTH_URL"]) {
    if (process.env[name]) throw new Error(`No uses ${name} para este chequeo. Abrí una terminal con la sesión normal de Firebase CLI.`);
  }

  // Pinned firebase-tools internals reuse the user's existing CLI login.
  // No credential files are copied; no raw API responses or tokens are logged.
  const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
  const { requireAuth } = require("firebase-tools/lib/requireAuth");
  const { Client } = require("firebase-tools/lib/apiv2");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero ejecutá npm.cmd run firebase:login.");
  const options = { project: projects[environments[0]], projectRoot: root, nonInteractive: true, ...account };
  await requireAuth(options, true);
  const client = new Client({ urlPrefix: "https://identitytoolkit.googleapis.com", auth: true });

  for (const environment of environments) {
    console.log(`\nAuthentication ${environment}: ${projects[environment]} (solo lectura)`);
    try {
      const remote = await readRemoteAuthConfig(client, projects[environment]);
      const result = assessAuthConfig(remote, environment, policy);
      for (const check of result.checks) console.log(`[${check.ok ? "OK" : "PENDIENTE"}] ${check.name}`);
      if (!result.ok) process.exitCode = 1;
    } catch (error) {
      const status = error.status ?? error.context?.response?.statusCode ?? error.context?.response?.status;
      console.error(`No se pudo verificar este proyecto${Number.isInteger(status) ? ` (HTTP ${status})` : ""}. Revisá login, permisos, conexión e inicialización de Authentication en Firebase Console.`);
      process.exitCode = 1;
    }
  }
  console.log("\nNo se crearon usuarios, no se enviaron correos y no se modificó la configuración.");
  console.log("Plantillas, otros proveedores y dominios personalizados requieren revisión manual en Console.");
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND") console.error("Faltan dependencias: ejecutá npm.cmd ci --ignore-scripts.");
  else if (["EPERM", "EACCES"].includes(error.code)) console.error("No se puede leer la sesión Firebase CLI desde este entorno. Ejecutá el chequeo en tu PowerShell habitual.");
  else console.error(error.message?.startsWith("La política") || error.message?.startsWith("Usá") || error.message?.startsWith("Primero") || error.message?.startsWith("No uses")
    ? error.message : "No se pudo preparar el chequeo Auth. Revisá los archivos de configuración, el acceso a Internet y la sesión de Firebase CLI.");
  process.exitCode = 1;
}
