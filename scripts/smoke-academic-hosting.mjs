import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Launcher } from "chrome-launcher";
import { chromium } from "playwright-core";

const production = process.argv.includes("--production");
const unsupportedArguments = process.argv.slice(2).filter((argument) => argument !== "--production");
assert.equal(unsupportedArguments.length, 0, `Argumentos no reconocidos: ${unsupportedArguments.join(", ")}`);
const output = new URL(
  production ? "../dist/academic-firebase-production/" : "../dist/academic-firebase/",
  import.meta.url
);
const customerHost = production
  ? "https://mesaflow-produccion.web.app"
  : "https://mesaflow-desarrollo.web.app";
const adminHost = production
  ? "https://mesaflow-produccion-admin.web.app"
  : "https://mesaflow-desarrollo-admin.web.app";
let browser;

async function enableFlutterSemantics(page) {
  await page.locator("flt-glass-pane").waitFor({ state: "attached", timeout: 45_000 });
  const placeholder = page.locator("flt-semantics-placeholder");
  if (await placeholder.count() > 0) await placeholder.evaluate((element) => element.click());
  else await page.keyboard.press("Tab");
  await page.locator("flt-semantics").first().waitFor({ state: "attached", timeout: 20_000 });
}

try {
  const installations = Launcher.getInstallations();
  assert.ok(installations.length > 0, "Chrome no está instalado.");
  browser = await chromium.launch({
    executablePath: installations[0],
    headless: true,
    args: ["--disable-gpu", "--no-first-run"]
  });

  const links = await readFile(new URL("enlaces-qr.txt", output), "utf8");
  const customerUrl = links.match(/^mesa-01: (.+)$/mu)?.[1];
  assert.ok(customerUrl);
  const customer = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const customerErrors = [];
  customer.on("console", (message) => {
    if (message.type() === "error") customerErrors.push(message.text());
  });
  customer.on("pageerror", (error) => customerErrors.push(error.message));
  await customer.goto(customerUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await enableFlutterSemantics(customer);
  await customer.getByText("Mesa 1", { exact: true }).first().waitFor({ timeout: 45_000 });
  await customer.waitForFunction(() => !window.location.search.includes("token="));
  await customer.locator('flt-semantics[aria-label*="Burger de la casa"]')
    .first()
    .waitFor({ timeout: 20_000 });
  await customer.locator('flt-semantics[aria-label*="Burger de la casa"]')
    .first()
    .click();
  await customer.getByRole("button", { name: /Agregar 1/u }).click();
  await customer.getByRole("button", { name: /Ver pedido/u }).click();
  await customer.getByRole("button", { name: "Enviar pedido" }).click();
  try {
    await customer.getByText("Pedido enviado", { exact: true })
      .waitFor({ timeout: 30_000 });
  } catch (error) {
    const labels = await customer.locator("flt-semantics").evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("aria-label")).filter(Boolean)
    );
    throw new Error(
      `El pedido no se confirmó. Pantalla=${labels.join(" | ").slice(0, 1000)}; ` +
      `errores=${customerErrors.join(" | ") || "ninguno"}; ` +
      `causa=${error instanceof Error ? error.message : error}`
    );
  }
  await customer.close();
  console.log("[OK] Hosting cliente: QR abre Mesa 1 y persiste un pedido en Firestore.");

  const credentials = await readFile(new URL("acceso-panel.txt", output), "utf8");
  const email = credentials.match(/^Email: (.+)$/mu)?.[1];
  const password = credentials.match(/^Contraseña: (.+)$/mu)?.[1];
  assert.ok(email && password);
  const admin = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await admin.goto(`${adminHost}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000
  });
  await admin.getByLabel("Correo electrónico").fill(email);
  await admin.locator("#password").fill(password);
  await admin.getByRole("button", { name: /Ingresar al panel/u }).click();
  await admin.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 });
  await admin.goto(`${adminHost}/operacion/mesas`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000
  });
  await admin.getByRole("heading", { level: 1, name: "Mesas" }).waitFor({ timeout: 30_000 });
  await admin.getByRole("heading", { level: 2, name: "Mesa 1" }).waitFor();
  await admin.getByRole("heading", { level: 2, name: "Mesa 3" }).waitFor();
  await admin.goto(`${adminHost}/operacion/pedidos`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000
  });
  await admin.getByText(/Burger de la casa/u).first()
    .waitFor({ timeout: 30_000 });
  await admin.close();
  console.log("[OK] Hosting panel: login, tres mesas y pedido compartido visibles.");

  const response = await fetch(
    `${customerHost}/.well-known/assetlinks.json`,
    { signal: AbortSignal.timeout(15_000) }
  );
  assert.equal(response.status, 200);
  const assetLinks = await response.json();
  assert.equal(assetLinks[0]?.target?.package_name, "com.mesaflow.demo");
  console.log("[OK] Android App Link publicado para abrir los QR en la APK.");
  console.log(`Destino verificado: ${production ? "mesaflow-produccion" : "mesaflow-desarrollo"}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falló el smoke de Hosting.");
  process.exitCode = 1;
} finally {
  await browser?.close();
}
