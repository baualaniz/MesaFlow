import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";

import { useAuth } from "../auth/auth-context";
import { Brand } from "../components/brand";
import { Icon } from "../components/icon";
import { canAccess, ROLE_LABELS, type AdminCapability } from "../tenant/access-control";
import { useActiveTenant, useTenant } from "../tenant/tenant-context";

const navigation = Object.freeze([
  { to: "/" as const, label: "Resumen", icon: "dashboard" as const, capability: "dashboard.view" as AdminCapability },
  { to: "/operacion/pedidos" as const, label: "Pedidos", icon: "orders" as const, capability: "orders.view" as AdminCapability },
  { to: "/operacion/asistencia" as const, label: "Asistencia", icon: "bell" as const, capability: "assistance.view" as AdminCapability },
  { to: "/operacion/mesas" as const, label: "Mesas", icon: "tables" as const, capability: "tables.view" as AdminCapability },
  { to: "/catalogo" as const, label: "Productos", icon: "products" as const, capability: "menu.view" as AdminCapability },
  { to: "/equipo" as const, label: "Equipo", icon: "users" as const, capability: "team.view" as AdminCapability },
  { to: "/configuracion" as const, label: "Configuración", icon: "settings" as const, capability: "settings.manage" as AdminCapability }
]);

export function AdminShell() {
  const auth = useAuth();
  const tenant = useTenant();
  const active = useActiveTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = auth.user?.displayName?.trim() || auth.user?.email?.split("@")[0] || "Usuario";
  const initials = displayName.split(/\s+/u).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const visibleNavigation = navigation.filter(({ capability }) =>
    canAccess(active.membership, capability)
  );

  async function closeSession() {
    await auth.signOut();
    await navigate({ to: "/login", search: { redirect: "/" } });
  }

  return (
    <div className="admin-app">
      <button
        aria-label="Cerrar menú"
        className={`sidebar-scrim ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
        type="button"
      />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand"><Brand /></div>
        <nav aria-label="Navegación principal">
          <p className="nav-label">GESTIÓN</p>
          {visibleNavigation.map((item) => (
            <Link
              activeProps={{ className: "nav-item active" }}
              activeOptions={{ exact: item.to === "/" }}
              className="nav-item"
              key={item.label}
              onClick={() => setSidebarOpen(false)}
              to={item.to}
            >
              <Icon name={item.icon} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-help">
          <Icon name="help" />
          <div><strong>¿Necesitás ayuda?</strong><span>Consultá la guía del panel</span></div>
        </div>
      </aside>
      <section className="app-column">
        <header className="topbar">
          <button
            aria-expanded={sidebarOpen}
            aria-label="Abrir menú"
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <Icon name="menu" />
          </button>
          <div className="venue-switcher">
            <span className="venue-mark">{active.establishment.name.slice(0, 1).toUpperCase()}</span>
            <label>
              <small>ESTABLECIMIENTO</small>
              {tenant.accesses.length > 1 ? (
                <select
                  aria-label="Establecimiento activo"
                  onChange={(event) => tenant.selectEstablishment(event.target.value)}
                  value={active.establishment.id}
                >
                  {tenant.accesses.map(({ establishment }) => (
                    <option key={establishment.id} value={establishment.id}>{establishment.name}</option>
                  ))}
                </select>
              ) : <strong>{active.establishment.name}</strong>}
            </label>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notificaciones" type="button"><Icon name="bell" /></button>
            <span className="topbar-divider" />
            <div className="account-summary">
              <span className="avatar">{initials || "MF"}</span>
              <span>
                <strong>{displayName}</strong>
                <small>{ROLE_LABELS[active.membership.role]} · {auth.user?.email}</small>
              </span>
            </div>
            <button
              aria-label="Cerrar sesión"
              className="icon-button logout-button"
              onClick={() => void closeSession()}
              type="button"
            >
              <Icon name="logout" />
            </button>
          </div>
        </header>
        <main className="admin-content" key={location.pathname}>
          <Outlet />
        </main>
      </section>
    </div>
  );
}
