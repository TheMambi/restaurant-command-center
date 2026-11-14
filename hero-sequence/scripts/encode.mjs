// Encodes a folder of PNG frames to numbered AVIF files (001.avif ...) at the given width, plus
// end.webp, the last frame for browsers that can't decode AVIF. AVIF keeps the dark counter
// smooth where WebP breaks it into blocks; full-resolution colour keeps the ink blue crisp.
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import sharp from 'sharp';

const [from, to, width] = process.argv.slice(2);
// The target folder is emptied first, so it may only be a folder of frames.
const hero = resolve(import.meta.dirname, '..', '..', 'public', 'hero');
if (!from || !to || !resolve(to).startsWith(hero + sep)) throw new Error(`Usage: encode.mjs <png folder> <folder inside ${hero}> <width>`);
const frames = readdirSync(from).filter((f) => f.endsWith('.png')).sort();
if (frames.length === 0) throw new Error(`No PNG frames in ${from}`);
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
const resized = (f) => sharp(join(from, f)).resize({ width: Number(width) });
for (const [i, f] of frames.entries()) {
  await resized(f)
    .avif({ quality: 55, effort: 4, chromaSubsampling: '4:4:4' })
    .toFile(join(to, `${String(i + 1).padStart(3, '0')}.avif`));
}
await resized(frames.at(-1)).webp({ quality: 88, smartSubsample: true, effort: 6 }).toFile(join(to, 'end.webp'));
console.log(`Encoded ${frames.length} frames and end.webp into ${to}`);
