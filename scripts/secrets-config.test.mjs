import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseEnvironmentExample,
  validateSecretExamples,
  validateSecretsPolicy
} from "./lib/secrets-config.mjs";

const read = (relativeUrl) => readFile(new URL(relativeUrl, import.meta.url), "utf8");
const policy = JSON.parse(await read("../firebase/secrets-policy.json"));
const examples = {
  policy,
  publicEnvironment: await read("../.env.example"),
  backendEnvironment: await read("../functions/.env.example"),
  localSecrets: await read("../functions/.secret.local.example"),
  gitignore: await read("../.gitignore"),
  runtimeSource: await read("../functions/src/config/runtime.ts")
};

test("la política separa claves públicas, privadas y Secret Manager", () => {
  validateSecretsPolicy(policy);
  const all = [
    ...policy.publicFrontendKeys,
    ...policy.backendRuntimeKeys,
    ...policy.secretManagerKeys
  ];
  assert.equal(new Set(all).size, all.length);
});

test("los ejemplos contienen solo placeholders permitidos", () => {
  validateSecretExamples(examples);
  const publicValues = parseEnvironmentExample(examples.publicEnvironment, ".env.example");
  for (const name of policy.secretManagerKeys) assert.equal(publicValues.has(name), false);
});

test("rechaza claves repetidas, categorías solapadas y bindings desconocidos", () => {
  assert.throws(() => parseEnvironmentExample("PUBLIC_A=x\nPUBLIC_A=y", "duplicado"));

  const overlap = structuredClone(policy);
  overlap.publicFrontendKeys.push(overlap.secretManagerKeys[0]);
  assert.throws(() => validateSecretsPolicy(overlap));

  const unknown = structuredClone(policy);
  unknown.futureFunctionBindings.example = ["UNKNOWN_SECRET"];
  assert.throws(() => validateSecretsPolicy(unknown));
});

test("health no recibe secretos por defecto", async () => {
  const healthSource = await read("../functions/src/index.ts");
  assert.doesNotMatch(healthSource, /secrets\s*:/u);
  for (const name of policy.secretManagerKeys) assert.doesNotMatch(healthSource, new RegExp(name, "u"));
});
