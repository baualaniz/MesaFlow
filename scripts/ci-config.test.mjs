import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const packageManifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const nodeVersion = (await readFile(new URL("../.nvmrc", import.meta.url), "utf8")).trim();
const javaVersion = (await readFile(new URL("../.java-version", import.meta.url), "utf8")).trim();
const customerManifest = await readFile(new URL("../apps/customer/pubspec.yaml", import.meta.url), "utf8");
const emulatorRunner = await readFile(new URL("./run-emulators.mjs", import.meta.url), "utf8");

test("CI se ejecuta en pull requests, main y disparo manual", () => {
  assert.match(workflow, /^on:\s*$/mu);
  assert.match(workflow, /^  pull_request:\s*$/mu);
  assert.match(workflow, /^  push:[\s\S]*?^    branches: \[main\]$/mu);
  assert.match(workflow, /^  workflow_dispatch:\s*$/mu);
  assert.doesNotMatch(workflow, /pull_request_target|schedule:/u);
});

test("el token de GitHub queda en solo lectura y checkout no conserva credenciales", () => {
  assert.match(workflow, /^permissions:\s*\n  contents: read$/mu);
  assert.doesNotMatch(workflow, /^\s{2,}[a-z-]+: write$/mu);
  assert.equal((workflow.match(/persist-credentials: false/gu) ?? []).length, 2);
});

test("todas las acciones externas están ancladas a commits inmutables", () => {
  const references = [...workflow.matchAll(/^\s*uses:\s*([^\s#]+)/gmu)].map((match) => match[1]);
  assert.equal(references.length, 7);
  for (const reference of references) {
    assert.match(reference, /^[\w-]+\/[\w-]+@[0-9a-f]{40}$/u, reference);
  }
  assert.deepEqual(new Set(references), new Set([
    "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    "actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1",
    "actions/setup-java@de7274f081f381c8f8158605e0321c36c376e2e6",
    "subosito/flutter-action@1a449444c387b1966244ae4d4f8c696479add0b2"
  ]));
});

test("Node, npm, Java y Flutter tienen versiones reproducibles", () => {
  assert.equal(nodeVersion, "24.19.0");
  assert.equal(javaVersion, "21");
  assert.equal(packageManifest.packageManager, "npm@11.17.0");
  assert.match(customerManifest, /^  flutter: 3\.41\.5$/mu);
  assert.equal((workflow.match(/node-version-file: \.nvmrc/gu) ?? []).length, 2);
  assert.equal((workflow.match(/flutter-version-file: apps\/customer\/pubspec\.yaml/gu) ?? []).length, 2);
  assert.match(workflow, /java-version-file: \.java-version/u);
});

test("quality instala desde lockfile y ejecuta los controles locales y online", () => {
  assert.match(workflow, /quality:[\s\S]*?npm ci --ignore-scripts[\s\S]*?npm run check[\s\S]*?npm run security:audit/u);
  assert.equal((workflow.match(/npm install --global npm@11\.17\.0/gu) ?? []).length, 2);
});

test("E2E espera calidad y recorre emuladores con Java y Chrome", () => {
  assert.match(workflow, /e2e:\s*\n\s+name:[^\n]+\n\s+needs: quality/u);
  assert.match(workflow, /actions\/setup-java@[0-9a-f]{40}/u);
  assert.match(workflow, /google-chrome --version/u);
  assert.match(workflow, /npm run test:e2e/u);
  assert.ok(
    emulatorRunner.indexOf('runNpmScript("functions:build")') <
      emulatorRunner.indexOf('runNpmScript("hosting:build")'),
    "los contratos compartidos deben compilar antes del panel"
  );
});

test("los jobs tienen runner fijo, límites y cancelación de ejecuciones obsoletas", () => {
  assert.equal((workflow.match(/runs-on: ubuntu-24\.04/gu) ?? []).length, 2);
  assert.equal((workflow.match(/timeout-minutes:/gu) ?? []).length, 2);
  assert.match(workflow, /cancel-in-progress: true/u);
  assert.match(workflow, /CI: "true"/u);
});

test("CI no usa secretos ni contiene pasos de despliegue", () => {
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./u);
  assert.doesNotMatch(workflow, /firebase\s+deploy|gcloud\s+|--project[= ](?:dev|prod|mesaflow)/u);
});
