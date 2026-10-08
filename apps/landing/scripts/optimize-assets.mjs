import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const landingRoot = fileURLToPath(new URL("../", import.meta.url));
const assetsRoot = path.resolve(landingRoot, "../customer/assets/images");
const source = path.join(assetsRoot, "mesa-demo.png");
const output = path.join(assetsRoot, "mesa-demo.webp");

await sharp(source)
  .resize({ width: 1024, withoutEnlargement: true })
  .webp({ quality: 75, effort: 6 })
  .toFile(output);

const [{ size: sourceSize }, { size: outputSize }] = await Promise.all([stat(source), stat(output)]);
console.log(`[OK] Imagen WebP: ${Math.round(sourceSize / 1024)} KiB → ${Math.round(outputSize / 1024)} KiB`);
