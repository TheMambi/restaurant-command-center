import { describe, expect, it } from 'vitest';
import { gapText } from '../src/render/competitor';
import { checklistScore, overallScore, scoreBreakdown, weightedRating } from '../src/scoring';
import { parseProfile } from '../src/schema';
import osteria from '../profiles/osteria-lumen.json';
import { html } from '../src/html';

describe('checklistScore', () => {
  it('returns 0 for an empty list instead of dividing by zero', () => {
    expect(checklistScore([])).toBe(0);
  });
  it('counts partial items as half', () => {
    expect(
      checklistScore([
        { label: 'a', status: 'pass' },
        { label: 'b', status: 'partial' },
        { label: 'c', status: 'fail' },
        { label: 'd', status: 'fail' },
      ]),
    ).toBe(37.5);
  });
});

describe('weightedRating', () => {
  it('weights platforms by review count', () => {
    const rating = weightedRating([
      { id: 'google', rating: 4, reviews: 900 },
      { id: 'yelp', rating: 5, reviews: 100 },
    ]);
    expect(rating).toBeCloseTo(4.1);
  });
  it('returns 0 when there are no reviews', () => {
    expect(weightedRating([{ id: 'google', rating: 0, reviews: 0 }])).toBe(0);
  });
});

describe('overallScore', () => {
  it('is 100 when every part is 100 and 0 when every part is 0', () => {
    const all = (n: number) => ({ reputation: n, reviewVolume: n, googleProfile: n, website: n, social: n, responsiveness: n });
    expect(overallScore(all(100))).toBe(100);
    expect(overallScore(all(0))).toBe(0);
  });
});

describe('gapText', () => {
  it('handles a competitor with zero of something', () => {
    expect(gapText(10, 0, 'count').text).toBe('Ahead');
    expect(gapText(0, 0, 'count').text).toBe('Even');
  });
  it('shows percentages for counts and stars for ratings', () => {
    expect(gapText(50, 100, 'count')).toEqual({ text: '−50%', css: 'gap-behind' });
    expect(gapText(4.5, 4.2, 'rating')).toEqual({ text: '+0.3 stars', css: 'gap-ahead' });
  });
  it('says when data is missing', () => {
    expect(gapText(undefined, 5, 'count').text).toBe('No data');
  });
});

describe('html', () => {
  it('escapes profile text so it cannot inject markup', () => {
    expect(html`<p>${'<img src=x onerror=alert(1)>'}</p>`.value).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  });
});

describe('scoreBreakdown', () => {
  it('never goes below 0 when ratings average under 1 star', () => {
    const p = parseProfile(osteria, 'osteria');
    const low = { ...p, reviewPlatforms: [{ id: 'yelp' as const, rating: 0.5, reviews: 10 }] };
    expect(scoreBreakdown(low).reputation).toBe(0);
  });
});
