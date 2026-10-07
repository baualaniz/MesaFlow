import assert from "node:assert/strict";

import {
  deleteApp as deleteAdminApp,
  initializeApp as initializeAdminApp
} from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
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

const adminApp = initializeAdminApp({ projectId: DEMO_PROJECT_ID }, "admin-orders-smoke");
const adminFirestore = getAdminFirestore(adminApp);
const app = initializeApp({
  apiKey: "demo-key",
  appId: "1:1234567890:web:admin-orders-smoke",
  authDomain: `${DEMO_PROJECT_ID}.firebaseapp.com`,
  projectId: DEMO_PROJECT_ID
}, "admin-orders-smoke");
const auth = getAuth(app);
const firestore = getFirestore(app);
const functions = getFunctions(app, "southamerica-east1");
connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, {
  disableWarnings: true
});
connectFirestoreEmulator(firestore, EMULATOR_HOST, EMULATOR_PORTS.firestore);
connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions);

const updateStatus = httpsCallable(functions, "updateOrderStatus");
const base = {
  establishmentId: "mesa-flow-demo",
  orderId: "pedido-mesa-01-a"
};
const orderAPath = "establishments/mesa-flow-demo/orders/pedido-mesa-01-a";
const orderBPath = "establishments/mesa-flow-demo/orders/pedido-mesa-01-b";
const sessionPath = "establishments/mesa-flow-demo/tableSessions/sesion-mesa-01";
const metricPath = "establishments/mesa-flow-demo/dailyMetrics/2026-09-17";
const auditRequestIds = [
  "11111111111111111111111111111111",
  "22222222222222222222222222222222",
  "33333333333333333333333333333333",
  "34444444444444444444444444444444"
];
let originalOrderA;
let originalOrderB;
let originalSession;
let originalMetric;

try {
  const [orderA, orderB, sessionBefore, metricBefore] = await Promise.all([
    adminFirestore.doc(orderAPath).get(),
    adminFirestore.doc(orderBPath).get(),
    adminFirestore.doc(sessionPath).get(),
    adminFirestore.doc(metricPath).get()
  ]);
  assert.equal(orderA.exists, true);
  assert.equal(orderB.exists, true);
  assert.equal(sessionBefore.exists, true);
  assert.equal(metricBefore.exists, true);
  originalOrderA = orderA.data();
  originalOrderB = orderB.data();
  originalSession = sessionBefore.data();
  originalMetric = metricBefore.data();

  await signInWithEmailAndPassword(
    auth,
    "kitchen@mesaflow.example.invalid",
    "MesaFlowDemo31!"
  );
  await assert.rejects(updateStatus({
    establishmentId: "mesa-flow-demo",
    orderId: "pedido-mesa-01-b",
    expectedStatus: "created",
    nextStatus: "confirmed",
    requestId: "00000000000000000000000000000000"
  }), (error) => error?.code === "functions/permission-denied");

  const kitchenTransition = {
    ...base,
    expectedStatus: "preparing",
    nextStatus: "ready",
    requestId: "11111111111111111111111111111111"
  };
  const ready = await updateStatus(kitchenTransition);
  assert.equal(ready.data.orderId, base.orderId);
  assert.equal(ready.data.status, "ready");
  const retry = await updateStatus(kitchenTransition);
  assert.deepEqual(retry.data, ready.data);

  await signOut(auth);
  await signInWithEmailAndPassword(
    auth,
    "staff@mesaflow.example.invalid",
    "MesaFlowDemo31!"
  );
  const delivered = await updateStatus({
    ...base,
    expectedStatus: "ready",
    nextStatus: "delivered",
    requestId: "22222222222222222222222222222222"
  });
  assert.equal(delivered.data.status, "delivered");
  const cancelledRequestId = "33333333333333333333333333333333";
  const cancelled = await updateStatus({
    establishmentId: "mesa-flow-demo",
    orderId: "pedido-mesa-01-b",
    expectedStatus: "created",
    nextStatus: "cancelled",
    requestId: cancelledRequestId
  });
  assert.equal(cancelled.data.status, "cancelled");

  const order = await getDoc(doc(
    firestore, "establishments", "mesa-flow-demo", "orders", base.orderId
  ));
  assert.equal(order.data().status, "delivered");
  assert.ok(order.data().statusTimestamps.ready instanceof Timestamp);
  assert.ok(order.data().statusTimestamps.delivered instanceof Timestamp);
  const session = await getDoc(doc(
    firestore, "establishments", "mesa-flow-demo", "tableSessions", "sesion-mesa-01"
  ));
  assert.equal(session.data().subtotalMinor, 2270000);
  assert.equal(session.data().balanceMinor, 2270000);
  await signOut(auth);
  await signInWithEmailAndPassword(
    auth,
    "owner@mesaflow.example.invalid",
    "MesaFlowDemo31!"
  );
  const completedRequestId = "34444444444444444444444444444444";
  const completed = await updateStatus({
    ...base,
    expectedStatus: "delivered",
    nextStatus: "completed",
    requestId: completedRequestId
  });
  assert.equal(completed.data.status, "completed");
  const metric = await getDoc(doc(
    firestore, "establishments", "mesa-flow-demo", "dailyMetrics", "2026-09-17"
  ));
  assert.equal(metric.data().activeOrders, 1);
  assert.equal(metric.data().completedOrders, 2);
  assert.equal(metric.data().productQuantities["cafe-especial"], 0);
  for (const requestId of [
    kitchenTransition.requestId,
    "22222222222222222222222222222222",
    cancelledRequestId,
    completedRequestId
  ]) {
    const audit = await getDoc(doc(
      firestore,
      "establishments", "mesa-flow-demo", "auditLogs", `order-status-${requestId}`
    ));
    assert.equal(audit.exists(), true);
    assert.equal(audit.data().action, "order.status.changed");
  }
  console.log("[OK] Panel: transiciones de pedidos autorizadas, auditadas e idempotentes");
} catch (error) {
  console.error(`Smoke operativo del panel falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (auth.currentUser !== null) await signOut(auth);
  await deleteApp(app);
  if (originalOrderA && originalOrderB && originalSession && originalMetric) {
    const batch = adminFirestore.batch();
    batch.set(adminFirestore.doc(orderAPath), originalOrderA);
    batch.set(adminFirestore.doc(orderBPath), originalOrderB);
    batch.set(adminFirestore.doc(sessionPath), originalSession);
    batch.set(adminFirestore.doc(metricPath), originalMetric);
    for (const requestId of auditRequestIds) {
      batch.delete(adminFirestore.doc(
        `establishments/mesa-flow-demo/auditLogs/order-status-${requestId}`
      ));
    }
    await batch.commit();
  }
  await deleteAdminApp(adminApp);
}
