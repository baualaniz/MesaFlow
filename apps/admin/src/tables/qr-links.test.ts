import { describe, expect, it } from "vitest";

import { buildCustomerQrUrl, customerBaseUrlFor } from "./qr-url";

describe("enlaces QR imprimibles", () => {
  it("usa orígenes separados por ambiente", () => {
    expect(customerBaseUrlFor("emulator")).toBe("http://127.0.0.1:5100");
    expect(customerBaseUrlFor("development")).toContain("mesaflow-desarrollo");
    expect(customerBaseUrlFor("production")).toContain("mesaflow-produccion");
  });

  it("construye el deep link con un único token", () => {
    const value = buildCustomerQrUrl("mesa-flow-demo", "mesa-01", "token_seguro", "https://cliente.example");
    const url = new URL(value);
    expect(url.pathname).toBe("/e/mesa-flow-demo/table/mesa-01");
    expect(url.searchParams.getAll("token")).toEqual(["token_seguro"]);
  });
});
