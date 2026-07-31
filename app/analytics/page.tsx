'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getKPIs,
  getDashboardTrend,
  getSegmentGroups,
  getSegmentDistribution,
  getSegmentTrend,
  getComparisonYTD,
  getComparisonMonthly,
  SEGMENT_GROUP_COLORS,
  mapSegmentToGroup,
  formatDelta,
} from '@/lib/api/analytics';
import Card from '@/components/ui/Card';
import EvolutionChart from '@/components/charts/EvolutionChart';
import SegmentChart from '@/components/charts/SegmentChart';
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
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function AnalyticsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [comparisonTab, setComparisonTab] = useState<'ytd' | 'monthly'>('ytd');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [waveTrendReady, setWaveTrendReady] = useState(false);
  const [wave2ready, setWave2ready] = useState(false);
  const [wave3ready, setWave3ready] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => setWaveTrendReady(true), 200);
    const t1 = setTimeout(() => setWave2ready(true), 800);
    const t2 = setTimeout(() => setWave3ready(true), 2000);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const { data: kpis, isLoading: kpisLoading, isError: kpisError } = useQuery({
    queryKey: ['analytics-kpis'],
    queryFn: getKPIs,
  });

  const { data: trend, isLoading: trendLoading, isError: trendError } = useQuery({
    queryKey: ['analytics-trend', selectedYear],
    queryFn: () => getDashboardTrend(selectedYear),
    enabled: waveTrendReady,
    staleTime: 10 * 60 * 1000,
  });

  const { data: segmentGroups } = useQuery({
    queryKey: ['analytics-segment-groups'],
    queryFn: getSegmentGroups,
  });

  const { data: distribution, isLoading: distLoading, isError: distError } = useQuery({
    queryKey: ['analytics-distribution', selectedYear, selectedMonth],
    queryFn: () => getSegmentDistribution(selectedYear, selectedMonth),
    enabled: wave2ready,
  });

  const { data: segmentTrend, isLoading: segmentTrendLoading, isError: segmentTrendError } = useQuery({
    queryKey: ['analytics-segment-trend', selectedYear],
    queryFn: () => getSegmentTrend(selectedYear),
    enabled: wave2ready,
    staleTime: 10 * 60 * 1000,
  });

  const { data: ytdComparison, isLoading: ytdLoading, isError: ytdError } = useQuery({
    queryKey: ['analytics-comparison-ytd', selectedYear, segmentFilter],
    queryFn: () => getComparisonYTD(selectedYear, segmentFilter === 'all' ? undefined : segmentFilter),
    enabled: comparisonTab === 'ytd' && wave3ready,
  });

  const { data: monthlyComparison, isLoading: monthlyLoading, isError: monthlyError } = useQuery({
    queryKey: ['analytics-comparison-monthly', selectedYear, selectedMonth, segmentFilter],
    queryFn: () => getComparisonMonthly(selectedYear, selectedMonth, segmentFilter === 'all' ? undefined : segmentFilter),
    enabled: comparisonTab === 'monthly' && wave3ready,
  });

  const isFutureMonth = (month: number) => {
    const now = new Date();
    return month > now.getMonth() + 1 && selectedYear >= now.getFullYear();
  };

  const trendLabels = trend?.months.map((m) => MONTH_NAMES[m.month - 1]);
  const trendOccData = trend?.months.map((m) => m.occupancyRate);
  const trendAdrData = trend?.months.map((m) => m.adr);

  const pieData = distribution?.pieChart.map((item) => {
    const group = mapSegmentToGroup(item.segment, segmentGroups?.groups ?? {});
    return { label: item.label, value: item.nights, color: SEGMENT_GROUP_COLORS[group] || SEGMENT_GROUP_COLORS.AUTRES };
  });

  const barData = distribution?.barChart.map((item) => {
    const group = mapSegmentToGroup(item.segment, segmentGroups?.groups ?? {});
    return { label: item.label, revenue: item.revenue, color: SEGMENT_GROUP_COLORS[group] || SEGMENT_GROUP_COLORS.AUTRES };
  });

  const segmentTrendLabels = segmentTrend?.months.map((m) => MONTH_NAMES[m.month - 1]) ?? [];

  const segmentTrendDatasets = (() => {
    if (!segmentTrend?.months || !segmentGroups) return [];
    const allSegments = new Set<string>();
    const segmentLabels = new Map<string, string>();
    for (const month of segmentTrend.months) {
      for (const seg of month.segments) {
        allSegments.add(seg.segment);
        segmentLabels.set(seg.segment, seg.label);
      }
    }
    return Array.from(allSegments).map((segCode) => {
      const group = mapSegmentToGroup(segCode, segmentGroups.groups);
      return {
        label: segmentLabels.get(segCode) ?? segCode,
        data: segmentTrend.months.map((m) => {
          const found = m.segments.find((s) => s.segment === segCode);
          return found?.nights ?? 0;
        }),
        borderColor: SEGMENT_GROUP_COLORS[group] || SEGMENT_GROUP_COLORS.AUTRES,
        backgroundColor: (SEGMENT_GROUP_COLORS[group] || SEGMENT_GROUP_COLORS.AUTRES) + '20',
        tension: 0.3,
        fill: false,
        pointRadius: 3,
      };
    });
  })();

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="section-header">
        <h2 className="section-title">Analytics — Performance</h2>
      </div>

      {/* ── KPIs ── */}
      {kpisError ? (
        <Card><p className="text-slate-500 text-sm">Service temporairement indisponible</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpisLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <div className="animate-pulse space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                    <div className="h-6 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                  </div>
                </Card>
              ))
            : kpis?.map((kpi, i) => (
                <Card key={i} hover>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-slate-500">{kpi.label}</span>
                    <i className={`bi bi-${kpi.icon} text-slate-400 text-sm`} title="Basé sur les séjours effectifs (check-in/check-out) uniquement" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 mb-1">
                    {kpi.value}<span className="text-sm font-normal text-slate-400 ml-1">{kpi.unit}</span>
                  </div>
                  {kpi.delta ? (
                    <span className={`text-xs font-semibold ${kpi.deltaType === 'positive' ? 'text-emerald-600' : kpi.deltaType === 'negative' ? 'text-rose-500' : 'text-slate-400'}`}>
                      {kpi.delta}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </Card>
              ))}
        </div>
      )}

      {/* ── Trend ── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h6 className="text-sm font-semibold text-slate-700">Tendance Mensuelle — TO &amp; ADR</h6>
          <select
            className="pms-input w-auto text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {trendError ? (
          <p className="text-slate-500 text-sm">Service temporairement indisponible</p>
        ) : trendLoading ? (
          <div className="h-[200px] animate-pulse bg-slate-100 rounded-lg" />
        ) : trend && trendOccData && trendOccData.every((v) => v === 0) ? (
          <p className="text-slate-400 text-sm">Aucune donnée pour l&apos;année sélectionnée</p>
        ) : (
          <EvolutionChart labels={trendLabels} occupancyData={trendOccData} adrData={trendAdrData} year={selectedYear} />
        )}
      </Card>

      {/* ── Segment Distribution ── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h6 className="text-sm font-semibold text-slate-700">Distribution par Segment de Marché</h6>
          <div className="flex gap-2">
            <select className="pms-input w-auto text-sm" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <select className="pms-input w-auto text-sm" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
        {distError ? (
          <p className="text-slate-500 text-sm">Service temporairement indisponible</p>
        ) : distLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-[200px] animate-pulse bg-slate-100 rounded-lg" />
            <div className="h-[200px] animate-pulse bg-slate-100 rounded-lg" />
          </div>
        ) : distribution && (distribution.pieChart.length === 0 || distribution.barChart.length === 0) ? (
          <p className="text-slate-400 text-sm">Aucune donnée pour cette période</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">Répartition des Nuités</p>
              <div className="h-[200px]">
                {pieData && pieData.length > 0 ? <SegmentChart type="doughnut" pieData={pieData} /> : <p className="text-slate-400 text-sm">Aucune donnée pour cette période</p>}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">Revenus par Segment</p>
              <div className="h-[200px]">
                {barData && barData.length > 0 ? <SegmentChart type="bar" barData={barData} /> : <p className="text-slate-400 text-sm">Aucune donnée pour cette période</p>}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Segment Trend ── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h6 className="text-sm font-semibold text-slate-700">Tendance par Segment de Marché (Nuités)</h6>
          <select
            className="pms-input w-auto text-sm"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {segmentTrendError ? (
          <p className="text-slate-500 text-sm">Service temporairement indisponible</p>
        ) : segmentTrendLoading ? (
          <div className="h-[200px] animate-pulse bg-slate-100 rounded-lg" />
        ) : segmentTrendDatasets.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucune donnée pour cette année</p>
        ) : (
          <div className="h-[200px]">
            <Line
              data={{ labels: segmentTrendLabels, datasets: segmentTrendDatasets }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: 'rgba(226,232,240,0.5)' } },
                },
              }}
            />
          </div>
        )}
      </Card>

      {/* ── Comparison N vs N-1 ── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h6 className="text-sm font-semibold text-slate-700">Comparaison N vs N-1</h6>
          <div className="flex gap-2 items-center">
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${comparisonTab === 'ytd' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setComparisonTab('ytd')}
              >
                YTD
              </button>
              <button
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${comparisonTab === 'monthly' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => setComparisonTab('monthly')}
              >
                Mensuel
              </button>
            </div>
            {comparisonTab === 'monthly' && (
              <select className="pms-input w-auto text-sm" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
            )}
            <select className="pms-input w-auto text-sm" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {segmentGroups && (
              <select className="pms-input w-auto text-sm" value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)}>
                <option value="all">Tous les segments</option>
                {segmentGroups.segments.map((sg) => (
                  <option key={sg.code} value={sg.code}>{sg.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        {comparisonTab === 'ytd' ? (
          ytdError ? (
            <p className="text-slate-500 text-sm">Service temporairement indisponible</p>
          ) : ytdLoading ? (
            <div className="h-[200px] animate-pulse bg-slate-100 rounded-lg" />
          ) : ytdComparison && ytdComparison.comparison.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/60">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">Mois</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">T.O.</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">T.O. N-1</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">Δ T.O.</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">ADR</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">ADR N-1</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">Δ ADR</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">RevPAR</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">RevPAR N-1</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">Δ RevPAR</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">CA</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">CA N-1</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">Δ CA</th>
                  </tr>
                </thead>
                <tbody>
                  {ytdComparison.comparison.map((item) => {
                    const occDelta = formatDelta(item.deltas.occupancyRate);
                    const adrDelta = formatDelta(item.deltas.adr);
                    const revparDelta = formatDelta(item.deltas.revpar);
                    const revenueDelta = formatDelta(item.deltas.revenue);
                    return (
                      <tr key={item.month} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{MONTH_NAMES[item.month - 1]}</td>
                        <td className="px-4 py-3 text-slate-600">{item.current.occupancyRate.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-slate-400">{item.previous.occupancyRate.toFixed(1)}%</td>
                        <td className={`px-4 py-3 font-semibold ${occDelta.type === 'positive' ? 'text-emerald-600' : occDelta.type === 'negative' ? 'text-rose-500' : 'text-slate-400'}`}>{occDelta.text}</td>
                        <td className="px-4 py-3 text-slate-600">{item.current.adr.toLocaleString('fr-FR')} DH</td>
                        <td className="px-4 py-3 text-slate-400">{item.previous.adr.toLocaleString('fr-FR')} DH</td>
                        <td className={`px-4 py-3 font-semibold ${adrDelta.type === 'positive' ? 'text-emerald-600' : adrDelta.type === 'negative' ? 'text-rose-500' : 'text-slate-400'}`}>{adrDelta.text}</td>
                        <td className="px-4 py-3 text-slate-600">{item.current.revpar.toLocaleString('fr-FR')} DH</td>
                        <td className="px-4 py-3 text-slate-400">{item.previous.revpar.toLocaleString('fr-FR')} DH</td>
                        <td className={`px-4 py-3 font-semibold ${revparDelta.type === 'positive' ? 'text-emerald-600' : revparDelta.type === 'negative' ? 'text-rose-500' : 'text-slate-400'}`}>{revparDelta.text}</td>
                        <td className="px-4 py-3 text-slate-600">{item.current.totalRevenue.toLocaleString('fr-FR')} DH</td>
                        <td className="px-4 py-3 text-slate-400">{item.previous.totalRevenue.toLocaleString('fr-FR')} DH</td>
                        <td className={`px-4 py-3 font-semibold ${revenueDelta.type === 'positive' ? 'text-emerald-600' : revenueDelta.type === 'negative' ? 'text-rose-500' : 'text-slate-400'}`}>{revenueDelta.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Aucune donnée pour cette période</p>
          )
        ) : (
          monthlyError ? (
            <p className="text-slate-500 text-sm">Service temporairement indisponible</p>
          ) : monthlyLoading ? (
            <div className="h-[200px] animate-pulse bg-slate-100 rounded-lg" />
          ) : monthlyComparison ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/60">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">Métrique</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">{selectedYear}</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">{selectedYear - 1}</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'T.O.', current: monthlyComparison.current.occupancyRate, previous: monthlyComparison.previous.occupancyRate, delta: monthlyComparison.deltas.occupancyRate, suffix: '%' },
                    { label: 'ADR', current: monthlyComparison.current.adr, previous: monthlyComparison.previous.adr, delta: monthlyComparison.deltas.adr, suffix: ' DH' },
                    { label: 'RevPAR', current: monthlyComparison.current.revpar, previous: monthlyComparison.previous.revpar, delta: monthlyComparison.deltas.revpar, suffix: ' DH' },
                    { label: 'CA', current: monthlyComparison.current.totalRevenue, previous: monthlyComparison.previous.totalRevenue, delta: monthlyComparison.deltas.revenue, suffix: ' DH' },
                    { label: 'Nuités', current: monthlyComparison.current.totalNights, previous: monthlyComparison.previous.totalNights, delta: null, suffix: '' },
                  ].map((row) => {
                    const fmt = formatDelta(row.delta);
                    return (
                      <tr key={row.label} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-700">{row.label}</td>
                        <td className="px-4 py-3 text-slate-600">{typeof row.current === 'number' ? row.current.toLocaleString('fr-FR') + row.suffix : '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{typeof row.previous === 'number' ? row.previous.toLocaleString('fr-FR') + row.suffix : '—'}</td>
                        <td className={`px-4 py-3 font-semibold ${fmt.type === 'positive' ? 'text-emerald-600' : fmt.type === 'negative' ? 'text-rose-500' : 'text-slate-400'}`}>{fmt.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Aucune donnée pour cette période</p>
          )
        )}
      </Card>
    </div>
  );
}
