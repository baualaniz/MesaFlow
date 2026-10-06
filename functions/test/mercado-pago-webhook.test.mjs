import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  EMULATOR_WEBHOOK_SECRET,
  handleMercadoPagoWebhook
} from "../lib/mercado-pago-webhook.js";
import {
  MercadoPagoPaymentProvider,
  PaymentLookupError,
  parseProviderPayment
} from "../lib/payments/mercado-pago-payment-provider.js";
import {
  buildWebhookEventId,
  reconcilePayment
} from "../lib/reconcile-payment.js";

const providerPayment = Object.freeze({
  id: "900001",
  externalReference: "intent-123",
  status: "approved",
  providerStatus: "approved",
  statusDetail: "accredited",
  amountMinor: 1940000,
  currency: "ARS",
  liveMode: false,
  createdAt: new Date("2026-10-06T12:00:00.000Z"),
  updatedAt: new Date("2026-10-06T12:01:00.000Z")
});

function providerBody(overrides = {}) {
  return {
    id: 900001,
    external_reference: "intent-123",
    status: "approved",
    status_detail: "accredited",
    transaction_amount: 19400,
    currency_id: "ARS",
    live_mode: false,
    date_created: "2026-10-06T12:00:00.000Z",
    date_last_updated: "2026-10-06T12:01:00.000Z",
    ...overrides
  };
}

function signature(dataId, requestId, ts = "1791288000") {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", EMULATOR_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");
  return `ts=${ts},v1=${hash}`;
}

function responseRecorder() {
  const result = { code: 0, headers: {}, body: undefined, ended: false };
  return {
    result,
    response: {
      end() { result.ended = true; },
      json(body) { result.body = body; },
      setHeader(name, value) { result.headers[name] = value; },
      status(code) { result.code = code; return this; }
    }
  };
}

function webhookRequest({
  dataId = "900001",
  requestId = "request-123",
  xSignature = signature(dataId, requestId),
  body = {
    id: 1,
    live_mode: false,
    type: "payment",
    action: "payment.updated",
    data: { id: dataId }
  },
  method = "POST"
} = {}) {
  return {
    body,
    method,
    query: { "data.id": dataId },
    get(name) {
      if (name === "x-request-id") return requestId;
      if (name === "x-signature") return xSignature;
      return undefined;
    }
  };
}

test("normaliza estados e importes del pago consultado", () => {
  const approved = parseProviderPayment(providerBody());
  assert.equal(approved.id, "900001");
  assert.equal(approved.status, "approved");
  assert.equal(approved.amountMinor, 1940000);
  assert.equal(
    parseProviderPayment(providerBody({ status: "in_process" })).status,
    "pending"
  );
  assert.throws(
    () => parseProviderPayment(providerBody({ transaction_amount: 10.001 })),
    PaymentLookupError
  );
  assert.throws(
    () => parseProviderPayment(providerBody({ status: "unknown" })),
    PaymentLookupError
  );
});

test("consulta el pago por ID sin enviar credenciales en la URL", async () => {
  const calls = [];
  const provider = new MercadoPagoPaymentProvider(
    "TEST-access-token-seguro",
    async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(providerBody()), { status: 200 });
    }
  );
  const payment = await provider.getPayment("900001");
  assert.equal(payment.status, "approved");
  assert.equal(calls[0].url, "https://api.mercadopago.com/v1/payments/900001");
  assert.equal(calls[0].init.headers.Authorization, "Bearer TEST-access-token-seguro");
  assert.equal(calls[0].url.includes("access_token"), false);
});

test("acepta firma oficial y concilia solo el recurso consultado", async () => {
  const providerCalls = [];
  const repositoryCalls = [];
  const provider = {
    async getPayment(id) { providerCalls.push(id); return providerPayment; }
  };
  const repository = {
    async reconcile(command) {
      repositoryCalls.push(command);
      return { outcome: "processed", paymentId: "mp-1", status: "approved" };
    }
  };
  const { result, response } = responseRecorder();
  await handleMercadoPagoWebhook(webhookRequest(), response, {
    secret: EMULATOR_WEBHOOK_SECRET,
    provider,
    repository,
    now: new Date("2026-10-06T12:02:00.000Z")
  });
  assert.equal(result.code, 200);
  assert.equal(result.body.outcome, "processed");
  assert.deepEqual(providerCalls, ["900001"]);
  assert.equal(repositoryCalls.length, 1);
  assert.equal(repositoryCalls[0].eventId, buildWebhookEventId("request-123"));
});

test("rechaza firma inválida y discordancia entre query y cuerpo", async () => {
  let calls = 0;
  const dependencies = {
    secret: EMULATOR_WEBHOOK_SECRET,
    provider: { async getPayment() { calls += 1; return providerPayment; } },
    repository: { async reconcile() { calls += 1; throw new Error("no esperado"); } }
  };
  const invalid = responseRecorder();
  await handleMercadoPagoWebhook(
    webhookRequest({ xSignature: "ts=1,v1=invalid" }),
    invalid.response,
    dependencies
  );
  assert.equal(invalid.result.code, 401);
  const mismatch = responseRecorder();
  await handleMercadoPagoWebhook(
    webhookRequest({ body: { type: "payment", action: "payment.updated", data: { id: "7" } } }),
    mismatch.response,
    dependencies
  );
  assert.equal(mismatch.result.code, 400);
  assert.equal(calls, 0);
});

test("devuelve reintento al proveedor cuando la conciliación falla", async () => {
  const { result, response } = responseRecorder();
  await handleMercadoPagoWebhook(webhookRequest(), response, {
    secret: EMULATOR_WEBHOOK_SECRET,
    provider: { async getPayment() { throw new PaymentLookupError(); } },
    repository: { async reconcile() { throw new Error("no esperado"); } },
    logError() {}
  });
  assert.equal(result.code, 503);
  assert.equal(result.body.error, "reconciliation-unavailable");
});

test("el servicio rechaza si el proveedor devuelve otro ID", async () => {
  await assert.rejects(
    reconcilePayment(
      "900001",
      "request-123",
      { async getPayment() { return { ...providerPayment, id: "900002" }; } },
      { async reconcile() { throw new Error("no esperado"); } }
    ),
    /pago distinto/u
  );
});
