import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { useAuth } from "../auth/auth-context";
import { Icon } from "../components/icon";
import {
  formatMetricDate,
  formatMetricMoney,
  productMetricLabel,
  summarizeMetrics,
  type AdminDailyMetric
} from "../metrics/metrics-model";
import { subscribeRecentMetrics } from "../metrics/metrics-repository";
import { canAccess, ROLE_LABELS } from "../tenant/access-control";
import { useActiveTenant } from "../tenant/tenant-context";

interface MetricFeed {
  readonly establishmentId: string;
  readonly metrics: readonly AdminDailyMetric[];
  readonly error: string | null;
}

export function DashboardPage() {
  const { user } = useAuth();
  const active = useActiveTenant();
  const [feed, setFeed] = useState<MetricFeed | null>(null);
  const [revision, setRevision] = useState(0);
  const name = user?.displayName?.split(" ")[0] || "equipo";
  const establishmentId = active.establishment.id;
  const canViewOrders = canAccess(active.membership, "orders.view");
  const canViewMetrics = canAccess(active.membership, "metrics.read");

  useEffect(() => {
    if (!canViewMetrics) return undefined;
    return subscribeRecentMetrics(
      establishmentId,
      (metrics) => setFeed({ establishmentId, metrics, error: null }),
      () => setFeed({
        establishmentId,
        metrics: [],
        error: "No pudimos mantener las métricas conectadas."
      })
    );
  }, [canViewMetrics, establishmentId, revision]);

  const currentFeed = feed?.establishmentId === establishmentId ? feed : null;
  const metrics = currentFeed?.metrics ?? Object.freeze([]) as readonly AdminDailyMetric[];
  const summary = useMemo(() => summarizeMetrics(metrics), [metrics]);
  const chronological = useMemo(() => [...metrics].reverse(), [metrics]);
  const maximumSale = Math.max(1, ...metrics.map(({ salesMinor }) => salesMinor));
  const periodLabel = metrics.length === 0
    ? "Sin actividad registrada"
    : metrics.length === 1 ? formatMetricDate(metrics[0]?.date ?? "") : `Últimos ${metrics.length} días`;

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

      {canViewMetrics && currentFeed === null ? (
        <section className="orders-feedback compact-feedback" aria-live="polite">
          <span className="loading-line" />
          <strong>Calculando el resumen del establecimiento…</strong>
        </section>
      ) : canViewMetrics && currentFeed?.error !== null ? (
        <section className="orders-feedback error compact-feedback" aria-live="assertive">
          <strong>{currentFeed?.error}</strong>
          <button className="secondary-button" onClick={() => {
            setFeed(null);
            setRevision((value) => value + 1);
          }} type="button">Reintentar</button>
        </section>
      ) : canViewMetrics ? (
        <>
          <section className="metric-grid metrics-four" aria-label="Indicadores del establecimiento">
            <article className="metric-card">
              <span className="metric-icon sage"><Icon name="dashboard" /></span>
              <div><p>Ventas</p><strong>{formatMetricMoney(summary.salesMinor, active.establishment.currency)}</strong><small>{periodLabel}</small></div>
            </article>
            <article className="metric-card">
              <span className="metric-icon sand"><Icon name="orders" /></span>
              <div><p>Pagos aprobados</p><strong>{summary.approvedPayments}</strong><small>{periodLabel}</small></div>
            </article>
            <article className="metric-card">
              <span className="metric-icon blue"><Icon name="products" /></span>
              <div><p>Pedidos completados</p><strong>{summary.completedOrders}</strong><small>{periodLabel}</small></div>
            </article>
            <article className="metric-card">
              <span className="metric-icon sage"><Icon name="tables" /></span>
              <div><p>Pedidos activos</p><strong>{summary.activeOrders}</strong><small>Del período visible</small></div>
            </article>
          </section>
          <section className="dashboard-grid metrics-dashboard-grid">
            <article className="sales-card">
              <div className="section-title">
                <div><p className="eyebrow">VENTAS DIARIAS</p><h2>{periodLabel}</h2></div>
                <strong>{formatMetricMoney(summary.salesMinor, active.establishment.currency)}</strong>
              </div>
              {chronological.length === 0 ? (
                <div className="empty-activity"><span>—</span><strong>Sin ventas registradas</strong><p>Los pagos aprobados aparecerán automáticamente.</p></div>
              ) : (
                <div className="sales-chart" aria-label="Ventas por día">
                  {chronological.map((metric) => (
                    <div className="sales-bar-column" key={metric.id}>
                      <small>{formatMetricMoney(metric.salesMinor, active.establishment.currency)}</small>
                      <span className="sales-bar-track">
                        <i style={{ height: `${Math.max(5, metric.salesMinor / maximumSale * 100)}%` }} />
                      </span>
                      <strong>{formatMetricDate(metric.date)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>
            <article className="activity-card top-products-card">
              <div className="section-title"><div><p className="eyebrow">PRODUCTOS</p><h2>Más pedidos</h2></div><span className="live-dot" /></div>
              {summary.topProducts.length === 0 ? (
                <div className="empty-activity"><span>—</span><strong>Sin productos registrados</strong></div>
              ) : (
                <ol>
                  {summary.topProducts.map((product, index) => (
                    <li key={product.productId}>
                      <span>{index + 1}</span>
                      <strong>{productMetricLabel(product.productId)}</strong>
                      <small>{product.quantity} u.</small>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          </section>
        </>
      ) : (
        <section className="dashboard-grid dashboard-operational">
          <article className="welcome-card">
            <div>
              <p className="eyebrow light">PANEL OPERATIVO</p>
              <h2>Todo listo para el servicio.</h2>
              <p>
                La navegación muestra únicamente las áreas habilitadas para tu rol.
                Las métricas comerciales están reservadas para administración.
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
      )}
    </div>
  );
}
