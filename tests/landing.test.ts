// @vitest-environment jsdom
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import axe from 'axe-core';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { monthLabel, platformName } from '../src/format';
import { beatOpacity, endFrameFallbackUrl, FRAME_COUNT, fitRect, frameIndex, frameUrl, framingFor, loadOrder, nearestLoaded } from '../src/landing/sequence';
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

  it('picks the framing from the screen shape', () => {
    expect(framingFor(1440, 900)).toBe('wide');
    expect(framingFor(1024, 768)).toBe('tall');
    expect(framingFor(390, 844)).toBe('tall');
    expect(framingFor(100, 0)).toBe('tall');
    expect(frameUrl('wide', 0)).toBe('/hero/wide/001.avif');
    expect(endFrameFallbackUrl('tall')).toBe('/hero/tall/end.webp');
  });

  it('fades each block of words in and out around its range', () => {
    expect(beatOpacity(0, 0, 0.12)).toBe(1);
    expect(beatOpacity(0.3, 0, 0.12)).toBe(0);
    expect(beatOpacity(0.3, 0.2, 0.42)).toBe(1);
    expect(beatOpacity(0.1, 0.2, 0.42)).toBe(0);
    expect(beatOpacity(1, 0.82, 1)).toBe(1);
  });
});

describe('the rendered frames', () => {
  for (const framing of ['wide', 'tall'] as const) {
    it(`has all ${FRAME_COUNT} ${framing} frames`, () => {
      const dir = join(root, 'public', 'hero', framing);
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
  const script = page.slice(page.indexOf('<script>') + 8, page.indexOf('</script>'));
  const run = (search: string) => {
    const replace = vi.fn();
    const storage = { getItem: () => null };
    new Function('location', 'localStorage', 'matchMedia', 'document', script)(
      { search, replace },
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
    document.body.innerHTML = page.slice(page.indexOf('<body class="landing">') + 22, page.indexOf('<script type="module"'));
    document.body.className = 'landing';
    await import('../src/landing');
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
    for (const selector of ['  .hide-narrow', '  .stat + .stat', '  .matrix', '  .milestones li']) {
      expect(blockOf(selector), selector).toBe('@media (max-width: 40rem)');
    }
  });
});
