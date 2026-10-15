import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertStaticDeploymentReady,
  assertTrackedWorktreeClean,
  DEVELOPMENT_PROJECT_ID,
  FREE_DEPLOYMENT_COMPONENTS,
  validateDeployConfig
} from "./lib/deploy-config.mjs";

const [policy, rc, hostingPolicy, buildHostingSource] = await Promise.all([
  readFile(new URL("../firebase/deploy-policy.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../firebase/hosting-policy.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("./build-hosting.mjs", import.meta.url), "utf8")
]);

test("el deploy gratuito queda fijado solo a desarrollo", () => {
  const result = validateDeployConfig(policy, rc, hostingPolicy);
  assert.equal(result.projectId, DEVELOPMENT_PROJECT_ID);
  assert.deepEqual(result.components, [...FREE_DEPLOYMENT_COMPONENTS]);
});

test("exige un commit reproducible pero ignora archivos personales no versionados", () => {
  assert.equal(assertTrackedWorktreeClean(""), true);
  assert.throws(
    () => assertTrackedWorktreeClean(" M firebase.json\n"),
    /commit/u
  );
});

test("rechaza targets cruzados con producción", () => {
  const crossed = structuredClone(rc);
  crossed.targets[DEVELOPMENT_PROJECT_ID].hosting.customer = ["mesaflow-produccion"];
  assert.throws(() => validateDeployConfig(policy, crossed, hostingPolicy));
});

test("rechaza incluir Functions en el deploy gratuito", () => {
  const unsafe = structuredClone(policy);
  unsafe.freeDeployment.push("functions");
  assert.throws(() => validateDeployConfig(unsafe, rc, hostingPolicy));
});

test("bloquea la publicación hasta completar App Check y confirmar el proyecto", () => {
  const pendingAppCheck = structuredClone(policy);
  pendingAppCheck.appCheck.registrationStatus = "pending-user-console";
  assert.throws(() => assertStaticDeploymentReady({
    policy: pendingAppCheck,
    confirmation: DEVELOPMENT_PROJECT_ID,
    siteKey: "public-key"
  }), /App Check/u);
  const ready = structuredClone(policy);
  ready.authentication.domainsStatus = "pending-user-console";
  assert.throws(() => assertStaticDeploymentReady({
    policy: ready,
    confirmation: DEVELOPMENT_PROJECT_ID,
    siteKey: "public-key"
  }), /dominios/iu);
  ready.authentication.domainsStatus = "configured-in-firebase-console";
  assert.throws(() => assertStaticDeploymentReady({
    policy: ready,
    confirmation: "mesaflow-produccion",
    siteKey: "public-key"
  }), /confirmación/iu);
  assert.throws(() => assertStaticDeploymentReady({
    policy: ready,
    confirmation: DEVELOPMENT_PROJECT_ID,
    siteKey: ""
  }), /MESAFLOW_RECAPTCHA/iu);
});

test("el build cloud enlaza la landing con los sitios publicados y renueva la clave compilada", () => {
  assert.match(buildHostingSource, /PUBLIC_CUSTOMER_URL/u);
  assert.match(buildHostingSource, /https:\/\/mesaflow-desarrollo\.web\.app/u);
  assert.match(buildHostingSource, /PUBLIC_ADMIN_URL/u);
  assert.match(buildHostingSource, /https:\/\/mesaflow-desarrollo-admin\.web\.app/u);
  assert.match(buildHostingSource, /createHash\("sha256"\)/u);
  assert.match(buildHostingSource, /appCheckKeyFingerprint/u);
});
