'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Night Audit History
// Historique des clôtures (accès restreint: admin/comptable)
// ═══════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { useModalToast } from '@/components/context/ModalToastContext';
import { ClosureDetailModal } from '@/components/layout/GlobalModals';
import { getClosureHistory } from '@/lib/api/nightAudit';
import { useAuthStore } from '@/lib/auth/AuthContext';
import Card from '@/components/ui/Card';

export default function NightAuditHistoryPage() {
  const user = useAuthStore((s) => s.user);
  const { openClosureDetail } = useModalToast();

  const { data: history, isLoading } = useQuery({
    queryKey: ['closure-history'],
    queryFn: getClosureHistory,
  });

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <h2 className="section-title">Night Audit — Historique des Clôtures</h2>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60">
                {[
                  'Date Métier',
                  'Statut',
                  'Clôturé le',
                  'Par',
                  'Total Débit',
                  'Total Crédit',
                  'Écart',
                  'Rapports',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="p-4">
                      <div className="skeleton h-8 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : history && history.length > 0 ? (
                history.map((closure) => (
                  <tr
                    key={closure.businessDate}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => openClosureDetail(closure.businessDate)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-indigo-500 font-medium">
                      {closure.businessDate}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="d-inline-flex align-items-center gap-1 px-2 py-0.5 rounded"
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background:
                            closure.status === 'cloturee'
                              ? 'rgba(16,185,129,0.1)'
                              : 'rgba(239,68,68,0.1)',
                          color:
                            closure.status === 'cloturee'
                              ? '#10b981'
                              : '#ef4444',
                        }}
                      >
                        <i
                          className={`bi bi-${
                            closure.status === 'cloturee'
                              ? 'check-circle-fill'
                              : 'x-circle-fill'
                          }`}
                        />
                        {closure.status === 'cloturee' ? 'Clôturée' : 'Échouée'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(closure.closedAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-capitalize">
                      {closure.closedByRole}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {closure.totalDebit != null
                        ? `${closure.totalDebit.toLocaleString('fr-FR')} DH`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {closure.totalCredit != null
                        ? `${closure.totalCredit.toLocaleString('fr-FR')} DH`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {closure.ecart != null ? (
                        <span
                          className="d-inline-flex align-items-center gap-1"
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color:
                              closure.ecart === 0 ? '#10b981' : '#f59e0b',
                          }}
                        >
                          {closure.ecart === 0 ? (
                            <i className="bi bi-check-circle" />
                          ) : (
                            <i className="bi bi-exclamation-triangle" />
                          )}
                          {closure.ecart.toLocaleString('fr-FR')} DH
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {closure.reportsGenerated > 0 ? (
                        <span style={{ fontSize: '0.82rem' }}>
                          <i className="bi bi-file-earmark me-1" />
                          {closure.reportsGenerated}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    Aucune clôture disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Closure Detail Modal (US6) ── */}
      <ClosureDetailModal userRole={user?.role} />
    </div>
  );
}
