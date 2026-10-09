import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function audit(arguments_) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("Ejecutá la auditoría mediante npm run security:audit.");
  const result = spawnSync(process.execPath, [npmCli, "audit", ...arguments_, "--json"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (!result.stdout.trim()) throw new Error(result.stderr.trim() || "npm audit no devolvió JSON.");
  return JSON.parse(result.stdout);
}

const production = audit(["--omit=dev"]);
assert.equal(
  production.metadata?.vulnerabilities?.total,
  0,
  "Las dependencias de producción deben permanecer sin avisos conocidos."
);

const complete = audit([]);
const vulnerabilities = complete.vulnerabilities ?? {};
const names = Object.keys(vulnerabilities).sort();
assert.deepEqual(
  names,
  ["braces", "chokidar", "firebase-tools"],
  `La auditoría completa contiene avisos no evaluados: ${names.join(", ") || "ninguno"}`
);
assert.equal(vulnerabilities.braces?.severity, "high");
assert.equal(
  vulnerabilities.braces?.via?.some((entry) =>
    typeof entry === "object" && entry.url === "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm"),
  true,
  "El único aviso aceptado debe ser GHSA-vfj7-8cjw-p6xm."
);
assert.equal(vulnerabilities.chokidar?.via?.includes("braces"), true);
assert.equal(vulnerabilities["firebase-tools"]?.via?.includes("chokidar"), true);

console.log("[OK] npm audit producción: 0 vulnerabilidades.");
console.log("[OK] Aviso dev GHSA-vfj7-8cjw-p6xm limitado a firebase-tools → chokidar → braces.");
