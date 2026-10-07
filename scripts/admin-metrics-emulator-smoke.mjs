import assert from "node:assert/strict";

import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query
} from "firebase/firestore";

import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const app = initializeApp({
  apiKey: "demo-key",
  appId: "1:1234567890:web:admin-metrics-smoke",
  authDomain: `${DEMO_PROJECT_ID}.firebaseapp.com`,
  projectId: DEMO_PROJECT_ID
}, "admin-metrics-smoke");
const auth = getAuth(app);
const firestore = getFirestore(app);
connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, {
  disableWarnings: true
});
connectFirestoreEmulator(firestore, EMULATOR_HOST, EMULATOR_PORTS.firestore);

const metricsQuery = query(
  collection(firestore, "establishments", "mesa-flow-demo", "dailyMetrics"),
  orderBy("date", "desc"),
  limit(7)
);

try {
  await signInWithEmailAndPassword(
    auth,
    "owner@mesaflow.example.invalid",
    "MesaFlowDemo31!"
  );
  const ownerMetrics = await getDocs(metricsQuery);
  assert.equal(ownerMetrics.size, 1);
  assert.equal(ownerMetrics.docs[0].id, "2026-09-17");
  assert.equal(ownerMetrics.docs[0].data().salesMinor, 620000);
  assert.equal(ownerMetrics.docs[0].data().approvedPayments, 1);

  await signOut(auth);
  await signInWithEmailAndPassword(
    auth,
    "staff@mesaflow.example.invalid",
    "MesaFlowDemo31!"
  );
  await assert.rejects(getDocs(metricsQuery), (error) => error?.code === "permission-denied");
  console.log("[OK] Panel: dashboard diario acotado y métricas reservadas a administración");
} catch (error) {
  console.error(`Smoke de métricas del panel falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (auth.currentUser !== null) await signOut(auth);
  await deleteApp(app);
}
