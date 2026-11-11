// Runs before first paint, from its own file so the pages need no inline script (see vercel.json).
// Report links from before the landing page existed (/?r=…&tab=…) still open the report.
(() => {
  if (location.pathname !== '/' && location.pathname !== '/index.html') return;
  const params = new URLSearchParams(location.search);
  if (params.has('r') || params.has('tab')) location.replace('/report/' + location.search);
})();
// The saved light or dark choice, else the system setting.
(() => {
  let mode = null;
  try { mode = localStorage.getItem('rcc-mode'); } catch {}
  if (mode !== 'light' && mode !== 'dark') mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.mode = mode;
})();
