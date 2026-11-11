import { html, type SafeHtml } from '../html';

// Every drawing here is SVG built from attributes, never a style attribute, so the site's
// Content-Security-Policy can refuse inline styles outright.

const DIAL_R = 84;
// The ring's length. app.css animates the arc in from this same number (`dial-in`).
export const DIAL_LENGTH = 2 * Math.PI * DIAL_R;

// The score as a plate seen from above: the rim fills clockwise from the top, 0 to 100.
export function dial(score: number, label: string, numberClass = 'score-number'): SafeHtml {
  const share = Math.max(0, Math.min(1, score / 100));
  const ticks = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const major = i % 10 === 0;
    const r0 = major ? 62 : 65;
    return html`<line class="dial-tick${major ? ' is-major' : ''}" x1="${(100 + Math.sin(a) * r0).toFixed(1)}" y1="${(100 - Math.cos(a) * r0).toFixed(1)}" x2="${(100 + Math.sin(a) * 69).toFixed(1)}" y2="${(100 - Math.cos(a) * 69).toFixed(1)}"></line>`;
  });
  return html`<svg class="dial" viewBox="0 0 200 200" role="img" aria-label="${label}">
    <circle class="dial-track" cx="100" cy="100" r="${DIAL_R}"></circle>
    <circle class="dial-arc" cx="100" cy="100" r="${DIAL_R}" transform="rotate(-90 100 100)" stroke-dasharray="${DIAL_LENGTH.toFixed(1)}" stroke-dashoffset="${(DIAL_LENGTH * (1 - share)).toFixed(1)}"></circle>
    ${ticks}
    <text class="${numberClass}" x="100" y="118" text-anchor="middle" aria-hidden="true">${score}</text>
    <text class="dial-of" x="100" y="142" text-anchor="middle" aria-hidden="true">out of 100</text>
  </svg>`;
}

interface RadarPoint {
  label: string;
  value: number;
}

// The parts of the score on one wheel, each spoke running 0 at the centre to 100 at the rim.
// The table beside it carries the same numbers, so the wheel is hidden from screen readers.
export function radar(points: RadarPoint[]): SafeHtml {
  const n = points.length;
  if (n < 3) return html``;
  const cx = 210;
  const cy = 150;
  const R = 98;
  const at = (i: number, r: number) => {
    const a = (i / n) * Math.PI * 2;
    return { x: cx + Math.sin(a) * r, y: cy - Math.cos(a) * r, sin: Math.sin(a), cos: Math.cos(a) };
  };
  const ring = (share: number) => points.map((_, i) => at(i, R * share)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const shape = points.map((p, i) => at(i, R * Math.max(0, Math.min(1, p.value / 100)))).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return html`<svg class="radar" viewBox="0 0 420 300" aria-hidden="true">
    ${[0.25, 0.5, 0.75, 1].map((s) => html`<polygon class="radar-ring${s === 1 ? ' is-rim' : ''}" points="${ring(s)}"></polygon>`)}
    ${points.map((_, i) => {
      const p = at(i, R);
      return html`<line class="radar-spoke" x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}"></line>`;
    })}
    <polygon class="radar-shape" points="${shape}"></polygon>
    ${points.map((pt, i) => {
      const p = at(i, R * Math.max(0, Math.min(1, pt.value / 100)));
      return html`<circle class="radar-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5"></circle>`;
    })}
    ${points.map((pt, i) => {
      const p = at(i, R + 16);
      const anchor = Math.abs(p.sin) < 0.2 ? 'middle' : p.sin > 0 ? 'start' : 'end';
      const dy = p.cos > 0.5 ? -14 : p.cos < -0.5 ? 12 : 0;
      return html`<text class="radar-label" x="${p.x.toFixed(1)}" y="${(p.y + dy).toFixed(1)}" text-anchor="${anchor}">${pt.label}</text>
        <text class="radar-value" x="${p.x.toFixed(1)}" y="${(p.y + dy + 17).toFixed(1)}" text-anchor="${anchor}">${Math.round(pt.value)}</text>`;
    })}
  </svg>`;
}

// A small trend line beside a figure. The figure and its note say what it shows.
export function sparkline(values: number[]): SafeHtml {
  if (values.length < 2) return html``;
  const W = 120;
  const H = 40;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const x = (i: number) => 3 + (i / (values.length - 1)) * (W - 6);
  const y = (v: number) => H - 5 - ((v - lo) / span) * (H - 10);
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  return html`<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <path class="spark-area" d="${line} L${x(last).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z"></path>
    <path class="spark-line" d="${line}"></path>
    <circle class="spark-dot" cx="${x(last).toFixed(1)}" cy="${y(values[last]!).toFixed(1)}" r="3"></circle>
  </svg>`;
}

interface Segment {
  count: number;
  css: string;
  word: string;
}

// One bar split by count, with each count in words under it so colour never carries it alone.
export function segments(parts: Segment[], summary: string): SafeHtml {
  const total = parts.reduce((s, p) => s + p.count, 0);
  if (total <= 0) return html``;
  let x = 0;
  const rects = parts
    .filter((p) => p.count > 0)
    .map((p) => {
      const w = (p.count / total) * 100;
      const rect = html`<rect class="segment ${p.css}" x="${x.toFixed(2)}" width="${Math.max(0, w - 0.6).toFixed(2)}" height="1"></rect>`;
      x += w;
      return rect;
    });
  return html`<div class="segments">
    <p class="segments-summary">${summary}</p>
    <svg class="segments-bar" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden="true">${rects}</svg>
    <ul class="segments-key">${parts.filter((p) => p.count > 0).map((p) => html`<li><span class="key-dot ${p.css}" aria-hidden="true"></span>${p.count} ${p.word}</li>`)}</ul>
  </div>`;
}
