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
  Timestamp,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const establishmentId = "mesa-flow-demo";
const categoryId = "categoria-smoke-catalogo";
const productId = "producto-smoke-catalogo";
const categoryPath = `establishments/${establishmentId}/categories/${categoryId}`;
const productPath = `establishments/${establishmentId}/products/${productId}`;
const adminApp = initializeAdminApp({ projectId: DEMO_PROJECT_ID }, "admin-catalog-smoke-cleanup");
const adminFirestore = getAdminFirestore(adminApp);
const app = initializeApp({
  apiKey: "demo-key",
  appId: "1:1234567890:web:admin-catalog-smoke",
  authDomain: `${DEMO_PROJECT_ID}.firebaseapp.com`,
  projectId: DEMO_PROJECT_ID
}, "admin-catalog-smoke");
const auth = getAuth(app);
const firestore = getFirestore(app);
connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
connectFirestoreEmulator(firestore, EMULATOR_HOST, EMULATOR_PORTS.firestore);

async function publishedProductIds() {
  const snapshot = await getDocs(query(
    collection(firestore, "establishments", establishmentId, "products"),
    where("categoryId", "==", categoryId),
    where("active", "==", true),
    where("available", "==", true),
    orderBy("sortOrder", "asc")
  ));
  return snapshot.docs.map(({ id }) => id);
}

try {
  await signInWithEmailAndPassword(auth, "owner@mesaflow.example.invalid", "MesaFlowDemo31!");
  const createdAt = Timestamp.now();
  await setDoc(doc(firestore, categoryPath), {
    establishmentId,
    name: "Especiales de prueba",
    description: "Categoría temporal para validar el catálogo.",
    sortOrder: 990,
    active: true,
    createdAt,
    updatedAt: createdAt
  });
  await setDoc(doc(firestore, productPath), {
    establishmentId,
    categoryId,
    name: "Producto temporal",
    description: "Producto visible en el menú del cliente.",
    priceMinor: 125000,
    currency: "ARS",
    imagePath: "menu.bowl-estacion",
    available: true,
    active: true,
    sortOrder: 990,
    createdAt,
    updatedAt: createdAt
  });

  await signOut(auth);
  await signInAnonymously(auth);
  assert.deepEqual(await publishedProductIds(), [productId]);

  await signOut(auth);
  await signInWithEmailAndPassword(auth, "staff@mesaflow.example.invalid", "MesaFlowDemo31!");
  await updateDoc(doc(firestore, productPath), { available: false, updatedAt: Timestamp.now() });
  await assert.rejects(
    updateDoc(doc(firestore, productPath), { name: "Cambio indebido", updatedAt: Timestamp.now() }),
    (error) => error?.code === "permission-denied"
  );

  await signOut(auth);
  await signInAnonymously(auth);
  assert.deepEqual(await publishedProductIds(), []);

  await signOut(auth);
  await signInWithEmailAndPassword(auth, "owner@mesaflow.example.invalid", "MesaFlowDemo31!");
  await deleteDoc(doc(firestore, productPath));
  await deleteDoc(doc(firestore, categoryPath));
  console.log("[OK] Panel: CRUD de catálogo, disponibilidad operativa y publicación al cliente");
} catch (error) {
  console.error(`Smoke de catálogo del panel falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (auth.currentUser !== null) await signOut(auth);
  await deleteApp(app);
  const cleanup = adminFirestore.batch();
  cleanup.delete(adminFirestore.doc(productPath));
  cleanup.delete(adminFirestore.doc(categoryPath));
  await cleanup.commit();
  await deleteAdminApp(adminApp);
}
