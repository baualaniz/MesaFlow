import { Brand } from "./brand";

export function LoadingScreen() {
  return (
    <main className="loading-screen" aria-busy="true" aria-label="Cargando panel">
      <Brand />
      <span className="loading-line" aria-hidden="true" />
    </main>
  );
}
