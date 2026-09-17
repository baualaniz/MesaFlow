import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOSTING_PUBLIC_DIRS, HOSTING_TARGETS, validateHostingConfig } from "./lib/hosting-config.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

try {
  const [config, rc, policy] = await Promise.all([
    readFile(path.join(root, "firebase.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, ".firebaserc"), "utf8").then(JSON.parse),
    readFile(path.join(root, "firebase/hosting-policy.json"), "utf8").then(JSON.parse)
  ]);
  validateHostingConfig(config, rc, policy);
  for (const target of HOSTING_TARGETS.filter((name) => name !== "customer")) {
    await access(path.join(root, HOSTING_PUBLIC_DIRS[target], "index.html"), constants.R_OK);
  }
  console.log("[OK] Tres targets Hosting independientes y limitados a loopback");
  console.log("[OK] Fallback SPA para cliente/panel y 404 real para landing");
  console.log("[OK] Encabezados de seguridad y caché configurados");
  console.log("Configuración Hosting válida; no se consultó ni modificó la nube.");
} catch (error) {
  console.error("Configuración Hosting inválida.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
