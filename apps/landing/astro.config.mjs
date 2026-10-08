import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.PUBLIC_LANDING_URL || "http://127.0.0.1:5106",
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
