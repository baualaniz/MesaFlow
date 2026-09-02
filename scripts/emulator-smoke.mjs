import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { assertLocalEmulatorEnvironment, DEMO_PROJECT_ID, EMULATOR_HOST, EMULATOR_PORTS } from "./lib/emulator-config.mjs";

// Validate before building requests; never infer a cloud endpoint as fallback.
assertLocalEmulatorEnvironment(process.env);
const authBase = `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}/identitytoolkit.googleapis.com/v1`;
const firestoreBase = `http://${EMULATOR_HOST}:${EMULATOR_PORTS.firestore}/v1/projects/${DEMO_PROJECT_ID}/databases/(default)/documents`;
const fixtureId = randomUUID();
const documentUrl = `${firestoreBase}/emulatorSmokeTests/${fixtureId}`;
const blockedUrl = `${firestoreBase}/emulatorSmokeTests/${fixtureId}-blocked`;
const tokensToDelete = [];
const adminHeaders = { Authorization: "Bearer owner" }; // Emulator-only administrative credential.

async function request(url, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  return { status: response.status, data: await response.json() };
}

async function createUser(body) {
  const result = await request(`${authBase}/accounts:signUp?key=demo-key`, {
    method: "POST", body: { ...body, returnSecureToken: true }
  });
  assert.equal(result.status, 200, "Authentication debe aceptar el alta local");
  assert.equal(typeof result.data.idToken, "string");
  tokensToDelete.push(result.data.idToken);
  return result.data;
}

function assertDenied(result) {
  assert.equal(result.status, 403, "Las reglas cerradas deben responder 403");
  assert.equal(result.data.error?.status, "PERMISSION_DENIED");
}

try {
  const guest = await createUser({});
  console.log("[OK] Authentication: sesión anónima local");

  const email = `smoke-${fixtureId}@example.test`;
  const password = `Local-${randomUUID()}!`;
  const member = await createUser({ email, password });
  const login = await request(`${authBase}/accounts:signInWithPassword?key=demo-key`, {
    method: "POST", body: { email, password, returnSecureToken: true }
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.localId, member.localId);
  console.log("[OK] Authentication: alta e ingreso con email/password local");

  const fixture = { fields: { purpose: { stringValue: "emulator-smoke" } } };
  const write = await request(documentUrl, { method: "PATCH", headers: adminHeaders, body: fixture });
  assert.equal(write.status, 200, "La administración del emulador debe poder escribir");
  const read = await request(documentUrl, { headers: adminHeaders });
  assert.equal(read.status, 200);
  assert.equal(read.data.fields.purpose.stringValue, "emulator-smoke");
  console.log("[OK] Firestore: escritura y lectura administrativa local");

  assertDenied(await request(documentUrl));
  assertDenied(await request(documentUrl, { headers: { Authorization: `Bearer ${guest.idToken}` } }));
  assertDenied(await request(blockedUrl, { method: "PATCH", body: fixture }));
  assertDenied(await request(blockedUrl, {
    method: "PATCH", body: fixture, headers: { Authorization: `Bearer ${member.idToken}` }
  }));
  console.log("[OK] Firestore: lecturas/escrituras de clientes rechazadas con y sin sesión");
} catch (error) {
  console.error(`Smoke test falló: ${error.message}`);
  process.exitCode = 1;
} finally {
  // Remove only fixtures created by this run. Never flush an entire emulator.
  try {
    for (const url of [documentUrl, blockedUrl]) {
      const result = await request(url, { method: "DELETE", headers: adminHeaders });
      assert.ok([200, 404].includes(result.status), "No se pudo limpiar el documento de prueba");
    }
    for (const idToken of tokensToDelete) {
      const result = await request(`${authBase}/accounts:delete?key=demo-key`, {
        method: "POST", body: { idToken }
      });
      assert.equal(result.status, 200, "No se pudo eliminar el usuario de prueba");
    }
    console.log("[OK] Datos y usuarios temporales de esta prueba eliminados");
  } catch (error) {
    console.error(`Limpieza local falló: ${error.message}`);
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log("Smoke test de emuladores aprobado.");
