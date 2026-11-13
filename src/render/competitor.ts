import { num, platformName, signed, stars } from '../format';
import { html, type SafeHtml } from '../html';
import { reviewPlatformIds, socialPlatformIds, type Profile } from '../schema';
import { evenThresholds } from '../scoring.config';
import { emptyMeter, meter, sectionHeader } from './shared';
import { segments } from './visuals';

type Cell = number | undefined;
interface Row {
  platform: string;
  metric: string;
  self: Cell;
  rival: Cell;
  kind: 'rating' | 'count';
}
export type Tone = 'ahead' | 'behind' | 'even';

export function gapText(self: Cell, rival: Cell, kind: Row['kind'], names = { self: 'You', rival: 'They' }): { text: string; tone: Tone } {
  if (self === undefined && rival === undefined) return { text: 'Neither is listed', tone: 'even' };
  if (self === undefined) return { text: `Only ${names.rival} is listed`, tone: 'behind' };
  if (rival === undefined) return { text: `Only ${names.self} is listed`, tone: 'ahead' };
  if (kind === 'rating') {
    const diff = self - rival;
    if (Math.abs(diff) < evenThresholds.stars) return { text: 'Even', tone: 'even' };
    return { text: `${signed(diff, 1)} stars`, tone: diff > 0 ? 'ahead' : 'behind' };
  }
  if (rival === 0) return self === 0 ? { text: 'Even', tone: 'even' } : { text: 'Ahead', tone: 'ahead' };
  const ratio = self / rival;
  if (ratio >= evenThresholds.timesFrom) return { text: `${ratio.toFixed(1)} times as many`, tone: 'ahead' };
  if (self > 0 && rival / self >= evenThresholds.timesFrom) return { text: `${(rival / self).toFixed(1)} times fewer`, tone: 'behind' };
  const pct = (ratio - 1) * 100;
  if (Math.abs(pct) < evenThresholds.percent) return { text: 'Even', tone: 'even' };
  return { text: `${signed(pct)}%`, tone: pct > 0 ? 'ahead' : 'behind' };
}

export function comparisonRows(p: Profile): Row[] {
  const c = p.competitor;
  const rows: Row[] = [];
  for (const id of reviewPlatformIds) {
    const a = p.reviewPlatforms.find((r) => r.id === id);
    const b = c.reviewPlatforms.find((r) => r.id === id);
    if (!a && !b) continue;
    // An empty cell reads as "Not listed", so it may only mean the platform is missing. A listing with no
    // reviews has no rating, and a photo count nobody took is not a zero: those rows are left out instead.
    if (a?.reviews !== 0 && b?.reviews !== 0) {
      rows.push({ platform: id, metric: `${platformName[id]} rating`, self: a?.rating, rival: b?.rating, kind: 'rating' });
    }
    rows.push({ platform: id, metric: `${platformName[id]} reviews`, self: a?.reviews, rival: b?.reviews, kind: 'count' });
    if (a?.photos !== undefined && b?.photos !== undefined) {
      rows.push({ platform: id, metric: `${platformName[id]} photos`, self: a.photos, rival: b.photos, kind: 'count' });
    }
  }
  for (const id of socialPlatformIds) {
    const a = p.socialPlatforms.find((s) => s.id === id);
    const b = c.socialPlatforms.find((s) => s.id === id);
    if (!a && !b) continue;
    rows.push({ platform: id, metric: `${platformName[id]} followers`, self: a?.followers, rival: b?.followers, kind: 'count' });
  }
  return rows;
}

// A platform only one side uses counts once, not once per measure, so a missing listing isn't triple-counted.
export function standing(p: Profile): { ahead: number; behind: number; total: number } {
  const names = { self: p.restaurant.name, rival: p.competitor.name };
  const seenMissing = new Set<string>();
  const rows = comparisonRows(p).filter((r) => {
    if (r.self !== undefined && r.rival !== undefined) return true;
    if (seenMissing.has(r.platform)) return false;
    seenMissing.add(r.platform);
    return true;
  });
  const tones = rows.map((r) => gapText(r.self, r.rival, r.kind, names).tone);
  return { ahead: tones.filter((t) => t === 'ahead').length, behind: tones.filter((t) => t === 'behind').length, total: rows.length };
}

