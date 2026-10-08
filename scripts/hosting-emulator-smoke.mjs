import assert from "node:assert/strict";
import { assertLocalEmulatorEnvironment, EMULATOR_HOST, EMULATOR_PORTS } from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

async function get(url) {
  return fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
}

try {
  const hubResponse = await get(`http://${EMULATOR_HOST}:${EMULATOR_PORTS.hub}/emulators`);
  assert.equal(hubResponse.status, 200);
  const emulators = await hubResponse.json();
  assert.equal(emulators.hosting.host, EMULATOR_HOST);
  const ports = [emulators.hosting.port, ...(emulators.hosting.reservedPorts ?? [])];
  assert.equal(ports.length, 3, "Hosting debe reservar un puerto para cada destino");

  const customerRoot = await get(`http://${EMULATOR_HOST}:${ports[0]}/`);
  assert.equal(customerRoot.status, 200);
  assert.match(await customerRoot.text(), /<title>MesaFlow<\/title>/u);
  const customerDeepLink = await get(
    `http://${EMULATOR_HOST}:${ports[0]}/e/mesa-flow-demo/table/mesa-01`
  );
  assert.equal(customerDeepLink.status, 200);
  assert.match(await customerDeepLink.text(), /flutter_bootstrap\.js/u);
  console.log(`[OK] Hosting customer: raíz y deep link en ${EMULATOR_HOST}:${ports[0]}`);

  for (const path of [
    "/operacion/pedidos", "/operacion/asistencia", "/operacion/mesas", "/catalogo", "/equipo",
    "/configuracion"
  ]) {
    const admin = await get(`http://${EMULATOR_HOST}:${ports[1]}${path}`);
    assert.equal(admin.status, 200);
    assert.match(await admin.text(), /data-hosting-target="admin"/u);
  }
  console.log(`[OK] Hosting admin React: fallback SPA en ${EMULATOR_HOST}:${ports[1]}`);

  const landing = await get(`http://${EMULATOR_HOST}:${ports[2]}/`);
  assert.equal(landing.status, 200);
  assert.match(await landing.text(), /data-hosting-target="landing"/u);
  assert.equal(landing.headers.get("x-content-type-options"), "nosniff");
  assert.equal(landing.headers.get("x-frame-options"), "DENY");
  assert.equal(landing.headers.get("cache-control"), "no-cache, no-store, must-revalidate");
  const notFound = await get(`http://${EMULATOR_HOST}:${ports[2]}/ruta-inexistente`);
  assert.equal(notFound.status, 404);
  const robots = await get(`http://${EMULATOR_HOST}:${ports[2]}/robots.txt`);
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Sitemap: http:\/\/127\.0\.0\.1:5106\/sitemap\.xml/u);
  const sitemap = await get(`http://${EMULATOR_HOST}:${ports[2]}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/u);
  const manifest = await get(`http://${EMULATOR_HOST}:${ports[2]}/site.webmanifest`);
  assert.equal(manifest.status, 200);
  assert.equal((await manifest.json()).name, "MesaFlow");
  console.log(`[OK] Hosting landing: raíz, SEO técnico, headers y 404 en ${EMULATOR_HOST}:${ports[2]}`);
} catch (error) {
  console.error(`Smoke test de Hosting falló: ${error.message}`);
  process.exitCode = 1;
}
