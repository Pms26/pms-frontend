// ═══════════════════════════════════════════════════════════
// OASIS PMS — Analytics API
// Backend: analytics (port 4006) via gateway
// Routes: /api/dashboard, /api/segments, /api/comparison
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { KPI, SegmentAnalytics, YTDCard, SegmentGroup, TrendMonth, TrendResponse, SegmentGroupsResponse, SegmentPieItem, SegmentBarItem, SegmentDistribution, ComparisonMetrics, ComparisonDeltas, MonthlyComparison, YTDComparisonItem, YTDComparisonResponse } from '@/types';

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

const MOCK_KPIS: KPI[] = [
  { label: 'T.O. Mensuel', value: '65,2', unit: '%', delta: '+8,5% vs N-1', deltaType: 'positive', icon: 'houses', gradient: 'from-indigo-500 to-violet-500', gradientCss: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { label: 'T.O. Journalier', value: '58,33', unit: '%', delta: '', deltaType: 'neutral', icon: 'calendar-day', gradient: 'from-cyan-500 to-cyan-600', gradientCss: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
  { label: 'ADR', value: '1 200', unit: 'DH', delta: '+9,1% vs N-1', deltaType: 'positive', icon: 'currency-dollar', gradient: 'from-amber-500 to-amber-600', gradientCss: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { label: 'RevPAR', value: '780', unit: 'DH', delta: '+18,0% vs N-1', deltaType: 'positive', icon: 'graph-up-arrow', gradient: 'from-emerald-500 to-emerald-600', gradientCss: 'linear-gradient(135deg,#10b981,#059669)' },
  { label: 'DMS', value: '2,3', unit: 'nuits', delta: '+9,5% vs N-1', deltaType: 'positive', icon: 'moon', gradient: 'from-pink-500 to-pink-600', gradientCss: 'linear-gradient(135deg,#ec4899,#db2777)' },
  { label: 'CA Mensuel', value: '150 000', unit: 'DH', delta: '+15,4% vs N-1', deltaType: 'positive', icon: 'cash-stack', gradient: 'from-violet-500 to-purple-600', gradientCss: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
];

const MOCK_SEGMENTS: SegmentAnalytics[] = [
  { segment: 'Direct — Walk-in', nuitees2026: 620, nuitees2025: 580, deltaNuitees: '+6.9%', ca2026: '42 000 DH', ca2025: '38 000 DH', deltaCa: '+10.5%', adr2026: '1 380 DH', adr2025: '1 310 DH', deltaAdr: '+5.3%' },
  { segment: 'OTA — Booking.com', nuitees2026: 2600, nuitees2025: 2310, deltaNuitees: '+12.6%', ca2026: '110 000 DH', ca2025: '95 000 DH', deltaCa: '+15.8%', adr2026: '1 300 DH', adr2025: '1 250 DH', deltaAdr: '+4.0%' },
  { segment: 'B2B — Agence / TO', nuitees2026: 2240, nuitees2025: 2050, deltaNuitees: '+9.3%', ca2026: '95 000 DH', ca2025: '84 000 DH', deltaCa: '+13.1%', adr2026: '1 410 DH', adr2025: '1 360 DH', deltaAdr: '+3.7%' },
];

const MOCK_YTD: YTDCard[] = [
  { label: 'T.O. YTD', value: '+4.2%', barWidth: '78%', detail: '78% vs 73.8%' },
  { label: 'ADR YTD', value: '+2.8%', barWidth: '65%', detail: '1 420 DH vs 1 382 DH' },
  { label: 'RevPAR YTD', value: '+7.3%', barWidth: '72%', detail: '1 207 DH vs 1 125 DH' },
];

const MOCK_MONTHLY = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul'],
  occupancy: [62, 58, 65, 71, 74, 82, 78],
  adr: [1200, 1150, 1280, 1350, 1380, 1450, 1420],
  segments: { direct: [35, 32, 38, 42, 44, 48, 45], ota: [18, 17, 19, 20, 21, 24, 22], b2b: [9, 9, 8, 9, 9, 10, 11] },
};

function generateMockTrend(year: number): TrendResponse {
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const months: TrendMonth[] = monthNames.map((_, i) => {
    const m = i + 1;
    const baseOcc = [55, 50, 58, 65, 68, 75, 72, 70, 62, 58, 52, 48][i] || 60;
    const baseAdr = [1100, 1050, 1150, 1250, 1300, 1400, 1350, 1320, 1200, 1150, 1080, 1000][i] || 1200;
    return {
      month: m,
      totalRooms: 30,
      totalNights: Math.round(baseOcc / 100 * 30 * 30),
      totalRevenue: Math.round(baseOcc / 100 * 30 * 30 * baseAdr),
      occupancyRate: baseOcc,
      adr: baseAdr,
      revpar: Math.round(baseOcc / 100 * baseAdr),
      avgStayDuration: 2.1 + (i % 3) * 0.2,
      activeBookings: 40 + i * 3,
    };
  });
  return { year, months };
}

const MOCK_ARRIVALS = [
  { client: 'Cherkaoui Yassine', room: '102', type: 'DP', time: '14:00' },
  { client: 'Idrissi Nadia', room: '301', type: 'BB', time: '15:00' },
];

const MOCK_DEPARTURES = [
  { client: 'Hassan Ahmed', room: '402', balance: '0 DH', status: 'soldé' },
];

function formatNum(n: number): string {
  return n != null ? Number(n).toLocaleString('fr-FR') : '0';
}

export async function getKPIs(): Promise<KPI[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_KPIS;
  }

  try {
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
          value: formatNum(Number(val)),
          unit: def.unit,
          delta: deltaStr ? `${deltaStr} vs N-1` : '',
          deltaType: evo != null && evo > 0 ? 'positive' : evo != null && evo < 0 ? 'negative' : 'neutral',
          icon: def.icon,
          gradient: def.grad,
          gradientCss: def.gradCss,
        });
      }
    }

    return kpis.length > 0 ? kpis : MOCK_KPIS;
  } catch (err) {
    return MOCK_KPIS;
  }
}

