import assert from "node:assert/strict";

import { Launcher } from "chrome-launcher";
import { chromium } from "playwright-core";

const customerUrl = "https://mesaflow-produccion.web.app";
const adminUrl = "https://mesaflow-produccion-admin.web.app";
const paymentUrl =
  "https://mesaflow-payment-demo.mesaflow-payment-demo-worker.workers.dev/preferences";

async function imageSize(page, source) {
  return page.evaluate((url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`No se pudo cargar ${url}.`));
    image.src = url;
  }), source);
}

let browser;
try {
  const installations = Launcher.getInstallations();
  assert.ok(installations.length > 0, "Chrome no está instalado.");
  browser = await chromium.launch({
    executablePath: installations[0],
    headless: true,
    args: ["--disable-gpu", "--no-first-run"]
  });

  const admin = await browser.newPage();
  await admin.goto(`${adminUrl}/login`, { waitUntil: "networkidle", timeout: 45_000 });
  const manifest = await admin.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!(link instanceof HTMLLinkElement)) throw new Error("Falta el manifiesto PWA.");
    const response = await fetch(link.href);
    return response.json();
  });
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.short_name, "MesaFlow Panel");
  const registration = await admin.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    return { scope: ready.scope, active: ready.active?.state };
  });
  assert.equal(registration.scope, `${adminUrl}/`);
  assert.equal(registration.active, "activated");
  assert.deepEqual(
    await imageSize(admin, `${adminUrl}/icons/apple-touch-icon.png`),
    { width: 180, height: 180 }
  );
  await admin.close();
  console.log("[OK] Panel PWA: manifiesto, service worker e ícono iOS activos.");

  const customer = await browser.newPage();
  await customer.goto(customerUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert.deepEqual(
    await imageSize(customer, `${customerUrl}/icons/apple-touch-icon.png`),
    { width: 180, height: 180 }
  );
  const payment = await customer.evaluate(async ({ endpoint }) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MesaFlow-Client": "demo-v1"
      },
      body: JSON.stringify({
        sessionId: "sesion-academica-01",
        tableId: "mesa-01",
        items: [{ productId: "burger-casa", quantity: 1 }]
      })
    });
    return { status: response.status, body: await response.json() };
  }, { endpoint: paymentUrl });
  assert.equal(payment.status, 200);
  assert.equal(payment.body.status, "ready");
  assert.ok([
    "sandbox.mercadopago.com",
    "sandbox.mercadopago.com.ar"
  ].includes(new URL(payment.body.checkoutUrl).hostname));
  await customer.close();
  console.log("[OK] Cliente: ícono iOS y checkout sandbox accesibles desde producción.");
} finally {
  await browser?.close();
}
