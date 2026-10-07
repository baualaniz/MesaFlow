import { useEffect, useMemo, useState } from "react";
import {
  availableOrderTransitions,
  type OrderStatus
} from "@mesaflow/contracts";

import {
  formatOrderMoney,
  formatOrderTime,
  ORDER_ACTION_LABELS,
  ORDER_STATUS_LABELS,
  tableLabel,
  type AdminOrder
} from "../orders/order-model";
import {
  subscribeOperationalOrders
} from "../orders/order-repository";
import { updateOrderStatus } from "../orders/order-gateway";
import { visibleOperationalStatuses } from "../orders/order-visibility";
import { useActiveTenant } from "../tenant/tenant-context";

interface OrderFeed {
  readonly establishmentId: string;
  readonly orders: readonly AdminOrder[];
  readonly error: string | null;
}

function orderCount(orders: readonly AdminOrder[], status: OrderStatus): number {
  return orders.filter((order) => order.status === status).length;
}

export function OrdersPage() {
  const active = useActiveTenant();
  const [feed, setFeed] = useState<OrderFeed | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const establishmentId = active.establishment.id;
  const role = active.membership.role;

  useEffect(() => subscribeOperationalOrders(
    establishmentId,
    role,
    (orders) => setFeed({ establishmentId, orders, error: null }),
    () => setFeed({
      establishmentId,
      orders: [],
      error: "No pudimos mantener la cola de pedidos conectada."
    })
  ), [establishmentId, role, revision]);

  const currentFeed = feed?.establishmentId === establishmentId ? feed : null;
  const orders = currentFeed?.orders ?? Object.freeze([]) as readonly AdminOrder[];
  const statuses = visibleOperationalStatuses(role);
  const selectedOrder = selectedOrderId === null
    ? null
    : orders.find(({ id }) => id === selectedOrderId) ?? null;
  const transitions = useMemo(() => selectedOrder === null
    ? Object.freeze([]) as readonly OrderStatus[]
    : availableOrderTransitions(selectedOrder.status, active.membership),
  [active.membership, selectedOrder]);

  async function moveOrder(nextStatus: OrderStatus) {
    if (selectedOrder === null || busy) return;
    if (nextStatus === "cancelled" && !window.confirm(
      `¿Cancelar el pedido de ${tableLabel(selectedOrder.tableId)}? Esta acción actualizará el saldo de la mesa.`
    )) return;
    setBusy(true);
    setTransitionError(null);
    try {
      await updateOrderStatus(
        establishmentId,
        selectedOrder.id,
        selectedOrder.status,
        nextStatus
      );
    } catch (error) {
      setTransitionError(error instanceof Error ? error.message : "No pudimos actualizar el pedido.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="orders-page">
      <div className="page-heading orders-heading">
        <div>
          <p className="eyebrow">OPERACIÓN EN TIEMPO REAL</p>
          <h1>Pedidos</h1>
          <p>La cola se actualiza automáticamente para {active.establishment.name}.</p>
        </div>
        <span className="system-chip"><span className="live-dot" /> En vivo</span>
      </div>

      <section className="order-summary" aria-label="Resumen operativo">
        <article>
          <span>{role === "kitchen" ? "Confirmados" : "Nuevos"}</span>
          <strong>{orderCount(orders, role === "kitchen" ? "confirmed" : "created")}</strong>
        </article>
        <article><span>En preparación</span><strong>{orderCount(orders, "preparing")}</strong></article>
        <article><span>Listos</span><strong>{orderCount(orders, "ready")}</strong></article>
        <article><span>Total visible</span><strong>{orders.length}</strong></article>
      </section>

      {currentFeed === null ? (
        <section className="orders-feedback" aria-live="polite">
          <span className="loading-line" />
          <strong>Conectando la cola de pedidos…</strong>
        </section>
      ) : currentFeed.error !== null ? (
        <section className="orders-feedback error" aria-live="assertive">
          <strong>{currentFeed.error}</strong>
          <p>La última información se descartó para no mostrar datos desactualizados.</p>
          <button className="secondary-button" onClick={() => {
            setFeed(null);
            setRevision((value) => value + 1);
          }} type="button">Reintentar</button>
        </section>
      ) : orders.length === 0 ? (
        <section className="orders-feedback" aria-live="polite">
          <span className="empty-check">✓</span>
          <strong>No hay pedidos pendientes</strong>
          <p>Los nuevos pedidos aparecerán acá sin recargar la página.</p>
        </section>
      ) : (
        <section
          aria-label="Tablero de pedidos"
          className="order-board"
          style={{ "--order-columns": statuses.length } as React.CSSProperties}
        >
          {statuses.map((status) => {
            const columnOrders = orders.filter((order) => order.status === status);
            return (
              <section className={`order-column status-${status}`} key={status}>
                <header>
                  <span>{ORDER_STATUS_LABELS[status]}</span>
                  <strong>{columnOrders.length}</strong>
                </header>
                <div className="order-column-list">
                  {columnOrders.length === 0 ? (
                    <p className="empty-column">Sin pedidos</p>
                  ) : columnOrders.map((order) => (
                    <button
                      className="order-card"
                      key={order.id}
                      onClick={() => {
                        setTransitionError(null);
                        setSelectedOrderId(order.id);
                      }}
                      type="button"
                    >
                      <span className="order-card-top">
                        <strong>{tableLabel(order.tableId)}</strong>
                        <time>{formatOrderTime(order.createdAt)}</time>
                      </span>
                      <span className="order-items-preview">
                        {order.items.map((item) => `${item.quantity}× ${item.name}`).join(" · ")}
                      </span>
                      <span className="order-card-bottom">
                        <small>{order.items.reduce((sum, item) => sum + item.quantity, 0)} productos</small>
                        <strong>{formatOrderMoney(order.totalMinor, order.currency)}</strong>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </section>
      )}

      {selectedOrder !== null && (
        <div className="order-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target && !busy) setSelectedOrderId(null);
        }}>
          <section
            aria-labelledby="order-dialog-title"
            aria-modal="true"
            className="order-dialog"
            role="dialog"
          >
            <header>
              <div>
                <p className="eyebrow">DETALLE DEL PEDIDO</p>
                <h2 id="order-dialog-title">{tableLabel(selectedOrder.tableId)}</h2>
                <span className={`order-status status-${selectedOrder.status}`}>
                  {ORDER_STATUS_LABELS[selectedOrder.status]}
                </span>
              </div>
              <button
                aria-label="Cerrar detalle"
                className="dialog-close"
                disabled={busy}
                onClick={() => setSelectedOrderId(null)}
                type="button"
              >×</button>
            </header>
            <div className="order-dialog-meta">
              <span>Creado <strong>{formatOrderTime(selectedOrder.createdAt)}</strong></span>
              <span>Referencia <strong>{selectedOrder.id.slice(0, 10)}</strong></span>
            </div>
            <div className="order-detail-items">
              {selectedOrder.items.map((item, index) => (
                <article key={`${item.productId}-${index}`}>
                  <span className="item-quantity">{item.quantity}</span>
                  <div>
                    <strong>{item.name}</strong>
                    {item.notes !== null && <small>Nota: {item.notes}</small>}
                  </div>
                  <span>{formatOrderMoney(item.lineTotalMinor, selectedOrder.currency)}</span>
                </article>
              ))}
            </div>
            {selectedOrder.notes !== null && (
              <p className="order-general-note"><strong>Nota general:</strong> {selectedOrder.notes}</p>
            )}
            <div className="order-total">
              <span>Total</span>
              <strong>{formatOrderMoney(selectedOrder.totalMinor, selectedOrder.currency)}</strong>
            </div>
            {transitionError !== null && <p className="order-action-error" role="alert">{transitionError}</p>}
            <footer className="order-actions">
              {transitions.length === 0 ? (
                <p>No hay acciones disponibles para tu rol en este estado.</p>
              ) : transitions.map((status) => (
                <button
                  className={status === "cancelled" ? "danger-button" : "primary-button"}
                  disabled={busy}
                  key={status}
                  onClick={() => void moveOrder(status)}
                  type="button"
                >
                  {busy ? "Actualizando…" : ORDER_ACTION_LABELS[status]}
                </button>
              ))}
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
