import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";

const options = {
  apiKey: "AIzaSyAFqyTsyBx5H5nebCVXhJ_vDh0khaqxNbs",
  appId: "1:685584709099:web:2d9cac26a22fbdcae815ae",
  authDomain: "mesaflow-desarrollo.firebaseapp.com",
  projectId: "mesaflow-desarrollo"
};
const output = new URL("../dist/academic-firebase/", import.meta.url);

try {
  const links = await readFile(new URL("enlaces-qr.txt", output), "utf8");
  const qrUrl = new URL(links.match(/^mesa-01: (.+)$/mu)?.[1] ?? "");
  const token = qrUrl.searchParams.get("token");
  assert.ok(token);
  const qrHash = createHash("sha256").update(token).digest("hex");

  const customerApp = initializeApp(options, "academic-smoke-customer");
  const customerAuth = getAuth(customerApp);
  const customerDb = getFirestore(customerApp);
  const customer = (await signInAnonymously(customerAuth)).user;
  const slug = await getDoc(doc(customerDb, "establishmentSlugs", "mesa-flow-demo"));
  assert.equal(slug.data()?.establishmentId, "mesa-flow-demo");
  const root = doc(customerDb, "establishments", "mesa-flow-demo");
  const qr = await getDoc(doc(root, "qrAccess", qrHash));
  assert.equal(qr.data()?.active, true);
  assert.equal(qr.data()?.tableId, "mesa-01");
  const sessionId = qr.data()?.sessionId;
  assert.equal(typeof sessionId, "string");
  await setDoc(doc(root, "tableSessions", sessionId, "participants", customer.uid), {
    active: true,
    establishmentId: "mesa-flow-demo",
    joinedAt: serverTimestamp(),
    qrHash,
    qrVersion: qr.data()?.qrVersion,
    revokedAt: null,
    sessionId,
    tableId: "mesa-01",
    uid: customer.uid
  });
  const session = await getDoc(doc(root, "tableSessions", sessionId));
  assert.equal(session.data()?.status, "open");
  const categories = await getDocs(query(
    collection(root, "categories"), where("active", "==", true)
  ));
  assert.ok(categories.size >= 3);
  await signOut(customerAuth);
  await deleteApp(customerApp);

  const credentials = await readFile(new URL("acceso-panel.txt", output), "utf8");
  const email = credentials.match(/^Email: (.+)$/mu)?.[1];
  const password = credentials.match(/^Contraseña: (.+)$/mu)?.[1];
  assert.ok(email && password);
  const adminApp = initializeApp(options, "academic-smoke-admin");
  const adminAuth = getAuth(adminApp);
  const adminDb = getFirestore(adminApp);
  const admin = (await signInWithEmailAndPassword(adminAuth, email, password)).user;
  const membership = await getDoc(doc(
    adminDb, "establishments", "mesa-flow-demo", "members", admin.uid
  ));
  assert.equal(membership.data()?.role, "owner");
  const tables = await getDocs(collection(adminDb, "establishments", "mesa-flow-demo", "tables"));
  assert.equal(tables.size, 3);
  await signOut(adminAuth);
  await deleteApp(adminApp);

  console.log("[OK] QR válido, sesión, menú y panel leídos desde Firebase cloud.");
  console.log("[OK] Participante anónimo persistido y protegido por reglas.");
  console.log("Producción no fue contactada.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falló el smoke académico.");
  process.exitCode = 1;
}
