import assert from "node:assert/strict";
import test from "node:test";

import {
  PaymentPreferenceError,
  buildPaymentIntentId,
  createPaymentPreference
} from "../lib/create-payment-preference.js";
import { MercadoPagoProvider } from "../lib/payments/mercado-pago-provider.js";

const input = Object.freeze({
  establishmentId: "mesa-flow-demo",
  sessionId: "sesion-mesa-01",
  tableId: "mesa-01"
});
const now = new Date("2026-09-18T12:00:00.000Z");

function repository() {
  const calls = [];
  return {
    calls,
    async create(command) {
      calls.push(command);
      return {
        intentId: command.intentId,
        preferenceId: "preference-test",
        checkoutUrl: "https://sandbox.mercadopago.com/checkout/v1/redirect",
        amountMinor: 1940000,
        currency: "ARS",
        status: "ready"
      };
    }
  };
}

test("genera un intento determinista por establecimiento y sesión", async () => {
  const repo = repository();
  const result = await createPaymentPreference(input, "guest-a", repo, now);
  assert.equal(repo.calls.length, 1);
  assert.equal(
    repo.calls[0].intentId,
    buildPaymentIntentId("mesa-flow-demo", "sesion-mesa-01")
  );
  assert.equal(
    buildPaymentIntentId("mesa-flow-demo", "sesion-mesa-01"),
    buildPaymentIntentId("mesa-flow-demo", "sesion-mesa-01")
  );
  assert.notEqual(
    buildPaymentIntentId("mesa-flow-demo", "sesion-mesa-01"),
    buildPaymentIntentId("mesa-flow-demo", "sesion-mesa-02")
  );
  assert.equal(result.status, "ready");
});

test("rechaza identidad ausente y campos manipulados", async () => {
  const repo = repository();
  await assert.rejects(
    createPaymentPreference(input, undefined, repo, now),
    (error) => error instanceof PaymentPreferenceError && error.code === "unauthenticated"
  );
  await assert.rejects(
    createPaymentPreference({ ...input, amountMinor: 1 }, "guest-a", repo, now),
    (error) => error instanceof PaymentPreferenceError && error.code === "invalid-argument"
  );
  assert.equal(repo.calls.length, 0);
});

test("construye la preferencia con importe servidor y retornos públicos", async () => {
  const requests = [];
  const provider = new MercadoPagoProvider("TEST-token-seguro-123", async (url, init) => {
    requests.push({ url: url.toString(), init });
    if (init.method === "GET") {
      return new Response(JSON.stringify({ elements: [], total: 0 }), { status: 200 });
    }
    return new Response(JSON.stringify({
      id: "pref-123",
      sandbox_init_point: "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-123"
    }), { status: 201, headers: { "content-type": "application/json" } });
  });
  const result = await provider.createOrRecover({
    intentId: "intent-123",
    title: "Cuenta Bistró MesaFlow - Mesa 1",
    amountMinor: 1940000,
    currency: "ARS",
    returnBaseUrl: "https://mesaflow-desarrollo.web.app",
    returnPath: "/e/mesa-flow-demo/table/mesa-01"
  });
  const body = JSON.parse(requests[1].init.body);
  assert.match(requests[0].url, /\/checkout\/preferences\/search\?/u);
  assert.equal(requests[1].url, "https://api.mercadopago.com/checkout/preferences");
  assert.equal(body.items[0].unit_price, 19400);
  assert.equal(body.external_reference, "intent-123");
  assert.deepEqual(body.back_urls, {
    success: "https://mesaflow-desarrollo.web.app/payment/success?returnTo=%2Fe%2Fmesa-flow-demo%2Ftable%2Fmesa-01",
    pending: "https://mesaflow-desarrollo.web.app/payment/pending?returnTo=%2Fe%2Fmesa-flow-demo%2Ftable%2Fmesa-01",
    failure: "https://mesaflow-desarrollo.web.app/payment/failure?returnTo=%2Fe%2Fmesa-flow-demo%2Ftable%2Fmesa-01"
  });
  assert.equal(body.auto_return, "approved");
  assert.equal(result.preferenceId, "pref-123");
});

test("rechaza credenciales vacías y URLs de checkout ajenas", async () => {
  await assert.rejects(
    new MercadoPagoProvider("").createOrRecover({
      intentId: "intent-123",
      title: "Cuenta",
      amountMinor: 100,
      currency: "ARS",
      returnBaseUrl: "https://mesaflow-desarrollo.web.app",
      returnPath: "/e/mesa-flow-demo/table/mesa-01"
    }),
    (error) => error instanceof PaymentPreferenceError &&
      error.reason === "provider-unavailable"
  );
  let call = 0;
  const provider = new MercadoPagoProvider("TEST-token-seguro-123", async () => {
    call += 1;
    if (call === 1) {
      return new Response(JSON.stringify({ elements: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({
      id: "pref-123",
      sandbox_init_point: "https://example.com/robo"
    }), { status: 201 });
  });
  await assert.rejects(
    provider.createOrRecover({
      intentId: "intent-123",
      title: "Cuenta",
      amountMinor: 100,
      currency: "ARS",
      returnBaseUrl: "https://mesaflow-desarrollo.web.app",
      returnPath: "/e/mesa-flow-demo/table/mesa-01"
    }),
    (error) => error instanceof PaymentPreferenceError &&
      error.reason === "provider-unavailable"
  );
});

test("recupera por external_reference antes de crear otra preferencia", async () => {
  const requests = [];
  const provider = new MercadoPagoProvider("APP_USR-token-seguro-123", async (url, init) => {
    requests.push({ url: url.toString(), init });
    if (requests.length === 1) {
      return new Response(JSON.stringify({
        elements: [{ id: "pref-recuperada", external_reference: "intent-123" }],
        total: 1
      }), { status: 200 });
    }
    return new Response(JSON.stringify({
      id: "pref-recuperada",
      sandbox_init_point: "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-recuperada"
    }), { status: 200 });
  });
  const result = await provider.createOrRecover({
    intentId: "intent-123",
    title: "Cuenta",
    amountMinor: 100,
    currency: "ARS",
    returnBaseUrl: "https://mesaflow-desarrollo.web.app",
    returnPath: "/e/mesa-flow-demo/table/mesa-01"
  });
  assert.equal(result.preferenceId, "pref-recuperada");
  assert.equal(requests.length, 2);
  assert.equal(requests.some(({ init }) => init.method === "POST"), false);
});
