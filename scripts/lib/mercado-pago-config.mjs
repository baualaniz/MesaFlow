import { parseEnvironmentExample } from "./secrets-config.mjs";

const exactKeys = [
  "accessTokenSecret",
  "applicationName",
  "checkoutApi",
  "checkoutProduct",
  "country",
  "credentialMode",
  "identityEndpoint",
  "localSecretsFile",
  "merchantModel",
  "productionEnabled",
  "productionMultiTenantModel",
  "provider",
  "requiresRealCard",
  "schemaVersion",
  "siteId"
].sort();

export function validateMercadoPagoPolicy(policy, secretsPolicy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy) ||
      JSON.stringify(Object.keys(policy).sort()) !== JSON.stringify(exactKeys)) {
    throw new TypeError("La política de Mercado Pago contiene campos ausentes o desconocidos.");
  }
  if (policy.schemaVersion !== 1 || policy.provider !== "mercado_pago" ||
      policy.applicationName !== "MesaFlow Desarrollo" ||
      policy.checkoutProduct !== "checkout_pro" || policy.checkoutApi !== "preferences" ||
      policy.credentialMode !== "test" || policy.country !== "AR" || policy.siteId !== "MLA") {
    throw new TypeError("La configuración de prueba de Mercado Pago no es la canónica.");
  }
  if (policy.merchantModel !== "single_demo_seller" ||
      policy.productionMultiTenantModel !== "oauth_per_establishment") {
    throw new TypeError("El modelo de vendedor no preserva la evolución multiestablecimiento.");
  }
  if (policy.accessTokenSecret !== "MERCADO_PAGO_ACCESS_TOKEN" ||
      policy.localSecretsFile !== "functions/.secret.local" ||
      policy.identityEndpoint !== "https://api.mercadolibre.com/users/me" ||
      policy.productionEnabled !== false || policy.requiresRealCard !== false) {
    throw new TypeError("La política habilita producción, una tarjeta real o un destino inseguro.");
  }
  if (!secretsPolicy?.secretManagerKeys?.includes(policy.accessTokenSecret) ||
      !secretsPolicy?.futureFunctionBindings?.createPaymentPreference?.includes(
        policy.accessTokenSecret
      )) {
    throw new TypeError("El Access Token no está cubierto por la política central de secretos.");
  }
  return policy;
}

export function readLocalTestAccessToken(text, policy) {
  const values = parseEnvironmentExample(text, policy.localSecretsFile);
  const token = values.get(policy.accessTokenSecret);
  if (typeof token !== "string" || token.startsWith("REEMPLAZAR_") ||
      token.length < 40 || token.length > 300 || !token.startsWith("APP_USR-") ||
      /\s/u.test(token)) {
    throw new Error(
      "MERCADO_PAGO_ACCESS_TOKEN debe contener el Access Token de prueba APP_USR sin espacios."
    );
  }
  return token;
}

export function validateTestSellerIdentity(value, policy) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Mercado Pago no devolvió una identidad válida.");
  }
  if (value.site_id !== policy.siteId || !Array.isArray(value.tags) ||
      !value.tags.includes("test_user")) {
    throw new Error(
      "La credencial no corresponde a un vendedor de prueba argentino."
    );
  }
  return Object.freeze({ testUser: true, siteId: value.site_id });
}
