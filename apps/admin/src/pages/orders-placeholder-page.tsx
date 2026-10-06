import { Icon } from "../components/icon";

export function OrdersPlaceholderPage() {
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <p className="eyebrow">OPERACIÓN</p>
          <h1>Pedidos</h1>
          <p>Esta ruta privada ya está protegida. El tablero en tiempo real se incorpora en la Etapa 33.</p>
        </div>
      </div>
      <section className="module-placeholder">
        <span className="metric-icon sage"><Icon name="orders" size={26} /></span>
        <h2>Tablero operativo preparado</h2>
        <p>Solo una cuenta autenticada puede llegar hasta esta pantalla.</p>
      </section>
    </div>
  );
}
