import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG = readFileSync(join(ROOT, 'public', 'favicon.svg'));
const OUT = join(ROOT, 'assets');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// 1024x1024 icon (full circle icon on transparent background)
await sharp(SVG)
  .resize(1024, 1024)
  .png()
  .toFile(join(OUT, 'icon-only.png'));
console.log('  done: icon-only.png (1024x1024)');

// Foreground layer for adaptive icons (icon centered on transparent)
await sharp(SVG)
  .resize(1024, 1024)
  .png()
  .toFile(join(OUT, 'icon-foreground.png'));
console.log('  done: icon-foreground.png (1024x1024)');

// Background layer for adaptive icons (solid dark color)
await sharp({
  create: {
    width: 1024, height: 1024,
    channels: 4,
    background: { r: 15, g: 23, b: 42, alpha: 1 },
  },
})
  .png()
  .toFile(join(OUT, 'icon-background.png'));
console.log('  done: icon-background.png (1024x1024)');

// Splash screen: centered icon on dark background
const iconForSplash = await sharp(SVG).resize(512, 512).png().toBuffer();
await sharp({
  create: {
    width: 2732, height: 2732,
    channels: 4,
    background: { r: 15, g: 23, b: 42, alpha: 1 },
  },
})
  .composite([{ input: iconForSplash, gravity: 'centre' }])
  .png()
  .toFile(join(OUT, 'splash.png'));
console.log('  done: splash.png (2732x2732)');

// Dark splash variant
await sharp({
  create: {
    width: 2732, height: 2732,
    channels: 4,
    background: { r: 15, g: 23, b: 42, alpha: 1 },
  },
})
  .composite([{ input: iconForSplash, gravity: 'centre' }])
  .png()
  .toFile(join(OUT, 'splash-dark.png'));
console.log('  done: splash-dark.png (2732x2732)');

console.log('\nAll Capacitor source assets generated in assets/');
