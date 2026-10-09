import assert from "node:assert/strict";

import { Launcher } from "chrome-launcher";
import { chromium } from "playwright-core";

import {
  assertLocalEmulatorEnvironment,
  EMULATOR_HOST,
  EMULATOR_PORTS
} from "./lib/emulator-config.mjs";

assertLocalEmulatorEnvironment(process.env);

const demoToken = "6d657361666c6f772d64656d6f2d3031";
let browser;

async function hostingPorts() {
  const response = await fetch(`http://${EMULATOR_HOST}:${EMULATOR_PORTS.hub}/emulators`, {
    signal: AbortSignal.timeout(15000)
  });
  assert.equal(response.status, 200);
  const emulators = await response.json();
  const ports = [emulators.hosting.port, ...(emulators.hosting.reservedPorts ?? [])];
  assert.equal(ports.length, 3);
  return ports;
}

async function enableFlutterSemantics(page) {
  await page.locator("flt-glass-pane").waitFor({ state: "attached", timeout: 30000 });
  const placeholder = page.locator("flt-semantics-placeholder");
  if (await placeholder.count() > 0) {
    await placeholder.evaluate((element) => element.click());
  } else {
    await page.keyboard.press("Tab");
  }
  await page.locator("flt-semantics").first().waitFor({ state: "attached", timeout: 15000 });
}

try {
  const installations = Launcher.getInstallations();
  assert.ok(installations.length > 0, "Chrome o Chromium debe estar instalado para el E2E local");
  const [customerPort, adminPort, landingPort] = await hostingPorts();
  browser = await chromium.launch({
    executablePath: installations[0],
    headless: true,
    args: ["--disable-gpu", "--no-first-run"]
  });

  const landingContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const landing = await landingContext.newPage();
  const landingResponse = await landing.goto(`http://${EMULATOR_HOST}:${landingPort}/`, {
    waitUntil: "networkidle"
  });
  assert.equal(landingResponse?.status(), 200);
  await landing.getByRole("heading", { level: 1, name: /Tu servicio,?\s*en movimiento\./u }).waitFor();
  await landing.getByRole("link", { name: "Ver experiencia" }).click();
  await landing.waitForURL(new RegExp(`127\\.0\\.0\\.1:${customerPort}`));
  await landingContext.close();
  console.log("[OK] Playwright: landing carga y su CTA abre la experiencia cliente");

  const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const admin = await adminContext.newPage();
  const adminErrors = [];
  admin.on("console", (message) => {
    if (message.type() === "error") adminErrors.push(message.text());
  });
  admin.on("pageerror", (error) => adminErrors.push(error.message));
  await admin.goto(`http://${EMULATOR_HOST}:${adminPort}/login`, { waitUntil: "networkidle" });
  await admin.getByLabel("Correo electrónico").fill("owner@mesaflow.example.invalid");
  await admin.locator("#password").fill("MesaFlowDemo31!");
  const authResponsePromise = admin.waitForResponse(
    (response) => response.url().includes("accounts:signInWithPassword"),
    { timeout: 15000 }
  );
  await admin.getByRole("button", { name: /Ingresar al panel/u }).click();
  const authResponse = await authResponsePromise;
  assert.equal(authResponse.status(), 200, `Auth Emulator rechazó el login: ${await authResponse.text()}`);
  try {
    await admin.getByRole("heading", { level: 1, name: /Buen servicio/u }).waitFor({ timeout: 20000 });
  } catch (error) {
    const visibleText = (await admin.locator("body").innerText()).replace(/\s+/gu, " ").trim();
    throw new Error(
      `El panel no llegó al dashboard. URL=${admin.url()}; pantalla=${visibleText.slice(0, 500)}; ` +
      `errores=${adminErrors.join(" | ") || "ninguno"}; causa=${error instanceof Error ? error.message : error}`
    );
  }
  await admin.getByText(/Bistró MesaFlow/u).first().waitFor();
  await adminContext.close();
  console.log("[OK] Playwright: panel autentica owner y resuelve su tenant desde emuladores");

  const customerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const customer = await customerContext.newPage();
  const customerErrors = [];
  customer.on("console", (message) => {
    if (message.type() === "error") customerErrors.push(message.text());
  });
  customer.on("pageerror", (error) => customerErrors.push(error.message));
  const customerUrl =
    `http://${EMULATOR_HOST}:${customerPort}/e/mesa-flow-demo/table/mesa-01?token=${demoToken}`;
  await customer.goto(customerUrl, { waitUntil: "domcontentloaded" });
  try {
    await enableFlutterSemantics(customer);
    await customer.getByText("Bistró MesaFlow", { exact: false }).first().waitFor({ timeout: 30000 });
  } catch (error) {
    const visibleText = (await customer.locator("body").innerText()).replace(/\s+/gu, " ").trim();
    throw new Error(
      `Flutter no publicó el menú. URL=${customer.url()}; pantalla=${visibleText.slice(0, 500)}; ` +
      `errores=${customerErrors.join(" | ") || "ninguno"}; ` +
      `causa=${error instanceof Error ? error.message : error}`
    );
  }
  await customer.waitForFunction(() => !window.location.search.includes("token="));
  await customer.locator('flt-semantics[aria-label*="Empanadas criollas"]')
    .first()
    .waitFor({ timeout: 15000 });
  await customerContext.close();
  console.log("[OK] Playwright: QR abre Flutter, consume el token y publica el menú en móvil");
} catch (error) {
  console.error(`E2E de navegador falló: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
