import assert from "node:assert/strict";

import {
  assertLocalEmulatorEnvironment,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const endpoint =
  `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}` +
  "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key";
const resetEndpoint =
  `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}` +
  "/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-key";

async function signIn(password) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "owner@mesaflow.example.invalid",
      password,
      returnSecureToken: true
    }),
    signal: AbortSignal.timeout(15000)
  });
  return { status: response.status, body: await response.json() };
}

try {
  const valid = await signIn("MesaFlowDemo31!");
  assert.equal(valid.status, 200);
  assert.equal(valid.body.localId, "demo-owner");
  assert.equal(typeof valid.body.idToken, "string");
  const invalid = await signIn("contraseña-incorrecta");
  assert.equal(invalid.status, 400);
  assert.equal(typeof invalid.body.error?.message, "string");
  const reset = await fetch(resetEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestType: "PASSWORD_RESET",
      email: "owner@mesaflow.example.invalid"
    }),
    signal: AbortSignal.timeout(15000)
  });
  assert.equal(reset.status, 200);
  console.log(
    "[OK] Panel: login válido, contraseña incorrecta rechazada y recuperación disponible"
  );
} catch (error) {
  console.error(`Smoke de autenticación del panel falló: ${error.message}`);
  process.exitCode = 1;
}
