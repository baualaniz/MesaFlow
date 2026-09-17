import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const fromCli = createRequire(require.resolve("firebase-tools/package.json"));

test("gaxios carga el UUID corregido y genera IDs v4", () => {
  const fromGaxios = createRequire(fromCli.resolve("gaxios"));
  const { v4, validate } = fromGaxios("uuid");
  assert.equal(validate(v4()), true);
  assert.equal(typeof fromCli("gaxios").request, "function");
});

test("el propagador usado por PubSub sigue funcionando con core corregido", () => {
  const fromPubsub = createRequire(fromCli.resolve("@google-cloud/pubsub"));
  const { ROOT_CONTEXT, trace, defaultTextMapGetter, defaultTextMapSetter } = fromPubsub("@opentelemetry/api");
  const { W3CTraceContextPropagator } = fromPubsub("@opentelemetry/core");
  const span = { traceId: "a".repeat(32), spanId: "b".repeat(16), traceFlags: 1 };
  const carrier = {};
  const propagator = new W3CTraceContextPropagator();
  propagator.inject(trace.setSpanContext(ROOT_CONTEXT, span), carrier, defaultTextMapSetter);
  const extracted = propagator.extract(ROOT_CONTEXT, carrier, defaultTextMapGetter);
  assert.equal(trace.getSpanContext(extracted).traceId, span.traceId);
  assert.equal(typeof fromCli("@google-cloud/pubsub").PubSub, "function");
});

test("Express carga qs corregido y conserva el parsing esperado", () => {
  const fromExpress = createRequire(fromCli.resolve("express"));
  assert.deepEqual(fromExpress("qs").parse("table=10&filters[active]=true"), {
    table: "10", filters: { active: "true" }
  });
  assert.equal(typeof fromCli("express")(), "function");
});

test("Firebase CLI conserva parsers compatibles", () => {
  assert.equal(typeof fromCli("csv-parse").parse, "function");
  assert.equal(typeof fromCli("stream-json").parser, "function");
  assert.equal(typeof fromCli("stream-json/filters/Pick").pick, "function");
  assert.equal(typeof fromCli("stream-json/streamers/StreamArray").streamArray, "function");
});
