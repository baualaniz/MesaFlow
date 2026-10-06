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
    fileParallelism: false
  }
});
