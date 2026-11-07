import { html, type SafeHtml } from '../html';
import type { CheckItem } from '../schema';

export const statusWords = {
  pass: { css: 'is-good', mark: '✓', word: 'Done' },
  partial: { css: 'is-warn', mark: '!', word: 'Partly done' },
  fail: { css: 'is-bad', mark: '✗', word: 'Missing' },
} as const;

export function status(css: string, mark: string, word: string): SafeHtml {
  return html`<span class="status ${css}"><span class="status-mark" aria-hidden="true">${mark}</span>${word}</span>`;
}

export function checklist(items: CheckItem[], emptyText = 'Nothing to check yet.'): SafeHtml {
  if (items.length === 0) return html`<p class="muted">${emptyText}</p>`;
  return html`<ul class="checklist">${items.map((item) => {
    const s = statusWords[item.status];
    return html`<li>${status(s.css, s.mark, s.word)}<span>${item.label}</span></li>`;
  })}</ul>`;
}

export function meter(value: number, max: number, variant: '' | 'is-rival' | 'is-neutral' = ''): SafeHtml {
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return html`<span class="meter" aria-hidden="true"><span class="meter-fill ${variant}" style="transform: scaleX(${share.toFixed(3)})"></span></span>`;
}

export function sectionHeader(title: string, intro: string): SafeHtml {
  return html`<header><h2 class="section-title">${title}</h2><p class="section-intro">${intro}</p></header>`;
}

export function stat(label: string, value: string, note?: string): SafeHtml {
  return html`<div class="stat"><dt>${label}</dt><dd>${value}${note && html`<span class="stat-note">${note}</span>`}</dd></div>`;
}

export function list(items: string[], emptyText = 'Nothing here right now.'): SafeHtml {
  return items.length > 0 ? html`<ul class="plain-list">${items.map((i) => html`<li>${i}</li>`)}</ul>` : html`<p class="muted">${emptyText}</p>`;
}

export const share = (value: number, total: number): string => `${total > 0 ? Math.round((value / total) * 1000) / 10 : 0}%`;

export const levelWords = { high: 'High', medium: 'Medium', low: 'Low' } as const;
