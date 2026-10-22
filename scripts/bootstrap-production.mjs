import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  productionBootstrapWrites,
  validateProductionBootstrap
} from "./lib/production-bootstrap.mjs";

const PROJECT_ID = "mesaflow-produccion";
const CONFIRMATION = "CREAR-ESTABLECIMIENTO-PRODUCCION";
const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(import.meta.url);

function argument(name) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

try {
  if (argument("confirm") !== PROJECT_ID || argument("release") !== CONFIRMATION) {
    throw new Error(
      `Usá --confirm=${PROJECT_ID} --release=${CONFIRMATION}.`
    );
  }
  const configPath = path.join(root, "firebase", "bootstrap-production.local.json");
  const ignored = spawnSync("git", ["check-ignore", "--quiet", configPath], { cwd: root });
  if (ignored.status !== 0) {
    throw new Error("El archivo local del alta no está protegido por .gitignore.");
  }
  const status = spawnSync(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    { cwd: root, encoding: "utf8" }
  );
  if (status.status !== 0 || status.stdout.trim() !== "") {
    throw new Error("Guardá primero todos los cambios versionados en Git.");
  }
  const config = await readFile(configPath, "utf8").then(JSON.parse).catch(() => {
    throw new Error(
      "Falta firebase/bootstrap-production.local.json; copiá el ejemplo y completalo."
    );
  });
  const validated = validateProductionBootstrap(config);

  const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
  const { requireAuth } = require("firebase-tools/lib/requireAuth");
  const { Client } = require("firebase-tools/lib/apiv2");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero iniciá sesión con firebase.cmd login.");
  await requireAuth({
    project: PROJECT_ID,
    projectRoot: root,
    nonInteractive: true,
    ...account
  }, true);

  const identity = new Client({
    urlPrefix: "https://identitytoolkit.googleapis.com",
    auth: true
  });
  const lookup = await identity.post(
    `/v1/projects/${PROJECT_ID}/accounts:lookup`,
    { localId: [validated.uid] },
    { timeout: 20_000 }
  );
  const authUser = lookup.body?.users?.[0];
  if (authUser?.localId !== validated.uid ||
      String(authUser.email ?? "").toLowerCase() !== validated.ownerEmail) {
    throw new Error("El UID y correo no coinciden con un usuario de Authentication productivo.");
  }

  const firestore = new Client({ urlPrefix: "https://firestore.googleapis.com", auth: true });
  await firestore.post(
    `/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`,
    { writes: productionBootstrapWrites(config) },
    {
      headers: { "x-goog-user-project": PROJECT_ID },
      ignoreQuotaProject: true,
      timeout: 20_000,
      redirect: "error"
    }
  );
  console.log(`[OK] Establecimiento ${validated.establishmentId} creado atómicamente.`);
  console.log("[OK] Propietario, membresía, configuración y auditoría inicial verificadas.");
  console.log("Pagos, pedidos, asistencia y WhatsApp permanecen apagados hasta configurarlos en el panel.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
