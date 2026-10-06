import { describe, expect, it } from "vitest";

import { loginRedirectFor, safeInternalRedirect } from "./guards";

describe("guards del panel", () => {
  it("envía al login conservando una ruta interna segura", () => {
    const destination = loginRedirectFor(false, "/operacion/pedidos");
    expect(destination).toEqual({
      to: "/login",
      search: { redirect: "/operacion/pedidos" }
    });
    expect(Object.isExtensible(destination)).toBe(true);
    expect(Object.isExtensible(destination?.search)).toBe(true);
  });

  it("permite continuar a un usuario autenticado", () => {
    expect(loginRedirectFor(true, "/operacion/pedidos")).toBeNull();
  });

  it("no admite redirecciones externas ni rutas ambiguas", () => {
    for (const value of ["https://example.com", "//example.com", "operacion", "/\\example.com", null]) {
      expect(safeInternalRedirect(value)).toBe("/");
    }
  });

  it("conserva rutas internas válidas", () => {
    expect(safeInternalRedirect("/operacion/pedidos?estado=nuevo")).toBe(
      "/operacion/pedidos?estado=nuevo"
    );
  });
});
