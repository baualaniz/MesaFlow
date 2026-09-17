import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";
import { validateEmulatorConfig } from "./lib/emulator-config.mjs";
import { validateAuthPolicy } from "./lib/auth-config.mjs";
import { validateFirestorePolicy, validateFirestoreSchema } from "./lib/firestore-config.mjs";
import { validateStoragePolicy } from "./lib/storage-config.mjs";
import { validateSecretsPolicy } from "./lib/secrets-config.mjs";

const root = process.cwd();
const execFileAsync = promisify(execFile);

const requiredPaths = [
  ".editorconfig",
  ".env.example",
  ".firebaserc",
  "firebase.json",
  "firestore.rules",
  "firestore.indexes.json",
  "storage.rules",
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
  "firebase/auth-policy.json",
  "firebase/firestore-policy.json",
  "firebase/storage-policy.json",
  "firebase/secrets-policy.json",
  "firebase/schema/firestore-schema.json",
  "firebase/tests",
  "functions/package.json",
  "functions/tsconfig.json",
  "functions/eslint.config.mjs",
  "functions/src/index.ts",
  "functions/src/health.ts",
  "functions/test/health.test.mjs",
  "functions/src/config/runtime.ts",
  "functions/.env.example",
  "functions/.secret.local.example",
  "packages/contracts",
  "package.json",
  "scripts/check-environment.ps1"
];

const forbiddenFilePatterns = [
  { pattern: /^\.env(?:\..+)?$/i, allowed: /^\.env\.example$/i },
  { pattern: /^\.secret(?:\..+)?$/i, allowed: /^\.secret\.local\.example$/i },
  { pattern: /^\.runtimeconfig\.json$/i },
  { pattern: /service[-_]?account.*\.json$/i },
  { pattern: /serviceAccount.*\.json$/i },
  { pattern: /^application_default_credentials\.json$/i },
  { pattern: /\.(?:key|pem)$/i }
];

const forbiddenContentPatterns = [
  { label: "clave privada", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { label: "token Mercado Pago", pattern: /\b(?:APP_USR|TEST)-[A-Za-z0-9-]{24,}\b/u },
  { label: "token Meta/WhatsApp", pattern: /\bEAA[A-Za-z0-9]{60,}\b/u },
  { label: "token GitHub", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u },
  { label: "token Slack", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u }
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

async function listRepositoryFiles() {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
  return stdout.split("\0").filter(Boolean);
}

function findForbiddenFiles(files) {
  const violations = [];
  for (const relativePath of files) {
    const name = path.basename(relativePath);
    const forbidden = forbiddenFilePatterns.some(({ pattern, allowed }) =>
      pattern.test(name) && !(allowed?.test(name) ?? false)
    );
    if (forbidden) violations.push(relativePath);
  }
  return violations;
}

async function findSensitiveContent(files) {
  const violations = [];
  for (const relativePath of files) {
    const buffer = await readFile(path.join(root, relativePath));
    if (buffer.length > 2 * 1024 * 1024 || buffer.includes(0)) continue;
    const content = buffer.toString("utf8");
    for (const { label, pattern } of forbiddenContentPatterns) {
      if (pattern.test(content)) violations.push(`${relativePath} (${label})`);
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
  validateAuthPolicy(JSON.parse(await readFile(path.join(root, "firebase/auth-policy.json"), "utf8")));
  validateFirestorePolicy(JSON.parse(await readFile(path.join(root, "firebase/firestore-policy.json"), "utf8")));
  validateFirestoreSchema(JSON.parse(await readFile(path.join(root, "firebase/schema/firestore-schema.json"), "utf8")));
  validateStoragePolicy(JSON.parse(await readFile(path.join(root, "firebase/storage-policy.json"), "utf8")));
  validateSecretsPolicy(JSON.parse(await readFile(path.join(root, "firebase/secrets-policy.json"), "utf8")));

  const repositoryFiles = await listRepositoryFiles();
  const forbiddenFiles = findForbiddenFiles(repositoryFiles);
  if (forbiddenFiles.length > 0) {
    throw new Error(
      `Se detectaron posibles secretos o archivos locales:\n- ${forbiddenFiles.join("\n- ")}`
    );
  }
  const sensitiveContent = await findSensitiveContent(repositoryFiles);
  if (sensitiveContent.length > 0) {
    throw new Error(`Se detectaron valores con forma de secreto:\n- ${sensitiveContent.join("\n- ")}`);
  }

  console.log("[OK] Estructura canónica del monorepo");
  console.log("[OK] Metadatos y workspaces npm");
  console.log(`[OK] Firebase: dev=${firebaseProjects.dev}, prod=${firebaseProjects.prod}`);
  console.log("[OK] Proyecto predeterminado: desarrollo (validación local)");
  console.log("[OK] Emuladores limitados a loopback");
  console.log("[OK] Política y esquema raíz de Firestore");
  console.log("[OK] Política y reglas base de Storage");
  console.log("[OK] Política de configuración pública y secretos");
  console.log("[OK] No se detectaron archivos ni valores sensibles versionables");
  console.log("Repositorio MesaFlow válido.");
} catch (error) {
  console.error("Repositorio MesaFlow inválido.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
