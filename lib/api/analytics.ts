// ═══════════════════════════════════════════════════════════
// OASIS PMS — Analytics API
// Backend: analytics (port 4006) via gateway
// Routes: /api/dashboard, /api/segments, /api/comparison
// ═══════════════════════════════════════════════════════════

import apiClient from './client';
import type { KPI, TrendResponse, SegmentGroupsResponse, SegmentDistribution, MonthlyComparison, YTDComparisonResponse, SegmentTrendResponse } from '@/types';

export const SEGMENT_GROUP_COLORS: Record<string, string> = {
  DIRECT: '#6366f1',
  OTA: '#10b981',
  PARTENAIRES: '#f59e0b',
  AUTRES: '#94a3b8',
};

export function mapSegmentToGroup(segmentCode: string, groups: Record<string, string[]>): string {
  for (const [group, codes] of Object.entries(groups)) {
    if (codes.includes(segmentCode)) return group;
  }
  return 'AUTRES';
}

export function formatDelta(delta: number | null): { text: string; type: 'positive' | 'negative' | 'neutral' } {
  if (delta === null) return { text: '—', type: 'neutral' };
  const sign = delta > 0 ? '+' : '';
  return {
    text: `${sign}${delta.toFixed(1)}%`,
    type: delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral',
  };
}

export async function getKPIs(): Promise<KPI[]> {
  const res = await apiClient.get('/api/analytics/dashboard');
  const kpisData = res.data.kpis || res.data;

  if (Array.isArray(kpisData)) return kpisData;

  const kpis: KPI[] = [];
  const defs: { key: string; label: string; unit: string; icon: string; grad: string; gradCss: string }[] = [
    { key: 'toMensuel', label: 'T.O. Mensuel', unit: '%', icon: 'houses', grad: 'from-indigo-500 to-violet-500', gradCss: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { key: 'toJournalier', label: 'T.O. Journalier', unit: '%', icon: 'calendar-day', grad: 'from-cyan-500 to-cyan-600', gradCss: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
    { key: 'adr', label: 'ADR', unit: 'DH', icon: 'currency-dollar', grad: 'from-amber-500 to-amber-600', gradCss: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { key: 'revpar', label: 'RevPAR', unit: 'DH', icon: 'graph-up-arrow', grad: 'from-emerald-500 to-emerald-600', gradCss: 'linear-gradient(135deg,#10b981,#059669)' },
    { key: 'dms', label: 'DMS', unit: 'nuits', icon: 'moon', grad: 'from-pink-500 to-pink-600', gradCss: 'linear-gradient(135deg,#ec4899,#db2777)' },
    { key: 'caMensuel', label: 'CA Mensuel', unit: 'DH', icon: 'cash-stack', grad: 'from-violet-500 to-purple-600', gradCss: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
  ];

  for (const def of defs) {
    const raw = kpisData[def.key] || kpisData[def.key.toLowerCase()];
    if (raw) {
      const val = typeof raw === 'object' ? raw.value : raw;
      const prev = typeof raw === 'object' ? raw.prevValue : null;
      const evo = typeof raw === 'object' ? raw.evolution : null;
      const deltaStr = evo != null ? `${evo > 0 ? '+' : ''}${Number(evo).toLocaleString('fr-FR')}%` : '';
      kpis.push({
        label: def.label,
        value: val != null ? Number(val).toLocaleString('fr-FR') : '0',
        unit: def.unit,
        delta: deltaStr ? `${deltaStr} vs N-1` : '',
        deltaType: evo != null && evo > 0 ? 'positive' : evo != null && evo < 0 ? 'negative' : 'neutral',
        icon: def.icon,
        gradient: def.grad,
        gradientCss: def.gradCss,
      });
    }
  }

  return kpis;
}

export async function getSegmentGroups(): Promise<SegmentGroupsResponse> {
  const res = await apiClient.get('/api/analytics/segments');
  return res.data;
}

export async function getSegmentDistribution(year: number, month: number): Promise<SegmentDistribution> {
  const res = await apiClient.get('/api/analytics/segments/distribution', { params: { year, month } });
  const data = res.data;
  return {
    period: data.period ?? { year, month },
    totalNights: data.totalNights ?? 0,
    pieChart: Array.isArray(data.pieChart) ? data.pieChart : [],
    barChart: Array.isArray(data.barChart) ? data.barChart : [],
  };
}

export async function getComparisonYTD(year: number, segment?: string): Promise<YTDComparisonResponse> {
  const res = await apiClient.get('/api/analytics/comparison/ytd', { params: { year, segment } });
  const data = res.data;
  const rawComparison = Array.isArray(data.comparison) ? data.comparison : [];
  const comparison: YTDComparisonResponse['comparison'] = rawComparison.map((item: any) => ({
    month: item.month,
    current: {
      totalRooms: item.current?.totalRooms ?? 0,
      totalNights: item.current?.nights ?? item.current?.totalNights ?? 0,
      totalRevenue: item.current?.revenue ?? item.current?.totalRevenue ?? 0,
      occupancyRate: item.current?.occupancyRate ?? 0,
      adr: item.current?.adr ?? 0,
      revpar: item.current?.revpar ?? 0,
    },
    previous: {
      totalRooms: item.previous?.totalRooms ?? 0,
      totalNights: item.previous?.nights ?? item.previous?.totalNights ?? 0,
      totalRevenue: item.previous?.revenue ?? item.previous?.totalRevenue ?? 0,
      occupancyRate: item.previous?.occupancyRate ?? 0,
      adr: item.previous?.adr ?? 0,
      revpar: item.previous?.revpar ?? 0,
    },
    deltas: {
      occupancyRate: item.deltas?.occupancyRate ?? null,
      adr: item.deltas?.adr ?? null,
      revpar: item.deltas?.revpar ?? null,
      revenue: item.deltas?.revenue ?? null,
    },
  }));
  return {
    period: data.period ?? { currentYear: year, prevYear: year - 1, upToMonth: 0 },
    segment: data.segment ?? segment ?? 'all',
    comparison,
  };
}

export async function getComparisonMonthly(year: number, month: number, segment?: string): Promise<MonthlyComparison> {
  const res = await apiClient.get('/api/analytics/comparison/monthly', { params: { year, month, segment } });
  return res.data;
}

export async function getDashboardTrend(year: number): Promise<TrendResponse> {
  const res = await apiClient.get('/api/analytics/dashboard/trend', { params: { year } });
  return res.data;
}

export async function getSegmentTrend(year: number): Promise<SegmentTrendResponse> {
  const res = await apiClient.get('/api/analytics/segments/trend', { params: { year } });
  return res.data;
}
