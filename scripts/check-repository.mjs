import { execFile } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { validateFirebaseProjects } from "./lib/firebase-projects.mjs";
import { validateEmulatorConfig } from "./lib/emulator-config.mjs";
import { validateAuthPolicy } from "./lib/auth-config.mjs";
import { validateFirestorePolicy, validateFirestoreSchema } from "./lib/firestore-config.mjs";
import { validateStoragePolicy } from "./lib/storage-config.mjs";
import { validateSecretsPolicy } from "./lib/secrets-config.mjs";
import { validateHostingConfig } from "./lib/hosting-config.mjs";
import { validateCustomerFirebaseConfig } from "./lib/customer-firebase-config.mjs";

const root = process.cwd();
const execFileAsync = promisify(execFile);

const requiredPaths = [
  ".editorconfig",
  ".env.example",
  ".firebaserc",
  "firebase.json",
  "firestore.rules",
  "firestore.indexes.json",
  "storage.rules",
  ".gitattributes",
  ".gitignore",
  "CONTRIBUTING.md",
  "README.md",
  "SECURITY.md",
  "apps/customer",
  "apps/admin",
  "apps/admin/package.json",
  "apps/admin/vite.config.ts",
  "apps/admin/src/components/components.test.tsx",
  "apps/admin/src/orders/order-visibility.test.ts",
  "apps/admin/src/pages/auth-pages.test.tsx",
  "apps/admin/src/main.tsx",
  "apps/admin/src/config/environment.ts",
  "apps/admin/src/firebase/firebase.ts",
  "apps/admin/src/auth/auth-provider.tsx",
  "apps/admin/src/routing/guards.ts",
  "apps/admin/src/routing/router.tsx",
  "apps/admin/src/tenant/access-control.ts",
  "apps/admin/src/tenant/tenant-provider.tsx",
  "apps/admin/src/tenant/tenant-repository.ts",
  "apps/admin/src/orders/order-model.ts",
  "apps/admin/src/orders/order-repository.ts",
  "apps/admin/src/pages/orders-page.tsx",
  "apps/admin/src/assistance/assistance-model.ts",
  "apps/admin/src/assistance/assistance-repository.ts",
  "apps/admin/src/assistance/assistance-gateway.ts",
  "apps/admin/src/assistance/assistance-permissions.ts",
  "apps/admin/src/assistance/assistance-model.test.ts",
  "apps/admin/src/assistance/assistance-permissions.test.ts",
  "apps/admin/src/pages/assistance-page.tsx",
  "apps/admin/src/metrics/metrics-model.ts",
  "apps/admin/src/metrics/metrics-model.test.ts",
  "apps/admin/src/metrics/metrics-repository.ts",
  "apps/admin/src/settings/settings-model.ts",
  "apps/admin/src/settings/settings-model.test.ts",
  "apps/admin/src/settings/settings-repository.ts",
  "apps/admin/src/settings/settings-gateway.ts",
  "apps/admin/src/pages/settings-page.tsx",
  "apps/admin/src/tables/table-model.ts",
  "apps/admin/src/tables/table-repository.ts",
  "apps/admin/src/tables/table-gateway.ts",
  "apps/admin/src/tables/qr-links.ts",
  "apps/admin/src/pages/tables-page.tsx",
  "apps/admin/src/menu/menu-model.ts",
  "apps/admin/src/menu/menu-repository.ts",
  "apps/admin/src/menu/menu-gateway.ts",
  "apps/admin/src/menu/menu-permissions.ts",
  "apps/admin/src/menu/image-options.ts",
  "apps/admin/src/pages/catalog-page.tsx",
  "apps/admin/src/team/team-model.ts",
  "apps/admin/src/team/team-gateway.ts",
  "apps/admin/src/team/team-permissions.ts",
  "apps/admin/src/pages/team-page.tsx",
  "apps/landing",
  "apps/landing/package.json",
  "apps/landing/astro.config.mjs",
  "apps/landing/tsconfig.json",
  "apps/landing/src/layouts/BaseLayout.astro",
  "apps/landing/src/pages/index.astro",
  "apps/landing/src/pages/404.astro",
  "apps/landing/src/pages/robots.txt.ts",
  "apps/landing/src/pages/site.webmanifest.ts",
  "apps/landing/src/pages/sitemap.xml.ts",
  "apps/landing/src/styles/global.css",
  "apps/landing/scripts/astro.mjs",
  "apps/landing/scripts/lighthouse-audit.mjs",
  "apps/landing/scripts/optimize-assets.mjs",
  "apps/landing/test/landing.test.mjs",
  "apps/customer/assets/icons/favicon.svg",
  "apps/customer/assets/images/mesa-demo.webp",
  "docs/architecture.md",
  "docs/guia-entrega-avance.md",
  "docs/informe-avance-presentacion.md",
  "docs/master-plan.md",
  "docs/product-spec.md",
  "firebase/seeds",
  "firebase/seeds/presentation-dev.json",
  "firebase/seeds/demo-emulator.json",
  "firebase/auth-policy.json",
  "firebase/firestore-policy.json",
  "firebase/storage-policy.json",
  "firebase/secrets-policy.json",
  "firebase/mercado-pago-policy.json",
  "firebase/hosting-policy.json",
  "firebase/schema/firestore-schema.json",
  "firebase/query-plans.json",
  "firebase/tests",
  "functions/package.json",
  "functions/tsconfig.json",
  "functions/eslint.config.mjs",
  "functions/src/index.ts",
  "functions/src/health.ts",
  "functions/test/health.test.mjs",
  "functions/src/config/runtime.ts",
  "functions/.env.example",
  "functions/.secret.local.example",
  "packages/contracts",
  "packages/contracts/fixtures/contract-spec.json",
  "packages/contracts/fixtures/domain-fixtures.json",
  "packages/contracts/src/domain.ts",
  "packages/contracts/test/domain.test.mjs",
  "apps/customer/lib/src/contracts/domain_contracts.dart",
  "apps/customer/test/domain_contracts_test.dart",
  "apps/customer/lib/src/config/app_environment.dart",
  "apps/customer/test/app_environment_test.dart",
  "apps/customer/firebase.json",
  "apps/customer/lib/src/firebase/firebase_bootstrap.dart",
  "apps/customer/lib/src/firebase/firebase_options_dev.dart",
  "apps/customer/lib/src/firebase/firebase_options_prod.dart",
  "apps/customer/test/firebase_bootstrap_test.dart",
  "apps/customer/assets/fonts/Inter-Variable.ttf",
  "apps/customer/assets/fonts/Poppins-Regular.ttf",
  "apps/customer/assets/fonts/Poppins-SemiBold.ttf",
  "apps/customer/assets/fonts/Poppins-Bold.ttf",
  "apps/customer/assets/fonts/OFL-Inter.txt",
  "apps/customer/assets/fonts/OFL-Poppins.txt",
  "apps/customer/lib/src/widgets/status_badge.dart",
  "apps/customer/lib/src/widgets/feedback_panel.dart",
  "apps/customer/test/design_system_test.dart",
  "apps/customer/lib/src/routing/app_router.dart",
  "apps/customer/lib/src/routing/customer_routes.dart",
  "apps/customer/lib/src/screens/entry_page.dart",
  "apps/customer/lib/src/screens/invalid_link_page.dart",
  "apps/customer/test/customer_routes_test.dart",
  "apps/customer/test/routing_test.dart",
  "apps/customer/lib/src/session/qr_session.dart",
  "apps/customer/lib/src/session/firebase_qr_session_gateway.dart",
  "apps/customer/lib/src/screens/session_gate_page.dart",
  "apps/customer/test/qr_session_test.dart",
  "apps/customer/test/session_gate_test.dart",
  "docs/stage-11-contracts.md",
  "docs/stage-12-data-model.md",
  "docs/stage-13-firestore-indexes.md",
  "docs/stage-14-firestore-rules.md",
  "docs/stage-15-storage-rules.md",
  "docs/stage-16-demo-seed.md",
  "docs/stage-17-customer-shell.md",
  "docs/stage-18-design-system.md",
  "docs/stage-19-routing.md",
  "docs/stage-20-qr-exchange.md",
  "docs/stage-21-dynamic-menu.md",
  "docs/stage-22-product-detail.md",
  "docs/stage-23-persistent-cart.md",
  "docs/stage-24-create-order.md",
  "docs/stage-25-order-tracking.md",
  "docs/stage-26-assistance.md",
  "docs/stage-27-consumption.md",
  "docs/stage-28-mercado-pago.md",
  "docs/stage-29-payment-preference.md",
  "docs/stage-30-payment-webhook.md",
  "docs/stage-31-admin-foundation.md",
  "docs/stage-32-tenant-rbac.md",
  "docs/stage-33-operational-orders.md",
  "docs/stage-34-tables-qr.md",
  "docs/stage-35-catalog-management.md",
  "docs/stage-36-team-roles.md",
  "docs/stage-37-operational-assistance.md",
  "docs/stage-38-sales-metrics.md",
  "docs/stage-39-establishment-settings.md",
  "docs/stage-40-whatsapp-assistance.md",
  "docs/stage-41-commercial-landing.md",
  "docs/stage-42-seo-accessibility.md",
  "docs/stage-43-unit-widget-component-tests.md",
  "functions/src/data/firestore-converters.ts",
  "functions/src/data/tenant-repository.ts",
  "functions/src/data/firestore-qr-session-repository.ts",
  "functions/src/qr-session.ts",
  "functions/src/qr-session-callable.ts",
  "functions/src/create-order.ts",
  "functions/src/create-order-callable.ts",
  "functions/src/update-order-status.ts",
  "functions/src/update-order-status-callable.ts",
  "functions/src/data/firestore-order-status-repository.ts",
  "functions/src/update-assistance-status.ts",
  "functions/src/update-assistance-status-callable.ts",
  "functions/src/data/firestore-assistance-status-repository.ts",
  "functions/test/update-assistance-status.test.mjs",
  "functions/src/data/firestore-daily-metrics.ts",
  "functions/test/daily-metrics.test.mjs",
  "functions/src/manage-table.ts",
  "functions/src/manage-table-callable.ts",
  "functions/src/team-management.ts",
  "functions/src/team-management-callable.ts",
  "functions/src/data/firestore-team-management-repository.ts",
  "functions/src/data/firestore-table-management-repository.ts",
  "functions/src/data/firestore-order-repository.ts",
  "functions/test/create-order.test.mjs",
  "functions/src/assistance-request.ts",
  "functions/src/assistance-request-callable.ts",
  "functions/src/data/firestore-assistance-repository.ts",
  "functions/test/assistance-request.test.mjs",
  "functions/src/whatsapp-assistance.ts",
  "functions/src/whatsapp-assistance-trigger.ts",
  "functions/src/providers/whatsapp-cloud-api.ts",
  "functions/src/data/firestore-whatsapp-notification-repository.ts",
  "functions/test/whatsapp-assistance.test.mjs",
  "functions/src/session-consumption.ts",
  "functions/src/session-consumption-callable.ts",
  "functions/src/data/firestore-consumption-repository.ts",
  "functions/test/session-consumption.test.mjs",
  "functions/test/tenant-repository.test.mjs",
  "functions/test/qr-session.test.mjs",
  "functions/test/manage-table.test.mjs",
  "functions/test/team-management.test.mjs",
  "scripts/admin-catalog-emulator-smoke.mjs",
  "scripts/admin-team-emulator-smoke.mjs",
  "scripts/admin-assistance-emulator-smoke.mjs",
  "scripts/admin-metrics-emulator-smoke.mjs",
  "scripts/admin-settings-emulator-smoke.mjs",
  "scripts/whatsapp-emulator-smoke.mjs",
  "apps/customer/lib/src/order/order_tracking_repository.dart",
  "apps/customer/lib/src/order/firestore_order_tracking_repository.dart",
  "apps/customer/lib/src/order/order_tracking_controller.dart",
  "apps/customer/lib/src/assistance/assistance_gateway.dart",
  "apps/customer/lib/src/assistance/firebase_assistance_gateway.dart",
  "apps/customer/lib/src/assistance/assistance_repository.dart",
  "apps/customer/lib/src/assistance/firestore_assistance_repository.dart",
  "apps/customer/lib/src/assistance/assistance_controller.dart",
  "apps/customer/lib/src/widgets/assistance_sheet.dart",
  "apps/customer/test/assistance_gateway_test.dart",
  "apps/customer/lib/src/consumption/consumption_gateway.dart",
  "apps/customer/lib/src/consumption/firebase_consumption_gateway.dart",
  "apps/customer/lib/src/consumption/consumption_controller.dart",
  "apps/customer/lib/src/widgets/consumption_sheet.dart",
  "apps/customer/test/consumption_gateway_test.dart",
  "apps/customer/test/firestore_assistance_repository_test.dart",
  "apps/customer/lib/src/widgets/order_tracking_sheet.dart",
  "apps/customer/test/firestore_order_tracking_repository_test.dart",
  "firebase/tests/firestore.rules.test.mjs",
  "package.json",
  "scripts/check-environment.ps1",
  "scripts/check-customer-coverage.mjs",
  "scripts/lib/java-runtime.mjs",
  "scripts/lib/firestore-indexes.mjs",
  "scripts/firestore-indexes.test.mjs",
  "scripts/check-firestore-indexes.mjs",
  "scripts/check-firestore-queries.mjs",
  "scripts/lib/mercado-pago-config.mjs",
  "scripts/mercado-pago-config.test.mjs",
  "scripts/check-mercado-pago-config.mjs",
  "scripts/java-runtime.test.mjs",
  "scripts/lib/presentation-seed.mjs",
  "scripts/presentation-seed.test.mjs",
  "scripts/seed-presentation-dev.mjs",
  "scripts/lib/demo-seed.mjs",
  "scripts/demo-seed.test.mjs",
  "scripts/seed-demo-emulator.mjs",
  "scripts/admin-auth-emulator-smoke.mjs",
  "scripts/admin-tenant-emulator-smoke.mjs",
  "scripts/admin-orders-emulator-smoke.mjs",
  "scripts/admin-tables-emulator-smoke.mjs",
  "scripts/qr-session-emulator.mjs",
  "scripts/lib/customer-firebase-config.mjs",
  "scripts/customer-firebase-config.test.mjs",
  "scripts/firestore-repository-emulator.mjs",
  "scripts/firestore-query-emulator.mjs"
];

