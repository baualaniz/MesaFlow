import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";

import { resetErrorMessage, signInErrorMessage } from "./auth-errors";

describe("mensajes de autenticación", () => {
  it("no permite enumerar cuentas por el mensaje de ingreso", () => {
    const wrongPassword = signInErrorMessage(
      new FirebaseError("auth/wrong-password", "detalle remoto")
    );
    const missingUser = signInErrorMessage(
      new FirebaseError("auth/user-not-found", "detalle remoto")
    );
    expect(wrongPassword).toBe(missingUser);
    expect(wrongPassword).not.toContain("detalle remoto");
  });

  it("distingue formato y conectividad sin revelar datos internos", () => {
    expect(signInErrorMessage(new FirebaseError("auth/invalid-email", "x")))
      .toMatch(/correo electrónico válido/u);
    expect(signInErrorMessage(new FirebaseError("auth/network-request-failed", "x")))
      .toMatch(/conexión/u);
  });

  it("la recuperación devuelve mensajes seguros", () => {
    expect(resetErrorMessage(new FirebaseError("auth/user-not-found", "x")))
      .not.toMatch(/usuario|cuenta inexistente/u);
  });
});
