import assert from "node:assert/strict";
import test from "node:test";

import {
  assertProductionFunctions,
  deployedFunctionNames
} from "./lib/production-functions-smoke.mjs";

test("normaliza el listado JSON de Functions sin depender de rutas completas", () => {
  const payload = { result: [
    { id: "health" },
    { name: "projects/p/locations/r/functions/createOrder" },
    { entryPoint: "manageTable" }
  ] };
  assert.deepEqual(deployedFunctionNames(payload), ["health", "createOrder", "manageTable"]);
});

test("el smoke informa Functions faltantes", () => {
  assert.equal(assertProductionFunctions(
    { result: [{ id: "health" }, { id: "createOrder" }] },
    ["health", "createOrder"]
  ).expected, 2);
  assert.throws(() => assertProductionFunctions(
    { result: [{ id: "health" }] },
    ["health", "createOrder"]
  ), /createOrder/u);
});
