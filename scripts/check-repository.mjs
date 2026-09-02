import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";
import { validateEmulatorConfig } from "./lib/emulator-config.mjs";

const root = process.cwd();

const requiredPaths = [
  ".editorconfig",
  ".env.example",
  ".firebaserc",
  "firebase.json",
  "firestore.rules",
  "firestore.indexes.json",
  ".gitattributes",
  ".gitignore",
  "CONTRIBUTING.md",
  "README.md",
  "SECURITY.md",
  "apps/customer",
  "apps/admin",
  "apps/landing",
  "docs/architecture.md",
  "docs/master-plan.md",
  "docs/product-spec.md",
  "firebase/seeds",
  "firebase/tests",
  "functions",
  "packages/contracts",
  "package.json",
  "scripts/check-environment.ps1"
];

const ignoredDirectories = new Set([
  ".dart_tool",
  ".firebase",
  ".git",
  "build",
  "coverage",
  "dist",
  "node_modules"
]);

const forbiddenFilePatterns = [
  { pattern: /^\.env(?:\..+)?$/i, allowed: /^\.env\.example$/i },
  { pattern: /service-account.*\.json$/i },
  { pattern: /\.(?:key|pem)$/i }
];

async function assertRequiredPaths() {
  const missing = [];

  for (const relativePath of requiredPaths) {
    try {
      await access(path.join(root, relativePath), constants.F_OK);
    } catch {
      missing.push(relativePath);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Faltan rutas obligatorias:\n- ${missing.join("\n- ")}`);
  }
}

async function assertPackageMetadata() {
  const packagePath = path.join(root, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const expectedWorkspaces = [
    "apps/admin",
    "apps/landing",
    "functions",
    "packages/*"
  ];

  if (packageJson.private !== true) {
    throw new Error("El package raíz debe mantener private=true.");
  }

  for (const workspace of expectedWorkspaces) {
    if (!packageJson.workspaces?.includes(workspace)) {
      throw new Error(`Falta el workspace obligatorio: ${workspace}`);
    }
  }
}

async function findForbiddenFiles(directory, relativeDirectory = "") {
  const violations = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        violations.push(...(await findForbiddenFiles(absolutePath, relativePath)));
      }
      continue;
    }

    const forbidden = forbiddenFilePatterns.some(({ pattern, allowed }) =>
      pattern.test(entry.name) && !(allowed?.test(entry.name) ?? false)
    );

    if (forbidden) {
      violations.push(relativePath);
    }
  }

  return violations;
}

try {
  await assertRequiredPaths();
  await assertPackageMetadata();

  const firebaseConfig = JSON.parse(await readFile(path.join(root, ".firebaserc"), "utf8"));
  const firebaseProjects = validateFirebaseProjects(firebaseConfig);
  validateEmulatorConfig(JSON.parse(await readFile(path.join(root, "firebase.json"), "utf8")));

  const forbiddenFiles = await findForbiddenFiles(root);
  if (forbiddenFiles.length > 0) {
    throw new Error(
      `Se detectaron posibles secretos o archivos locales:\n- ${forbiddenFiles.join("\n- ")}`
    );
  }

  console.log("[OK] Estructura canónica del monorepo");
  console.log("[OK] Metadatos y workspaces npm");
  console.log(`[OK] Firebase: dev=${firebaseProjects.dev}, prod=${firebaseProjects.prod}`);
  console.log("[OK] Proyecto predeterminado: desarrollo (validación local)");
  console.log("[OK] Emuladores limitados a loopback");
  console.log("[OK] No se detectaron nombres de archivos secretos");
  console.log("Repositorio MesaFlow válido.");
} catch (error) {
  console.error("Repositorio MesaFlow inválido.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
