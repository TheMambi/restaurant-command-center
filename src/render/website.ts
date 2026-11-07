import { html, percentWidth, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { sectionHeader } from './shared';

const mobileStyle = {
  good: { css: 'status-good', word: 'Good' },
  fair: { css: 'status-warn', word: 'Fair' },
  poor: { css: 'status-bad', word: 'Poor' },
} as const;

const stepStyle = {
  ok: { css: 'step-active', words: 'On track' },
  warning: { css: 'step-warning', words: 'Friction' },
  'drop-off': { css: 'step-danger', words: 'Guests drop off' },
} as const;

export function renderWebsite(p: Profile): SafeHtml {
  const w = p.website;
  return html`
    ${sectionHeader('Website audit', `How well ${p.restaurant.website} turns visitors into guests on phones and in search`)}
    <div class="grid-2col">
      <div class="card">
        <h3 class="card-title">On a phone</h3>
        <div class="audit-items">
          ${w.mobile.map(
            (m) => html`<div class="audit-item"><span class="audit-status ${mobileStyle[m.rating].css}">${mobileStyle[m.rating].word}</span><span>${m.label}</span></div>`,
          )}
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">From visit to table</h3>
        <ol class="friction-flow">
          ${w.bookingFlow.map(
            (step) => html`<li class="flow-step ${stepStyle[step.state].css}"><span class="step-num" aria-hidden="true"></span><span>${step.label}</span><span class="step-state">${stepStyle[step.state].words}</span></li>`,
          )}
        </ol>
        <div class="recommendation-box"><strong>Recommendation:</strong> ${w.bookingRecommendation}</div>
      </div>
    </div>

    ${w.keywords.length > 0 &&
    html`<div class="card">
      <h3 class="card-title">Searches worth winning</h3>
      <div class="seo-grid">
        ${w.keywords.map(
          (k) => html`<div class="seo-keyword">
            <div class="keyword-header">
              <span class="keyword-text">“${k.phrase}”</span>
              <span class="keyword-status ${k.covered ? 'found' : 'missing'}">${k.covered ? 'Already targeted' : 'No page yet'}</span>
            </div>
            <div class="keyword-bar"><div class="keyword-fill ${k.covered ? 'found-fill' : ''}" data-width="${percentWidth(k.demand, 100)}"></div></div>
            <span class="keyword-potential">${k.demandLabel}</span>
          </div>`,
        )}
      </div>
    </div>`}

    <div class="card">
      <h3 class="card-title">Search engine basics</h3>
      <div class="tech-grid">
        ${p.checklists.technicalSeo.map(
          (c) => html`<div class="tech-item ${c.status === 'pass' ? 'tech-pass' : c.status === 'partial' ? 'tech-warn' : 'tech-fail'}">
            <span aria-hidden="true">${c.status === 'pass' ? '✓' : c.status === 'partial' ? '!' : '✗'}</span>
            <span class="sr-only">${c.status === 'pass' ? 'Done' : c.status === 'partial' ? 'Partly done' : 'Missing'}: </span>${c.label}
          </div>`,
        )}
      </div>
    </div>`;
}
