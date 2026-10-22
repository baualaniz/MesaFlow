import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertFullProductionConfirmation,
  BILLING_CONFIRMATION,
  FULL_PRODUCTION_CONFIRMATION,
  parseDotEnv,
  PAYMENTS_CONFIRMATION,
  validateFullProductionPolicy,
  validateProductionPaymentPolicy,
  validateProductionRuntimeParameters
} from "./lib/full-production-deploy-config.mjs";

const policy = await readFile(
  new URL("../firebase/full-production-deploy-policy.json", import.meta.url),
  "utf8"
).then(JSON.parse);
const paymentPolicy = await readFile(
  new URL("../firebase/mercado-pago-production-policy.json", import.meta.url),
  "utf8"
).then(JSON.parse);

const validParameters = Object.freeze({
  MERCADO_PAGO_ENVIRONMENT: "production",
  WHATSAPP_PHONE_NUMBER_ID: "123456789012345",
  WHATSAPP_GRAPH_API_VERSION: "v23.0",
  WHATSAPP_TEMPLATE_NAME: "mesaflow_asistencia",
  WHATSAPP_TEMPLATE_LANGUAGE: "es_AR",
  CUSTOMER_PUBLIC_BASE_URL: "https://mesaflow-produccion.web.app"
});

test("el despliegue completo queda anclado a producción y 14 Functions", () => {
  const result = validateFullProductionPolicy(policy);
  assert.equal(result.projectId, "mesaflow-produccion");
  assert.equal(result.functionNames.length, 14);
  assert.deepEqual(result.requiredSecrets.sort(), [
    "MERCADO_PAGO_ACCESS_TOKEN",
    "MERCADO_PAGO_WEBHOOK_SECRET",
    "WHATSAPP_ACCESS_TOKEN"
  ].sort());
});

test("la política de pago real usa init_point, live mode y un vendedor piloto", () => {
  assert.equal(validateProductionPaymentPolicy(paymentPolicy), true);
  assert.throws(() => validateProductionPaymentPolicy({
    ...paymentPolicy,
    checkoutUrlField: "sandbox_init_point"
  }), /sandbox/iu);
  assert.throws(() => validateProductionPaymentPolicy({
    ...paymentPolicy,
    merchantModel: "shared_global_token"
  }), /vendedor/u);
});

test("los parámetros productivos impiden sandbox y URLs cruzadas", () => {
  assert.equal(validateProductionRuntimeParameters(validParameters), true);
  assert.throws(() => validateProductionRuntimeParameters({
    ...validParameters,
    MERCADO_PAGO_ENVIRONMENT: "sandbox"
  }), /production/u);
  assert.throws(() => validateProductionRuntimeParameters({
    ...validParameters,
    CUSTOMER_PUBLIC_BASE_URL: "https://mesaflow-desarrollo.web.app"
  }), /productivo/u);
});

test("el parser de parámetros rechaza claves duplicadas", () => {
  assert.deepEqual(parseDotEnv("A=uno\nB=dos\n"), { A: "uno", B: "dos" });
  assert.throws(() => parseDotEnv("A=uno\nA=dos\n"), /duplicado/u);
});

test("el backend productivo exige cuatro confirmaciones independientes", () => {
  const valid = {
    projectConfirmation: "mesaflow-produccion",
    releaseConfirmation: FULL_PRODUCTION_CONFIRMATION,
    billingConfirmation: BILLING_CONFIRMATION,
    paymentsConfirmation: PAYMENTS_CONFIRMATION,
    siteKey: "public-site-key"
  };
  assert.equal(assertFullProductionConfirmation(valid), true);
  for (const key of [
    "projectConfirmation", "releaseConfirmation", "billingConfirmation",
    "paymentsConfirmation", "siteKey"
  ]) {
    assert.throws(() => assertFullProductionConfirmation({ ...valid, [key]: "" }));
  }
});
