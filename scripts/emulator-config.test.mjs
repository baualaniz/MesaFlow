import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertLocalEmulatorEnvironment, buildEmulatorArgs, DEMO_PROJECT_ID,
  EMULATOR_PORTS, validateEmulatorConfig
} from "./lib/emulator-config.mjs";

const config = JSON.parse(await readFile(new URL("../firebase.json", import.meta.url), "utf8"));
const safeEnv = {
  GCLOUD_PROJECT: DEMO_PROJECT_ID,
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099"
};

test("configuración real usa loopback y puertos locales distintos", () => {
  validateEmulatorConfig(config);
  assert.equal(new Set(Object.values(EMULATOR_PORTS)).size, 5);
});
test("rechaza reglas omitidas, exposición en LAN y puertos incorrectos", () => {
  const variants = [structuredClone(config), structuredClone(config), structuredClone(config)];
  delete variants[0].firestore.rules;
  variants[1].emulators.firestore.host = "0.0.0.0";
  variants[2].emulators.auth.port = 8080;
  for (const invalid of variants) assert.throws(() => validateEmulatorConfig(invalid));
});
test("rechaza UI desactivada o múltiples proyectos", () => {
  for (const name of ["ui", "singleProjectMode"]) {
    const invalid = structuredClone(config);
    if (name === "ui") invalid.emulators.ui.enabled = false;
    else invalid.emulators.singleProjectMode = false;
    assert.throws(() => validateEmulatorConfig(invalid));
  }
});
test("comandos start y test fijan el proyecto demo", () => {
  for (const mode of ["start", "test"]) {
    const args = buildEmulatorArgs(mode);
    assert.equal(args[args.indexOf("--project") + 1], DEMO_PROJECT_ID);
    assert.equal(args[args.indexOf("--only") + 1], "auth,firestore");
  }
});
test("no acepta override de proyecto ni modos de despliegue", () => {
  assert.throws(() => buildEmulatorArgs("deploy"));
  assert.throws(() => buildEmulatorArgs("start", ["--project", "prod"]));
});
test("smoke test acepta únicamente su entorno local", () => {
  assertLocalEmulatorEnvironment(safeEnv);
  for (const change of [
    { GCLOUD_PROJECT: "mesaflow-produccion" },
    { GCLOUD_PROJECT: "mesaflow-desarrollo" },
    { GOOGLE_CLOUD_PROJECT: "mesaflow-produccion" },
    { FIRESTORE_EMULATOR_HOST: "firestore.googleapis.com" },
    { FIREBASE_AUTH_EMULATOR_HOST: undefined }
  ]) assert.throws(() => assertLocalEmulatorEnvironment({ ...safeEnv, ...change }));
});
