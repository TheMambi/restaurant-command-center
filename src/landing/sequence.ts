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

// The 3200 set only where the 2560 set would be stretched. Bigger frames cost decode time and
// memory on every scrub, so a retina laptop window that needs 2560 or less gets the 2560 set.
export function frameSetFor(width: number, height: number, dpr: number): FrameSet {
  if (framingFor(width, height) === 'tall') return 'tall';
  const needed = Math.max(width, (height * 16) / 9) * Math.min(2, dpr || 1);
  return needed > 2600 ? 'wide-hd' : 'wide';
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

export function nearestLoaded(index: number, loaded: { has(index: number): boolean }, count = FRAME_COUNT): number | undefined {
  for (let d = 0; d < count; d++) {
    if (loaded.has(index - d)) return index - d;
    if (loaded.has(index + d)) return index + d;
  }
  return undefined;
}

// The frames worth keeping decoded around the wanted one, nearest first, reaching further in the
// direction of travel (about three ahead for each one behind).
export function decodeWindow(wanted: number, direction: 1 | -1, size: number, count = FRAME_COUNT): number[] {
  const out = [wanted];
  for (let k = 1; out.length < size && k < count * 2; k++) {
    const ahead = wanted + k * direction;
    if (ahead >= 0 && ahead < count) out.push(ahead);
    const behind = wanted - (k / 3) * direction;
    if (k % 3 === 0 && behind >= 0 && behind < count && out.length < size) out.push(behind);
  }
  return out.slice(0, size);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Space the words take (a column on the left of a landscape screen, a block on top of a portrait
// one) and the height of the pinned bar over the top of the stage.
export interface Reserve {
  left: number;
  top: number;
  bar: number;
}

// Wide frames cover screens up to their own shape and crop mostly from the empty left side, where
// the words sit. On wider screens (ultrawide, a phone held sideways) they fit the height under the
// bar instead and sit centred like the page's column, so the ticket and the top plates stay whole.
// Tall frames fit into the space the words leave: right of the column and under the bar on a
// landscape screen, below the block on a portrait one. A floor keeps the frame from shrinking to
// nothing.
export function fitRect(imageW: number, imageH: number, boxW: number, boxH: number, framing: Framing, reserve: Reserve = { left: 0, top: 0, bar: 0 }): Rect {
  if (imageW <= 0 || imageH <= 0) return { x: 0, y: 0, w: 0, h: 0 };
  if (framing === 'wide') {
    if (boxW * imageH > imageW * boxH) {
      const h = boxH - reserve.bar;
      const w = (imageW * h) / imageH;
      return { x: (boxW - w) / 2, y: reserve.bar, w, h };
    }
    const s = Math.max(boxW / imageW, boxH / imageH);
    const w = imageW * s;
    const h = imageH * s;
    return { x: (boxW - w) * 0.75, y: (boxH - h) * 0.45, w, h };
  }
  if (boxW > boxH) {
    const room = Math.max(boxW * 0.45, boxW - reserve.left);
    const below = boxH - reserve.bar;
    const s = Math.min(room / imageW, below / imageH);
    return { x: boxW - imageW * s, y: reserve.bar + (below - imageH * s) / 2, w: imageW * s, h: imageH * s };
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
  let wanted = still ? FRAME_COUNT - 1 : 0;
  let direction: 1 | -1 = 1;
  let fallback = false;
  let reserved = reserve();

  // Frames arrive as compressed files and are decoded off the main thread into ImageBitmaps before
  // they can be drawn. Drawing an AVIF straight from an <img> decodes it at draw time, which cost
  // 50 to 130 ms per new frame on a retina MacBook, so the hero ran at about 15 frames a second. A
  // decoded bitmap draws inside a 60 Hz frame. All 120 decoded would take over a gigabyte, so only a
  // window around the wanted frame stays decoded, sized from a memory budget.
  const MEMORY_BUDGET = 256 * 1024 * 1024;
  const MAX_DECODING = 3;
  let files: (Blob | undefined)[] = [];
  let ready = new Map<number, ImageBitmap>();
  let decoding = new Set<number>();
  let keep = 8;

  function draw(): void {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    const index = nearestLoaded(wanted, ready);
    // With nothing decoded yet, leave the canvas as it is rather than blank it.
    if (index === undefined) return;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx!.fillStyle = background;
    ctx!.fillRect(0, 0, w, h);
    const frame = ready.get(index)!;
    const r = fitRect(frame.width, frame.height, w, h, framingOf(set), { left: reserved.left * dpr, top: reserved.top * dpr, bar: reserved.bar * dpr });
    ctx!.drawImage(frame, r.x, r.y, r.w, r.h);
    extend(frame, r, w, h);
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
  function extend(frame: ImageBitmap, r: Rect, w: number, h: number): void {
    if (!stripCtx) return;
    const iw = frame.width;
    const ih = frame.height;
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
      stripCtx.drawImage(frame, ...src, 0, 0, strip.width, strip.height);
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

  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };

  // A load or decode started for an earlier frame set (before a resize) is dropped when it lands.
  let generation = 0;

  // Keep the window around the wanted frame decoded: close what fell out of it, then start decodes
  // for the nearest missing frames whose files have arrived.
  function pump(): void {
    const window = decodeWindow(wanted, direction, still || fallback ? 1 : keep);
    const inWindow = new Set(window);
    for (const [i, frame] of ready) {
      if (!inWindow.has(i)) {
        frame.close();
        ready.delete(i);
      }
    }
    for (const i of window) {
      if (decoding.size >= MAX_DECODING) break;
      const file = files[i];
      if (!file || ready.has(i) || decoding.has(i)) continue;
      const mine = generation;
      decoding.add(i);
      createImageBitmap(file).then(
        (frame) => {
          if (mine !== generation) return frame.close();
          decoding.delete(i);
          keep = Math.max(6, Math.min(24, Math.floor(MEMORY_BUDGET / (frame.width * frame.height * 4))));
          ready.set(i, frame);
          schedule();
          pump();
        },
        () => {
          if (mine !== generation) return;
          decoding.delete(i);
          if (i === wanted && ready.size === 0) failOver();
        },
      );
    }
  }

  function failOver(): void {
    if (fallback) return;
    fallback = true;
    load();
  }

  function fetchFrame(i: number, url: string, onFail?: () => void): void {
    const mine = generation;
    fetch(url)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(`${response.status} ${url}`))))
      .then(
        (file) => {
          if (mine !== generation) return;
          files[i] = file;
          pump();
        },
        () => {
          if (mine === generation) onFail?.();
        },
      );
  }

  // The first and last frames and every sixteenth come at once; that is enough to scrub with. The
  // rest wait for the first scroll, so a visitor who never scrolls downloads about a tenth.
  function load(): void {
    generation++;
    files = [];
    for (const frame of ready.values()) frame.close();
    ready = new Map();
    decoding = new Set();
    if (fallback) {
      wanted = FRAME_COUNT - 1;
      fetchFrame(FRAME_COUNT - 1, endFrameFallbackUrl(set));
      return;
    }
    const order = still ? [FRAME_COUNT - 1] : loadOrder();
    const eager = order.filter((i) => i % 16 === 0 || i === FRAME_COUNT - 1);
    const rest = order.filter((i) => !eager.includes(i));
    eager.forEach((i, n) => fetchFrame(i, frameUrl(set, i), n === 0 ? failOver : undefined));
    if (rest.length === 0) return;
    const mine = generation;
    const more = () => {
      if (mine === generation) for (const i of rest) fetchFrame(i, frameUrl(set, i));
    };
    if (scrollY > 0) more();
    else addEventListener('scroll', more, { once: true, passive: true });
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
      direction = next > wanted ? 1 : -1;
      wanted = next;
      schedule();
      pump();
    },
  };
}
