// The landing page's scroll sequence: 120 rendered frames drawn on a canvas as the hero scrolls.
// Frames come from hero-sequence/ (see its README) in two framings: wide for landscape screens,
// tall for portrait ones.

export const FRAME_COUNT = 120;
export type Framing = 'wide' | 'tall';
// Each set is a folder under /hero/. Wide frames come in two sizes from one render.
export type FrameSet = 'wide' | 'wide-hd' | 'tall';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Below this width-to-height ratio, cropping a 16:9 frame to fill the screen would push the scene
// under the words, so squarer screens get the 4:5 frames instead.
export const WIDE_FROM = 1.45;

export const framingFor = (width: number, height: number): Framing => (height > 0 && width / height >= WIDE_FROM ? 'wide' : 'tall');

// High-density screens, and any screen that would stretch the 2560 set, get the 3200 set.
export function frameSetFor(width: number, height: number, dpr: number): FrameSet {
  if (framingFor(width, height) === 'tall') return 'tall';
  const needed = Math.max(width, (height * 16) / 9) * Math.min(2, dpr || 1);
  return dpr >= 1.5 || needed > 2600 ? 'wide-hd' : 'wide';
}

export const framingOf = (set: FrameSet): Framing => (set === 'tall' ? 'tall' : 'wide');

export const frameUrl = (set: FrameSet, index: number): string => `/hero/${set}/${String(index + 1).padStart(3, '0')}.avif`;

// The finished frame as WebP, for a browser that can't decode AVIF.
export const endFrameFallbackUrl = (set: FrameSet): string => `/hero/${set}/end.webp`;

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
    return { x: (boxW - w) * 0.75, y: (boxH - h) * 0.45, w, h };
  }
  const s = Math.min(boxW / imageW, boxH / imageH);
  const w = imageW * s;
  const h = imageH * s;
  if (boxW > boxH) return { x: boxW - w, y: (boxH - h) / 2, w, h };
  return { x: (boxW - w) / 2, y: boxH - h, w, h };
}

// Opacity of a block of words shown between two points of the hero's scroll progress. Both fades
// happen inside the block's own range, so neighbouring blocks never show at once.
export function beatOpacity(progress: number, from: number, to: number, fade = 0.05): number {
  const fadeIn = from <= 0 ? 1 : clamp01((progress - from) / fade);
  const fadeOut = to >= 1 ? 1 : clamp01((to - progress) / fade);
  return Math.min(fadeIn, fadeOut);
}

export interface Sequence {
  show(progress: number): void;
}

export function mountSequence(canvas: HTMLCanvasElement, background: string, still: boolean): Sequence {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { show() {} };
  let set: FrameSet = frameSetFor(innerWidth, innerHeight, devicePixelRatio);
  let images: HTMLImageElement[] = [];
  let loaded = new Set<number>();
  let wanted = still ? FRAME_COUNT - 1 : 0;
  let fallback = false;

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
    const r = fitRect(image.naturalWidth, image.naturalHeight, w, h, framingOf(set));
    ctx!.drawImage(image, r.x, r.y, r.w, r.h);
    feather(r, w, h);
  }

  // Canvas gradients fade through black when the far stop is 'transparent', so the clear end of
  // each band is the stage colour itself at zero alpha.
  const clearStage = (() => {
    const probe = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
    if (!probe) return 'transparent';
    probe.fillStyle = background;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, 0)`;
  })();

  // Where a fitted frame stops short of the canvas, fade its edges into the stage so no seam shows.
  function feather(r: Rect, w: number, h: number): void {
    const size = Math.round(r.w * 0.2);
    const band = (x0: number, y0: number, x1: number, y1: number, x: number, y: number, bw: number, bh: number) => {
      const g = ctx!.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, background);
      g.addColorStop(1, clearStage);
      ctx!.fillStyle = g;
      ctx!.fillRect(x, y, bw, bh);
    };
    if (r.x > 0) band(r.x, 0, r.x + size, 0, r.x, r.y, size, r.h);
    if (r.x + r.w < w) band(r.x + r.w, 0, r.x + r.w - size, 0, r.x + r.w - size, r.y, size, r.h);
    if (r.y > 0) band(0, r.y, 0, r.y + size, r.x, r.y, r.w, size);
    if (r.y + r.h < h) band(0, r.y + r.h, 0, r.y + r.h - size, r.x, r.y + r.h - size, r.w, size);
  }

  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  };

  function load(): void {
    images = [];
    loaded = new Set();
    if (fallback) {
      wanted = FRAME_COUNT - 1;
      const image = new Image();
      image.onload = () => {
        loaded.add(FRAME_COUNT - 1);
        schedule();
      };
      image.src = endFrameFallbackUrl(set);
      images[FRAME_COUNT - 1] = image;
      return;
    }
    const order = still ? [FRAME_COUNT - 1] : loadOrder();
    for (const i of order) {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        loaded.add(i);
        schedule();
      };
      if (i === order[0]) {
        image.onerror = () => {
          fallback = true;
          load();
        };
      }
      image.src = frameUrl(set, i);
      images[i] = image;
    }
  }

  addEventListener('resize', () => {
    const next = frameSetFor(innerWidth, innerHeight, devicePixelRatio);
    if (next !== set) {
      set = next;
      load();
    }
    schedule();
  });

  load();
  return {
    show(progress: number) {
      if (still || fallback) return;
      const next = frameIndex(progress);
      if (next === wanted) return;
      wanted = next;
      schedule();
    },
  };
}
