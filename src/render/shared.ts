import { html, type SafeHtml } from '../html';
import type { CheckItem } from '../schema';

const checkSymbols = {
  pass: { css: 'check-pass', icon: '✓', words: 'Done' },
  partial: { css: 'check-warn', icon: '!', words: 'Partly done' },
  fail: { css: 'check-fail', icon: '✗', words: 'Missing' },
} as const;

export function checklist(items: CheckItem[]): SafeHtml {
  return html`<ul class="checklist">${items.map((item) => {
    const s = checkSymbols[item.status];
    return html`<li class="check-item ${s.css}"><span class="check-icon" aria-hidden="true">${s.icon}</span><span class="sr-only">${s.words}: </span>${item.label}</li>`;
  })}</ul>`;
}

export function bar(label: string, width: string, text: string, colorClass: string): SafeHtml {
  return html`<div class="bar-chart-row">
    <span class="bar-label">${label}</span>
    <div class="bar-track"><div class="bar-fill ${colorClass}" data-width="${width}"><span>${text}</span></div></div>
  </div>`;
}

export function sectionHeader(title: string, subtitle: string): SafeHtml {
  return html`<div class="section-header"><h2>${title}</h2><p>${subtitle}</p></div>`;
}
