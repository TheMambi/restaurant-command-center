import type { reviewPlatformIds, socialPlatformIds } from './schema';

type PlatformId = (typeof reviewPlatformIds)[number] | (typeof socialPlatformIds)[number];

export const platformName: Record<PlatformId, string> = {
  google: 'Google',
  yelp: 'Yelp',
  tripadvisor: 'Tripadvisor',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X',
  facebook: 'Facebook',
};

export const num = (n: number): string => n.toLocaleString('en-US');
export const stars = (n: number): string => n.toFixed(1);

export function monthLabel(month: string, style: 'long' | 'short' = 'long'): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, m! - 1, 1)).toLocaleDateString('en-US', {
    month: style,
    year: style === 'long' ? 'numeric' : undefined,
    timeZone: 'UTC',
  });
}

export function hours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} minutes`;
  return `${num(h)} ${h === 1 ? 'hour' : 'hours'}`;
}

export function signed(n: number, digits = 0): string {
  const fixed = Math.abs(n).toFixed(digits);
  if (Number(fixed) === 0) return '0';
  return `${n > 0 ? '+' : '−'}${fixed}`;
}
