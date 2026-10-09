import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";

import { useAuth } from "../auth/auth-context";
import { signInErrorMessage } from "../auth/auth-errors";
import { Icon } from "../components/icon";
import { AuthLayout } from "../layouts/auth-layout";
import { safeInternalRedirect } from "../routing/guards";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.user !== null) {
      void navigate({ to: safeInternalRedirect(search.redirect) });
    }
  }, [auth.user, navigate, search.redirect]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await auth.signIn(email, password);
    } catch (nextError) {
      setError(signInErrorMessage(nextError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-form-wrap">
        <p className="eyebrow">PANEL DE GESTIÓN</p>
        <h2>Bienvenido de nuevo</h2>
        <p className="form-intro">Ingresá con tu cuenta para acceder a la operación.</p>
        <form onSubmit={(event) => void submit(event)} noValidate>
          <label htmlFor="email">Correo electrónico</label>
          <input
            autoComplete="email"
            id="email"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@restaurante.com"
            required
            type="email"
            value={email}
          />
          <div className="label-row">
            <label htmlFor="password">Contraseña</label>
            <Link to="/recuperar-clave">¿La olvidaste?</Link>
          </div>
          <div className="password-field">
            <input
              autoComplete="current-password"
              id="password"
              minLength={8}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contraseña"
              required
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          </div>
          {error !== null && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? "Ingresando…" : "Ingresar al panel"}
            {!submitting && <Icon name="arrow" />}
          </button>
        </form>
        <p className="support-copy">
          ¿Necesitás ayuda? <a href="mailto:soporte@mesaflow.example.invalid">Contactá a soporte</a>
        </p>
      </div>
    </AuthLayout>
  );
}
