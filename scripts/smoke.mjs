// Serves the production build with the headers from vercel.json and opens every view in Chrome.
// Fails on anything the Content-Security-Policy blocks, any console error, any request to
// another site, or inline code in the built pages. Run after `npm run build`: `npm run smoke`.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
const views = ['/', ...['brasa-taqueria', 'osteria-lumen'].flatMap((r) => tabs.map((t) => `/report/?r=${r}&tab=${t}`))];

const browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox'] });
try {
  for (const colorScheme of ['light', 'dark']) {
    const context = await browser.newContext({ colorScheme, viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    let view = '';
    page.on('console', (m) => m.type() === 'error' && problems.push(`${colorScheme} ${view}: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`${colorScheme} ${view}: ${e.message}`));
    page.on('request', (r) => r.url().startsWith(origin) || r.url().startsWith('data:') || r.url().startsWith('blob:') || problems.push(`${colorScheme} ${view}: outside request to ${r.url()}`));
    page.on('response', (r) => r.status() >= 400 && problems.push(`${colorScheme} ${view}: ${r.status()} ${r.url()}`));
    for (view of views) {
      await page.goto(origin + view, { waitUntil: 'load' });
      if (view === '/') {
        // Scroll the hero so its frames load and draw under the policy too.
        await page.evaluate(() => scrollTo(0, document.getElementById('hero').offsetHeight * 0.6));
        await page.waitForTimeout(1200);
      } else if (!(await page.locator('.panel:not([hidden]) .sheet').count())) {
        problems.push(`${colorScheme} ${view}: the tab rendered nothing`);
      }
      await page.waitForTimeout(150);
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (problems.length > 0) {
  console.error(`Smoke test failed:\n${[...new Set(problems)].join('\n')}`);
  process.exit(1);
}
console.log(`Smoke test passed: ${views.length} views in light and dark, no blocked content, console errors or outside requests.`);
