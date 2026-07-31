// ═══════════════════════════════════════════════════════════
// OASIS PMS — Night Audit API
// Backend: service-night-audit (port 4007) via gateway
// Routes: /api/night-audit/status, /check-balance, /close, /history
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type {
  NightAuditStatus,
  CheckBalanceResponse,
  Closure,
  ClosureDetail,
  NightAuditReport,
  RevenueBreakdown,
  PaymentSummary,
  DebtorSummary,
} from '@/types';

// ─── Mapping Functions ───────────────────────────────────

function mapBackendStatus(raw: Record<string, unknown>): NightAuditStatus {
  const status = (raw.status as string) || 'en_cours';
  const isOpen = status === 'en_cours';
  const rawLastClosure = raw.last_closure as Record<string, unknown> | null | undefined;
  const rawErrorDetails = raw.error_details as Record<string, unknown> | null | undefined;

  return {
    businessDate: (raw.business_date as string) || new Date().toISOString().slice(0, 10),
    status: status as 'en_cours' | 'echouee',
    isOpen,
    lastClosure: rawLastClosure
      ? {
          businessDate: (rawLastClosure.business_date as string) || '',
          closedAt: (rawLastClosure.closed_at as string) || '',
          closedByRole: (rawLastClosure.closed_by_role as string) || '',
        }
      : null,
    errorDetails: rawErrorDetails
      ? {
          service: (rawErrorDetails.service as string) || '',
          code: (rawErrorDetails.code as string) || '',
        }
      : null,
  };
}

function mapCheckBalance(raw: Record<string, unknown>): CheckBalanceResponse {
  const decomp = raw.decomposition as Record<string, Record<string, number>> | undefined;
  return {
    businessDate: (raw.business_date as string) || '',
    equilibre: (raw.equilibre as boolean) || false,
    totalDebit: (raw.total_debit as number) || 0,
    totalCredit: (raw.total_credit as number) || 0,
    ecart: (raw.ecart as number) || 0,
    decomposition: {
      debitSources: decomp?.debit_sources || {},
      creditSources: decomp?.credit_sources || {},
    },
  };
}

function mapClosure(raw: Record<string, unknown>): Closure {
  return {
    businessDate: (raw.business_date as string) || '',
    status: (raw.status as 'cloturee' | 'echouee') || 'echouee',
    closedByRole: (raw.closed_by_role as string) || '',
    closedAt: (raw.closed_at as string) || '',
    totalDebit: raw.total_debit != null ? (raw.total_debit as number) : null,
    totalCredit: raw.total_credit != null ? (raw.total_credit as number) : null,
    ecart: raw.ecart != null ? (raw.ecart as number) : null,
    reportsGenerated: (raw.reports_generated as number) || 0,
    justification: (raw.justification as string) || undefined,
    warnings: raw.warnings
      ? (raw.warnings as Array<Record<string, string>>).map((w) => ({
          report: w.report || '',
          reason: w.reason || '',
        }))
      : undefined,
    errorDetails: raw.error_details
      ? { code: ((raw.error_details as Record<string, string>).code) || '' }
      : undefined,
  };
}

function mapClosureDetail(raw: Record<string, unknown>): ClosureDetail {
  const rawClosure = raw.closure as Record<string, unknown>;
  const rawRevenue = (raw.revenue_breakdown || []) as Array<Record<string, unknown>>;
  const rawPayments = (raw.payment_summary || []) as Array<Record<string, unknown>>;
  const rawDebtors = (raw.debtors_summary || []) as Array<Record<string, unknown>>;

  const revenueBreakdown: RevenueBreakdown[] = rawRevenue.map((r) => ({
    category: (r.category as RevenueBreakdown['category']) || 'lodging',
    amountHt: (r.amount_ht as number) || 0,
    tvaRate: (r.tva_rate as number) || 0,
    tvaAmount: (r.tva_amount as number) || 0,
    amountTtc: (r.amount_ttc as number) || 0,
  }));

  const paymentSummary: PaymentSummary[] = rawPayments.map((p) => ({
    paymentMethod: (p.payment_method as PaymentSummary['paymentMethod']) || 'cash',
    totalAmount: (p.total_amount as number) || 0,
    transactionCount: (p.transaction_count as number) || 0,
  }));

  const debtorsSummary: DebtorSummary[] = rawDebtors.map((d) => ({
    debtorName: (d.debtor_name as string) || '',
    debtorReference: (d.debtor_reference as string) || '',
    amount: (d.amount as number) || 0,
    invoiceCount: (d.invoice_count as number) || 0,
  }));

  return {
    closure: mapClosure(rawClosure),
    revenueBreakdown,
    paymentSummary,
    debtorsSummary,
  };
}

