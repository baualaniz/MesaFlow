import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Launcher } from "chrome-launcher";
import { chromium } from "playwright-core";

const credentialsPath = new URL(
  "../dist/academic-firebase-production/usuarios-panel.txt",
  import.meta.url
);
const adminUrl = "https://mesaflow-produccion-admin.web.app";
const expectedNavigation = Object.freeze({
  owner: Object.freeze(["Pedidos", "Asistencia", "Mesas", "Productos", "Equipo", "Configuración"]),
  manager: Object.freeze(["Pedidos", "Asistencia", "Mesas", "Productos", "Equipo", "Configuración"]),
  staff: Object.freeze(["Pedidos", "Asistencia", "Mesas", "Productos"]),
  kitchen: Object.freeze(["Pedidos"])
});
const forbiddenNavigation = Object.freeze({
  owner: Object.freeze([]),
  manager: Object.freeze([]),
  staff: Object.freeze(["Equipo", "Configuración"]),
  kitchen: Object.freeze(["Asistencia", "Mesas", "Productos", "Equipo", "Configuración"])
});

function credentials(text) {
  const blocks = text.split(/\r?\n\r?\n/u).slice(1);
  return blocks.map((block) => {
    const header = block.match(/^.+ \((owner|manager|staff|kitchen)\)$/mu);
    const email = block.match(/^Email: (.+)$/mu)?.[1];
    const password = block.match(/^Contraseña provisoria: (.+)$/mu)?.[1];
    if (!header || !email || !password) return null;
    return { email, password, role: header[1] };
  }).filter(Boolean);
}

let browser;
try {
  const accounts = credentials(await readFile(credentialsPath, "utf8"));
  assert.equal(accounts.length, 4, "La hoja local debe contener cuatro usuarios.");
  const installations = Launcher.getInstallations();
  assert.ok(installations.length > 0, "Chrome no está instalado.");
  browser = await chromium.launch({
    executablePath: installations[0],
    headless: true,
    args: ["--disable-gpu", "--no-first-run"]
  });

  for (const account of accounts) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${adminUrl}/login`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByLabel("Correo electrónico").fill(account.email);
    await page.locator("#password").fill(account.password);
    await page.getByRole("button", { name: /Ingresar al panel/u }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 });
    await page.getByText("Bistró MesaFlow", { exact: true }).first().waitFor({ timeout: 30_000 });

    for (const label of expectedNavigation[account.role]) {
      await page.getByRole("link", { name: label, exact: true }).waitFor();
    }
    for (const label of forbiddenNavigation[account.role]) {
      assert.equal(
        await page.getByRole("link", { name: label, exact: true }).count(),
        0,
        `${account.role} no debe ver ${label}.`
      );
    }
    await context.close();
    console.log(`[OK] ${account.email}: login y navegación ${account.role} verificados.`);
  }
  console.log("[OK] Cuatro roles verificados en el panel de mesaflow-produccion.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falló el smoke de usuarios productivos.");
  process.exitCode = 1;
} finally {
  await browser?.close();
}
