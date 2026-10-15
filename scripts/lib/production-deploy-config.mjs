import {
  FREE_DEPLOYMENT_COMPONENTS,
  DEVELOPMENT_PROJECT_ID,
  PRODUCTION_PROJECT_ID
} from "./deploy-config.mjs";
import { HOSTING_PRODUCTION_SITES } from "./hosting-config.mjs";

export const PRODUCTION_CONFIRMATION_PHRASE = "PUBLICAR-MESAFLOW-PRODUCCION";
export const PRODUCTION_AUTHORIZED_DOMAINS = Object.freeze([
  "mesaflow-produccion-admin.web.app",
  "mesaflow-produccion-admin.firebaseapp.com"
]);

function sameValues(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

export function validateProductionDeployConfig(policy, rc, hostingPolicy) {
  if (policy?.version !== 1 || policy?.environment !== "production" ||
      policy?.projectId !== PRODUCTION_PROJECT_ID || policy?.firebaseAlias !== "prod") {
    throw new Error("La política de producción no está anclada al proyecto esperado.");
  }
  if (!policy.forbiddenProjectIds?.includes(DEVELOPMENT_PROJECT_ID) ||
      !policy.forbiddenProjectIds?.includes("demo-mesaflow")) {
    throw new Error("Producción debe bloquear explícitamente desarrollo y emuladores.");
  }
  if (policy.confirmationPhrase !== PRODUCTION_CONFIRMATION_PHRASE) {
    throw new Error("La frase de confirmación productiva no coincide.");
  }
  if (!sameValues(policy.freeDeployment, FREE_DEPLOYMENT_COMPONENTS) ||
      !sameValues(policy.paidDeployment, ["functions"])) {
    throw new Error("Producción debe separar Hosting/Firestore de Functions.");
  }
  if (policy.appCheck?.provider !== "recaptcha-enterprise" ||
      policy.appCheck?.siteKeyEnvironmentVariable !==
        "MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY") {
    throw new Error("App Check productivo debe usar reCAPTCHA Enterprise.");
  }
  if (!sameValues(
    policy.authentication?.requiredAuthorizedDomains,
    PRODUCTION_AUTHORIZED_DOMAINS
  )) {
    throw new Error("Faltan los dominios Auth requeridos por el panel productivo.");
  }
  if (policy.firestore?.databaseStatus !== "verified-read-only" ||
      policy.firestore?.location !== "southamerica-east1" ||
      policy.firestore?.edition !== "STANDARD") {
    throw new Error("Firestore productivo no coincide con la verificación remota.");
  }
  if (policy.domain?.strategy !== "firebase-provided-domains" ||
      policy.domain?.customDomainStatus !== "not-required-for-mvp") {
    throw new Error("La estrategia de dominio productivo no es segura para el MVP.");
  }
  if (policy.functions?.billingStatus !== "blocked-no-user-consent" ||
      policy.webhook?.status !== "blocked-requires-functions-and-secrets") {
    throw new Error("Functions y el webhook deben permanecer bloqueados sin Blaze.");
  }
  if (rc?.projects?.prod !== PRODUCTION_PROJECT_ID ||
      rc?.projects?.default !== DEVELOPMENT_PROJECT_ID) {
    throw new Error("Los aliases Firebase no aíslan correctamente producción.");
  }
  const targets = rc?.targets?.[PRODUCTION_PROJECT_ID]?.hosting;
  for (const [target, siteId] of Object.entries(HOSTING_PRODUCTION_SITES)) {
    if (policy.hostingSites?.[target] !== siteId ||
        targets?.[target]?.length !== 1 || targets[target][0] !== siteId ||
        hostingPolicy?.plannedCloudSites?.prod?.[target] !== siteId) {
      throw new Error(`El target ${target} no coincide con su sitio productivo.`);
    }
  }
  return Object.freeze({
    projectId: PRODUCTION_PROJECT_ID,
    components: [...FREE_DEPLOYMENT_COMPONENTS],
    sitesStatus: policy.hosting.sitesStatus,
    appCheckRegistrationStatus: policy.appCheck.registrationStatus,
    authDomainsStatus: policy.authentication.domainsStatus,
    functionsStatus: policy.functions.billingStatus,
    webhookStatus: policy.webhook.status
  });
}

export function assertProductionStaticReady({
  policy,
  projectConfirmation,
  releaseConfirmation,
  siteKey
}) {
  if (projectConfirmation !== PRODUCTION_PROJECT_ID) {
    throw new Error(`Confirmación inválida. Usá --confirm=${PRODUCTION_PROJECT_ID}.`);
  }
  if (releaseConfirmation !== PRODUCTION_CONFIRMATION_PHRASE) {
    throw new Error(
      `Falta --release=${PRODUCTION_CONFIRMATION_PHRASE}.`
    );
  }
  if (policy.hosting?.sitesStatus !== "sites-created-targets-configured") {
    throw new Error("Los tres sitios Hosting de producción todavía no están listos.");
  }
  if (policy.appCheck?.registrationStatus !== "configured-in-firebase-console") {
    throw new Error("App Check de producción todavía no figura configurado.");
  }
  if (policy.authentication?.domainsStatus !== "configured-in-firebase-console") {
    throw new Error("Los dominios del panel productivo todavía no están autorizados.");
  }
  if (!siteKey?.trim()) {
    throw new Error("Falta MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY de producción.");
  }
  return true;
}
