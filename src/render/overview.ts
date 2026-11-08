import { monthLabel, num, platformName, stars } from '../format';
import { html, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { actionRanking, scoreLabels, scoreWeights } from '../scoring.config';
import { scoreLabel, type ScoreBreakdown, type ScoreKey } from '../scoring';
import { standing } from './competitor';
import type { HistoryPoint } from './history';
import { list, meter } from './shared';

type Opportunity = Profile['opportunities'][number];

const weightTotal = Object.values(scoreWeights).reduce((a, b) => a + b, 0);
const weightShare = (k: ScoreKey) => (weightTotal > 0 ? Math.round((scoreWeights[k] / weightTotal) * 100) : 0);

// Highest value first; ties keep the order the profile lists them in.
export function actionValue(o: Opportunity): number {
  const r = actionRanking;
  return (
    r.impact[o.impact] -
    r.effortPenalty[o.effort] +
    (o.horizon === 'now' ? r.dueNowBonus : 0) +
    (o.fixesGap !== undefined ? r.fixesGapBonus : 0)
  );
}

export function doFirst(opportunities: Opportunity[], limit = 3): Opportunity[] {
  return opportunities
    .map((o, i) => ({ o, i }))
    .sort((a, b) => actionValue(b.o) - actionValue(a.o) || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.o);
}

const horizonWords = { now: 'due this month', soon: 'due in the next 1 to 3 months', later: 'due in 3 to 6 months' } as const;
const impactWords = { high: 'High impact', medium: 'Medium impact', low: 'Low impact' } as const;

export function whyFirst(o: Opportunity): string {
  const base = `${impactWords[o.impact]}, ${o.effort === 'low' ? 'quick to do' : 'a bigger job'}, ${horizonWords[o.horizon]}.`;
  return o.fixesGap ? `${base} Fixes: ${o.fixesGap.charAt(0).toLowerCase()}${o.fixesGap.slice(1)}.` : base;
}

export function trendSentence(series: HistoryPoint[]): string {
  const first = series[0];
  const last = series.at(-1);
  if (!first || !last || first === last) return 'No earlier months to compare yet.';
  const diff = last.overallScore - first.overallScore;
  const since = monthLabel(first.month);
  if (diff === 0) return `Unchanged since ${since}.`;
  return `${diff > 0 ? 'Up' : 'Down'} ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'point' : 'points'} since ${since}.`;
}

// A run of at least three months where new reviews shrank each time.
export function fallingReviews(series: HistoryPoint[]): string | undefined {
  const added = series.slice(1).map((s, i) => ({ month: s.month, n: s.totalReviews - series[i]!.totalReviews }));
  let run = 0;
  for (let i = added.length - 1; i > 0 && added[i]!.n < added[i - 1]!.n; i--) run++;
  if (run < 2) return undefined;
  return `New reviews have dropped each month since ${monthLabel(added[added.length - 1 - run]!.month)}.`;
}

export function renderOverview(p: Profile, score: number, breakdown: ScoreBreakdown, series: HistoryPoint[]): SafeHtml {
  const keys = Object.keys(scoreWeights) as ScoreKey[];
  const ranked = [...keys].sort((a, b) => breakdown[b] - breakdown[a]);
  const actions = doFirst(p.opportunities);
  const s = standing(p);

  return html`
    <h2 class="sr-only">Overview</h2>
    <div class="scorecard">
      <section class="card score-card" aria-labelledby="score-title">
        <h3 class="block-title" id="score-title">Online presence score</h3>
        <p class="score-figure"><span class="score-number">${score}</span><span class="score-out-of">out of 100</span></p>
        <p class="score-label">${scoreLabel(score)}</p>
        <div class="score-context">
          <p>${trendSentence(series)} ${fallingReviews(series)} <button type="button" class="inline-link no-print" data-goto="history">See progress</button></p>
          <p>Ahead of ${p.competitor.name} on ${s.ahead} of ${s.total} measures, behind on ${s.behind}. <button type="button" class="inline-link no-print" data-goto="competitor">Compare</button></p>
          <p>Strongest area: ${scoreLabels[ranked[0]!].toLowerCase()}. Weakest: ${scoreLabels[ranked.at(-1)!].toLowerCase()}.</p>
        </div>
        <div class="table-wrap">
          <table>
            <caption class="sr-only">How the score is built</caption>
            <thead><tr><th scope="col">Part of the score</th><th scope="col" class="num">Weight</th><th scope="col" class="col-meter hide-narrow"><span class="sr-only">Bar</span></th><th scope="col" class="num">Score</th></tr></thead>
            <tbody>
              ${keys.map(
                (k) => html`<tr><th scope="row">${scoreLabels[k]}</th><td class="num muted">${weightShare(k)}%</td><td class="hide-narrow">${meter(breakdown[k], 100)}</td><td class="num">${Math.round(breakdown[k])}</td></tr>`,
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div class="ticket-lift"><section class="ticket" aria-labelledby="first-title">
        <div class="ticket-head">
          <h3 class="block-title" id="first-title">Do these first</h3>
          <span class="small muted">${actions.length} of ${p.opportunities.length} actions</span>
        </div>
        <ol class="action-list">
          ${actions.map(
            (o) => html`<li><div>
              <p class="action-title">${o.title}</p>
              <p class="action-desc">${o.description}</p>
              <p class="action-why">${whyFirst(o)}</p>
              <dl class="facts"><div><dt>Time</dt><dd>${o.time}</dd></div><div><dt>Cost</dt><dd>${o.cost}</dd></div></dl>
            </div></li>`,
          )}
        </ol>
        <button type="button" class="link-button no-print" data-goto="opportunities">See all ${p.opportunities.length} next steps</button>
      </section></div>

    <section class="card ratings-card" aria-labelledby="ratings-title">
      <h3 class="block-title" id="ratings-title">Ratings by platform</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">Platform</th><th scope="col" class="num">Rating</th><th scope="col" class="col-meter hide-narrow"><span class="sr-only">Rating out of 5</span></th><th scope="col" class="num">Reviews</th><th scope="col" class="num">Photos</th></tr></thead>
          <tbody>
            ${p.reviewPlatforms.map(
              (r) => html`<tr><th scope="row">${platformName[r.id]}</th><td class="num">${stars(r.rating)}</td><td class="hide-narrow">${meter(r.rating, 5)}</td><td class="num">${num(r.reviews)}</td><td class="num">${r.photos === undefined ? html`<span class="missing">Not counted</span>` : num(r.photos)}</td></tr>`,
            )}
          </tbody>
        </table>
      </div>
    </section>
    </div>

    <section class="card" aria-labelledby="summary-title">
      <h3 class="block-title" id="summary-title">Analyst notes</h3>
      <div class="grid-3">
        <div><h4 class="list-head">Working well</h4>${list(p.summary.strengths)}</div>
        <div><h4 class="list-head">Could be better</h4>${list(p.summary.improvements)}</div>
        <div><h4 class="list-head">Fix soon</h4>${list(p.summary.criticalGaps)}</div>
      </div>
    </section>`;
}
