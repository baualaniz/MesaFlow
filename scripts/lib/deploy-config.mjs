export const DEVELOPMENT_PROJECT_ID = "mesaflow-desarrollo";
export const PRODUCTION_PROJECT_ID = "mesaflow-produccion";
export const DEVELOPMENT_HOSTING_SITES = Object.freeze({
  customer: DEVELOPMENT_PROJECT_ID,
  admin: `${DEVELOPMENT_PROJECT_ID}-admin`,
  landing: `${DEVELOPMENT_PROJECT_ID}-landing`
});
export const FREE_DEPLOYMENT_COMPONENTS = Object.freeze([
  "firestore:rules",
  "firestore:indexes",
  "hosting"
]);
export const DEVELOPMENT_AUTHORIZED_DOMAINS = Object.freeze([
  "mesaflow-desarrollo-admin.web.app",
  "mesaflow-desarrollo-admin.firebaseapp.com"
]);

function sameValues(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

export function validateDeployConfig(policy, rc, hostingPolicy) {
  if (policy?.version !== 1 || policy?.environment !== "development" ||
      policy?.projectId !== DEVELOPMENT_PROJECT_ID || policy?.firebaseAlias !== "dev") {
    throw new Error("La política de deploy no está anclada al ambiente de desarrollo.");
  }
  if (!policy.forbiddenProjectIds?.includes(PRODUCTION_PROJECT_ID) ||
      policy.productionDeployment !== "forbidden-in-stage-47") {
    throw new Error("Producción debe permanecer explícitamente bloqueada en la Etapa 47.");
  }
  if (!sameValues(policy.freeDeployment, FREE_DEPLOYMENT_COMPONENTS) ||
      !sameValues(policy.paidDeployment, ["functions"])) {
    throw new Error("La política debe separar Hosting/Firestore gratuitos de Functions.");
  }
  if (policy.appCheck?.provider !== "recaptcha-enterprise" ||
      policy.appCheck?.siteKeyEnvironmentVariable !==
        "MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY") {
    throw new Error("App Check debe usar la clave pública de reCAPTCHA Enterprise.");
  }
  if (!sameValues(
    policy.authentication?.requiredAuthorizedDomains,
    DEVELOPMENT_AUTHORIZED_DOMAINS
  )) {
    throw new Error("Faltan los dominios Auth requeridos por el panel de desarrollo.");
  }
  if (policy.functions?.billingStatus !== "blocked-no-user-consent") {
    throw new Error("Functions no puede habilitarse sin consentimiento de facturación.");
  }
  if (rc?.projects?.dev !== DEVELOPMENT_PROJECT_ID ||
      rc?.projects?.prod !== PRODUCTION_PROJECT_ID) {
    throw new Error("Los aliases Firebase de desarrollo y producción no son seguros.");
  }
  const targets = rc?.targets?.[DEVELOPMENT_PROJECT_ID]?.hosting;
  for (const [target, siteId] of Object.entries(DEVELOPMENT_HOSTING_SITES)) {
    if (policy.hostingSites?.[target] !== siteId ||
        targets?.[target]?.length !== 1 || targets[target][0] !== siteId ||
        hostingPolicy?.plannedCloudSites?.dev?.[target] !== siteId) {
      throw new Error(`El target ${target} no coincide con su sitio de desarrollo.`);
    }
  }
  return Object.freeze({
    projectId: DEVELOPMENT_PROJECT_ID,
    components: [...FREE_DEPLOYMENT_COMPONENTS],
    appCheckRegistrationStatus: policy.appCheck.registrationStatus,
    authDomainsStatus: policy.authentication.domainsStatus
  });
}

export function assertStaticDeploymentReady({ policy, confirmation, siteKey }) {
  if (confirmation !== DEVELOPMENT_PROJECT_ID) {
    throw new Error(
      `Confirmación inválida. Usá --confirm=${DEVELOPMENT_PROJECT_ID}.`
    );
  }
  if (policy.appCheck?.registrationStatus !== "configured-in-firebase-console") {
    throw new Error("App Check todavía no figura configurado en Firebase Console.");
  }
  if (policy.authentication?.domainsStatus !== "configured-in-firebase-console") {
    throw new Error("Los dominios del panel todavía no figuran autorizados en Firebase Auth.");
  }
  if (!siteKey?.trim()) {
    throw new Error("Falta MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY.");
  }
  return true;
}

export function assertTrackedWorktreeClean(statusOutput) {
  if (statusOutput.trim()) {
    throw new Error(
      "Hay cambios versionables sin guardar. Creá un commit antes de desplegar."
    );
  }
  return true;
}
