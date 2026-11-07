import { num, stars } from '../format';
import { html, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { ratingWords } from '../scoring.config';
import { checklist, meter, sectionHeader, share, stat } from './shared';

export function renderGoogle(p: Profile): SafeHtml {
  const header = sectionHeader('Google Business Profile', 'Where most diners decide. The listing, its stars and how complete it is.');
  const google = p.reviewPlatforms.find((r) => r.id === 'google');
  if (!google) {
    return html`${header}<div class="card"><p>This restaurant has no Google listing in the profile yet. Claiming one is usually the first step.</p></div>`;
  }
  const s = p.googleStars;
  const rows = [
    { label: '5 stars', count: s.five },
    { label: '4 stars', count: s.four },
    { label: '3 stars', count: s.three },
    { label: '2 stars', count: s.two },
    { label: '1 star', count: s.one },
  ];
  const negative = s.one + s.two;
  const words = ratingWords.find((w) => google.rating >= w.min)?.label ?? '';

  return html`
    ${header}
    <dl class="stats">
      ${stat('Rating', `${stars(google.rating)} out of 5`, words)}
      ${stat('Reviews', num(google.reviews), google.photos === undefined ? undefined : `${num(google.photos)} photos from diners`)}
      ${stat('Five-star reviews', share(s.five, google.reviews), `${num(s.five)} reviews`)}
      ${stat('One and two-star reviews', share(negative, google.reviews), `${num(negative)} reviews`)}
    </dl>

    <div class="grid-2">
      <section class="card" aria-labelledby="stars-title">
        <h3 class="block-title" id="stars-title">How the stars break down</h3>
        <table>
          <thead><tr><th scope="col">Stars</th><th scope="col" class="col-meter"><span class="sr-only">Share</span></th><th scope="col" class="num">Reviews</th><th scope="col" class="num">Share</th></tr></thead>
          <tbody>
            ${rows.map(
              (r) => html`<tr><th scope="row">${r.label}</th><td>${meter(r.count, google.reviews)}</td><td class="num">${num(r.count)}</td><td class="num muted">${share(r.count, google.reviews)}</td></tr>`,
            )}
          </tbody>
        </table>
      </section>

      <section class="card" aria-labelledby="gbp-title">
        <h3 class="block-title" id="gbp-title">Profile checklist</h3>
        ${checklist(p.checklists.googleProfile)}
      </section>
    </div>`;
}