// ─── Error Handling ──────────────────────────────────────

interface NightAuditError {
  status?: string;
  message?: string;
}

export function mapNightAuditError(httpStatus: number, errorBody: NightAuditError): string {
  const code = errorBody?.status;
  if (httpStatus === 400 && code === 'ECART_BLOCKED') {
    return 'Une justification est requise en cas d\'écart';
  }
  if (httpStatus === 403 && code === 'FORBIDDEN') {
    return 'Le manager ne peut pas clôturer en cas d\'écart';
  }
  if (httpStatus === 409 && code === 'ALREADY_CLOSED') {
    return 'La journée est déjà clôturée';
  }
  if (httpStatus === 503 && code === 'SERVICE_UNAVAILABLE') {
    return 'Le service est temporairement indisponible. Veuillez réessayer.';
  }
  if (httpStatus === 400 && code === 'VALIDATION_ERROR') {
    return 'Le format de la date est invalide (attendu: YYYY-MM-DD)';
  }
  if (httpStatus === 500 && code === 'INTEGRITY_ERROR') {
    return 'Erreur d\'intégrité du fichier. Veuillez réessayer.';
  }
  return errorBody?.message || 'Une erreur est survenue. Veuillez réessayer.';
}

// ─── API Functions ───────────────────────────────────────

export async function getNightAuditStatus(): Promise<NightAuditStatus> {
  if (USE_MOCKS) {
    await mockDelay();
    return {
      businessDate: '2026-07-08',
      status: 'en_cours',
      isOpen: true,
      lastClosure: {
        businessDate: '2026-07-07',
        closedAt: '2026-07-07T23:15:00.000Z',
        closedByRole: 'admin',
      },
      errorDetails: null,
    };
  }

  try {
    const res = await apiClient.get('/api/night-audit/status');
    return mapBackendStatus(res.data);
  } catch {
    return {
      businessDate: new Date().toISOString().slice(0, 10),
      status: 'echouee',
      isOpen: false,
      lastClosure: null,
      errorDetails: { service: 'unknown', code: 'NETWORK_ERROR' },
    };
  }
}

export async function getNightAuditReports(businessDate: string): Promise<NightAuditReport[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return [
      { id: 'rpt-1', type: 'revenue_daily', name: 'Rapport CA Détaillé' },
      { id: 'rpt-2', type: 'receipts_daily', name: 'Rapport Encaissements' },
      { id: 'rpt-3', type: 'departures', name: 'Rapport Départs Attendus' },
      { id: 'rpt-4', type: 'arrivals', name: 'Rapport Arrivées Prévues' },
      { id: 'rpt-5', type: 'occupancy_forecast', name: 'Rapport d\'Occupation' },
      { id: 'rpt-6', type: 'debtors', name: 'Rapport Débiteurs' },
    ];
  }

  try {
    const res = await apiClient.get(`/api/night-audit/history/${businessDate}/reports`);
    const raw = res.data.reports || res.data || [];
    return raw.map((r: Record<string, unknown>) => ({
      id: (r.id as string) || '',
      type: (r.type as string) || '',
      name: (r.name as string) || '',
      fileSize: r.file_size as number | undefined,
      checksum: r.checksum as string | undefined,
      generatedAt: r.generated_at as string | undefined,
      downloadUrl: r.download_url as string | undefined,
    }));
  } catch {
    return [];
  }
}

