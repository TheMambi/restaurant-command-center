// Copies the libraries, fonts, colour tokens and report figures the composition needs into
// assets/, because HyperFrames only resolves files inside the project folder.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const repo = dirname(here);
const copies = [
  ['node_modules/three/build/three.module.js', 'assets/vendor/three.module.js'],
  ['node_modules/three/build/three.core.js', 'assets/vendor/three.core.js'],
  ['node_modules/three/examples/jsm/environments/RoomEnvironment.js', 'assets/vendor/RoomEnvironment.js'],
  ['node_modules/three/examples/jsm/lights/RectAreaLightUniformsLib.js', 'assets/vendor/RectAreaLightUniformsLib.js'],
  ['node_modules/three/examples/jsm/lights/RectAreaLightTexturesLib.js', 'assets/vendor/RectAreaLightTexturesLib.js'],
  [join(repo, 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2'), 'assets/fonts/fraunces.woff2'],
  [join(repo, 'node_modules/@fontsource-variable/onest/files/onest-latin-wght-normal.woff2'), 'assets/fonts/onest.woff2'],
  [join(repo, 'src/styles/tokens.css'), 'assets/tokens.css'],
  ['content.json', 'assets/content.json'],
];
for (const [from, to] of copies) {
  const target = join(here, to);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(from.startsWith('/') ? from : join(here, from), target);
}
console.log(`Copied ${copies.length} files into assets/`);
