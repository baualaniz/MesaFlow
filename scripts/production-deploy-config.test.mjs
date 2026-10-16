import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertProductionStaticReady,
  PRODUCTION_CONFIRMATION_PHRASE,
  validateProductionDeployConfig
} from "./lib/production-deploy-config.mjs";

const [policy, rc, hostingPolicy, buildHostingSource] = await Promise.all([
  readFile(new URL("../firebase/production-deploy-policy.json", import.meta.url), "utf8")
    .then(JSON.parse),
  readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../firebase/hosting-policy.json", import.meta.url), "utf8")
    .then(JSON.parse),
  readFile(new URL("./build-hosting.mjs", import.meta.url), "utf8")
]);

test("la política productiva queda fijada a su proyecto y targets", () => {
  const result = validateProductionDeployConfig(policy, rc, hostingPolicy);
  assert.equal(result.projectId, "mesaflow-produccion");
  assert.equal(result.sitesStatus, "sites-created-targets-configured");
  assert.equal(result.functionsStatus, "blocked-no-user-consent");
  assert.equal(result.webhookStatus, "blocked-requires-functions-and-secrets");
});

test("rechaza mezclar targets de desarrollo en producción", () => {
  const crossed = structuredClone(rc);
  crossed.targets["mesaflow-produccion"].hosting.admin = ["mesaflow-desarrollo-admin"];
  assert.throws(() => validateProductionDeployConfig(policy, crossed, hostingPolicy));
});

test("bloquea el deploy mientras falten sitios, App Check o dominios", () => {
  const pendingSites = structuredClone(policy);
  pendingSites.hosting.sitesStatus = "pending-admin-and-landing";
  assert.throws(() => assertProductionStaticReady({
    policy: pendingSites,
    projectConfirmation: "mesaflow-produccion",
    releaseConfirmation: PRODUCTION_CONFIRMATION_PHRASE,
    siteKey: "public-key"
  }), /sitios Hosting/u);

  const ready = structuredClone(policy);
  ready.appCheck.registrationStatus = "pending-user-console";
  assert.throws(() => assertProductionStaticReady({
    policy: ready,
    projectConfirmation: "mesaflow-produccion",
    releaseConfirmation: PRODUCTION_CONFIRMATION_PHRASE,
    siteKey: "public-key"
  }), /App Check/u);
  ready.appCheck.registrationStatus = "configured-in-firebase-console";
  ready.authentication.domainsStatus = "pending-user-console";
  assert.throws(() => assertProductionStaticReady({
    policy: ready,
    projectConfirmation: "mesaflow-produccion",
    releaseConfirmation: PRODUCTION_CONFIRMATION_PHRASE,
    siteKey: "public-key"
  }), /dominios/iu);
});

test("exige doble confirmación y clave productiva aunque la consola esté lista", () => {
  const ready = structuredClone(policy);
  ready.hosting.sitesStatus = "sites-created-targets-configured";
  ready.appCheck.registrationStatus = "configured-in-firebase-console";
  ready.authentication.domainsStatus = "configured-in-firebase-console";
  const base = { policy: ready, siteKey: "public-key" };
  assert.throws(() => assertProductionStaticReady({
    ...base,
    projectConfirmation: "mesaflow-desarrollo",
    releaseConfirmation: PRODUCTION_CONFIRMATION_PHRASE
  }), /confirmación/iu);
  assert.throws(() => assertProductionStaticReady({
    ...base,
    projectConfirmation: "mesaflow-produccion",
    releaseConfirmation: "PUBLICAR"
  }), /release/u);
  assert.throws(() => assertProductionStaticReady({
    ...base,
    projectConfirmation: "mesaflow-produccion",
    releaseConfirmation: PRODUCTION_CONFIRMATION_PHRASE,
    siteKey: ""
  }), /MESAFLOW_RECAPTCHA/iu);
  assert.equal(assertProductionStaticReady({
    ...base,
    projectConfirmation: "mesaflow-produccion",
    releaseConfirmation: PRODUCTION_CONFIRMATION_PHRASE
  }), true);
});

test("el build productivo usa configuración y URLs exclusivas de producción", () => {
  assert.match(buildHostingSource, /requestedEnvironment === "prod"/u);
  assert.match(buildHostingSource, /https:\/\/mesaflow-produccion\.web\.app/u);
  assert.match(buildHostingSource, /https:\/\/mesaflow-produccion-admin\.web\.app/u);
  assert.match(buildHostingSource, /https:\/\/mesaflow-produccion-landing\.web\.app/u);
  assert.match(buildHostingSource, /MESAFLOW_ENV=\$\{buildMode\}/u);
});
