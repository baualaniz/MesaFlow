import assert from "node:assert/strict";
import test from "node:test";

import { manageTable, TableManagementError } from "../lib/manage-table.js";

const now = new Date("2026-10-07T12:00:00.000Z");
const requestId = "0123456789abcdef0123456789abcdef";
const token = "abcdefghijklmnopqrstuvwxyzABCDEFGH123456789";

function repository() {
  const calls = [];
  return {
    calls,
    async execute(command) {
      calls.push(command);
      return {
        action: command.action,
        tableId: "tableId" in command ? command.tableId : undefined,
        updatedAt: command.updatedAt.toISOString()
      };
    }
  };
}

test("normaliza alta, edición y apertura sin aceptar autorización del cliente", async () => {
  const cases = [
    { action: "create", establishmentId: "mesa-flow-demo", name: "Terraza 1", number: 11, requestId, token },
    {
      action: "update", active: true, establishmentId: "mesa-flow-demo",
      expectedUpdatedAt: "2026-10-07T11:00:00.000Z", name: "Salón 1", number: 1,
      requestId, tableId: "mesa-01"
    },
    { action: "openSession", establishmentId: "mesa-flow-demo", requestId, tableId: "mesa-03" }
  ];
  for (const input of cases) {
    const repo = repository();
    await manageTable(input, "demo-owner", repo, now);
    assert.equal(repo.calls.length, 1);
    assert.equal(repo.calls[0].actorUid, "demo-owner");
    assert.equal(repo.calls[0].updatedAt.toISOString(), now.toISOString());
  }
});

test("valida cierre y rotación individual", async () => {
  const closeRepo = repository();
  await manageTable({
    action: "closeSession", establishmentId: "mesa-flow-demo", requestId,
    sessionId: "sesion-mesa-01", tableId: "mesa-01"
  }, "demo-manager", closeRepo, now);
  assert.equal(closeRepo.calls[0].sessionId, "sesion-mesa-01");

  const rotateRepo = repository();
  await manageTable({
    action: "rotateQr", establishmentId: "mesa-flow-demo", expectedQrVersion: 3,
    requestId, tableId: "mesa-01", token
  }, "demo-owner", rotateRepo, now);
  assert.equal(rotateRepo.calls[0].expectedQrVersion, 3);
  assert.equal(rotateRepo.calls[0].token, token);
});

test("acepta rotación masiva sin mesas repetidas", async () => {
  const repo = repository();
  await manageTable({
    action: "rotateManyQrs",
    entries: [
      { expectedQrVersion: 1, tableId: "mesa-01", token },
      { expectedQrVersion: 2, tableId: "mesa-02", token: token.split("").reverse().join("") }
    ],
    establishmentId: "mesa-flow-demo",
    requestId
  }, "demo-owner", repo, now);
  assert.equal(repo.calls[0].entries.length, 2);

  await assert.rejects(manageTable({
    action: "rotateManyQrs",
    entries: [
      { expectedQrVersion: 1, tableId: "mesa-01", token },
      { expectedQrVersion: 1, tableId: "mesa-01", token }
    ],
    establishmentId: "mesa-flow-demo",
    requestId
  }, "demo-owner", repository(), now), (error) =>
    error instanceof TableManagementError && error.code === "invalid-argument");
});

test("rechaza identidad ausente, campos extra y datos débiles", async () => {
  const valid = {
    action: "create", establishmentId: "mesa-flow-demo", name: "Mesa 12",
    number: 12, requestId, token
  };
  for (const [input, uid] of [
    [valid, undefined],
    [{ ...valid, role: "owner" }, "demo-owner"],
    [{ ...valid, token: "predecible" }, "demo-owner"],
    [{ ...valid, number: 0 }, "demo-owner"]
  ]) {
    await assert.rejects(manageTable(input, uid, repository(), now), (error) =>
      error instanceof TableManagementError &&
      ["unauthenticated", "invalid-argument"].includes(error.code));
  }
});
