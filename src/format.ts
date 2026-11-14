import type { reviewPlatformIds, socialPlatformIds } from './platforms';

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

export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty! - fy!) * 12 + (tm! - fm!);
}

// A count with its noun: "1 review", "1,180 reviews".
export const counted = (n: number, noun: string): string => `${num(n)} ${n === 1 ? noun : `${noun}s`}`;

export const yearsOpen = (years: number): string => (years === 0 ? 'Opened this year' : `Open ${counted(years, 'year')}`);

export function hours(h: number): string {
  // Rounded to the minute before the unit is chosen, so 59.7 minutes reads "1 hour" and never "60 minutes".
  const minutes = Math.round(h * 60);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return counted(minutes, 'minute');
  return counted(minutes / 60, 'hour');
}

export function signed(n: number, digits = 0): string {
  const fixed = Math.abs(n).toFixed(digits);
  if (Number(fixed) === 0) return '0';
  return `${n > 0 ? '+' : '−'}${fixed}`;
}
