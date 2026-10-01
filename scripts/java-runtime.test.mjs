import assert from "node:assert/strict";
import test from "node:test";

import { parseJavaMajor } from "./lib/java-runtime.mjs";

test("detecta versiones Java heredadas y modernas", () => {
  assert.equal(parseJavaMajor('java version "1.8.0_503"'), 8);
  assert.equal(parseJavaMajor('openjdk version "21.0.12" 2026-07-21 LTS'), 21);
  assert.equal(parseJavaMajor('openjdk version "24.0.2" 2025-07-15'), 24);
  assert.equal(parseJavaMajor("salida desconocida"), null);
});
