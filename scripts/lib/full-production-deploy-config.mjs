export const FULL_PRODUCTION_PROJECT_ID = "mesaflow-produccion";
export const FULL_PRODUCTION_CONFIRMATION = "ACTIVAR-BACKEND-MESAFLOW-PRODUCCION";
export const BILLING_CONFIRMATION = "ACEPTO-COSTOS-BLAZE";
export const PAYMENTS_CONFIRMATION = "CONFIRMO-CREDENCIALES-PRODUCTIVAS";

const EXPECTED_COMPONENTS = Object.freeze([
  "firestore:rules", "firestore:indexes", "hosting", "functions"
]);

function exactArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

export function parseDotEnv(source) {
  const values = {};
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error("El archivo de parámetros contiene una línea inválida.");
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (Object.hasOwn(values, key)) throw new Error(`Parámetro duplicado: ${key}.`);
    values[key] = value;
  }
  return Object.freeze(values);
}

export function validateProductionRuntimeParameters(values) {
  if (values.MERCADO_PAGO_ENVIRONMENT !== "production") {
    throw new Error("MERCADO_PAGO_ENVIRONMENT debe ser production.");
  }
  if (!/^\d{5,30}$/u.test(values.WHATSAPP_PHONE_NUMBER_ID ?? "")) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID no tiene un formato válido.");
  }
  if (!/^v\d{2,3}\.\d$/u.test(values.WHATSAPP_GRAPH_API_VERSION ?? "")) {
    throw new Error("WHATSAPP_GRAPH_API_VERSION debe usar el formato vigente vNN.N.");
  }
  if (!/^[a-z0-9_]{3,512}$/u.test(values.WHATSAPP_TEMPLATE_NAME ?? "")) {
    throw new Error("WHATSAPP_TEMPLATE_NAME no parece una plantilla aprobada.");
  }
  if (!/^[a-z]{2,3}(?:_[A-Z]{2})?$/u.test(values.WHATSAPP_TEMPLATE_LANGUAGE ?? "")) {
    throw new Error("WHATSAPP_TEMPLATE_LANGUAGE no tiene un código válido.");
  }
  if (values.CUSTOMER_PUBLIC_BASE_URL !== "https://mesaflow-produccion.web.app") {
    throw new Error("CUSTOMER_PUBLIC_BASE_URL debe apuntar al cliente productivo.");
  }
  return true;
}

export function validateFullProductionPolicy(policy) {
  if (policy?.version !== 1 || policy.environment !== "production" ||
      policy.projectId !== FULL_PRODUCTION_PROJECT_ID) {
    throw new Error("La política completa no está anclada a producción.");
  }
  if (!policy.forbiddenProjectIds?.includes("mesaflow-desarrollo") ||
      !policy.forbiddenProjectIds?.includes("demo-mesaflow")) {
    throw new Error("La política completa debe bloquear desarrollo y emuladores.");
  }
  if (policy.confirmationPhrase !== FULL_PRODUCTION_CONFIRMATION ||
      policy.billingConfirmationPhrase !== BILLING_CONFIRMATION ||
      policy.paymentsConfirmationPhrase !== PAYMENTS_CONFIRMATION) {
    throw new Error("Las confirmaciones del despliegue completo no coinciden.");
  }
  if (!exactArray(policy.components, EXPECTED_COMPONENTS) ||
      policy.runtimeEnvironmentFile !== "functions/.env.mesaflow-produccion") {
    throw new Error("Los componentes o parámetros del despliegue completo son inválidos.");
  }
  if (!Array.isArray(policy.requiredSecrets) || policy.requiredSecrets.length !== 3 ||
      !policy.requiredSecrets.includes("MERCADO_PAGO_ACCESS_TOKEN") ||
      !policy.requiredSecrets.includes("MERCADO_PAGO_WEBHOOK_SECRET") ||
      !policy.requiredSecrets.includes("WHATSAPP_ACCESS_TOKEN")) {
    throw new Error("La política no declara los tres secretos productivos requeridos.");
  }
  if (!Array.isArray(policy.expectedFunctionNames) ||
      new Set(policy.expectedFunctionNames).size !== 14) {
    throw new Error("La política debe enumerar exactamente las 14 Functions.");
  }
  return Object.freeze({
    components: [...EXPECTED_COMPONENTS],
    functionNames: [...policy.expectedFunctionNames],
    projectId: policy.projectId,
    requiredSecrets: [...policy.requiredSecrets]
  });
}

export function validateProductionPaymentPolicy(policy) {
  if (policy?.schemaVersion !== 1 || policy.provider !== "mercado_pago" ||
      policy.checkoutProduct !== "checkout_pro" || policy.checkoutApi !== "preferences" ||
      policy.credentialMode !== "production" || policy.country !== "AR" ||
      policy.siteId !== "MLA") {
    throw new Error("La política de Mercado Pago productiva no coincide con Checkout Pro AR.");
  }
  if (policy.merchantModel !== "single_pilot_seller" ||
      policy.multiTenantFutureModel !== "oauth_per_establishment") {
    throw new Error("El modelo de cobro productivo no limita el piloto a un vendedor.");
  }
  if (policy.environmentParameter !== "MERCADO_PAGO_ENVIRONMENT" ||
      policy.environmentValue !== "production" || policy.checkoutUrlField !== "init_point" ||
      policy.paymentLiveMode !== true || policy.productionEnabled !== true) {
    throw new Error("Mercado Pago productivo podría mezclar sandbox o live mode.");
  }
  if (policy.accessTokenSecret !== "MERCADO_PAGO_ACCESS_TOKEN" ||
      policy.webhookSecret !== "MERCADO_PAGO_WEBHOOK_SECRET") {
    throw new Error("Los secretos productivos de Mercado Pago no coinciden.");
  }
  return true;
}

export function assertFullProductionConfirmation({
  projectConfirmation,
  releaseConfirmation,
  billingConfirmation,
  paymentsConfirmation,
  siteKey
}) {
  if (projectConfirmation !== FULL_PRODUCTION_PROJECT_ID) {
    throw new Error(`Usá --confirm=${FULL_PRODUCTION_PROJECT_ID}.`);
  }
  if (releaseConfirmation !== FULL_PRODUCTION_CONFIRMATION) {
    throw new Error(`Usá --release=${FULL_PRODUCTION_CONFIRMATION}.`);
  }
  if (billingConfirmation !== BILLING_CONFIRMATION) {
    throw new Error(`Usá --billing=${BILLING_CONFIRMATION}.`);
  }
  if (paymentsConfirmation !== PAYMENTS_CONFIRMATION) {
    throw new Error(`Usá --payments=${PAYMENTS_CONFIRMATION}.`);
  }
  if (!siteKey?.trim()) {
    throw new Error("Falta MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY de producción.");
  }
  return true;
}
