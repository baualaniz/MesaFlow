export function safeInternalRedirect(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") ||
      value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  return value;
}

export function loginRedirectFor(
  authenticated: boolean,
  requestedPath: string
): { readonly to: "/login"; readonly search: { readonly redirect: string } } | null {
  if (authenticated) return null;
  // TanStack Router completa este objeto con metadatos como statusCode.
  // Debe conservarse mutable aunque su tipo público sea de solo lectura.
  return {
    to: "/login" as const,
    search: { redirect: safeInternalRedirect(requestedPath) }
  };
}
