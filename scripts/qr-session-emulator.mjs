import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { buildQrExchangeId, hashQrToken } from "../functions/lib/qr-session.js";
import { buildOrderId } from "../functions/lib/create-order.js";
import { buildPaymentIntentId } from "../functions/lib/create-payment-preference.js";
import { buildPaymentDocumentId } from
  "../functions/lib/data/firestore-payment-reconciliation-repository.js";
import { EMULATOR_WEBHOOK_SECRET } from "../functions/lib/mercado-pago-webhook.js";
import { buildWebhookEventId } from "../functions/lib/reconcile-payment.js";
import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const tokenV1 = "6d657361666c6f772d64656d6f2d3031";
const tokenV2 = "6d657361666c6f772d64656d6f2d3032";
const context = { establishmentSlug: "mesa-flow-demo", tableId: "mesa-01" };
const authBase = `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}/identitytoolkit.googleapis.com/v1`;
const functionBase =
  `http://${EMULATOR_HOST}:${EMULATOR_PORTS.functions}/${DEMO_PROJECT_ID}` +
  "/southamerica-east1";
const users = [];
let app;
let firestore;
let originalTable;
let originalSession;
let originalAssistance;
let originalPublicSettings;
let paymentIntentId;
let paymentDocumentId;
let webhookEventId;
const createdOrderIds = [];
const createdAuditRequestIds = [
  "a1111111111111111111111111111111",
  "b2222222222222222222222222222222",
  "c3333333333333333333333333333333",
  "d4444444444444444444444444444444",
  "e5555555555555555555555555555555"
];
const originalMetrics = new Map();
const orderMetricDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const metricDates = [...new Set(["2026-10-06", orderMetricDate])];

async function jsonRequest(url, { method = "POST", body, token, headers = {} } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  const responseText = await response.text();
  return {
    status: response.status,
    data: responseText.length === 0 ? null : JSON.parse(responseText)
  };
}

async function anonymousUser() {
  const result = await jsonRequest(`${authBase}/accounts:signUp?key=demo-key`, {
    body: { returnSecureToken: true }
  });
  assert.equal(result.status, 200);
  assert.equal(typeof result.data.localId, "string");
  assert.equal(typeof result.data.idToken, "string");
  users.push(result.data);
  return result.data;
}

async function passwordUser(email) {
  const result = await jsonRequest(`${authBase}/accounts:signInWithPassword?key=demo-key`, {
    body: {
      email,
      password: "MesaFlowDemo31!",
      returnSecureToken: true
    }
  });
  assert.equal(result.status, 200);
  assert.equal(typeof result.data.idToken, "string");
  return result.data;
}

async function callable(name, data, idToken) {
  return jsonRequest(`${functionBase}/${name}`, {
    body: { data },
    token: idToken
  });
}

function assertCallableError(result, status) {
  assert.equal(result.data.error?.status, status);
  assert.equal(typeof result.data.error?.message, "string");
}

