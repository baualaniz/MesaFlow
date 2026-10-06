import { Link } from "@tanstack/react-router";

import { useAuth } from "../auth/auth-context";
import { Icon } from "../components/icon";

const cards = Object.freeze([
  { label: "Pedidos activos", value: "—", meta: "Se habilita en la Etapa 33", icon: "orders" as const, tone: "sage" },
  { label: "Mesas ocupadas", value: "—", meta: "Se habilita en la Etapa 34", icon: "tables" as const, tone: "sand" },
  { label: "Productos", value: "18", meta: "Catálogo demo preparado", icon: "products" as const, tone: "blue" }
]);

export function DashboardPage() {
  const { user } = useAuth();
  const name = user?.displayName?.split(" ")[0] || "equipo";

  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">RESUMEN GENERAL</p>
          <h1>Buen servicio, {name}.</h1>
          <p>El acceso privado ya está protegido y listo para sumar la operación en tiempo real.</p>
        </div>
        <span className="system-chip"><span className="live-dot" /> Sistema conectado</span>
      </div>
      <section className="metric-grid" aria-label="Indicadores del establecimiento">
        {cards.map((card) => (
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
              Firebase Authentication conserva tu sesión y protege cada ruta.
              El próximo módulo conectará las membresías y permisos por establecimiento.
            </p>
            <Link className="light-button" to="/operacion/pedidos">
              Ver área de pedidos <Icon name="arrow" />
            </Link>
          </div>
          <div className="welcome-visual" aria-hidden="true">
            <span className="plate"><i /><i /><i /></span>
          </div>
        </article>
        <article className="activity-card">
          <div className="section-title"><div><p className="eyebrow">ACTIVIDAD</p><h2>Todo en orden</h2></div><span className="live-dot" /></div>
          <div className="empty-activity">
            <span>✓</span>
            <strong>No hay acciones pendientes</strong>
            <p>Los movimientos de la operación aparecerán aquí.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
