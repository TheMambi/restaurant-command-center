import type { CheckItem, Profile, ReviewPlatform } from './schema';
import { scoreBands, scoreTargets, scoreWeights } from './scoring.config';

export type ScoreKey = keyof typeof scoreWeights;
export type ScoreBreakdown = Record<ScoreKey, number>;

const ratio = (value: number, target: number) => (target > 0 ? Math.min(1, value / target) : 0);

export function checklistScore(items: CheckItem[]): number {
  if (items.length === 0) return 0;
  const points = items.reduce((sum, item) => sum + (item.status === 'pass' ? 1 : item.status === 'partial' ? 0.5 : 0), 0);
  return (points / items.length) * 100;
}

export function totalReviews(platforms: Pick<ReviewPlatform, 'reviews'>[]): number {
  return platforms.reduce((sum, p) => sum + p.reviews, 0);
}

// Weighted by review count so a 5.0 from 12 reviews can't outweigh a 4.2 from 900.
export function weightedRating(platforms: ReviewPlatform[]): number {
  const reviews = totalReviews(platforms);
  if (reviews === 0) return 0;
  return platforms.reduce((sum, p) => sum + p.rating * p.reviews, 0) / reviews;
}

export function scoreBreakdown(profile: Profile): ScoreBreakdown {
  const rating = weightedRating(profile.reviewPlatforms);
  const mobilePoints = { good: 1, fair: 0.5, poor: 0 } as const;
  const mobile = profile.website.mobile;
  const mobileScore = mobile.length === 0 ? 0 : (mobile.reduce((s, m) => s + mobilePoints[m.rating], 0) / mobile.length) * 100;
  const socials = profile.socialPlatforms;
  const social =
    socials.length === 0
      ? 0
      : (socials.reduce(
          (s, p) =>
            s +
            0.5 * ratio(p.followers, scoreTargets.followersPerPlatform) +
            0.5 * ratio(p.engagementRate, scoreTargets.engagementRatePercent),
          0,
        ) /
          socials.length) *
        100;

  return {
    // A 1-star average maps to 0 and a 5-star average to 100.
    reputation: Math.max(0, ((rating - 1) / 4) * 100),
    reviewVolume: ratio(totalReviews(profile.reviewPlatforms), scoreTargets.totalReviews) * 100,
    googleProfile: checklistScore(profile.checklists.googleProfile),
    website: (checklistScore(profile.checklists.technicalSeo) + mobileScore) / 2,
    social,
    responsiveness: checklistScore(profile.checklists.reviewResponse),
  };
}

export function overallScore(breakdown: ScoreBreakdown): number {
  const keys = Object.keys(scoreWeights) as ScoreKey[];
  const weightSum = keys.reduce((s, k) => s + scoreWeights[k], 0);
  if (weightSum <= 0) throw new Error('Score weights must add up to more than zero');
  return Math.round(keys.reduce((s, k) => s + scoreWeights[k] * breakdown[k], 0) / weightSum);
}

export function scoreLabel(score: number): string {
  return scoreBands.find((band) => score >= band.min)?.label ?? scoreBands.at(-1)!.label;
}
