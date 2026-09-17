import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildEmulatorArgs, DEMO_PROJECT_ID, validateEmulatorConfig } from "./lib/emulator-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

function runNpmScript(script) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error("Ejecutá este comando mediante npm.cmd desde la raíz.");
  }
  return new Promise((resolve, reject) => {
    const build = spawn(process.execPath, [npmCli, "run", script], {
      cwd: root,
      stdio: "inherit",
      env: process.env
    });
    build.on("error", reject);
    build.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`El comando npm ${script} terminó con código ${code}.`));
    });
  });
}

try {
  const args = buildEmulatorArgs(process.argv[2], process.argv.slice(3));
  const config = JSON.parse(await readFile(new URL("../firebase.json", import.meta.url), "utf8"));
  validateEmulatorConfig(config);
  await runNpmScript("functions:build");
  const cli = require.resolve("firebase-tools/lib/bin/firebase.js");
  console.log(`MesaFlow local: ${DEMO_PROJECT_ID}. No se utilizarán dev ni prod.`);

  const child = spawn(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      GCLOUD_PROJECT: DEMO_PROJECT_ID,
      GOOGLE_CLOUD_PROJECT: DEMO_PROJECT_ID,
      FUNCTIONS_DISCOVERY_TIMEOUT: "30"
    }
  });
  // Let the CLI handle terminal Ctrl+C and shut down its emulator children.
  const onInterrupt = () => { if (process.platform !== "win32") child.kill("SIGINT"); };
  process.on("SIGINT", onInterrupt);
  child.on("error", (error) => {
    console.error(`No se pudo iniciar Firebase CLI: ${error.message}`);
    process.exitCode = 1;
    process.removeListener("SIGINT", onInterrupt);
  });
  child.on("exit", (code, signal) => {
    process.removeListener("SIGINT", onInterrupt);
    process.exitCode = code ?? (signal === "SIGINT" ? 130 : 1);
  });
} catch (error) {
  console.error(error.message);
  if (error.code === "MODULE_NOT_FOUND") console.error("Primero ejecutá npm.cmd ci.");
  process.exitCode = 1;
}
