import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const customer = path.join(root, "apps/customer");
const applicationThreshold = 75;
const criticalThreshold = 80;

function flutterProcess() {
  const windows = process.platform === "win32";
  let executable = "flutter";
  let args = ["test", "--coverage", "--reporter=expanded"];
  let env = process.env;

  if (windows) {
    const flutterBin = (process.env.Path ?? process.env.PATH ?? "")
      .split(path.delimiter)
      .find((entry) => existsSync(path.join(entry, "flutter.bat")));
    if (!flutterBin) throw new Error("Flutter no está en PATH.");
    const flutterRoot = path.resolve(flutterBin, "..");
    executable = path.join(flutterRoot, "bin/cache/dart-sdk/bin/dart.exe");
    args = [
      `--packages=${path.join(flutterRoot, "packages/flutter_tools/.dart_tool/package_config.json")}`,
      path.join(flutterRoot, "bin/cache/flutter_tools.snapshot"),
      "test", "--coverage", "--reporter=expanded"
    ];
    env = { ...process.env, FLUTTER_ROOT: flutterRoot };
  }
  return { args, env, executable };
}

function runFlutterTests() {
  const { args, env, executable } = flutterProcess();
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: customer, env, stdio: "inherit" });
    child.on("error", (error) => reject(new Error(`No se pudo iniciar Flutter: ${error.message}`)));
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`flutter test terminó con código ${code ?? "desconocido"}.`));
    });
  });
}

function parseLcov(source) {
  return source.split("end_of_record")
    .map((record) => Object.fromEntries(record.trim().split(/\r?\n/u)
      .filter((line) => line.includes(":"))
      .map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 1)])))
    .filter((record) => typeof record.SF === "string")
    .map((record) => ({
      file: record.SF.replaceAll("\\", "/"),
      found: Number(record.LF ?? 0),
      hit: Number(record.LH ?? 0)
    }));
}

function coverage(records, predicate) {
  const selected = records.filter(predicate);
  const found = selected.reduce((total, record) => total + record.found, 0);
  const hit = selected.reduce((total, record) => total + record.hit, 0);
  if (found === 0) throw new Error("El informe LCOV no contiene líneas para el alcance solicitado.");
  return { found, hit, percent: hit / found * 100 };
}

function enforce(label, result, threshold) {
  const formatted = result.percent.toFixed(2);
  console.log(`[${result.percent >= threshold ? "OK" : "ERROR"}] ${label}: ${formatted}% (${result.hit}/${result.found}); mínimo ${threshold}%.`);
  if (result.percent < threshold) {
    throw new Error(`${label} quedó por debajo del umbral de cobertura.`);
  }
}

try {
  await runFlutterTests();
  const report = await readFile(path.join(customer, "coverage/lcov.info"), "utf8");
  const records = parseLcov(report);
  const application = coverage(records, ({ file }) =>
    file.includes("lib/") && !file.includes("firebase_options_")
  );
  const critical = coverage(records, ({ file }) =>
    file.includes("lib/src/") && !path.posix.basename(file).startsWith("firebase_") &&
    !file.includes("firebase_options_")
  );

  enforce("Cobertura Flutter de la aplicación", application, applicationThreshold);
  enforce("Cobertura Flutter de lógica y widgets críticos", critical, criticalThreshold);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
