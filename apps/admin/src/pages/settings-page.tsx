import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import { useActiveTenant } from "../tenant/tenant-context";
import { saveEstablishmentSettings } from "../settings/settings-gateway";
import {
  BUSINESS_DAYS,
  settingsDraft,
  type BusinessDay,
  type EstablishmentSettingsDraft
} from "../settings/settings-model";
import { loadEstablishmentSettings } from "../settings/settings-repository";

interface SettingSwitchProps {
  readonly checked: boolean;
  readonly description: string;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}

function SettingSwitch({ checked, description, label, onChange }: SettingSwitchProps) {
  return (
    <label className="settings-switch">
      <span><strong>{label}</strong><small>{description}</small></span>
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <i aria-hidden="true" />
    </label>
  );
}

export function SettingsPage() {
  const { establishment } = useActiveTenant();
  const establishmentId = establishment.id;
  const query = useQuery({
    queryFn: () => loadEstablishmentSettings(establishmentId),
    queryKey: ["admin", "settings", establishmentId],
    retry: 1
  });
  const [draftOverride, setDraftOverride] = useState<{
    readonly establishmentId: string;
    readonly value: EstablishmentSettingsDraft;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const draft = draftOverride?.establishmentId === establishmentId
    ? draftOverride.value
    : query.data === undefined ? null : settingsDraft(query.data);

  function change<K extends keyof EstablishmentSettingsDraft>(
    field: K,
    value: EstablishmentSettingsDraft[K]
  ) {
    if (draft === null) return;
    setDraftOverride({ establishmentId, value: { ...draft, [field]: value } });
    setSuccess(null);
  }

  function changeHours(day: BusinessDay, field: "closed" | "open" | "close", value: boolean | string) {
    if (draft === null) return;
    change("businessHours", {
      ...draft.businessHours,
      [day]: { ...draft.businessHours[day], [field]: value }
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft === null) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveEstablishmentSettings(establishmentId, draft);
      await query.refetch();
      setDraftOverride(null);
      setSuccess("Configuración guardada. Los cambios públicos ya están disponibles para los clientes.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  if (query.isPending || draft === null && !query.isError) {
    return <section className="settings-page"><div className="settings-state">Cargando configuración…</div></section>;
  }
  if (query.isError || draft === null) {
    return (
      <section className="settings-page">
        <div className="settings-state error">
          <strong>No pudimos cargar la configuración</strong>
          <p>Comprobá la conexión e intentá nuevamente.</p>
          <button className="primary-button" onClick={() => void query.refetch()} type="button">Reintentar</button>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <header className="page-heading settings-heading">
        <div>
          <p className="eyebrow">ESTABLECIMIENTO</p>
          <h1>Configuración</h1>
          <p>Administrá la información pública y las funciones de {establishment.name}.</p>
        </div>
        <span className="settings-visibility">Solo propietarios y encargados</span>
      </header>

      {error !== null && <div className="table-alert" role="alert"><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError(null)} type="button">×</button></div>}
      {success !== null && <div className="team-success" role="status"><span>{success}</span><button aria-label="Cerrar mensaje" onClick={() => setSuccess(null)} type="button">×</button></div>}

      <form className="settings-form" onSubmit={(event) => void submit(event)}>
        <div className="settings-column">
          <article className="settings-card">
            <header><div><span className="settings-step">01</span><div><h2>Marca y contacto</h2><p>Información que puede mostrarse al cliente.</p></div></div><span className="public-pill">Público</span></header>
            <div className="settings-fields">
              <label>Nombre de marca<input maxLength={120} minLength={2} onChange={(event) => change("brandName", event.target.value)} required value={draft.brandName} /></label>
              <label>Correo de contacto<input autoComplete="email" maxLength={254} onChange={(event) => change("contactEmail", event.target.value)} required type="email" value={draft.contactEmail} /></label>
              <div className="settings-field-grid">
                <label>Teléfono<input autoComplete="tel" maxLength={30} onChange={(event) => change("contactPhone", event.target.value)} placeholder="+54 11 5555-0101" value={draft.contactPhone} /></label>
                <label>Dirección<input autoComplete="street-address" maxLength={200} onChange={(event) => change("addressLine", event.target.value)} placeholder="Dirección visible para clientes" value={draft.addressLine} /></label>
              </div>
            </div>
          </article>

          <article className="settings-card">
            <header><div><span className="settings-step">02</span><div><h2>Horarios</h2><p>Definí la atención habitual de cada día.</p></div></div><span className="public-pill">Público</span></header>
            <div className="business-hours">
              {BUSINESS_DAYS.map(({ key, label }) => {
                const hours = draft.businessHours[key];
                return (
                  <div className={`business-day ${hours.closed ? "closed" : ""}`} key={key}>
                    <strong>{label}</strong>
                    <label className="closed-check"><input checked={hours.closed} onChange={(event) => changeHours(key, "closed", event.target.checked)} type="checkbox" /> Cerrado</label>
                    <label><span>Abre</span><input disabled={hours.closed} onChange={(event) => changeHours(key, "open", event.target.value)} type="time" value={hours.open} /></label>
                    <label><span>Cierra</span><input disabled={hours.closed} onChange={(event) => changeHours(key, "close", event.target.value)} type="time" value={hours.close} /></label>
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        <aside className="settings-column">
          <article className="settings-card">
            <header><div><span className="settings-step">03</span><div><h2>Experiencia del cliente</h2><p>Controlá qué acciones están habilitadas.</p></div></div><span className="public-pill">Público</span></header>
            <div className="settings-switches">
              <SettingSwitch checked={draft.orderingEnabled} description="Permite crear pedidos nuevos desde las mesas." label="Pedidos desde la mesa" onChange={(value) => change("orderingEnabled", value)} />
              <SettingSwitch checked={draft.assistanceEnabled} description="Permite llamar al personal y solicitar la cuenta." label="Solicitudes de asistencia" onChange={(value) => change("assistanceEnabled", value)} />
            </div>
          </article>

          <article className="settings-card private-card">
            <header><div><span className="settings-step">04</span><div><h2>Integraciones</h2><p>Opciones internas que nunca se exponen al cliente.</p></div></div><span className="private-pill">Privado</span></header>
            <div className="settings-switches">
              <SettingSwitch checked={draft.mercadoPagoEnabled} description="Usá esta opción solo con las credenciales del proveedor configuradas." label="Mercado Pago" onChange={(value) => change("mercadoPagoEnabled", value)} />
              <SettingSwitch checked={draft.whatsappEnabled} description="Quedará disponible al completar la integración de WhatsApp." label="Alertas por WhatsApp" onChange={(value) => change("whatsappEnabled", value)} />
            </div>
          </article>

          <div className="settings-save-panel">
            <div><strong>Guardar cambios</strong><span>La marca y los interruptores públicos tienen efecto inmediato.</span></div>
            <button className="primary-button" disabled={saving} type="submit">{saving ? "Guardando…" : "Guardar configuración"}</button>
          </div>
        </aside>
      </form>
    </section>
  );
}
