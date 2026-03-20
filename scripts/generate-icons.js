import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG = readFileSync(join(ROOT, 'public', 'favicon.svg'));
const OUT = join(ROOT, 'public', 'icons');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const SIZES = [32, 72, 96, 128, 144, 152, 192, 384, 512];

for (const size of SIZES) {
  const name = size === 32 ? `icon-32x32.png` : `icon-${size}x${size}.png`;
  await sharp(SVG)
    .resize(size, size)
    .png()
    .toFile(join(OUT, name));
  console.log(`  ✓ ${name}`);
}

console.log(`\nGenerated ${SIZES.length} icons in public/icons/`);
