import { readFile } from "node:fs/promises";

import {
  validateSecretExamples,
  validateSecretsPolicy
} from "./lib/secrets-config.mjs";

const read = (relativeUrl) => readFile(new URL(relativeUrl, import.meta.url), "utf8");

try {
  const policy = validateSecretsPolicy(
    JSON.parse(await read("../firebase/secrets-policy.json"))
  );
  validateSecretExamples({
    policy,
    publicEnvironment: await read("../.env.example"),
    backendEnvironment: await read("../functions/.env.example"),
    localSecrets: await read("../functions/.secret.local.example"),
    gitignore: await read("../.gitignore"),
    runtimeSource: await read("../functions/src/config/runtime.ts")
  });
  console.log("[OK] Configuración pública separada de parámetros backend y secretos");
  console.log("[OK] Secretos declarados sin valores y archivos locales ignorados");
} catch (error) {
  console.error(`Configuración de secretos inválida: ${error.message}`);
  process.exitCode = 1;
}
