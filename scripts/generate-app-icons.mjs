import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const source = await readFile(path.join(root, "assets/branding/mesaflow-app-icon.svg"));

const targets = [
  ["apps/customer/web/favicon.png", 48],
  ["apps/customer/web/icons/apple-touch-icon.png", 180],
  ["apps/customer/web/icons/Icon-192.png", 192],
  ["apps/customer/web/icons/Icon-512.png", 512],
  ["apps/customer/web/icons/Icon-maskable-192.png", 192],
  ["apps/customer/web/icons/Icon-maskable-512.png", 512],
  ["apps/admin/public/favicon.png", 48],
  ["apps/admin/public/icons/apple-touch-icon.png", 180],
  ["apps/admin/public/icons/icon-192.png", 192],
  ["apps/admin/public/icons/icon-512.png", 512],
  ["apps/admin/public/icons/icon-maskable-192.png", 192],
  ["apps/admin/public/icons/icon-maskable-512.png", 512]
];

for (const [relativePath, size] of targets) {
  const output = path.join(root, relativePath);
  await mkdir(path.dirname(output), { recursive: true });
  await sharp(source, { density: 384 })
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9, palette: true })
    .toFile(output);
}

console.log(`[OK] ${targets.length} iconos MesaFlow generados.`);
