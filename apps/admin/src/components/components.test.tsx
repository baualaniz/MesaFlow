// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Brand } from "./brand";
import { Icon } from "./icon";
import { LoadingScreen } from "./loading-screen";

describe("componentes compartidos del panel", () => {
  it("expone la marca completa y oculta su decoración", () => {
    const { container } = render(<Brand />);

    expect(screen.getByLabelText("MesaFlow")).toHaveTextContent("MesaFlow");
    expect(container.querySelector(".brand-mark")).toHaveAttribute("aria-hidden", "true");
  });

  it("permite una variante compacta sin duplicar el nombre visible", () => {
    render(<Brand compact />);

    expect(screen.getByLabelText("MesaFlow")).toBeInTheDocument();
    expect(screen.queryByText("MesaFlow")).not.toBeInTheDocument();
  });

  it("renderiza iconos decorativos con tamaño controlado", () => {
    const { container } = render(<Icon name="orders" size={28} />);
    const icon = container.querySelector("svg");

    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("height", "28");
    expect(icon).toHaveAttribute("width", "28");
  });

  it("anuncia la pantalla de carga sin exponer la animación", () => {
    const { container } = render(<LoadingScreen />);
    const loading = screen.getByLabelText("Cargando panel");

    expect(loading).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector(".loading-line")).toHaveAttribute("aria-hidden", "true");
  });
});
