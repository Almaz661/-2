import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const svgPath = path.join(publicDir, 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generate() {
  console.log('Generating PWA icons from SVG...');

  // 1. Standard 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 2. Standard 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 3. Apple Touch Icon 180x180 PNG
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 4. Favicon 32x32 PNG / ico
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  // 5. Maskable icon 512x512 with 12% padding for safe zone on Android
  // Central icon resized to 384x384 (75% of canvas) on solid brand background
  const innerIcon = await sharp(svgBuffer)
    .resize(390, 390)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 225, g: 90, b: 66, alpha: 1 }, // #E15A42
    },
  })
    .composite([
      {
        input: innerIcon,
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('Successfully generated all PWA icons:');
  console.log(' - pwa-192x192.png');
  console.log(' - pwa-512x512.png');
  console.log(' - pwa-maskable-512x512.png');
  console.log(' - apple-touch-icon.png');
  console.log(' - favicon.ico');
}

generate().catch((err) => {
  console.error('Failed to generate PWA icons:', err);
  process.exit(1);
});
