import { html, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { checklist, levelWords, sectionHeader, status } from './shared';

const phoneRating = {
  good: { css: 'is-good', mark: '✓', word: 'Good' },
  fair: { css: 'is-warn', mark: '!', word: 'Fair' },
  poor: { css: 'is-bad', mark: '✗', word: 'Poor' },
} as const;

const stepState = {
  ok: { css: 'is-good', mark: '✓', word: 'On track' },
  warning: { css: 'is-warn', mark: '!', word: 'Friction' },
  'drop-off': { css: 'is-bad', mark: '✗', word: 'Guests lost' },
} as const;

export function renderWebsite(p: Profile): SafeHtml {
  const w = p.website;
  return html`
    ${sectionHeader('Website', `How well ${p.restaurant.website} turns a visit into a booking or an order, and how easily search engines can read it.`)}

    <div class="grid-2">
      <section class="card sheet" aria-labelledby="path-title">
        <h3 class="block-title" id="path-title">From visit to table</h3>
        <ol class="steps">
          ${w.bookingFlow.map((step) => {
            const s = stepState[step.state];
            return html`<li class="${s.css}"><span>${step.label}</span>${status(s.css, s.mark, s.word)}</li>`;
          })}
        </ol>
        <p class="note mt-4"><strong>Recommendation:</strong> ${w.bookingRecommendation}</p>
      </section>

      <section class="card sheet" aria-labelledby="phone-title">
        <h3 class="block-title" id="phone-title">On a phone</h3>
        <ul class="checklist">
          ${w.mobile.map((m) => {
            const s = phoneRating[m.rating];
            return html`<li>${status(s.css, s.mark, s.word)}<span>${m.label}</span></li>`;
          })}
        </ul>
      </section>
    </div>

    <section class="card sheet" aria-labelledby="search-title">
      <h3 class="block-title" id="search-title">Searches worth winning</h3>
      ${w.keywords.length === 0
        ? html`<p class="muted">No search phrases researched yet.</p>`
        : html`<div class="table-wrap"><table class="stack-table">
          <thead><tr><th scope="col">What diners type</th><th scope="col">Search demand</th><th scope="col">Intent</th><th scope="col">Page on the site</th></tr></thead>
          <tbody>
            ${w.keywords.map((k) => {
              const s = k.covered ? phoneRating.good : phoneRating.poor;
              return html`<tr><th scope="row">${k.phrase}</th><td data-label="Search demand">${levelWords[k.demand]}</td><td class="muted" data-label="Intent">${k.intent}</td><td data-label="Page on the site">${status(s.css, s.mark, k.covered ? 'Targeted' : 'None yet')}</td></tr>`;
            })}
          </tbody>
        </table></div>
        <p class="small muted mt-3">Demand is a relative estimate. A live version would use Google Search Console impressions or a keyword tool's monthly searches.</p>`}
    </section>

    <section class="card sheet" aria-labelledby="basics-title">
      <h3 class="block-title" id="basics-title">Search engine basics</h3>
      ${checklist(p.checklists.technicalSeo)}
    </section>`;
}
