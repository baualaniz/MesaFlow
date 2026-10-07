import assert from "node:assert/strict";

import { deleteApp as deleteAdminApp, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  sendPasswordResetEmail,
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

const establishmentId = "mesa-flow-demo";
const email = "team-smoke@mesaflow.example.invalid";
const ids = {
  invite: "71111111111111111111111111111111",
  managerOwner: "72222222222222222222222222222222",
  update: "73333333333333333333333333333333",
  escalate: "74444444444444444444444444444444",
  lastOwner: "75555555555555555555555555555555"
};
const adminApp = initializeAdminApp({ projectId: DEMO_PROJECT_ID }, "admin-team-smoke-cleanup");
const adminFirestore = getAdminFirestore(adminApp);
const adminAuth = getAdminAuth(adminApp);
const app = initializeApp({
  apiKey: "demo-key",
  appId: "1:1234567890:web:admin-team-smoke",
  authDomain: `${DEMO_PROJECT_ID}.firebaseapp.com`,
  projectId: DEMO_PROJECT_ID
}, "admin-team-smoke");
const auth = getAuth(app);
const functions = getFunctions(app, "southamerica-east1");
connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
connectFunctionsEmulator(functions, EMULATOR_HOST, EMULATOR_PORTS.functions);
const manageTeam = httpsCallable(functions, "manageTeam");
let invitedUid;

try {
  await signInWithEmailAndPassword(auth, "manager@mesaflow.example.invalid", "MesaFlowDemo31!");
  await assert.rejects(manageTeam({
    action: "invite",
    displayName: "Propietario indebido",
    email: "forbidden-owner@mesaflow.example.invalid",
    establishmentId,
    requestId: ids.managerOwner,
    role: "owner"
  }), (error) => error?.code === "functions/permission-denied");
  await assert.rejects(manageTeam({ action: "list", establishmentId: "otro-establecimiento" }),
    (error) => error?.code === "functions/permission-denied");

  await signOut(auth);
  await signInWithEmailAndPassword(auth, "owner@mesaflow.example.invalid", "MesaFlowDemo31!");
  const before = await manageTeam({ action: "list", establishmentId });
  assert.equal(before.data.members.length, 4);
  const invitation = {
    action: "invite",
    displayName: "Persona de prueba",
    email,
    establishmentId,
    requestId: ids.invite,
    role: "staff"
  };
  const invited = await manageTeam(invitation);
  const retry = await manageTeam(invitation);
  assert.deepEqual(retry.data, invited.data);
  invitedUid = invited.data.member.uid;
  assert.deepEqual(invited.data.member.permissions, ["orders.manage", "assistance.manage"]);
  await sendPasswordResetEmail(auth, email);

  const stored = await adminFirestore.doc(
    `establishments/${establishmentId}/members/${invitedUid}`
  ).get();
  assert.equal(stored.data().role, "staff");
  assert.equal(stored.data().active, true);

  await signOut(auth);
  await signInWithEmailAndPassword(auth, "manager@mesaflow.example.invalid", "MesaFlowDemo31!");
  const updated = await manageTeam({
    action: "update",
    active: false,
    establishmentId,
    expectedUpdatedAt: invited.data.member.updatedAt,
    requestId: ids.update,
    role: "kitchen",
    targetUid: invitedUid
  });
  assert.equal(updated.data.targetUid, invitedUid);
  await assert.rejects(manageTeam({
    action: "update",
    active: true,
    establishmentId,
    expectedUpdatedAt: updated.data.updatedAt,
    requestId: ids.escalate,
    role: "owner",
    targetUid: invitedUid
  }), (error) => error?.code === "functions/permission-denied");

  await signOut(auth);
  await signInWithEmailAndPassword(auth, "owner@mesaflow.example.invalid", "MesaFlowDemo31!");
  const ownerMembership = await adminFirestore.doc(
    `establishments/${establishmentId}/members/demo-owner`
  ).get();
  await assert.rejects(manageTeam({
    action: "update",
    active: false,
    establishmentId,
    expectedUpdatedAt: ownerMembership.data().updatedAt.toDate().toISOString(),
    requestId: ids.lastOwner,
    role: "owner",
    targetUid: "demo-owner"
  }), (error) => error?.code === "functions/failed-precondition");

  const after = await manageTeam({ action: "list", establishmentId });
  assert.equal(after.data.members.some(({ uid, role, active }) =>
    uid === invitedUid && role === "kitchen" && active === false), true);
  console.log("[OK] Panel: invitación, roles derivados, límites de manager y último owner protegidos");
} catch (error) {
  console.error(`Smoke de equipo del panel falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (auth.currentUser !== null) await signOut(auth);
  await deleteApp(app);
  if (!invitedUid) {
    try { invitedUid = (await adminAuth.getUserByEmail(email)).uid; } catch { /* no account to clean */ }
  }
  const cleanup = adminFirestore.batch();
  if (invitedUid) {
    cleanup.delete(adminFirestore.doc(`establishments/${establishmentId}/members/${invitedUid}`));
    cleanup.delete(adminFirestore.doc(`users/${invitedUid}`));
  }
  for (const requestId of Object.values(ids)) {
    cleanup.delete(adminFirestore.doc(`establishments/${establishmentId}/auditLogs/team-action-${requestId}`));
  }
  await cleanup.commit();
  if (invitedUid) {
    try { await adminAuth.deleteUser(invitedUid); } catch (error) {
      if (error?.code !== "auth/user-not-found") throw error;
    }
  }
  await deleteAdminApp(adminApp);
}
