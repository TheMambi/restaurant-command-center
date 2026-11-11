import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { html, SafeHtml } from '../src/html';
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
const pages = [read('index.html'), read('report', 'index.html')];

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
      expect(read('src', file), file).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/);
    }
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
    expect(html`${new SafeHtml('<i>ok</i>')}`.value).toBe('<i>ok</i>');
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
});
