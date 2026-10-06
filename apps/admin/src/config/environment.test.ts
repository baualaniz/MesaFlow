import { describe, expect, it } from "vitest";

import {
  firebaseOptionsFor,
  parseAdminEnvironment
} from "./environment";

describe("configuración de ambiente", () => {
  it("usa solamente los tres ambientes permitidos", () => {
    expect(parseAdminEnvironment("emulator")).toBe("emulator");
    expect(parseAdminEnvironment("test")).toBe("emulator");
    expect(parseAdminEnvironment("development")).toBe("development");
    expect(parseAdminEnvironment("production")).toBe("production");
    expect(() => parseAdminEnvironment("preview")).toThrow(/desconocido/u);
  });

  it("mantiene desarrollo y producción separados", () => {
    const development = firebaseOptionsFor("development");
    const production = firebaseOptionsFor("production");
    expect(development.projectId).toBe("mesaflow-desarrollo");
    expect(production.projectId).toBe("mesaflow-produccion");
    expect(development.appId).not.toBe(production.appId);
    expect(development.apiKey).not.toBe(production.apiKey);
  });

  it("el ambiente local apunta solo al proyecto demo", () => {
    const emulator = firebaseOptionsFor("emulator");
    expect(emulator.projectId).toBe("demo-mesaflow");
    expect(emulator.apiKey).toBe("demo-key");
  });
});
