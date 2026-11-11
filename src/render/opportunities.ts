import { html, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { actionValue, doFirst } from './overview';
import { sectionHeader } from './shared';

type Opportunity = Profile['opportunities'][number];

const horizons = [
  { id: 'now', title: 'This month' },
  { id: 'soon', title: 'In the next 1 to 3 months' },
  { id: 'later', title: 'In 3 to 6 months' },
] as const;

const impactWords = { high: 'High', medium: 'Medium', low: 'Low' } as const;
const effortWords = { low: 'Quick', high: 'Bigger job' } as const;

export const quadrants = [
  { title: 'Quick wins', desc: 'High impact, quick to do', match: (o: Opportunity) => o.impact === 'high' && o.effort === 'low' },
  { title: 'Plan and schedule', desc: 'High impact, a bigger job', match: (o: Opportunity) => o.impact === 'high' && o.effort === 'high' },
  { title: 'Fit in when possible', desc: 'Medium or low impact, quick to do', match: (o: Opportunity) => o.impact !== 'high' && o.effort === 'low' },
  { title: 'Save for later', desc: 'Medium or low impact, a bigger job', match: (o: Opportunity) => o.impact !== 'high' && o.effort === 'high' },
] as const;

export function renderOpportunities(p: Profile): SafeHtml {
  const ticket = new Set(doFirst(p.opportunities));
  return html`
    ${sectionHeader('Next steps', `Every recommended action for ${p.restaurant.name}, grouped by when to do it.`)}

    ${horizons.map((h) => {
      // Same ranking as the overview ticket, so the order never disagrees with it.
      const items = p.opportunities
        .map((o, i) => ({ o, i }))
        .filter(({ o }) => o.horizon === h.id)
        .sort((a, b) => actionValue(b.o) - actionValue(a.o) || a.i - b.i)
        .map(({ o }) => o);
      return (
        items.length > 0 &&
        html`<section class="card sheet" aria-labelledby="h-${h.id}">
          <h3 class="block-title" id="h-${h.id}">${h.title}</h3>
          <div class="table-wrap"><table class="actions-table stack-table">
            <thead><tr><th scope="col">Action</th><th scope="col">Impact</th><th scope="col">Effort</th><th scope="col">Time</th><th scope="col">Cost</th></tr></thead>
            <tbody>
              ${items.map(
                (o) => html`<tr>
                  <th scope="row">${o.title}${ticket.has(o) && html` <span class="on-ticket">On this week's ticket</span>`}<span class="row-note">${o.description}${o.fixesGap && html` Fixes: ${o.fixesGap.charAt(0).toLowerCase()}${o.fixesGap.slice(1)}.`}</span></th>
                  <td data-label="Impact"><span class="impact is-${o.impact}">${impactWords[o.impact]}</span></td>
                  <td data-label="Effort">${effortWords[o.effort]}</td>
                  <td data-label="Time">${o.time}</td>
                  <td data-label="Cost">${o.cost}</td>
                </tr>`,
              )}
            </tbody>
          </table></div>
        </section>`
      );
    })}

    <section class="card sheet" aria-labelledby="matrix-title">
      <h3 class="block-title" id="matrix-title">Impact and effort</h3>
      <div class="matrix">
        ${quadrants.map((q) => {
          const items = p.opportunities.filter(q.match);
          return html`<div class="quadrant">
            <h4>${q.title}</h4>
            <p class="small muted">${q.desc}</p>
            ${items.length > 0 ? html`<ul>${items.map((o) => html`<li>${o.title}</li>`)}</ul>` : html`<p class="small muted mt-2">Nothing here.</p>`}
          </div>`;
        })}
      </div>
    </section>`;
}
