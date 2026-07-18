'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Night Audit History
// Historique des clôtures (accès restreint: admin/auditor/manager)
// ═══════════════════════════════════════════════════════════

import { useQuery } from '@tanstack/react-query';
import { getClosureHistory } from '@/lib/api/nightAudit';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function NightAuditHistoryPage() {
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
                {['ID', 'Date Comptable', 'Clôturé le', 'Par', 'CA Jour', 'T.O.', 'Justification'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="p-4"><div className="skeleton h-8 rounded-lg" /></td>
                  </tr>
                ))
              ) : (
                history?.map((closure) => (
                  <tr key={closure.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-500 font-medium">{closure.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{closure.businessDate}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(closure.closedAt).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{closure.closedBy}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {closure.revenue.toLocaleString('fr-FR')} DH
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={closure.occupancyRate >= 80 ? '#10b981' : closure.occupancyRate >= 60 ? '#f59e0b' : '#ef4444'}
                        variant="soft"
                      >
                        {closure.occupancyRate}%
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 italic">
                      {closure.justification || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
