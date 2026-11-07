import { num, stars } from '../format';
import { html, percentWidth, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { checklist, sectionHeader } from './shared';

export function renderGoogle(p: Profile): SafeHtml {
  const google = p.reviewPlatforms.find((r) => r.id === 'google');
  if (!google) {
    return html`${sectionHeader('Google Business Profile', 'The most important channel for people deciding where to eat')}
      <div class="card"><p>No Google listing in this profile yet.</p></div>`;
  }
  const s = p.googleStars;
  const rows = [
    { label: '5 ★', count: s.five, css: 'star5' },
    { label: '4 ★', count: s.four, css: 'star4' },
    { label: '3 ★', count: s.three, css: 'star3' },
    { label: '2 ★', count: s.two, css: 'star2' },
    { label: '1 ★', count: s.one, css: 'star1' },
  ];
  const share = (n: number) => (google.reviews > 0 ? (n / google.reviews) * 100 : 0);
  const negative = s.one + s.two;

  return html`
    ${sectionHeader('Google Business Profile', 'The most important channel for people deciding where to eat')}
    <div class="metrics-grid">
      ${metric(html`${stars(google.rating)}<span class="metric-unit">/ 5</span>`, 'Rating', google.rating >= 4.5 ? 'Excellent' : google.rating >= 4 ? 'Good, with room to grow' : 'Below what diners expect', google.rating >= 4.5 ? 'trend-up' : 'trend-neutral', 'google-color')}
      ${metric(num(google.reviews), 'Total reviews', google.photos === undefined ? '' : `${num(google.photos)} photos`, 'trend-neutral')}
      ${metric(`${share(s.five).toFixed(1)}%`, '5-star reviews', `${num(s.five)} of ${num(google.reviews)}`, 'trend-up')}
      ${metric(`${share(negative).toFixed(1)}%`, '1 and 2-star reviews', `${num(negative)} negative reviews`, 'trend-down', 'warning-color')}
    </div>

    <div class="card">
      <h3 class="card-title">How the stars break down</h3>
      <div class="review-distribution">
        ${rows.map(
          (r) => html`<div class="dist-row">
            <span class="dist-label">${r.label}</span>
            <div class="dist-bar-track"><div class="dist-bar-fill ${r.css}" data-width="${percentWidth(r.count, google.reviews)}"></div></div>
            <span class="dist-count">${num(r.count)}</span>
          </div>`,
        )}
      </div>
    </div>

    <div class="card">
      <h3 class="card-title">Profile checklist</h3>
      ${checklist(p.checklists.googleProfile)}
    </div>`;
}

function metric(value: SafeHtml | string, label: string, trend: string, trendCss: string, valueCss = ''): SafeHtml {
  return html`<div class="metric-card">
    <div class="metric-value ${valueCss}">${value}</div>
    <div class="metric-label">${label}</div>
    ${trend && html`<div class="metric-trend ${trendCss}">${trend}</div>`}
  </div>`;
}
