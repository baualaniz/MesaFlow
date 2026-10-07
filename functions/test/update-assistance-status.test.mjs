import assert from "node:assert/strict";
import test from "node:test";

import {
  UpdateAssistanceStatusError,
  updateAssistanceStatus
} from "../lib/update-assistance-status.js";

const now = new Date("2026-10-07T15:00:00.000Z");
const input = Object.freeze({
  establishmentId: "mesa-flow-demo",
  expectedStatus: "pending",
  nextStatus: "acknowledged",
  operationId: "0123456789abcdef0123456789abcdef",
  requestId: "sesion-mesa-01"
});

function repository() {
  const calls = [];
  return {
    calls,
    async transition(command) {
      calls.push(command);
      return {
        requestId: command.requestId,
        status: command.nextStatus,
        updatedAt: command.updatedAt.toISOString()
      };
    }
  };
}

test("normaliza la transición autenticada sin confiar en el rol del cliente", async () => {
  const repo = repository();
  const result = await updateAssistanceStatus(input, "demo-staff", repo, now);
  assert.equal(repo.calls.length, 1);
  assert.equal(repo.calls[0].actorUid, "demo-staff");
  assert.equal(repo.calls[0].expectedStatus, "pending");
  assert.equal(result.status, "acknowledged");
});

test("admite únicamente atender y resolver en ese orden", async () => {
  const repo = repository();
  await updateAssistanceStatus({
    ...input,
    expectedStatus: "acknowledged",
    nextStatus: "resolved"
  }, "demo-staff", repo, now);
  for (const invalid of [
    { ...input, nextStatus: "resolved" },
    { ...input, expectedStatus: "resolved", nextStatus: "pending" }
  ]) {
    await assert.rejects(
      updateAssistanceStatus(invalid, "demo-staff", repository(), now),
      (error) => error instanceof UpdateAssistanceStatusError &&
        error.code === "invalid-argument"
    );
  }
});

test("rechaza identidad ausente y campos de autorización del cliente", async () => {
  await assert.rejects(
    updateAssistanceStatus(input, undefined, repository(), now),
    (error) => error instanceof UpdateAssistanceStatusError &&
      error.code === "unauthenticated"
  );
  await assert.rejects(
    updateAssistanceStatus({ ...input, role: "owner" }, "demo-staff", repository(), now),
    (error) => error instanceof UpdateAssistanceStatusError &&
      error.code === "invalid-argument"
  );
});

test("rechaza identificadores y operationId inválidos", async () => {
  for (const invalid of [
    { ...input, requestId: "../solicitud" },
    { ...input, operationId: "repetible" },
    { ...input, nextStatus: "desconocido" }
  ]) {
    await assert.rejects(
      updateAssistanceStatus(invalid, "demo-owner", repository(), now),
      (error) => error instanceof UpdateAssistanceStatusError &&
        error.code === "invalid-argument"
    );
  }
});
