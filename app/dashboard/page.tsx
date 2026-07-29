'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getKPIs, getDashboardTrend, getSegmentGroups, getSegmentDistribution, getComparisonYTD, getComparisonMonthly, getTodayArrivals, getTodayDepartures, SEGMENT_GROUP_COLORS, mapSegmentToGroup, formatDelta } from '@/lib/api/analytics';
import KPICard from '@/components/ui/KPICard';
import type { KPI } from '@/types';

import EvolutionChart from '@/components/charts/EvolutionChart';
import SegmentChart from '@/components/charts/SegmentChart';

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [trendYear, setTrendYear] = useState(currentYear);
  const [segYear, setSegYear] = useState(currentYear);
  const [segMonth, setSegMonth] = useState(currentMonth);
  const [compTab, setCompTab] = useState<'ytd' | 'monthly'>('ytd');
  const [compYear, setCompYear] = useState(currentYear);
  const [compMonth, setCompMonth] = useState(currentMonth);
  const [compSegment, setCompSegment] = useState('all');

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['kpis'],
    queryFn: getKPIs,
  });

  const { data: arrivals } = useQuery({
    queryKey: ['today-arrivals'],
    queryFn: getTodayArrivals,
  });

  const { data: departures } = useQuery({
    queryKey: ['today-departures'],
    queryFn: getTodayDepartures,
  });

  const { data: trend, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard-trend', trendYear],
    queryFn: () => getDashboardTrend(trendYear),
  });

  const { data: segmentGroups } = useQuery({
    queryKey: ['segment-groups'],
    queryFn: getSegmentGroups,
    staleTime: 30 * 60 * 1000,
  });

  const { data: segmentDist, isLoading: segLoading } = useQuery({
    queryKey: ['segment-distribution', segYear, segMonth],
    queryFn: () => getSegmentDistribution(segYear, segMonth),
  });

  const { data: compYTD, isLoading: compYTLoading } = useQuery({
    queryKey: ['comparison-ytd', compYear, compSegment],
    queryFn: () => getComparisonYTD(compYear, compSegment),
    enabled: compTab === 'ytd',
  });

  const { data: compMonthly, isLoading: compMLoading } = useQuery({
    queryKey: ['comparison-monthly', compYear, compMonth, compSegment],
    queryFn: () => getComparisonMonthly(compYear, compMonth, compSegment),
    enabled: compTab === 'monthly',
  });

  const groups = segmentGroups?.groups ?? {};
  const segColors = (items: { segment: string }[]) =>
    items.map((item) => SEGMENT_GROUP_COLORS[mapSegmentToGroup(item.segment, groups)] || SEGMENT_GROUP_COLORS.AUTRES);

  const trendMonths = trend?.months ?? [];
  const hasTrendData = trendMonths.some((m) => m.occupancyRate > 0);
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  return (
    <div>
      {/* ── Section Header ── */}
      <div className="section-header">
        <h2 className="section-title">Tableau de bord</h2>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm pms-select" style={{ width: 'auto' }}>
            <option>Juillet 2026</option>
            <option>Juin 2026</option>
          </select>
        </div>
      </div>

      {/* ── KPI Section ── */}
      <div className="d-flex align-items-center gap-2 mb-2">
        <h5 className="mb-0" style={{ color: 'var(--accent)' }}>Indicateurs clés</h5>
        <i className="bi bi-info-circle text-slate-400" title="Basé sur les séjours effectifs (check-in/check-out), réservations futures exclues" />
      </div>
      <div className="row g-3 mb-4">
        {kpisLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="col-6 col-lg-4 col-xl-2">
                <div className="kpi-card glass-card" style={{ minHeight: 130 }}>
                  <div className="kpi-icon" style={{ background: 'rgba(15,23,42,0.08)' }} />
                  <div className="kpi-label mt-2" style={{ width: '70%', height: 10, background: 'rgba(15,23,42,0.06)', borderRadius: 4 }} />
                  <div className="kpi-value" style={{ width: '50%', height: 24, background: 'rgba(15,23,42,0.06)', borderRadius: 4, margin: '6px 0' }} />
                </div>
              </div>
            ))
          : kpis?.map((kpi: KPI, i: number) => (
              <div key={i} className="col-6 col-lg-4 col-xl-2">
                <KPICard kpi={kpi} />
              </div>
            ))}
      </div>
      <p className="text-xs text-slate-500 mt-2">Séjours effectifs uniquement</p>

      {/* ── Charts area ── */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="glass-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="chart-title mb-0">Évolution T.O. &amp; ADR — 12 derniers mois</h6>
              <select
                className="form-select form-select-sm pms-select"
                style={{ width: 'auto' }}
                value={trendYear}
                onChange={(e) => setTrendYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div style={{ height: 200 }}>
              {trendLoading ? (
                <div className="d-flex align-items-center justify-content-center h-100">
                  <div className="spinner-border text-accent" role="status" />
                </div>
              ) : hasTrendData ? (
                <EvolutionChart
                  labels={trendMonths.map((m) => monthNames[m.month - 1] || `M${m.month}`)}
                  occupancyData={trendMonths.map((m) => m.occupancyRate)}
                  adrData={trendMonths.map((m) => m.adr)}
                  year={trendYear}
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-slate-400">
                  Aucune donnée pour l'année sélectionnée
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="glass-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="chart-title mb-0">Répartition par Segment</h6>
              <div className="d-flex gap-1">
                <select className="form-select form-select-sm pms-select" style={{ width: 70 }} value={segMonth} onChange={(e) => setSegMonth(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{monthNames[m - 1]}</option>
                  ))}
                </select>
                <select className="form-select form-select-sm pms-select" style={{ width: 80 }} value={segYear} onChange={(e) => setSegYear(Number(e.target.value))}>
                  {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            {segLoading ? (
              <div className="d-flex align-items-center justify-content-center" style={{ height: 200 }}>
                <div className="spinner-border text-accent" role="status" />
              </div>
            ) : segmentDist != null ? (
              (() => {
                const pieItems = segmentDist.pieChart ?? [];
                const barItems = segmentDist.barChart ?? [];
                const hasData = pieItems.length > 0 || barItems.length > 0;
                return hasData ? (
                  <>
                    <div style={{ height: 130 }}>
                      <SegmentChart
                        type="doughnut"
                        pieData={pieItems.map((item) => ({
                          label: item.label,
                          value: item.nights,
                          color: SEGMENT_GROUP_COLORS[mapSegmentToGroup(item.segment, groups)] || SEGMENT_GROUP_COLORS.AUTRES,
                        }))}
                      />
                    </div>
                    <div style={{ height: 130 }} className="mt-2">
                      <SegmentChart
                        type="bar"
                        barData={barItems.map((item) => ({
                          label: item.label,
                          revenue: item.revenue,
                          color: SEGMENT_GROUP_COLORS[mapSegmentToGroup(item.segment, groups)] || SEGMENT_GROUP_COLORS.AUTRES,
                        }))}
                      />
                    </div>
                  </>
                ) : (
                  <div className="d-flex align-items-center justify-content-center text-slate-400" style={{ height: 200 }}>
                    Aucune donnée
                  </div>
                );
              })()
            ) : (
              <div className="d-flex align-items-center justify-content-center text-slate-400" style={{ height: 200 }}>
                Aucune donnée
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Comparison Section ── */}
      <div className="glass-card p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0" style={{ color: 'var(--accent)' }}>Comparaison N vs N-1</h5>
          <div className="d-flex gap-2 align-items-center">
            <select className="form-select form-select-sm pms-select" style={{ width: 'auto' }} value={compSegment} onChange={(e) => setCompSegment(e.target.value)}>
              <option value="all">Tous les segments</option>
              {segmentGroups?.segments.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
            <select className="form-select form-select-sm pms-select" style={{ width: 'auto' }} value={compYear} onChange={(e) => setCompYear(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {compTab === 'monthly' && (
              <select className="form-select form-select-sm pms-select" style={{ width: 70 }} value={compMonth} onChange={(e) => setCompMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{monthNames[m - 1]}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button className={`nav-link ${compTab === 'ytd' ? 'active' : ''}`} onClick={() => setCompTab('ytd')}>Cumul YTD</button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${compTab === 'monthly' ? 'active' : ''}`} onClick={() => setCompTab('monthly')}>Mensuel</button>
          </li>
        </ul>

        {compTab === 'ytd' && (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Indicateur</th>
                  <th className="text-end">N</th>
                  <th className="text-end">N-1</th>
                  <th className="text-end">Delta</th>
                </tr>
              </thead>
              <tbody>
                {compYTLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td><div style={{ width: 80, height: 14, background: 'rgba(148,163,184,0.1)', borderRadius: 4 }} /></td>
                      <td className="text-end"><div style={{ width: 60, height: 14, background: 'rgba(148,163,184,0.1)', borderRadius: 4, marginLeft: 'auto' }} /></td>
                      <td className="text-end"><div style={{ width: 60, height: 14, background: 'rgba(148,163,184,0.1)', borderRadius: 4, marginLeft: 'auto' }} /></td>
                      <td className="text-end"><div style={{ width: 50, height: 14, background: 'rgba(148,163,184,0.1)', borderRadius: 4, marginLeft: 'auto' }} /></td>
                    </tr>
                  ))
                ) : compYTD != null && (compYTD.comparison?.length ?? 0) > 0 ? (
                  (() => {
                    const comp = compYTD.comparison!;
                    const c = comp.reduce((acc, item) => {
                      acc.occ += item.current.occupancyRate;
                      acc.adr += item.current.adr;
                      acc.revpar += item.current.revpar;
                      acc.rev += item.current.totalRevenue;
                      acc.prevOcc += item.previous.occupancyRate;
                      acc.prevAdr += item.previous.adr;
                      acc.prevRevpar += item.previous.revpar;
                      acc.prevRev += item.previous.totalRevenue;
                      acc.dOcc += item.deltas.occupancyRate ?? 0;
                      acc.dAdr += item.deltas.adr ?? 0;
                      acc.dRevpar += item.deltas.revpar ?? 0;
                      acc.dRev += item.deltas.revenue ?? 0;
                      return acc;
                    }, { occ: 0, adr: 0, revpar: 0, rev: 0, prevOcc: 0, prevAdr: 0, prevRevpar: 0, prevRev: 0, dOcc: 0, dAdr: 0, dRevpar: 0, dRev: 0 });
                    const n = comp.length;
                    const rows = [
                      { label: 'Taux d\'occupation', cur: (c.occ / n).toFixed(1) + '%', prev: (c.prevOcc / n).toFixed(1) + '%', delta: formatDelta(c.dOcc) },
                      { label: 'ADR', cur: Math.round(c.adr / n).toLocaleString('fr-FR') + ' DH', prev: Math.round(c.prevAdr / n).toLocaleString('fr-FR') + ' DH', delta: formatDelta(c.dAdr) },
                      { label: 'RevPAR', cur: Math.round(c.revpar / n).toLocaleString('fr-FR') + ' DH', prev: Math.round(c.prevRevpar / n).toLocaleString('fr-FR') + ' DH', delta: formatDelta(c.dRevpar) },
                      { label: 'Revenu', cur: Math.round(c.rev).toLocaleString('fr-FR') + ' DH', prev: Math.round(c.prevRev).toLocaleString('fr-FR') + ' DH', delta: formatDelta(c.dRev) },
                    ];
                    return rows.map((row, i) => (
                      <tr key={i}>
                        <td>{row.label}</td>
                        <td className="text-end">{row.cur}</td>
                        <td className="text-end">{row.prev}</td>
                        <td className="text-end" style={{ color: row.delta.type === 'positive' ? 'var(--green)' : row.delta.type === 'negative' ? '#ef4444' : 'inherit' }}>{row.delta.text}</td>
                      </tr>
                    ));
                  })()
                ) : (
                  <tr><td colSpan={4} className="text-center text-slate-400">Aucune donnée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {compTab === 'monthly' && (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Indicateur</th>
                  <th className="text-end">N</th>
                  <th className="text-end">N-1</th>
                  <th className="text-end">Delta</th>
                </tr>
              </thead>
              <tbody>
                {compMLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td><div style={{ width: 80, height: 14, background: 'rgba(148,163,184,0.1)', borderRadius: 4 }} /></td>
                      <td className="text-end"><div style={{ width: 60, height: 14, background: 'rgba(148,163,184,0.1)', borderRadius: 4, marginLeft: 'auto' }} /></td>
                      <td className="text-end"><div style={{ width: 60, height: 14, background: 'rgba(148,163,184,0.1)', borderRadius: 4, marginLeft: 'auto' }} /></td>
                      <td className="text-end"><div style={{ width: 50, height: 14, background: 'rgba(148,163,184,0.1)', borderRadius: 4, marginLeft: 'auto' }} /></td>
                    </tr>
                  ))
                ) : compMonthly ? (
                  (() => {
                    const rows = [
                      { label: 'Taux d\'occupation', cur: compMonthly.current.occupancyRate.toFixed(1) + '%', prev: compMonthly.previous.occupancyRate.toFixed(1) + '%', delta: formatDelta(compMonthly.deltas.occupancyRate) },
                      { label: 'ADR', cur: compMonthly.current.adr.toLocaleString('fr-FR') + ' DH', prev: compMonthly.previous.adr.toLocaleString('fr-FR') + ' DH', delta: formatDelta(compMonthly.deltas.adr) },
                      { label: 'RevPAR', cur: compMonthly.current.revpar.toLocaleString('fr-FR') + ' DH', prev: compMonthly.previous.revpar.toLocaleString('fr-FR') + ' DH', delta: formatDelta(compMonthly.deltas.revpar) },
                      { label: 'Revenu', cur: compMonthly.current.totalRevenue.toLocaleString('fr-FR') + ' DH', prev: compMonthly.previous.totalRevenue.toLocaleString('fr-FR') + ' DH', delta: formatDelta(compMonthly.deltas.revenue) },
                    ];
                    return rows.map((row, i) => (
                      <tr key={i}>
                        <td>{row.label}</td>
                        <td className="text-end">{row.cur}</td>
                        <td className="text-end">{row.prev}</td>
                        <td className="text-end" style={{ color: row.delta.type === 'positive' ? 'var(--green)' : row.delta.type === 'negative' ? '#ef4444' : 'inherit' }}>{row.delta.text}</td>
                      </tr>
                    ));
                  })()
                ) : (
                  <tr><td colSpan={4} className="text-center text-slate-400">Aucune donnée</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Quick Overview ── */}
      <div className="row g-3">
        {/* Arrivées du jour */}
        <div className="col-lg-4">
          <div className="glass-card p-4">
            <h6 className="chart-title mb-3">
              <i className="bi bi-door-open me-2 text-accent" />Arrivées du jour
              <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.65rem' }}>Démo</span>
            </h6>
            {arrivals?.map((a, i) => (
              <div key={i} className="quick-item">
                <div
                  className="quick-avatar"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                >
                  {getInitials(a.client)}
                </div>
                <div className="flex-1">
                  <div className="quick-name">{a.client}</div>
                  <div className="quick-room">Ch. {a.room} · {a.type}</div>
                </div>
                <span className="quick-time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Départs du jour */}
        <div className="col-lg-4">
          <div className="glass-card p-4">
            <h6 className="chart-title mb-3">
              <i className="bi bi-door-closed me-2" style={{ color: '#f59e0b' }} />Départs du jour
              <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.65rem' }}>Démo</span>
            </h6>
            {departures?.map((d, i) => (
              <div key={i} className="quick-item">
                <div
                  className="quick-avatar"
                  style={{ background: AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length] }}
                >
                  {getInitials(d.client)}
                </div>
                <div className="flex-1">
                  <div className="quick-name">{d.client}</div>
                  <div className="quick-room">Ch. {d.room}</div>
                </div>
                <span
                  className="quick-time"
                  style={{ color: d.status === 'soldé' ? 'var(--green)' : 'var(--amber)' }}
                >
                  {d.balance}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
