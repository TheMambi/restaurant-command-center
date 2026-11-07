import { num, platformName, stars } from '../format';
import { html, percentWidth, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { totalReviews } from '../scoring';
import { checklist, sectionHeader } from './shared';

export function renderReviews(p: Profile): SafeHtml {
  const total = totalReviews(p.reviewPlatforms);
  return html`
    ${sectionHeader('Reviews', 'Where reviews come from, what they say and how the team answers')}
    <div class="card">
      <h3 class="card-title">Reviews by platform</h3>
      <div class="platform-comparison">
        ${p.reviewPlatforms.map(
          (r) => html`<div class="platform-bar">
            <div class="platform-info"><span class="platform-name">${platformName[r.id]}</span><span class="platform-rating">${stars(r.rating)} ★ (${num(r.reviews)} reviews)</span></div>
            <div class="h-bar-track"><div class="h-bar-fill ${r.id}-bg" data-width="${percentWidth(r.reviews, total)}"></div></div>
          </div>`,
        )}
      </div>
      <div class="total-reviews"><strong>Total reviews across platforms: ${num(total)}</strong></div>
    </div>

    <div class="grid-2col">
      <div class="card"><h3 class="card-title">Reply checklist</h3>${checklist(p.checklists.reviewResponse)}</div>
      <div class="card">
        <h3 class="card-title">What reviews mention</h3>
        <div class="theme-tags">
          ${themeGroup('Praised', p.reviewThemes.positive, 'tag-green')}
          ${themeGroup('Complaints', p.reviewThemes.negative, 'tag-red')}
        </div>
      </div>
    </div>`;
}

function themeGroup(title: string, tags: string[], css: string): SafeHtml | false {
  return (
    tags.length > 0 &&
    html`<div class="theme"><h4>${title}</h4><div class="tag-cloud">${tags.map((t) => html`<span class="tag ${css}">${t}</span>`)}</div></div>`
  );
}
