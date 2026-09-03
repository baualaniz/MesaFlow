import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assessAuthConfig, readRemoteAuthConfig, selectAuthEnvironments, validateAuthPolicy } from "./lib/auth-config.mjs";

const policy = JSON.parse(await readFile(new URL("../firebase/auth-policy.json", import.meta.url), "utf8"));
function validConfig(environment = "dev") {
  return {
    signIn: { email: { enabled: true, passwordRequired: true }, anonymous: { enabled: true } },
    emailPrivacyConfig: { enableImprovedEmailPrivacy: true },
    passwordPolicyConfig: {
      passwordPolicyEnforcementState: "ENFORCE",
      passwordPolicyVersions: [{ customStrengthOptions: { minPasswordLength: 12 } }]
    },
    authorizedDomains: environment === "dev" ? ["localhost", "mesaflow-desarrollo.firebaseapp.com"] : ["mesaflow-produccion.firebaseapp.com"]
  };
}

test("política local válida y resultados correctos para dev/prod", () => {
  validateAuthPolicy(policy);
  for (const env of ["dev", "prod"]) assert.equal(assessAuthConfig(validConfig(env), env, policy).ok, true);
});
test("no permite debilitar mínimo, privacidad ni localhost en producción", () => {
  for (const invalid of [
    { ...policy, minimumPasswordLength: 6 },
    { ...policy, emailEnumerationProtection: false },
    { ...policy, environments: { ...policy.environments, prod: { allowLocalhost: true } } }
  ]) assert.throws(() => validateAuthPolicy(invalid));
});
test("solo admite destinos explícitos dev, prod o all", () => {
  assert.deepEqual(selectAuthEnvironments(["all"]), ["dev", "prod"]);
  for (const args of [[], ["otro"], ["prod", "--write"]]) assert.throws(() => selectAuthEnvironments(args));
});
test("configuración vacía no aparenta estar lista", () => {
  assert.equal(assessAuthConfig({}, "dev", policy).ok, false);
  assert.throws(() => assessAuthConfig(null, "dev", policy));
});
test("detecta proveedores faltantes o email link habilitado", () => {
  for (const change of [
    { email: { enabled: false, passwordRequired: true } },
    { email: { enabled: true, passwordRequired: false } },
    { anonymous: { enabled: false } },
    { phoneNumber: { enabled: true } },
    { allowDuplicateEmails: true }
  ]) {
    const config = validConfig();
    config.signIn = { ...config.signIn, ...change };
    assert.equal(assessAuthConfig(config, "dev", policy).ok, false);
  }
});
test("detecta privacidad ausente y contraseñas sin política exigida", () => {
  for (const key of ["emailPrivacyConfig", "passwordPolicyConfig"]) {
    const config = validConfig();
    delete config[key];
    assert.equal(assessAuthConfig(config, "dev", policy).ok, false);
  }
  const config = validConfig();
  config.passwordPolicyConfig.passwordPolicyVersions[0].customStrengthOptions.minPasswordLength = 6;
  assert.equal(assessAuthConfig(config, "dev", policy).ok, false);
});
test("localhost solo se acepta en desarrollo; rechaza URLs y comodines", () => {
  for (const domain of ["localhost", "127.0.0.1", "LOCALHOST", "::1", "http://sitio.test", "*.sitio.test"]) {
    const config = validConfig("prod");
    config.authorizedDomains.push(domain);
    assert.equal(assessAuthConfig(config, "prod", policy).ok, false);
  }
  assert.equal(assessAuthConfig(validConfig("prod"), "dev", policy).ok, false);
});
test("el informe no contiene respuesta remota ni posibles secretos", () => {
  const config = { ...validConfig(), notification: { secret: "NO_DEBE_APARECER" } };
  assert.ok(!JSON.stringify(assessAuthConfig(config, "dev", policy)).includes("NO_DEBE_APARECER"));
});
test("el transporte solicita únicamente GET al proyecto validado", async () => {
  const calls = [];
  const client = { get: async (...args) => { calls.push(args); return { body: validConfig() }; } };
  await readRemoteAuthConfig(client, "mesaflow-desarrollo");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/admin/v2/projects/mesaflow-desarrollo/config");
  assert.equal(calls[0][1].redirect, "error");
  await assert.rejects(() => readRemoteAuthConfig(client, "otro/../../proyecto"));
  assert.equal(calls.length, 1);
});
