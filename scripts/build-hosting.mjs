import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const customer = path.join(root, "apps/customer");
const requestedEnvironment = process.argv[2] ?? "emulator";
if (!["emulator", "dev", "prod"].includes(requestedEnvironment)) {
  throw new Error("hosting:build solo admite emulator, dev o prod.");
}
const cloudSiteKey = process.env.MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim() ?? "";
if (requestedEnvironment !== "emulator" && !cloudSiteKey) {
  throw new Error(
    `Falta MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY para construir Hosting ${requestedEnvironment}.`
  );
}
const buildMode = requestedEnvironment === "prod"
  ? "production"
  : requestedEnvironment === "dev" ? "development" : "emulator";
const appCheckKeyFingerprint = cloudSiteKey
  ? createHash("sha256").update(cloudSiteKey).digest("hex").slice(0, 12)
  : "none";
const CUSTOMER_BUILD_PROFILE =
  `${buildMode}-csp-local-resources-app-check-v2-${appCheckKeyFingerprint}`;
const developmentCustomerUrl = "https://mesaflow-desarrollo.web.app";
const developmentAdminUrl = "https://mesaflow-desarrollo-admin.web.app";
const developmentLandingUrl = "https://mesaflow-desarrollo-landing.web.app";
const productionCustomerUrl = "https://mesaflow-produccion.web.app";
const productionAdminUrl = "https://mesaflow-produccion-admin.web.app";
const productionLandingUrl = "https://mesaflow-produccion-landing.web.app";

function publicUrl(environment, developmentUrl, productionUrl, emulatorUrl) {
  if (environment === "dev") return developmentUrl;
  if (environment === "prod") return productionUrl;
  return emulatorUrl;
}

async function newestMtime(target) {
  const info = await stat(target);
  if (!info.isDirectory()) return info.mtimeMs;
  const entries = await readdir(target, { withFileTypes: true });
  const mtimes = await Promise.all(entries.map((entry) =>
    newestMtime(path.join(target, entry.name))
  ));
  return Math.max(info.mtimeMs, ...mtimes);
}

async function customerBuildIsCurrent() {
  try {
    const outputTime = (await stat(path.join(customer, "build/web/index.html"))).mtimeMs;
    const environment = await readFile(
      path.join(customer, "build/web/.mesaflow-environment"),
      "utf8"
    );
    if (environment.trim() !== CUSTOMER_BUILD_PROFILE) return false;
    const sources = ["lib", "web", "assets", "pubspec.yaml", "pubspec.lock", ".metadata"];
    const sourceTime = Math.max(...await Promise.all(
      sources.map((entry) => newestMtime(path.join(customer, entry)))
    ));
    return outputTime >= sourceTime;
  } catch {
    return false;
  }
}

function runFlutterBuild() {
  const windows = process.platform === "win32";
  let executable = "flutter";
  let args = [
    "build", "web", "--release", "--csp", "--no-web-resources-cdn",
    `--dart-define=MESAFLOW_ENV=${buildMode}`
  ];
  if (cloudSiteKey) {
    args.push(`--dart-define=MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY=${cloudSiteKey}`);
  }
  let env = process.env;
  if (windows) {
    const flutterBin = (process.env.Path ?? process.env.PATH ?? "")
      .split(path.delimiter)
      .find((entry) => existsSync(path.join(entry, "flutter.bat")));
    if (!flutterBin) {
      throw new Error("Flutter no está en PATH. Ejecutá primero la comprobación de entorno.");
    }
    const flutterRoot = path.resolve(flutterBin, "..");
    executable = path.join(flutterRoot, "bin/cache/dart-sdk/bin/dart.exe");
    args = [
      `--packages=${path.join(flutterRoot, "packages/flutter_tools/.dart_tool/package_config.json")}`,
      path.join(flutterRoot, "bin/cache/flutter_tools.snapshot"),
      "build", "web", "--release", "--csp", "--no-web-resources-cdn",
      `--dart-define=MESAFLOW_ENV=${buildMode}`
    ];
    if (cloudSiteKey) {
      args.push(`--dart-define=MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY=${cloudSiteKey}`);
    }
    env = { ...process.env, FLUTTER_ROOT: flutterRoot };
  }
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: customer, stdio: "inherit", env });
    child.on("error", (error) => reject(new Error(`No se pudo iniciar Flutter: ${error.message}`)));
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`flutter build web terminó con código ${code}.`));
    });
  });
}

function runAdminBuild() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("No se pudo localizar npm para construir el panel.");
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [npmCli, "run", "build", "--workspace", "@mesaflow/admin", "--", "--mode", buildMode],
      {
        cwd: root,
        stdio: "inherit",
        env: {
          ...process.env,
          VITE_MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY: cloudSiteKey
        }
      }
    );
    child.on("error", (error) => reject(new Error(
      `No se pudo iniciar el build administrativo: ${error.message}`
    )));
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`El build administrativo terminó con código ${code}.`));
    });
  });
}

function runLandingBuild() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("No se pudo localizar npm para construir la landing.");
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [npmCli, "run", "build", "--workspace", "@mesaflow/landing"],
      {
        cwd: root,
        stdio: "inherit",
        env: {
          ...process.env,
          PUBLIC_CUSTOMER_URL: publicUrl(
            requestedEnvironment,
            developmentCustomerUrl,
            productionCustomerUrl,
            "http://127.0.0.1:5100"
          ),
          PUBLIC_ADMIN_URL: publicUrl(
            requestedEnvironment,
            developmentAdminUrl,
            productionAdminUrl,
            "http://127.0.0.1:5105"
          ),
          PUBLIC_LANDING_URL: publicUrl(
            requestedEnvironment,
            developmentLandingUrl,
            productionLandingUrl,
            "http://127.0.0.1:5106"
          )
        }
      }
    );
    child.on("error", (error) => reject(new Error(
      `No se pudo iniciar el build de la landing: ${error.message}`
    )));
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`El build de la landing terminó con código ${code}.`));
    });
  });
}

try {
  if (await customerBuildIsCurrent()) {
    console.log("[OK] Build Flutter vigente; no fue necesario recompilar.");
  } else {
    await runFlutterBuild();
    await writeFile(
      path.join(customer, "build/web/.mesaflow-environment"),
      `${CUSTOMER_BUILD_PROFILE}\n`,
      "utf8"
    );
  }
  await runAdminBuild();
  await runLandingBuild();
  for (const relativePath of [
    "apps/customer/build/web/index.html",
    "apps/admin/hosting/index.html",
    "apps/landing/hosting/index.html",
    "apps/landing/hosting/404.html"
  ]) {
    await access(path.join(root, relativePath), constants.R_OK);
  }
  console.log(
    `[OK] Builds de customer, admin y landing listos para Hosting ${requestedEnvironment}.`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
