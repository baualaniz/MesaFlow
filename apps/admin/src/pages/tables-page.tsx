import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  closeTableSession,
  createTable,
  deleteTable,
  openTableSession,
  rotateTableQrs,
  updateTable
} from "../tables/table-gateway";
import {
  tableOperationalLabel,
  type AdminTable,
  type AdminTableSession
} from "../tables/table-model";
import { canManageTables } from "../tables/table-permissions";
import { printableQr, type PrintableQr } from "../tables/qr-links";
import { subscribeTables, type TableFeed } from "../tables/table-repository";
import { useActiveTenant } from "../tenant/tenant-context";

interface ScopedFeed extends TableFeed {
  readonly establishmentId: string;
  readonly error: string | null;
}

interface EditorState {
  readonly table: AdminTable | null;
  readonly name: string;
  readonly number: string;
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value / 100);
}

function currentSession(
  table: AdminTable,
  sessions: ReadonlyMap<string, AdminTableSession>
): AdminTableSession | null {
  return table.currentSessionId === null ? null : sessions.get(table.currentSessionId) ?? null;
}

export function TablesPage() {
  const active = useActiveTenant();
  const [feed, setFeed] = useState<ScopedFeed | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [printables, setPrintables] = useState<readonly PrintableQr[]>([]);
  const establishmentId = active.establishment.id;
  const mayManage = canManageTables(active.membership);

  useEffect(() => subscribeTables(
    establishmentId,
    (next) => setFeed({ ...next, establishmentId, error: null }),
    () => setFeed({
      establishmentId,
      tables: Object.freeze([]),
      sessions: new Map(),
      error: "No pudimos mantener las mesas conectadas."
    })
  ), [establishmentId, revision]);

  const currentFeed = feed?.establishmentId === establishmentId ? feed : null;
  const tables = currentFeed?.tables ?? Object.freeze([]) as readonly AdminTable[];
  const sessions = currentFeed?.sessions ?? new Map<string, AdminTableSession>();
  const summary = useMemo(() => ({
    active: tables.filter((table) => table.active).length,
    available: tables.filter((table) => table.active && table.currentSessionId === null).length,
    inService: tables.filter((table) => table.currentSessionId !== null).length,
    inactive: tables.filter((table) => !table.active).length
  }), [tables]);

  async function operation(key: string, action: () => Promise<void>) {
    if (busy !== null) return;
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos completar la operación.");
    } finally {
      setBusy(null);
    }
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editor === null) return;
    const name = editor.name.trim();
    const number = Number(editor.number);
    if (name.length < 2 || !Number.isSafeInteger(number) || number < 1 || number > 999) {
      setError("Ingresá un nombre y un número de mesa entre 1 y 999.");
      return;
    }
    await operation("editor", async () => {
      if (editor.table === null) {
        const created = await createTable(establishmentId, name, number);
        if (created.result.tableId === undefined) throw new Error("La mesa se creó sin identificador.");
        setPrintables([await printableQr(
          created.result.tableId,
          name,
          number,
          active.establishment.slug,
          created.token
        )]);
      } else {
        await updateTable(establishmentId, editor.table, name, editor.table.active);
      }
      setEditor(null);
    });
  }

  async function rotateAndPrepare(selected: readonly AdminTable[]) {
    if (!window.confirm(
      selected.length === 1
        ? `¿Rotar el QR de ${selected[0]?.name}? El código anterior dejará de funcionar.`
        : `¿Rotar ${selected.length} códigos QR? Todos los códigos anteriores dejarán de funcionar.`
    )) return;
    await operation(selected.length === 1 ? selected[0]?.id ?? "qr" : "all-qrs", async () => {
      const tokens = await rotateTableQrs(establishmentId, selected);
      const sheets = await Promise.all(selected.map((table) => printableQr(
        table.id,
        table.name,
        table.number,
        active.establishment.slug,
        tokens.get(table.id) ?? ""
      )));
      setPrintables(Object.freeze(sheets));
    });
  }

  return (
    <div className="tables-page">
      <div className="page-heading tables-heading">
        <div>
          <p className="eyebrow">SALÓN Y ACCESOS QR</p>
          <h1>Mesas</h1>
          <p>Administrá disponibilidad, sesiones y códigos de {active.establishment.name}.</p>
        </div>
        {mayManage && (
          <div className="tables-heading-actions">
            <button
              className="secondary-button"
              disabled={busy !== null || tables.filter(({ active }) => active).length === 0}
              onClick={() => void rotateAndPrepare(tables.filter(({ active }) => active))}
              type="button"
            >Rotar e imprimir QR activos</button>
            <button
              className="primary-button"
              disabled={busy !== null}
              onClick={() => setEditor({ table: null, name: "", number: String(tables.length + 1) })}
              type="button"
            >Nueva mesa</button>
          </div>
        )}
      </div>

      <section className="table-summary" aria-label="Resumen de mesas">
        <article><span>Mesas activas</span><strong>{summary.active}</strong></article>
        <article><span>Disponibles</span><strong>{summary.available}</strong></article>
        <article><span>En servicio</span><strong>{summary.inService}</strong></article>
        <article><span>Desactivadas</span><strong>{summary.inactive}</strong></article>
      </section>

      {error !== null && (
        <div className="table-alert" role="alert">
          <span>{error}</span>
          <button aria-label="Cerrar error" onClick={() => setError(null)} type="button">×</button>
        </div>
      )}

      {currentFeed === null ? (
        <section className="orders-feedback"><span className="loading-line" /><strong>Cargando mesas…</strong></section>
      ) : currentFeed.error !== null ? (
        <section className="orders-feedback error">
          <strong>{currentFeed.error}</strong>
          <button className="secondary-button" onClick={() => {
            setFeed(null);
            setRevision((value) => value + 1);
          }} type="button">Reintentar</button>
        </section>
      ) : tables.length === 0 ? (
        <section className="orders-feedback">
          <strong>Todavía no hay mesas</strong>
          <p>Creá la primera mesa para generar su acceso QR.</p>
        </section>
      ) : (
        <section className="table-grid" aria-label="Mesas del establecimiento">
          {tables.map((table) => {
            const session = currentSession(table, sessions);
            const status = tableOperationalLabel(table, session);
            const closeDisabled = session === null || session.balanceMinor !== 0;
            return (
              <article className={`table-card ${table.active ? "" : "inactive"}`} key={table.id}>
                <header>
                  <span className="table-number">{table.number}</span>
                  <span className={`table-state ${session === null ? "available" : session.status}`}>
                    {status}
                  </span>
                </header>
                <div className="table-card-title">
                  <h2>{table.name}</h2>
                  <small>QR versión {table.qrVersion}</small>
                </div>
                <div className="table-session-data">
                  {session === null ? (
                    <p>Sin sesión activa</p>
                  ) : (
                    <>
                      <span>Consumo <strong>{money(session.subtotalMinor, active.establishment.currency)}</strong></span>
                      <span>Saldo <strong>{money(session.balanceMinor, active.establishment.currency)}</strong></span>
                    </>
                  )}
                </div>
                {mayManage ? (
                  <footer>
                    {session === null ? (
                      <button
                        className="primary-button compact"
                        disabled={busy !== null || !table.active}
                        onClick={() => void operation(table.id, async () => {
                          await openTableSession(establishmentId, table.id);
                        })}
                        type="button"
                      >Abrir sesión</button>
                    ) : (
                      <button
                        className="secondary-button compact"
                        disabled={busy !== null || closeDisabled}
                        onClick={() => {
                          if (window.confirm(`¿Cerrar la sesión de ${table.name}?`)) {
                            void operation(table.id, async () => {
                              await closeTableSession(establishmentId, table.id, session.id);
                            });
                          }
                        }}
                        title={closeDisabled ? "La sesión debe tener saldo cero" : undefined}
                        type="button"
                      >Cerrar sesión</button>
                    )}
                    <button
                      className="table-text-button"
                      disabled={busy !== null || !table.active}
                      onClick={() => void rotateAndPrepare([table])}
                      type="button"
                    >Rotar QR</button>
                    <button
                      className="table-text-button"
                      disabled={busy !== null}
                      onClick={() => setEditor({ table, name: table.name, number: String(table.number) })}
                      type="button"
                    >Editar</button>
                    <button
                      className="table-text-button"
                      disabled={busy !== null || session !== null}
                      onClick={() => void operation(table.id, async () => {
                        await updateTable(establishmentId, table, table.name, !table.active);
                      })}
                      type="button"
                    >{table.active ? "Desactivar" : "Activar"}</button>
                    {!table.active && (
                      <button
                        className="table-text-button danger-text"
                        disabled={busy !== null}
                        onClick={() => {
                          if (window.confirm(`¿Eliminar ${table.name}? Solo es posible si nunca tuvo sesiones.`)) {
                            void operation(table.id, async () => { await deleteTable(establishmentId, table); });
                          }
                        }}
                        type="button"
                      >Eliminar</button>
                    )}
                  </footer>
                ) : <footer className="read-only-note">Vista operativa de solo lectura</footer>}
              </article>
            );
          })}
        </section>
      )}

      {editor !== null && (
        <div className="table-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target && busy === null) setEditor(null);
        }}>
          <form className="table-editor" onSubmit={(event) => void submitEditor(event)}>
            <header>
              <div>
                <p className="eyebrow">{editor.table === null ? "ALTA DE MESA" : "EDITAR MESA"}</p>
                <h2>{editor.table === null ? "Nueva mesa" : editor.table.name}</h2>
              </div>
              <button className="dialog-close" disabled={busy !== null} onClick={() => setEditor(null)} type="button">×</button>
            </header>
            <label htmlFor="table-number">Número</label>
            <input
              disabled={editor.table !== null || busy !== null}
              id="table-number"
              max="999"
              min="1"
              onChange={(event) => setEditor({ ...editor, number: event.target.value })}
              required
              type="number"
              value={editor.number}
            />
            <label htmlFor="table-name">Nombre visible</label>
            <input
              autoFocus
              id="table-name"
              maxLength={80}
              minLength={2}
              onChange={(event) => setEditor({ ...editor, name: event.target.value })}
              placeholder="Ej. Terraza 3"
              required
              value={editor.name}
            />
            <p>El número forma parte del identificador permanente y no puede cambiarse después.</p>
            <footer>
              <button className="secondary-button" disabled={busy !== null} onClick={() => setEditor(null)} type="button">Cancelar</button>
              <button className="primary-button" disabled={busy !== null} type="submit">{busy === "editor" ? "Guardando…" : "Guardar"}</button>
            </footer>
          </form>
        </div>
      )}

      {printables.length > 0 && (
        <section className="qr-export" aria-live="polite">
          <header className="qr-export-toolbar">
            <div>
              <strong>{printables.length} {printables.length === 1 ? "QR listo" : "QR listos"} para imprimir</strong>
              <span>Estos enlaces se muestran una sola vez. Imprimilos antes de cerrar.</span>
            </div>
            <button className="secondary-button" onClick={() => setPrintables([])} type="button">Cerrar</button>
            <button className="primary-button" onClick={() => window.print()} type="button">Imprimir / Guardar PDF</button>
          </header>
          <div className="qr-print-sheet">
            {printables.map((item) => (
              <article className="qr-print-card" key={item.tableId}>
                <p>MESAFLOW · {active.establishment.name}</p>
                <img alt={`Código QR de ${item.tableName}`} src={item.dataUrl} />
                <h2>{item.tableName}</h2>
                <span>Escaneá para ver el menú y pedir desde tu mesa</span>
                <small>Mesa {item.tableNumber} · {item.tableId}</small>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
