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

// Space the words take: a column on the left of a landscape screen, a block on top of a portrait one.
export interface Reserve {
  left: number;
  top: number;
}

// Wide frames cover the screen and crop mostly from the empty left side, where the words sit.
// Tall frames fit into the space the words leave: right of the column on a landscape screen, below
// the block on a portrait one. A floor keeps the frame from shrinking to nothing.
export function fitRect(imageW: number, imageH: number, boxW: number, boxH: number, framing: Framing, reserve: Reserve = { left: 0, top: 0 }): Rect {
  if (imageW <= 0 || imageH <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  if (framing === 'wide') {
    const s = Math.max(boxW / imageW, boxH / imageH);
    const w = imageW * s;
    const h = imageH * s;
    return { x: (boxW - w) * 0.75, y: (boxH - h) * 0.45, w, h };
  }
  if (boxW > boxH) {
    const room = Math.max(boxW * 0.45, boxW - reserve.left);
    const s = Math.min(room / imageW, boxH / imageH);
    return { x: boxW - imageW * s, y: (boxH - imageH * s) / 2, w: imageW * s, h: imageH * s };
  }
  const room = Math.max(boxH * 0.4, boxH - reserve.top);
  const s = Math.min(boxW / imageW, room / imageH);
  return { x: (boxW - imageW * s) / 2, y: boxH - imageH * s, w: imageW * s, h: imageH * s };
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

export function mountSequence(canvas: HTMLCanvasElement, background: string, still: boolean, reserve: () => Reserve): Sequence {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { show() {} };
  let set: FrameSet = frameSetFor(innerWidth, innerHeight, devicePixelRatio);
  let images: HTMLImageElement[] = [];
  let loaded = new Set<number>();
  let wanted = still ? FRAME_COUNT - 1 : 0;
  let fallback = false;
  let reserved = reserve();

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
    const r = fitRect(image.naturalWidth, image.naturalHeight, w, h, framingOf(set), { left: reserved.left * dpr, top: reserved.top * dpr });
    ctx!.drawImage(image, r.x, r.y, r.w, r.h);
    extend(image, r, w, h);
  }

  // The stage colour at any opacity. Canvas gradients fade through black when a stop is
  // 'transparent', so every stop is the stage colour itself.
  const stageAt = (() => {
    const probe = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
    if (!probe) return (a: number) => (a > 0.5 ? background : 'transparent');
    probe.fillStyle = background;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;
  })();

  // Where a fitted frame stops short of the canvas, its outer edge (averaged, so the counter's
  // grain doesn't streak) carries on outward and eases into the stage. The light pool falls off
  // instead of ending in a seam, and nothing is painted over the frame itself: the end frame's
  // plates run close to its sides.
  const strip = document.createElement('canvas');
  const stripCtx = strip.getContext('2d');
  function extend(image: HTMLImageElement, r: Rect, w: number, h: number): void {
    if (!stripCtx) return;
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const reach = r.w * 0.35;
    const fade = (x0: number, y0: number, x1: number, y1: number) => {
      const g = ctx!.createLinearGradient(x0, y0, x1, y1);
      for (const t of [0, 0.25, 0.5, 0.75, 1]) g.addColorStop(t, stageAt(t * t * (3 - 2 * t)));
      return g;
    };
    // One side at a time: copy a few pixels of the frame's edge into a short strip, stretch it over
    // the gap, then lay the fade from the frame's edge out to the canvas edge.
    const side = (vertical: boolean, src: [number, number, number, number], gap: [number, number, number, number], from: number, to: number) => {
      const [gx, gy, gw, gh] = gap;
      if (Math.min(gw, gh) < 2) return;
      strip.width = vertical ? 1 : 48;
      strip.height = vertical ? 48 : 1;
      stripCtx.imageSmoothingQuality = 'high';
      stripCtx.drawImage(image, ...src, 0, 0, strip.width, strip.height);
      ctx!.drawImage(strip, gx, gy, gw, gh);
      const end = from + Math.sign(to - from) * Math.min(Math.abs(to - from), reach);
      ctx!.fillStyle = vertical ? fade(from, 0, end, 0) : fade(0, from, 0, end);
      ctx!.fillRect(gx, gy, gw, gh);
    };
    // Each gap overlaps the frame by a pixel so no hairline shows at fractional edges.
    side(true, [0, 0, 4, ih], [0, r.y, r.x + 1, r.h], r.x, 0);
    side(true, [iw - 4, 0, 4, ih], [r.x + r.w - 1, r.y, w - r.x - r.w + 1, r.h], r.x + r.w, w);
    side(false, [0, 0, iw, 4], [r.x, 0, r.w, r.y + 1], r.y, 0);
    side(false, [0, ih - 4, iw, 4], [r.x, r.y + r.h - 1, r.w, h - r.y - r.h + 1], r.y + r.h, h);
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

  // The words reflow when the fonts arrive and on every resize; measure them again then.
  void document.fonts?.ready.then(() => {
    reserved = reserve();
    schedule();
  });
  addEventListener('resize', () => {
    reserved = reserve();
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
