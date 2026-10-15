import { readFile } from "node:fs/promises";

import { validateDeployConfig } from "./lib/deploy-config.mjs";

try {
  const [policy, rc, hostingPolicy] = await Promise.all([
    readFile(new URL("../firebase/deploy-policy.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../.firebaserc", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../firebase/hosting-policy.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  const result = validateDeployConfig(policy, rc, hostingPolicy);
  console.log(`[OK] Proyecto permitido: ${result.projectId}`);
  console.log(`[OK] Componentes sin facturación: ${result.components.join(", ")}`);
  console.log("[BLOQUEADO] Functions: falta consentimiento para activar Blaze.");
  if (result.appCheckRegistrationStatus === "configured-in-firebase-console") {
    console.log("[OK] App Check figura registrado en Firebase Console.");
  } else {
    console.log("[PENDIENTE] Registrar reCAPTCHA Enterprise en App Check.");
  }
  if (result.authDomainsStatus === "configured-in-firebase-console") {
    console.log("[OK] Dominios del panel autorizados en Firebase Authentication.");
  } else {
    console.log("[PENDIENTE] Autorizar los dominios Hosting del panel en Authentication.");
  }
  console.log("Este comando no crea, modifica ni elimina recursos cloud.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
