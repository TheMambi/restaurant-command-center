import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseProfile, type Profile } from '../src/schema';
import { overallScore, scoreBreakdown } from '../src/scoring';

const dir = join(import.meta.dirname, '..', 'profiles');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const load = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8')) as unknown;

// Made-up places the sample profiles may use. A new sample restaurant adds its city here.
const inventedCities = ['Riverton', 'City'];

function realDataSigns(profile: Profile): string[] {
  const signs: string[] = [];
  if (!profile.restaurant.website.endsWith('.example')) signs.push(`website "${profile.restaurant.website}" does not end in .example`);
  if (!inventedCities.includes(profile.restaurant.city)) signs.push(`city "${profile.restaurant.city}" is not on the list of invented places`);
  return signs;
}

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

  // The flag above is one the profile sets on itself. These two are not: a website under the
  // reserved .example ending cannot belong to a real business, and the places are made up.
  it.each(files)('%s has an invented website and place', (file) => {
    expect(realDataSigns(parseProfile(load(file), file))).toEqual([]);
  });

  it('a copy with a real-looking website and city is caught, whatever its sample flag says', () => {
    const copy = parseProfile(load('brasa-taqueria.json'), 'copy');
    const real = { ...copy, restaurant: { ...copy.restaurant, website: 'example.com', city: 'Springfield' } };
    expect(real.sampleData).toBe(true);
    expect(realDataSigns(real)).toHaveLength(2);
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

  it('names a misspelled key instead of dropping it', () => {
    const reviewPlatforms = [{ id: 'google', rating: 4.7, reviews: 640, photo: 12 }];
    expect(() => parseProfile({ ...base, reviewPlatforms }, 'broken')).toThrow(/reviewPlatforms\.0: .*"photo"/);
    expect(() => parseProfile({ ...base, somethingElse: 1 }, 'broken')).toThrow(/"somethingElse"/);
    expect(() => parseProfile({ ...base, restaurant: { ...(base.restaurant as object), phone: '555' } }, 'broken')).toThrow(/restaurant: .*"phone"/);
    expect(() => parseProfile({ ...base, competitor: { ...(base.competitor as object), socialPlatforms: [{ id: 'x', followers: 1, post: 2 }] } }, 'broken')).toThrow(/"post"/);
  });

  // Built here so no script-scheme address sits in the repo as a literal.
  const scheme = ['java', 'script'].join('');
  it.each([`${scheme}:alert(document.domain)`, 'data:text/html,hello', 'https://osterialumen.example', 'osterialumen.example/menu', 'osteria lumen.example'])(
    'flags a website that is not a bare host name: %s',
    (website) => {
      const broken = { ...base, restaurant: { ...(base.restaurant as object), website } };
      expect(() => parseProfile(broken, 'broken')).toThrow(/restaurant\.website/);
    },
  );

  it('flags text too long to be a name or a sentence', () => {
    const broken = { ...base, restaurant: { ...(base.restaurant as object), name: 'a'.repeat(1_000_000) } };
    expect(() => parseProfile(broken, 'broken')).toThrow(/restaurant\.name/);
  });

  it.each([['a right-to-left override', '\u202e'], ['a null character', '\u0000'], ['a zero-width space', '\u200b'], ['a line break', '\n']])(
    'flags text holding %s',
    (_what, ch) => {
      const broken = { ...base, restaurant: { ...(base.restaurant as object), name: `Osteria${ch}Lumen` } };
      expect(() => parseProfile(broken, 'broken')).toThrow(/restaurant\.name/);
    },
  );

  it('flags a list far longer than a report can show', () => {
    const row = { label: 'Business claimed and verified', status: 'pass' };
    const checklists = { ...(base.checklists as object), googleProfile: Array.from({ length: 20_000 }, () => row) };
    expect(() => parseProfile({ ...base, checklists }, 'broken')).toThrow(/checklists\.googleProfile/);
  });

  it('flags a reply time longer than a month', () => {
    const socialPlatforms = [{ id: 'instagram', followers: 3100, posts: 10, engagementRate: 1, responseHours: 1e308 }];
    expect(() => parseProfile({ ...base, socialPlatforms }, 'broken')).toThrow(/socialPlatforms\.0\.responseHours/);
  });

  it('flags a milestone dated after the report', () => {
    const milestones = [{ month: '9999-12', title: 'Far ahead', note: 'Not yet' }];
    expect(() => parseProfile({ ...base, milestones }, 'broken')).toThrow(/milestones\.0\.month/);
    const thisMonth = [{ month: base.asOf, title: 'Now', note: 'Fine' }];
    expect(() => parseProfile({ ...base, milestones: thisMonth }, 'fine')).not.toThrow();
  });
});
