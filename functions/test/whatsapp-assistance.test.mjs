import assert from "node:assert/strict";
import test from "node:test";

import {
  assistanceLabel,
  buildWhatsAppAssistanceEventId,
  notifyWhatsAppAssistance
} from "../lib/whatsapp-assistance.js";
import {
  MockWhatsAppProvider,
  WhatsAppCloudApiProvider
} from "../lib/providers/whatsapp-cloud-api.js";

const event = Object.freeze({
  establishmentId: "mesa-flow-demo",
  requestId: "asistencia-01",
  tableId: "mesa-01",
  type: "waiter",
  sourceUpdatedAt: new Date("2026-10-07T15:00:00.000Z")
});

function repository(claim) {
  const completions = [];
  return {
    completions,
    async claim(received) {
      assert.deepEqual(received, event);
      return claim;
    },
    async complete(...args) {
      completions.push(args);
    }
  };
}

test("genera identidad y etiqueta deterministas sin exponer el destinatario", () => {
  assert.match(buildWhatsAppAssistanceEventId(event), /^[a-f0-9]{64}$/u);
  assert.equal(buildWhatsAppAssistanceEventId(event), buildWhatsAppAssistanceEventId(event));
  assert.equal(assistanceLabel("waiter"), "Llamado al personal");
  assert.equal(assistanceLabel("bill"), "Solicitud de cuenta");
});

test("el proveedor mock confirma y registra una alerta sin red", async () => {
  const eventId = buildWhatsAppAssistanceEventId(event);
  const repo = repository({
    kind: "send",
    logId: `whatsapp-assistance-${eventId}`,
    message: {
      assistanceLabel: assistanceLabel(event.type),
      eventId,
      recipient: "5491155550101",
      tableName: "Mesa 1"
    }
  });
  const result = await notifyWhatsAppAssistance(event, repo, new MockWhatsAppProvider());
  assert.equal(result.status, "mocked");
  assert.equal(repo.completions.length, 1);
  assert.equal(repo.completions[0][0], event);
  assert.equal(repo.completions[0][2].status, "mocked");
  assert.match(repo.completions[0][2].messageId, /^mock-[a-f0-9]{20}$/u);
});

test("una falla del proveedor queda registrada y no rechaza la asistencia", async () => {
  const repo = repository({
    kind: "send",
    logId: `whatsapp-assistance-${buildWhatsAppAssistanceEventId(event)}`,
    message: {
      assistanceLabel: "Llamado al personal",
      eventId: buildWhatsAppAssistanceEventId(event),
      recipient: "5491155550101",
      tableName: "Mesa 1"
    }
  });
  const result = await notifyWhatsAppAssistance(event, repo, {
    async send() { throw new Error("provider unavailable"); }
  });
  assert.equal(result.status, "failed");
  assert.equal(repo.completions[0][2].status, "failed");
  assert.equal(repo.completions[0][2].messageId, null);
});

test("un evento limitado no llama al proveedor", async () => {
  const repo = repository({ kind: "skip", logId: "log-rate", status: "rate_limited" });
  let calls = 0;
  const result = await notifyWhatsAppAssistance(event, repo, {
    async send() { calls += 1; throw new Error("no debe llamarse"); }
  });
  assert.equal(result.status, "rate_limited");
  assert.equal(calls, 0);
  assert.equal(repo.completions.length, 0);
});

test("Cloud API usa plantilla, token en header y endpoint versionado", async () => {
  const requests = [];
  const provider = new WhatsAppCloudApiProvider({
    accessToken: "local-test-token-value-123456789",
    graphApiVersion: "v99.0",
    phoneNumberId: "1234567890",
    templateLanguage: "es_AR",
    templateName: "mesaflow_assistance_alert"
  }, async (url, init) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({ messages: [{ id: "wamid.test-message" }] }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  });
  const sent = await provider.send({
    assistanceLabel: "Llamado al personal",
    eventId: "a".repeat(64),
    recipient: "5491155550101",
    tableName: "Mesa 1"
  });
  assert.equal(sent.messageId, "wamid.test-message");
  assert.equal(requests[0].url, "https://graph.facebook.com/v99.0/1234567890/messages");
  assert.equal(requests[0].url.includes("token"), false);
  assert.equal(requests[0].init.headers.Authorization, "Bearer local-test-token-value-123456789");
  const body = JSON.parse(requests[0].init.body);
  assert.equal(body.type, "template");
  assert.equal(body.template.components[0].parameters.length, 2);
});
