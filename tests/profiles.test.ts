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

  it('flags a rating above 5', () => {
    const reviewPlatforms = [{ id: 'yelp', rating: 6, reviews: 10 }];
    expect(() => parseProfile({ ...base, reviewPlatforms }, 'broken')).toThrow(/reviewPlatforms/);
  });

  it('flags the same platform listed twice', () => {
    const reviewPlatforms = [
      { id: 'yelp', rating: 4, reviews: 10 },
      { id: 'yelp', rating: 4, reviews: 10 },
    ];
    expect(() => parseProfile({ ...base, reviewPlatforms }, 'broken')).toThrow(/appears once/);
  });
});
