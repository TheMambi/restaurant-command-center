// The frames' address carries an id made from their own bytes, so a new render always gets new
// addresses and the old ones can be cached for good. Prints the id of the frames in ../public/hero.
// With --stamp (run by render.sh) it also renames the freshly encoded folder to that id, removes
// the render it replaces and writes the id where the landing page names it.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const hero = join(root, 'public', 'hero');
const fresh = 'next';

function idOf(folder) {
  const hash = createHash('sha256');
  for (const file of readdirSync(folder, { recursive: true, withFileTypes: true }).filter((f) => f.isFile()).map((f) => join(f.parentPath, f.name)).sort()) {
    hash.update(file.slice(folder.length)).update(readFileSync(file));
  }
  return hash.digest('hex').slice(0, 8);
}

const folders = readdirSync(hero);
if (process.argv[2] === '--stamp') {
  if (!folders.includes(fresh)) throw new Error(`No freshly encoded frames in public/hero/${fresh}`);
  const id = idOf(join(hero, fresh));
  for (const old of folders.filter((f) => f !== fresh)) rmSync(join(hero, old), { recursive: true });
  renameSync(join(hero, fresh), join(hero, id));
  for (const [file, pattern, to] of [
    ['src/landing/sequence.ts', /HERO_RENDER = '[^']*'/, `HERO_RENDER = '${id}'`],
    ['index.html', /href="\/hero\/[^/]+\//g, `href="/hero/${id}/`],
  ]) {
    const path = join(root, file);
    writeFileSync(path, readFileSync(path, 'utf8').replace(pattern, to));
  }
  console.log(`Frames stamped as ${id}`);
} else {
  if (folders.length !== 1) throw new Error(`public/hero should hold one render, found: ${folders.join(', ')}`);
  console.log(idOf(join(hero, folders[0])));
}
