import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { html, setHtml, type SafeHtml } from '../src/html';
import { loadProfiles } from '../src/profiles';
import { renderCompetitor } from '../src/render/competitor';
import { renderGoogle } from '../src/render/google';
import { historySeries, renderHistory } from '../src/render/history';
import { renderOpportunities } from '../src/render/opportunities';
import { renderOverview } from '../src/render/overview';
import { renderReviews } from '../src/render/reviews';
import { renderSocial } from '../src/render/social';
import { renderWebsite } from '../src/render/website';
import { DIAL_LENGTH, dial, radar, segments, sparkline } from '../src/render/visuals';
import { overallScore, scoreBreakdown } from '../src/scoring';

const root = join(import.meta.dirname, '..');
const read = (...path: string[]) => readFileSync(join(root, ...path), 'utf8');
const pages = [read('index.html'), read('report', 'index.html'), read('404.html')];

const headers = (JSON.parse(read('vercel.json')) as { headers: { source: string; headers: { key: string; value: string }[] }[] }).headers;
const siteWide = headers.find((h) => h.source === '/(.*)')!.headers;
const csp = siteWide.find((h) => h.key === 'Content-Security-Policy')!.value;

describe('the Content-Security-Policy', () => {
  it('allows scripts and styles from the site alone', () => {
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|\*/);
  });

  it('refuses framing and limits markup to the one Trusted Types policy', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("require-trusted-types-for 'script'");
    expect(csp).toContain('trusted-types rcc');
  });

  it('comes with the other hardening headers', () => {
    const keys = siteWide.map((h) => h.key);
    for (const key of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy']) {
      expect(keys).toContain(key);
    }
  });
});

describe('pages the policy can serve', () => {
  it('have no inline scripts, inline styles or event handlers', () => {
    for (const page of pages) {
      expect(page).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/);
      expect(page).not.toMatch(/<style[\s>]/);
      expect(page).not.toMatch(/\sstyle=/);
      expect(page).not.toMatch(/\son[a-z]+=/);
    }
  });

  it('render every tab of every profile without a style attribute or a script', () => {
    for (const p of loadProfiles()) {
      const breakdown = scoreBreakdown(p);
      const score = overallScore(breakdown);
      const series = historySeries(p, score);
      const out = [
        renderOverview(p, score, breakdown, series),
        renderGoogle(p),
        renderWebsite(p),
        renderSocial(p),
        renderReviews(p),
        renderCompetitor(p),
        renderOpportunities(p),
        renderHistory(p, series),
      ]
        .map((r) => r.value)
        .join('');
      expect(out).not.toMatch(/\sstyle=/);
      expect(out).not.toMatch(/<script|javascript:|\son[a-z]+=/i);
    }
  });

  it('write markup only through setHtml', () => {
    const files = readdirSync(join(root, 'src'), { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts') && f !== 'html.ts');
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      expect(read('src', file), file).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|new SafeHtml/);
    }
  });

  // Profiles are checked when the site is built (vite.config.ts). A value imported from the schema
  // would put the whole validator back into the pages; types cost nothing.
  it('keep the profile validator out of the browser', () => {
    const files = readdirSync(join(root, 'src'), { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts') && f !== 'schema.ts');
    for (const file of files) {
      const source = read('src', file);
      expect(source, file).not.toMatch(/import\s+(?!type\b)[^;]*from\s+'(\.\.?\/)+schema'/);
      expect(source, file).not.toMatch(/from\s+'zod'/);
    }
  });
});

describe('licences and addresses', () => {
  const manifest = JSON.parse(read('package.json')) as { license: string; dependencies: Record<string, string> };

  it('names every dependency in the third-party notices', () => {
    const notices = read('public', 'THIRD-PARTY-NOTICES.txt');
    for (const name of Object.keys(manifest.dependencies)) expect(notices, name).toContain(name);
    expect(notices).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(read('index.html')).toContain('href="/THIRD-PARTY-NOTICES.txt"');
  });

  it('states one licence identifier everywhere', () => {
    expect(manifest.license).toBe('AGPL-3.0-or-later');
    expect((JSON.parse(read('hero-sequence', 'package.json')) as { license: string }).license).toBe(manifest.license);
    expect(read('README.md')).toContain('AGPL--3.0--or--later');
    expect(read('index.html')).toContain(manifest.license);
    for (const file of ['README.md', 'index.html']) expect(read(file).replace(/AGPL-{1,2}3\.0-{1,2}or-{1,2}later/g, ''), file).not.toMatch(/AGPL-{1,2}3\.0/);
  });

  // The production address is typed by hand in the share tags, the canonical links and the README.
  it('writes the site address the same way in every place, with a canonical link on each page', () => {
    const origins = [read('index.html'), read('report', 'index.html'), read('README.md')].flatMap((text) => text.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g) ?? []);
    expect(origins.length).toBeGreaterThan(6);
    expect(new Set(origins).size).toBe(1);
    expect(read('index.html')).toContain(`<link rel="canonical" href="${origins[0]}/">`);
    expect(read('report', 'index.html')).toContain(`<link rel="canonical" href="${origins[0]}/report/">`);
  });

  it('has a not-found page that leads home', () => {
    expect(read('404.html')).toContain('href="/"');
    expect(read('.vercelignore')).toContain('!/404.html');
  });

  it('does not say the demo reads live data', () => {
    expect(read('index.html')).not.toMatch(/It reads/);
    expect(read('src', 'render', 'history.ts')).not.toMatch(/calculated live/);
  });
});

