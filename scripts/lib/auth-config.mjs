export function validateAuthPolicy(policy) {
  if (policy?.schemaVersion !== 1 ||
      !Number.isInteger(policy.minimumPasswordLength) ||
      policy.minimumPasswordLength < 12 || policy.minimumPasswordLength > 30 ||
      policy.passwordPolicyEnforcementState !== "ENFORCE" ||
      policy.emailEnumerationProtection !== true ||
      policy.emailTemplateLanguage !== "es" ||
      policy.environments?.dev?.allowLocalhost !== true ||
      policy.environments?.prod?.allowLocalhost !== false) {
    throw new Error("La política Auth debe conservar privacidad, mínimo 12 caracteres y localhost solo en dev.");
  }
}

export function selectAuthEnvironments(args) {
  if (args.length !== 1 || !["dev", "prod", "all"].includes(args[0])) {
    throw new Error("Usá npm.cmd run auth:check -- dev, prod o all.");
  }
  return args[0] === "all" ? ["dev", "prod"] : [args[0]];
}

export function assessAuthConfig(config, environment, policy) {
  validateAuthPolicy(policy);
  if (!["dev", "prod"].includes(environment)) throw new Error("Ambiente Auth desconocido.");
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("Firebase no devolvió una configuración Auth válida.");
  }
  const domains = Array.isArray(config.authorizedDomains) ? config.authorizedDomains : [];
  const hasLocalDomain = domains.some((domain) => typeof domain === "string" &&
    /^(localhost|127(?:\.\d{1,3}){3}|\[?::1\]?|0\.0\.0\.0)$/i.test(domain));
  const passwordPolicy = config.passwordPolicyConfig;
  const passwordVersions = passwordPolicy?.passwordPolicyVersions;
  const minLength = Array.isArray(passwordVersions) && passwordVersions.length === 1
    ? passwordVersions[0]?.customStrengthOptions?.minPasswordLength : undefined;
  const checks = [
    { name: "Email/Password habilitado", ok: config.signIn?.email?.enabled === true },
    { name: "Enlace por correo sin contraseña deshabilitado", ok: config.signIn?.email?.passwordRequired === true },
    { name: "Anonymous habilitado", ok: config.signIn?.anonymous?.enabled === true },
    { name: "Acceso por teléfono deshabilitado", ok: config.signIn?.phoneNumber?.enabled !== true },
    { name: "Una identidad por email", ok: config.signIn?.allowDuplicateEmails !== true },
    { name: "Protección contra enumeración de correos", ok: config.emailPrivacyConfig?.enableImprovedEmailPrivacy === true },
    { name: "Política de contraseña exigida", ok: passwordPolicy?.passwordPolicyEnforcementState === policy.passwordPolicyEnforcementState },
    { name: `Contraseña de al menos ${policy.minimumPasswordLength} caracteres`, ok: Number.isInteger(minLength) && minLength >= policy.minimumPasswordLength },
    { name: "Dominios presentes, sin esquema, puerto ni comodines", ok: domains.length > 0 && domains.every((d) => typeof d === "string" && /^[a-z0-9.-]+$/i.test(d)) },
    { name: environment === "dev" ? "localhost autorizado en desarrollo" : "Producción sin dominios loopback", ok: environment === "dev" ? domains.includes("localhost") : !hasLocalDomain }
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

// GET only. The caller supplies the pinned Firebase CLI's authenticated client.
export async function readRemoteAuthConfig(client, projectId) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) throw new Error("ID de proyecto inválido.");
  const response = await client.get(`/admin/v2/projects/${projectId}/config`, {
    headers: { "x-goog-user-project": projectId },
    ignoreQuotaProject: true,
    timeout: 15000,
    redirect: "error"
  });
  return response.body;
}