export async function checkBalance(businessDate: string): Promise<CheckBalanceResponse> {
  if (USE_MOCKS) {
    await mockDelay(600);
    return {
      businessDate,
      equilibre: true,
      totalDebit: 45230.5,
      totalCredit: 45230.5,
      ecart: 0,
      decomposition: {
        debitSources: { frontoffice: 42100 },
        creditSources: { payments: 38500, debtors: 6730.5 },
      },
    };
  }

  try {
    const res = await apiClient.post('/api/night-audit/check-balance', {
      business_date: businessDate,
    });
    return mapCheckBalance(res.data);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; data: NightAuditError } };
    if (axiosErr.response) {
      throw new Error(
        mapNightAuditError(axiosErr.response.status, axiosErr.response.data)
      );
    }
    throw new Error('Erreur réseau. Veuillez réessayer.');
  }
}

export async function closeDay(
  businessDate: string,
  justification?: string
): Promise<Closure> {
  if (USE_MOCKS) {
    await mockDelay(1200);
    return {
      businessDate,
      status: 'cloturee',
      closedByRole: 'admin',
      closedAt: new Date().toISOString(),
      totalDebit: 45230.5,
      totalCredit: 45230.5,
      ecart: 0,
      reportsGenerated: 6,
      justification,
      warnings: [],
    };
  }

  try {
    const res = await apiClient.post('/api/night-audit/close', {
      business_date: businessDate,
      justification,
    });
    const raw = res.data;
    const closure = mapClosure(raw);

    const gatewayUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const rawReports = (raw.reports || []) as Array<Record<string, unknown>>;
    const reports: NightAuditReport[] = rawReports.map((r) => ({
      id: (r.id as string) || '',
      type: (r.type as string) || '',
      name: (r.name as string) || '',
      downloadUrl: r.download_url ? `${gatewayUrl}${r.download_url}` : undefined,
    }));

    return {
      ...closure,
      warnings: raw.warnings
        ? (raw.warnings as Array<Record<string, string>>).map((w) => ({
            report: w.report || '',
            reason: w.reason || '',
          }))
        : [],
    };
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; data: NightAuditError } };
    if (axiosErr.response) {
      throw new Error(
        mapNightAuditError(axiosErr.response.status, axiosErr.response.data)
      );
    }
    throw new Error('Erreur réseau. Veuillez réessayer.');
  }
}

export async function getClosureHistory(): Promise<Closure[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return [
      {
        businessDate: '2026-07-07',
        status: 'cloturee',
        closedByRole: 'admin',
        closedAt: '2026-07-07T23:15:00.000Z',
        totalDebit: 118000,
        totalCredit: 118000,
        ecart: 0,
        reportsGenerated: 6,
      },
      {
        businessDate: '2026-07-06',
        status: 'echouee',
        closedByRole: 'manager',
        closedAt: '2026-07-06T23:20:00.000Z',
        totalDebit: null,
        totalCredit: null,
        ecart: null,
        reportsGenerated: 0,
        errorDetails: { code: 'MANAGER_ECart_BLOCKED' },
      },
    ];
  }

  try {
    const res = await apiClient.get('/api/night-audit/history');
    const raw = res.data.closures || res.data || [];
    return raw.map((c: Record<string, unknown>) => mapClosure(c));
  } catch {
    return [];
  }
}

