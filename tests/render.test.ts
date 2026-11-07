import { describe, expect, it } from 'vitest';
import { parseProfile } from '../src/schema';
import { doFirst, fallingReviews, renderOverview } from '../src/render/overview';
import { yearsGap } from '../src/render/competitor';
import { chartRange, lineChart } from '../src/render/line-chart';
import { monthsBetween, renderHistory, historySeries } from '../src/render/history';
import { comparisonRows } from '../src/render/competitor';
import { share } from '../src/render/shared';
import { overallScore, scoreBreakdown } from '../src/scoring';
import osteria from '../profiles/osteria-lumen.json';
import template from '../profiles/_template.json';

const p = parseProfile(osteria, 'osteria');

describe('doFirst', () => {
  it('puts high-impact, low-effort actions due now at the top', () => {
    const picks = doFirst(p.opportunities);
    expect(picks).toHaveLength(3);
    expect(picks.slice(0, 2).every((o) => o.impact === 'high' && o.effort === 'low')).toBe(true);
  });
  it('returns fewer when the profile has fewer', () => {
    expect(doFirst(p.opportunities.slice(0, 1))).toHaveLength(1);
  });
});

describe('chartRange', () => {
  it('rounds to tidy gridlines around the data', () => {
    expect(chartRange([1540, 1663])).toEqual({ lo: 1500, hi: 1700, step: 50 });
  });
  it('respects a fixed range', () => {
    expect(chartRange([55, 64], 0, 100)).toEqual({ lo: 0, hi: 100, step: 25 });
  });
  it('copes with a flat series', () => {
    const r = chartRange([10, 10]);
    expect(r.hi).toBeGreaterThan(r.lo);
  });
});

describe('lineChart', () => {
  it('notes when the axis does not start at zero', () => {
    expect(lineChart({ labels: ['a', 'b'], values: [1540, 1663], title: 't', format: String }).value).toMatch(/Axis starts at 1500/);
  });
  it('shows an empty state with no values', () => {
    expect(lineChart({ labels: [], values: [], title: 't', format: String }).value).toMatch(/No history yet/);
  });
});

describe('helpers', () => {
  it('counts months between two YYYY-MM values', () => {
    expect(monthsBetween('2026-05', '2026-10')).toBe(5);
    expect(monthsBetween('2025-11', '2026-02')).toBe(3);
  });
  it('formats shares without dividing by zero', () => {
    expect(share(1, 4)).toBe('25%');
    expect(share(1, 0)).toBe('0%');
  });
  it('lists every platform either restaurant uses', () => {
    expect(comparisonRows(p).map((r) => r.metric)).toContain('Facebook followers');
  });
});

describe('rendering', () => {
  it('renders the template profile without throwing', () => {
    const t = parseProfile(template, 'template');
    const b = scoreBreakdown(t);
    expect(renderOverview(t, overallScore(b), b, historySeries(t, overallScore(b))).value).toMatch(/Do these first/);
    expect(renderHistory(t, historySeries(t, overallScore(b))).value).toMatch(/Progress/);
  });
  it('never shows raw field values on screen', () => {
    const b = scoreBreakdown(p);
    const series = historySeries(p, overallScore(b));
    const out = renderOverview(p, overallScore(b), b, series).value + renderHistory(p, series).value;
    expect(out).not.toMatch(/>\s*(high|low|medium|now|soon|later|pass|fail|partial|drop-off)\s*</);
  });
});

describe('more tabs', () => {
  it('competitor tab names a platform only one side uses', async () => {
    const { renderCompetitor } = await import('../src/render/competitor');
    const brasa = parseProfile((await import('../profiles/brasa-taqueria.json')).default, 'brasa');
    expect(renderCompetitor(brasa).value).toMatch(/Only El Comal Norte is listed/);
  });
  it('website and social tabs show demand and potential as words', async () => {
    const { renderWebsite } = await import('../src/render/website');
    const { renderSocial } = await import('../src/render/social');
    const out = renderWebsite(p).value + renderSocial(p).value;
    expect(out).toMatch(/>High</);
    expect(out).not.toMatch(/out of 100/);
  });
});

describe('insights', () => {
  it.each(['osteria-lumen', 'brasa-taqueria'])('%s: gap fixes rank ahead of later work, and the ticket carries at least one', async (slug) => {
    const profile = parseProfile((await import(`../profiles/${slug}.json`)).default, slug);
    const ranked = doFirst(profile.opportunities, profile.opportunities.length);
    const lastFix = Math.max(...ranked.map((o, i) => (o.fixesGap ? i : -1)));
    const firstLater = ranked.findIndex((o) => o.horizon === 'later' && !o.fixesGap);
    if (firstLater >= 0) expect(lastFix).toBeLessThan(firstLater);
    expect(doFirst(profile.opportunities).some((o) => o.fixesGap)).toBe(true);
  });
  it('notices when new reviews shrink month after month', () => {
    const points = [100, 130, 155, 175, 190].map((totalReviews, i) => ({ month: `2026-0${i + 1}`, overallScore: 50, totalReviews, googleRating: 4, instagramFollowers: 0 }));
    expect(fallingReviews(points)).toBe('New reviews have dropped each month since February 2026.');
    const steady = [100, 110, 120, 130].map((totalReviews, i) => ({ month: `2026-0${i + 1}`, overallScore: 50, totalReviews, googleRating: 4, instagramFollowers: 0 }));
    expect(fallingReviews(steady)).toBeUndefined();
  });
  it('describes the difference in years open', () => {
    expect(yearsGap(17, 12)).toBe('5 years longer');
    expect(yearsGap(7, 15)).toBe('8 years newer');
    expect(yearsGap(3, 3)).toBe('Same');
  });
});
