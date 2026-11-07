import './style.css';
import './additions.css';
import { drawHistoryChart } from './chart';
import { monthLabel } from './format';
import { html } from './html';
import { renderCompetitor } from './render/competitor';
import { renderGoogle } from './render/google';
import { historySeries, renderHistory } from './render/history';
import { renderOpportunities } from './render/opportunities';
import { renderOverview } from './render/overview';
import { renderReviews } from './render/reviews';
import { renderSocial } from './render/social';
import { renderWebsite } from './render/website';
import { loadProfiles } from './profiles';
import { overallScore, scoreBreakdown } from './scoring';
import type { Profile } from './schema';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'google', label: 'Google profile' },
  { id: 'website', label: 'Website' },
  { id: 'social', label: 'Social media' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'competitor', label: 'Competitor' },
  { id: 'opportunities', label: 'Next steps' },
  { id: 'history', label: 'Progress' },
] as const;
type TabId = (typeof tabs)[number]['id'];

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

function render(profile: Profile, activeTab: TabId): void {
  const breakdown = scoreBreakdown(profile);
  const score = overallScore(breakdown);
  const series = historySeries(profile, score);
  const r = profile.restaurant;

  document.title = `${r.name} | Restaurant Command Center`;
  el('restaurant-name').textContent = r.name;
  el('restaurant-meta').textContent = `${r.cuisine} · ${r.neighborhood}, ${r.city}`;
  el('as-of').textContent = `Data as of ${monthLabel(profile.asOf)}`;
  el('sample-badge').hidden = !profile.sampleData;
  el('footer-text').innerHTML = html`${r.name} · ${r.address} · ${r.website}${profile.sampleData && html`<br><span class="footer-note">Fictional restaurant. Every name and number on this page is sample data.</span>`}`.value;

  const panels: Record<TabId, string> = {
    overview: renderOverview(profile, score, breakdown).value,
    google: renderGoogle(profile).value,
    website: renderWebsite(profile).value,
    social: renderSocial(profile).value,
    reviews: renderReviews(profile).value,
    competitor: renderCompetitor(profile).value,
    opportunities: renderOpportunities(profile).value,
    history: renderHistory(profile, series).value,
  };
  for (const t of tabs) el(`tab-${t.id}`).innerHTML = panels[t.id];

  drawHistoryChart(el<HTMLCanvasElement>('growthChart'), series);
  selectTab(activeTab, false);
}

function selectTab(id: TabId, focus: boolean): void {
  for (const t of tabs) {
    const button = el<HTMLButtonElement>(`tabbtn-${t.id}`);
    const selected = t.id === id;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    el(`tab-${t.id}`).classList.toggle('active', selected);
    if (selected && focus) button.focus();
  }
  animate(el(`tab-${id}`));
}

function animate(panel: HTMLElement): void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() => {
    panel.querySelectorAll<HTMLElement>('[data-width]').forEach((bar) => {
      bar.style.width = reduce ? bar.dataset.width! : '0%';
    });
    panel.querySelectorAll<SVGCircleElement>('.ring-fill[data-offset]').forEach((ring) => {
      ring.style.strokeDashoffset = ring.dataset.offset!;
    });
    if (reduce) return;
    requestAnimationFrame(() => {
      panel.querySelectorAll<HTMLElement>('[data-width]').forEach((bar) => {
        bar.style.width = bar.dataset.width!;
      });
    });
  });
}

function start(): void {
  const profiles = loadProfiles();
  const params = new URLSearchParams(location.search);
  let profile = profiles.find((p) => p.slug === params.get('r')) ?? profiles[0]!;
  let active: TabId = 'overview';

  const switcher = el<HTMLSelectElement>('restaurant-switcher');
  switcher.innerHTML = profiles.map((p) => html`<option value="${p.slug}">${p.restaurant.name}</option>`.value).join('');
  switcher.value = profile.slug;
  switcher.addEventListener('change', () => {
    profile = profiles.find((p) => p.slug === switcher.value)!;
    const url = new URL(location.href);
    url.searchParams.set('r', profile.slug);
    history.replaceState(null, '', url);
    render(profile, active);
  });

  const nav = el('nav-tabs');
  nav.innerHTML = tabs
    .map((t) => html`<button class="tab" role="tab" id="tabbtn-${t.id}" aria-controls="tab-${t.id}" type="button">${t.label}</button>`.value)
    .join('');
  nav.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest('button');
    if (!button) return;
    active = button.id.replace('tabbtn-', '') as TabId;
    selectTab(active, false);
  });
  nav.addEventListener('keydown', (e) => {
    const index = tabs.findIndex((t) => t.id === active);
    const target =
      e.key === 'ArrowRight' ? (index + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : -1;
    if (target < 0) return;
    e.preventDefault();
    active = tabs[target]!.id;
    selectTab(active, true);
  });

  el('panels').innerHTML = tabs
    .map((t) => html`<section class="tab-content" id="tab-${t.id}" role="tabpanel" aria-labelledby="tabbtn-${t.id}" tabindex="0"></section>`.value)
    .join('');

  render(profile, active);
}

try {
  start();
} catch (error) {
  const box = document.createElement('div');
  box.className = 'load-error';
  box.textContent = error instanceof Error ? error.message : String(error);
  document.body.prepend(box);
  throw error;
}
