import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertProductionFunctions
} from "./lib/production-functions-smoke.mjs";
import { validateFullProductionPolicy } from "./lib/full-production-deploy-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

function capture(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0
      ? resolve(stdout)
      : reject(new Error(stderr.trim() || `Firebase CLI terminó con código ${code}.`)));
  });
}

try {
  const policy = await readFile(
    new URL("../firebase/full-production-deploy-policy.json", import.meta.url),
    "utf8"
  ).then(JSON.parse);
  const validated = validateFullProductionPolicy(policy);
  const firebaseCli = path.join(root, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");
  const output = await capture(process.execPath, [
    firebaseCli, "functions:list", "--json", "--project", validated.projectId
  ]);
  const result = assertProductionFunctions(JSON.parse(output), validated.functionNames);
  console.log(`[OK] ${result.expected} Functions esperadas presentes en producción.`);

  const response = await fetch(
    "https://southamerica-east1-mesaflow-produccion.cloudfunctions.net/health",
    { redirect: "error", signal: AbortSignal.timeout(15_000) }
  );
  if (!response.ok) throw new Error(`Health productivo respondió HTTP ${response.status}.`);
  const body = await response.json();
  if (body?.service !== "mesaflow-functions") {
    throw new Error("Health productivo devolvió un contrato inesperado.");
  }
  console.log("[OK] Health productivo HTTPS respondió con el contrato esperado.");
  console.log("Este smoke no crea usuarios, pedidos ni pagos.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
