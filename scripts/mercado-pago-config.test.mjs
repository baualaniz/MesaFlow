import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  readLocalTestAccessToken,
  validateMercadoPagoPolicy,
  validateTestSellerIdentity
} from "./lib/mercado-pago-config.mjs";

const read = (relativeUrl) => readFile(new URL(relativeUrl, import.meta.url), "utf8");
const policy = JSON.parse(await read("../firebase/mercado-pago-policy.json"));
const secretsPolicy = JSON.parse(await read("../firebase/secrets-policy.json"));
const fakeToken = `APP${"_USR-"}${"x".repeat(48)}`;

test("fija Checkout Pro de prueba para Argentina sin producción ni tarjeta real", () => {
  const result = validateMercadoPagoPolicy(policy, secretsPolicy);
  assert.equal(result.checkoutProduct, "checkout_pro");
  assert.equal(result.checkoutApi, "preferences");
  assert.equal(result.credentialMode, "test");
  assert.equal(result.productionEnabled, false);
  assert.equal(result.requiresRealCard, false);
});

test("el token queda limitado al secreto backend ya declarado", () => {
  assert.equal(policy.accessTokenSecret, "MERCADO_PAGO_ACCESS_TOKEN");
  assert.ok(secretsPolicy.secretManagerKeys.includes(policy.accessTokenSecret));
  assert.ok(
    secretsPolicy.futureFunctionBindings.createPaymentPreference.includes(
      policy.accessTokenSecret
    )
  );
});

test("acepta un Access Token local de prueba sin exponerlo", () => {
  const token = readLocalTestAccessToken(
    `MERCADO_PAGO_ACCESS_TOKEN=${fakeToken}\nMERCADO_PAGO_WEBHOOK_SECRET=REEMPLAZAR_SOLO_LOCAL`,
    policy
  );
  assert.equal(token, fakeToken);
});

test("rechaza placeholders, producción accidental y archivos inseguros", () => {
  assert.throws(() => readLocalTestAccessToken(
    "MERCADO_PAGO_ACCESS_TOKEN=REEMPLAZAR_SOLO_LOCAL_MP_ACCESS_TOKEN",
    policy
  ));
  const production = { ...policy, productionEnabled: true };
  assert.throws(() => validateMercadoPagoPolicy(production, secretsPolicy));
  const unsafe = { ...policy, localSecretsFile: ".env.example" };
  assert.throws(() => validateMercadoPagoPolicy(unsafe, secretsPolicy));
});

test("la identidad remota debe ser un test user del sitio argentino", () => {
  assert.deepEqual(
    validateTestSellerIdentity({ site_id: "MLA", tags: ["normal", "test_user"] }, policy),
    { testUser: true, siteId: "MLA" }
  );
  assert.throws(() => validateTestSellerIdentity({ site_id: "MLA", tags: ["normal"] }, policy));
  assert.throws(() => validateTestSellerIdentity({ site_id: "MLB", tags: ["test_user"] }, policy));
});
