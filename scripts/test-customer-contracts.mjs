import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const customer = path.join(root, "apps/customer");
const windows = process.platform === "win32";
let executable = "flutter";
let args = ["test", "--reporter=expanded", "test/domain_contracts_test.dart"];
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
    "test", "--reporter=expanded", "test/domain_contracts_test.dart"
  ];
  env = { ...process.env, FLUTTER_ROOT: flutterRoot };
}

const child = spawn(executable, args, { cwd: customer, stdio: "inherit", env });
child.on("error", (error) => {
  console.error(`No se pudo iniciar Flutter: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  if (code !== 0) process.exitCode = code ?? 1;
});
