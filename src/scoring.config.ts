export const scoreWeights = {
  reputation: 25,
  reviewVolume: 15,
  googleProfile: 20,
  website: 15,
  social: 10,
  responsiveness: 15,
} as const;

export const scoreTargets = {
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

// Score bands for the label under the overall score, highest first.
export const scoreBands = [
  { min: 80, label: 'Strong presence' },
  { min: 60, label: 'Room for growth' },
  { min: 40, label: 'Needs attention' },
  { min: 0, label: 'Urgent work needed' },
] as const;

// Differences smaller than these count as "Even" in the competitor table.
export const evenThresholds = { stars: 0.05, percent: 5 } as const;
