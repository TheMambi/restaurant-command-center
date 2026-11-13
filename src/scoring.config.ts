export const scoreWeights = {
  reputation: 25,
  reviewVolume: 15,
  googleProfile: 20,
  website: 15,
  social: 10,
  responsiveness: 15,
} as const;

export const scoreTargets = {
  // Most restaurants sit between these averages, so the ratings part spreads across that band:
  // a 3.5 average scores 0, a 4.8 or better scores 100.
  ratingFloor: 3.5,
  ratingCeiling: 4.8,
  // A neighborhood restaurant with this many reviews across platforms scores full marks for volume.
  totalReviews: 1500,
  followersPerPlatform: 5000,
  engagementRatePercent: 5,
} as const;

export const scoreLabels: Record<keyof typeof scoreWeights, string> = {
  reputation: 'Ratings',
  reviewVolume: 'Review volume',
  googleProfile: 'Google profile',
  website: 'Website and search',
  social: 'Social media',
  responsiveness: 'Review replies',
};

// The same names inside a sentence, where only a brand keeps its capital.
export const scoreLabelsInSentence: Record<keyof typeof scoreWeights, string> = {
  reputation: 'ratings',
  reviewVolume: 'review volume',
  googleProfile: 'Google profile',
  website: 'website and search',
  social: 'social media',
  responsiveness: 'review replies',
};

// Score bands for the label under the overall score, highest first.
export const scoreBands = [
  { min: 80, label: 'Strong presence' },
  { min: 60, label: 'Room for growth' },
  { min: 40, label: 'Needs attention' },
  { min: 0, label: 'Urgent work needed' },
] as const;

// Differences smaller than these count as "Even" in the competitor table.
// From three times the competitor's count, "times as many" reads better than a percentage.
export const evenThresholds = { stars: 0.05, percent: 5, timesFrom: 3 } as const;

// Words beside the Google rating, highest band first.
export const ratingWords = [
  { min: 4.5, label: 'Excellent' },
  { min: 4.0, label: 'Good, with room to grow' },
  { min: 0, label: 'Below what diners expect' },
] as const;

// How "Do these first" ranks actions: impact points, minus a cost for bigger jobs, plus a nudge for anything
// due this month and a larger one for anything that closes a gap listed under "Fix soon".
export const actionRanking = {
  impact: { high: 5, medium: 2, low: 1 },
  effortPenalty: { low: 0, high: 1 },
  dueNowBonus: 1,
  fixesGapBonus: 2,
} as const;
