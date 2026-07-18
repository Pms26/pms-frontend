'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Dashboard (Module 0)
// Reproduction exacte du mockup : row g-3, glass-card, kpi-card,
// quick-item, rs-item, chart-title
// ═══════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { getKPIs, getTodayArrivals, getTodayDepartures } from '@/lib/api/analytics';
import { getRoomsSummary } from '@/lib/api/housekeeping';
import KPICard from '@/components/ui/KPICard';
import type { KPI } from '@/types';

// Charts (client components)
import EvolutionChart from '@/components/charts/EvolutionChart';
import SegmentChart from '@/components/charts/SegmentChart';

const ROOM_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  sale:      { label: 'Sale',      color: '#ef4444' },
  encours:   { label: 'En cours',  color: '#f59e0b' },
  propre:    { label: 'Propre',    color: '#10b981' },
  controlee: { label: 'Contrôlée', color: '#6366f1' },
  bloquee:   { label: 'Bloquée',   color: '#6b7280' },
};

const AVATAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function DashboardPage() {
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

  const { data: roomsSummary } = useQuery({
    queryKey: ['rooms-summary'],
    queryFn: getRoomsSummary,
  });

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
          <button className="btn btn-pms btn-sm">
            <i className="bi bi-download me-1" />Exporter
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
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

      {/* ── Charts area ── */}
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="glass-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="chart-title mb-0">Évolution T.O. &amp; ADR — 12 derniers mois</h6>
            </div>
            {/* Chart component */}
            <div style={{ height: 200 }}>
              <EvolutionChart />
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="glass-card p-4 h-100">
            <h6 className="chart-title mb-3">Répartition par Segment</h6>
            <div style={{ height: 200 }}>
             <SegmentChart />
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Overview ── */}
      <div className="row g-3">
        {/* Arrivées du jour */}
        <div className="col-lg-4">
          <div className="glass-card p-4">
            <h6 className="chart-title mb-3">
              <i className="bi bi-door-open me-2 text-accent" />Arrivées du jour
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

        {/* Statut Chambres */}
        <div className="col-lg-4">
          <div className="glass-card p-4">
            <h6 className="chart-title mb-3">
              <i className="bi bi-stars me-2 text-success" />Statut Chambres
            </h6>
            {roomsSummary
              ? Object.entries(roomsSummary).map(([status, count]) => {
                  const cfg = ROOM_STATUS_DISPLAY[status] || { label: status, color: '#6366f1' };
                  return (
                    <div key={status} className="rs-item">
                      <div className="rs-dot" style={{ background: cfg.color }} />
                      <span className="rs-label">{cfg.label}</span>
                      <span className="rs-count" style={{ color: cfg.color }}>{count as number}</span>
                    </div>
                  );
                })
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
