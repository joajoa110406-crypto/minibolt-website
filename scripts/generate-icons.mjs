/**
 * PWA 아이콘 생성 스크립트
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const SIZES = [192, 512];
const OUTPUT_DIR = 'public/icons';

mkdirSync(OUTPUT_DIR, { recursive: true });

function createSvg(size, maskable = false) {
  const padding = maskable ? Math.round(size * 0.1) : 0;
  const innerSize = size - padding * 2;
  const fontSize = Math.round(innerSize * 0.55);
  const textY = padding + Math.round(innerSize * 0.72);
  const cx = size / 2;
  const rx = maskable ? 0 : Math.round(size * 0.12);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#2c3e50"/>
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${rx}" fill="#ff6b35"/>
  <text x="${cx}" y="${textY}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="${fontSize}" fill="white">M</text>
</svg>`;
}

async function generate() {
  for (const size of SIZES) {
    // Standard icon
    const svg = Buffer.from(createSvg(size, false));
    await sharp(svg).png().toFile(`${OUTPUT_DIR}/icon-${size}x${size}.png`);
    console.log(`Created icon-${size}x${size}.png`);

    // Maskable icon (with safe zone padding)
    const maskableSvg = Buffer.from(createSvg(size, true));
    await sharp(maskableSvg).png().toFile(`${OUTPUT_DIR}/icon-maskable-${size}x${size}.png`);
    console.log(`Created icon-maskable-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  const appleSvg = Buffer.from(createSvg(180, false));
  await sharp(appleSvg).png().toFile('public/apple-touch-icon.png');
  console.log('Created apple-touch-icon.png');

  // Favicon (32x32)
  const favSvg = Buffer.from(createSvg(32, false));
  await sharp(favSvg).png().toFile('public/favicon.ico');
  console.log('Created favicon.ico');

  console.log('Done!');
}

generate().catch(console.error);
