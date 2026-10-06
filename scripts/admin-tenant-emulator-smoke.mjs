import assert from "node:assert/strict";

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
  getFirestore
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
  appId: "1:1234567890:web:admin-tenant-smoke",
  authDomain: `${DEMO_PROJECT_ID}.firebaseapp.com`,
  projectId: DEMO_PROJECT_ID
}, "admin-tenant-smoke");
const auth = getAuth(app);
const firestore = getFirestore(app);
connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, {
  disableWarnings: true
});
connectFirestoreEmulator(firestore, EMULATOR_HOST, EMULATOR_PORTS.firestore);

try {
  const credential = await signInWithEmailAndPassword(
    auth,
    "owner@mesaflow.example.invalid",
    "MesaFlowDemo31!"
  );
  assert.equal(credential.user.uid, "demo-owner");

  const profile = await getDoc(doc(firestore, "users", credential.user.uid));
  assert.equal(profile.exists(), true);
  assert.deepEqual(profile.data().establishmentIds, ["mesa-flow-demo"]);

  const establishmentId = profile.data().establishmentIds[0];
  const [membership, establishment] = await Promise.all([
    getDoc(doc(firestore, "establishments", establishmentId, "members", credential.user.uid)),
    getDoc(doc(firestore, "establishments", establishmentId))
  ]);
  assert.equal(membership.exists(), true);
  assert.equal(membership.data().active, true);
  assert.equal(membership.data().role, "owner");
  assert.equal(establishment.exists(), true);
  assert.equal(establishment.data().active, true);
  assert.equal(establishment.data().name, "Bistró MesaFlow");
  console.log("[OK] Panel: perfil, membresía y establecimiento activo resueltos con reglas reales");
} catch (error) {
  console.error(`Smoke de tenant administrativo falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (auth.currentUser !== null) await signOut(auth);
  await deleteApp(app);
}
