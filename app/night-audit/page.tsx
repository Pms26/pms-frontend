'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Night Audit (Module 3)
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModalToast } from '@/components/context/ModalToastContext';
import { ClosureConfirmModal } from '@/components/layout/GlobalModals';
import {
  getNightAuditStatus,
  checkBalance,
  closeDay,
  getNightAuditReports,
} from '@/lib/api/nightAudit';
import { useAuthStore } from '@/lib/auth/AuthContext';
import type { NightAuditReport } from '@/types';

export default function NightAuditPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isComptable = role === 'comptable';
  const isReceptionist = role === 'receptionist';
  const isAdmin = role === 'admin';
  const queryClient = useQueryClient();
  const { openClosureConfirm, closeClosureConfirm, showToast } = useModalToast();

  // ── Status query (US1) ──
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['night-audit-status'],
    queryFn: getNightAuditStatus,
  });

  // ── Check-balance mutation (US2) ──
  const [hasCheckedBalance, setHasCheckedBalance] = useState(false);
  const checkBalanceMutation = useMutation({
    mutationFn: () => checkBalance(status?.businessDate || ''),
    onSuccess: () => setHasCheckedBalance(true),
  });

  // ── Reports query (for after closure) ──
  const { data: reports } = useQuery<NightAuditReport[]>({
    queryKey: ['night-audit-reports', status?.businessDate],
    queryFn: () => getNightAuditReports(status?.businessDate || ''),
    enabled: !!status?.businessDate,
  });

  // ── Close mutation (US3) ──
  const closeMutation = useMutation({
    mutationFn: (justification?: string) =>
      closeDay(status?.businessDate || '', justification),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['night-audit-status'] });
      queryClient.invalidateQueries({ queryKey: ['night-audit-reports'] });
      closeClosureConfirm();
      const msg = data.warnings && data.warnings.length > 0
        ? `Clôture effectuée avec ${data.warnings.length} avertissement(s)`
        : 'Clôture effectuée avec succès';
      showToast(`✅ ${msg}`);
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  return (
    <div>
      {/* ── Section Header ── */}
      <div className="section-header">
        <h2 className="section-title">Night Audit — Clôture Journalière</h2>
        {status && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <i className="bi bi-calendar-event me-1" />
            Journée : <strong>{status.businessDate}</strong>
          </span>
        )}
        {(isAdmin || isComptable) && (
          <Link href="/night-audit/history" className="btn btn-outline-accent btn-sm ms-auto">
            <i className="bi bi-clock-history me-1" />
            Historique
          </Link>
        )}
      </div>

      {/* ── Status Section (US1) ── */}
      {statusLoading ? (
        <div className="glass-card p-4 mb-4">
          <div className="skeleton h-6 rounded mb-2" style={{ width: '40%' }} />
          <div className="skeleton h-4 rounded" style={{ width: '60%' }} />
        </div>
      ) : status ? (
        <div className="glass-card p-4 mb-4">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              className="na-status-badge"
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 600,
                background: status.isOpen ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: status.isOpen ? '#10b981' : '#ef4444',
              }}
            >
              <i className={`bi bi-${status.isOpen ? 'check-circle-fill' : 'exclamation-circle-fill'} me-1`} />
              {status.isOpen ? 'En cours' : 'Échoué'}
            </div>
            {status.errorDetails && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Service: {status.errorDetails.service} — Code: {status.errorDetails.code}
              </span>
            )}
          </div>
          {status.lastClosure && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <i className="bi bi-clock-history me-1" />
              Dernière clôture : <strong>{status.lastClosure.businessDate}</strong>
              {' — '}
              {new Date(status.lastClosure.closedAt).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' par '}
              <span className="text-capitalize">{status.lastClosure.closedByRole}</span>
            </div>
          )}
        </div>
      ) : null}

      {/* ── Warning Banner (US4 — hidden for comptable & receptionist) ── */}
      {!isComptable && !isReceptionist && (
        <div className="night-audit-warning glass-card p-4 mb-4">
          <div className="d-flex align-items-center gap-3">
            <div className="na-icon">
              <i className="bi bi-shield-exclamation" />
            </div>
            <div>
              <div className="na-warning-title">Opération Irréversible</div>
              <div className="na-warning-desc">
                Une fois lancée, la clôture valide définitivement la journée <strong>J</strong>.{' '}
                Aucune modification, saisie ou annulation n&apos;est possible après validation.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Check-Balance Section (US2 — hidden for receptionist) ── */}
      {!isReceptionist && (
      <div className="glass-card p-4 mb-4">
        <h6 className="fw-600 mb-3">Vérification de l&apos;équilibre</h6>
        <button
          className="btn btn-outline-accent mb-3"
          onClick={() => {
            checkBalanceMutation.mutate();
          }}
          disabled={checkBalanceMutation.isPending || !status?.isOpen}
        >
          {checkBalanceMutation.isPending ? (
            <><span className="spinner-border spinner-border-sm me-2" />Vérification...</>
          ) : (
            <><i className="bi bi-balance me-2" />Vérifier l&apos;équilibre</>
          )}
        </button>

        {checkBalanceMutation.isError && (
          <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>
            <i className="bi bi-exclamation-triangle me-2" />
            {checkBalanceMutation.error.message}
          </div>
        )}

        {checkBalanceMutation.data && (
          <div className="mt-3">
            <div className="d-flex align-items-center gap-4 mb-3" style={{ fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Total Débit : </span>
                <strong>{checkBalanceMutation.data.totalDebit.toLocaleString('fr-FR')} DH</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Total Crédit : </span>
                <strong>{checkBalanceMutation.data.totalCredit.toLocaleString('fr-FR')} DH</strong>
              </div>
              <div>
                <span
                  className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded"
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    background: checkBalanceMutation.data.ecart === 0
                      ? 'rgba(16,185,129,0.1)'
                      : 'rgba(245,158,11,0.1)',
                    color: checkBalanceMutation.data.ecart === 0 ? '#10b981' : '#f59e0b',
                  }}
                >
                  <i className={`bi bi-${checkBalanceMutation.data.ecart === 0 ? 'check-circle' : 'exclamation-triangle'}`} />
                  {checkBalanceMutation.data.ecart === 0 ? 'Équilibré' : `Écart: ${checkBalanceMutation.data.ecart.toLocaleString('fr-FR')} DH`}
                </span>
              </div>
            </div>

            {/* Decomposition */}
            <div className="row g-3">
              <div className="col-md-6">
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <i className="bi bi-arrow-down-circle me-1" />Sources Débit
                </div>
                {Object.entries(checkBalanceMutation.data.decomposition.debitSources).map(([source, amount]) => (
                  <div key={source} className="d-flex justify-content-between" style={{ fontSize: '0.82rem', padding: '4px 0', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                    <span className="text-capitalize">{source}</span>
                    <strong>{amount.toLocaleString('fr-FR')} DH</strong>
                  </div>
                ))}
              </div>
              <div className="col-md-6">
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <i className="bi bi-arrow-up-circle me-1" />Sources Crédit
                </div>
                {Object.entries(checkBalanceMutation.data.decomposition.creditSources).map(([source, amount]) => (
                  <div key={source} className="d-flex justify-content-between" style={{ fontSize: '0.82rem', padding: '4px 0', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                    <span className="text-capitalize">{source}</span>
                    <strong>{amount.toLocaleString('fr-FR')} DH</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── Reports (after closure) ── */}
      {reports && reports.length > 0 && (
        <div className="glass-card p-4 mb-4">
          <h6 className="fw-600 mb-3">Rapports générés automatiquement à la clôture</h6>
          <div className="row g-2">
            {reports.map((report) => {
              const iconMap: Record<string, string> = {
                revenue_daily: 'cash-stack',
                receipts_daily: 'receipt',
                debtors: 'people',
                departures: 'box-arrow-right',
                arrivals: 'box-arrow-in-right',
                occupancy_forecast: 'calendar-event',
              };
              const colorMap: Record<string, string> = {
                revenue_daily: '#10b981',
                receipts_daily: '#3b82f6',
                debtors: '#f59e0b',
                departures: '#ef4444',
                arrivals: '#06b6d4',
                occupancy_forecast: '#6366f1',
              };
              return (
                <div key={report.id} className="col-md-6 col-lg-4">
                  <div className="na-report-item">
                    <i
                      className={`bi bi-${iconMap[report.type] || 'file-earmark'}`}
                      style={{ color: colorMap[report.type] || '#6b7280' }}
                    />
                    <span style={{ fontSize: '0.82rem', flex: 1 }}>{report.name}</span>
                    {isAdmin && report.downloadUrl && (
                      <a
                        href={report.downloadUrl}
                        className="btn btn-sm btn-ghost p-1"
                        download
                        title="Télécharger"
                      >
                        <i className="bi bi-download" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Close Button (US3 + US4 — hidden for comptable & receptionist, gated by check-balance) ── */}
      {!isComptable && !isReceptionist && (
        <button
          className="btn btn-danger-pms btn-lg w-100"
          onClick={() => openClosureConfirm()}
          disabled={!hasCheckedBalance || !status?.isOpen || closeMutation.isPending}
          style={{
            opacity: !hasCheckedBalance || !status?.isOpen ? 0.5 : 1,
            cursor: !hasCheckedBalance || !status?.isOpen ? 'not-allowed' : 'pointer',
          }}
        >
          <i className="bi bi-moon-stars-fill me-2" />
          Lancer la Clôture de Journée (J → J+1)
        </button>
      )}

      {/* ── Closure Confirm Modal (US3 — GlobalModals pattern) ── */}
      <ClosureConfirmModal
        onConfirm={(justification) => closeMutation.mutate(justification)}
        isPending={closeMutation.isPending}
        businessDate={status?.businessDate || ''}
      />
    </div>
  );
}