const forbiddenFilePatterns = [
  { pattern: /^\.env(?:\..+)?$/i, allowed: /^\.env\.example$/i },
  { pattern: /^\.secret(?:\..+)?$/i, allowed: /^\.secret\.local\.example$/i },
  { pattern: /^\.runtimeconfig\.json$/i },
  { pattern: /service[-_]?account.*\.json$/i },
  { pattern: /serviceAccount.*\.json$/i },
  { pattern: /^application_default_credentials\.json$/i },
  { pattern: /\.(?:key|pem)$/i }
];

const forbiddenContentPatterns = [
  { label: "clave privada", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { label: "token Mercado Pago", pattern: /\b(?:APP_USR|TEST)-[A-Za-z0-9-]{24,}\b/u },
  { label: "token Meta/WhatsApp", pattern: /\bEAA[A-Za-z0-9]{60,}\b/u },
  { label: "token GitHub", pattern: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u },
  { label: "token Slack", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u }
];

async function assertRequiredPaths() {
  const missing = [];

  for (const relativePath of requiredPaths) {
    try {
      await access(path.join(root, relativePath), constants.F_OK);
    } catch {
      missing.push(relativePath);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Faltan rutas obligatorias:\n- ${missing.join("\n- ")}`);
  }
}

async function assertPackageMetadata() {
  const packagePath = path.join(root, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  const expectedWorkspaces = [
    "apps/admin",
    "apps/landing",
    "functions",
    "packages/*"
  ];

  if (packageJson.private !== true) {
    throw new Error("El package raíz debe mantener private=true.");
  }

  for (const workspace of expectedWorkspaces) {
    if (!packageJson.workspaces?.includes(workspace)) {
      throw new Error(`Falta el workspace obligatorio: ${workspace}`);
    }
  }
}

async function listRepositoryFiles() {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
  const candidates = stdout.split("\0").filter(Boolean);
  const existing = await Promise.all(candidates.map(async (relativePath) => {
    try {
      await access(path.join(root, relativePath), constants.F_OK);
      return relativePath;
    } catch {
      return null;
    }
  }));
  return existing.filter(Boolean);
}

function findForbiddenFiles(files) {
  const violations = [];
  for (const relativePath of files) {
    const name = path.basename(relativePath);
    const forbidden = forbiddenFilePatterns.some(({ pattern, allowed }) =>
      pattern.test(name) && !(allowed?.test(name) ?? false)
    );
    if (forbidden) violations.push(relativePath);
  }
  return violations;
}

async function findSensitiveContent(files) {
  const violations = [];
  for (const relativePath of files) {
    const buffer = await readFile(path.join(root, relativePath));
    if (buffer.length > 2 * 1024 * 1024 || buffer.includes(0)) continue;
    const content = buffer.toString("utf8");
    for (const { label, pattern } of forbiddenContentPatterns) {
      if (pattern.test(content)) violations.push(`${relativePath} (${label})`);
    }
  }
  return violations;
}

try {
  await assertRequiredPaths();
  await assertPackageMetadata();

  const firebaseConfig = JSON.parse(await readFile(path.join(root, ".firebaserc"), "utf8"));
  const firebaseJson = JSON.parse(await readFile(path.join(root, "firebase.json"), "utf8"));
  const firebaseProjects = validateFirebaseProjects(firebaseConfig);
  validateEmulatorConfig(firebaseJson);
  validateAuthPolicy(JSON.parse(await readFile(path.join(root, "firebase/auth-policy.json"), "utf8")));
  validateFirestorePolicy(JSON.parse(await readFile(path.join(root, "firebase/firestore-policy.json"), "utf8")));
  validateFirestoreSchema(JSON.parse(await readFile(path.join(root, "firebase/schema/firestore-schema.json"), "utf8")));
  validateStoragePolicy(JSON.parse(await readFile(path.join(root, "firebase/storage-policy.json"), "utf8")));
  validateSecretsPolicy(JSON.parse(await readFile(path.join(root, "firebase/secrets-policy.json"), "utf8")));
  validateHostingConfig(
    firebaseJson,
    firebaseConfig,
    JSON.parse(await readFile(path.join(root, "firebase/hosting-policy.json"), "utf8"))
  );
  validateCustomerFirebaseConfig(
    JSON.parse(await readFile(path.join(root, "apps/customer/firebase.json"), "utf8")),
    firebaseProjects
  );

  const repositoryFiles = await listRepositoryFiles();
  const forbiddenFiles = findForbiddenFiles(repositoryFiles);
  if (forbiddenFiles.length > 0) {
    throw new Error(
      `Se detectaron posibles secretos o archivos locales:\n- ${forbiddenFiles.join("\n- ")}`
    );
  }
  const sensitiveContent = await findSensitiveContent(repositoryFiles);
  if (sensitiveContent.length > 0) {
    throw new Error(`Se detectaron valores con forma de secreto:\n- ${sensitiveContent.join("\n- ")}`);
  }

  console.log("[OK] Estructura canónica del monorepo");
  console.log("[OK] Metadatos y workspaces npm");
  console.log(`[OK] Firebase: dev=${firebaseProjects.dev}, prod=${firebaseProjects.prod}`);
  console.log("[OK] Proyecto predeterminado: desarrollo (validación local)");
  console.log("[OK] Emuladores limitados a loopback");
  console.log("[OK] Política y esquema raíz de Firestore");
  console.log("[OK] Política y reglas base de Storage");
  console.log("[OK] Política de configuración pública y secretos");
  console.log("[OK] Tres destinos Firebase Hosting locales");
  console.log("[OK] Apps Web FlutterFire separadas para desarrollo y producción");
  console.log("[OK] No se detectaron archivos ni valores sensibles versionables");
  console.log("Repositorio MesaFlow válido.");
} catch (error) {
  console.error("Repositorio MesaFlow inválido.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
