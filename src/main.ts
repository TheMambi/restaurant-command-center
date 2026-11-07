import '@fontsource-variable/onest';
import '@fontsource-variable/fraunces';
import './styles/tokens.css';
import './styles/app.css';
import { monthLabel } from './format';
import { html } from './html';
import { loadProfiles } from './profiles';
import { renderCompetitor } from './render/competitor';
import { renderGoogle } from './render/google';
import { historySeries, renderHistory } from './render/history';
import { renderOpportunities } from './render/opportunities';
import { renderOverview } from './render/overview';
import { renderReviews } from './render/reviews';
import { renderSocial } from './render/social';
import { renderWebsite } from './render/website';
import type { Profile } from './schema';
import { overallScore, scoreBreakdown } from './scoring';

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
const isTab = (v: string | null | undefined): v is TabId => tabs.some((t) => t.id === v);

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} in index.html`);
  return found as T;
}

function describeRestaurant(p: Profile): string {
  const r = p.restaurant;
  const age = Number(p.asOf.slice(0, 4)) - r.yearOpened;
  return `${r.cuisine} restaurant in ${r.neighborhood}, ${r.city}. Open ${age} ${age === 1 ? 'year' : 'years'}, price range ${r.priceRange}.`;
}

function render(profile: Profile, active: TabId): void {
  const breakdown = scoreBreakdown(profile);
  const score = overallScore(breakdown);
  const r = profile.restaurant;

  document.title = `${r.name}: online presence report | Restaurant Command Center`;
  el('restaurant-name').textContent = r.name;
  el('restaurant-meta').textContent = describeRestaurant(profile);
  el('masthead-note').innerHTML = html`${profile.sampleData && html`<span class="sample-flag">Sample data</span>`}Report as of ${monthLabel(profile.asOf)}`.value;
  el('footer-text').innerHTML = html`<p>${r.name}, ${r.address}. Website: ${r.website}</p>${
    profile.sampleData && html`<p>A fictional restaurant. Every name and number in this report is sample data.</p>`
  }`.value;

  const series = historySeries(profile, score);
  const panels: Record<TabId, string> = {
    overview: renderOverview(profile, score, breakdown, series).value,
    google: renderGoogle(profile).value,
    website: renderWebsite(profile).value,
    social: renderSocial(profile).value,
    reviews: renderReviews(profile).value,
    competitor: renderCompetitor(profile).value,
    opportunities: renderOpportunities(profile).value,
    history: renderHistory(profile, series).value,
  };
  for (const t of tabs) el(`tab-${t.id}`).innerHTML = panels[t.id];
  // Wide tables can scroll sideways on small screens, so keyboard users need to reach them.
  document.querySelectorAll<HTMLElement>('.table-wrap').forEach((wrap) => {
    const title = wrap.closest('section')?.querySelector('.block-title')?.textContent ?? 'Table';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', `${title}, table`);
  });
  selectTab(active, false);
}

function selectTab(id: TabId, focus: boolean): void {
  for (const t of tabs) {
    const button = el<HTMLButtonElement>(`tabbtn-${t.id}`);
    const selected = t.id === id;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    el(`tab-${t.id}`).hidden = !selected;
    if (selected && focus) button.focus();
  }
}

function writeUrl(slug: string, tab: TabId): void {
  const url = new URL(location.href);
  url.searchParams.set('r', slug);
  if (tab === 'overview') url.searchParams.delete('tab');
  else url.searchParams.set('tab', tab);
  history.replaceState(null, '', url);
}

function setupMode(): void {
  const toggle = el<HTMLButtonElement>('mode-toggle');
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const saved = (): string | null => {
    try {
      return localStorage.getItem('rcc-mode');
    } catch {
      return null;
    }
  };
  // The button names the mode it switches to.
  const apply = (mode: 'light' | 'dark') => {
    root.dataset.mode = mode;
    toggle.textContent = mode === 'dark' ? 'Light mode' : 'Dark mode';
  };
  apply(root.dataset.mode === 'dark' ? 'dark' : 'light');
  system.addEventListener('change', (e) => {
    if (!saved()) apply(e.matches ? 'dark' : 'light');
  });
  toggle.addEventListener('click', () => {
    const next = root.dataset.mode === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem('rcc-mode', next);
    } catch {
      // Storage can be unavailable in private browsing; the choice still applies for this visit.
    }
  });
  // Reports print on paper, so printing always uses the light colours.
  let before: string | undefined;
  window.addEventListener('beforeprint', () => {
    before = root.dataset.mode;
    root.dataset.mode = 'light';
  });
  window.addEventListener('afterprint', () => {
    if (before) root.dataset.mode = before;
  });
}

function start(): void {
  const profiles = loadProfiles();
  const params = new URLSearchParams(location.search);
  let profile = profiles.find((p) => p.slug === params.get('r')) ?? profiles[0]!;
  const requested = params.get('tab');
  let active: TabId = isTab(requested) ? requested : 'overview';

  const switcher = el<HTMLSelectElement>('restaurant-switcher');
  switcher.innerHTML = profiles.map((p) => html`<option value="${p.slug}">${p.restaurant.name}</option>`.value).join('');
  switcher.value = profile.slug;
  switcher.addEventListener('change', () => {
    profile = profiles.find((p) => p.slug === switcher.value)!;
    writeUrl(profile.slug, active);
    render(profile, active);
    el('announcer').textContent = `Showing ${profile.restaurant.name}`;
  });

  const nav = el('nav-tabs');
  nav.innerHTML = tabs
    .map((t) => html`<button class="tab" role="tab" type="button" id="tabbtn-${t.id}" aria-controls="tab-${t.id}">${t.label}</button>`.value)
    .join('');
  const choose = (id: TabId, focus: boolean) => {
    active = id;
    selectTab(id, focus);
    writeUrl(profile.slug, id);
  };
  nav.addEventListener('click', (e) => {
    const id = (e.target as HTMLElement).closest('button')?.id.replace('tabbtn-', '');
    if (isTab(id)) choose(id, false);
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
    choose(tabs[target]!.id, true);
  });

  const main = el('panels');
  main.innerHTML = tabs
    .map((t) => html`<section class="panel" id="tab-${t.id}" role="tabpanel" aria-labelledby="tabbtn-${t.id}" tabindex="0" hidden></section>`.value)
    .join('');
  main.addEventListener('click', (e) => {
    const goto = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]')?.dataset.goto;
    if (!isTab(goto)) return;
    choose(goto, true);
    el('nav-tabs').scrollIntoView({ block: 'start' });
  });

  el('print-report').addEventListener('click', () => window.print());
  setupMode();
  render(profile, active);
}

try {
  start();
} catch (error) {
  const box = document.createElement('div');
  box.className = 'load-error';
  box.setAttribute('role', 'alert');
  box.textContent = `The report could not load.\n\n${error instanceof Error ? error.message : String(error)}`;
  document.body.prepend(box);
  throw error;
}
