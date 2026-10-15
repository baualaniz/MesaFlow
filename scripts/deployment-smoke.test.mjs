import assert from "node:assert/strict";
import test from "node:test";

import {
  DEVELOPMENT_SMOKE_PLAN,
  PRODUCTION_SMOKE_PLAN,
  validateSmokeResponse
} from "./lib/deployment-smoke.mjs";

test("el smoke cubre raíces, rutas SPA y 404 sin producción", () => {
  assert.equal(DEVELOPMENT_SMOKE_PLAN.length, 6);
  assert.ok(DEVELOPMENT_SMOKE_PLAN.every(({ url }) =>
    url.startsWith("https://mesaflow-desarrollo") && !url.includes("produccion")));
  assert.equal(DEVELOPMENT_SMOKE_PLAN.at(-1).status, 404);
});

test("el smoke productivo usa solo sus tres sitios y conserva rutas profundas", () => {
  assert.equal(PRODUCTION_SMOKE_PLAN.length, 6);
  assert.ok(PRODUCTION_SMOKE_PLAN.every(({ url }) =>
    url.startsWith("https://mesaflow-produccion") && !url.includes("desarrollo")));
  assert.equal(PRODUCTION_SMOKE_PLAN.at(-1).status, 404);
});

test("acepta una respuesta endurecida de cliente", async () => {
  const response = new Response("<!DOCTYPE html><title>MesaFlow</title>", {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'; script-src https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
      "cache-control": "no-cache, no-store, must-revalidate"
    }
  });
  await assert.doesNotReject(() => validateSmokeResponse(
    DEVELOPMENT_SMOKE_PLAN[0],
    response
  ));
});

test("rechaza estados, CSP o caché debilitados", async () => {
  const weak = new Response("<!DOCTYPE html>", {
    status: 200,
    headers: { "content-type": "text/html" }
  });
  await assert.rejects(
    () => validateSmokeResponse(DEVELOPMENT_SMOKE_PLAN[2], weak),
    /CSP/u
  );
});
