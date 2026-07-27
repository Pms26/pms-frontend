'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Night Audit (Module 3)
// Reproduction exacte : night-audit-warning, na-icon, na-check-*,
// na-report-item, btn-danger-pms
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useModalToast } from '@/components/context/ModalToastContext';
import { getNightAuditStatus, getNightAuditReports, closeNightAudit } from '@/lib/api/nightAudit';
import { useAuthStore } from '@/lib/auth/AuthContext';

export default function NightAuditPage() {
  const user = useAuthStore((s) => s.user);
  const isComptable = user?.role === 'comptable';
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['night-audit-status'],
    queryFn: getNightAuditStatus,
  });

  const { data: reports } = useQuery({
    queryKey: ['night-audit-reports'],
    queryFn: getNightAuditReports,
  });

  const [adminPassword, setAdminPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const { showToast } = useModalToast();

  const closeMutation = useMutation({
    mutationFn: () => closeNightAudit(),
    onSuccess: () => {
      setConfirmOpen(false);
      setAdminPassword('');
      setValidationError('');
      showToast('✅ Clôture effectuée avec succès !');
    },
    onError: () => {
      showToast('⚠️ Une erreur est survenue lors de la clôture.');
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
      </div>

      {/* ── Warning Banner ── */}
      {!isComptable && (
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

      {/* ── Pre-audit checks ── */}
      <div className="row g-3 mb-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="col-md-6 col-lg-4">
                <div className="glass-card p-3" style={{ minHeight: 90 }}>
                  <div style={{ width: '70%', height: 14, background: 'rgba(15,23,42,0.06)', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ width: '90%', height: 10, background: 'rgba(15,23,42,0.04)', borderRadius: 4 }} />
                </div>
              </div>
            ))
          : status?.checks.map((check) => (
              <div key={check.id} className="col-md-6 col-lg-4">
                <div className="glass-card p-3">
                  <div className="d-flex align-items-center gap-3">
                    {/* Status icon */}
                    <div className="na-check-icon">
                      <i
                        className={`bi bi-${
                          check.status === 'ok'
                            ? 'check-circle-fill'
                            : check.status === 'warning'
                            ? 'exclamation-triangle-fill'
                            : 'x-circle-fill'
                        } ${
                          check.status === 'ok' ? 'success' : check.status === 'warning' ? 'warning' : ''
                        }`}
                        style={{
                          color:
                            check.status === 'ok'
                              ? 'var(--green)'
                              : check.status === 'warning'
                              ? 'var(--amber)'
                              : 'var(--rose)',
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="na-check-label">{check.label}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {check.description}
                      </div>
                    </div>
                    <div
                      className="na-check-value"
                      style={{
                        color:
                          check.status === 'ok'
                            ? 'var(--green)'
                            : check.status === 'warning'
                            ? 'var(--amber)'
                            : 'var(--rose)',
                      }}
                    >
                      {check.status === 'ok' ? 'OK' : check.status === 'warning' ? '⚠' : '✗'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
      </div>

      {/* ── Reports ── */}
      <div className="glass-card p-4 mb-4">
        <h6 className="fw-600 mb-3">Rapports générés automatiquement à la clôture</h6>
        <div className="row g-2">
          {reports?.map((report, i) => (
            <div key={i} className="col-md-6 col-lg-4">
              <div className="na-report-item">
                <i className={`bi bi-${report.icon}`} style={{ color: report.color }} />
                <span style={{ fontSize: '0.82rem', flex: 1 }}>{report.label}</span>
                <i className="bi bi-download" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Close Button ── */}
      {!isComptable && (
        <button
          className="btn btn-danger-pms btn-lg w-100"
          onClick={() => setConfirmOpen(true)}
          disabled={closeMutation.isPending}
        >
          <i className="bi bi-moon-stars-fill me-2" />
          Lancer la Clôture de Journée (J → J+1)
        </button>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmOpen && !isComptable && (
        <div
          className="modal fade show d-block"
          style={{ background: 'rgba(15,23,42,0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content pms-modal">
              <div className="pms-modal-header">
                <h5 className="modal-title">Confirmer la Clôture</h5>
              </div>
              <div className="modal-body p-4 text-center">
                <div className="na-modal-icon mb-3">
                  <i className="bi bi-moon-stars-fill" />
                </div>
                <h5 className="fw-700 mb-2">Journée {status?.businessDate}</h5>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Êtes-vous certain de vouloir clôturer la journée ? Cette opération est <strong>irréversible</strong>.
                </p>
                <div className="mb-3 text-start">
                  <label className="form-label fw-600" htmlFor="adminPassword">
                    Mot de passe administrateur
                  </label>
                  <input
                    id="adminPassword"
                    type="password"
                    className="form-control pms-input"
                    placeholder="Mot de passe administrateur"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      if (e.target.value.trim()) setValidationError('');
                    }}
                  />
                  {validationError ? (
                    <div className="text-danger mt-2" style={{ fontSize: '0.85rem' }}>
                      {validationError}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="pms-modal-footer">
                <button className="btn btn-ghost" onClick={() => {
                  setConfirmOpen(false);
                  setValidationError('');
                  setAdminPassword('');
                }}>
                  Annuler
                </button>
                <button
                  className="btn btn-danger-pms"
                  onClick={() => {
                    if (!adminPassword.trim()) {
                      setValidationError('Le mot de passe administrateur est requis.');
                      return;
                    }
                    closeMutation.mutate();
                  }}
                  disabled={closeMutation.isPending || !adminPassword.trim()}
                >                  {closeMutation.isPending ? (
                    <><span className="spinner-border spinner-border-sm me-2" />Clôture en cours...</>
                  ) : (
                    <><i className="bi bi-check-lg me-1" />Confirmer la clôture</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
