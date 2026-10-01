import assert from "node:assert/strict";
import test from "node:test";

import {
  QrSessionError,
  buildQrExchangeId,
  exchangeQrSessionAccess,
  hashQrToken,
  restoreQrSessionAccess
} from "../lib/qr-session.js";

const token = "6d657361666c6f772d64656d6f2d3031";
const access = Object.freeze({
  establishmentId: "mesa-flow-demo",
  establishmentName: "Bistró MesaFlow",
  tableId: "mesa-01",
  tableName: "Mesa 1",
  sessionId: "sesion-mesa-01"
});

function repository() {
  const calls = [];
  return {
    calls,
    async exchange(command) {
      calls.push(["exchange", command]);
      return access;
    },
    async restore(query) {
      calls.push(["restore", query]);
      return access;
    }
  };
}

test("el canje transforma el token en hash y nunca lo entrega al repositorio", async () => {
  const repo = repository();
  const now = new Date("2026-09-17T12:00:00.000Z");
  const result = await exchangeQrSessionAccess({
    establishmentSlug: "mesa-flow-demo",
    tableId: "mesa-01",
    token
  }, "guest-a", repo, now);

  assert.deepEqual(result, access);
  assert.equal(repo.calls.length, 1);
  const command = repo.calls[0][1];
  assert.equal(command.tokenHash, hashQrToken(token));
  assert.equal(command.exchangeId, buildQrExchangeId("guest-a", command.tokenHash));
  assert.equal(JSON.stringify(command).includes(token), false);
  assert.equal(command.usedAt.toISOString(), now.toISOString());
  assert.equal(command.expiresAt.toISOString(), "2026-09-18T12:00:00.000Z");
});

test("la restauración usa identidad y contexto sin aceptar un token", async () => {
  const repo = repository();
  const result = await restoreQrSessionAccess({
    establishmentSlug: "mesa-flow-demo",
    tableId: "mesa-01"
  }, "guest-a", repo);

  assert.deepEqual(result, access);
  assert.deepEqual(repo.calls, [["restore", {
    uid: "guest-a",
    establishmentSlug: "mesa-flow-demo",
    tableId: "mesa-01"
  }]]);
});

test("canje y restauración exigen Firebase Auth", async () => {
  const repo = repository();
  await assert.rejects(
    exchangeQrSessionAccess({
      establishmentSlug: "mesa-flow-demo",
      tableId: "mesa-01",
      token
    }, undefined, repo),
    (error) => error instanceof QrSessionError && error.code === "unauthenticated"
  );
  await assert.rejects(
    restoreQrSessionAccess({ establishmentSlug: "mesa-flow-demo", tableId: "mesa-01" }, "", repo),
    (error) => error instanceof QrSessionError && error.code === "unauthenticated"
  );
  assert.equal(repo.calls.length, 0);
});

test("rechaza campos adicionales, segmentos inseguros y tokens débiles", async () => {
  const invalidInputs = [
    { establishmentSlug: "Mesa-Flow", tableId: "mesa-01", token },
    { establishmentSlug: "mesa-flow", tableId: "../mesa-01", token },
    { establishmentSlug: "mesa-flow", tableId: "mesa-01", token: "corto" },
    { establishmentSlug: "mesa-flow", tableId: "mesa-01", token, extra: true }
  ];
  for (const input of invalidInputs) {
    const repo = repository();
    await assert.rejects(
      exchangeQrSessionAccess(input, "guest-a", repo),
      (error) => error instanceof QrSessionError && error.code === "invalid-argument"
    );
    assert.equal(repo.calls.length, 0);
  }
});

test("hashes de token y replay son deterministas pero separados por UID", () => {
  const hash = hashQrToken(token);
  assert.match(hash, /^[a-f0-9]{64}$/u);
  assert.equal(hash.includes(token), false);
  assert.equal(buildQrExchangeId("guest-a", hash), buildQrExchangeId("guest-a", hash));
  assert.notEqual(buildQrExchangeId("guest-a", hash), buildQrExchangeId("guest-b", hash));
});
