import { CategoryScale, Chart, Filler, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
import { monthLabel } from './format';
import type { HistoryPoint } from './render/history';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Legend, Tooltip);

let current: Chart | undefined;

export function drawHistoryChart(canvas: HTMLCanvasElement, series: HistoryPoint[]): void {
  current?.destroy();
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const fade = (rgb: string) => {
    const g = ctx.createLinearGradient(0, 0, 0, 400);
    g.addColorStop(0, `rgba(${rgb}, 0.4)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    return g;
  };

  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
  const grid = { color: 'rgba(255, 255, 255, 0.05)' };
  const point = { pointBackgroundColor: '#0a0a0f', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, borderWidth: 3, fill: true, tension: 0.4 };

  current = new Chart(ctx, {
    type: 'line',
    data: {
      labels: series.map((s, i) => (i === series.length - 1 ? `${monthLabel(s.month, 'short')} (now)` : monthLabel(s.month, 'short'))),
      datasets: [
        { ...point, label: 'Overall score', data: series.map((s) => s.overallScore), borderColor: '#a78bfa', pointBorderColor: '#a78bfa', backgroundColor: fade('167, 139, 250'), yAxisID: 'y' },
        { ...point, label: 'Total reviews', data: series.map((s) => s.totalReviews), borderColor: '#f472b6', pointBorderColor: '#f472b6', backgroundColor: fade('244, 114, 182'), borderDash: [5, 5], yAxisID: 'y1' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } },
        tooltip: { backgroundColor: 'rgba(15, 15, 25, 0.9)', padding: 12, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, boxPadding: 4 },
      },
      scales: {
        x: { grid },
        y: { position: 'left', min: 0, max: 100, grid, title: { display: true, text: 'Score (0 to 100)' } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Total reviews' } },
      },
    },
  });
}
