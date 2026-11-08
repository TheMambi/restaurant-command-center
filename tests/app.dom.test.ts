// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

const page = readFileSync(join(import.meta.dirname, '..', 'report', 'index.html'), 'utf8');
const tabIds = ['overview', 'google', 'website', 'social', 'reviews', 'competitor', 'opportunities', 'history'];

beforeAll(async () => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  window.history.replaceState(null, '', '/?r=brasa-taqueria&tab=competitor');
  document.body.innerHTML = page.slice(page.indexOf('<body>') + 6, page.indexOf('<script type="module"'));
  await import('../src/main');
});

const selected = () => document.querySelector('[role="tab"][aria-selected="true"]')?.id;

describe('the app in a browser-like DOM', () => {
  it('opens the restaurant and tab named in the address', () => {
    expect(document.getElementById('restaurant-name')?.textContent).toBe('Brasa Taquería');
    expect(selected()).toBe('tabbtn-competitor');
    expect(document.getElementById('tab-competitor')?.hidden).toBe(false);
    expect(document.getElementById('tab-overview')?.hidden).toBe(true);
  });

  it('moves between tabs with the arrow, Home and End keys and keeps the address in step', () => {
    const nav = document.getElementById('nav-tabs')!;
    nav.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(selected()).toBe('tabbtn-opportunities');
    expect(new URL(location.href).searchParams.get('tab')).toBe('opportunities');
    nav.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(selected()).toBe('tabbtn-overview');
    expect(new URL(location.href).searchParams.has('tab')).toBe(false);
    nav.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(selected()).toBe('tabbtn-history');
  });

  it('switches restaurants from the picker', () => {
    const picker = document.getElementById('restaurant-switcher') as HTMLSelectElement;
    picker.value = 'osteria-lumen';
    picker.dispatchEvent(new Event('change'));
    expect(document.getElementById('restaurant-name')?.textContent).toBe('Osteria Lumen');
    expect(new URL(location.href).searchParams.get('r')).toBe('osteria-lumen');
  });

  const cases = ['brasa-taqueria', 'osteria-lumen'].flatMap((slug) => tabIds.map((id) => [slug, id] as const));
  it.each(cases)('%s, %s tab: passes axe structure and ARIA checks', async (slug, id) => {
    const picker = document.getElementById('restaurant-switcher') as HTMLSelectElement;
    if (picker.value !== slug) {
      picker.value = slug;
      picker.dispatchEvent(new Event('change'));
    }
    document.getElementById(`tabbtn-${id}`)!.click();
    const result = await axe.run(document.body, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      // Colour contrast needs a real layout engine; it is checked in a browser instead.
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  });
});
