// Serves the production build with the headers from vercel.json and opens every view in Chrome.
// Fails on anything the Content-Security-Policy blocks, any console error, any request to
// another site, or inline code in the built pages. It also opens the landing page with scripts
// off and with its script held back, where the words must still read in order, and runs axe on it.
// Run after `npm run build`: `npm run smoke`.
import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const rules = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8')).headers;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.avif': 'image/avif', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = normalize(join(dist, path.endsWith('/') ? `${path}index.html` : path));
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    for (const rule of rules) {
      if (new RegExp(`^${rule.source.replace('(.*)', '.*')}$`).test(path)) for (const h of rule.headers) res.setHeader(h.key, h.value);
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;

const problems = [];
for (const page of ['index.html', 'report/index.html']) {
  const markup = await readFile(join(dist, page), 'utf8');
  if (/<script(?![^>]*\ssrc=)[^>]*>/.test(markup)) problems.push(`${page}: inline script in the build`);
  if (/<style[\s>]|\sstyle=/.test(markup)) problems.push(`${page}: inline style in the build`);
}

const tabs = ['overview', 'google', 'website', 'social', 'reviews', 'competitor', 'opportunities', 'history'];
// Every restaurant in profiles/, as the app lists them: files starting with an underscore are left out.
const slugs = [];
for (const file of (await readdir(join(root, 'profiles'))).sort()) {
  if (file.endsWith('.json') && !file.startsWith('_')) slugs.push(JSON.parse(await readFile(join(root, 'profiles', file), 'utf8')).slug);
}
const views = ['/', ...slugs.flatMap((r) => tabs.map((t) => `/report/?r=${r}&tab=${t}`))];

// Run in the page. The hero before its script has run: four blocks of words, each showing, one
// under the other, in a hero about one screen tall.
const wordsOutOfOrder = () => {
  const hero = document.getElementById('hero');
  const blocks = [...hero.querySelectorAll('.beat')].map((b) => ({ box: b.getBoundingClientRect(), opacity: getComputedStyle(b).opacity }));
  const found = blocks.length === 4 ? [] : [`${blocks.length} blocks of words in the hero instead of 4`];
  blocks.forEach((b, i) => {
    if (b.box.height === 0 || b.opacity !== '1') found.push(`block ${i + 1} of the hero does not show`);
    if (i > 0 && b.box.top < blocks[i - 1].box.bottom) found.push(`block ${i + 1} of the hero overlaps the one before it`);
  });
  if (hero.offsetHeight > innerHeight * 1.25) found.push(`the hero is ${(hero.offsetHeight / innerHeight).toFixed(1)} screens tall`);
  return found;
};

async function landingWithoutScript(browser) {
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    const where = `${viewport.width}px wide`;
    const off = await browser.newContext({ viewport, javaScriptEnabled: false });
    const plain = await off.newPage();
    await plain.goto(origin + '/', { waitUntil: 'load' });
    for (const found of await plain.evaluate(wordsOutOfOrder)) problems.push(`no JavaScript, ${where}: ${found}`);
    // Each part the script would have filled says so instead of sitting empty.
    const silent = await plain.evaluate(() => ['hero', 'parts-list', 'samples-list'].filter((id) => !(document.getElementById(id).closest('section').querySelector('.script-note')?.getBoundingClientRect().height > 0)));
    for (const id of silent) problems.push(`no JavaScript, ${where}: nothing says why #${id} is missing its script`);
    await off.close();

    const slow = await browser.newContext({ viewport });
    let deliver;
    const held = new Promise((done) => (deliver = done));
    await slow.route('**/assets/*.js', async (route) => {
      await held;
      await route.continue();
    });
    const page = await slow.newPage();
    await page.goto(origin + '/', { waitUntil: 'commit' });
    await page.waitForFunction(() => document.querySelectorAll('.beat').length === 4 && getComputedStyle(document.querySelector('.landing-bar')).position === 'fixed');
    for (const found of await page.evaluate(wordsOutOfOrder)) problems.push(`script still loading, ${where}: ${found}`);
    deliver();
    await page.waitForSelector('#hero.is-live', { timeout: 10000 }).catch(() => problems.push(`script loaded, ${where}: the hero never became the pinned stage`));
    // A load error is put first in the page; the pinned bar must not cover it.
    const covered = await page.evaluate(() => {
      const box = Object.assign(document.createElement('div'), { className: 'load-error', textContent: 'The page could not load.' });
      document.body.prepend(box);
      return box.getBoundingClientRect().top < document.querySelector('.landing-bar').getBoundingClientRect().bottom;
    });
    if (covered) problems.push(`${where}: the bar covers the top of a load error`);
    await slow.close();
  }
}

