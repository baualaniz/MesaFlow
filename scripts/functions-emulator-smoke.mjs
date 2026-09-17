import assert from "node:assert/strict";
import {
  assertLocalEmulatorEnvironment,
  DEMO_PROJECT_ID,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const endpoint =
  `http://${EMULATOR_HOST}:${EMULATOR_PORTS.functions}/${DEMO_PROJECT_ID}` +
  "/southamerica-east1/health";

async function call(method) {
  return fetch(endpoint, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
}

try {
  const get = await call("GET");
  assert.equal(get.status, 200);
  assert.match(get.headers.get("content-type") ?? "", /^application\/json/);
  assert.deepEqual(await get.json(), {
    status: "ok",
    service: "mesaflow-functions",
    version: 1
  });

  const head = await call("HEAD");
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  const post = await call("POST");
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");

  console.log("[OK] Functions: health GET/HEAD aprobado y métodos mutables rechazados");
} catch (error) {
  console.error(`Smoke test de Functions falló: ${error.message}`);
  process.exitCode = 1;
}
