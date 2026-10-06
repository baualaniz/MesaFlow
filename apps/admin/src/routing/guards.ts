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
  return Object.freeze({
    to: "/login" as const,
    search: Object.freeze({ redirect: safeInternalRedirect(requestedPath) })
  });
}
