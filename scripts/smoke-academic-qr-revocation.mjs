import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  Timestamp,
  doc,
  getDocFromServer,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc
} from "firebase/firestore";

const require = createRequire(import.meta.url);
const production = process.argv.includes("--production");
const unsupportedArguments = process.argv.slice(2).filter((argument) => argument !== "--production");
assert.equal(unsupportedArguments.length, 0, `Argumentos no reconocidos: ${unsupportedArguments.join(", ")}`);
const options = production ? {
  apiKey: "AIzaSyCzaBZamhGrf0Ni1Ws4AyFJl8aj7odrYV0",
  appId: "1:619377674437:web:3643ee20e7c37954a288ac",
  authDomain: "mesaflow-produccion.firebaseapp.com",
  projectId: "mesaflow-produccion"
} : {
  apiKey: "AIzaSyAFqyTsyBx5H5nebCVXhJ_vDh0khaqxNbs",
  appId: "1:685584709099:web:2d9cac26a22fbdcae815ae",
  authDomain: "mesaflow-desarrollo.firebaseapp.com",
  projectId: "mesaflow-desarrollo"
};
const output = new URL(
  production ? "../dist/academic-firebase-production/" : "../dist/academic-firebase/",
  import.meta.url
);
const customerHost = production
  ? "https://mesaflow-produccion.web.app"
  : "https://mesaflow-desarrollo.web.app";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

try {
  const linksText = await readFile(new URL("enlaces-qr.txt", output), "utf8");
  const linkLines = linksText.trim().split(/\r?\n/u);
  const oldUrl = new URL(linkLines.find((line) => line.startsWith("mesa-01: "))?.slice(9) ?? "");
  const oldToken = oldUrl.searchParams.get("token");
  assert.ok(oldToken);
  const oldHash = sha256(oldToken);

  const customerApp = initializeApp(options, "revocation-customer");
  const customerAuth = getAuth(customerApp);
  const customerDb = getFirestore(customerApp);
  const customer = (await signInAnonymously(customerAuth)).user;
  const root = doc(customerDb, "establishments", "mesa-flow-demo");
  const qr = await getDocFromServer(doc(root, "qrAccess", oldHash));
  const sessionId = qr.data()?.sessionId;
  assert.equal(typeof sessionId, "string");
  await setDoc(doc(root, "tableSessions", sessionId, "participants", customer.uid), {
    active: true,
    establishmentId: "mesa-flow-demo",
    joinedAt: serverTimestamp(),
    qrHash: oldHash,
    qrVersion: qr.data()?.qrVersion,
    revokedAt: null,
    sessionId,
    tableId: "mesa-01",
    uid: customer.uid
  });
  assert.equal((await getDocFromServer(doc(root, "tableSessions", sessionId))).data()?.status, "open");

  const credentials = await readFile(new URL("acceso-panel.txt", output), "utf8");
  const email = credentials.match(/^Email: (.+)$/mu)?.[1];
  const password = credentials.match(/^Contraseña: (.+)$/mu)?.[1];
  assert.ok(email && password);
  const adminApp = initializeApp(options, "revocation-admin");
  const adminAuth = getAuth(adminApp);
  const adminDb = getFirestore(adminApp);
  await signInWithEmailAndPassword(adminAuth, email, password);

  const newToken = randomBytes(32).toString("base64url");
  const newHash = sha256(newToken);
  await runTransaction(adminDb, async (transaction) => {
    const tableReference = doc(
      adminDb, "establishments", "mesa-flow-demo", "tables", "mesa-01"
    );
    const table = (await transaction.get(tableReference)).data();
    assert.ok(table);
    assert.equal(table.qrTokenHash, oldHash);
    const updatedAt = Timestamp.now();
    transaction.update(doc(
      adminDb, "establishments", "mesa-flow-demo", "qrAccess", oldHash
    ), { active: false, updatedAt });
    transaction.set(doc(
      adminDb, "establishments", "mesa-flow-demo", "qrAccess", newHash
    ), {
      active: true,
      createdAt: updatedAt,
      establishmentId: "mesa-flow-demo",
      establishmentSlug: "mesa-flow-demo",
      qrVersion: table.qrVersion + 1,
      sessionId: table.currentSessionId,
      tableId: "mesa-01",
      tableName: table.name,
      updatedAt
    });
    transaction.update(tableReference, {
      qrTokenHash: newHash,
      qrVersion: table.qrVersion + 1,
      updatedAt
    });
  });

  await assert.rejects(
    getDocFromServer(doc(root, "tableSessions", sessionId)),
    (error) => error?.code === "permission-denied"
  );
  await assert.rejects(
    getDocFromServer(doc(root, "qrAccess", oldHash)),
    (error) => error?.code === "permission-denied"
  );

  const newUrl = `${customerHost}/e/mesa-flow-demo/table/mesa-01?token=${newToken}`;
  const updatedLinks = linkLines.map((line) =>
    line.startsWith("mesa-01: ") ? `mesa-01: ${newUrl}` : line
  );
  await writeFile(new URL("enlaces-qr.txt", output), `${updatedLinks.join("\n")}\n`, "utf8");
  const qrcode = require("qrcode");
  await qrcode.toFile(fileURLToPath(new URL("mesa-01.png", output)), newUrl, {
    errorCorrectionLevel: "H",
    margin: 3,
    width: 1024
  });

  await signOut(customerAuth);
  await signOut(adminAuth);
  await Promise.all([deleteApp(customerApp), deleteApp(adminApp)]);
  console.log("[OK] QR anterior revocado inmediatamente tras la rotación.");
  console.log("[OK] La sesión ya abierta con el QR anterior perdió acceso.");
  console.log(`[OK] QR vigente de Mesa 1 actualizado en ${
    production ? "dist/academic-firebase-production" : "dist/academic-firebase"
  }.`);
  console.log(`Destino verificado: ${production ? "mesaflow-produccion" : "mesaflow-desarrollo"}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falló la prueba de revocación.");
  process.exitCode = 1;
}