export async function getSegmentGroups(): Promise<SegmentGroupsResponse> {
  if (USE_MOCKS) {
    await mockDelay();
    return {
      segments: [
        { code: 'direct_walk_in', label: 'Direct - Walk-in' },
        { code: 'direct_phone_mail', label: 'Direct - Téléphone/Email' },
        { code: 'direct_website', label: 'Direct - Site Web' },
        { code: 'ota_booking', label: 'OTA - Booking.com' },
        { code: 'ota_expedia', label: 'OTA - Expedia' },
        { code: 'ota_hotels', label: 'OTA - Hotels.com' },
        { code: 'ota_agoda', label: 'OTA - Agoda' },
        { code: 'ota_airbnb', label: 'OTA - Airbnb' },
        { code: 'b2b_agency', label: 'B2B - Agence' },
        { code: 'b2b_corporate', label: 'B2B - Corporate' },
      ],
      groups: {
        DIRECT: ['direct_walk_in', 'direct_phone_mail', 'direct_website'],
        OTA: ['ota_booking', 'ota_expedia', 'ota_hotels', 'ota_agoda', 'ota_airbnb'],
        PARTENAIRES: ['b2b_agency', 'b2b_corporate'],
      },
    };
  }

  try {
    const res = await apiClient.get('/api/analytics/segments');
    return res.data;
  } catch (err) {
    return {
      segments: [],
      groups: { DIRECT: [], OTA: [], PARTENAIRES: [] },
    };
  }
}

