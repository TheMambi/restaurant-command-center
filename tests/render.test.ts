import { describe, expect, it } from 'vitest';
import { counted, hours, monthsBetween, yearsOpen } from '../src/format';
import { parseProfile, type Profile } from '../src/schema';
import { doFirst, fallingReviews, renderOverview, whyFirst } from '../src/render/overview';
import { yearsGap } from '../src/render/competitor';
import { barChart, chartRange, lineChart } from '../src/render/line-chart';
import { change, renderHistory, historySeries } from '../src/render/history';
import { comparisonRows, renderCompetitor, standing } from '../src/render/competitor';
import { renderGoogle } from '../src/render/google';
import { renderOpportunities } from '../src/render/opportunities';
import { renderReviews } from '../src/render/reviews';
import { share } from '../src/render/shared';
import { renderSocial } from '../src/render/social';
import { renderWebsite } from '../src/render/website';
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
    expect(yearsGap(17, 12)).toBe('5 years more');
    expect(yearsGap(7, 15)).toBe('8 years fewer');
    expect(yearsGap(3, 3)).toBe('Same');
  });
});

// Each tab as a reader sees it: tags dropped, so drawing coordinates can't pass for figures.
const words = (markup: string): string => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const overviewOf = (profile: Profile): string => {
  const b = scoreBreakdown(profile);
  return renderOverview(profile, overallScore(b), b, historySeries(profile, overallScore(b))).value;
};
const everyTab = (profile: Profile): string => {
  const series = historySeries(profile, overallScore(scoreBreakdown(profile)));
  const rest = [renderGoogle(profile), renderWebsite(profile), renderSocial(profile), renderReviews(profile), renderCompetitor(profile), renderOpportunities(profile), renderHistory(profile, series)];
  return overviewOf(profile) + rest.map((tab) => tab.value).join('');
};
const axisTicks = (chart: string): string[] => [...chart.matchAll(/text-anchor="end">([^<]*)</g)].map((m) => m[1]!);
const noStars = { five: 0, four: 0, three: 0, two: 0, one: 0 };

describe('the competitor table and figures nobody counted', () => {
  const t = parseProfile(template, 'template');

  it('leaves photos out when only one side has a count, and out of the tally', () => {
    expect(comparisonRows(t).map((r) => r.metric)).toEqual(['Google rating', 'Google reviews', 'Instagram followers']);
    expect(standing(t)).toEqual({ ahead: 1, behind: 1, total: 3 });
    const googleRows = renderCompetitor(t).value.split('<tr>').filter((row) => row.includes('Google'));
    expect(googleRows).toHaveLength(2);
    for (const row of googleRows) expect(row).not.toMatch(/Not listed|is listed/);
  });

  it('does the same when only the competitor counted photos', () => {
    const before = standing(p);
    const mine = { ...p, reviewPlatforms: p.reviewPlatforms.map(({ photos: _photos, ...r }) => r) };
    const theirs = { ...p, competitor: { ...p.competitor, reviewPlatforms: p.competitor.reviewPlatforms.map(({ photos: _photos, ...r }) => r) } };
    for (const profile of [mine, theirs]) {
      expect(comparisonRows(profile).map((r) => r.metric).join()).not.toMatch(/photos/);
      // Osteria Lumen was ahead on Yelp photos and behind on Google photos; both rows go, and nothing else moves.
      expect(standing(profile)).toEqual({ ahead: before.ahead - 1, behind: before.behind - 1, total: before.total - 2 });
    }
  });
});

describe('a platform with no reviews yet', () => {
  const withGoogleAt = (rating: number) =>
    parseProfile(
      {
        ...osteria,
        reviewPlatforms: osteria.reviewPlatforms.map((r) => (r.id === 'google' ? { ...r, rating, reviews: 0 } : r)),
        googleStars: noStars,
        history: osteria.history.map((h) => ({ ...h, totalReviews: h.totalReviews - 640 })),
      },
      'no google reviews',
    );

  it.each([0, 5])('shows no rating for it on any tab, whatever rating the profile holds (%d)', (rating) => {
    const quiet = withGoogleAt(rating);
    const seen = words(everyTab(quiet));
    expect(seen).not.toMatch(/0\.0 out of 5|Below what diners expect|\b0\.0\b|5\.0/);
    expect(words(renderGoogle(quiet).value)).toMatch(/Rating No reviews yet/);
    expect(words(renderHistory(quiet, historySeries(quiet, 50)).value)).not.toMatch(/Google rating/);
    const metrics = comparisonRows(quiet).map((r) => r.metric);
    expect(metrics).toContain('Google reviews');
    expect(metrics).not.toContain('Google rating');
    const googleRow = overviewOf(quiet).split('<tr>').find((row) => row.includes('>Google<'))!;
    expect(words(googleRow)).toMatch(/Google No reviews yet 0 310/);
    expect(googleRow).toContain('meter is-empty');
  });

  it('says so in place of an overall rating when no platform has any', () => {
    const fresh = parseProfile(
      { ...template, reviewPlatforms: [{ id: 'google', rating: 0, reviews: 0 }], googleStars: noStars, history: template.history.map((h) => ({ ...h, totalReviews: 0 })) },
      'no reviews',
    );
    const seen = words(overviewOf(fresh) + renderReviews(fresh).value);
    expect(seen).toMatch(/No reviews on any platform yet/);
    expect(seen).not.toMatch(/\b0\.0\b|stars across/);
  });
});

