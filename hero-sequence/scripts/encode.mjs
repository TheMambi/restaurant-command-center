// Encodes a folder of PNG frames to numbered WebP files (001.webp ...) at the given width and quality.
// Smart chroma subsampling keeps the dark counter free of blocky colour speckles.
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const [from, to, width, quality] = process.argv.slice(2);
const frames = readdirSync(from).filter((f) => f.endsWith('.png')).sort();
if (frames.length === 0) throw new Error(`No PNG frames in ${from}`);
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const [i, f] of frames.entries()) {
  const name = `${String(i + 1).padStart(3, '0')}.webp`;
  await sharp(join(from, f))
    .resize({ width: Number(width) })
    .webp({ quality: Number(quality), smartSubsample: true, effort: 6 })
    .toFile(join(to, name));
}
console.log(`Encoded ${frames.length} frames into ${to}`);
