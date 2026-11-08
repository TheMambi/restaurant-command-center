// The landing page's scroll sequence: 120 rendered frames drawn on a canvas as the hero scrolls.
// Frames come from hero-sequence/ (see its README) in two framings: wide for landscape screens,
// tall for portrait ones.

export const FRAME_COUNT = 120;
export type Framing = 'wide' | 'tall';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Below this width-to-height ratio, cropping a 16:9 frame to fill the screen would push the scene
// under the words, so squarer screens get the 4:5 frames instead.
export const WIDE_FROM = 1.45;

export const framingFor = (width: number, height: number): Framing => (height > 0 && width / height >= WIDE_FROM ? 'wide' : 'tall');

export const frameUrl = (framing: Framing, index: number): string => `/hero/${framing}/${String(index + 1).padStart(3, '0')}.webp`;

export function frameIndex(progress: number, count = FRAME_COUNT): number {
  return Math.round(clamp01(progress) * (count - 1));
}

// First and last frames, then ever finer strides, so scrubbing works before every frame is in.
export function loadOrder(count = FRAME_COUNT): number[] {
  const order = [0, count - 1];
  const seen = new Set(order);
  for (let stride = 16; stride >= 1; stride /= 2) {
    for (let i = 0; i < count; i += stride) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  return order;
}

export function nearestLoaded(index: number, loaded: ReadonlySet<number>, count = FRAME_COUNT): number | undefined {
  for (let d = 0; d < count; d++) {
    if (loaded.has(index - d)) return index - d;
    if (loaded.has(index + d)) return index + d;
  }
  return undefined;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Wide frames cover the screen and crop mostly from the empty left side, where the words sit.
// Tall frames fit inside the screen: on the right of a landscape screen, at the bottom of a portrait
// one, leaving the words their own space.
export function fitRect(imageW: number, imageH: number, boxW: number, boxH: number, framing: Framing): Rect {
  if (imageW <= 0 || imageH <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  if (framing === 'wide') {
    const s = Math.max(boxW / imageW, boxH / imageH);
    const w = imageW * s;
    const h = imageH * s;
    return { x: (boxW - w) * 0.85, y: (boxH - h) * 0.45, w, h };
  }
  const s = Math.min(boxW / imageW, boxH / imageH);
  const w = imageW * s;
  const h = imageH * s;
  if (boxW > boxH) return { x: boxW - w, y: (boxH - h) / 2, w, h };
  return { x: (boxW - w) / 2, y: boxH - h, w, h };
}

// Opacity of a block of words shown between two points of the hero's scroll progress.
export function beatOpacity(progress: number, from: number, to: number, fade = 0.06): number {
  const fadeIn = from <= 0 ? 1 : clamp01((progress - from + fade) / fade);
  const fadeOut = to >= 1 ? 1 : 1 - clamp01((progress - to) / fade);
  return Math.min(fadeIn, fadeOut);
}

export interface Sequence {
  show(progress: number): void;
}

export function mountSequence(canvas: HTMLCanvasElement, background: string, still: boolean): Sequence {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { show() {} };
  let framing: Framing = framingFor(innerWidth, innerHeight);
  let images: HTMLImageElement[] = [];
  let loaded = new Set<number>();
  let wanted = still ? FRAME_COUNT - 1 : 0;

  function draw(): void {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx!.fillStyle = background;
    ctx!.fillRect(0, 0, w, h);
    const index = nearestLoaded(wanted, loaded);
    if (index === undefined) return;
    const image = images[index]!;
    const r = fitRect(image.naturalWidth, image.naturalHeight, w, h, framing);
    ctx!.drawImage(image, r.x, r.y, r.w, r.h);
  }

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  };

  function load(): void {
    images = [];
    loaded = new Set();
    const order = still ? [FRAME_COUNT - 1] : loadOrder();
    for (const i of order) {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        loaded.add(i);
        schedule();
      };
      image.src = frameUrl(framing, i);
      images[i] = image;
    }
  }

  addEventListener('resize', () => {
    const next = framingFor(innerWidth, innerHeight);
    if (next !== framing) {
      framing = next;
      load();
    }
    schedule();
  });

  load();
  return {
    show(progress: number) {
      if (still) return;
      const next = frameIndex(progress);
      if (next === wanted) return;
      wanted = next;
      schedule();
    },
  };
}
