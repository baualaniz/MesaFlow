import { Link } from "@tanstack/react-router";

import { useAuth } from "../auth/auth-context";
import { Icon } from "../components/icon";
import { canAccess, ROLE_LABELS } from "../tenant/access-control";
import { useActiveTenant } from "../tenant/tenant-context";

const cards = Object.freeze([
  { label: "Pedidos activos", value: "—", meta: "Se habilita en la Etapa 33", icon: "orders" as const, tone: "sage" },
  { label: "Mesas ocupadas", value: "—", meta: "Se habilita en la Etapa 34", icon: "tables" as const, tone: "sand" },
  { label: "Productos", value: "18", meta: "Catálogo demo preparado", icon: "products" as const, tone: "blue" }
]);

export function DashboardPage() {
  const { user } = useAuth();
  const active = useActiveTenant();
  const name = user?.displayName?.split(" ")[0] || "equipo";
  const canViewOrders = canAccess(active.membership, "orders.view");
  const visibleCards = cards.filter((card) =>
    card.label !== "Productos" || canAccess(active.membership, "menu.view")
  );

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">RESUMEN GENERAL</p>
          <h1>Buen servicio, {name}.</h1>
          <p>
            Estás trabajando en {active.establishment.name} como {ROLE_LABELS[active.membership.role].toLowerCase()}.
          </p>
        </div>
        <span className="system-chip"><span className="live-dot" /> Sistema conectado</span>
      </div>
      <section className="metric-grid" aria-label="Indicadores del establecimiento">
        {visibleCards.map((card) => (
          <article className="metric-card" key={card.label}>
            <span className={`metric-icon ${card.tone}`}><Icon name={card.icon} /></span>
            <div><p>{card.label}</p><strong>{card.value}</strong><small>{card.meta}</small></div>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="welcome-card">
          <div>
            <p className="eyebrow light">PANEL OPERATIVO</p>
            <h2>La base está lista para trabajar.</h2>
            <p>
              Tu membresía fue validada en Firestore y la navegación muestra únicamente
              las áreas habilitadas para tu rol en este establecimiento.
            </p>
            {canViewOrders && (
              <Link className="light-button" to="/operacion/pedidos">
                Ver área de pedidos <Icon name="arrow" />
              </Link>
            )}
          </div>
          <div className="welcome-visual" aria-hidden="true">
            <span className="plate"><i /><i /><i /></span>
          </div>
        </article>
        <article className="activity-card">
          <div className="section-title"><div><p className="eyebrow">ACCESO</p><h2>{ROLE_LABELS[active.membership.role]}</h2></div><span className="live-dot" /></div>
          <div className="empty-activity">
            <span>✓</span>
            <strong>Membresía activa</strong>
            <p>{active.membership.permissions.length} permisos verificados para {active.establishment.name}.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
