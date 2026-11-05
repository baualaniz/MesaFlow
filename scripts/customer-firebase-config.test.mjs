import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateCustomerFirebaseConfig } from "./lib/customer-firebase-config.mjs";

const config = JSON.parse(await readFile(
  new URL("../apps/customer/firebase.json", import.meta.url),
  "utf8"
));
const projects = { dev: "mesaflow-desarrollo", prod: "mesaflow-produccion" };

test("FlutterFire separa Web/Android de desarrollo y producción", () => {
  const result = validateCustomerFirebaseConfig(config, projects);
  assert.equal(result.devProjectId, projects.dev);
  assert.equal(result.prodProjectId, projects.prod);
  assert.equal(new Set(result.appIds).size, 4);
});

test("rechaza proyectos cruzados y apps Web repetidas", () => {
  const crossed = structuredClone(config);
  crossed.flutter.platforms.dart["lib/src/firebase/firebase_options_dev.dart"].projectId = projects.prod;
  assert.throws(() => validateCustomerFirebaseConfig(crossed, projects), /cruzada/);

  const repeated = structuredClone(config);
  repeated.flutter.platforms.dart["lib/src/firebase/firebase_options_prod.dart"].configurations.web =
    repeated.flutter.platforms.dart["lib/src/firebase/firebase_options_dev.dart"].configurations.web;
  assert.throws(() => validateCustomerFirebaseConfig(repeated, projects), /distintas/);
});

test("rechaza plataformas o archivos adicionales", () => {
  const ios = structuredClone(config);
  ios.flutter.platforms.dart["lib/src/firebase/firebase_options_dev.dart"].configurations.ios =
    "1:123456789:ios:0123456789abcdef";
  assert.throws(() => validateCustomerFirebaseConfig(ios, projects), /inválida/);

  const extra = structuredClone(config);
  extra.flutter.platforms.dart["lib/firebase_options.dart"] = structuredClone(
    extra.flutter.platforms.dart["lib/src/firebase/firebase_options_dev.dart"]
  );
  assert.throws(() => validateCustomerFirebaseConfig(extra, projects), /solamente/);
});
