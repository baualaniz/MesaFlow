import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";
import {
  assertSafeSeedEnvironment,
  buildPresentationWrites,
  validatePresentationSeed
} from "./lib/presentation-seed.mjs";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const require = createRequire(import.meta.url);

function responseStatus(error) {
  return error?.status ?? error?.context?.response?.statusCode ??
    error?.context?.response?.status;
}

try {
  if (process.argv.length !== 2) {
    throw new Error("Este comando no admite argumentos ni cambios de proyecto.");
  }
  assertSafeSeedEnvironment(process.env);

  const [rc, seed] = await Promise.all([
    readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../firebase/seeds/presentation-dev.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  const projects = validateFirebaseProjects(rc);
  const validation = validatePresentationSeed(seed, projects);
  assert.equal(projects.dev, "mesaflow-desarrollo");
  assert.notEqual(projects.dev, projects.prod);

  const { getProjectDefaultAccount } = require("firebase-tools/lib/auth");
  const { requireAuth } = require("firebase-tools/lib/requireAuth");
  const { Client } = require("firebase-tools/lib/apiv2");
  const account = getProjectDefaultAccount(root);
  if (!account) throw new Error("Primero ejecutá npm.cmd run firebase:login.");
  await requireAuth({
    project: projects.dev,
    projectRoot: root,
    nonInteractive: true,
    ...account
  }, true);

  const client = new Client({ urlPrefix: "https://firestore.googleapis.com", auth: true });
  const documentsPrefix =
    `/v1/projects/${projects.dev}/databases/${seed.databaseId}/documents/`;
  const requestOptions = () => ({
    headers: { "x-goog-user-project": projects.dev },
    ignoreQuotaProject: true,
    timeout: 20000,
    redirect: "error"
  });

  async function readDocument(relativePath) {
    try {
      return await client.get(`${documentsPrefix}${relativePath}`, requestOptions());
    } catch (error) {
      if (responseStatus(error) === 404) return null;
      throw error;
    }
  }

  const before = await Promise.all(validation.paths.map(readDocument));
  const existingCount = before.filter(Boolean).length;
  if (existingCount > 0) {
    const auditIndex = validation.paths.indexOf(seed.auditPath);
    const auditAction = before[auditIndex]?.body?.fields?.action?.stringValue;
    if (existingCount === validation.documentCount && auditAction === "demo.seed.created") {
      console.log(`[OK] El dataset ya existe completo en ${projects.dev}; no se sobrescribió nada.`);
    } else {
      throw new Error(
        `Carga cancelada: ${existingCount} de ${validation.documentCount} rutas ya existen ` +
        "sin un seed completo verificable. No se sobrescribió ningún documento."
      );
    }
  } else {
    const now = new Date().toISOString();
    const writes = buildPresentationWrites(seed, projects, now);
    await client.post(
      `/v1/projects/${projects.dev}/databases/${seed.databaseId}/documents:commit`,
      { writes },
      requestOptions()
    );
    console.log(`[OK] ${writes.length} documentos demo cargados atómicamente en ${projects.dev}.`);
  }

  const after = await Promise.all(validation.paths.map(readDocument));
  assert.equal(after.filter(Boolean).length, validation.documentCount);
  const audit = after[validation.paths.indexOf(seed.auditPath)];
  assert.equal(audit.body.fields.action.stringValue, "demo.seed.created");
  console.log("[OK] Colecciones raíz: users, establishmentSlugs y establishments");
  console.log("[OK] Subcolecciones de mesa-flow-demo verificadas para la presentación");
  console.log("Producción no fue contactada y no se escribieron datos personales.");
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND") {
    console.error("Faltan dependencias: ejecutá npm.cmd ci --ignore-scripts.");
  } else if (["EPERM", "EACCES"].includes(error.code)) {
    console.error("No se puede leer la sesión Firebase CLI desde este entorno.");
  } else {
    console.error(error instanceof Error ? error.message : "Falló el seed de presentación.");
  }
  process.exitCode = 1;
}
