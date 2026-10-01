import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export function parseJavaMajor(versionOutput) {
  if (typeof versionOutput !== "string") return null;
  const match = versionOutput.match(/version\s+"(?:(1)\.)?(\d+)/u);
  if (!match) return null;
  return Number(match[2]);
}

function javaExecutable(binDirectory) {
  return path.join(binDirectory, process.platform === "win32" ? "java.exe" : "java");
}

function installedWindowsJdks() {
  const roots = [
    "C:\\Program Files\\Eclipse Adoptium",
    "C:\\Program Files\\Microsoft",
    "C:\\Program Files\\Java"
  ];
  const candidates = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory() && /^jdk-?\d+/iu.test(entry.name)) {
        candidates.push(javaExecutable(path.join(root, entry.name, "bin")));
      }
    }
  }
  const androidStudio = "C:\\Program Files\\Android\\Android Studio\\jbr\\bin";
  if (existsSync(androidStudio)) candidates.push(javaExecutable(androidStudio));
  return candidates;
}

function candidatesFromEnvironment(env) {
  const candidates = [];
  if (env.JAVA_HOME) candidates.push(javaExecutable(path.join(env.JAVA_HOME, "bin")));
  const pathValue = env.Path ?? env.PATH ?? "";
  for (const entry of pathValue.split(path.delimiter).filter(Boolean)) {
    candidates.push(javaExecutable(entry));
  }
  if (process.platform === "win32") candidates.push(...installedWindowsJdks());
  return [...new Set(candidates)];
}

export function resolveJava21Environment(env = process.env) {
  for (const executable of candidatesFromEnvironment(env)) {
    if (!existsSync(executable)) continue;
    const result = spawnSync(executable, ["-version"], {
      encoding: "utf8",
      windowsHide: true
    });
    const major = parseJavaMajor(`${result.stdout ?? ""}\n${result.stderr ?? ""}`);
    if (result.status !== 0 || major === null || major < 21) continue;
    const binDirectory = path.dirname(executable);
    const javaHome = path.dirname(binDirectory);
    const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
    return Object.freeze({
      executable,
      major,
      environment: {
        ...env,
        JAVA_HOME: javaHome,
        [pathKey]: `${binDirectory}${path.delimiter}${env[pathKey] ?? ""}`
      }
    });
  }
  throw new Error(
    "Firebase Emulator Suite requiere JDK 21 o superior. Instalalo y definí JAVA_HOME."
  );
}
