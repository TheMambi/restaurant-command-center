import { html, type SafeHtml } from '../html';

interface LineChartOptions {
  labels: string[];
  values: number[];
  title: string;
  format: (value: number) => string;
  min?: number;
  max?: number;
}

const W = 560;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 48 };
const GRID_LINES = 4;
let chartCount = 0;

function niceStep(range: number): number {
  if (range <= 0) return 1;
  const raw = range / GRID_LINES;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function chartRange(values: number[], min?: number, max?: number): { lo: number; hi: number; step: number } {
  const dataLo = Math.min(...values);
  const dataHi = Math.max(...values);
  const step = niceStep((max ?? dataHi) - (min ?? dataLo) || Math.abs(dataHi) || 1);
  const lo = min ?? Math.floor(dataLo / step) * step;
  let hi = max ?? Math.ceil(dataHi / step) * step;
  if (hi <= lo) hi = lo + step;
  return { lo, hi, step };
}

// One series, one y-axis, drawn as SVG for the data. The caller supplies an accessible title;
// a visually hidden table beside the chart carries the same numbers for screen readers.
export function lineChart(o: LineChartOptions): SafeHtml {
  if (o.values.length === 0) return html`<p class="muted">No history yet.</p>`;
  const { lo, hi, step } = chartRange(o.values, o.min, o.max);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (o.values.length === 1 ? plotW / 2 : (i / (o.values.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo)) * plotH;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t);
  const path = o.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lastI = o.values.length - 1;
  const truncated = lo > 0 && o.min === undefined;
  const fade = `chart-fade-${++chartCount}`;
  const area = `${path} L${x(lastI).toFixed(1)},${y(lo).toFixed(1)} L${x(0).toFixed(1)},${y(lo).toFixed(1)} Z`;

  return html`
    <figure>
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.title}">
        ${ticks.map(
          (t) => html`<line class="grid-line" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"></line>
            <text class="axis-text" x="${PAD.left - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${o.format(t)}</text>`,
        )}
        ${o.labels.map(
          (l, i) => html`<text class="axis-text" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${l}</text>`,
        )}
        <defs><linearGradient id="${fade}" x1="0" y1="0" x2="0" y2="1"><stop class="fade-top" offset="0"></stop><stop class="fade-end" offset="1"></stop></linearGradient></defs>
        ${o.values.length > 1 && html`<path class="area" d="${area}" fill="url(#${fade})"></path>`}
        <path class="series" d="${path}"></path>
        ${o.values.slice(0, lastI).map((v, i) => html`<circle class="point is-past" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.5"></circle>`)}
        <circle class="point" cx="${x(lastI).toFixed(1)}" cy="${y(o.values[lastI]!).toFixed(1)}" r="5"></circle>
        <text class="point-label" x="${(x(lastI) - 8).toFixed(1)}" y="${(y(o.values[lastI]!) - 10).toFixed(1)}" text-anchor="end">${o.format(o.values[lastI]!)}</text>
      </svg>
      ${truncated && html`<figcaption class="small muted">Axis starts at ${o.format(lo)} to show the change.</figcaption>`}
      <table class="sr-only">
        <caption>${o.title}</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">Value</th></tr></thead>
        <tbody>${o.labels.map((l, i) => html`<tr><th scope="row">${l}</th><td>${o.format(o.values[i]!)}</td></tr>`)}</tbody>
      </table>
    </figure>`;
}

interface BarChartOptions {
  labels: string[];
  values: number[];
  title: string;
  format: (value: number) => string;
}

// Vertical bars from zero, one series. Used for counts per month.
export function barChart(o: BarChartOptions): SafeHtml {
  if (o.values.length === 0) return html`<p class="muted">Not enough history yet.</p>`;
  const { lo, hi, step } = chartRange([0, ...o.values.map((v) => Math.max(0, v))], 0);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / o.values.length;
  const barW = Math.min(24, slot * 0.6);
  const y = (v: number) => PAD.top + plotH - ((v - lo) / (hi - lo)) * plotH;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t);

  return html`
    <figure>
      <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.title}">
        ${ticks.map(
          (t) => html`<line class="grid-line" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"></line>
            <text class="axis-text" x="${PAD.left - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${o.format(t)}</text>`,
        )}
        ${o.values.map((v, i) => {
          const cx = PAD.left + slot * (i + 0.5);
          const top = y(Math.max(0, v));
          const x0 = cx - barW / 2;
          const x1 = cx + barW / 2;
          const r = Math.min(2, y(0) - top);
          // Rounded only at the data end; the baseline stays square.
          const d = `M${x0.toFixed(1)},${y(0).toFixed(1)} V${(top + r).toFixed(1)} Q${x0.toFixed(1)},${top.toFixed(1)} ${(x0 + r).toFixed(1)},${top.toFixed(1)} H${(x1 - r).toFixed(1)} Q${x1.toFixed(1)},${top.toFixed(1)} ${x1.toFixed(1)},${(top + r).toFixed(1)} V${y(0).toFixed(1)} Z`;
          return html`<path class="bar" d="${d}"></path>
            <text class="bar-label" x="${cx.toFixed(1)}" y="${(top - 6).toFixed(1)}" text-anchor="middle">${o.format(v)}</text>
            <text class="axis-text" x="${cx.toFixed(1)}" y="${H - 8}" text-anchor="middle">${o.labels[i]}</text>`;
        })}
      </svg>
      <table class="sr-only">
        <caption>${o.title}</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">Value</th></tr></thead>
        <tbody>${o.labels.map((l, i) => html`<tr><th scope="row">${l}</th><td>${o.format(o.values[i]!)}</td></tr>`)}</tbody>
      </table>
    </figure>`;
}
