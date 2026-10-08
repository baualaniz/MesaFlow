// @vitest-environment jsdom

import type { ReactNode } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FirebaseError } from "firebase/app";
import type { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext, type AuthContextValue } from "../auth/auth-context";
import { AdminShell } from "../layouts/admin-shell";
import { TenantContext, type TenantContextValue } from "../tenant/tenant-context";
import type { AdminRole, TenantAccess } from "../tenant/tenant-model";
import { LoginPage } from "./login-page";
import { ResetPasswordPage } from "./reset-password-page";

const router = vi.hoisted(() => ({
  navigate: vi.fn(),
  redirect: "/operacion/pedidos"
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, onClick, to }: {
    readonly children: ReactNode;
    readonly onClick?: () => void;
    readonly to: string;
  }) => <a href={to} onClick={onClick}>{children}</a>,
  Outlet: () => <div data-testid="route-content" />,
  useLocation: () => ({ pathname: "/" }),
  useNavigate: () => router.navigate,
  useSearch: () => ({ redirect: router.redirect })
}));

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    loading: false,
    sendPasswordReset: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    user: null,
    ...overrides
  };
}

function renderWithAuth(page: ReactNode, auth: AuthContextValue) {
  return render(<AuthContext.Provider value={auth}>{page}</AuthContext.Provider>);
}

function access(role: AdminRole, id = "mesa-flow-demo"): TenantAccess {
  const permissions = role === "kitchen"
    ? ["orders.prepare"]
    : ["assistance.manage", "menu.manage", "metrics.read", "orders.manage"];
  return {
    establishment: {
      active: true,
      currency: "ARS",
      id,
      name: id === "mesa-flow-demo" ? "Casa Jacarandá" : "Bistró Sur",
      slug: id,
      timezone: "America/Argentina/Buenos_Aires"
    },
    membership: {
      active: true,
      establishmentId: id,
      permissions,
      role,
      uid: "usuario-prueba"
    }
  };
}

function shellContexts(role: AdminRole, multiple = false) {
  const active = access(role);
  const accesses = multiple ? [active, access(role, "bistro-sur")] : [active];
  const auth: AuthContextValue = {
    loading: false,
    sendPasswordReset: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    user: {
      displayName: "Ada Lovelace",
      email: "ada@mesaflow.test"
    } as User
  };
  const tenant: TenantContextValue = {
    accesses,
    activeAccess: active,
    reload: vi.fn(),
    selectEstablishment: vi.fn(),
    status: "ready"
  };
  return { auth, tenant };
}

function renderShell(auth: AuthContextValue, tenant: TenantContextValue) {
  return render(
    <AuthContext.Provider value={auth}>
      <TenantContext.Provider value={tenant}>
        <AdminShell />
      </TenantContext.Provider>
    </AuthContext.Provider>
  );
}

describe("páginas de autenticación", () => {
  beforeEach(() => {
    router.navigate.mockReset();
    router.redirect = "/operacion/pedidos";
  });

  it("inicia sesión, permite revisar la contraseña y respeta el retorno seguro", async () => {
    const user = userEvent.setup();
    const auth = authValue();
    renderWithAuth(<LoginPage />, auth);

    const password = screen.getByLabelText("Contraseña");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password).toHaveAttribute("type", "text");

    await user.type(screen.getByLabelText("Correo electrónico"), "equipo@mesaflow.test");
    await user.type(password, "clave-segura");
    await user.click(screen.getByRole("button", { name: /Ingresar al panel/u }));

    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith(
      "equipo@mesaflow.test",
      "clave-segura"
    ));
    expect(router.navigate).toHaveBeenCalledWith({ to: "/operacion/pedidos" });
  });

  it("muestra un error y vuelve a habilitar el ingreso si Firebase rechaza la sesión", async () => {
    const user = userEvent.setup();
    const signIn = vi.fn().mockRejectedValue(new FirebaseError("auth/invalid-email", "inválido"));
    renderWithAuth(<LoginPage />, authValue({ signIn }));

    await user.type(screen.getByLabelText("Correo electrónico"), "correo-invalido");
    await user.type(screen.getByLabelText("Contraseña"), "clave-segura");
    await user.click(screen.getByRole("button", { name: /Ingresar al panel/u }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ingresá un correo electrónico válido."
    );
    expect(screen.getByRole("button", { name: /Ingresar al panel/u })).toBeEnabled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("confirma el envío de recuperación sin revelar si existe la cuenta", async () => {
    const user = userEvent.setup();
    const auth = authValue();
    renderWithAuth(<ResetPasswordPage />, auth);

    await user.type(screen.getByLabelText("Correo electrónico"), "persona@mesaflow.test");
    await user.click(screen.getByRole("button", { name: /Enviar instrucciones/u }));

    await waitFor(() => expect(auth.sendPasswordReset).toHaveBeenCalledWith(
      "persona@mesaflow.test"
    ));
    expect(screen.getByRole("status")).toHaveTextContent("Revisá tu correo");
    expect(screen.queryByText("persona@mesaflow.test")).not.toBeInTheDocument();
  });

  it("permite reintentar la recuperación después de una falla de red", async () => {
    const user = userEvent.setup();
    const sendPasswordReset = vi.fn().mockRejectedValue(
      new FirebaseError("auth/network-request-failed", "sin red")
    );
    renderWithAuth(<ResetPasswordPage />, authValue({ sendPasswordReset }));

    await user.type(screen.getByLabelText("Correo electrónico"), "persona@mesaflow.test");
    await user.click(screen.getByRole("button", { name: /Enviar instrucciones/u }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No hay conexión con el servicio.");
    expect(screen.getByRole("button", { name: /Enviar instrucciones/u })).toBeEnabled();
  });
});

describe("shell administrativo", () => {
  beforeEach(() => router.navigate.mockReset());

  it("muestra a cocina únicamente las rutas autorizadas", () => {
    const { auth, tenant } = shellContexts("kitchen");
    renderShell(auth, tenant);

    expect(screen.getByRole("link", { name: /Resumen/u })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pedidos/u })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Asistencia/u })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Productos/u })).not.toBeInTheDocument();
    expect(screen.getByText("Cocina · ada@mesaflow.test")).toBeInTheDocument();
  });

  it("cambia de establecimiento y cierra sesión desde los controles reales", async () => {
    const user = userEvent.setup();
    const { auth, tenant } = shellContexts("owner", true);
    renderShell(auth, tenant);

    expect(screen.getByRole("link", { name: /Configuración/u })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Establecimiento activo"), "bistro-sur");
    expect(tenant.selectEstablishment).toHaveBeenCalledWith("bistro-sur");

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledOnce());
    expect(router.navigate).toHaveBeenCalledWith({
      search: { redirect: "/" },
      to: "/login"
    });
  });

  it("abre y cierra el menú lateral en pantallas pequeñas", async () => {
    const user = userEvent.setup();
    const { auth, tenant } = shellContexts("staff");
    const { container } = renderShell(auth, tenant);

    const open = screen.getByRole("button", { name: "Abrir menú" });
    expect(open).toHaveAttribute("aria-expanded", "false");
    await user.click(open);
    expect(open).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector(".sidebar")).toHaveClass("open");

    await user.click(screen.getByRole("button", { name: "Cerrar menú" }));
    expect(open).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector(".sidebar")).not.toHaveClass("open");
  });
});
