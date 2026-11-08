import { hours, num, platformName } from '../format';
import { html, type SafeHtml } from '../html';
import type { Profile } from '../schema';
import { checklist, levelWords, meter, sectionHeader } from './shared';

export function renderSocial(p: Profile): SafeHtml {
  const socials = p.socialPlatforms;
  const maxFollowers = Math.max(0, ...socials.map((s) => s.followers));

  return html`
    ${sectionHeader('Social media', 'Who follows the restaurant, how they respond, and how fast the team answers them.')}

    <section class="card" aria-labelledby="audience-title">
      <h3 class="block-title" id="audience-title">Accounts</h3>
      ${socials.length === 0
        ? html`<p class="muted">No social accounts in this profile yet.</p>`
        : html`<div class="table-wrap"><table class="stack-table">
          <thead><tr><th scope="col">Platform</th><th scope="col" class="num">Followers</th><th scope="col" class="col-meter hide-narrow"><span class="sr-only">Followers compared</span></th><th scope="col" class="num">Posts</th><th scope="col" class="num">Engagement</th><th scope="col" class="num">Typical reply</th></tr></thead>
          <tbody>
            ${socials.map(
              (s) => html`<tr><th scope="row">${platformName[s.id]}</th><td class="num" data-label="Followers">${num(s.followers)}</td><td class="hide-narrow">${meter(s.followers, maxFollowers)}</td><td class="num" data-label="Posts">${num(s.posts)}</td><td class="num" data-label="Engagement">${s.engagementRate}%</td><td class="num" data-label="Typical reply">${s.responseHours === undefined ? 'Not measured' : hours(s.responseHours)}</td></tr>`,
            )}
          </tbody>
        </table></div>
        <p class="small muted mt-3">Engagement is likes, comments and shares per post, divided by followers.</p>`}
    </section>

    <div class="grid-2">
      <section class="card" aria-labelledby="growth-title">
        <h3 class="block-title" id="growth-title">Where growth could come from</h3>
        ${p.growthIdeas.length === 0
          ? html`<p class="muted">No growth ideas noted yet.</p>`
          : html`<table>
            <thead><tr><th scope="col">Idea</th><th scope="col">Potential</th></tr></thead>
            <tbody>
              ${p.growthIdeas.map(
                (g) => html`<tr><th scope="row">${g.title}<span class="row-note">${platformName[g.platform]}. ${g.note}</span></th><td>${levelWords[g.potential]}</td></tr>`,
              )}
            </tbody>
          </table>`}
      </section>

      <section class="card" aria-labelledby="content-title">
        <h3 class="block-title" id="content-title">Content checklist</h3>
        ${checklist(p.checklists.socialContent)}
      </section>
    </div>

    ${p.sampleSignals.length > 0 &&
    html`<section class="card" aria-labelledby="signals-title">
      <h3 class="block-title" id="signals-title">What monitoring would flag</h3>
      <p class="small muted">Examples written for this sample, not live alerts.</p>
      <ul class="plain-list mt-3">
        ${p.sampleSignals.map(
          (s) => html`<li><strong>${s.tone === 'positive' ? 'Worth sharing' : 'Needs a reply'}, ${s.platform}.</strong> ${s.message}</li>`,
        )}
      </ul>
    </section>`}`;
}
