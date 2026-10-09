import assert from "node:assert/strict";
import test from "node:test";

import {
  safeErrorDetails,
  shouldEnforceAppCheck
} from "../lib/security.js";

test("App Check se exige fuera del emulador", () => {
  assert.equal(shouldEnforceAppCheck({}), true);
  assert.equal(shouldEnforceAppCheck({ FUNCTIONS_EMULATOR: "false" }), true);
  assert.equal(shouldEnforceAppCheck({ FUNCTIONS_EMULATOR: "TRUE" }), true);
});

test("solo el emulador oficial omite App Check", () => {
  assert.equal(shouldEnforceAppCheck({ FUNCTIONS_EMULATOR: "true" }), false);
});

test("los detalles seguros nunca exponen mensaje, stack ni token", () => {
  const error = new Error("Access token APP_USR-super-secreto");
  error.stack = "stack con credencial";
  assert.deepEqual(safeErrorDetails(error), { errorName: "Error" });
  assert.deepEqual(safeErrorDetails({ token: "secreto" }), { errorName: "UnknownError" });

  const malicious = new Error("dato privado");
  malicious.name = "Bad\nInjected=secret";
  assert.deepEqual(safeErrorDetails(malicious), { errorName: "Error" });
});
