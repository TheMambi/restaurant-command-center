// Draws one frame of the ticket scene for each HyperFrames seek. Every frame is a function of
// the seek time alone, so frames can be captured in any order by several workers.
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from './vendor/RectAreaLightUniformsLib.js';
import { createScene } from './scene.js';
import content from './content.json' with { type: 'json' };

const root = document.querySelector('[data-composition-id]');
const canvas = document.getElementById('stage');
const width = Number(root.dataset.width);
const height = Number(root.dataset.height);
const framing = root.dataset.framing;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(width, height, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
// Khronos PBR Neutral keeps paper white and the ink blue close to their token values.
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.84;
renderer.shadowMap.enabled = true;
// Variance shadows blur into a soft studio penumbra instead of hard rectangles.
renderer.shadowMap.type = THREE.VSMShadowMap;

const pixel = new Uint8Array(4);
// A software GPU can return from gl.finish() before the frame is drawn; a read-back cannot.
function waitForGpu() {
  const gl = renderer.getContext();
  renderer.setRenderTarget(null);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
}

let poseAt = null;
let scene = null;
let camera = null;
let shownTime = null;

async function setup() {
  await Promise.all(
    ['600 64px "Fraunces Variable"', '400 32px "Onest Variable"', '600 32px "Onest Variable"'].map((f) => document.fonts.load(f)),
  );
  RectAreaLightUniformsLib.init();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  ({ scene, camera, poseAt } = createScene(THREE, { width, height, framing, content, environment, renderer }));
  poseAt(0);
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  waitForGpu();
}

function draw(time) {
  if (time === shownTime) return;
  poseAt(time);
  renderer.render(scene, camera);
  waitForGpu();
  shownTime = time;
}

const ready = setup();
window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady['ticket-scene'] = ready;

let queue = ready;
window.addEventListener('hf-seek', (event) => {
  const { time } = event.detail;
  queue = queue
    .catch(() => {})
    .then(() => ready)
    .then(() => draw(time));
  event.detail.waitUntil(queue);
});
