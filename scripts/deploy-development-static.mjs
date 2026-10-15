import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertStaticDeploymentReady,
  assertTrackedWorktreeClean,
  DEVELOPMENT_PROJECT_ID,
  FREE_DEPLOYMENT_COMPONENTS,
  validateDeployConfig
} from "./lib/deploy-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const confirmation = process.argv.find((argument) => argument.startsWith("--confirm="))
  ?.slice("--confirm=".length);

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
    readFile(new URL("../firebase/deploy-policy.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../firebase/hosting-policy.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  validateDeployConfig(policy, rc, hostingPolicy);
  assertStaticDeploymentReady({
    policy,
    confirmation,
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
  await run(process.execPath, [npmCli, "run", "hosting:build:dev"]);
  await run(process.execPath, [firebaseCli,
    "deploy",
    "--only", FREE_DEPLOYMENT_COMPONENTS.join(","),
    "--project", DEVELOPMENT_PROJECT_ID
  ]);
  console.log("[OK] Recursos gratuitos publicados en mesaflow-desarrollo.");
  console.log("Functions permaneció excluido del despliegue.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