describe('the html tag', () => {
  it('escapes text inside attributes and nested lists', () => {
    const hostile = `"><img src=x onerror=alert(1)>`;
    const out = html`<a title="${hostile}">${[hostile, html`<b>${hostile}</b>`]}</a>`.value;
    expect(out).not.toContain('<img');
    expect(out).toContain('&quot;&gt;&lt;img');
  });

  it('passes its own output through untouched', () => {
    expect(html`${html`<i>ok</i>`}`.value).toBe('<i>ok</i>');
  });

  it('is the only way to make markup setHtml will write', () => {
    const target = { innerHTML: '' } as Element;
    const lookalike = { value: '<img>', toString: () => '<img>' };
    // @ts-expect-error an object shaped like SafeHtml is not one
    expect(() => setHtml(target, lookalike)).toThrow(/html tag/);
    // @ts-expect-error nor is a plain string
    expect(() => setHtml(target, '<img>')).toThrow(/html tag/);
    expect(() => setHtml(target, [html`<b>ok</b>`, lookalike as unknown as SafeHtml])).toThrow(/html tag/);
    expect(target.innerHTML).toBe('');
    setHtml(target, html`<b>ok</b>`);
    expect(target.innerHTML).toBe('<b>ok</b>');
  });
});

describe('drawings', () => {
  const offset = (score: number) => Number(/stroke-dashoffset="([\d.]+)"/.exec(dial(score, 'x').value)![1]);

  it('fill the plate rim in step with the score and hold at the ends', () => {
    expect(offset(0)).toBeCloseTo(DIAL_LENGTH, 0);
    expect(offset(100)).toBe(0);
    expect(offset(50)).toBeCloseTo(DIAL_LENGTH / 2, 0);
    expect(offset(140)).toBe(0);
    expect(offset(-5)).toBeCloseTo(DIAL_LENGTH, 0);
  });

  it('matches the ring length the stylesheet animates from', () => {
    expect(read('src', 'styles', 'app.css')).toContain(`stroke-dashoffset: ${DIAL_LENGTH.toFixed(1)};`);
  });

  it('draw nothing for an empty split bar instead of dividing by zero', () => {
    expect(segments([{ count: 0, css: 'is-good', word: 'done' }], 'None').value).toBe('');
    expect(segments([{ count: 3, css: 'is-good', word: 'done' }, { count: 1, css: 'is-bad', word: 'missing' }], '3 of 4 done').value).toContain('1 missing');
  });

  it('leave zero counts out of a split bar\'s key', () => {
    const out = segments([{ count: 2, css: 'is-good', word: 'ahead' }, { count: 0, css: 'is-even', word: 'even' }], 'x').value;
    expect(out).toContain('2 ahead');
    expect(out).not.toContain('0 even');
  });

  it('put each part of the wheel on its own spoke and keep values inside the rim', () => {
    const parts = ['A', 'B', 'C', 'D', 'E', 'F'].map((label, i) => ({ label, value: i === 0 ? 250 : i * 20 }));
    const out = radar(parts).value;
    expect(out.match(/class="radar-dot"/g)).toHaveLength(6);
    // The first spoke points straight up; an over-range value stops at the rim, 98 above the centre.
    expect(out).toMatch(/class="radar-dot" cx="210\.0" cy="52\.0"/);
    expect(radar(parts.slice(0, 2)).value).toBe('');
  });

  it('draw a sparkline for a flat series without dividing by zero, and nothing for one point', () => {
    expect(sparkline([5, 5, 5]).value).not.toMatch(/NaN|Infinity/);
    expect(sparkline([5]).value).toBe('');
  });

  it('name colours in tokens.css alone', () => {
    for (const file of ['app.css', 'landing.css']) {
      const css = read('src', 'styles', file).replace(/\/\*[\s\S]*?\*\//g, '');
      expect(css, file).not.toMatch(/oklch\(|rgba?\(|hsla?\(|#[0-9a-f]{3,8}\b/i);
    }
  });
});
