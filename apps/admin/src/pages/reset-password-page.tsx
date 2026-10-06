import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";

import { useAuth } from "../auth/auth-context";
import { resetErrorMessage } from "../auth/auth-errors";
import { Icon } from "../components/icon";
import { AuthLayout } from "../layouts/auth-layout";

export function ResetPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await auth.sendPasswordReset(email);
      setSent(true);
    } catch (nextError) {
      setError(resetErrorMessage(nextError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-form-wrap">
        <p className="eyebrow">RECUPERAR ACCESO</p>
        <h2>Restablecé tu contraseña</h2>
        <p className="form-intro">
          Ingresá tu correo y, si existe una cuenta asociada, recibirás las
          instrucciones para continuar.
        </p>
        {sent ? (
          <div className="success-panel" role="status">
            <span aria-hidden="true">✓</span>
            <div><strong>Revisá tu correo</strong><p>Enviamos las instrucciones disponibles para esa dirección.</p></div>
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} noValidate>
            <label htmlFor="reset-email">Correo electrónico</label>
            <input
              autoComplete="email"
              id="reset-email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@restaurante.com"
              required
              type="email"
              value={email}
            />
            {error !== null && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? "Procesando…" : "Enviar instrucciones"}
              {!submitting && <Icon name="arrow" />}
            </button>
          </form>
        )}
        <p className="back-link">
          <Link search={{ redirect: "/" }} to="/login">← Volver al inicio de sesión</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
