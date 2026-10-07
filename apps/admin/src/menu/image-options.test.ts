import { describe, expect, it } from "vitest";

import { MENU_IMAGE_OPTIONS, menuImageOption } from "./image-options";

describe("imágenes empaquetadas del menú", () => {
  it("expone cuatro recortes únicos y reconoce sus claves", () => {
    expect(MENU_IMAGE_OPTIONS).toHaveLength(4);
    expect(new Set(MENU_IMAGE_OPTIONS.map(({ value }) => value)).size).toBe(4);
    expect(menuImageOption("menu.torta-chocolate")?.label).toContain("Torta");
    expect(menuImageOption("storage/dinamico.jpg")).toBeNull();
  });
});
