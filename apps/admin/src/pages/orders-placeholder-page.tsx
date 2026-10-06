import { Icon } from "../components/icon";
import { ROLE_LABELS } from "../tenant/access-control";
import { useActiveTenant } from "../tenant/tenant-context";

export function OrdersPlaceholderPage() {
  const active = useActiveTenant();
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OPERACIÓN</p>
          <h1>Pedidos</h1>
          <p>
            Acceso habilitado para {ROLE_LABELS[active.membership.role].toLowerCase()} en {active.establishment.name}.
            El tablero en tiempo real se incorpora en la Etapa 33.
          </p>
        </div>
      </div>
      <section className="module-placeholder">
        <span className="metric-icon sage"><Icon name="orders" size={26} /></span>
        <h2>Tablero operativo preparado</h2>
        <p>La sesión, la membresía activa y el permiso operativo fueron validados.</p>
      </section>
    </div>
  );
}
