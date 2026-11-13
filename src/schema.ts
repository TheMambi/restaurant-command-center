import { z } from 'zod';

// Zod speeds up parsing by compiling code while the page runs. The site's Content-Security-Policy
// refuses that, so parsing stays interpreted and the browser has nothing to block.
z.config({ jitless: true });

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
const percent = z.number().min(0).max(100);
const rating = z.number().min(0).max(5);
const count = z.number().int().min(0);
const text = z.string().trim().min(1);
const level = z.enum(['high', 'medium', 'low']);

export const reviewPlatformIds = ['google', 'yelp', 'tripadvisor'] as const;
export const socialPlatformIds = ['instagram', 'tiktok', 'x', 'facebook'] as const;

const reviewPlatform = z.object({
  id: z.enum(reviewPlatformIds),
  rating,
  reviews: count,
  photos: count.optional(),
});

const socialPlatform = z.object({
  id: z.enum(socialPlatformIds),
  followers: count,
  posts: count,
  engagementRate: percent,
  responseHours: z.number().positive().optional(),
});

const checkItem = z.object({
  label: text,
  status: z.enum(['pass', 'partial', 'fail']),
});

const uniqueIds = <T extends { id: string }>(items: T[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

const competitor = z.object({
  name: text,
  yearOpened: z.number().int().min(1800),
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']),
  reviewPlatforms: z.array(reviewPlatform).refine(uniqueIds, 'Each platform appears once'),
  socialPlatforms: z.array(socialPlatform.pick({ id: true, followers: true })).refine(uniqueIds, 'Each platform appears once'),
});

export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty! - fy!) * 12 + (tm! - fm!);
}

