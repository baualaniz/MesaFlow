import { useEffect, useMemo, useState } from "react";
import type { AssistanceStatus, AssistanceType } from "@mesaflow/contracts";

import { updateAssistanceStatus } from "../assistance/assistance-gateway";
import {
  ASSISTANCE_STATUS_LABELS,
  ASSISTANCE_TYPE_LABELS,
  assistanceElapsed,
  assistanceTableLabel,
  type AdminAssistanceRequest
} from "../assistance/assistance-model";
import { canManageAssistance } from "../assistance/assistance-permissions";
import { subscribeOperationalAssistance } from "../assistance/assistance-repository";
import { useActiveTenant } from "../tenant/tenant-context";

interface AssistanceFeed {
  readonly establishmentId: string;
  readonly requests: readonly AdminAssistanceRequest[];
  readonly error: string | null;
}

type AssistanceFilter = "all" | "pending" | "acknowledged";

function countStatus(requests: readonly AdminAssistanceRequest[], status: AssistanceStatus): number {
  return requests.filter((request) => request.status === status).length;
}

function countType(requests: readonly AdminAssistanceRequest[], type: AssistanceType): number {
  return requests.filter((request) => request.type === type).length;
}

export function AssistancePage() {
  const active = useActiveTenant();
  const [feed, setFeed] = useState<AssistanceFeed | null>(null);
  const [filter, setFilter] = useState<AssistanceFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const establishmentId = active.establishment.id;
  const canManage = canManageAssistance(active.membership);

  useEffect(() => subscribeOperationalAssistance(
    establishmentId,
    (requests) => setFeed({ establishmentId, requests, error: null }),
    () => setFeed({
      establishmentId,
      requests: [],
      error: "No pudimos mantener la cola de asistencia conectada."
    })
  ), [establishmentId, revision]);

  const currentFeed = feed?.establishmentId === establishmentId ? feed : null;
  const requests = currentFeed?.requests ?? Object.freeze([]) as readonly AdminAssistanceRequest[];
  const visibleRequests = useMemo(() => filter === "all"
    ? requests
    : requests.filter((request) => request.status === filter), [filter, requests]);

  async function moveRequest(request: AdminAssistanceRequest) {
    if (busyId !== null || !canManage) return;
    const nextStatus = request.status === "pending" ? "acknowledged" : "resolved";
    setBusyId(request.id);
    setActionError(null);
    try {
      await updateAssistanceStatus(
        establishmentId,
        request.id,
        request.status,
        nextStatus
      );
    } catch (error) {
      setActionError(error instanceof Error
        ? error.message
        : "No pudimos actualizar la solicitud.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="assistance-page">
      <div className="page-heading assistance-heading">
        <div>
          <p className="eyebrow">ATENCIÓN EN TIEMPO REAL</p>
          <h1>Asistencia</h1>
          <p>Pedidos del salón y solicitudes de cuenta de {active.establishment.name}.</p>
        </div>
        <span className="system-chip"><span className="live-dot" /> En vivo</span>
      </div>

      <section className="order-summary" aria-label="Resumen de asistencia">
        <article><span>Pendientes</span><strong>{countStatus(requests, "pending")}</strong></article>
        <article><span>En atención</span><strong>{countStatus(requests, "acknowledged")}</strong></article>
        <article><span>Llamados</span><strong>{countType(requests, "waiter")}</strong></article>
        <article><span>Cuentas</span><strong>{countType(requests, "bill")}</strong></article>
      </section>

      <div className="assistance-toolbar" role="group" aria-label="Filtrar solicitudes">
        {([
          ["all", "Todas"],
          ["pending", "Pendientes"],
          ["acknowledged", "En atención"]
        ] as const).map(([value, label]) => (
          <button
            className={filter === value ? "active" : ""}
            key={value}
            onClick={() => setFilter(value)}
            type="button"
          >{label}</button>
        ))}
      </div>

      {actionError !== null && (
        <div className="table-alert" role="alert">
          <span>{actionError}</span>
          <button aria-label="Cerrar error" onClick={() => setActionError(null)} type="button">×</button>
        </div>
      )}

      {currentFeed === null ? (
        <section className="orders-feedback" aria-live="polite">
          <span className="loading-line" />
          <strong>Conectando la cola de asistencia…</strong>
        </section>
      ) : currentFeed.error !== null ? (
        <section className="orders-feedback error" aria-live="assertive">
          <strong>{currentFeed.error}</strong>
          <p>La información anterior se descartó para no mostrar datos desactualizados.</p>
          <button className="secondary-button" onClick={() => {
            setFeed(null);
            setRevision((value) => value + 1);
          }} type="button">Reintentar</button>
        </section>
      ) : visibleRequests.length === 0 ? (
        <section className="orders-feedback" aria-live="polite">
          <span className="empty-check">✓</span>
          <strong>{requests.length === 0 ? "No hay solicitudes activas" : "No hay solicitudes con este filtro"}</strong>
          <p>Los nuevos llamados aparecerán acá sin recargar la página.</p>
        </section>
      ) : (
        <section className="assistance-grid" aria-label="Solicitudes de asistencia">
          {visibleRequests.map((request) => (
            <article className={`assistance-card status-${request.status}`} key={request.id}>
              <header>
                <span className={`assistance-kind ${request.type}`}>
                  {request.type === "bill" ? "$" : request.type === "waiter" ? "!" : "?"}
                </span>
                <div>
                  <h2>{assistanceTableLabel(request.tableId)}</h2>
                  <span>{ASSISTANCE_TYPE_LABELS[request.type]}</span>
                </div>
                <time>{assistanceElapsed(request.createdAt)}</time>
              </header>
              <div className="assistance-card-body">
                <span className={`assistance-status ${request.status}`}>
                  {ASSISTANCE_STATUS_LABELS[request.status]}
                </span>
                <small>Referencia {request.id.slice(0, 14)}</small>
              </div>
              <footer>
                {canManage ? (
                  <button
                    className="primary-button"
                    disabled={busyId !== null}
                    onClick={() => void moveRequest(request)}
                    type="button"
                  >
                    {busyId === request.id
                      ? "Actualizando…"
                      : request.status === "pending" ? "Atender" : "Resolver"}
                  </button>
                ) : <small>Tu rol puede ver la cola, pero no modificarla.</small>}
              </footer>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
