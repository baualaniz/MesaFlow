import assert from "node:assert/strict";

import {
  deleteApp as deleteAdminApp,
  initializeApp as initializeAdminApp
} from "firebase-admin/app";
import {
  Timestamp as AdminTimestamp,
  getFirestore as getAdminFirestore
} from "firebase-admin/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  Timestamp
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable
} from "firebase/functions";

import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const establishmentId = "mesa-flow-demo";
const requestId = "sesion-mesa-01";
const requestPath = `establishments/${establishmentId}/assistanceRequests/${requestId}`;
const ids = {
  acknowledge: "81111111111111111111111111111111",
  resolve: "82222222222222222222222222222222"
};
const adminApp = initializeAdminApp({ projectId: DEMO_PROJECT_ID }, "admin-assistance-smoke-cleanup");
const adminFirestore = getAdminFirestore(adminApp);
const app = initializeApp({
  apiKey: "demo-key",
  appId: "1:1234567890:web:admin-assistance-smoke",
  authDomain: `${DEMO_PROJECT_ID}.firebaseapp.com`,
  projectId: DEMO_PROJECT_ID
}, "admin-assistance-smoke");
const auth = getAuth(app);
const firestore = getFirestore(app);
const functions = getFunctions(app, "southamerica-east1");
connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, {
  disableWarnings: true
});
connectFirestoreEmulator(firestore, EMULATOR_HOST, EMULATOR_PORTS.firestore);
connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions);
const updateStatus = httpsCallable(functions, "updateAssistanceStatus");
let originalRequest;

try {
  const original = await adminFirestore.doc(requestPath).get();
  assert.equal(original.exists, true);
  originalRequest = original.data();
  const now = AdminTimestamp.fromDate(new Date("2026-10-07T15:00:00.000Z"));
  await adminFirestore.doc(requestPath).set({
    establishmentId,
    sessionId: requestId,
    tableId: "mesa-01",
    customerUid: "customer-mesa-01",
    type: "waiter",
    status: "pending",
    acknowledgedBy: null,
    resolvedBy: null,
    createdAt: now,
    updatedAt: now
  });

  await signInWithEmailAndPassword(
    auth,
    "kitchen@mesaflow.example.invalid",
    "MesaFlowDemo31!"
  );
  await assert.rejects(updateStatus({
    establishmentId,
    expectedStatus: "pending",
    nextStatus: "acknowledged",
    operationId: "80000000000000000000000000000000",
    requestId
  }), (error) => error?.code === "functions/permission-denied");

  await signOut(auth);
  await signInWithEmailAndPassword(
    auth,
    "staff@mesaflow.example.invalid",
    "MesaFlowDemo31!"
  );
  const acknowledgeCommand = {
    establishmentId,
    expectedStatus: "pending",
    nextStatus: "acknowledged",
    operationId: ids.acknowledge,
    requestId
  };
  const acknowledged = await updateStatus(acknowledgeCommand);
  const retry = await updateStatus(acknowledgeCommand);
  assert.deepEqual(retry.data, acknowledged.data);
  assert.equal(acknowledged.data.status, "acknowledged");

  const visibleAcknowledged = await getDoc(doc(
    firestore,
    "establishments",
    establishmentId,
    "assistanceRequests",
    requestId
  ));
  assert.equal(visibleAcknowledged.data().status, "acknowledged");
  assert.equal(visibleAcknowledged.data().acknowledgedBy, "demo-staff");
  assert.ok(visibleAcknowledged.data().updatedAt instanceof Timestamp);

  const resolved = await updateStatus({
    establishmentId,
    expectedStatus: "acknowledged",
    nextStatus: "resolved",
    operationId: ids.resolve,
    requestId
  });
  assert.equal(resolved.data.status, "resolved");
  const stored = await adminFirestore.doc(requestPath).get();
  assert.equal(stored.data().resolvedBy, "demo-staff");

  await assert.rejects(updateStatus({
    establishmentId: "otro-establecimiento",
    expectedStatus: "pending",
    nextStatus: "acknowledged",
    operationId: "83333333333333333333333333333333",
    requestId
  }), (error) => error?.code === "functions/permission-denied");

  for (const operationId of Object.values(ids)) {
    const audit = await adminFirestore.doc(
      `establishments/${establishmentId}/auditLogs/assistance-status-${operationId}`
    ).get();
    assert.equal(audit.exists, true);
    assert.equal(audit.data().action, "assistance.status.changed");
  }
  console.log("[OK] Panel: asistencia visible, atendida, resuelta, auditada e idempotente");
} catch (error) {
  console.error(`Smoke de asistencia del panel falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (auth.currentUser !== null) await signOut(auth);
  await deleteApp(app);
  const batch = adminFirestore.batch();
  if (originalRequest) batch.set(adminFirestore.doc(requestPath), originalRequest);
  for (const operationId of Object.values(ids)) {
    batch.delete(adminFirestore.doc(
      `establishments/${establishmentId}/auditLogs/assistance-status-${operationId}`
    ));
  }
  batch.delete(adminFirestore.doc(
    `establishments/${establishmentId}/auditLogs/assistance-status-83333333333333333333333333333333`
  ));
  await batch.commit();
  await deleteAdminApp(adminApp);
}