function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y! * 12 + m! - 1 + n;
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export const profileSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    sampleData: z.boolean(),
    asOf: month,
    restaurant: z.object({
      name: text,
      cuisine: text,
      neighborhood: text,
      city: text,
      address: text,
      website: text,
      yearOpened: z.number().int().min(1800),
      priceRange: z.enum(['$', '$$', '$$$', '$$$$']),
    }),
    reviewPlatforms: z.array(reviewPlatform).min(1).refine(uniqueIds, 'Each platform appears once'),
    socialPlatforms: z.array(socialPlatform).refine(uniqueIds, 'Each platform appears once'),
    googleStars: z.object({ five: count, four: count, three: count, two: count, one: count }),
    summary: z.object({
      strengths: z.array(text).min(1),
      improvements: z.array(text).min(1),
      criticalGaps: z.array(text),
    }),
    checklists: z.object({
      googleProfile: z.array(checkItem).min(1),
      technicalSeo: z.array(checkItem).min(1),
      reviewResponse: z.array(checkItem).min(1),
      socialContent: z.array(checkItem),
    }),
    website: z.object({
      mobile: z.array(z.object({ label: text, rating: z.enum(['good', 'fair', 'poor']) })).min(1),
      bookingFlow: z.array(z.object({ label: text, state: z.enum(['ok', 'warning', 'drop-off']) })).min(2),
      bookingRecommendation: text,
      keywords: z.array(
        z.object({
          phrase: text,
          demand: level,
          intent: text,
          covered: z.boolean(),
        }),
      ),
    }),
    sampleSignals: z.array(
      z.object({ tone: z.enum(['positive', 'negative']), platform: text, message: text }),
    ),
    growthIdeas: z.array(
      z.object({ title: text, platform: z.enum(socialPlatformIds), potential: level, note: text }),
    ),
    reviewThemes: z.object({ positive: z.array(text), negative: z.array(text) }),
    competitor,
    opportunities: z
      .array(
        z.object({
          title: text,
          description: text,
          horizon: z.enum(['now', 'soon', 'later']),
          impact: z.enum(['high', 'medium', 'low']),
          effort: z.enum(['low', 'high']),
          time: text,
          cost: text,
          // Names the "Fix soon" gap this action closes, word for word.
          fixesGap: text.optional(),
        }),
      )
      .min(1),
    history: z
      .array(
        z.object({
          month,
          // A whole number, like the score computed for the current month, so the two can be compared.
          overallScore: percent.int(),
          totalReviews: count,
          googleRating: rating,
          instagramFollowers: count,
        }),
      )
      .min(1),
    milestones: z.array(
      z.object({ month, title: text, note: text }),
    ),
  })
  .superRefine((profile, ctx) => {
    const google = profile.reviewPlatforms.find((p) => p.id === 'google');
    const starTotal = Object.values(profile.googleStars).reduce((a, b) => a + b, 0);
    if (google && starTotal > 0) {
      const average = (5 * profile.googleStars.five + 4 * profile.googleStars.four + 3 * profile.googleStars.three + 2 * profile.googleStars.two + profile.googleStars.one) / starTotal;
      if (Math.abs(average - google.rating) > 0.05) {
        ctx.addIssue({
          code: 'custom',
          path: ['googleStars'],
          message: `Star counts average ${average.toFixed(2)}, too far from the Google rating of ${google.rating}`,
        });
      }
    }
    if (google && starTotal !== google.reviews) {
      ctx.addIssue({
        code: 'custom',
        path: ['googleStars'],
        message: `Star counts add up to ${starTotal}, but Google shows ${google.reviews} reviews`,
      });
    }
    profile.opportunities.forEach((o, i) => {
      if (o.fixesGap !== undefined && !profile.summary.criticalGaps.includes(o.fixesGap)) {
        ctx.addIssue({ code: 'custom', path: ['opportunities', i, 'fixesGap'], message: `"${o.fixesGap}" is not one of the gaps under summary.criticalGaps` });
      }
    });
    profile.summary.criticalGaps.forEach((gap, i) => {
      const fixed = profile.opportunities.some((o) => o.fixesGap === gap && o.horizon !== 'later');
      if (!fixed) {
        ctx.addIssue({ code: 'custom', path: ['summary', 'criticalGaps', i], message: `No action due now or soon fixes "${gap}"` });
      }
    });
    const totals = profile.history.map((h) => h.totalReviews);
    if (totals.some((t, i) => i > 0 && t < totals[i - 1]!)) {
      ctx.addIssue({ code: 'custom', path: ['history'], message: 'Review totals can only grow from one month to the next' });
    }
    const current = profile.reviewPlatforms.reduce((sum, r) => sum + r.reviews, 0);
    if (totals.length > 0 && current < totals.at(-1)!) {
      ctx.addIssue({ code: 'custom', path: ['history'], message: `The last recorded month has ${totals.at(-1)} reviews, more than the ${current} the platforms show now` });
    }
    const months = profile.history.map((h) => h.month);
    if (months.some((m, i) => i > 0 && m <= months[i - 1]!)) {
      ctx.addIssue({ code: 'custom', path: ['history'], message: 'History months must be in order, oldest first' });
    }
    if (months.at(-1)! >= profile.asOf) {
      ctx.addIssue({ code: 'custom', path: ['history'], message: 'History holds past months only; the current month is computed' });
    }
    // The charts show change from one month to the next, so a skipped month would be drawn as one month's change.
    const sequence = [...months, profile.asOf];
    for (let i = 1; i < sequence.length; i++) {
      const gap = monthsBetween(sequence[i - 1]!, sequence[i]!);
      if (gap > 1) {
        const first = addMonths(sequence[i - 1]!, 1);
        const missing = gap === 2 ? first : `${first} to ${addMonths(sequence[i]!, -1)}`;
        ctx.addIssue({ code: 'custom', path: ['history'], message: `History skips ${missing}; it needs every month up to the one before asOf` });
      }
    }
    const asOfYear = Number(profile.asOf.slice(0, 4));
    for (const who of ['restaurant', 'competitor'] as const) {
      if (profile[who].yearOpened > asOfYear) {
        ctx.addIssue({ code: 'custom', path: [who, 'yearOpened'], message: `Opened in ${profile[who].yearOpened}, after the report's year of ${asOfYear}` });
      }
    }
  });

export type Profile = z.infer<typeof profileSchema>;
export type ReviewPlatform = z.infer<typeof reviewPlatform>;
export type SocialPlatform = z.infer<typeof socialPlatform>;
export type CheckItem = z.infer<typeof checkItem>;

export function parseProfile(raw: unknown, source: string): Profile {
  const result = profileSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Profile "${source}" is invalid:\n${details}`);
  }
  return result.data;
}
