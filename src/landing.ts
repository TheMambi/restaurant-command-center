import '@fontsource-variable/onest';
import '@fontsource-variable/fraunces/opsz.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/landing.css';
import { animate, scroll, stagger } from 'motion';
import { num } from './format';
import { html, setHtml } from './html';
import { beatOpacity, mountSequence } from './landing/sequence';
import { loadProfiles } from './profiles';
import { doFirst } from './render/overview';
import { dial, radar } from './render/visuals';
import { overallScore, scoreBreakdown, scoreLabel, type ScoreKey } from './scoring';
import { scoreLabels, scoreTargets, scoreWeights } from './scoring.config';

export const partNotes: Record<ScoreKey, string> = {
  reputation: `Average star rating across platforms, weighted by review count. ${scoreTargets.ratingFloor} stars scores 0; ${scoreTargets.ratingCeiling} or better scores 100.`,
  reviewVolume: `Total reviews across platforms against a target of ${num(scoreTargets.totalReviews)}.`,
  googleProfile: 'Share of the Google Business Profile checklist done. Partly done counts as half.',
  website: 'The search engine checklist and the phone experience, averaged.',
  social: `Followers against ${num(scoreTargets.followersPerPlatform)} and engagement against ${scoreTargets.engagementRatePercent}% on each platform.`,
  responsiveness: 'Share of the review reply checklist done.',
};

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

function renderParts(): void {
  const keys = Object.keys(scoreWeights) as ScoreKey[];
  const total = keys.reduce((s, k) => s + scoreWeights[k], 0);
  const share = (k: ScoreKey) => (total > 0 ? (scoreWeights[k] / total) * 100 : 0);
  // One bar split by weight: each part's slice is as wide as its share of the score.
  let x = 0;
  setHtml(
    el('weights-bar'),
    keys.map((k, i) => {
      const w = share(k);
      const rect = html`<rect class="weight-slice is-${i % 2 === 0 ? 'a' : 'b'}" x="${x.toFixed(2)}" width="${Math.max(0, w - 0.4).toFixed(2)}" height="1"></rect>`;
      x += w;
      return rect;
    }),
  );
  setHtml(
    el('parts-list'),
    keys.map(
      (k) => html`<li class="part">
        <p class="part-weight"><span class="part-figure">${Math.round(share(k))}</span><span class="part-unit">%</span></p>
        <h3 class="part-name">${scoreLabels[k]}</h3>
        <p class="part-note">${partNotes[k]}</p>
      </li>`,
    ),
  );
}

function renderSamples(): void {
  const keys = Object.keys(scoreWeights) as ScoreKey[];
  setHtml(
    el('samples-list'),
    loadProfiles().map((p) => {
      const breakdown = scoreBreakdown(p);
      const score = overallScore(breakdown);
      const r = p.restaurant;
      const first = doFirst(p.opportunities, 1)[0];
      return html`<li>
        <a class="sample sheet" href="/report/?r=${p.slug}">
          <span class="sample-plate">${dial(score, `${score} out of 100`, 'sample-figure')}<span class="sample-label">${scoreLabel(score)}</span></span>
          <span class="sample-body">
            <span class="sample-name">${r.name}</span>
            <span class="sample-meta">${r.cuisine} restaurant in ${r.neighborhood}, ${r.city}</span>
            ${radar(keys.map((k) => ({ label: scoreLabels[k], value: breakdown[k] })))}
            ${first && html`<span class="sample-first"><span class="sample-first-label">First job this week</span>${first.title}</span>`}
            <span class="sample-open">Open the report</span>
          </span>
        </a>
      </li>`;
    }),
  );
}

function setupHero(): void {
  const hero = el('hero');
  // Reduced motion, or Data Saver, gets the finished frame alone instead of all 120.
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const still = saveData || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = getComputedStyle(document.documentElement).getPropertyValue('--color-stage').trim();
  const beats = [...hero.querySelectorAll<HTMLElement>('.beat')].map((node) => ({
    node,
    from: Number(node.dataset.from),
    to: Number(node.dataset.to),
  }));
  // The words' footprint inside the pinned stage. Offsets ignore the fades' transforms, so the
  // measure holds wherever the scroll is. The opening block is left out of the column: the ticket
  // starts clear of it.
  const column = hero.querySelector<HTMLElement>('.hero-beats')!;
  const canvas = el<HTMLCanvasElement>('hero-canvas');
  const bar = document.querySelector<HTMLElement>('.landing-bar')!;
  const reserve = () => ({
    bar: bar.offsetHeight,
    left: Math.max(0, column.offsetLeft - canvas.offsetLeft + Math.max(0, ...beats.filter((b) => !b.node.classList.contains('beat-intro')).map((b) => b.node.offsetLeft + b.node.offsetWidth)) + 24),
    top: Math.max(0, column.offsetTop - canvas.offsetTop + Math.max(0, ...beats.map((b) => b.node.offsetTop + b.node.offsetHeight)) + 16),
  });
  // The stylesheet's default is the words in order; the hero only pins or shows a frame from here on.
  hero.classList.add(still ? 'is-still' : 'is-live');
  const sequence = mountSequence(canvas, stage, still, reserve);
  if (still) return;

  const show = (progress: number) => {
    sequence.show(progress);
    for (const b of beats) {
      const o = beatOpacity(progress, b.from, b.to);
      b.node.style.opacity = String(o);
      b.node.style.transform = `translateY(${(1 - o) * 1.5}rem)`;
      b.node.classList.toggle('is-off', o < 0.02);
    }
  };
  scroll(show, { target: hero, offset: ['start start', 'end end'] });
  show(0);

  // A keyboard user who tabs to a link inside a beat that is scrolled out of view lands where it shows.
  hero.addEventListener('focusin', (e) => {
    const beat = beats.find((b) => b.node.contains(e.target as Node));
    if (!beat) return;
    const length = hero.offsetHeight - innerHeight;
    scrollTo({ top: hero.offsetTop + length * (beat.from + (Math.min(1, beat.to) - beat.from) / 2), behavior: 'instant' });
  });

  animate(
    '.hero-title .line',
    { opacity: [0, 1], transform: ['translateY(0.35em)', 'translateY(0)'] },
    { duration: 1.1, delay: stagger(0.12, { startDelay: 0.15 }), ease: [0.16, 1, 0.3, 1] },
  );
  animate('.beat-intro .beat-text, .scroll-cue', { opacity: [0, 1] }, { duration: 0.9, delay: 0.55 });
}

// The page prints on light paper whatever mode the visitor uses, like the report.
function setupPrint(): void {
  const root = document.documentElement;
  let before: string | undefined;
  addEventListener('beforeprint', () => {
    before = root.dataset.mode;
    root.dataset.mode = 'light';
  });
  addEventListener('afterprint', () => {
    if (before) root.dataset.mode = before;
  });
}

try {
  // The hero first: it needs nothing from the profiles, so a profile that fails to load still
  // leaves the page with its opening.
  setupHero();
  renderParts();
  renderSamples();
  setupPrint();
} catch (error) {
  const box = document.createElement('div');
  box.className = 'load-error';
  box.setAttribute('role', 'alert');
  box.textContent = `The page could not load.\n\n${error instanceof Error ? error.message : String(error)}`;
  document.body.prepend(box);
  throw error;
}
