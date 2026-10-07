import type { AdminEnvironment } from "../config/environment";

export function customerBaseUrlFor(environment: AdminEnvironment): string {
  if (environment === "emulator") return "http://127.0.0.1:5100";
  if (environment === "development") return "https://mesaflow-desarrollo.web.app";
  return "https://mesaflow-produccion.web.app";
}

export function buildCustomerQrUrl(
  establishmentSlug: string,
  tableId: string,
  token: string,
  baseUrl: string
): string {
  const url = new URL(`/e/${encodeURIComponent(establishmentSlug)}/table/${encodeURIComponent(tableId)}`, baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
