import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrRecoverPreference,
  handleRequest,
  parsePaymentRequest
} from "../src/index.js";

const validBody = Object.freeze({
  sessionId: "sesion-demo-android",
  tableId: "mesa-01",
  items: [
    { productId: "burger-casa", quantity: 1 },
    { productId: "gaseosa", quantity: 2 }
  ]
});

const env = Object.freeze({
  MERCADO_PAGO_ACCESS_TOKEN: "TEST_TOKEN_REDACTED_123456789",
  CUSTOMER_PUBLIC_BASE_URL: "https://mesaflow-desarrollo.web.app"
});

test("calcula el importe desde el catálogo y rechaza precios del cliente", () => {
  const parsed = parsePaymentRequest(validBody);
  assert.equal(parsed.amountMinor, 1930000);
  assert.throws(
    () => parsePaymentRequest({
      ...validBody,
      items: [{ productId: "burger-casa", quantity: 1, priceMinor: 1 }]
    }),
    /invalid-request/u
  );
  assert.equal(
    parsePaymentRequest({ ...validBody, sessionId: "sesion-academica-01" }).sessionId,
    "sesion-academica-01"
  );
  assert.throws(
    () => parsePaymentRequest({ ...validBody, sessionId: "sesión con espacios" }),
    /invalid-request/u
  );
  assert.throws(
    () => parsePaymentRequest({
      ...validBody,
      items: [{ productId: "producto-inventado", quantity: 1 }]
    }),
    /invalid-request/u
  );
});

test("crea una preferencia sandbox con retornos públicos", async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url: url.toString(), options });
    if (options.method === "GET") {
      return Response.json({ elements: [] });
    }
    return Response.json({
      id: "pref-demo-123",
      sandbox_init_point:
        "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-demo-123"
    });
  };
  const result = await createOrRecoverPreference(
    parsePaymentRequest(validBody),
    env,
    fetcher
  );
  assert.match(result.intentId, /^[a-f0-9]{64}$/u);
  assert.equal(result.preferenceId, "pref-demo-123");
  assert.equal(new URL(result.checkoutUrl).hostname, "sandbox.mercadopago.com.ar");
  const createBody = JSON.parse(requests[1].options.body);
  assert.equal(createBody.items[0].unit_price, 19300);
  assert.equal(createBody.external_reference, result.intentId);
  assert.equal(
    new URL(createBody.back_urls.success).hostname,
    "mesaflow-desarrollo.web.app"
  );
  assert.ok(!requests[1].options.body.includes(env.MERCADO_PAGO_ACCESS_TOKEN));
});

test("recupera una preferencia idempotente por referencia externa", async () => {
  let intentId;
  const fetcher = async (url, options) => {
    if (url.toString().includes("/search")) {
      const reference = new URL(url).searchParams.get("external_reference");
      intentId = reference;
      return Response.json({
        elements: [{ id: "pref-existente", external_reference: reference }]
      });
    }
    assert.equal(options.method, "GET");
    return Response.json({
      id: "pref-existente",
      sandbox_init_point:
        "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-existente"
    });
  };
  const result = await createOrRecoverPreference(
    parsePaymentRequest(validBody),
    env,
    fetcher
  );
  assert.equal(result.intentId, intentId);
  assert.equal(result.preferenceId, "pref-existente");
});

test("expone CORS solo al sitio académico y no filtra el secreto", async () => {
  const provider = async (url, options) => options.method === "GET"
    ? Response.json({ elements: [] })
    : Response.json({
      id: "pref-demo-456",
      sandbox_init_point:
        "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-demo-456"
    });
  const request = new Request("https://worker.example/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MesaFlow-Client": "demo-v1",
      Origin: "https://mesaflow-desarrollo.web.app"
    },
    body: JSON.stringify(validBody)
  });
  const response = await handleRequest(request, env, provider);
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://mesaflow-desarrollo.web.app"
  );
  assert.ok(!(await response.text()).includes(env.MERCADO_PAGO_ACCESS_TOKEN));

  const productionRequest = new Request("https://worker.example/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-MesaFlow-Client": "demo-v1",
      Origin: "https://mesaflow-produccion.web.app"
    },
    body: JSON.stringify({ ...validBody, sessionId: "sesion-academica-01" })
  });
  const productionResponse = await handleRequest(productionRequest, env, provider);
  assert.equal(productionResponse.status, 200);
  assert.equal(
    productionResponse.headers.get("Access-Control-Allow-Origin"),
    "https://mesaflow-produccion.web.app"
  );

  const rejected = await handleRequest(
    new Request("https://worker.example/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MesaFlow-Client": "demo-v1",
        Origin: "https://evil.example"
      },
      body: JSON.stringify(validBody)
    }),
    env,
    provider
  );
  assert.equal(rejected.status, 403);

  const missingClient = await handleRequest(
    new Request("https://worker.example/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://mesaflow-produccion.web.app"
      },
      body: JSON.stringify(validBody)
    }),
    env,
    provider
  );
  assert.equal(missingClient.status, 400);
});
