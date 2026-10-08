import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const index = await readFile(new URL("../hosting/index.html", import.meta.url), "utf8");
const notFound = await readFile(new URL("../hosting/404.html", import.meta.url), "utf8");
const robots = await readFile(new URL("../hosting/robots.txt", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../hosting/sitemap.xml", import.meta.url), "utf8");
const manifest = JSON.parse(await readFile(new URL("../hosting/site.webmanifest", import.meta.url), "utf8"));
const pageSource = await readFile(new URL("../src/pages/index.astro", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles/global.css", import.meta.url), "utf8");
const optimizedImage = await stat(new URL("../../customer/assets/images/mesa-demo.webp", import.meta.url));

test("la landing construida conserva identidad y secciones comerciales", () => {
  assert.match(index, /data-hosting-target="landing"/u);
  for (const id of ["inicio", "como-funciona", "producto", "planes", "preguntas", "contacto"]) {
    assert.match(index, new RegExp(`id="${id}"`, "u"));
  }
  for (const plan of ["Básico", "Profesional", "Empresarial"]) assert.match(index, new RegExp(plan, "u"));
});

test("los CTA conectan la experiencia, el panel y el contacto público", () => {
  assert.match(index, /http:\/\/127\.0\.0\.1:5100/u);
  assert.match(index, /http:\/\/127\.0\.0\.1:5105/u);
  assert.match(index, /github\.com\/baualaniz\/MesaFlow/u);
});

test("la hoja visual cubre móvil, escritorio y movimiento reducido", () => {
  assert.match(styles, /@media \(max-width: 48rem\)/u);
  assert.match(styles, /@media \(max-width: 32rem\)/u);
  assert.match(styles, /prefers-reduced-motion: reduce/u);
});

test("la página 404 es independiente y permite volver", () => {
  assert.match(notFound, /Error 404/u);
  assert.match(notFound, /href="\/"/u);
  assert.match(notFound, /content="noindex, nofollow"/u);
  assert.doesNotMatch(notFound, /data-hosting-target="landing"/u);
});

test("publica metadata canónica, social y datos estructurados", () => {
  assert.match(index, /rel="canonical" href="http:\/\/127\.0\.0\.1:5106\/"/u);
  for (const property of ["og:title", "og:description", "og:url", "og:image"]) {
    assert.match(index, new RegExp(`property="${property}"`, "u"));
  }
  assert.match(index, /name="twitter:card" content="summary_large_image"/u);
  assert.match(index, /"@type":"SoftwareApplication"/u);
  assert.match(index, /"@type":"WebSite"/u);
});

test("expone robots, sitemap y manifiesto coherentes", () => {
  assert.match(robots, /User-agent: \*/u);
  assert.match(robots, /Sitemap: http:\/\/127\.0\.0\.1:5106\/sitemap\.xml/u);
  assert.match(sitemap, /<loc>http:\/\/127\.0\.0\.1:5106\/<\/loc>/u);
  assert.equal(manifest.name, "MesaFlow");
  assert.equal(manifest.lang, "es-AR");
  assert.equal(manifest.icons[0].src, "/icons/favicon.svg");
});

test("mantiene landmarks, jerarquía y foco visibles", () => {
  assert.match(index, /<html lang="es-AR">/u);
  assert.match(index, /class="skip-link"/u);
  assert.match(index, /<main id="contenido">/u);
  assert.match(index, /<footer class="site-footer">/u);
  assert.equal(index.match(/<h1(?:\s|>)/gu)?.length, 1);
  assert.match(styles, /:focus-visible/u);
  assert.doesNotMatch(index, /tabindex="-1"/u);
});

test("el menú móvil anuncia estado y responde a Escape", () => {
  assert.match(index, /aria-label="Abrir menú"/u);
  assert.match(pageSource, /event\.key === "Escape"/u);
  assert.match(pageSource, /toggle\.focus\(\)/u);
  assert.match(pageSource, /aria-label", open \? "Abrir menú" : "Cerrar menú"/u);
});

test("la imagen principal conserva un presupuesto de transferencia acotado", () => {
  assert.ok(optimizedImage.size <= 120 * 1024, `La imagen pesa ${optimizedImage.size} bytes.`);
  assert.match(index, /src="\/images\/mesa-demo\.webp"/u);
});
