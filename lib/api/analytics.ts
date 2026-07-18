// ═══════════════════════════════════════════════════════════
// OASIS PMS — Analytics API
// Endpoints: /api/analytics/kpis, /segments, /ytd, /monthly
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { KPI, SegmentAnalytics, YTDCard } from '@/types';

// ─── Mock Data ───────────────────────────────────────────

const MOCK_KPIS: KPI[] = [
  { label: 'T.O. Mensuel',    value: '78',    unit: '%',     delta: '+4.2% vs N-1',  deltaType: 'positive', icon: 'houses',          gradient: 'from-indigo-500 to-violet-500',  gradientCss: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { label: 'T.O. Journalier', value: '85',    unit: '%',     delta: '+6.1% vs N-1',  deltaType: 'positive', icon: 'calendar-day',    gradient: 'from-cyan-500 to-cyan-600',      gradientCss: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
  { label: 'ADR',             value: '1 420', unit: 'DH',    delta: '+2.8% vs N-1',  deltaType: 'positive', icon: 'currency-dollar', gradient: 'from-amber-500 to-amber-600',    gradientCss: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  { label: 'RevPAR',          value: '1 207', unit: 'DH',    delta: '+3.5% vs N-1',  deltaType: 'positive', icon: 'graph-up-arrow',  gradient: 'from-emerald-500 to-emerald-600', gradientCss: 'linear-gradient(135deg,#10b981,#059669)' },
  { label: 'DMS',             value: '3.2',   unit: 'nuits', delta: '-0.3 vs N-1',   deltaType: 'negative', icon: 'moon',            gradient: 'from-pink-500 to-pink-600',      gradientCss: 'linear-gradient(135deg,#ec4899,#db2777)' },
  { label: 'CA Mensuel',      value: '487K',  unit: 'DH',    delta: '+11.4% vs N-1', deltaType: 'positive', icon: 'cash-stack',      gradient: 'from-violet-500 to-purple-600',  gradientCss: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
];

const MOCK_SEGMENTS: SegmentAnalytics[] = [
  { segment: 'Direct — Walk-in',    nuitees2026: 620,  nuitees2025: 580,  deltaNuitees: '+6.9%', ca2026: '42 000 DH',  ca2025: '38 000 DH',  deltaCa: '+10.5%', adr2026: '1 380 DH', adr2025: '1 310 DH', deltaAdr: '+5.3%' },
  { segment: 'Direct — Tél/Mail',   nuitees2026: 1840, nuitees2025: 1720, deltaNuitees: '+7.0%', ca2026: '78 000 DH',  ca2025: '71 000 DH',  deltaCa: '+9.9%', adr2026: '1 420 DH', adr2025: '1 380 DH', deltaAdr: '+2.9%' },
  { segment: 'OTA — Booking.com',   nuitees2026: 2600, nuitees2025: 2310, deltaNuitees: '+12.6%', ca2026: '110 000 DH', ca2025: '95 000 DH',  deltaCa: '+15.8%', adr2026: '1 300 DH', adr2025: '1 250 DH', deltaAdr: '+4.0%' },
  { segment: 'OTA — Expedia',       nuitees2026: 1460, nuitees2025: 1380, deltaNuitees: '+5.8%', ca2026: '62 000 DH',  ca2025: '57 000 DH',  deltaCa: '+8.8%', adr2026: '1 250 DH', adr2025: '1 200 DH', deltaAdr: '+4.2%' },
  { segment: 'OTA — Airbnb',        nuitees2026: 890,  nuitees2025: 820,  deltaNuitees: '+8.5%', ca2026: '38 000 DH',  ca2025: '34 000 DH',  deltaCa: '+11.8%', adr2026: '1 180 DH', adr2025: '1 130 DH', deltaAdr: '+4.4%' },
  { segment: 'B2B — Agence / TO',   nuitees2026: 2240, nuitees2025: 2050, deltaNuitees: '+9.3%', ca2026: '95 000 DH',  ca2025: '84 000 DH',  deltaCa: '+13.1%', adr2026: '1 410 DH', adr2025: '1 360 DH', deltaAdr: '+3.7%' },
  { segment: 'B2B — Corporate',     nuitees2026: 1700, nuitees2025: 1580, deltaNuitees: '+7.6%', ca2026: '72 000 DH',  ca2025: '65 000 DH',  deltaCa: '+10.8%', adr2026: '1 390 DH', adr2025: '1 330 DH', deltaAdr: '+4.5%' },
];

const MOCK_YTD: YTDCard[] = [
  { label: 'T.O. YTD — Juil. 2026 vs 2025', value: '+4.2%', barWidth: '78%', detail: '78% vs 73.8%' },
  { label: 'ADR YTD — Juil. 2026 vs 2025',  value: '+2.8%', barWidth: '65%', detail: '1 420 DH vs 1 382 DH' },
  { label: 'RevPAR YTD — Juil. 2026 vs 2025', value: '+7.3%', barWidth: '72%', detail: '1 207 DH vs 1 125 DH' },
];

const MOCK_MONTHLY_DATA = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
  occupancy: [62, 58, 65, 71, 74, 82, 78, 0, 0, 0, 0, 0],
  adr:       [1200, 1150, 1280, 1350, 1380, 1450, 1420, 0, 0, 0, 0, 0],
  segments: {
    direct: [35, 32, 38, 42, 44, 48, 45, 0, 0, 0, 0, 0],
    ota:    [18, 17, 19, 20, 21, 24, 22, 0, 0, 0, 0, 0],
    b2b:    [9, 9, 8, 9, 9, 10, 11, 0, 0, 0, 0, 0],
  },
};

const MOCK_ARRIVALS = [
  { client: 'Cherkaoui Yassine', room: '102', type: 'DP', time: '14:00' },
  { client: 'Idrissi Nadia',     room: '301', type: 'BB', time: '15:00' },
  { client: 'Dupont Pierre',     room: '202', type: 'DP', time: '16:30' },
];

const MOCK_DEPARTURES = [
  { client: 'Hassan Ahmed',  room: '402', balance: '0 DH',   status: 'soldé' },
  { client: 'Benali Sophia', room: '205', balance: '450 DH', status: 'en attente' },
];

// ─── API Functions ───────────────────────────────────────

export async function getKPIs(): Promise<KPI[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_KPIS;
  }

  const res = await apiClient.get<KPI[]>('/api/analytics/kpis');
  return res.data;
}

export async function getSegmentAnalytics(): Promise<SegmentAnalytics[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_SEGMENTS;
  }

  const res = await apiClient.get<SegmentAnalytics[]>('/api/analytics/segments');
  return res.data;
}

export async function getYTDComparison(): Promise<YTDCard[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_YTD;
  }

  const res = await apiClient.get<YTDCard[]>('/api/analytics/ytd');
  return res.data;
}

export async function getMonthlyData(): Promise<typeof MOCK_MONTHLY_DATA> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_MONTHLY_DATA;
  }

  const res = await apiClient.get('/api/analytics/monthly');
  return res.data;
}

export async function getTodayArrivals(): Promise<typeof MOCK_ARRIVALS> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_ARRIVALS;
  }

  const res = await apiClient.get('/api/analytics/today/arrivals');
  return res.data;
}

export async function getTodayDepartures(): Promise<typeof MOCK_DEPARTURES> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_DEPARTURES;
  }

  const res = await apiClient.get('/api/analytics/today/departures');
  return res.data;
}
