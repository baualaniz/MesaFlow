import { readFile } from "node:fs/promises";

import { validateProductionDeployConfig } from "./lib/production-deploy-config.mjs";

try {
  const [policy, rc, hostingPolicy] = await Promise.all([
    readFile(new URL("../firebase/production-deploy-policy.json", import.meta.url), "utf8")
      .then(JSON.parse),
    readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../firebase/hosting-policy.json", import.meta.url), "utf8")
      .then(JSON.parse)
  ]);
  const result = validateProductionDeployConfig(policy, rc, hostingPolicy);
  console.log(`[OK] Proyecto productivo aislado: ${result.projectId}`);
  console.log(`[OK] Componentes gratuitos permitidos: ${result.components.join(", ")}`);
  console.log("[OK] Authentication base y Firestore verificados en modo solo lectura.");
  console.log(result.sitesStatus === "sites-created-targets-configured"
    ? "[OK] Tres sitios Hosting productivos listos."
    : "[PENDIENTE] Crear los sitios Hosting de panel y landing.");
  console.log(result.appCheckRegistrationStatus === "configured-in-firebase-console"
    ? "[OK] App Check productivo registrado."
    : "[PENDIENTE] Crear y registrar la clave App Check productiva.");
  console.log(result.authDomainsStatus === "configured-in-firebase-console"
    ? "[OK] Dominios productivos autorizados en Authentication."
    : "[PENDIENTE] Autorizar los dominios productivos del panel.");
  console.log("[BLOQUEADO] Functions y webhook: requieren Blaze y secretos productivos.");
  console.log("Este comando no crea, modifica ni elimina recursos cloud.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
