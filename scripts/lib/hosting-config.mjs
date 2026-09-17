export const HOSTING_TARGETS = Object.freeze(["customer", "admin", "landing"]);
export const HOSTING_PUBLIC_DIRS = Object.freeze({
  customer: "apps/customer/build/web",
  admin: "apps/admin/hosting",
  landing: "apps/landing/hosting"
});
export const HOSTING_DEMO_SITES = Object.freeze({
  customer: "demo-mesaflow-customer",
  admin: "demo-mesaflow-admin",
  landing: "demo-mesaflow-landing"
});

const REQUIRED_SECURITY_HEADERS = Object.freeze({
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
});
const CACHE_REGEX = Object.freeze({
  customer: ".*",
  admin: ".*",
  landing: ".*"
});

function headerMap(rule) {
  return Object.fromEntries(
    (rule?.headers ?? []).map(({ key, value }) => [key.toLowerCase(), value])
  );
}

export function validateHostingConfig(config, rc, policy) {
  const hosting = config?.hosting;
  if (!Array.isArray(hosting) || hosting.length !== HOSTING_TARGETS.length) {
    throw new Error("Firebase Hosting debe declarar exactamente customer, admin y landing.");
  }

  for (const target of HOSTING_TARGETS) {
    const site = hosting.find((entry) => entry.target === target);
    if (!site || site.public !== HOSTING_PUBLIC_DIRS[target]) {
      throw new Error(`Hosting ${target} no usa su directorio público canónico.`);
    }
    if (!site.ignore?.includes("**/.*") || !site.ignore?.includes("**/node_modules/**")) {
      throw new Error(`Hosting ${target} debe excluir archivos ocultos y node_modules.`);
    }
    const security = headerMap(site.headers?.find((rule) => rule.regex === ".*"));
    for (const [key, value] of Object.entries(REQUIRED_SECURITY_HEADERS)) {
      if (security[key] !== value) {
        throw new Error(`Hosting ${target} no aplica el encabezado ${key}.`);
      }
    }
    if (site.headers?.some((rule) => headerMap(rule)["access-control-allow-origin"] === "*")) {
      throw new Error(`Hosting ${target} no debe habilitar CORS global.`);
    }
    const noCache = headerMap(site.headers?.find((rule) =>
      rule.regex === CACHE_REGEX[target] && headerMap(rule)["cache-control"]
    ));
    if (noCache["cache-control"] !== "no-cache, no-store, must-revalidate") {
      throw new Error(`Hosting ${target} no protege sus documentos de entrada contra caché obsoleta.`);
    }
    if (site.rewrites?.some((rewrite) => rewrite.function || rewrite.run || rewrite.dynamicLinks)) {
      throw new Error(`Hosting ${target} no debe invocar servicios cloud en esta etapa.`);
    }
  }

  for (const target of ["customer", "admin"]) {
    const site = hosting.find((entry) => entry.target === target);
    if (site.rewrites?.length !== 1 || site.rewrites[0].source !== "**" ||
        site.rewrites[0].destination !== "/index.html") {
      throw new Error(`Hosting ${target} requiere fallback SPA a index.html.`);
    }
  }
  const landing = hosting.find((entry) => entry.target === "landing");
  if (landing.rewrites?.length || landing.cleanUrls !== true || landing.trailingSlash !== false) {
    throw new Error("La landing debe conservar 404 real, cleanUrls y URLs sin slash final.");
  }

  const emulator = config?.emulators?.hosting;
  if (emulator?.host !== "127.0.0.1" || emulator?.port !== 5100) {
    throw new Error("El emulador Hosting debe escuchar solo en 127.0.0.1:5100.");
  }

  const demoTargets = rc?.targets?.["demo-mesaflow"]?.hosting;
  for (const target of HOSTING_TARGETS) {
    if (demoTargets?.[target]?.length !== 1 || demoTargets[target][0] !== HOSTING_DEMO_SITES[target]) {
      throw new Error(`Falta el target local Hosting ${target} para demo-mesaflow.`);
    }
  }

  if (policy?.version !== 1 || policy?.localProjectId !== "demo-mesaflow" ||
      policy?.cloudStatus !== "deferred" || policy?.targets?.length !== HOSTING_TARGETS.length) {
    throw new Error("La política Hosting no declara el entorno local o difiere del esquema esperado.");
  }
  for (const target of HOSTING_TARGETS) {
    const entry = policy.targets.find((item) => item.name === target);
    if (entry?.public !== HOSTING_PUBLIC_DIRS[target]) {
      throw new Error(`La política Hosting no coincide para ${target}.`);
    }
  }

  return { targets: [...HOSTING_TARGETS], basePort: emulator.port };
}
