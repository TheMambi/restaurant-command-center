import { hours, num, platformName } from '../format';
import { html, percentWidth, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { bar, checklist, sectionHeader } from './shared';

export function renderSocial(p: Profile): SafeHtml {
  const socials = p.socialPlatforms;
  const withResponse = socials.filter((s) => s.responseHours !== undefined);
  const slowest = Math.max(0, ...withResponse.map((s) => s.responseHours!));

  return html`
    ${sectionHeader('Social media and reputation', 'Audience, engagement and how fast the team answers')}

    ${p.sampleSignals.length > 0 &&
    html`<div class="card highlight-card signals-card">
      <div class="signals-header">
        <h3 class="card-title">Example reputation signals</h3>
        <span class="badge badge-sample">Sample</span>
      </div>
      <p class="signals-note">What ongoing monitoring would surface. These are illustrations, not live alerts.</p>
      <div class="signals-list">
        ${p.sampleSignals.map(
          (s) => html`<div class="signal signal-${s.tone}"><strong>${s.tone === 'positive' ? 'Positive' : 'Needs attention'} (${s.platform}):</strong> ${s.message}</div>`,
        )}
      </div>
    </div>`}

    ${socials.length === 0
      ? html`<div class="card"><p>No social accounts in this profile yet.</p></div>`
      : html`<h3 class="subsection-title">Audience and engagement</h3>
        <div class="metrics-grid social-grid">
          ${socials.map(
            (s) => html`<div class="metric-card platform-top-${s.id}">
              <div class="platform-heading">${platformName[s.id]}</div>
              <div class="metric-value ${s.id}-color">${num(s.followers)}</div>
              <div class="metric-label">Followers</div>
              <div class="metric-footer"><span>Posts: ${num(s.posts)}</span><span>Engagement: ${s.engagementRate}%</span></div>
            </div>`,
          )}
        </div>`}

    ${withResponse.length > 0 &&
    html`<h3 class="subsection-title">Time to answer messages and comments</h3>
      <div class="card">
        <div class="bar-chart-container">
          ${withResponse.map((s) => bar(platformName[s.id], percentWidth(s.responseHours!, slowest), hours(s.responseHours!), `${s.id}-bg`))}
        </div>
        <p class="chart-note">Shorter bars mean faster replies.</p>
      </div>`}

    <div class="grid-2col">
      ${p.checklists.socialContent.length > 0 &&
      html`<div class="card"><h3 class="card-title">Content checklist</h3>${checklist(p.checklists.socialContent)}</div>`}
      ${p.growthIdeas.length > 0 &&
      html`<div class="card">
        <h3 class="card-title">Where growth could come from</h3>
        <div class="strategy-items">
          ${p.growthIdeas.map(
            (g) => html`<div class="strategy-item">
              <h4>${g.title} <span class="muted">(${platformName[g.platform]}, potential ${g.potential} out of 100)</span></h4>
              <div class="progress-bar" aria-hidden="true"><div class="progress-fill ${g.platform}-bg" data-width="${percentWidth(g.potential, 100)}"></div></div>
              <span class="progress-label">${g.note}</span>
            </div>`,
          )}
        </div>
      </div>`}
    </div>`;
}