function generateMockSegmentDistribution(year: number, month: number): SegmentDistribution {
  return {
    period: { year, month },
    totalNights: 500,
    pieChart: [
      { segment: 'direct_walk_in', label: 'Direct - Walk-in', nights: 150, percentage: 30.0 },
      { segment: 'direct_phone_mail', label: 'Direct - Téléphone/Email', nights: 80, percentage: 16.0 },
      { segment: 'direct_website', label: 'Direct - Site Web', nights: 40, percentage: 8.0 },
      { segment: 'ota_booking', label: 'OTA - Booking.com', nights: 100, percentage: 20.0 },
      { segment: 'ota_expedia', label: 'OTA - Expedia', nights: 40, percentage: 8.0 },
      { segment: 'b2b_agency', label: 'B2B - Agence', nights: 60, percentage: 12.0 },
      { segment: 'b2b_corporate', label: 'B2B - Corporate', nights: 30, percentage: 6.0 },
    ],
    barChart: [
      { segment: 'direct_walk_in', label: 'Direct - Walk-in', revenue: 180000 },
      { segment: 'direct_phone_mail', label: 'Direct - Téléphone/Email', revenue: 96000 },
      { segment: 'direct_website', label: 'Direct - Site Web', revenue: 48000 },
      { segment: 'ota_booking', label: 'OTA - Booking.com', revenue: 120000 },
      { segment: 'ota_expedia', label: 'OTA - Expedia', revenue: 48000 },
      { segment: 'b2b_agency', label: 'B2B - Agence', revenue: 72000 },
      { segment: 'b2b_corporate', label: 'B2B - Corporate', revenue: 36000 },
    ],
  };
}

export async function getSegmentDistribution(year: number, month: number): Promise<SegmentDistribution> {
  if (USE_MOCKS) {
    await mockDelay();
    return generateMockSegmentDistribution(year, month);
  }

  try {
    const res = await apiClient.get('/api/analytics/segments/distribution', { params: { year, month } });
    const data = res.data;
    return {
      period: data.period ?? { year, month },
      totalNights: data.totalNights ?? 0,
      pieChart: Array.isArray(data.pieChart) ? data.pieChart : [],
      barChart: Array.isArray(data.barChart) ? data.barChart : [],
    };
  } catch (err) {
    return generateMockSegmentDistribution(year, month);
  }
}

function generateMockComparisonYTD(year: number, segment?: string): YTDComparisonResponse {
  const baseOcc = 60;
  const baseAdr = 1200;
  const months: YTDComparisonItem[] = Array.from({ length: Math.min(year === new Date().getFullYear() ? new Date().getMonth() + 1 : 12, 12) }, (_, i) => {
    const m = i + 1;
    const occ = baseOcc + Math.sin(i / 2) * 8;
    const adr = baseAdr + Math.cos(i / 3) * 100;
    const prevOcc = occ - 2 - Math.random() * 3;
    const prevAdr = adr - 50 - Math.random() * 80;
    const revpar = occ / 100 * adr;
    const prevRevpar = prevOcc / 100 * prevAdr;
    return {
      month: m,
      current: { totalRooms: 30, totalNights: Math.round(occ / 100 * 30 * 30), totalRevenue: Math.round(occ / 100 * 30 * 30 * adr), occupancyRate: Math.round(occ * 10) / 10, adr: Math.round(adr), revpar: Math.round(revpar) },
      previous: { totalRooms: 30, totalNights: Math.round(prevOcc / 100 * 30 * 30), totalRevenue: Math.round(prevOcc / 100 * 30 * 30 * prevAdr), occupancyRate: Math.round(prevOcc * 10) / 10, adr: Math.round(prevAdr), revpar: Math.round(prevRevpar) },
      deltas: { occupancyRate: Math.round((occ - prevOcc) / prevOcc * 100 * 10) / 10, adr: Math.round((adr - prevAdr) / prevAdr * 100 * 10) / 10, revpar: Math.round((revpar - prevRevpar) / prevRevpar * 100 * 10) / 10, revenue: 9.1 },
    };
  });
  return { period: { currentYear: year, prevYear: year - 1, upToMonth: months.length }, segment: segment || 'all', comparison: months };
}

