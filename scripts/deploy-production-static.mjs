import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertTrackedWorktreeClean } from "./lib/deploy-config.mjs";
import {
  assertProductionStaticReady,
  validateProductionDeployConfig
} from "./lib/production-deploy-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const projectConfirmation = process.argv.find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);
const releaseConfirmation = process.argv.find((argument) => argument.startsWith("--release="))
  ?.slice("--release=".length);

function run(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: root, env: process.env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0
      ? resolve()
      : reject(new Error(`${path.basename(executable)} terminó con código ${code}.`)));
  });
}

try {
  const [policy, rc, hostingPolicy] = await Promise.all([
    readFile(new URL("../firebase/production-deploy-policy.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../firebase/hosting-policy.json", import.meta.url), "utf8")
      .then(JSON.parse)
  ]);
  const result = validateProductionDeployConfig(policy, rc, hostingPolicy);
  assertProductionStaticReady({
    policy,
    projectConfirmation,
    releaseConfirmation,
    siteKey: process.env.MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY
  });
  const gitStatus = spawnSync(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    { cwd: root, encoding: "utf8" }
  );
  if (gitStatus.status !== 0) {
    throw new Error("No se pudo verificar el estado de Git antes del deploy.");
  }
  assertTrackedWorktreeClean(gitStatus.stdout);

  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("No se pudo localizar npm para validar el deploy.");
  const firebaseCli = path.join(
    root,
    "node_modules",
    "firebase-tools",
    "lib",
    "bin",
    "firebase.js"
  );
  await run(process.execPath, [npmCli, "run", "check"]);
  await run(process.execPath, [npmCli, "run", "hosting:build:prod"]);
  await run(process.execPath, [
    firebaseCli,
    "deploy",
    "--only", result.components.join(","),
    "--project", result.projectId
  ]);
  console.log("[OK] Recursos gratuitos publicados en mesaflow-produccion.");
  console.log("Functions y webhook permanecieron excluidos del despliegue.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
