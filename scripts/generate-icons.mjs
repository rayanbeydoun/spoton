// One-off: renders the SpotOn app icon to the PNG sizes a PWA needs.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public");
mkdirSync(OUT, { recursive: true });

function pentagon(cx, cy, r, rotDeg) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const a = ((-90 + rotDeg + i * 72) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// Classic football: white ball with a central dark pentagon + 5 around the rim.
const dark = "#1a0b2e";
let seams = `<polygon points="${pentagon(256, 256, 54, 0)}" fill="${dark}"/>`;
for (let i = 0; i < 5; i++) {
  const a = ((-90 + i * 72) * Math.PI) / 180;
  const cx = 256 + 104 * Math.cos(a);
  const cy = 256 + 104 * Math.sin(a);
  seams += `<polygon points="${pentagon(cx, cy, 33, 180 + i * 72)}" fill="${dark}"/>`;
}

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a1d6e"/>
      <stop offset="1" stop-color="#1a0b2e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="168" fill="none" stroke="#ff2882" stroke-width="10"/>
  <circle cx="256" cy="256" r="150" fill="#f4eefb"/>
  ${seams}
</svg>`;

const sizes = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of sizes) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(OUT, name));
  console.log("wrote", name);
}
