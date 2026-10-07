import assert from "node:assert/strict";

import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";

import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const establishmentId = "mesa-flow-demo";
const publicPath = `establishments/${establishmentId}/settings/public`;
const privatePath = `establishments/${establishmentId}/settings/private`;
const adminApp = initializeAdminApp({ projectId: DEMO_PROJECT_ID }, "admin-settings-smoke-cleanup");
const adminFirestore = getAdminFirestore(adminApp);
const originalPublic = await adminFirestore.doc(publicPath).get();
const originalPrivate = await adminFirestore.doc(privatePath).get();
const app = initializeApp({
  apiKey: "demo-key",
  appId: "1:1234567890:web:admin-settings-smoke",
  authDomain: `${DEMO_PROJECT_ID}.firebaseapp.com`,
  projectId: DEMO_PROJECT_ID
}, "admin-settings-smoke");
const auth = getAuth(app);
const firestore = getFirestore(app);
connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
connectFirestoreEmulator(firestore, EMULATOR_HOST, EMULATOR_PORTS.firestore);

try {
  await signInWithEmailAndPassword(auth, "owner@mesaflow.example.invalid", "MesaFlowDemo31!");
  const ownerBatch = writeBatch(firestore);
  ownerBatch.update(doc(firestore, publicPath), {
    brandName: "Bistró MesaFlow Configurado",
    orderingEnabled: false,
    updatedAt: serverTimestamp()
  });
  ownerBatch.update(doc(firestore, privatePath), {
    mercadoPagoEnabled: true,
    updatedAt: serverTimestamp()
  });
  await ownerBatch.commit();
  assert.equal((await getDoc(doc(firestore, publicPath))).data().orderingEnabled, false);

  await signOut(auth);
  await signInWithEmailAndPassword(auth, "manager@mesaflow.example.invalid", "MesaFlowDemo31!");
  await updateDoc(doc(firestore, publicPath), {
    assistanceEnabled: false,
    updatedAt: serverTimestamp()
  });

  await signOut(auth);
  await signInWithEmailAndPassword(auth, "staff@mesaflow.example.invalid", "MesaFlowDemo31!");
  await assert.rejects(updateDoc(doc(firestore, publicPath), {
    orderingEnabled: true,
    updatedAt: serverTimestamp()
  }), (error) => error?.code === "permission-denied");

  await signOut(auth);
  await signInAnonymously(auth);
  const publicSnapshot = await getDoc(doc(firestore, publicPath));
  assert.equal(publicSnapshot.data().brandName, "Bistró MesaFlow Configurado");
  await assert.rejects(
    getDoc(doc(firestore, privatePath)),
    (error) => error?.code === "permission-denied"
  );
  console.log("[OK] Panel: configuración pública/privada, horarios y RBAC administrativo");
} catch (error) {
  console.error(`Smoke de configuración del panel falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (auth.currentUser !== null) await signOut(auth);
  await deleteApp(app);
  const cleanup = adminFirestore.batch();
  if (originalPublic.exists) cleanup.set(adminFirestore.doc(publicPath), originalPublic.data());
  else cleanup.delete(adminFirestore.doc(publicPath));
  if (originalPrivate.exists) cleanup.set(adminFirestore.doc(privatePath), originalPrivate.data());
  else cleanup.delete(adminFirestore.doc(privatePath));
  await cleanup.commit();
  await deleteAdminApp(adminApp);
}
