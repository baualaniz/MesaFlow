import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const index = await readFile(new URL("../hosting/index.html", import.meta.url), "utf8");
const notFound = await readFile(new URL("../hosting/404.html", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles/global.css", import.meta.url), "utf8");

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
  assert.doesNotMatch(notFound, /data-hosting-target="landing"/u);
});
