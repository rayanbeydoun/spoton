// One-off: turn the Canva logo export (white lockup on solid purple) into a
// tightly-cropped transparent PNG for the app header.
// Run: node scripts/process-logo.mjs
import sharp from "sharp";
import { join } from "node:path";

const SRC = join(process.cwd(), "public", "logo-source.png");
const OUT = join(process.cwd(), "public", "logo.png");

const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  if (lum < 140) {
    data[i + 3] = 0; // dark purple background -> transparent
  } else {
    data[i] = 255; // force the logo to clean white
    data[i + 1] = 255;
    data[i + 2] = 255;
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim()
  .png()
  .toFile(OUT);

console.log("wrote public/logo.png");
