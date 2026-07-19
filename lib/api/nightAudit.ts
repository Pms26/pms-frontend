// ═══════════════════════════════════════════════════════════
// OASIS PMS — Night Audit API
// Backend: service-night-audit (port 4007) via gateway
// Routes: /api/night-audit/status, /check-balance, /close, /history
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { NightAuditStatus, NightAuditCheck, NightAuditReport, Closure } from '@/types';

const MOCK_CHECKS: NightAuditCheck[] = [
  { id: 'chk-1', label: 'Réservations non assignées', description: '0 réservation sans chambre', status: 'ok', icon: 'calendar-check', color: '#10b981' },
  { id: 'chk-2', label: 'Check-outs en attente', description: '1 départ non finalisé', status: 'warning', icon: 'box-arrow-right', color: '#f59e0b' },
  { id: 'chk-3', label: 'Folios ouverts', description: 'Tous les folios sont équilibrés', status: 'ok', icon: 'receipt', color: '#10b981' },
  { id: 'chk-4', label: 'Chambres non inspectées', description: '2 chambres sans statut HK', status: 'warning', icon: 'stars', color: '#f59e0b' },
  { id: 'chk-5', label: 'Caisses rapprochées', description: 'Caisse principale OK', status: 'ok', icon: 'cash-coin', color: '#10b981' },
  { id: 'chk-6', label: 'No-Shows à traiter', description: '1 no-show non clôturé', status: 'error', icon: 'exclamation-triangle', color: '#ef4444' },
];

const MOCK_REPORTS: NightAuditReport[] = [
  { icon: 'file-earmark-bar-graph', label: 'Rapport CA Détaillé', color: '#6366f1' },
  { icon: 'cash-coin', label: 'Rapport Encaissements', color: '#10b981' },
  { icon: 'box-arrow-right', label: 'Rapport Départs Attendus', color: '#f59e0b' },
  { icon: 'box-arrow-in-right', label: 'Rapport Arrivées Prévues', color: '#06b6d4' },
  { icon: 'graph-up', label: "Rapport d'Occupation", color: '#8b5cf6' },
  { icon: 'building-gear', label: 'Rapport Housekeeping', color: '#ec4899' },
];

const MOCK_HISTORY: Closure[] = [
  { id: 'CLO-001', businessDate: '2026-07-07', closedAt: '2026-07-08T02:15:00', closedBy: 'Sidi Omar', revenue: 45200, occupancyRate: 82 },
  { id: 'CLO-002', businessDate: '2026-07-06', closedAt: '2026-07-07T01:45:00', closedBy: 'Sidi Omar', revenue: 38700, occupancyRate: 76 },
  { id: 'CLO-003', businessDate: '2026-07-05', closedAt: '2026-07-06T02:30:00', closedBy: 'Nadia Idrissi', revenue: 41500, occupancyRate: 79 },
];

function mapBackendStatus(raw: any): NightAuditStatus {
  const isOpen = raw.status === 'en_cours' || raw.status === 'active';
  return {
    businessDate: raw.business_date || raw.businessDate || new Date().toISOString().slice(0, 10),
    isOpen,
    lastClosedDate: raw.last_closure?.business_date || raw.lastClosedDate || null,
    checks: MOCK_CHECKS,
  };
}

export async function getNightAuditStatus(): Promise<NightAuditStatus> {
  if (USE_MOCKS) {
    await mockDelay();
    return { businessDate: '2026-07-08', isOpen: true, lastClosedDate: '2026-07-07', checks: MOCK_CHECKS };
  }

  try {
    const res = await apiClient.get('/api/night-audit/status');
    return mapBackendStatus(res.data);
  } catch {
    return { businessDate: new Date().toISOString().slice(0, 10), isOpen: false, lastClosedDate: null, checks: MOCK_CHECKS };
  }
}

export async function getNightAuditReports(): Promise<NightAuditReport[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_REPORTS;
  }
  return MOCK_REPORTS;
}

export async function checkBalance(businessDate: string): Promise<{ balanced: boolean; details: NightAuditCheck[] }> {
  if (USE_MOCKS) {
    await mockDelay(600);
    return { balanced: true, details: MOCK_CHECKS };
  }

  try {
    const res = await apiClient.post('/api/night-audit/check-balance', { business_date: businessDate });
    const data = res.data;
    return {
      balanced: data.equilibre || data.balanced || false,
      details: MOCK_CHECKS.map((chk) => ({
        ...chk,
        status: data.equilibre ? 'ok' as const : 'warning' as const,
        description: data.decomposition
          ? `Débit: ${data.total_debit} — Crédit: ${data.total_credit} — Écart: ${data.ecart}`
          : chk.description,
      })),
    };
  } catch {
    return { balanced: false, details: MOCK_CHECKS };
  }
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

  try {
    const res = await apiClient.post('/api/night-audit/close', {
      business_date: businessDate,
      justification,
    });
    const d = res.data;
    return {
      id: d.id || d.business_date || businessDate,
      businessDate: d.business_date || businessDate,
      closedAt: d.closed_at || new Date().toISOString(),
      closedBy: d.closed_by || 'Admin',
      justification: d.justification || justification,
      revenue: d.total_debit || d.revenue || 0,
      occupancyRate: d.occupancyRate || 0,
    };
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Erreur lors de la clôture');
  }
}

export async function closeNightAudit(businessDate?: string, justification?: string): Promise<Closure> {
  const date = businessDate ?? new Date().toISOString().slice(0, 10);
  return closeDay(date, justification);
}

export async function getClosureHistory(): Promise<Closure[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_HISTORY;
  }

  try {
    const res = await apiClient.get('/api/night-audit/history');
    const raw = res.data.closures || res.data || [];
    return raw.map((c: any) => ({
      id: c.id || c.business_date || '',
      businessDate: c.business_date || c.businessDate || '',
      closedAt: c.closed_at || c.closedAt || '',
      closedBy: c.closed_by || c.closedBy || 'Admin',
      justification: c.justification || undefined,
      revenue: c.total_debit || c.revenue || 0,
      occupancyRate: c.occupancyRate || 0,
    }));
  } catch {
    return [];
  }
}
