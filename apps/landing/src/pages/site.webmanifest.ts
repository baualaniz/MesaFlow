import type { APIRoute } from "astro";

export const prerender = true;

export const GET: APIRoute = () => new Response(JSON.stringify({
  name: "MesaFlow",
  short_name: "MesaFlow",
  description: "Menú QR, pedidos, asistencia y operación gastronómica conectada.",
  lang: "es-AR",
  start_url: "/",
  display: "browser",
  background_color: "#f4f0e7",
  theme_color: "#2f5941",
  icons: [{ src: "/icons/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]
}), {
  headers: { "Content-Type": "application/manifest+json; charset=utf-8" }
});
