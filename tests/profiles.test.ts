import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseProfile } from '../src/schema';
import { overallScore, scoreBreakdown } from '../src/scoring';

const dir = join(import.meta.dirname, '..', 'profiles');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const load = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as unknown;

describe('every profile in /profiles', () => {
  it.each(files)('%s passes the schema', (file) => {
    expect(() => parseProfile(load(file), file)).not.toThrow();
  });

  it.each(files)('%s produces a score from 0 to 100', (file) => {
    const score = overallScore(scoreBreakdown(parseProfile(load(file), file)));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it.each(files)('%s is labeled as sample data', (file) => {
    expect(parseProfile(load(file), file).sampleData).toBe(true);
  });

  it('slugs are unique', () => {
    const slugs = files.map((f) => parseProfile(load(f), f).slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('schema rejects broken profiles', () => {
  const base = load('osteria-lumen.json') as Record<string, unknown>;

  it('flags star counts that do not match the Google review total', () => {
    const broken = { ...base, googleStars: { five: 1, four: 0, three: 0, two: 0, one: 0 } };
    expect(() => parseProfile(broken, 'broken')).toThrow(/Star counts add up to 1/);
  });

  it('flags a history that includes the current month', () => {
    const history = [...(base.history as object[]), { month: base.asOf, overallScore: 1, totalReviews: 1, googleRating: 1, instagramFollowers: 1 }];
    expect(() => parseProfile({ ...base, history }, 'broken')).toThrow(/past months only/);
  });

  it('flags a "Fix soon" gap that no action fixes', () => {
    const summary = { ...(base.summary as object), criticalGaps: ['Something nobody plans to fix'] };
    expect(() => parseProfile({ ...base, summary }, 'broken')).toThrow(/No action due now or soon fixes/);
  });

  it('flags a rating above 5', () => {
    const reviewPlatforms = [{ id: 'yelp', rating: 6, reviews: 10 }];
    expect(() => parseProfile({ ...base, reviewPlatforms }, 'broken')).toThrow(/reviewPlatforms/);
  });

  it('flags a skipped month and names it', () => {
    const history = (base.history as { month: string }[]).filter((h) => ['2026-05', '2026-06', '2026-09'].includes(h.month));
    expect(history).toHaveLength(3);
    expect(() => parseProfile({ ...base, history }, 'broken')).toThrow(/History skips 2026-07 to 2026-08/);
  });

  it('flags a history that stops short of last month', () => {
    const history = (base.history as object[]).slice(0, -1);
    expect(() => parseProfile({ ...base, history }, 'broken')).toThrow(/History skips 2026-09\b/);
  });

  it('flags a recorded score that is not a whole number', () => {
    const history = (base.history as object[]).map((h, i) => (i === 0 ? { ...h, overallScore: 46.9 } : h));
    expect(() => parseProfile({ ...base, history }, 'broken')).toThrow(/history\.0\.overallScore/);
  });

  it.each(['restaurant', 'competitor'])('flags a %s opened after the report year', (who) => {
    const broken = { ...base, [who]: { ...(base[who] as object), yearOpened: 2031 } };
    expect(() => parseProfile(broken, 'broken')).toThrow(new RegExp(`${who}\\.yearOpened: .*2031`));
    const thisYear = { ...base, [who]: { ...(base[who] as object), yearOpened: 2026 } };
    expect(() => parseProfile(thisYear, 'fine')).not.toThrow();
  });

  it('flags the same platform listed twice', () => {
    const reviewPlatforms = [
      { id: 'yelp', rating: 4, reviews: 10 },
      { id: 'yelp', rating: 4, reviews: 10 },
    ];
    expect(() => parseProfile({ ...base, reviewPlatforms }, 'broken')).toThrow(/appears once/);
  });
});