export async function getClosureDetail(businessDate: string): Promise<ClosureDetail> {
  if (USE_MOCKS) {
    await mockDelay();
    return {
      closure: {
        businessDate,
        status: 'cloturee',
        closedByRole: 'admin',
        closedAt: '2026-07-07T23:15:00.000Z',
        totalDebit: 118000,
        totalCredit: 118000,
        ecart: 0,
        reportsGenerated: 6,
      },
      revenueBreakdown: [
        { category: 'lodging', amountHt: 85000, tvaRate: 0.2, tvaAmount: 17000, amountTtc: 102000 },
        { category: 'fb', amountHt: 12000, tvaRate: 0.2, tvaAmount: 2400, amountTtc: 14400 },
        { category: 'extras', amountHt: 3000, tvaRate: 0.2, tvaAmount: 600, amountTtc: 3600 },
        { category: 'tourism_tax', amountHt: -2000, tvaRate: 0, tvaAmount: 0, amountTtc: -2000 },
      ],
      paymentSummary: [
        { paymentMethod: 'card', totalAmount: 75000, transactionCount: 45 },
        { paymentMethod: 'cash', totalAmount: 28000, transactionCount: 30 },
        { paymentMethod: 'wire_transfer', totalAmount: 15000, transactionCount: 5 },
      ],
      debtorsSummary: [
        { debtorName: 'Agence Atlas Voyages', debtorReference: 'ATL-2026-001', amount: 4200, invoiceCount: 3 },
      ],
    };
  }

  try {
    const res = await apiClient.get(`/api/night-audit/history/${businessDate}`);
    return mapClosureDetail(res.data);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; data: NightAuditError } };
    if (axiosErr.response) {
      throw new Error(
        mapNightAuditError(axiosErr.response.status, axiosErr.response.data)
      );
    }
    throw new Error('Erreur réseau. Veuillez réessayer.');
  }
}

export async function getClosureReports(businessDate: string): Promise<NightAuditReport[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return [
      { id: 'rpt-1', type: 'revenue_daily', name: 'revenue_daily_2026-07-07.pdf', fileSize: 245760, generatedAt: '2026-07-07T23:15:05.000Z' },
      { id: 'rpt-2', type: 'receipts_daily', name: 'receipts_daily_2026-07-07.pdf', fileSize: 102400, generatedAt: '2026-07-07T23:15:05.000Z' },
      { id: 'rpt-3', type: 'departures', name: 'departures_2026-07-07.pdf', fileSize: 51200, generatedAt: '2026-07-07T23:15:05.000Z' },
      { id: 'rpt-4', type: 'arrivals', name: 'arrivals_2026-07-07.pdf', fileSize: 51200, generatedAt: '2026-07-07T23:15:05.000Z' },
      { id: 'rpt-5', type: 'occupancy_forecast', name: 'occupancy_forecast_2026-07-07.pdf', fileSize: 76800, generatedAt: '2026-07-07T23:15:05.000Z' },
      { id: 'rpt-6', type: 'debtors', name: 'debtors_2026-07-07.pdf', fileSize: 64000, generatedAt: '2026-07-07T23:15:05.000Z' },
    ];
  }

  try {
    const res = await apiClient.get(`/api/night-audit/history/${businessDate}/reports`);
    const raw = res.data.reports || res.data || [];
    return raw.map((r: Record<string, unknown>) => ({
      id: (r.id as string) || '',
      type: (r.type as string) || '',
      name: (r.name as string) || '',
      fileSize: r.file_size as number | undefined,
      checksum: r.checksum as string | undefined,
      generatedAt: r.generated_at as string | undefined,
    }));
  } catch {
    return [];
  }
}

export async function downloadReport(businessDate: string, reportId: string): Promise<void> {
  if (USE_MOCKS) {
    await mockDelay(500);
    return;
  }

  try {
    const res = await apiClient.get(
      `/api/night-audit/history/${businessDate}/reports/${reportId}`,
      { responseType: 'blob' }
    );
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; data: NightAuditError } };
    if (axiosErr.response) {
      throw new Error(
        mapNightAuditError(axiosErr.response.status, axiosErr.response.data)
      );
    }
    throw new Error('Erreur lors du téléchargement. Veuillez réessayer.');
  }
}

export async function closeNightAudit(
  businessDate?: string,
  justification?: string
): Promise<Closure> {
  const date = businessDate ?? new Date().toISOString().slice(0, 10);
  return closeDay(date, justification);
}
