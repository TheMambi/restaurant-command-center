import { z } from 'zod';
import { monthsBetween } from './format';
import { reviewPlatformIds, socialPlatformIds } from './platforms';

// Profiles are checked when the site is built (vite.config.ts), so this file runs in Node and never
// ships. Should it ever be imported into a page: Zod speeds up parsing by compiling code as it runs,
// which the site's Content-Security-Policy refuses, so parsing stays interpreted.
z.config({ jitless: true });

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
const percent = z.number().min(0).max(100);
const rating = z.number().min(0).max(5);
const count = z.number().int().min(0);
// Control characters and the invisible ones that reorder or hide text have no place in a name or a sentence.
const text = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[^\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]*$/, 'Remove the control or invisible characters');
const level = z.enum(['high', 'medium', 'low']);
const year = z.number().int().min(1800);
// Far more rows than a report can show; a longer list is a mistake or an attack on the page.
const list = <T extends z.ZodType>(item: T) => z.array(item).max(60);

const reviewPlatform = z.strictObject({
  id: z.enum(reviewPlatformIds),
  rating,
  reviews: count,
  photos: count.optional(),
});

const socialPlatform = z.strictObject({
  id: z.enum(socialPlatformIds),
  followers: count,
  posts: count,
  engagementRate: percent,
  // Up to 30 days. Anything longer is not a reply time.
  responseHours: z.number().positive().max(720).optional(),
});

const checkItem = z.strictObject({
  label: text,
  status: z.enum(['pass', 'partial', 'fail']),
});

const uniqueIds = <T extends { id: string }>(items: T[]) =>
  new Set(items.map((item) => item.id)).size === items.length;

const competitor = z.strictObject({
  name: text,
  yearOpened: year,
  priceRange: z.enum(['$', '$$', '$$$', '$$$$']),
  reviewPlatforms: list(reviewPlatform).refine(uniqueIds, 'Each platform appears once'),
  socialPlatforms: list(socialPlatform.pick({ id: true, followers: true })).refine(uniqueIds, 'Each platform appears once'),
});

function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y! * 12 + m! - 1 + n;
  return `${String(Math.floor(index / 12)).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export const profileSchema = z
  .strictObject({
    slug: z.string().max(60).regex(/^[a-z0-9-]+$/),
    sampleData: z.boolean(),
    asOf: month,
    restaurant: z.strictObject({
      name: text,
      cuisine: text,
      neighborhood: text,
      city: text,
      address: text,
      // A bare host name. An address with a scheme could one day end up in a link, and escaping
      // does not make a script scheme safe.
      website: z.string().max(100).regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i, 'Use a host name alone, like yourrestaurant.example'),
      yearOpened: year,
      priceRange: z.enum(['$', '$$', '$$$', '$$$$']),
    }),
    reviewPlatforms: list(reviewPlatform).min(1).refine(uniqueIds, 'Each platform appears once'),
    socialPlatforms: list(socialPlatform).refine(uniqueIds, 'Each platform appears once'),
    googleStars: z.strictObject({ five: count, four: count, three: count, two: count, one: count }),
    summary: z.strictObject({
      strengths: list(text).min(1),
      improvements: list(text).min(1),
      criticalGaps: list(text),
    }),
    checklists: z.strictObject({
      googleProfile: list(checkItem).min(1),
      technicalSeo: list(checkItem).min(1),
      reviewResponse: list(checkItem).min(1),
      socialContent: list(checkItem),
    }),
    website: z.strictObject({
      mobile: list(z.strictObject({ label: text, rating: z.enum(['good', 'fair', 'poor']) })).min(1),
      bookingFlow: list(z.strictObject({ label: text, state: z.enum(['ok', 'warning', 'drop-off']) })).min(2),
      bookingRecommendation: text,
      keywords: list(
        z.strictObject({
          phrase: text,
          demand: level,
          intent: text,
          covered: z.boolean(),
        }),
      ),
    }),
    sampleSignals: list(
      z.strictObject({ tone: z.enum(['positive', 'negative']), platform: text, message: text }),
    ),
    growthIdeas: list(
      z.strictObject({ title: text, platform: z.enum(socialPlatformIds), potential: level, note: text }),
    ),
    reviewThemes: z.strictObject({ positive: list(text), negative: list(text) }),
    competitor,
    opportunities: z
      .array(
        z.strictObject({
          title: text,
          description: text,
          horizon: z.enum(['now', 'soon', 'later']),
          impact: level,
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
        z.strictObject({
          month,
          // A whole number, like the score computed for the current month, so the two can be compared.
          overallScore: percent.int(),
          totalReviews: count,
          googleRating: rating,
          instagramFollowers: count,
        }),
      )
      .min(1),
    milestones: list(
      z.strictObject({ month, title: text, note: text }),
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
    profile.milestones.forEach((m, i) => {
      if (m.month > profile.asOf) {
        ctx.addIssue({ code: 'custom', path: ['milestones', i, 'month'], message: `${m.month} is after the report's month of ${profile.asOf}` });
      }
    });
  });

export type Profile = z.infer<typeof profileSchema>;
export type ReviewPlatform = z.infer<typeof reviewPlatform>;
export type CheckItem = z.infer<typeof checkItem>;
export type Opportunity = Profile['opportunities'][number];
export type HistoryPoint = Profile['history'][number];

export function parseProfile(raw: unknown, source: string): Profile {
  const result = profileSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Profile "${source}" is invalid:\n${details}`);
  }
  return result.data;
}
