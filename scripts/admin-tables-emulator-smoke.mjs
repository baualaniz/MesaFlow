import assert from "node:assert/strict";

import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";

import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const ids = {
  staffDenied: "40000000000000000000000000000000",
  create: "41111111111111111111111111111111",
  update: "42222222222222222222222222222222",
  delete: "43333333333333333333333333333333",
  open: "44444444444444444444444444444444",
  rotate: "45555555555555555555555555555555",
  close: "46666666666666666666666666666666"
};
const auditIds = Object.values(ids).map((id) => `table-action-${id}`);
const openedSessionId = `session-${ids.open}`;
const oldMesaOneToken = "6d657361666c6f772d64656d6f2d3031";
const tableIds = Array.from({ length: 10 }, (_, index) => `mesa-${String(index + 1).padStart(2, "0")}`);
const tokens = new Map(tableIds.map((tableId, index) => [
  tableId,
  Buffer.alloc(32, index + 1).toString("base64url")
]));

function clientApp(name) {
  const app = initializeApp({
    apiKey: "demo-key",
    appId: `1:1234567890:web:${name}`,
    authDomain: `${DEMO_PROJECT_ID}.firebaseapp.com`,
    projectId: DEMO_PROJECT_ID
  }, name);
  const auth = getAuth(app);
  const functions = getFunctions(app, "southamerica-east1");
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
  connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions);
  return { app, auth, functions };
}

const adminApp = initializeAdminApp({ projectId: DEMO_PROJECT_ID }, "admin-tables-smoke");
const firestore = getAdminFirestore(adminApp);
const adminAuth = getAdminAuth(adminApp);
const operator = clientApp("admin-tables-operator");
const guestApps = [];
const guestUids = [];
let originalTables = [];

async function exchange(tableId, token, shouldPass) {
  const guest = clientApp(`table-guest-${tableId}-${guestApps.length}`);
  guestApps.push(guest);
  const credential = await signInAnonymously(guest.auth);
  guestUids.push(credential.user.uid);
  const callable = httpsCallable(guest.functions, "exchangeQrSession");
  const promise = callable({ establishmentSlug: "mesa-flow-demo", tableId, token });
  if (shouldPass) {
    const response = await promise;
    assert.equal(response.data.tableId, tableId);
  } else {
    await assert.rejects(promise, (error) => error?.code === "functions/permission-denied");
  }
}

try {
  originalTables = await Promise.all(tableIds.map(async (tableId) => {
    const snapshot = await firestore.doc(`establishments/mesa-flow-demo/tables/${tableId}`).get();
    assert.equal(snapshot.exists, true);
    return [tableId, snapshot.data()];
  }));
  const manageTable = httpsCallable(operator.functions, "manageTable");

  await signInWithEmailAndPassword(operator.auth, "staff@mesaflow.example.invalid", "MesaFlowDemo31!");
  await assert.rejects(manageTable({
    action: "openSession",
    establishmentId: "mesa-flow-demo",
    requestId: ids.staffDenied,
    tableId: "mesa-04"
  }), (error) => error?.code === "functions/permission-denied");

  await signOut(operator.auth);
  await signInWithEmailAndPassword(operator.auth, "owner@mesaflow.example.invalid", "MesaFlowDemo31!");
  const tableElevenToken = Buffer.alloc(32, 11).toString("base64url");
  const created = await manageTable({
    action: "create",
    establishmentId: "mesa-flow-demo",
    name: "Mesa temporal",
    number: 11,
    requestId: ids.create,
    token: tableElevenToken
  });
  assert.equal(created.data.tableId, "mesa-11");
  const updated = await manageTable({
    action: "update",
    active: false,
    establishmentId: "mesa-flow-demo",
    expectedUpdatedAt: created.data.updatedAt,
    name: "Mesa temporal editada",
    number: 11,
    requestId: ids.update,
    tableId: "mesa-11"
  });
  await manageTable({
    action: "delete",
    establishmentId: "mesa-flow-demo",
    expectedUpdatedAt: updated.data.updatedAt,
    requestId: ids.delete,
    tableId: "mesa-11"
  });

  const opened = await manageTable({
    action: "openSession",
    establishmentId: "mesa-flow-demo",
    requestId: ids.open,
    tableId: "mesa-03"
  });
  assert.equal(opened.data.sessionId, openedSessionId);

  const rotated = await manageTable({
    action: "rotateManyQrs",
    entries: tableIds.map((tableId) => ({
      expectedQrVersion: 1,
      tableId,
      token: tokens.get(tableId)
    })),
    establishmentId: "mesa-flow-demo",
    requestId: ids.rotate
  });
  assert.equal(rotated.data.tables.length, 10);
  assert.ok(rotated.data.tables.every(({ qrVersion }) => qrVersion === 2));

  await exchange("mesa-01", oldMesaOneToken, false);
  await exchange("mesa-01", tokens.get("mesa-01"), true);
  await exchange("mesa-03", tokens.get("mesa-03"), true);

  const closed = await manageTable({
    action: "closeSession",
    establishmentId: "mesa-flow-demo",
    requestId: ids.close,
    sessionId: openedSessionId,
    tableId: "mesa-03"
  });
  assert.equal(closed.data.sessionId, openedSessionId);
  console.log("[OK] Panel: CRUD de mesas, sesiones, 10 rotaciones QR e invalidación anterior");
} catch (error) {
  console.error(`Smoke de mesas del panel falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (operator.auth.currentUser !== null) await signOut(operator.auth);
  await deleteApp(operator.app);
  for (const guest of guestApps) {
    if (guest.auth.currentUser !== null) await signOut(guest.auth);
    await deleteApp(guest.app);
  }

  const cleanup = firestore.batch();
  for (const [tableId, data] of originalTables) {
    cleanup.set(firestore.doc(`establishments/mesa-flow-demo/tables/${tableId}`), data);
  }
  cleanup.delete(firestore.doc("establishments/mesa-flow-demo/tables/mesa-11"));
  for (const auditId of auditIds) {
    cleanup.delete(firestore.doc(`establishments/mesa-flow-demo/auditLogs/${auditId}`));
  }
  for (const uid of guestUids) {
    cleanup.delete(firestore.doc(`establishments/mesa-flow-demo/tableSessions/sesion-mesa-01/participants/${uid}`));
    cleanup.delete(firestore.doc(`establishments/mesa-flow-demo/tableSessions/${openedSessionId}/participants/${uid}`));
  }
  const exchanges = guestUids.length === 0
    ? { docs: [] }
    : await firestore.collection("establishments/mesa-flow-demo/qrExchanges")
      .where("uid", "in", guestUids).get();
  for (const document of exchanges.docs) cleanup.delete(document.ref);
  cleanup.delete(firestore.doc(`establishments/mesa-flow-demo/tableSessions/${openedSessionId}`));
  await cleanup.commit();
  if (guestUids.length > 0) await adminAuth.deleteUsers(guestUids);
  await deleteAdminApp(adminApp);
}
