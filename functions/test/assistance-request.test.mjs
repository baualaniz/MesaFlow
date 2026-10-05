import assert from "node:assert/strict";
import test from "node:test";

import {
  AssistanceError,
  cancelAssistanceRequest,
  createAssistanceRequest
} from "../lib/assistance-request.js";

const now = new Date("2026-09-17T12:15:00.000Z");
const base = Object.freeze({
  establishmentId: "mesa-flow-demo",
  sessionId: "sesion-mesa-01",
  tableId: "mesa-01"
});

function repository() {
  const createCalls = [];
  const cancelCalls = [];
  return {
    createCalls,
    cancelCalls,
    async create(command) {
      createCalls.push(command);
      return {
        requestId: command.sessionId,
        type: command.type,
        status: "pending",
        createdAt: command.createdAt.toISOString(),
        updatedAt: command.createdAt.toISOString()
      };
    },
    async cancel(command) {
      cancelCalls.push(command);
      return {
        requestId: command.sessionId,
        type: "waiter",
        status: "cancelled",
        createdAt: "2026-09-17T12:00:00.000Z",
        updatedAt: command.createdAt.toISOString()
      };
    }
  };
}

test("crea una solicitud tipada para la sesión autenticada", async () => {
  const repo = repository();
  const result = await createAssistanceRequest(
    { ...base, type: "waiter" },
    "guest-a",
    repo,
    now
  );
  assert.equal(repo.createCalls.length, 1);
  assert.equal(repo.createCalls[0].uid, "guest-a");
  assert.equal(repo.createCalls[0].type, "waiter");
  assert.equal(result.requestId, "sesion-mesa-01");
});

test("cancela usando solo el contexto seguro de la mesa", async () => {
  const repo = repository();
  const result = await cancelAssistanceRequest(base, "guest-a", repo, now);
  assert.equal(repo.cancelCalls.length, 1);
  assert.equal(repo.cancelCalls[0].sessionId, "sesion-mesa-01");
  assert.equal(result.status, "cancelled");
});

test("rechaza tipos, campos adicionales y llamadas sin identidad", async () => {
  const inputs = [
    { ...base, type: "kitchen" },
    { ...base, type: "bill", message: "hola" }
  ];
  for (const input of inputs) {
    await assert.rejects(
      createAssistanceRequest(input, "guest-a", repository(), now),
      (error) => error instanceof AssistanceError && error.code === "invalid-argument"
    );
  }
  await assert.rejects(
    cancelAssistanceRequest(base, undefined, repository(), now),
    (error) => error instanceof AssistanceError && error.code === "unauthenticated"
  );
});
