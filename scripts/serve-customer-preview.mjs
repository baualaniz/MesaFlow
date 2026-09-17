import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const host = "127.0.0.1";
const port = 7357;
const buildRoot = path.resolve("apps/customer/build/web");
const indexFile = path.join(buildRoot, "index.html");

const contentTypes = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".wasm": "application/wasm"
});

if (!existsSync(indexFile)) {
  console.error("No existe el build web. Ejecutá primero: cd apps/customer; flutter.bat build web");
  process.exitCode = 1;
} else {
  const server = createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? "/", `http://${host}`).pathname);
    } catch {
      response.writeHead(400).end("Solicitud inválida");
      return;
    }

    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const requestedFile = path.resolve(buildRoot, relativePath);
    const staysInsideBuild =
      requestedFile === buildRoot || requestedFile.startsWith(`${buildRoot}${path.sep}`);

    if (!staysInsideBuild) {
      response.writeHead(403).end("Acceso denegado");
      return;
    }

    const file = existsSync(requestedFile) && statSync(requestedFile).isFile()
      ? requestedFile
      : indexFile;
    response.setHeader("Content-Type", contentTypes[path.extname(file)] ?? "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    createReadStream(file)
      .on("error", () => response.writeHead(500).end("No se pudo leer el archivo"))
      .pipe(response);
  });

  server.listen(port, host, () => {
    console.log(`MesaFlow disponible en http://${host}:${port}`);
    console.log("Presioná Ctrl+C para detener la vista previa.");
  });
}
