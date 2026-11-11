import { num, platformName, stars } from '../format';
import { html, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { totalReviews, weightedRating } from '../scoring';
import { checklist, meter, sectionHeader, share } from './shared';

export function renderReviews(p: Profile): SafeHtml {
  const total = totalReviews(p.reviewPlatforms);
  const tags = (items: string[], empty: string, tone: 'is-good' | 'is-bad') =>
    items.length > 0 ? html`<ul class="tags ${tone}">${items.map((t) => html`<li>${t}</li>`)}</ul>` : html`<p class="muted">${empty}</p>`;

  return html`
    ${sectionHeader('Reviews', 'Where reviews come from, what diners say, and whether anyone answers.')}

    <section class="card sheet" aria-labelledby="volume-title">
      <h3 class="block-title" id="volume-title">Reviews by platform</h3>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">Platform</th><th scope="col" class="num">Reviews</th><th scope="col" class="col-meter hide-narrow"><span class="sr-only">Share of all reviews</span></th><th scope="col" class="num">Share</th><th scope="col" class="num">Rating</th></tr></thead>
        <tbody>
          ${p.reviewPlatforms.map(
            (r) => html`<tr><th scope="row">${platformName[r.id]}</th><td class="num">${num(r.reviews)}</td><td class="hide-narrow">${meter(r.reviews, total)}</td><td class="num muted">${share(r.reviews, total)}</td><td class="num">${stars(r.rating)}</td></tr>`,
          )}
        </tbody>
        <tfoot><tr><th scope="row">All platforms</th><td class="num">${num(total)}</td><td class="hide-narrow"></td><td class="num">100%</td><td class="num">${stars(weightedRating(p.reviewPlatforms))}</td></tr></tfoot>
      </table></div>
      <p class="small muted mt-3">The overall rating weights each platform by how many reviews it has.</p>
    </section>

    <div class="grid-2">
      <section class="card sheet" aria-labelledby="reply-title">
        <h3 class="block-title" id="reply-title">Reply habits</h3>
        ${checklist(p.checklists.reviewResponse)}
      </section>
      <section class="card sheet" aria-labelledby="themes-title">
        <h3 class="block-title" id="themes-title">What reviews mention</h3>
        <h4 class="list-head is-good"><span class="status-mark" aria-hidden="true">✓</span>Praise</h4>
        ${tags(p.reviewThemes.positive, 'No common praise noted yet.', 'is-good')}
        <h4 class="list-head is-bad mt-4"><span class="status-mark" aria-hidden="true">✗</span>Complaints</h4>
        ${tags(p.reviewThemes.negative, 'No common complaints noted yet.', 'is-bad')}
      </section>
    </div>`;
}
