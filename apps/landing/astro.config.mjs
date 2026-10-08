import { defineConfig } from "astro/config";

export default defineConfig({
  build: {
    assets: "_assets"
  },
  compressHTML: true,
  outDir: "./hosting",
  publicDir: "../customer/assets",
  server: {
    host: "127.0.0.1",
    port: 4321
  },
  trailingSlash: "never"
});