// axe in a real browser sees layout and colour, which the jsdom run in the tests cannot. The
// context skips the Content-Security-Policy so axe can be put into the page; the policy is checked
// by every other visit.
async function landingAccessibility(browser) {
  const axe = await readFile(join(root, 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport, colorScheme, bypassCSP: true });
      const page = await context.newPage();
      await page.goto(origin + '/', { waitUntil: 'load' });
      await page.waitForSelector('#samples-list a');
      await page.evaluate(axe);
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((v) => `${v.id} (${v.help}) at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`));
      for (const violation of violations) problems.push(`axe, ${viewport.width}px wide, ${colorScheme}: ${violation}`);
      await context.close();
    }
  }
}

// Chrome keeps its sandbox wherever it can. CI runners cannot give it one, so only they turn it off.
const launched = await chromium.launch({ channel: 'chrome', args: process.env.CI ? ['--no-sandbox'] : [] });
// Every page opens in a context that refuses requests to anywhere but the local build, so a build
// that calls out is reported and nothing leaves the machine.
const browser = {
  newContext: async (options) => {
    const context = await launched.newContext(options);
    await context.route('**', (route) => {
      const url = route.request().url();
      if (url.startsWith(origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      problems.push(`outside request to ${url}`);
      return route.abort();
    });
    return context;
  },
};
try {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    let view = '';
    page.on('console', (m) => m.type() === 'error' && problems.push(`${colorScheme} ${view}: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`${colorScheme} ${view}: ${e.message}`));
    page.on('response', (r) => r.status() >= 400 && problems.push(`${colorScheme} ${view}: ${r.status()} ${r.url()}`));
    for (view of views) {
      await page.goto(origin + view, { waitUntil: 'load' });
      if (view === '/') {
        // Scroll the hero so its frames load and draw under the policy too. At each stop the block of
        // words for that part of the scroll must be the one showing.
        for (const [share, showing] of [[0.6, 2], [1, 3], [0, 0]]) {
          await page.evaluate((share) => scrollTo(0, (document.getElementById('hero').offsetHeight - innerHeight) * share), share);
          await page.waitForTimeout(share === 0.6 ? 1200 : 300);
          const shown = await page.evaluate(() => [...document.querySelectorAll('.beat')].map((b) => getComputedStyle(b).opacity).join(' '));
          if (shown !== [0, 1, 2, 3].map((i) => (i === showing ? '1' : '0')).join(' ')) problems.push(`${colorScheme} ${view}: ${share} of the way down the hero the blocks of words show as ${shown}`);
        }
      } else if (!(await page.locator('.panel:not([hidden]) .sheet').count())) {
        problems.push(`${colorScheme} ${view}: the tab rendered nothing`);
      }
      // On paper both modes are dark ink on white from the stylesheet alone: no print event fires here.
      if (view === '/' || view.endsWith('tab=overview')) {
        await page.emulateMedia({ media: 'print' });
        const pale = await page.evaluate(() => [...document.querySelectorAll('#restaurant-name, .sheet, .ledger-title')].some((el) => Number(/oklch\(([\d.]+)/.exec(getComputedStyle(el).color)?.[1] ?? 1) > 0.5));
        if (pale) problems.push(`${colorScheme} ${view}: print leaves light text on white`);
        await page.emulateMedia({ media: null });
      }
      await page.waitForTimeout(150);
    }
    await context.close();
  }
  await landingWithoutScript(browser);
  await landingAccessibility(browser);
} finally {
  await launched.close();
  server.close();
}

if (problems.length > 0) {
  console.error(`Smoke test failed:\n${[...new Set(problems)].join('\n')}`);
  process.exit(1);
}
console.log(`Smoke test passed: ${views.length} views of ${slugs.length} restaurants in light and dark, no blocked content, console errors or outside requests.`);
