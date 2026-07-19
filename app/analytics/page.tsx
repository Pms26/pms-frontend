'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Analytics Page
// YTD Comparison + Segment Charts + Comparative Table
// ═══════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { getYTDComparison, getSegmentAnalytics, getMonthlyData } from '@/lib/api/analytics';
import Card from '@/components/ui/Card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

export default function AnalyticsPage() {
  const { data: ytdCards } = useQuery({
    queryKey: ['ytd-comparison'],
    queryFn: getYTDComparison,
  });

  const { data: segments } = useQuery({
    queryKey: ['segment-analytics'],
    queryFn: getSegmentAnalytics,
  });

  const { data: monthly } = useQuery({
    queryKey: ['monthly-data'],
    queryFn: getMonthlyData,
  });

  const segmentBarData = segments
    ? {
        labels: segments.map((s) => s.segment),
        datasets: [
          {
            label: 'CA 2026',
            data: segments.map((s) => parseInt(s.ca2026.replace(/\s/g, '').replace('DH', '')) || 0),
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderRadius: 6,
          },
          {
            label: 'CA 2025',
            data: segments.map((s) => parseInt(s.ca2025.replace(/\s/g, '').replace('DH', '')) || 0),
            backgroundColor: 'rgba(148, 163, 184, 0.4)',
            borderRadius: 6,
          },
        ],
      }
    : null;

  const segmentBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { usePointStyle: true, boxWidth: 8 } } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(226,232,240,0.5)' }, ticks: { callback: (v: string | number) => `${(Number(v) / 1000).toFixed(0)}K` } },
    },
  };

  const monthlyLineData = monthly
    ? {
        labels: monthly.labels,
        datasets: [
          {
            label: 'Direct',
            data: monthly.segments.direct,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'OTA',
            data: monthly.segments.ota,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
          },
          {
            label: 'B2B',
            data: monthly.segments.b2b,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      }
    : null;

  const monthlyLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { usePointStyle: true, boxWidth: 8 } } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(226,232,240,0.5)' }, ticks: { callback: (v: string | number) => `${Number(v)}%` } },
    },
  };

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <h2 className="section-title">Analytics — Segmentation &amp; Performance</h2>
        <div className="flex gap-2">
          <select className="pms-input w-auto text-sm">
            <option>2026</option>
            <option>2025</option>
          </select>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl hover:from-indigo-600 hover:to-violet-600 transition-all shadow-glow">
            <i className="bi bi-download" />
            Exporter
          </button>
        </div>
      </div>

      {/* YTD Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {ytdCards?.map((card, i) => (
          <Card key={i} hover>
            <div className="text-xs text-slate-500 mb-2">{card.label}</div>
            <div className="text-2xl font-bold text-emerald-600 mb-3">{card.value}</div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000"
                style={{ width: card.barWidth }}
              />
            </div>
            <div className="text-xs text-slate-400">{card.detail}</div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <Card>
          <h6 className="text-sm font-semibold text-slate-700 mb-3">CA par Segment de Marché (DH)</h6>
          <div className="h-[260px]">
            {segmentBarData ? (
              <Bar data={segmentBarData} options={segmentBarOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Chargement...</div>
            )}
          </div>
        </Card>
        <Card>
          <h6 className="text-sm font-semibold text-slate-700 mb-3">Évolution Mensuelle — T.O. par Canal</h6>
          <div className="h-[260px]">
            {monthlyLineData ? (
              <Line data={monthlyLineData} options={monthlyLineOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Chargement...</div>
            )}
          </div>
        </Card>
      </div>

      {/* Comparative Table */}
      <Card padding={false}>
        <div className="p-5 pb-0">
          <h6 className="text-sm font-semibold text-slate-700 mb-3">Tableau Comparatif N-1 par Segment</h6>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60">
                {['SEGMENT', 'NUITÉES 2026', 'NUITÉES 2025', 'Δ NUITÉES', 'CA 2026', 'CA 2025', 'Δ CA', 'ADR 2026', 'ADR 2025', 'Δ ADR'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {segments?.map((s, index) => {
                const formatDelta = (value: string) => {
                  const sign = value.startsWith('+') ? '▲' : '▼';
                  return `${sign} ${value.replace(/^[+-]/, '')}`;
                };

                return (
                  <tr key={`${s.segment}-${index}`} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{s.segment}</td>
                    <td className="px-4 py-3 text-slate-600">{s.nuitees2026.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-400">{s.nuitees2025.toLocaleString()}</td>
                    <td className={`px-4 py-3 font-semibold ${s.deltaNuitees.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {formatDelta(s.deltaNuitees)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.ca2026}</td>
                    <td className="px-4 py-3 text-slate-400">{s.ca2025}</td>
                    <td className={`px-4 py-3 font-semibold ${s.deltaCa.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {formatDelta(s.deltaCa)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.adr2026}</td>
                    <td className="px-4 py-3 text-slate-400">{s.adr2025}</td>
                    <td className={`px-4 py-3 font-semibold ${s.deltaAdr.startsWith('+') ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {formatDelta(s.deltaAdr)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
