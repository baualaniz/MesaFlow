import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const requiredDocuments = [
  "docs/user-guide.md",
  "docs/demo-script.md",
  "docs/stage-49-documentation-demo.md",
  "docs/stage-51-production-backend-preparation.md",
  "docs/architecture.md",
  "docs/product-spec.md",
  "docs/threat-model.md",
  "docs/stage-47-development-deployment.md",
  "docs/stage-48-production-domain.md"
];

test("la documentación final requerida existe", async () => {
  const contents = await Promise.all(requiredDocuments.map(read));
  assert.ok(contents.every((content) => content.trim().length > 100));
});

test("el README enlaza manual, guion y cierre de la etapa 49", async () => {
  const readme = await read("README.md");
  for (const path of ["docs/user-guide.md", "docs/demo-script.md", "docs/stage-49-documentation-demo.md"]) {
    assert.match(readme, new RegExp(path.replaceAll(".", "\\."), "u"));
  }
});

test("el manual conserva comandos, puertos y acceso local reproducibles", async () => {
  const guide = await read("docs/user-guide.md");
  for (const value of [
    "npm.cmd run emulators",
    "npm.cmd run firebase:seed:demo",
    "npm.cmd run test:e2e",
    "http://127.0.0.1:5100",
    "http://127.0.0.1:5105",
    "http://127.0.0.1:5106",
    "http://127.0.0.1:4000",
    "owner@mesaflow.example.invalid",
    "MesaFlowDemo31!"
  ]) assert.match(guide, new RegExp(value.replaceAll(".", "\\."), "u"));
});

test("el guion comunica el alcance real y el plan de contingencia", async () => {
  const script = await read("docs/demo-script.md");
  assert.match(script, /Bistró MesaFlow/u);
  assert.match(script, /Plan de contingencia/u);
  assert.match(script, /Functions productivas requieren Blaze/u);
  assert.match(script, /no están desplegados/u);
});

test("la etapa 49 cubre el mapa documental y figura completa", async () => {
  const [stage, plan] = await Promise.all([
    read("docs/stage-49-documentation-demo.md"),
    read("docs/master-plan.md")
  ]);
  for (const topic of ["Arquitectura", "Esquema", "Riesgos", "Pruebas", "Despliegues", "Uso del sistema"]) {
    assert.match(stage, new RegExp(topic, "u"));
  }
  assert.match(plan, /\| 49 \| Completa:/u);
});

test("la etapa 51 distingue preparación local de activación cloud", async () => {
  const [stage, readme, plan] = await Promise.all([
    read("docs/stage-51-production-backend-preparation.md"),
    read("README.md"),
    read("docs/master-plan.md")
  ]);
  for (const value of [
    "MERCADO_PAGO_ENVIRONMENT",
    "deploy:prod:full",
    "deploy:smoke:functions:prod",
    "bootstrap:prod",
    "no despliega Functions"
  ]) assert.match(stage, new RegExp(value.replaceAll(".", "\\."), "u"));
  assert.match(readme, /docs\/stage-51-production-backend-preparation\.md/u);
  assert.match(plan, /\| 51 \| Completa en código:/u);
});

