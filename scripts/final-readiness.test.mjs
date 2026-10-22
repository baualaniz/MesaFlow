import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const canonicalDocuments = [
  "docs/firestore-schema.md",
  "docs/security.md",
  "docs/testing.md",
  "docs/deployment.md",
  "docs/user-guide.md",
  "docs/backup-recovery.md",
  "docs/stage-50-final-qa.md"
];

test("existen los documentos canónicos y tienen contenido sustancial", async () => {
  const contents = await Promise.all(canonicalDocuments.map(read));
  assert.ok(contents.every((content) => content.trim().length > 500));
});

test("el README enlaza la documentación final", async () => {
  const readme = await read("README.md");
  for (const path of canonicalDocuments) {
    assert.match(readme, new RegExp(path.replaceAll(".", "\\."), "u"));
  }
});

test("la Definition of Done contiene exactamente veinte puntos aprobados", async () => {
  const report = await read("docs/stage-50-final-qa.md");
  const numbers = [...report.matchAll(/^- \[x\] \*\*(\d+)\./gmu)]
    .map((match) => Number(match[1]));
  assert.deepEqual(numbers, Array.from({ length: 20 }, (_, index) => index + 1));
});

test("el cierre exige regresión, E2E, auditoría y smoke sin ocultar el límite cloud", async () => {
  const report = await read("docs/stage-50-final-qa.md");
  for (const command of [
    "npm.cmd run check",
    "npm.cmd run test:e2e",
    "npm.cmd run security:audit",
    "npm.cmd run deploy:smoke:prod"
  ]) assert.match(report, new RegExp(command.replaceAll(".", "\\."), "u"));
  assert.match(report, /Functions y los webhooks no se\s+desplegaron porque requieren Blaze/u);
});

test("backup y plan maestro cierran la etapa sin habilitar costos", async () => {
  const [backup, plan] = await Promise.all([
    read("docs/backup-recovery.md"),
    read("docs/master-plan.md")
  ]);
  assert.match(backup, /requieren facturación/u);
  assert.match(backup, /no contiene datos reales/u);
  assert.match(backup, /Rollback/u);
  assert.match(plan, /\| 50 \| Completa:/u);
});

