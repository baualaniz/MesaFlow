import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertTrackedWorktreeClean } from "./lib/deploy-config.mjs";
import {
  assertFullProductionConfirmation,
  parseDotEnv,
  validateFullProductionPolicy,
  validateProductionPaymentPolicy,
  validateProductionRuntimeParameters
} from "./lib/full-production-deploy-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

function argument(name) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

function run(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: root,
      env: process.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit"
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("exit", (code) => code === 0
      ? resolve({ stdout, stderr })
      : reject(new Error(
        options.failureMessage ?? `${path.basename(executable)} terminó con código ${code}.`
      )));
  });
}

try {
  const [policy, paymentPolicy] = await Promise.all([
    readFile(
      new URL("../firebase/full-production-deploy-policy.json", import.meta.url),
      "utf8"
    ).then(JSON.parse),
    readFile(
      new URL("../firebase/mercado-pago-production-policy.json", import.meta.url),
      "utf8"
    ).then(JSON.parse)
  ]);
  const validated = validateFullProductionPolicy(policy);
  validateProductionPaymentPolicy(paymentPolicy);
  assertFullProductionConfirmation({
    projectConfirmation: argument("confirm"),
    releaseConfirmation: argument("release"),
    billingConfirmation: argument("billing"),
    paymentsConfirmation: argument("payments"),
    siteKey: process.env.MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY
  });

  const parameterSource = await readFile(
    path.join(root, policy.runtimeEnvironmentFile),
    "utf8"
  ).catch(() => {
    throw new Error(
      `Falta ${policy.runtimeEnvironmentFile}; copiá functions/production.env.example y completalo.`
    );
  });
  validateProductionRuntimeParameters(parseDotEnv(parameterSource));

  const gitStatus = spawnSync(
    "git",
    ["status", "--porcelain", "--untracked-files=no"],
    { cwd: root, encoding: "utf8" }
  );
  if (gitStatus.status !== 0) throw new Error("No se pudo verificar el estado de Git.");
  assertTrackedWorktreeClean(gitStatus.stdout);

  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("Ejecutá este flujo mediante npm.cmd run deploy:prod:full.");
  const firebaseCli = path.join(root, "node_modules", "firebase-tools", "lib", "bin", "firebase.js");

  for (const secret of validated.requiredSecrets) {
    await run(process.execPath, [
      firebaseCli, "functions:secrets:get", secret,
      "--project", validated.projectId
    ], {
      capture: true,
      failureMessage: `Falta configurar el secreto cloud ${secret}.`
    });
    console.log(`[OK] Secreto cloud presente: ${secret} (valor no leído).`);
  }

  await run(process.execPath, [npmCli, "run", "check"]);
  await run(process.execPath, [npmCli, "run", "hosting:build:prod"]);
  await run(process.execPath, [
    firebaseCli, "deploy", "--only", "firestore:rules,firestore:indexes,hosting",
    "--project", validated.projectId
  ]);

  const groups = [
    validated.functionNames.slice(0, 8),
    validated.functionNames.slice(8)
  ];
  for (const names of groups) {
    await run(process.execPath, [
      firebaseCli,
      "deploy",
      "--only",
      names.map((name) => `functions:${name}`).join(","),
      "--project",
      validated.projectId
    ]);
  }
  console.log("[OK] Hosting, Firestore y 14 Functions publicados en mesaflow-produccion.");
  console.log("Ejecutá npm.cmd run deploy:smoke:functions:prod antes de habilitar tráfico real.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
