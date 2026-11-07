import { num, platformName, stars } from '../format';
import { html, percentWidth, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { scoreLabels, scoreWeights } from '../scoring.config';
import { scoreLabel, type ScoreBreakdown, type ScoreKey } from '../scoring';
import { bar } from './shared';

const RING_RADIUS = 54;
const weightTotal = Object.values(scoreWeights).reduce((a, b) => a + b, 0);
const weightShare = (k: ScoreKey) => (weightTotal > 0 ? Math.round((scoreWeights[k] / weightTotal) * 100) : 0);
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function scoreRing(score: number): SafeHtml {
  const offset = RING_CIRCUMFERENCE * (1 - score / 100);
  return html`<div class="score-ring" role="img" aria-label="Overall score ${score} out of 100">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <defs><linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#f472b6"/></linearGradient></defs>
      <circle cx="60" cy="60" r="${RING_RADIUS}" class="ring-bg" />
      <circle cx="60" cy="60" r="${RING_RADIUS}" class="ring-fill" style="stroke-dasharray: ${RING_CIRCUMFERENCE.toFixed(2)}; stroke-dashoffset: ${RING_CIRCUMFERENCE.toFixed(2)};" data-offset="${offset.toFixed(2)}" />
    </svg>
    <div class="score-number" aria-hidden="true">${score}<span>/100</span></div>
  </div>`;
}

export function renderOverview(p: Profile, score: number, breakdown: ScoreBreakdown): SafeHtml {
  const instagram = p.socialPlatforms.find((s) => s.id === 'instagram');
  const audience = [
    ...p.reviewPlatforms.map((r) => ({ label: `${platformName[r.id]} reviews`, value: r.reviews, css: `${r.id}-bg` })),
    ...p.socialPlatforms.map((s) => ({ label: `${platformName[s.id]} followers`, value: s.followers, css: `${s.id}-bg` })),
  ];
  const audienceMax = Math.max(0, ...audience.map((a) => a.value));
  const keys = Object.keys(scoreWeights) as ScoreKey[];

  return html`
    <div class="score-row">
      <div class="score-card score-overall">
        ${scoreRing(score)}
        <h3>Overall online presence score</h3>
        <p class="score-label">${scoreLabel(score)}</p>
      </div>
      ${p.reviewPlatforms.map(
        (r) => html`<div class="score-card">
          <div class="mini-score ${r.id}-color">${stars(r.rating)}<span>/ 5</span></div>
          <h3>${platformName[r.id]} rating</h3>
          <p>${num(r.reviews)} reviews</p>
        </div>`,
      )}
      ${instagram &&
      html`<div class="score-card">
        <div class="mini-score instagram-color">${num(instagram.followers)}</div>
        <h3>Instagram followers</h3>
        <p>${num(instagram.posts)} posts</p>
      </div>`}
    </div>

    <div class="insights-grid">
      ${insight('insight-success', 'Strengths', p.summary.strengths)}
      ${insight('insight-warning', 'Areas to improve', p.summary.improvements)}
      ${p.summary.criticalGaps.length > 0 && insight('insight-danger', 'Critical gaps', p.summary.criticalGaps)}
    </div>

    <div class="grid-2col">
      <div class="card">
        <h2 class="card-title">How the score is built</h2>
        <div class="bar-chart-container">
          ${keys.map((k) => bar(`${scoreLabels[k]} (${weightShare(k)}% of score)`, percentWidth(breakdown[k], 100), `${Math.round(breakdown[k])}`, 'score-bg'))}
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">Ratings and audience</h2>
        <div class="bar-chart-container">
          ${p.reviewPlatforms.map((r) => bar(`${platformName[r.id]} rating`, percentWidth(r.rating, 5), `${stars(r.rating)} / 5`, `${r.id}-bg`))}
          ${audience.map((a) => bar(a.label, percentWidth(a.value, audienceMax), num(a.value), a.css))}
        </div>
      </div>
    </div>`;
}

function insight(css: string, title: string, items: string[]): SafeHtml {
  return html`<div class="insight-card ${css}"><h4>${title}</h4><ul>${items.map((i) => html`<li>${i}</li>`)}</ul></div>`;
}
