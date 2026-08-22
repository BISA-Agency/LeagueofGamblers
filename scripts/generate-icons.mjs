// One-off: rasterize public/icon.svg into the PNG sizes the PWA manifest needs.
// Re-run manually whenever public/icon.svg changes: `node scripts/generate-icons.mjs`.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const svgPath = path.join(root, "public", "icon.svg");
const outDir = path.join(root, "public", "icons");

const sizes = [192, 512];

await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
  console.log(`wrote icons/icon-${size}.png`);
}

// Apple touch icon: no alpha transparency (iOS fills it in with black otherwise).
await sharp(svgPath)
  .resize(180, 180)
  .flatten({ background: "#0a0a0a" })
  .png()
  .toFile(path.join(root, "public", "apple-touch-icon.png"));
console.log("wrote apple-touch-icon.png");
