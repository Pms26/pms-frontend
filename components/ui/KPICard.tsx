// ═══════════════════════════════════════════════════════════
// OASIS PMS — KPI Card Component (Classes CSS du mockup)
// kpi-card glass-card → kpi-icon → kpi-label → kpi-value → kpi-delta
// ═══════════════════════════════════════════════════════════

import type { KPI } from '@/types';

interface KPICardProps {
  kpi: KPI;
}

export default function KPICard({ kpi }: KPICardProps) {
  return (
    <div className="kpi-card glass-card">
      {/* Icon gradient */}
      <div className="kpi-icon" style={{ background: kpi.gradientCss }}>
        <i className={`bi bi-${kpi.icon}`} />
      </div>

      {/* Label */}
      <div className="kpi-label">{kpi.label}</div>

      {/* Value */}
      <div className="kpi-value">
        {kpi.value}
        {kpi.unit && <span className="kpi-unit">{kpi.unit}</span>}
      </div>

      {/* Delta */}
      <div className={`kpi-delta ${kpi.deltaType === 'positive' ? 'positive' : kpi.deltaType === 'negative' ? 'negative' : ''}`}>
        <i className={`bi ${kpi.deltaType === 'positive' ? 'bi-arrow-up' : kpi.deltaType === 'negative' ? 'bi-arrow-down' : 'bi-dash'}`} />
        {kpi.delta}
      </div>
    </div>
  );
}