try {
  app = initializeApp({ projectId: DEMO_PROJECT_ID }, "mesaflow-qr-session-smoke");
  firestore = getFirestore(app);
  const tableRef = firestore.doc("establishments/mesa-flow-demo/tables/mesa-01");
  const tableSnapshot = await tableRef.get();
  assert.equal(tableSnapshot.exists, true, "Primero debe cargarse el seed demo");
  originalTable = tableSnapshot.data();
  assert.equal(originalTable.qrTokenHash, hashQrToken(tokenV1));
  const sessionRef = firestore.doc(
    "establishments/mesa-flow-demo/tableSessions/sesion-mesa-01"
  );
  const sessionSnapshot = await sessionRef.get();
  assert.equal(sessionSnapshot.exists, true);
  originalSession = sessionSnapshot.data();
  const assistanceRef = firestore.doc(
    "establishments/mesa-flow-demo/assistanceRequests/sesion-mesa-01"
  );
  const assistanceSnapshot = await assistanceRef.get();
  assert.equal(assistanceSnapshot.exists, true);
  originalAssistance = assistanceSnapshot.data();
  const publicSettingsRef = firestore.doc(
    "establishments/mesa-flow-demo/settings/public"
  );
  const publicSettingsSnapshot = await publicSettingsRef.get();
  assert.equal(publicSettingsSnapshot.exists, true);
  originalPublicSettings = publicSettingsSnapshot.data();
  for (const date of metricDates) {
    const snapshot = await firestore.doc(
      `establishments/mesa-flow-demo/dailyMetrics/${date}`
    ).get();
    originalMetrics.set(date, snapshot.exists ? snapshot.data() : null);
  }

  const first = await anonymousUser();
  const exchanged = await callable("exchangeQrSession", { ...context, token: tokenV1 }, first.idToken);
  assert.equal(exchanged.status, 200);
  assert.equal(exchanged.data.result.sessionId, "sesion-mesa-01");
  assert.equal(exchanged.data.result.tableId, "mesa-01");
  assert.equal(exchanged.data.result.establishmentName, originalPublicSettings.brandName);

  const restored = await callable("restoreQrSession", context, first.idToken);
  assert.equal(restored.status, 200);
  assert.equal(restored.data.result.sessionId, "sesion-mesa-01");

  const orderRequestId = "0123456789abcdef0123456789abcdef";
  const orderDraft = {
    establishmentId: "mesa-flow-demo",
    sessionId: "sesion-mesa-01",
    tableId: "mesa-01",
    requestId: orderRequestId,
    items: [{ productId: "burger-casa", quantity: 2, notes: "Sin cebolla" }]
  };
  const created = await callable("createOrder", orderDraft, first.idToken);
  assert.equal(created.status, 200);
  assert.equal(created.data.result.totalMinor, 2580000);
  assert.equal(created.data.result.currency, "ARS");
  const orderId = buildOrderId(first.localId, orderRequestId);
  createdOrderIds.push(orderId);
  assert.equal(created.data.result.orderId, orderId);
  const repeated = await callable("createOrder", orderDraft, first.idToken);
  assert.equal(repeated.status, 200);
  assert.equal(repeated.data.result.orderId, orderId);
  const order = (await firestore.doc(
    `establishments/mesa-flow-demo/orders/${orderId}`
  ).get()).data();
  assert.equal(order.items[0].unitPriceMinor, 1290000);
  assert.equal(order.items[0].lineTotalMinor, 2580000);
  assert.equal(order.totalMinor, 2580000);
  const orderMetric = (await firestore.doc(
    `establishments/mesa-flow-demo/dailyMetrics/${orderMetricDate}`
  ).get()).data();
  assert.equal(orderMetric.activeOrders, 1);
  assert.equal(orderMetric.productQuantities["burger-casa"], 2);
  const updatedSession = (await sessionRef.get()).data();
  assert.equal(
    updatedSession.subtotalMinor,
    originalSession.subtotalMinor + 2580000,
    "El reintento no debe sumar el pedido dos veces"
  );
  const orderMetricAfterRetry = (await firestore.doc(
    `establishments/mesa-flow-demo/dailyMetrics/${orderMetricDate}`
  ).get()).data();
  assert.equal(orderMetricAfterRetry.activeOrders, 1);
  assert.equal(orderMetricAfterRetry.productQuantities["burger-casa"], 2);
  const consumption = await callable("getSessionConsumption", {
    establishmentId: "mesa-flow-demo",
    sessionId: "sesion-mesa-01",
    tableId: "mesa-01"
  }, first.idToken);
  assert.equal(consumption.status, 200);
  assert.equal(consumption.data.result.currency, "ARS");
  assert.equal(
    consumption.data.result.subtotalMinor,
    updatedSession.subtotalMinor
  );
  assert.equal(consumption.data.result.paidMinor, updatedSession.paidMinor);
  assert.equal(
    consumption.data.result.balanceMinor,
    updatedSession.subtotalMinor - updatedSession.paidMinor
  );
  assert.equal(consumption.data.result.orderCount >= 1, true);
  assert.equal(consumption.data.result.itemCount >= 2, true);
  const manipulated = await callable("createOrder", {
    ...orderDraft,
    requestId: "1123456789abcdef0123456789abcdef",
    items: [{
      productId: "burger-casa",
      quantity: 2,
      notes: null,
      unitPriceMinor: 1
    }]
  }, first.idToken);
  assertCallableError(manipulated, "INVALID_ARGUMENT");
  const unavailable = await callable("createOrder", {
    ...orderDraft,
    requestId: "2123456789abcdef0123456789abcdef",
    items: [{ productId: "salmon-limon", quantity: 1, notes: null }]
  }, first.idToken);
  assertCallableError(unavailable, "FAILED_PRECONDITION");
  await publicSettingsRef.update({ orderingEnabled: false });
  const paused = await callable("createOrder", {
    ...orderDraft,
    requestId: "3123456789abcdef0123456789abcdef",
    items: [{ productId: "burger-casa", quantity: 1, notes: null }]
  }, first.idToken);
  assertCallableError(paused, "FAILED_PRECONDITION");
  assert.equal(paused.data.error.details?.reason, "ordering-disabled");
  await publicSettingsRef.update({ orderingEnabled: true });
  console.log("[OK] Pedido transaccional recalcula precio y el reintento no duplica consumo");
  console.log("[OK] Marca pública aplicada y pausa de pedidos respetada por backend");
  console.log("[OK] Consumo recompone pedidos y pagos con saldo verificado en servidor");

  const [staff, kitchen, owner] = await Promise.all([
    passwordUser("staff@mesaflow.example.invalid"),
    passwordUser("kitchen@mesaflow.example.invalid"),
    passwordUser("owner@mesaflow.example.invalid")
  ]);
  const transitions = [
    { token: staff.idToken, expectedStatus: "created", nextStatus: "confirmed" },
    { token: kitchen.idToken, expectedStatus: "confirmed", nextStatus: "preparing" },
    { token: kitchen.idToken, expectedStatus: "preparing", nextStatus: "ready" },
    { token: staff.idToken, expectedStatus: "ready", nextStatus: "delivered" },
    { token: owner.idToken, expectedStatus: "delivered", nextStatus: "completed" }
  ];
  for (const [index, transition] of transitions.entries()) {
    const result = await callable("updateOrderStatus", {
      establishmentId: "mesa-flow-demo",
      orderId,
      expectedStatus: transition.expectedStatus,
      nextStatus: transition.nextStatus,
      requestId: createdAuditRequestIds[index]
    }, transition.token);
    assert.equal(result.status, 200);
    assert.equal(result.data.result.status, transition.nextStatus);
  }
  const completedOrder = (await firestore.doc(
    `establishments/mesa-flow-demo/orders/${orderId}`
  ).get()).data();
  assert.equal(completedOrder.status, "completed");
  assert.equal(Object.keys(completedOrder.statusTimestamps).includes("completed"), true);
  console.log("[OK] La misma orden recorre salón → cocina → entrega → cierre con auditoría");

  const assistanceContext = {
    establishmentId: "mesa-flow-demo",
    sessionId: "sesion-mesa-01",
    tableId: "mesa-01"
  };
  const assistance = await callable(
    "createAssistanceRequest",
    { ...assistanceContext, type: "waiter" },
    first.idToken
  );
  assert.equal(assistance.status, 200);
  assert.equal(assistance.data.result.requestId, "sesion-mesa-01");
  assert.equal(assistance.data.result.status, "pending");
  const repeatedAssistance = await callable(
    "createAssistanceRequest",
    { ...assistanceContext, type: "bill" },
    first.idToken
  );
  assert.equal(repeatedAssistance.status, 200);
  assert.equal(repeatedAssistance.data.result.type, "waiter");
  assert.equal(repeatedAssistance.data.result.status, "pending");
  const cancelledAssistance = await callable(
    "cancelAssistanceRequest",
    assistanceContext,
    first.idToken
  );
  assert.equal(cancelledAssistance.status, 200);
  assert.equal(cancelledAssistance.data.result.status, "cancelled");
  const rateLimitedAssistance = await callable(
    "createAssistanceRequest",
    { ...assistanceContext, type: "other" },
    first.idToken
  );
  assertCallableError(rateLimitedAssistance, "FAILED_PRECONDITION");
  console.log("[OK] Asistencia crea, evita duplicados, cancela y limita reintentos");

  const replay = await callable("exchangeQrSession", { ...context, token: tokenV1 }, first.idToken);
  assertCallableError(replay, "ALREADY_EXISTS");
  console.log("[OK] QR válido abre y restaura sesión; replay del mismo UID rechazado");

  const second = await anonymousUser();
  const altered = await callable(
    "exchangeQrSession",
    { ...context, token: `${tokenV1.slice(0, -1)}9` },
    second.idToken
  );
  assertCallableError(altered, "PERMISSION_DENIED");

  await tableRef.update({ qrTokenHash: hashQrToken(tokenV2), qrVersion: 2 });
  const rotated = await callable("exchangeQrSession", { ...context, token: tokenV1 }, second.idToken);
  assertCallableError(rotated, "PERMISSION_DENIED");
  const current = await callable("exchangeQrSession", { ...context, token: tokenV2 }, second.idToken);
  assert.equal(current.status, 200);
  assert.equal(current.data.result.sessionId, "sesion-mesa-01");
  console.log("[OK] QR alterado y versión rotada rechazados; token vigente aceptado");

  const paymentContext = {
    establishmentId: "mesa-flow-demo",
    sessionId: "sesion-mesa-01",
    tableId: "mesa-01"
  };
  const preference = await callable(
    "createPaymentPreference",
    paymentContext,
    first.idToken
  );
  assert.equal(preference.status, 200);
  assert.equal(preference.data.result.status, "ready");
  assert.equal(preference.data.result.amountMinor, consumption.data.result.balanceMinor);
  assert.match(preference.data.result.checkoutUrl, /^https:\/\/sandbox\.mercadopago\.com\//u);
  paymentIntentId = buildPaymentIntentId("mesa-flow-demo", "sesion-mesa-01");
  assert.equal(preference.data.result.intentId, paymentIntentId);
  assert.equal((await sessionRef.get()).data().status, "payment_pending");
  const repeatedPreference = await callable(
    "createPaymentPreference",
    paymentContext,
    first.idToken
  );
  assert.equal(repeatedPreference.status, 200);
  assert.equal(repeatedPreference.data.result.preferenceId, preference.data.result.preferenceId);
  const paymentPreferences = await firestore
    .collection("establishments/mesa-flow-demo/paymentPreferences")
    .get();
  assert.equal(paymentPreferences.docs.filter(({ id }) => id === paymentIntentId).length, 1);
  const globalIntent = (await firestore.doc(`paymentIntents/${paymentIntentId}`).get()).data();
  assert.equal(globalIntent.status, "ready");
  assert.equal(globalIntent.amountMinor, preference.data.result.amountMinor);
  console.log("[OK] Preferencia de pago se crea una vez, bloquea pedidos y reutiliza checkout");

  const providerPaymentId = "900001";
  const requestId = "mesaflow-emulator-payment-900001";
  const signatureTimestamp = "1791288000";
  const manifest =
    `id:${providerPaymentId};request-id:${requestId};ts:${signatureTimestamp};`;
  const signature = createHmac("sha256", EMULATOR_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");
  const webhookBody = {
    id: 900001,
    live_mode: false,
    type: "payment",
    date_created: "2026-10-06T12:00:00.000Z",
    api_version: "v1",
    action: "payment.updated",
    data: { id: providerPaymentId }
  };
  const webhookUrl =
    `${functionBase}/mercadoPagoWebhook?data.id=${providerPaymentId}`;
  const webhookHeaders = {
    "x-request-id": requestId,
    "x-signature": `ts=${signatureTimestamp},v1=${signature}`
  };
  const reconciled = await jsonRequest(webhookUrl, {
    body: webhookBody,
    headers: webhookHeaders
  });
  assert.equal(reconciled.status, 200);
  assert.equal(reconciled.data.outcome, "processed");
  paymentDocumentId = buildPaymentDocumentId(providerPaymentId);
  webhookEventId = buildWebhookEventId(requestId);
  const payment = (await firestore.doc(
    `establishments/mesa-flow-demo/payments/${paymentDocumentId}`
  ).get()).data();
  assert.equal(payment.status, "approved");
  assert.equal(payment.amountMinor, preference.data.result.amountMinor);
  const paidSession = (await sessionRef.get()).data();
  assert.equal(paidSession.paidMinor, paidSession.subtotalMinor);
  assert.equal(paidSession.balanceMinor, 0);
  assert.equal(paidSession.status, "paid");
  const repeatedWebhook = await jsonRequest(webhookUrl, {
    body: webhookBody,
    headers: webhookHeaders
  });
  assert.equal(repeatedWebhook.status, 200);
  assert.equal(repeatedWebhook.data.outcome, "duplicate");
  const afterReplay = (await sessionRef.get()).data();
  assert.equal(afterReplay.paidMinor, paidSession.paidMinor);
  const paymentMetric = (await firestore.doc(
    "establishments/mesa-flow-demo/dailyMetrics/2026-10-06"
  ).get()).data();
  assert.equal(paymentMetric.salesMinor, paidSession.paidMinor);
  assert.equal(paymentMetric.approvedPayments, 1);
  const invalidWebhook = await jsonRequest(webhookUrl, {
    body: webhookBody,
    headers: {
      "x-request-id": "forged-request",
      "x-signature": `ts=${signatureTimestamp},v1=invalid`
    }
  });
  assert.equal(invalidWebhook.status, 401);
  assert.equal((await firestore.collection(
    "establishments/mesa-flow-demo/payments"
  ).where("externalId", "==", providerPaymentId).get()).size, 1);
  console.log("[OK] Webhook firmado concilia el pago y el reintento no duplica el saldo");
} catch (error) {
  console.error(`Smoke QR falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  try {
    if (firestore && originalTable) {
      const tableRef = firestore.doc("establishments/mesa-flow-demo/tables/mesa-01");
      await tableRef.update({
        qrTokenHash: originalTable.qrTokenHash,
        qrVersion: originalTable.qrVersion
      });
      if (originalSession) {
        await firestore.doc(
          "establishments/mesa-flow-demo/tableSessions/sesion-mesa-01"
        ).set(originalSession);
      }
      if (originalAssistance) {
        await firestore.doc(
          "establishments/mesa-flow-demo/assistanceRequests/sesion-mesa-01"
        ).set(originalAssistance);
      }
      if (originalPublicSettings) {
        await firestore.doc(
          "establishments/mesa-flow-demo/settings/public"
        ).set(originalPublicSettings);
      }
      for (const orderId of createdOrderIds) {
        await firestore.doc(
          `establishments/mesa-flow-demo/orders/${orderId}`
        ).delete();
      }
      for (const requestId of createdAuditRequestIds) {
        await firestore.doc(
          `establishments/mesa-flow-demo/auditLogs/order-status-${requestId}`
        ).delete();
      }
      if (paymentIntentId) {
        await firestore.doc(
          `establishments/mesa-flow-demo/paymentPreferences/${paymentIntentId}`
        ).delete();
        await firestore.doc(`paymentIntents/${paymentIntentId}`).delete();
      }
      if (paymentDocumentId) {
        await firestore.doc(
          `establishments/mesa-flow-demo/payments/${paymentDocumentId}`
        ).delete();
      }
      if (webhookEventId) {
        await firestore.doc(`webhookEvents/${webhookEventId}`).delete();
      }
      for (const date of metricDates) {
        const reference = firestore.doc(
          `establishments/mesa-flow-demo/dailyMetrics/${date}`
        );
        const original = originalMetrics.get(date);
        if (original) await reference.set(original);
        else await reference.delete();
      }
      for (const user of users) {
        const participant = firestore.doc(
          `establishments/mesa-flow-demo/tableSessions/sesion-mesa-01/participants/${user.localId}`
        );
        await participant.delete();
        for (const token of [tokenV1, tokenV2]) {
          const exchangeId = buildQrExchangeId(user.localId, hashQrToken(token));
          await firestore.doc(
            `establishments/mesa-flow-demo/qrExchanges/${exchangeId}`
          ).delete();
        }
      }
    }
    for (const user of users) {
      const deleted = await jsonRequest(`${authBase}/accounts:delete?key=demo-key`, {
        body: { idToken: user.idToken }
      });
      assert.equal(deleted.status, 200);
    }
    if (firestore) await firestore.terminate();
    if (app) await deleteApp(app);
    console.log("[OK] Usuarios y registros QR temporales eliminados");
  } catch (error) {
    console.error(`Limpieza QR local falló: ${error.message}`);
    process.exitCode = 1;
  }
}
