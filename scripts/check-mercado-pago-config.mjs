import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

import {
  readLocalTestAccessToken,
  validateMercadoPagoPolicy,
  validateTestSellerIdentity
} from "./lib/mercado-pago-config.mjs";

const execFileAsync = promisify(execFile);
const read = (relativeUrl) => readFile(new URL(relativeUrl, import.meta.url), "utf8");

try {
  const policy = validateMercadoPagoPolicy(
    JSON.parse(await read("../firebase/mercado-pago-policy.json")),
    JSON.parse(await read("../firebase/secrets-policy.json"))
  );
  await execFileAsync("git", ["check-ignore", "--quiet", policy.localSecretsFile]);

  let localSecrets;
  try {
    localSecrets = await read(`../${policy.localSecretsFile}`);
  } catch {
    throw new Error(
      "Falta functions/.secret.local. Crealo desde el ejemplo y completá solo el Access Token de prueba."
    );
  }
  const accessToken = readLocalTestAccessToken(localSecrets, policy);
  const response = await fetch(policy.identityEndpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) {
    throw new Error(
      `Mercado Pago rechazó la credencial de prueba (HTTP ${response.status}).`
    );
  }
  validateTestSellerIdentity(await response.json(), policy);
  console.log("[OK] Access Token válido para un vendedor de prueba argentino");
  console.log("[OK] Credencial guardada solo en functions/.secret.local ignorado por Git");
  console.log("[OK] Producción deshabilitada y ninguna tarjeta real requerida");
} catch (error) {
  console.error("Configuración local de Mercado Pago incompleta.");
  console.error(error instanceof Error ? error.message : "Error desconocido.");
  process.exitCode = 1;
}
