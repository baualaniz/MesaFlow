import assert from "node:assert/strict";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { buildQrExchangeId, hashQrToken } from "../functions/lib/qr-session.js";
import { buildOrderId } from "../functions/lib/create-order.js";
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
const createdOrderIds = [];

async function jsonRequest(url, { method = "POST", body, token } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  return { status: response.status, data: await response.json() };
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

  const first = await anonymousUser();
  const exchanged = await callable("exchangeQrSession", { ...context, token: tokenV1 }, first.idToken);
  assert.equal(exchanged.status, 200);
  assert.equal(exchanged.data.result.sessionId, "sesion-mesa-01");
  assert.equal(exchanged.data.result.tableId, "mesa-01");

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
  const updatedSession = (await sessionRef.get()).data();
  assert.equal(
    updatedSession.subtotalMinor,
    originalSession.subtotalMinor + 2580000,
    "El reintento no debe sumar el pedido dos veces"
  );
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
  console.log("[OK] Pedido transaccional recalcula precio y el reintento no duplica consumo");
  console.log("[OK] Consumo recompone pedidos y pagos con saldo verificado en servidor");

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
      for (const orderId of createdOrderIds) {
        await firestore.doc(
          `establishments/mesa-flow-demo/orders/${orderId}`
        ).delete();
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