describe('counts of one and none', () => {
  const t = parseProfile(template, 'template');

  it('words reply times to the minute', () => {
    expect(hours(1 / 60)).toBe('1 minute');
    expect(hours(0.995)).toBe('1 hour');
    expect(hours(0.004)).toBe('under a minute');
    expect(hours(0.5)).toBe('30 minutes');
    expect(hours(1)).toBe('1 hour');
    expect(hours(2.5)).toBe('2.5 hours');
  });

  it('gives a count its noun in the singular for exactly one', () => {
    expect(counted(1, 'review')).toBe('1 review');
    expect(counted(0, 'review')).toBe('0 reviews');
    expect(counted(1180, 'review')).toBe('1,180 reviews');
  });

  it('describes a restaurant opened in the report year', () => {
    expect(yearsOpen(0)).toBe('Opened this year');
    expect(yearsOpen(1)).toBe('Open 1 year');
    expect(yearsOpen(7)).toBe('Open 7 years');
  });

  it('writes a change with its thousands separator and the right noun', () => {
    expect(change(1840, '')).toBe('Up 1,840');
    expect(change(-0.2, ' stars', 1)).toBe('Down 0.2 stars');
    expect(change(1, ' stars', 1)).toBe('Up 1.0 stars');
    expect(change(0.04, ' stars', 1)).toBe('No change');
    const upOne = words(renderHistory(t, historySeries(t, t.history[0]!.overallScore + 1)).value);
    expect(upOne).toMatch(/Up 1 point since/);
  });

  it('introduces a single action as one action', () => {
    const seen = words(overviewOf(t));
    expect(seen).not.toMatch(/1 of 1 actions|all 1 next steps/);
    expect(seen).toMatch(/The one action recommended so far\. See the next step/);
    const three = { ...p, opportunities: p.opportunities.slice(0, 3) };
    expect(words(overviewOf(three))).toMatch(/All 3 actions, ranked by impact, effort and what is due\. See all 3 next steps/);
    expect(words(overviewOf(p))).toMatch(/3 of 8 actions, ranked by impact, effort and what is due\. See all 8 next steps/);
  });

  it('writes one review and one photo in the singular', () => {
    const one = parseProfile(
      { ...template, reviewPlatforms: [{ id: 'google', rating: 5, reviews: 1, photos: 1 }], googleStars: { ...noStars, five: 1 }, history: template.history.map((h) => ({ ...h, totalReviews: 1 })) },
      'one review',
    );
    const seen = words(overviewOf(one) + renderGoogle(one).value);
    expect(seen).not.toMatch(/\b1 (reviews|photos)\b/);
    expect(seen).toMatch(/stars across 1 review,/);
    expect(seen).toMatch(/1 photo from diners/);
  });
});

describe('names that keep their capitals', () => {
  const t = parseProfile(template, 'template');

  it('writes the parts of the score as they read inside a sentence', () => {
    const seen = words(overviewOf(t));
    expect(seen).toMatch(/Strongest area: Google profile\. Weakest: review replies\./);
    expect(seen).not.toMatch(/google profile/);
  });

  it('quotes a gap as the profile wrote it, on the ticket and under Next steps', () => {
    const action = { ...p.opportunities[0]!, fixesGap: 'Google listing has no hours' };
    expect(whyFirst(action)).toMatch(/Fixes: Google listing has no hours\.$/);
    const tiktok = { ...p, opportunities: [{ ...p.opportunities[0]!, fixesGap: 'TikTok account is empty' }] };
    expect(words(renderOpportunities(tiktok).value)).toMatch(/Fixes: TikTok account is empty\./);
    expect(words(overviewOf(tiktok))).toMatch(/Fixes: TikTok account is empty\./);
  });
});

describe('whole things on a whole-number axis', () => {
  it('never steps by a fraction when asked for whole numbers', () => {
    expect(chartRange([0, 1, 2, 1], 0, undefined, true).step).toBe(1);
    expect(chartRange([0, 10], 0, undefined, true)).toEqual({ lo: 0, hi: 10, step: 5 });
    expect(chartRange([0, 55], 0, undefined, true)).toEqual(chartRange([0, 55], 0));
  });

  it('labels the new-reviews bars in whole reviews', () => {
    const bars = (values: number[]) => axisTicks(barChart({ labels: values.map(String), values, title: 't', format: String }).value);
    expect(bars([0, 0, 0])).toEqual(['0', '1']);
    expect(bars([1, 1, 1, 1])).toEqual(['0', '1']);
    expect(bars([1, 2, 1])).toEqual(['0', '1', '2']);
    expect(bars([10])).toEqual(['0', '5', '10']);
  });
});

describe('the score and its parts', () => {
  it('says the parts are rounded and the total is not built from the rounded figures', () => {
    expect(words(overviewOf(parseProfile(template, 'template')))).toMatch(/Each part is shown rounded\. The total is worked out before rounding/);
  });
});
