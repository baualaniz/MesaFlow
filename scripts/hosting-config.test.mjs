import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { HOSTING_PUBLIC_DIRS, HOSTING_TARGETS, validateHostingConfig } from "./lib/hosting-config.mjs";

const [config, rc, policy] = await Promise.all([
  readFile(new URL("../firebase.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../firebase/hosting-policy.json", import.meta.url), "utf8").then(JSON.parse)
]);

test("declara tres destinos locales coherentes", () => {
  const result = validateHostingConfig(config, rc, policy);
  assert.deepEqual(result.targets, HOSTING_TARGETS);
  assert.equal(result.basePort, 5100);
  assert.deepEqual(
    Object.fromEntries(config.hosting.map(({ target, public: publicDir }) => [target, publicDir])),
    HOSTING_PUBLIC_DIRS
  );
});

test("cliente y panel soportan rutas profundas, landing conserva 404", () => {
  for (const target of ["customer", "admin"]) {
    assert.deepEqual(config.hosting.find((site) => site.target === target).rewrites, [
      { source: "**", destination: "/index.html" }
    ]);
  }
  const landing = config.hosting.find((site) => site.target === "landing");
  assert.equal(landing.rewrites, undefined);
  assert.equal(landing.cleanUrls, true);
});

test("rechaza un target omitido o un directorio cruzado", () => {
  const missing = structuredClone(config);
  missing.hosting.pop();
  assert.throws(() => validateHostingConfig(missing, rc, policy));
  const crossed = structuredClone(config);
  crossed.hosting[0].public = "apps/landing/hosting";
  assert.throws(() => validateHostingConfig(crossed, rc, policy));
});

test("rechaza exposición en LAN, CORS global o backend cloud", () => {
  const lan = structuredClone(config);
  lan.emulators.hosting.host = "0.0.0.0";
  assert.throws(() => validateHostingConfig(lan, rc, policy));
  const cors = structuredClone(config);
  cors.hosting[0].headers[0].headers.push({ key: "Access-Control-Allow-Origin", value: "*" });
  assert.throws(() => validateHostingConfig(cors, rc, policy));
  const cloud = structuredClone(config);
  cloud.hosting[0].rewrites = [{ source: "/api/**", function: "api" }];
  assert.throws(() => validateHostingConfig(cloud, rc, policy));
});

test("rechaza encabezados de seguridad debilitados", () => {
  for (const key of ["X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) {
    const invalid = structuredClone(config);
    const headers = invalid.hosting[0].headers[0].headers;
    headers.splice(headers.findIndex((header) => header.key === key), 1);
    assert.throws(() => validateHostingConfig(invalid, rc, policy));
  }
});

test("targets demo y estado cloud diferido son obligatorios", () => {
  const badRc = structuredClone(rc);
  delete badRc.targets["demo-mesaflow"].hosting.admin;
  assert.throws(() => validateHostingConfig(config, badRc, policy));
  const activeCloud = structuredClone(policy);
  activeCloud.cloudStatus = "configured";
  assert.throws(() => validateHostingConfig(config, rc, activeCloud));
});
