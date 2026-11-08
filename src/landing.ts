import '@fontsource-variable/onest';
import '@fontsource-variable/fraunces/opsz.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/landing.css';
import { animate, scroll, stagger } from 'motion';
import { num } from './format';
import { html } from './html';
import { beatOpacity, mountSequence } from './landing/sequence';
import { loadProfiles } from './profiles';
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
  el('parts-list').innerHTML = keys
    .map(
      (k) => html`<li class="part">
        <p class="part-weight"><span class="part-figure">${total > 0 ? Math.round((scoreWeights[k] / total) * 100) : 0}</span><span class="part-unit">%</span></p>
        <h3 class="part-name">${scoreLabels[k]}</h3>
        <p class="part-note">${partNotes[k]}</p>
      </li>`.value,
    )
    .join('');
}

function renderSamples(): void {
  el('samples-list').innerHTML = loadProfiles()
    .map((p) => {
      const score = overallScore(scoreBreakdown(p));
      const r = p.restaurant;
      return html`<li>
        <a class="sample" href="/report/?r=${p.slug}">
          <span class="sample-name">${r.name}</span>
          <span class="sample-meta">${r.cuisine} restaurant in ${r.neighborhood}, ${r.city}</span>
          <span class="sample-score"><span class="sample-figure">${score}</span><span class="sample-of">out of 100</span><span class="sample-label">${scoreLabel(score)}</span></span>
          <span class="sample-open">Open the report</span>
        </a>
      </li>`.value;
    })
    .join('');
}

function setupHero(): void {
  const hero = el('hero');
  // Reduced motion, or Data Saver, gets the finished frame alone instead of all 120.
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const still = saveData || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = getComputedStyle(document.documentElement).getPropertyValue('--color-stage').trim();
  const sequence = mountSequence(el<HTMLCanvasElement>('hero-canvas'), stage, still);
  const beats = [...hero.querySelectorAll<HTMLElement>('.beat')].map((node) => ({
    node,
    from: Number(node.dataset.from),
    to: Number(node.dataset.to),
  }));

  if (still) {
    hero.classList.add('is-still');
    return;
  }

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

function setupBar(): void {
  const bar = document.querySelector<HTMLElement>('.landing-bar');
  if (!bar) throw new Error('Missing .landing-bar in index.html');
  const paper = [...document.querySelectorAll<HTMLElement>('.ledger')];
  const update = () => {
    const y = bar.offsetHeight / 2;
    bar.classList.toggle(
      'is-on-paper',
      paper.some((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      }),
    );
  };
  addEventListener('scroll', update, { passive: true });
  update();
}

try {
  renderParts();
  renderSamples();
  setupHero();
  setupBar();
} catch (error) {
  const box = document.createElement('div');
  box.className = 'load-error';
  box.setAttribute('role', 'alert');
  box.textContent = `The page could not load.\n\n${error instanceof Error ? error.message : String(error)}`;
  document.body.prepend(box);
  throw error;
}
