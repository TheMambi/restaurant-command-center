import { monthLabel, monthsBetween, num, stars } from '../format';
import { html, type SafeHtml } from '../html';
import type { HistoryPoint, Profile } from '../schema';
import { totalReviews } from '../scoring';
import { barChart, lineChart } from './line-chart';
import { fallingReviews } from './overview';
import { sectionHeader, stat } from './shared';
import { sparkline } from './visuals';

export function change(diff: number, unit: string, digits = 0): string {
  const size = Number(Math.abs(diff).toFixed(digits));
  if (size === 0) return 'No change';
  return `${diff > 0 ? 'Up' : 'Down'} ${size.toLocaleString('en-US', { minimumFractionDigits: digits })}${unit}`;
}

// The current month is computed from the profile so the last point always matches the overview.
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

export function renderHistory(p: Profile, series: HistoryPoint[]): SafeHtml {
  const first = series[0]!;
  const last = series.at(-1)!;
  const since = monthLabel(first.month);
  const span = monthsBetween(first.month, last.month);
  const labels = series.map((s) => monthLabel(s.month, 'short'));
  const hasInstagram = p.socialPlatforms.some((s) => s.id === 'instagram');
  // A Google listing with no reviews has no rating to follow over time.
  const hasGoogleRating = p.reviewPlatforms.some((r) => r.id === 'google' && r.reviews > 0);
  const scoreChange = last.overallScore - first.overallScore;

  return html`
    ${sectionHeader('Progress', `Change over the last ${span} ${span === 1 ? 'month' : 'months'}, since ${since}.${p.sampleData ? ' Sample figures.' : ''}`)}

    <dl class="stats">
      ${stat('Score out of 100', String(last.overallScore), `${change(scoreChange, Math.abs(scoreChange) === 1 ? ' point' : ' points')} since ${since}`, sparkline(series.map((x) => x.overallScore)))}
      ${hasGoogleRating && stat('Google rating', stars(last.googleRating), `${change(last.googleRating - first.googleRating, ' stars', 1)} since ${since}`, sparkline(series.map((x) => x.googleRating)))}
      ${stat('Reviews, all platforms', num(last.totalReviews), `${change(last.totalReviews - first.totalReviews, '')} since ${since}`, sparkline(series.map((x) => x.totalReviews)))}
      ${hasInstagram && stat('Instagram followers', num(last.instagramFollowers), `${change(last.instagramFollowers - first.instagramFollowers, '')} since ${since}`, sparkline(series.map((x) => x.instagramFollowers)))}
    </dl>

    <div class="grid-2">
      <section class="card sheet" aria-labelledby="score-trend">
        <h3 class="block-title" id="score-trend">Score by month</h3>
        ${lineChart({ labels, values: series.map((s) => s.overallScore), min: 0, max: 100, format: (v) => String(v), title: 'Online presence score by month, out of 100' })}
        <p class="small muted mt-3">Past months show the score as recorded at the time. This month is worked out from the current figures.</p>
      </section>
      <section class="card sheet" aria-labelledby="reviews-trend">
        <h3 class="block-title" id="reviews-trend">New reviews each month</h3>
        ${barChart({
          labels: labels.slice(1),
          values: series.slice(1).map((s, i) => s.totalReviews - series[i]!.totalReviews),
          format: num,
          title: 'New reviews across all platforms each month',
        })}
        ${fallingReviews(series) && html`<p class="small mt-3">${fallingReviews(series)} Asking happy guests for a review at the table is the cheapest fix.</p>`}
      </section>
    </div>

    <section class="card sheet" aria-labelledby="milestones-title">
      <h3 class="block-title" id="milestones-title">Milestones</h3>
      ${p.milestones.length === 0
        ? html`<p class="muted">No milestones recorded yet.</p>`
        : html`<ol class="milestones">
          ${p.milestones.map(
            (m) => html`<li><time datetime="${m.month}">${monthLabel(m.month)}</time><div><h4>${m.title}</h4><p class="muted">${m.note}</p></div></li>`,
          )}
        </ol>`}
    </section>`;
}
