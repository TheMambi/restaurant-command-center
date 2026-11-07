import { num, platformName, signed, stars } from '../format';
import { html, percentWidth, type SafeHtml } from '../html';
import { reviewPlatformIds, socialPlatformIds, type Profile } from '../schema';
import { evenThresholds } from '../scoring.config';

type Cell = number | undefined;
interface Row {
  metric: string;
  self: Cell;
  rival: Cell;
  kind: 'rating' | 'count';
}

export function gapText(self: Cell, rival: Cell, kind: Row['kind']): { text: string; css: string } {
  if (self === undefined || rival === undefined) return { text: 'No data', css: '' };
  if (kind === 'rating') {
    const diff = self - rival;
    if (Math.abs(diff) < evenThresholds.stars) return { text: 'Even', css: 'gap-even' };
    return { text: `${signed(diff, 1)} stars`, css: diff > 0 ? 'gap-ahead' : 'gap-behind' };
  }
  if (rival === 0) return self === 0 ? { text: 'Even', css: 'gap-even' } : { text: 'Ahead', css: 'gap-ahead' };
  const pct = ((self - rival) / rival) * 100;
  if (Math.abs(pct) < evenThresholds.percent) return { text: 'Even', css: 'gap-even' };
  return { text: `${signed(pct)}%`, css: pct > 0 ? 'gap-ahead' : 'gap-behind' };
}

export function renderCompetitor(p: Profile): SafeHtml {
  const c = p.competitor;
  const me = p.restaurant;
  const rows: Row[] = [];
  for (const id of reviewPlatformIds) {
    const a = p.reviewPlatforms.find((r) => r.id === id);
    const b = c.reviewPlatforms.find((r) => r.id === id);
    if (!a && !b) continue;
    rows.push({ metric: `${platformName[id]} rating`, self: a?.rating, rival: b?.rating, kind: 'rating' });
    rows.push({ metric: `${platformName[id]} reviews`, self: a?.reviews, rival: b?.reviews, kind: 'count' });
    if (a?.photos !== undefined || b?.photos !== undefined) {
      rows.push({ metric: `${platformName[id]} photos`, self: a?.photos, rival: b?.photos, kind: 'count' });
    }
  }
  for (const id of socialPlatformIds) {
    const a = p.socialPlatforms.find((s) => s.id === id);
    const b = c.socialPlatforms.find((s) => s.id === id);
    if (!a && !b) continue;
    rows.push({ metric: `${platformName[id]} followers`, self: a?.followers, rival: b?.followers, kind: 'count' });
  }
  const year = Number(p.asOf.slice(0, 4));
  const versus = rows.filter((r) => r.kind === 'count' && r.self !== undefined && r.rival !== undefined);
  const show = (v: Cell, kind: Row['kind']) => (v === undefined ? '—' : kind === 'rating' ? `${stars(v)} ★` : num(v));

  return html`
    <div class="section-header"><h2>Competitor comparison</h2><p>${me.name} next to ${c.name}, a nearby ${me.cuisine} restaurant</p></div>
    <div class="card competitor-table-card">
      <h3 class="card-title">Side by side</h3>
      <div class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead><tr><th scope="col">Measure</th><th scope="col" class="col-self">${me.name}</th><th scope="col" class="col-rival">${c.name}</th><th scope="col">Difference</th></tr></thead>
          <tbody>
            ${rows.map((r) => {
              const gap = gapText(r.self, r.rival, r.kind);
              return html`<tr><th scope="row">${r.metric}</th><td class="col-self">${show(r.self, r.kind)}</td><td class="col-rival">${show(r.rival, r.kind)}</td><td><span class="${gap.css}">${gap.text}</span></td></tr>`;
            })}
            <tr><th scope="row">Years open</th><td class="col-self">${year - me.yearOpened}</td><td class="col-rival">${year - c.yearOpened}</td><td></td></tr>
            <tr><th scope="row">Price range</th><td class="col-self">${me.priceRange}</td><td class="col-rival">${c.priceRange}</td><td><span class="${me.priceRange === c.priceRange ? 'gap-even' : ''}">${me.priceRange === c.priceRange ? 'Same' : 'Different'}</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    ${versus.length > 0 &&
    html`<div class="card">
      <h3 class="card-title">Head to head</h3>
      <div class="versus-chart">
        ${versus.map((r) => {
          const max = Math.max(r.self!, r.rival!);
          return html`<div class="versus-row">
            <span class="vs-label">${r.metric}</span>
            <div class="vs-bars">
              <div class="vs-bar-left"><div class="vs-fill-left" data-width="${percentWidth(r.self!, max)}"><span>${num(r.self!)}</span></div></div>
              <div class="vs-divider" aria-hidden="true">vs</div>
              <div class="vs-bar-right"><div class="vs-fill-right" data-width="${percentWidth(r.rival!, max)}"><span>${num(r.rival!)}</span></div></div>
            </div>
          </div>`;
        })}
      </div>
      <div class="versus-legend"><span class="legend-self"><span aria-hidden="true">● </span>${me.name}</span><span class="legend-rival"><span aria-hidden="true">● </span>${c.name}</span></div>
    </div>`}`;
}
