// @vitest-environment jsdom
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import axe from 'axe-core';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { monthLabel, platformName } from '../src/format';
import { beatOpacity, decodeWindow, endFrameFallbackUrl, FRAME_COUNT, fitRect, frameIndex, frameSetFor, framesToKeep, frameUrl, framingFor, loadOrder, memoryBudget, mountSequence, nearestLoaded } from '../src/landing/sequence';
import { loadProfiles } from '../src/profiles';
import { historySeries } from '../src/render/history';
import { doFirst, trendSentence } from '../src/render/overview';
import { overallScore, scoreBreakdown, scoreLabel, type ScoreKey } from '../src/scoring';
import { scoreLabels, scoreWeights } from '../src/scoring.config';

const root = join(import.meta.dirname, '..');
const page = readFileSync(join(root, 'index.html'), 'utf8');

describe('the scroll sequence helpers', () => {
  it('maps scroll progress to a frame and holds the ends', () => {
    expect(frameIndex(0)).toBe(0);
    expect(frameIndex(1)).toBe(FRAME_COUNT - 1);
    expect(frameIndex(-0.5)).toBe(0);
    expect(frameIndex(2)).toBe(FRAME_COUNT - 1);
    expect(frameIndex(0.5)).toBe(Math.round(0.5 * (FRAME_COUNT - 1)));
  });

  it('loads the first and last frames first, then every frame exactly once', () => {
    const order = loadOrder();
    expect(order.slice(0, 2)).toEqual([0, FRAME_COUNT - 1]);
    expect(new Set(order).size).toBe(FRAME_COUNT);
    expect(order).toHaveLength(FRAME_COUNT);
  });

  it('draws the closest frame that has loaded', () => {
    expect(nearestLoaded(10, new Set([0, 16, 119]))).toBe(16);
    expect(nearestLoaded(5, new Set([0, 16]))).toBe(0);
    expect(nearestLoaded(5, new Set())).toBeUndefined();
  });

  it('keeps a decode window around the wanted frame, reaching further ahead', () => {
    const forward = decodeWindow(50, 1, 9);
    expect(forward[0]).toBe(50);
    expect(forward).toHaveLength(9);
    expect(new Set(forward).size).toBe(9);
    expect(forward.filter((i) => i > 50).length).toBeGreaterThan(forward.filter((i) => i < 50).length * 2);
    expect(decodeWindow(50, -1, 9).filter((i) => i < 50).length).toBeGreaterThan(5);
    // At the ends it stays inside the sequence and still fills up from behind.
    const end = decodeWindow(FRAME_COUNT - 1, 1, 6);
    expect(end).toHaveLength(6);
    expect(Math.max(...end)).toBe(FRAME_COUNT - 1);
    expect(decodeWindow(0, -1, 4).every((i) => i >= 0)).toBe(true);
    expect(decodeWindow(7, 1, 1)).toEqual([7]);
  });

  it('covers landscape screens and fits portrait screens to the width, sitting at the bottom', () => {
    const wide = fitRect(1920, 1080, 1440, 900, 'wide');
    expect(wide.h).toBeCloseTo(900);
    expect(wide.w).toBeCloseTo(1600);
    expect(wide.x).toBeLessThan(0);
    const tall = fitRect(1080, 1350, 390, 844, 'tall');
    expect(tall.w).toBeCloseTo(390);
    expect(tall.y + tall.h).toBeCloseTo(844);
    const squarish = fitRect(1080, 1350, 1024, 768, 'tall');
    expect(squarish.h).toBeCloseTo(768);
    expect(squarish.x + squarish.w).toBeCloseTo(1024);
    expect(fitRect(0, 0, 100, 100, 'wide').w).toBe(0);
  });

  it('fits tall frames into the space the words leave, down to a floor', () => {
    // Portrait: words take the top 500px, so the frame fits the 524px below them.
    const below = fitRect(1080, 1350, 768, 1024, 'tall', { left: 0, top: 500, bar: 80 });
    expect(below.y).toBeGreaterThanOrEqual(500);
    expect(below.y + below.h).toBeCloseTo(1024);
    expect(below.h).toBeCloseTo(524);
    // Landscape: the column ends at 420px, so the frame stays right of it.
    const beside = fitRect(1080, 1350, 1024, 768, 'tall', { left: 420, top: 0, bar: 0 });
    expect(beside.x).toBeGreaterThanOrEqual(420);
    expect(beside.x + beside.w).toBeCloseTo(1024);
    // Words that fill the screen leave the frame its floor instead of nothing.
    expect(fitRect(1080, 1350, 390, 844, 'tall', { left: 0, top: 844, bar: 80 }).h).toBeCloseTo(844 * 0.4);
    // Wide frames still cover the screen whatever the words take.
    expect(fitRect(1920, 1080, 1440, 900, 'wide', { left: 600, top: 600, bar: 80 }).h).toBeCloseTo(900);
  });

  it('fits wide frames to the height on screens wider than the frame, so nothing is cropped', () => {
    const ultrawide = fitRect(1920, 1080, 2560, 1080, 'wide');
    expect(ultrawide).toEqual({ x: 320, y: 0, w: 1920, h: 1080 });
    const sideways = fitRect(1920, 1080, 844, 390, 'wide');
    expect(sideways.h).toBe(390);
    expect(sideways.x + sideways.w / 2).toBeCloseTo(422);
    // Exactly the frame's shape: cover and fit agree.
    expect(fitRect(1920, 1080, 1920, 1080, 'wide')).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });

  it('keeps fitted frames under the pinned bar', () => {
    // A phone held sideways with a 56px bar: the frame starts below it and fills the rest.
    const sideways = fitRect(1920, 1080, 844, 390, 'wide', { left: 0, top: 0, bar: 56 });
    expect(sideways.y).toBe(56);
    expect(sideways.y + sideways.h).toBeCloseTo(390);
    // A 4:3 screen with the tall frame beside the words: centred in the height under the bar.
    const beside = fitRect(1080, 1350, 1024, 768, 'tall', { left: 420, top: 0, bar: 80 });
    expect(beside.y).toBeGreaterThanOrEqual(80);
    expect(beside.y + beside.h).toBeLessThanOrEqual(768);
  });

  it('picks the framing from the screen shape', () => {
    expect(framingFor(1440, 900)).toBe('wide');
    expect(framingFor(1024, 768)).toBe('tall');
    expect(framingFor(390, 844)).toBe('tall');
    expect(framingFor(100, 0)).toBe('tall');
    expect(frameUrl('wide', 0)).toBe('/hero/wide/001.avif');
    expect(frameSetFor(1920, 1080, 1)).toBe('wide');
    expect(frameSetFor(1440, 900, 2)).toBe('wide-hd');
    // A retina window that needs 2556 pixels across gets the lighter 2560 set.
    expect(frameSetFor(1224, 719, 2)).toBe('wide');
    expect(frameSetFor(3840, 2160, 1)).toBe('wide-hd');
    expect(frameSetFor(390, 844, 3)).toBe('tall');
    expect(endFrameFallbackUrl('tall')).toBe('/hero/tall/end.webp');
  });

  it('gives a phone held sideways the tall frames, not the desktop ones', () => {
    expect(frameSetFor(844, 390, 3)).toBe('tall');
    expect(frameSetFor(932, 430, 3)).toBe('tall');
    expect(frameSetFor(667, 375, 2)).toBe('tall');
    // A small laptop window or a tablet on its side is taller than a phone and keeps the wide frames.
    expect(frameSetFor(960, 600, 2)).toBe('wide');
    expect(frameSetFor(1280, 720, 1)).toBe('wide');
  });

  it('holds fewer decoded frames on phones and on devices short of memory', () => {
    const MB = 1024 * 1024;
    expect(memoryBudget('tall')).toBe(64 * MB);
    expect(memoryBudget('tall', 8)).toBe(64 * MB);
    expect(memoryBudget('wide')).toBe(256 * MB);
    expect(memoryBudget('wide-hd', 8)).toBe(256 * MB);
    expect(memoryBudget('wide', 4)).toBe(64 * MB);
    // A phone's 1080 by 1350 frames: eleven of them, 61 MB, where it used to hold 24.
    const onPhone = framesToKeep(1080, 1350, memoryBudget('tall'));
    expect(onPhone).toBe(11);
    expect(onPhone * 1080 * 1350 * 4).toBeLessThanOrEqual(64 * MB);
    // Desktops are as before, and no budget takes the window under six or over 24.
    expect(framesToKeep(2560, 1440, memoryBudget('wide', 8))).toBe(18);
    expect(framesToKeep(3200, 1800, memoryBudget('wide-hd'))).toBe(11);
    expect(framesToKeep(2560, 1440, memoryBudget('wide', 4))).toBe(6);
    expect(framesToKeep(64, 64, memoryBudget('wide'))).toBe(24);
    expect(framesToKeep(0, 0, memoryBudget('tall'))).toBe(24);
  });

  it('fades each block of words in and out inside its range', () => {
    expect(beatOpacity(0, 0, 0.12)).toBe(1);
    expect(beatOpacity(0.12, 0, 0.12)).toBe(0);
    expect(beatOpacity(0.3, 0.2, 0.42)).toBe(1);
    expect(beatOpacity(0.2, 0.2, 0.42)).toBe(0);
    expect(beatOpacity(1, 0.82, 1)).toBe(1);
  });

  it('never shows two blocks of words at once on the landing page', () => {
    const ranges = [...page.matchAll(/data-from="([\d.]+)" data-to="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    expect(ranges.length).toBe(4);
    for (let p = 0; p <= 1; p += 0.0025) {
      const visible = ranges.filter(([from, to]) => beatOpacity(p, from, to) > 0.01);
      expect(visible.length, `at ${p.toFixed(4)}`).toBeLessThanOrEqual(1);
    }
  });
});

describe('the scroll sequence when the screen changes shape', () => {
  it('calls off the requests for the frame set it replaces', () => {
    const asked: { url: string; signal: AbortSignal }[] = [];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      asked.push({ url, signal: init!.signal! });
      return new Promise<Response>(() => {});
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const canvas = { getContext: () => ({}), clientWidth: 0, clientHeight: 0 } as unknown as HTMLCanvasElement;
    const screen = { width: innerWidth, height: innerHeight };
    try {
      Object.assign(window, { innerWidth: 390, innerHeight: 844 });
      mountSequence(canvas, 'black', false, () => ({ left: 0, top: 0, bar: 0 }));
      const upright = [...asked];
      expect(upright.length).toBeGreaterThan(1);
      expect(upright.every((r) => r.url.startsWith('/hero/tall/') && !r.signal.aborted)).toBe(true);

      Object.assign(window, { innerWidth: 1440, innerHeight: 900 });
      dispatchEvent(new Event('resize'));
      const after = asked.slice(upright.length);
      expect(upright.every((r) => r.signal.aborted)).toBe(true);
      expect(after.length).toBeGreaterThan(1);
      expect(after.every((r) => r.url.startsWith('/hero/wide/') && !r.signal.aborted)).toBe(true);
    } finally {
      Object.assign(window, { innerWidth: screen.width, innerHeight: screen.height });
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    }
  });
});

describe('the rendered frames', () => {
  for (const set of ['wide', 'wide-hd', 'tall'] as const) {
    it(`has all ${FRAME_COUNT} frames in the ${set} set`, () => {
      const dir = join(root, 'public', 'hero', set);
      expect(existsSync(dir)).toBe(true);
      const files = readdirSync(dir).filter((f) => f.endsWith('.avif')).sort();
      expect(files).toHaveLength(FRAME_COUNT);
      expect(files[0]).toBe('001.avif');
      expect(files.at(-1)).toBe(`${FRAME_COUNT}.avif`);
      expect(existsSync(join(dir, 'end.webp'))).toBe(true);
    });
  }

  it('were drawn from the figures the app computes for the sample shown', () => {
    const p = loadProfiles().find((x) => x.slug === 'brasa-taqueria')!;
    const b = scoreBreakdown(p);
    const score = overallScore(b);
    const series = historySeries(p, score);
    const expected = {
      restaurant: p.restaurant.name,
      asOf: monthLabel(p.asOf),
      score,
      label: scoreLabel(score),
      trend: trendSentence(series),
      parts: (Object.keys(scoreWeights) as ScoreKey[]).map((k) => ({ label: scoreLabels[k], weight: scoreWeights[k], score: Math.round(b[k]) })),
      actions: doFirst(p.opportunities).map((o) => ({ title: o.title, time: o.time, cost: o.cost })),
      actionCount: p.opportunities.length,
      ratings: p.reviewPlatforms.map((r) => ({ platform: platformName[r.id], rating: r.rating, reviews: r.reviews })),
      history: series.map((s) => ({ month: monthLabel(s.month, 'short'), score: s.overallScore })),
    };
    const baked = JSON.parse(readFileSync(join(root, 'hero-sequence', 'content.json'), 'utf8'));
    // If this fails, update hero-sequence/content.json and re-render the frames (hero-sequence/README.md).
    expect(baked).toEqual(expected);
  });
});

describe('links from before the landing page', () => {
  const script = readFileSync(join(root, 'public', 'boot.js'), 'utf8');
  const run = (search: string) => {
    const replace = vi.fn();
    const storage = { getItem: () => null };
    new Function('location', 'localStorage', 'matchMedia', 'document', script)(
      { pathname: '/', search, replace },
      storage,
      () => ({ matches: false }),
      { documentElement: { dataset: {} } },
    );
    return replace;
  };

  it('sends an old report address on to the report', () => {
    expect(run('?r=brasa-taqueria&tab=competitor')).toHaveBeenCalledWith('/report/?r=brasa-taqueria&tab=competitor');
    expect(run('?tab=reviews')).toHaveBeenCalledWith('/report/?tab=reviews');
  });

  it('leaves the landing page alone otherwise', () => {
    expect(run('')).not.toHaveBeenCalled();
    expect(run('?utm_source=x')).not.toHaveBeenCalled();
  });
});

describe('the landing page in a browser-like DOM', () => {
  beforeAll(async () => {
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    // jsdom has no canvas; answering null is what the hero already handles, without jsdom's warning.
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    document.body.innerHTML = page.slice(page.indexOf('<body class="landing">') + 22, page.indexOf('<script type="module"'));
    document.body.className = 'landing';
    await import('../src/landing');
  });

  it('opts the hero in to the pinned stage from the script', () => {
    expect(document.getElementById('hero')!.classList.contains('is-live')).toBe(true);
  });

  it('lists the six score parts with their weights from the config', () => {
    const items = [...document.querySelectorAll('#parts-list .part')];
    expect(items).toHaveLength(Object.keys(scoreWeights).length);
    expect(items.map((li) => li.querySelector('.part-name')?.textContent)).toEqual(Object.values(scoreLabels));
    const shares = items.map((li) => Number(li.querySelector('.part-figure')?.textContent));
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('links each sample restaurant to its report with its computed score', () => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>('#samples-list a')];
    const profiles = loadProfiles();
    expect(links).toHaveLength(profiles.length);
    profiles.forEach((p, i) => {
      expect(links[i]!.getAttribute('href')).toBe(`/report/?r=${p.slug}`);
      expect(links[i]!.querySelector('.sample-figure')?.textContent).toBe(String(overallScore(scoreBreakdown(p))));
    });
  });

  it('has no accessibility violations axe can find', async () => {
    const result = await axe.run(document.body, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      // Colour contrast needs a real layout engine; it is checked in a browser instead.
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

describe('the landing page before its script runs', () => {
  const css = readFileSync(join(root, 'src', 'styles', 'landing.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  // The default once piled the four blocks of words into one grid cell over 4.4 screens of empty
  // stage, readable only after the script had run. The pinned stage is now something the script
  // asks for.
  it('arrives with no state on the hero and pins it only under is-live', () => {
    expect(page).toMatch(/<section class="hero" id="hero"/);
    const pinning = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, , body]) => /440vh|position: sticky|grid-area: 1 \/ 1/.test(body!));
    expect(pinning.length).toBeGreaterThanOrEqual(3);
    for (const [, selector] of pinning) expect(selector!.trim()).toContain('.is-live');
  });

  it('says what is missing where scripts are off', () => {
    expect(page).toMatch(/<div class="beat beat-intro"(?:(?!<\/div>)[\s\S])*<noscript><p class="script-note">/);
    for (const list of ['parts-list', 'samples-list']) {
      expect(page, list).toMatch(new RegExp(`id="${list}"></ul>\\s*<noscript><p class="script-note">`));
    }
  });
});

describe('the landing page when a profile fails to load', () => {
  it('still sets up the hero and says what went wrong', async () => {
    vi.resetModules();
    vi.doMock('../src/profiles', () => ({
      loadProfiles: () => {
        throw new Error('That profile is broken');
      },
    }));
    document.body.innerHTML = page.slice(page.indexOf('<body class="landing">') + 22, page.indexOf('<script type="module"'));
    await expect(import('../src/landing')).rejects.toThrow('That profile is broken');
    vi.doUnmock('../src/profiles');
    expect(document.getElementById('hero')!.classList.contains('is-live')).toBe(true);
    expect(document.querySelector('.load-error')?.textContent).toContain('That profile is broken');
  });
});

describe('styles that survive the production build', () => {
  // When a rule lists -webkit-backdrop-filter after backdrop-filter, the CSS minifier keeps only the
  // prefixed copy and Chrome and Firefox lose the blur. Write the unprefixed property alone.
  it('never writes the prefixed backdrop filter by hand', () => {
    for (const file of ['app.css', 'landing.css', 'tokens.css']) {
      const css = readFileSync(join(root, 'src', 'styles', file), 'utf8');
      expect(css, file).not.toMatch(/-webkit-backdrop-filter/);
    }
  });
});

describe('phone layout rules in the report stylesheet', () => {
  // A new media block once landed inside the 40rem block and silently moved its rules to 23rem.
  it('keeps the phone rules under the 40rem breakpoint', () => {
    const css = readFileSync(join(root, 'src', 'styles', 'app.css'), 'utf8');
    const blockOf = (selector: string): string | undefined => {
      const at = css.indexOf(`${selector} {`);
      let depth = 0;
      for (let i = at; i >= 0; i--) {
        if (css[i] === '}') depth++;
        if (css[i] === '{') {
          if (depth === 0) return css.slice(css.lastIndexOf('@media', i), i).trim();
          depth--;
        }
      }
      return undefined;
    };
    for (const selector of ['  .hide-narrow', '  .stat dd', '  .matrix', '  .milestones li']) {
      expect(blockOf(selector), selector).toBe('@media (max-width: 40rem)');
    }
  });
});
