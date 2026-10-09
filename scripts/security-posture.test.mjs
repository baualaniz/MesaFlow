import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const policy = JSON.parse(await read("firebase/security-policy.json"));
const firebaseConfig = JSON.parse(await read("firebase.json"));
const packageManifest = JSON.parse(await read("package.json"));

async function sourceFiles(relativeDirectory, extensions) {
  const directory = new URL(relativeDirectory, root);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relative = `${relativeDirectory}${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(`${relative}/`, extensions);
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [relative] : [];
  }));
  return nested.flat();
}

test("la política de seguridad declara App Check, CSP, logs y dependencias", () => {
  assert.equal(policy.schemaVersion, 1);
  assert.equal(policy.appCheck.requiredOutsideEmulator, true);
  assert.equal(policy.frontend.contentSecurityPolicyRequired, true);
  assert.deepEqual(policy.logging.allowedInternalFields, ["errorName"]);
  assert.equal(policy.dependencies.productionVulnerabilitiesAllowed, 0);
  assert.deepEqual(
    policy.dependencies.acceptedDevelopmentAdvisories.map(({ id }) => id),
    ["GHSA-vfj7-8cjw-p6xm"]
  );
});

test("todas las callables usan el control común de App Check", async () => {
  const files = (await sourceFiles("functions/src/", ["-callable.ts"]));
  assert.equal(files.length, 9);
  for (const file of files) {
    const source = await read(file);
    assert.match(source, /CALLABLE_SECURITY_OPTIONS/u, file);
    assert.doesNotMatch(source, /enforceAppCheck\s*:\s*false/u, file);
  }
});

test("los errores de callables no se escriben como objetos completos", async () => {
  const files = await sourceFiles("functions/src/", ["-callable.ts"]);
  for (const file of files) {
    const source = await read(file);
    assert.doesNotMatch(source, /console\.error/u, file);
    assert.match(source, /logInternalError/u, file);
  }
  const security = await read("functions/src/security.ts");
  assert.match(security, /safeErrorDetails\(error\)/u);
  assert.doesNotMatch(security, /error\.message|error\.stack/u);
});

test("los frontends no contienen sinks ejecutables de HTML o JavaScript", async () => {
  const files = (await Promise.all([
    sourceFiles("apps/admin/src/", [".ts", ".tsx"]),
    sourceFiles("apps/customer/lib/", [".dart"]),
    sourceFiles("apps/landing/src/", [".astro", ".ts"])
  ])).flat();
  const forbidden = [
    /dangerouslySetInnerHTML/u,
    /\.innerHTML\s*=/u,
    /insertAdjacentHTML/u,
    /document\.write/u,
    /\beval\s*\(/u,
    /new\s+Function\s*\(/u,
    /javascript\s*:/iu
  ];
  for (const file of files) {
    const source = await read(file);
    for (const pattern of forbidden) assert.doesNotMatch(source, pattern, file);
  }
  const layout = await read("apps/landing/src/layouts/BaseLayout.astro");
  assert.match(layout, /replaceAll\("<", "\\\\u003c"\)/u);
  const hostingBuild = await read("scripts/build-hosting.mjs");
  assert.match(hostingBuild, /"--csp"/u);
  assert.match(hostingBuild, /"--no-web-resources-cdn"/u);
  const customerManifest = await read("apps/customer/pubspec.yaml");
  assert.match(customerManifest, /family: Roboto[\s\S]*assets\/fonts\/Roboto-Regular\.ttf/u);
});

test("cada sitio publica una CSP sin comodín global", () => {
  for (const site of firebaseConfig.hosting) {
    const universal = site.headers.find(({ regex }) => regex === ".*");
    const csp = universal.headers.find(({ key }) => key === "Content-Security-Policy")?.value;
    assert.equal(typeof csp, "string", site.target);
    for (const directive of ["default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'"]) {
      assert.match(csp, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"), site.target);
    }
    assert.doesNotMatch(csp, /default-src\s+\*/u, site.target);
    if (site.target !== "landing") assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/u);
  }
});

test("los endpoints HTTP públicos rechazan CORS y validan su método", async () => {
  const [index, health, webhook] = await Promise.all([
    read("functions/src/index.ts"),
    read("functions/src/health.ts"),
    read("functions/src/mercado-pago-webhook.ts")
  ]);
  assert.match(index, /cors:\s*false/u);
  assert.match(health, /request\.method !== "GET" && request\.method !== "HEAD"/u);
  assert.match(webhook, /cors:\s*false/u);
  assert.match(webhook, /request\.method !== "POST"/u);
  assert.match(webhook, /WebhookSignatureValidator\.validate/u);
});

test("el riesgo aceptado queda limitado a Firebase CLI de desarrollo", () => {
  assert.equal(packageManifest.devDependencies["firebase-tools"], "15.33.0");
  assert.equal(packageManifest.dependencies?.["firebase-tools"], undefined);
  const accepted = policy.dependencies.acceptedDevelopmentAdvisories[0];
  assert.equal(accepted.scope, "local-development-only");
  assert.deepEqual(accepted.path, ["firebase-tools", "chokidar", "braces"]);
});

test("Firestore y Storage terminan en denegación por defecto", async () => {
  const [firestore, storage] = await Promise.all([read("firestore.rules"), read("storage.rules")]);
  assert.match(firestore, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/u);
  assert.match(storage, /match \/\{allPaths=\*\*\}[\s\S]*allow read, write: if false;/u);
});
