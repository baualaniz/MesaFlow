import { describe, expect, it } from "vitest";

import { loginRedirectFor, safeInternalRedirect } from "./guards";

describe("guards del panel", () => {
  it("envía al login conservando una ruta interna segura", () => {
    expect(loginRedirectFor(false, "/operacion/pedidos")).toEqual({
      to: "/login",
      search: { redirect: "/operacion/pedidos" }
    });
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
