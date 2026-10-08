import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  publicDir: resolve(root, "../customer/assets/fonts"),
  build: {
    emptyOutDir: true,
    outDir: resolve(root, "hosting"),
    sourcemap: true
  },
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true
  },
  preview: {
    host: "127.0.0.1",
    port: 4175,
    strictPort: true
  },
  test: {
    environment: "node",
    fileParallelism: false,
    isolate: false,
    setupFiles: [resolve(root, "src/test/setup.ts")],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: resolve(root, "coverage"),
      include: [
        "src/assistance/{assistance-model,assistance-permissions}.ts",
        "src/auth/auth-errors.ts",
        "src/components/*.tsx",
        "src/config/environment.ts",
        "src/layouts/{admin-shell,auth-layout}.tsx",
        "src/menu/{catalog-utils,image-options,menu-model,menu-permissions}.ts",
        "src/metrics/metrics-model.ts",
        "src/orders/{order-model,order-visibility}.ts",
        "src/pages/{login-page,reset-password-page}.tsx",
        "src/routing/guards.ts",
        "src/settings/settings-model.ts",
        "src/tables/{qr-links,table-model,table-permissions}.ts",
        "src/team/{team-model,team-permissions}.ts",
        "src/tenant/{access-control,tenant-model}.ts"
      ],
      thresholds: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85
      }
    }
  }
});
