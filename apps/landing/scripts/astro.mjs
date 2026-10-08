import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.ASTRO_TELEMETRY_DISABLED ??= "1";

const packagePath = fileURLToPath(import.meta.resolve("astro/package.json"));
const cliPath = path.join(path.dirname(packagePath), "bin", "astro.mjs");

await import(pathToFileURL(cliPath));
