import { html, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { sectionHeader } from './shared';

type Opportunity = Profile['opportunities'][number];

const horizons = [
  { id: 'now', title: 'Quick wins (this month)', css: 'quick-wins' },
  { id: 'soon', title: 'Next 1 to 3 months', css: 'medium-term' },
  { id: 'later', title: '3 to 6 months', css: 'long-term' },
] as const;

const impactLabel = { high: 'High impact', medium: 'Medium impact', low: 'Lower impact' } as const;

export const quadrants = [
  { css: 'q1', title: 'Do first', desc: 'High impact, low effort', match: (o: Opportunity) => o.impact === 'high' && o.effort === 'low' },
  { css: 'q2', title: 'Plan and schedule', desc: 'High impact, more effort', match: (o: Opportunity) => o.impact === 'high' && o.effort === 'high' },
  { css: 'q3', title: 'Fit in when possible', desc: 'Medium or lower impact, low effort', match: (o: Opportunity) => o.impact !== 'high' && o.effort === 'low' },
  { css: 'q4', title: 'Save for later', desc: 'Medium or lower impact, more effort', match: (o: Opportunity) => o.impact !== 'high' && o.effort === 'high' },
] as const;

export function renderOpportunities(p: Profile): SafeHtml {
  return html`
    ${sectionHeader('Next steps', `Prioritized actions to strengthen ${p.restaurant.name}'s online presence`)}
    <div class="opportunity-timeline">
      ${horizons.map((h) => {
        const items = p.opportunities.filter((o) => o.horizon === h.id);
        return (
          items.length > 0 &&
          html`<div class="timeline-section">
            <h3 class="timeline-header ${h.css}">${h.title}</h3>
            <div class="opp-cards">
              ${items.map(
                (o) => html`<div class="opp-card priority-${o.impact}">
                  <div class="opp-priority">${impactLabel[o.impact]}</div>
                  <h4>${o.title}</h4>
                  <p>${o.description}</p>
                  <div class="opp-meta"><span class="opp-effort">Time: ${o.time}</span><span class="opp-cost">Cost: ${o.cost}</span></div>
                </div>`,
              )}
            </div>
          </div>`
        );
      })}
    </div>

    <div class="card">
      <h3 class="card-title">Impact and effort</h3>
      <div class="matrix">
        <div class="matrix-grid">
          ${quadrants.map((q) => {
            const items = p.opportunities.filter(q.match);
            return html`<div class="matrix-quadrant ${q.css}">
              <h4>${q.title}</h4>
              <p class="q-desc">${q.desc}</p>
              ${items.length > 0 ? html`<ul>${items.map((o) => html`<li>${o.title}</li>`)}</ul>` : html`<p class="q-desc">Nothing here yet</p>`}
            </div>`;
          })}
        </div>
      </div>
    </div>`;
}
