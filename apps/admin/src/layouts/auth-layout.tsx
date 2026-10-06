import type { PropsWithChildren } from "react";

import { Brand } from "../components/brand";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Presentación de MesaFlow">
        <Brand />
        <div className="story-copy">
          <p className="eyebrow light">OPERACIÓN EN CALMA</p>
          <h1>Tu restaurante,<br />en un solo lugar.</h1>
          <p>
            Pedidos, mesas y equipo conectados en tiempo real para que cada
            servicio fluya mejor.
          </p>
        </div>
        <div className="story-status">
          <span className="live-dot" aria-hidden="true" />
          <span><strong>Sistema operativo</strong>Todos los servicios disponibles</span>
        </div>
        <div className="story-orb orb-one" aria-hidden="true" />
        <div className="story-orb orb-two" aria-hidden="true" />
      </section>
      <section className="auth-panel">
        <div className="mobile-brand"><Brand /></div>
        {children}
        <p className="auth-footer">© 2026 MesaFlow · Acceso exclusivo para personal autorizado</p>
      </section>
    </main>
  );
}
