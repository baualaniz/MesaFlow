import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const root = fileURLToPath(new URL("../", import.meta.url));
const url = "http://127.0.0.1:4322/";
const thresholds = Object.freeze({
  performance: 0.8,
  accessibility: 0.95,
  "best-practices": 0.95,
  seo: 0.95
});

const preview = spawn(
  process.execPath,
  [path.join(root, "scripts/astro.mjs"), "preview", "--host", "127.0.0.1", "--port", "4322"],
  {
    cwd: root,
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  }
);

async function waitForPreview() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // El servidor todavía está iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("La vista previa Astro no respondió en 10 segundos.");
}

let chrome;
try {
  await waitForPreview();
  chrome = await launch({
    chromeFlags: ["--headless=new", "--no-first-run", "--disable-gpu"]
  });
  const result = await lighthouse(url, {
    port: chrome.port,
    logLevel: "error",
    output: "json",
    onlyCategories: Object.keys(thresholds)
  });
  if (!result?.lhr || result.lhr.runtimeError) {
    throw new Error(result?.lhr?.runtimeError?.message ?? "Lighthouse no devolvió un informe válido.");
  }

  const failures = [];
  for (const [category, minimum] of Object.entries(thresholds)) {
    const score = result.lhr.categories[category]?.score;
    if (typeof score !== "number") {
      failures.push(`${category}: sin puntuación`);
      continue;
    }
    console.log(`[${score >= minimum ? "OK" : "FAIL"}] ${category}: ${Math.round(score * 100)} (mínimo ${Math.round(minimum * 100)})`);
    if (score < minimum) failures.push(`${category}: ${Math.round(score * 100)} < ${Math.round(minimum * 100)}`);
  }
  for (const metricId of ["first-contentful-paint", "largest-contentful-paint", "speed-index", "total-blocking-time", "cumulative-layout-shift"]) {
    const metric = result.lhr.audits[metricId];
    if (metric?.displayValue) console.log(`[METRIC] ${metric.title}: ${metric.displayValue}`);
  }
  const weightedFailures = Object.values(result.lhr.categories)
    .flatMap((category) => category.auditRefs)
    .filter((reference, index, references) => reference.weight > 0 && references.findIndex(({ id }) => id === reference.id) === index)
    .map((reference) => result.lhr.audits[reference.id])
    .filter((audit) => typeof audit?.score === "number" && audit.score < 1)
    .sort((left, right) => (left.score ?? 1) - (right.score ?? 1));
  for (const audit of weightedFailures) {
    console.log(`[WARN] ${audit.id}: ${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ""}`);
    for (const item of audit.details?.items ?? []) {
      const selector = item.node?.selector;
      if (selector) console.log(`       ${selector}`);
    }
  }
  if (failures.length > 0) throw new Error(`Auditoría Lighthouse insuficiente:\n- ${failures.join("\n- ")}`);
} finally {
  await chrome?.kill();
  preview.kill("SIGINT");
}
