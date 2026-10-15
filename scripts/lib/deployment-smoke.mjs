export const DEVELOPMENT_SMOKE_PLAN = Object.freeze([
  Object.freeze({
    name: "customer-root",
    url: "https://mesaflow-desarrollo.web.app/",
    status: 200,
    site: "customer"
  }),
  Object.freeze({
    name: "customer-deep-link",
    url: "https://mesaflow-desarrollo.web.app/e/mesa-flow-demo/table/mesa-01",
    status: 200,
    site: "customer"
  }),
  Object.freeze({
    name: "admin-root",
    url: "https://mesaflow-desarrollo-admin.web.app/",
    status: 200,
    site: "admin"
  }),
  Object.freeze({
    name: "admin-deep-link",
    url: "https://mesaflow-desarrollo-admin.web.app/operacion/pedidos",
    status: 200,
    site: "admin"
  }),
  Object.freeze({
    name: "landing-root",
    url: "https://mesaflow-desarrollo-landing.web.app/",
    status: 200,
    site: "landing"
  }),
  Object.freeze({
    name: "landing-404",
    url: "https://mesaflow-desarrollo-landing.web.app/no-existe-etapa-47",
    status: 404,
    site: "landing"
  })
]);

export async function validateSmokeResponse(check, response) {
  if (response.status !== check.status) {
    throw new Error(`${check.name}: HTTP ${response.status}; esperado ${check.status}.`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`${check.name}: no devolvió HTML.`);
  }
  const csp = response.headers.get("content-security-policy") ?? "";
  if (!csp.includes("frame-ancestors 'none'") || !csp.includes("default-src 'self'")) {
    throw new Error(`${check.name}: falta la CSP esperada.`);
  }
  if (["customer", "admin"].includes(check.site) &&
      (!csp.includes("www.google.com/recaptcha/") ||
       !csp.includes("www.gstatic.com/recaptcha/"))) {
    throw new Error(`${check.name}: la CSP no permite App Check.`);
  }
  const cache = response.headers.get("cache-control") ?? "";
  if (!cache.includes("no-store")) {
    throw new Error(`${check.name}: falta la política anti-caché.`);
  }
  const body = await response.text();
  if (!body.includes("<!DOCTYPE html>") && !body.includes("<!doctype html>")) {
    throw new Error(`${check.name}: cuerpo HTML inesperado.`);
  }
  return true;
}