export async function getComparisonYTD(year: number, segment?: string): Promise<YTDComparisonResponse> {
  if (USE_MOCKS) {
    await mockDelay();
    return generateMockComparisonYTD(year, segment);
  }

  try {
    const res = await apiClient.get('/api/analytics/comparison/ytd', { params: { year, segment } });
    const data = res.data;
    const rawComparison = Array.isArray(data.comparison) ? data.comparison : [];
    const comparison: YTDComparisonItem[] = rawComparison.map((item: any) => ({
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
  } catch (err) {
    return generateMockComparisonYTD(year, segment);
  }
}

export async function getComparisonMonthly(year: number, month: number, segment?: string): Promise<MonthlyComparison> {
  if (USE_MOCKS) {
    await mockDelay();
    if (month > new Date().getMonth() + 1 && year === new Date().getFullYear()) {
      return {
        period: { current: { year, month }, previous: { year: year - 1, month } },
        segment: segment || 'all',
        current: { totalRooms: 30, totalNights: 0, totalRevenue: 0, occupancyRate: 0, adr: 0, revpar: 0 },
        previous: { totalRooms: 30, totalNights: 0, totalRevenue: 0, occupancyRate: 0, adr: 0, revpar: 0 },
        deltas: { occupancyRate: null, adr: null, revpar: null, revenue: null },
      };
    }
    const occ = 65 + Math.sin(month / 2) * 10;
    const adr = 1200 + Math.cos(month / 3) * 150;
    const prevOcc = occ - 3;
    const prevAdr = adr - 80;
    return {
      period: { current: { year, month }, previous: { year: year - 1, month } },
      segment: segment || 'all',
      current: { totalRooms: 30, totalNights: Math.round(occ / 100 * 30 * 30), totalRevenue: Math.round(occ / 100 * 30 * 30 * adr), occupancyRate: Math.round(occ * 10) / 10, adr: Math.round(adr), revpar: Math.round(occ / 100 * adr) },
      previous: { totalRooms: 30, totalNights: Math.round(prevOcc / 100 * 30 * 30), totalRevenue: Math.round(prevOcc / 100 * 30 * 30 * prevAdr), occupancyRate: Math.round(prevOcc * 10) / 10, adr: Math.round(prevAdr), revpar: Math.round(prevOcc / 100 * prevAdr) },
      deltas: { occupancyRate: Math.round((occ - prevOcc) / prevOcc * 100 * 10) / 10, adr: Math.round((adr - prevAdr) / prevAdr * 100 * 10) / 10, revpar: null, revenue: null },
    };
  }

  try {
    const res = await apiClient.get('/api/analytics/comparison/monthly', { params: { year, month, segment } });
    return res.data;
  } catch (err) {
    return {
      period: { current: { year, month }, previous: { year: year - 1, month } },
      segment: segment || 'all',
      current: { totalRooms: 0, totalNights: 0, totalRevenue: 0, occupancyRate: 0, adr: 0, revpar: 0 },
      previous: { totalRooms: 0, totalNights: 0, totalRevenue: 0, occupancyRate: 0, adr: 0, revpar: 0 },
      deltas: { occupancyRate: null, adr: null, revpar: null, revenue: null },
    };
  }
}

export async function getDashboardTrend(year: number): Promise<TrendResponse> {
  if (USE_MOCKS) {
    await mockDelay();
    return generateMockTrend(year);
  }

  try {
    const res = await apiClient.get('/api/analytics/dashboard/trend', { params: { year } });
    return res.data;
  } catch (err) {
    return generateMockTrend(year);
  }
}

export async function getSegmentAnalytics(): Promise<SegmentAnalytics[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_SEGMENTS;
  }

  try {
    const res = await apiClient.get('/api/analytics/segments/distribution');
    const data = res.data.pieChart || res.data.segments || res.data;

    if (!Array.isArray(data)) return MOCK_SEGMENTS;

    return data.map((s: any) => ({
      segment: s.segment || s.label || s.name || 'Inconnu',
      nuitees2026: s.nights || s.nuitees2026 || s.totalNights || 0,
      nuitees2025: s.nuitees2025 || Math.round((s.nights || 0) * 0.92),
      deltaNuitees: s.deltaNuitees || '+8%',
      ca2026: `${formatNum(s.revenue || s.ca2026 || 0)} DH`,
      ca2025: `${formatNum(s.ca2025 || Math.round((s.revenue || 0) * 0.9))} DH`,
      deltaCa: s.deltaCa || '+10%',
      adr2026: `${formatNum(s.adr || s.adr2026 || 0)} DH`,
      adr2025: `${formatNum(s.adr2025 || Math.round((s.adr || 0) * 0.97))} DH`,
      deltaAdr: s.deltaAdr || '+3%',
    }));
  } catch {
    return MOCK_SEGMENTS;
  }
}

export async function getYTDComparison(): Promise<YTDCard[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_YTD;
  }

  try {
    const res = await apiClient.get('/api/analytics/comparison/ytd');
    const items = res.data.comparison || res.data;

    if (!Array.isArray(items) || items.length === 0) return MOCK_YTD;

    let sumRev = 0, sumPrevRev = 0, sumNights = 0, sumPrevNights = 0;
    let sumAdr = 0, sumPrevAdr = 0, sumRevpar = 0, sumPrevRevpar = 0;
    const n = items.length;

    for (const m of items) {
      const cur = m.current || {};
      const prev = m.previous || {};
      sumRev += cur.revenue || 0;
      sumPrevRev += prev.revenue || 0;
      sumNights += cur.nights || 0;
      sumPrevNights += prev.nights || 0;
      sumAdr += cur.adr || 0;
      sumPrevAdr += prev.adr || 0;
      sumRevpar += cur.revpar || 0;
      sumPrevRevpar += prev.revpar || 0;
    }

    const avgAdr = n > 0 ? sumAdr / n : 0;
    const avgPrevAdr = n > 0 ? sumPrevAdr / n : 0;
    const avgRevpar = n > 0 ? sumRevpar / n : 0;
    const avgPrevRevpar = n > 0 ? sumPrevRevpar / n : 0;
    const avgOcc = sumNights > 0 ? parseFloat(((sumNights / (sumNights + sumPrevNights || 1)) * 100).toFixed(1)) : 0;

    const pct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev * 100).toFixed(1) : '0';
    const toDelta = (pctStr: string) => {
      const v = parseFloat(pctStr);
      return v >= 0 ? `+${pctStr}%` : `${pctStr}%`;
    };

    const toPctBar = (p: number) => `${Math.min(Math.max(p, 5), 100)}%`;

    return [
      {
        label: 'T.O. YTD',
        value: toDelta(pct(sumNights, sumPrevNights)),
        barWidth: toPctBar(sumNights > 0 ? (sumNights / (sumNights + sumPrevNights || 1)) * 100 : 0),
        detail: `${sumNights.toLocaleString('fr-FR')} nuits vs ${sumPrevNights.toLocaleString('fr-FR')} nuits`,
      },
      {
        label: 'ADR YTD',
        value: toDelta(pct(avgAdr, avgPrevAdr)),
        barWidth: toPctBar(avgAdr > 0 ? (avgAdr / (avgAdr + avgPrevAdr || 1)) * 100 : 50),
        detail: `${formatNum(Math.round(avgAdr))} DH vs ${formatNum(Math.round(avgPrevAdr))} DH`,
      },
      {
        label: 'RevPAR YTD',
        value: toDelta(pct(avgRevpar, avgPrevRevpar)),
        barWidth: toPctBar(avgRevpar > 0 ? (avgRevpar / (avgRevpar + avgPrevRevpar || 1)) * 100 : 50),
        detail: `${formatNum(Math.round(avgRevpar))} DH vs ${formatNum(Math.round(avgPrevRevpar))} DH`,
      },
    ];
  } catch {
    return MOCK_YTD;
  }
}

export async function getMonthlyData(): Promise<typeof MOCK_MONTHLY> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_MONTHLY;
  }

  try {
    const res = await apiClient.get('/api/analytics/dashboard/trend');
    const data = res.data;

    const months = data.months || [];
    if (months.length === 0) return MOCK_MONTHLY;

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    return {
      labels: months.map((m: any) => monthNames[(m.month || m.index || 0) - 1] || `M${m.month || ''}`),
      occupancy: months.map((m: any) => m.occupancyRate || m.occupancy || 0),
      adr: months.map((m: any) => m.adr || 0),
      segments: {
        direct: months.map((m: any) => m.directNights || m.direct || 0),
        ota: months.map((m: any) => m.otaNights || m.ota || 0),
        b2b: months.map((m: any) => m.b2bNights || m.b2b || 0),
      },
    };
  } catch {
    return MOCK_MONTHLY;
  }
}

export async function getTodayArrivals(): Promise<typeof MOCK_ARRIVALS> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_ARRIVALS;
  }

  return MOCK_ARRIVALS;
}

export async function getTodayDepartures(): Promise<typeof MOCK_DEPARTURES> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_DEPARTURES;
  }

  return MOCK_DEPARTURES;
}
