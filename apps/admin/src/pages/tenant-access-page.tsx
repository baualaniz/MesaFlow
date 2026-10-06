import { useAuth } from "../auth/auth-context";
import { Brand } from "../components/brand";
import { useTenant } from "../tenant/tenant-context";

export function TenantAccessPage() {
  const auth = useAuth();
  const tenant = useTenant();
  const failed = tenant.status === "error";

  return (
    <main className="access-page">
      <section className="access-card" aria-live="polite">
        <Brand />
        <span className={`access-symbol ${failed ? "error" : ""}`} aria-hidden="true">
          {failed ? "!" : "i"}
        </span>
        <p className="eyebrow">ACCESO AL PANEL</p>
        <h1>{failed ? "No pudimos cargar tus accesos" : "Sin establecimiento activo"}</h1>
        <p>
          {failed
            ? "Hubo un problema al consultar tus membresías. Podés reintentar sin cerrar la sesión."
            : "Tu identidad es válida, pero no tiene una membresía activa. Un propietario debe habilitar el acceso."}
        </p>
        <div className="access-actions">
          {failed && (
            <button className="primary-button" onClick={() => void tenant.reload()} type="button">
              Reintentar
            </button>
          )}
          <button className="secondary-button" onClick={() => void auth.signOut()} type="button">
            Cerrar sesión
          </button>
        </div>
      </section>
    </main>
  );
}
