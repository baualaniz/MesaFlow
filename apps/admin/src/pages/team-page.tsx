import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useAuth } from "../auth/auth-context";
import { ROLE_LABELS } from "../tenant/access-control";
import type { AdminRole } from "../tenant/tenant-model";
import { useActiveTenant } from "../tenant/tenant-context";
import { inviteTeamMember, loadTeam, updateTeamMember } from "../team/team-gateway";
import type { AdminTeamMember } from "../team/team-model";
import { ASSIGNABLE_ROLES, canEditTeamMember } from "../team/team-permissions";

interface InviteEditor {
  readonly displayName: string;
  readonly email: string;
  readonly role: AdminRole;
}

interface MemberEditor {
  readonly member: AdminTeamMember;
  readonly role: AdminRole;
  readonly active: boolean;
}

interface TeamState {
  readonly establishmentId: string;
  readonly members: readonly AdminTeamMember[];
}

const PERMISSION_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "assistance.manage": "Asistencia",
  "establishment.manage": "Establecimiento",
  "menu.manage": "Menú",
  "metrics.read": "Métricas",
  "orders.manage": "Pedidos y salón",
  "orders.prepare": "Preparación"
});

function formattedDate(value: Date): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(value);
}

export function TeamPage() {
  const auth = useAuth();
  const active = useActiveTenant();
  const establishmentId = active.establishment.id;
  const actorRole = active.membership.role;
  const assignableRoles = actorRole === "owner" ? ASSIGNABLE_ROLES.owner : ASSIGNABLE_ROLES.manager;
  const [teamState, setTeamState] = useState<TeamState | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteEditor, setInviteEditor] = useState<InviteEditor | null>(null);
  const [memberEditor, setMemberEditor] = useState<MemberEditor | null>(null);

  useEffect(() => {
    let current = true;
    void loadTeam(establishmentId).then((next) => {
      if (current) {
        setTeamState({ establishmentId, members: next });
        setError(null);
      }
    }).catch((reason) => {
      if (current) setError(reason instanceof Error ? reason.message : "No pudimos cargar el equipo.");
    });
    return () => { current = false; };
  }, [establishmentId, revision]);

  const members = teamState?.establishmentId === establishmentId ? teamState.members : null;

  const summary = useMemo(() => ({
    active: members?.filter((member) => member.active).length ?? 0,
    inactive: members?.filter((member) => !member.active).length ?? 0,
    managers: members?.filter((member) => member.active && ["owner", "manager"].includes(member.role)).length ?? 0,
    operations: members?.filter((member) => member.active && ["staff", "kitchen"].includes(member.role)).length ?? 0
  }), [members]);

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviteEditor === null || busy) return;
    const displayName = inviteEditor.displayName.trim();
    const email = inviteEditor.email.trim().toLowerCase();
    if (displayName.length < 2 || displayName.length > 120 || email.length > 254 || !email.includes("@")) {
      setError("Ingresá un nombre y un correo válidos.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await inviteTeamMember(establishmentId, displayName, email, inviteEditor.role);
      setInviteEditor(null);
      setRevision((value) => value + 1);
      try {
        await auth.sendPasswordReset(created.email);
        setSuccess(`Invitación creada. Firebase envió el acceso a ${created.email}.`);
      } catch {
        setSuccess(`${created.displayName} ya pertenece al equipo. Podés reenviar el acceso desde su tarjeta.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos invitar a la persona.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (memberEditor === null || busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await updateTeamMember(
        establishmentId,
        memberEditor.member,
        memberEditor.role,
        memberEditor.active
      );
      setMemberEditor(null);
      setSuccess("Membresía actualizada correctamente.");
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos actualizar la membresía.");
    } finally {
      setBusy(false);
    }
  }

  async function resendAccess(member: AdminTeamMember) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await auth.sendPasswordReset(member.email);
      setSuccess(`Firebase envió un nuevo correo de acceso a ${member.email}.`);
    } catch {
      setError("No pudimos enviar el correo. La membresía no fue modificada.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="team-page">
      <div className="page-heading team-heading">
        <div>
          <p className="eyebrow">PERSONAS Y ACCESOS</p>
          <h1>Equipo</h1>
          <p>Administrá quién puede trabajar en {active.establishment.name} y qué rol cumple.</p>
        </div>
        <button className="primary-button" disabled={busy} onClick={() => setInviteEditor({
          displayName: "",
          email: "",
          role: assignableRoles[0] ?? "staff"
        })} type="button">Invitar persona</button>
      </div>

      <section className="table-summary team-summary" aria-label="Resumen del equipo">
        <article><span>Activos</span><strong>{summary.active}</strong></article>
        <article><span>Desactivados</span><strong>{summary.inactive}</strong></article>
        <article><span>Administración</span><strong>{summary.managers}</strong></article>
        <article><span>Operación</span><strong>{summary.operations}</strong></article>
      </section>

      {error !== null && <div className="table-alert" role="alert"><span>{error}</span><button aria-label="Cerrar error" onClick={() => setError(null)} type="button">×</button></div>}
      {success !== null && <div className="team-success" role="status"><span>{success}</span><button aria-label="Cerrar mensaje" onClick={() => setSuccess(null)} type="button">×</button></div>}

      {members === null && error === null ? (
        <section className="orders-feedback"><span className="loading-line" /><strong>Cargando equipo…</strong></section>
      ) : members === null ? (
        <section className="orders-feedback error"><strong>No pudimos cargar el equipo.</strong><button className="secondary-button" onClick={() => setRevision((value) => value + 1)} type="button">Reintentar</button></section>
      ) : (
        <section className="team-list" aria-label="Miembros del equipo">
          {members.map((member) => {
            const initials = member.displayName.split(/\s+/u).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
            const editable = canEditTeamMember(actorRole, member.role);
            return <article className={`team-card ${member.active ? "" : "inactive"}`} key={member.uid}>
              <div className="team-avatar">{initials}</div>
              <div className="team-identity"><div><h2>{member.displayName}</h2><span className={`team-role ${member.role}`}>{ROLE_LABELS[member.role]}</span></div><p>{member.email}</p><small>Desde {formattedDate(member.createdAt)}</small></div>
              <div className="team-permissions">{member.permissions.map((permission) => <span key={permission}>{PERMISSION_LABELS[permission] ?? permission}</span>)}</div>
              <div className="team-status"><span className={member.active ? "active" : "inactive"}>{member.active ? "Activo" : "Desactivado"}</span></div>
              <footer>
                <button disabled={busy} onClick={() => void resendAccess(member)} type="button">Reenviar acceso</button>
                {editable ? <button disabled={busy} onClick={() => setMemberEditor({ member, role: member.role, active: member.active })} type="button">Editar acceso</button> : <small>Protegido por tu rol</small>}
              </footer>
            </article>;
          })}
        </section>
      )}

      {inviteEditor !== null && <div className="table-dialog-backdrop" role="presentation"><form className="table-editor team-editor" onSubmit={(event) => void submitInvite(event)}>
        <header><div><p className="eyebrow">NUEVO ACCESO</p><h2>Invitar persona</h2></div><button aria-label="Cerrar" className="icon-button" onClick={() => setInviteEditor(null)} type="button">×</button></header>
        <p className="team-editor-intro">Se creará una membresía y Firebase enviará un correo para que la persona elija su contraseña.</p>
        <label htmlFor="invite-name">Nombre completo</label><input autoFocus id="invite-name" maxLength={120} onChange={(event) => setInviteEditor({ ...inviteEditor, displayName: event.target.value })} required value={inviteEditor.displayName} />
        <label htmlFor="invite-email">Correo electrónico</label><input autoComplete="email" id="invite-email" maxLength={254} onChange={(event) => setInviteEditor({ ...inviteEditor, email: event.target.value })} required type="email" value={inviteEditor.email} />
        <label htmlFor="invite-role">Rol</label><select id="invite-role" onChange={(event) => setInviteEditor({ ...inviteEditor, role: event.target.value as AdminRole })} value={inviteEditor.role}>{assignableRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select>
        {actorRole === "manager" && <p>Como encargado, solo podés dar acceso a salón y cocina.</p>}
        <footer><button className="secondary-button" onClick={() => setInviteEditor(null)} type="button">Cancelar</button><button className="primary-button" disabled={busy} type="submit">Crear y enviar acceso</button></footer>
      </form></div>}

      {memberEditor !== null && <div className="table-dialog-backdrop" role="presentation"><form className="table-editor team-editor" onSubmit={(event) => void submitMember(event)}>
        <header><div><p className="eyebrow">MEMBRESÍA</p><h2>Editar acceso</h2></div><button aria-label="Cerrar" className="icon-button" onClick={() => setMemberEditor(null)} type="button">×</button></header>
        <div className="team-editor-person"><strong>{memberEditor.member.displayName}</strong><span>{memberEditor.member.email}</span></div>
        <label htmlFor="member-role">Rol</label><select id="member-role" onChange={(event) => setMemberEditor({ ...memberEditor, role: event.target.value as AdminRole })} value={memberEditor.role}>{assignableRoles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select>
        <label className="catalog-check"><input checked={memberEditor.active} onChange={(event) => setMemberEditor({ ...memberEditor, active: event.target.checked })} type="checkbox" />Acceso activo</label>
        <p>Los permisos se asignan automáticamente según el rol y no pueden ampliarse manualmente.</p>
        <footer><button className="secondary-button" onClick={() => setMemberEditor(null)} type="button">Cancelar</button><button className="primary-button" disabled={busy} type="submit">Guardar acceso</button></footer>
      </form></div>}
    </div>
  );
}
