import assert from "node:assert/strict";
import test from "node:test";

import { handleHealthRequest, healthPayload } from "../lib/health.js";

function createResponse() {
  return {
    body: undefined,
    ended: false,
    headers: new Map(),
    statusCode: undefined,
    setHeader(name, value) {
      this.headers.set(name.toLowerCase(), value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      this.ended = true;
    },
    end() {
      this.ended = true;
    }
  };
}

test("GET devuelve un payload mínimo sin datos del entorno", () => {
  const response = createResponse();
  handleHealthRequest({ method: "GET" }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, healthPayload);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(response.body).sort(), ["service", "status", "version"]);
});

test("HEAD comprueba disponibilidad sin cuerpo", () => {
  const response = createResponse();
  handleHealthRequest({ method: "HEAD" }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, undefined);
  assert.equal(response.ended, true);
});

test("rechaza métodos que podrían mutar estado", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = createResponse();
    handleHealthRequest({ method }, response);
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
  }
});
