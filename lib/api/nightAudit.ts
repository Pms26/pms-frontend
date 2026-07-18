// ═══════════════════════════════════════════════════════════
// OASIS PMS — Night Audit API
// Endpoints: /api/night-audit/status, /check-balance, /close, /history
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { NightAuditStatus, NightAuditCheck, NightAuditReport, Closure } from '@/types';

// ─── Mock Data ───────────────────────────────────────────

const MOCK_CHECKS: NightAuditCheck[] = [
  { id: 'chk-1', label: 'Réservations non assignées', description: '0 réservation sans chambre', status: 'ok', icon: 'calendar-check', color: '#10b981' },
  { id: 'chk-2', label: 'Check-outs en attente', description: '1 départ non finalisé', status: 'warning', icon: 'box-arrow-right', color: '#f59e0b' },
  { id: 'chk-3', label: 'Folios ouverts', description: 'Tous les folios sont équilibrés', status: 'ok', icon: 'receipt', color: '#10b981' },
  { id: 'chk-4', label: 'Chambres non inspectées', description: '2 chambres sans statut HK', status: 'warning', icon: 'stars', color: '#f59e0b' },
  { id: 'chk-5', label: 'Caisses rapprochées', description: 'Caisse principale OK', status: 'ok', icon: 'cash-coin', color: '#10b981' },
  { id: 'chk-6', label: 'No-Shows à traiter', description: '1 no-show non clôturé', status: 'error', icon: 'exclamation-triangle', color: '#ef4444' },
];

const MOCK_REPORTS: NightAuditReport[] = [
  { icon: 'file-earmark-bar-graph', label: 'Rapport CA Détaillé de la journée', color: '#6366f1' },
  { icon: 'cash-coin', label: 'Rapport des Encaissements du jour (Main Courante)', color: '#10b981' },
  { icon: 'box-arrow-right', label: 'Rapport des Départs Attendus (Expected Departures)', color: '#f59e0b' },
  { icon: 'box-arrow-in-right', label: 'Rapport des Arrivées Prévues (Expected Arrivals)', color: '#06b6d4' },
  { icon: 'graph-up', label: "Rapport d'Occupation et Prévisions (Occupancy Forecast)", color: '#8b5cf6' },
  { icon: 'building-gear', label: 'Rapport Housekeeping — État des chambres J+1', color: '#ec4899' },
];

const MOCK_HISTORY: Closure[] = [
  { id: 'CLO-001', businessDate: '2026-07-07', closedAt: '2026-07-08T02:15:00', closedBy: 'Sidi Omar', revenue: 45200, occupancyRate: 82 },
  { id: 'CLO-002', businessDate: '2026-07-06', closedAt: '2026-07-07T01:45:00', closedBy: 'Sidi Omar', revenue: 38700, occupancyRate: 76 },
  { id: 'CLO-003', businessDate: '2026-07-05', closedAt: '2026-07-06T02:30:00', closedBy: 'Nadia Idrissi', revenue: 41500, occupancyRate: 79 },
  { id: 'CLO-004', businessDate: '2026-07-04', closedAt: '2026-07-05T01:20:00', closedBy: 'Sidi Omar', justification: 'Retard check-out 402', revenue: 52100, occupancyRate: 88 },
  { id: 'CLO-005', businessDate: '2026-07-03', closedAt: '2026-07-04T02:00:00', closedBy: 'Sidi Omar', revenue: 36800, occupancyRate: 71 },
];

// ─── API Functions ───────────────────────────────────────

export async function getNightAuditStatus(): Promise<NightAuditStatus> {
  if (USE_MOCKS) {
    await mockDelay();
    return {
      businessDate: '2026-07-08',
      isOpen: true,
      lastClosedDate: '2026-07-07',
      checks: MOCK_CHECKS,
    };
  }

  const res = await apiClient.get<NightAuditStatus>('/api/night-audit/status');
  return res.data;
}

export async function getNightAuditReports(): Promise<NightAuditReport[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_REPORTS;
  }

  const res = await apiClient.get<NightAuditReport[]>('/api/night-audit/reports');
  return res.data;
}

export async function checkBalance(businessDate: string): Promise<{ balanced: boolean; details: NightAuditCheck[] }> {
  if (USE_MOCKS) {
    await mockDelay(600);
    return { balanced: true, details: MOCK_CHECKS };
  }

  const res = await apiClient.post('/api/night-audit/check-balance', { business_date: businessDate });
  return res.data;
}

export async function closeDay(businessDate: string, justification?: string): Promise<Closure> {
  if (USE_MOCKS) {
    await mockDelay(1200);
    return {
      id: `CLO-${Date.now()}`,
      businessDate,
      closedAt: new Date().toISOString(),
      closedBy: 'Sidi Omar',
      justification,
      revenue: 45200,
      occupancyRate: 82,
    };
  }

  const res = await apiClient.post<Closure>('/api/night-audit/close', {
    business_date: businessDate,
    justification,
  });
  return res.data;
}

// Backwards-compatible alias used by the UI (historical name in the original prototype)
export async function closeNightAudit(businessDate?: string, justification?: string): Promise<Closure> {
  const date = businessDate ?? new Date().toISOString().slice(0, 10);
  return closeDay(date, justification);
}

export async function getClosureHistory(): Promise<Closure[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_HISTORY;
  }

  const res = await apiClient.get<Closure[]>('/api/night-audit/history');
  return res.data;
}
