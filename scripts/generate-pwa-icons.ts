// Generate PWA icons (192×192 and 512×512) from the HustleCart Kesses Bag+K logo.
// Run with: bun run scripts/generate-pwa-icons.ts
import sharp from "sharp";
import path from "path";
import { mkdir } from "fs/promises";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const ICONS_DIR = path.join(PUBLIC_DIR, "icons");

// The Bag+K logo drawn as a standalone SVG (matches src/components/logo.tsx BagKMark).
// Orange background (so it stands out on a phone home screen), white bag + K.
function logoSvg(size: number): string {
  // Pad the 48×48 viewBox logo to fill `size`×`size` with a colored background.
  // We render at the viewBox size then let sharp resize.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#FF6B35" rx="${Math.round(size * 0.18)}"/>
  <g transform="translate(${size * 0.16}, ${size * 0.20}) scale(${size / 48 * 0.68})">
    <rect x="6" y="14" width="36" height="30" rx="5" fill="#FFF8F0"/>
    <path d="M16 16 V12 a8 8 0 0 1 16 0 V16" stroke="#1B263B" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <rect x="6" y="14" width="36" height="3" fill="#FFE8D6" opacity="0.45"/>
    <path d="M19 22 L19 36 M19 29 L28 22 M19 29 L28 36" stroke="#FF6B35" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  for (const size of [192, 512]) {
    const svg = logoSvg(size);
    const outPath = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log(`  - ${outPath}`);
  }

  // Apple touch icon (180×180, no transparency — iOS fills transparent with black).
  const appleSvg = logoSvg(180);
  const applePath = path.join(ICONS_DIR, "apple-touch-icon.png");
  await sharp(Buffer.from(appleSvg)).png().toFile(applePath);
  console.log(`  - ${applePath}`);

  // favicon (32×32)
  const favSvg = logoSvg(32);
  const favPath = path.join(PUBLIC_DIR, "favicon.png");
  await sharp(Buffer.from(favSvg)).png().toFile(favPath);
  console.log(`  - ${favPath}`);

  console.log("\nPWA icons generated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