export function yearsGap(self: number, rival: number): string {
  const d = self - rival;
  if (d === 0) return 'Same';
  return `${Math.abs(d)} ${Math.abs(d) === 1 ? 'year' : 'years'} ${d > 0 ? 'more' : 'fewer'}`;
}

export function renderCompetitor(p: Profile): SafeHtml {
  const c = p.competitor;
  const me = p.restaurant;
  const names = { self: me.name, rival: c.name };
  const rows = comparisonRows(p);
  const s = standing(p);
  const year = Number(p.asOf.slice(0, 4));
  const show = (v: Cell, kind: Row['kind']) => (v === undefined ? 'Not listed' : kind === 'rating' ? stars(v) : num(v));
  const bar = (v: Cell, max: number, variant: '' | 'is-rival') =>
    v === undefined ? emptyMeter : meter(v, max, variant);

  return html`
    ${sectionHeader('Competitor', `${me.name} next to ${c.name}, a nearby ${me.cuisine} restaurant. Ahead on ${s.ahead} of ${s.total} measures, behind on ${s.behind}.`)}

    <section class="card sheet" aria-labelledby="compare-title">
      <div class="block-head">
        <h3 class="block-title" id="compare-title">Side by side</h3>
        <p class="legend hide-narrow" aria-hidden="true"><span><span class="swatch"></span>${me.name}</span><span><span class="swatch is-rival"></span>${c.name}</span></p>
      </div>
      ${segments(
        [
          { count: s.ahead, css: 'is-good', word: 'ahead' },
          { count: s.total - s.ahead - s.behind, css: 'is-even', word: 'even' },
          { count: s.behind, css: 'is-bad', word: 'behind' },
        ],
        `Ahead on ${s.ahead} of ${s.total} measures`,
      )}
      <div class="table-wrap"><table class="stack-table">
        <thead><tr><th scope="col">Measure</th><th scope="col" class="num">${me.name}</th><th scope="col" class="num">${c.name}</th><th scope="col">Difference</th><th scope="col" class="col-meter-narrow hide-narrow"><span class="sr-only">Bars</span></th></tr></thead>
        <tbody>
          ${rows.map((r) => {
            const gap = gapText(r.self, r.rival, r.kind, names);
            const max = Math.max(r.self ?? 0, r.rival ?? 0, r.kind === 'rating' ? 5 : 0);
            return html`<tr>
              <th scope="row">${r.metric}</th>
              <td class="num" data-label="${me.name}">${show(r.self, r.kind)}</td>
              <td class="num muted" data-label="${c.name}">${show(r.rival, r.kind)}</td>
              <td data-label="Difference"><span><span class="gap is-${gap.tone}">${gap.text}</span>${gap.tone !== 'even' && gap.text !== 'Ahead' && html` <span class="gap-word">${gap.tone === 'ahead' ? 'Ahead' : 'Behind'}</span>`}</span></td>
              <td class="hide-narrow"><span class="pair">${bar(r.self, max, '')}${bar(r.rival, max, 'is-rival')}</span></td>
            </tr>`;
          })}
          <tr><th scope="row">Years open</th><td class="num" data-label="${me.name}">${year - me.yearOpened}</td><td class="num muted" data-label="${c.name}">${year - c.yearOpened}</td><td data-label="Difference">${yearsGap(year - me.yearOpened, year - c.yearOpened)}</td><td class="hide-narrow"></td></tr>
          <tr><th scope="row">Price range</th><td class="num" data-label="${me.name}">${me.priceRange}</td><td class="num muted" data-label="${c.name}">${c.priceRange}</td><td data-label="Difference">${me.priceRange === c.priceRange ? 'Same' : 'Different'}</td><td class="hide-narrow"></td></tr>
        </tbody>
      </table></div>
      <p class="small muted mt-3 hide-narrow">Differences are measured from ${c.name}'s figure. Rating bars run from 0 to 5 stars; count bars compare the two restaurants on each row. A platform only one of them uses counts once in the tally above. Ratings are compared where both have reviews, and photos where both have a count.</p>
    </section>`;
}
