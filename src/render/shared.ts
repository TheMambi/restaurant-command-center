import { stars } from '../format';
import { html, type SafeHtml } from '../html';
import type { CheckItem } from '../schema';
import { segments } from './visuals';

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
  const count = (status: CheckItem['status']) => items.filter((i) => i.status === status).length;
  return html`${segments(
    [
      { count: count('pass'), css: 'is-good', word: 'done' },
      { count: count('partial'), css: 'is-warn', word: 'partly done' },
      { count: count('fail'), css: 'is-bad', word: 'missing' },
    ],
    `${count('pass')} of ${items.length} done`,
  )}<ul class="checklist">${items.map((item) => {
    const s = statusWords[item.status];
    return html`<li>${status(s.css, s.mark, s.word)}<span>${item.label}</span></li>`;
  })}</ul>`;
}

export function meter(value: number, max: number, variant: '' | 'is-rival' | 'is-neutral' = ''): SafeHtml {
  const share = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return html`<span class="meter" aria-hidden="true"><svg viewBox="0 0 100 1" preserveAspectRatio="none"><rect class="meter-fill ${variant}" width="${(share * 100).toFixed(1)}" height="1"></rect></svg></span>`;
}

export const emptyMeter = html`<span class="meter is-empty" aria-hidden="true"></span>`;

// A listing with no reviews has no rating, whatever number the profile holds for it.
export function ratingCell(rating: number, reviews: number): SafeHtml | string {
  return reviews > 0 ? stars(rating) : html`<span class="missing">No reviews yet</span>`;
}

export function sectionHeader(title: string, intro: string): SafeHtml {
  return html`<header><h2 class="section-title">${title}</h2><p class="section-intro">${intro}</p></header>`;
}

export function stat(label: string, value: string, note?: string, visual?: SafeHtml): SafeHtml {
  return html`<div class="stat sheet"><dt>${label}</dt><dd>${value}${note && html`<span class="stat-note">${note}</span>`}</dd>${visual}</div>`;
}

export function list(items: string[], emptyText = 'Nothing here right now.'): SafeHtml {
  return items.length > 0 ? html`<ul class="plain-list">${items.map((i) => html`<li>${i}</li>`)}</ul>` : html`<p class="muted">${emptyText}</p>`;
}

export const share = (value: number, total: number): string => `${total > 0 ? Math.round((value / total) * 1000) / 10 : 0}%`;

export const levelWords = { high: 'High', medium: 'Medium', low: 'Low' } as const;
