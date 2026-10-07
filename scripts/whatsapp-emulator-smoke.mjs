import assert from "node:assert/strict";

import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

import { buildWhatsAppAssistanceEventId } from "../functions/lib/whatsapp-assistance.js";
import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const establishmentId = "mesa-flow-demo";
const app = initializeApp({ projectId: DEMO_PROJECT_ID }, "whatsapp-emulator-smoke");
const firestore = getFirestore(app);
const settingsRef = firestore.doc(`establishments/${establishmentId}/settings/private`);
const stateRef = firestore.doc(
  `establishments/${establishmentId}/notificationStates/whatsapp-assistance`
);
const originalSettings = await settingsRef.get();
const originalState = await stateRef.get();
const requests = [];
const logs = [];

function references(requestId, date) {
  const eventId = buildWhatsAppAssistanceEventId({
    establishmentId,
    requestId,
    sourceUpdatedAt: date,
    tableId: "mesa-01",
    type: "waiter"
  });
  return {
    log: firestore.doc(
      `establishments/${establishmentId}/auditLogs/whatsapp-assistance-${eventId}`
    ),
    request: firestore.doc(
      `establishments/${establishmentId}/assistanceRequests/${requestId}`
    )
  };
}

async function createRequest(requestId, date) {
  const refs = references(requestId, date);
  requests.push(refs.request);
  logs.push(refs.log);
  await refs.request.set({
    establishmentId,
    sessionId: "sesion-mesa-01",
    tableId: "mesa-01",
    customerUid: "whatsapp-smoke-guest",
    type: "waiter",
    status: "pending",
    acknowledgedBy: null,
    resolvedBy: null,
    createdAt: Timestamp.fromDate(date),
    updatedAt: Timestamp.fromDate(date)
  });
  return refs;
}

async function waitForStatus(reference, expected) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const snapshot = await reference.get();
    if (snapshot.data()?.after?.status === expected) return snapshot.data();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`La alerta ${reference.id} no llegó al estado ${expected}.`);
}

try {
  assert.equal(originalSettings.exists, true, "Primero debe cargarse el seed demo");
  await settingsRef.update({
    whatsappEnabled: true,
    whatsappOptInConfirmed: true,
    whatsappRecipient: "5491155550101"
  });

  const firstDate = new Date("2026-10-07T18:00:00.000Z");
  const first = await createRequest("whatsapp-smoke-1", firstDate);
  const mocked = await waitForStatus(first.log, "mocked");
  assert.match(mocked.after.providerMessageId, /^mock-[a-f0-9]{20}$/u);
  assert.equal(mocked.after.recipientHash.length, 64);
  assert.equal(JSON.stringify(mocked).includes("5491155550101"), false);

  const second = await createRequest(
    "whatsapp-smoke-2",
    new Date("2026-10-07T18:00:01.000Z")
  );
  await waitForStatus(second.log, "rate_limited");

  await settingsRef.update({ whatsappEnabled: false });
  const third = await createRequest(
    "whatsapp-smoke-3",
    new Date("2026-10-07T18:00:02.000Z")
  );
  await waitForStatus(third.log, "skipped_disabled");
  assert.equal((await first.request.get()).data()?.status, "pending");
  console.log("[OK] WhatsApp: mock exitoso, opt-in, límite y logs sin teléfono en claro");
} catch (error) {
  console.error(`Smoke de WhatsApp falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  const cleanup = firestore.batch();
  for (const reference of requests) cleanup.delete(reference);
  for (const reference of logs) cleanup.delete(reference);
  if (originalState.exists) cleanup.set(stateRef, originalState.data());
  else cleanup.delete(stateRef);
  if (originalSettings.exists) cleanup.set(settingsRef, originalSettings.data());
  await cleanup.commit();
  await firestore.terminate();
  await deleteApp(app);
}
