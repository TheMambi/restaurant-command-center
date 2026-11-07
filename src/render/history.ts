import { monthLabel, num, signed, stars } from '../format';
import { html, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { totalReviews } from '../scoring';
import { sectionHeader } from './shared';

export interface HistoryPoint {
  month: string;
  overallScore: number;
  totalReviews: number;
  googleRating: number;
  instagramFollowers: number;
}

// The current month is computed from the profile so the chart's last point always matches the overview.
export function historySeries(p: Profile, score: number): HistoryPoint[] {
  return [
    ...p.history,
    {
      month: p.asOf,
      overallScore: score,
      totalReviews: totalReviews(p.reviewPlatforms),
      googleRating: p.reviewPlatforms.find((r) => r.id === 'google')?.rating ?? 0,
      instagramFollowers: p.socialPlatforms.find((s) => s.id === 'instagram')?.followers ?? 0,
    },
  ];
}

const dotClass = { now: 'dot-current', step: 'dot-success', baseline: 'dot-warning' } as const;

export function renderHistory(p: Profile, series: HistoryPoint[]): SafeHtml {
  const first = series[0]!;
  const last = series.at(-1)!;
  const since = monthLabel(first.month);
  const hasInstagram = p.socialPlatforms.some((s) => s.id === 'instagram');
  const hasGoogle = p.reviewPlatforms.some((r) => r.id === 'google');
  const delta = (d: number) => (d > 0 ? 'delta-up' : d < 0 ? 'delta-down' : 'delta-same');

  return html`
    ${sectionHeader(`Progress since ${since}`, p.sampleData ? 'How the online presence has changed. All figures here are sample data.' : 'How the online presence has changed.')}
    <div class="trend-cards-grid">
      ${trend('Overall score', html`${last.overallScore}<span class="trend-suffix">/100</span>`, `${signed(last.overallScore - first.overallScore)} points`, delta(last.overallScore - first.overallScore), `From ${first.overallScore} in ${since}`)}
      ${hasGoogle && trend('Google rating', html`${stars(last.googleRating)}<span class="trend-suffix"> ★</span>`, `${signed(last.googleRating - first.googleRating, 1)} stars`, delta(last.googleRating - first.googleRating), `From ${stars(first.googleRating)} in ${since}`)}
      ${trend('Total reviews', num(last.totalReviews), `${signed(last.totalReviews - first.totalReviews)}`, delta(last.totalReviews - first.totalReviews), `New reviews since ${since}`)}
      ${hasInstagram && trend('Instagram followers', num(last.instagramFollowers), `${signed(last.instagramFollowers - first.instagramFollowers)}`, delta(last.instagramFollowers - first.instagramFollowers), `Since ${since}`)}
    </div>

    <div class="history-grid">
      <div class="card chart-wrapper">
        <h3 class="card-title">Score and reviews over time</h3>
        <div class="chart-container"><canvas id="growthChart" aria-hidden="true"></canvas></div>
        <table class="sr-only">
          <caption>Overall score and total reviews by month</caption>
          <thead><tr><th scope="col">Month</th><th scope="col">Overall score</th><th scope="col">Total reviews</th></tr></thead>
          <tbody>${series.map((s) => html`<tr><th scope="row">${monthLabel(s.month)}</th><td>${s.overallScore}</td><td>${num(s.totalReviews)}</td></tr>`)}</tbody>
        </table>
      </div>
      ${p.milestones.length > 0 &&
      html`<div class="card timeline-wrapper">
        <h3 class="card-title">Milestones</h3>
        <ol class="history-timeline">
          ${p.milestones.map(
            (m) => html`<li class="timeline-item">
              <div class="timeline-dot ${dotClass[m.kind]}"></div>
              <div class="timeline-content"><h4>${monthLabel(m.month)}: ${m.title}</h4><p>${m.note}</p></div>
            </li>`,
          )}
        </ol>
      </div>`}
    </div>`;
}

function trend(title: string, value: SafeHtml | string, change: string, css: string, note: string): SafeHtml {
  return html`<div class="trend-card"><h4>${title}</h4><div class="trend-val">${value}</div><div class="trend-delta ${css}">${change}</div><p>${note}</p></div>`;
}
