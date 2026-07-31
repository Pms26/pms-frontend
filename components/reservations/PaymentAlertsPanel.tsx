'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useModalToast } from '@/components/context/ModalToastContext';
import { getPaymentAlerts, releaseExpiredOptions, checkPaymentAlerts } from '@/lib/api/reservations';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR');
}

export default function PaymentAlertsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { openReservation, showToast } = useModalToast();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['payment-alerts'],
    queryFn: getPaymentAlerts,
    enabled: isOpen, // ne charge qu'à l'ouverture du panneau
    refetchInterval: isOpen ? 60000 : false, // rafraîchit toutes les 60s si ouvert
  });

  const handleReleaseExpired = async () => {
    try {
      const result = await releaseExpiredOptions();
      queryClient.invalidateQueries({ queryKey: ['payment-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      showToast(`✅ ${result.released ?? 0} option(s) expirée(s) libérée(s).`);
    } catch {
      showToast('⚠️ Impossible de libérer les options expirées.');
    }
  };
  const handleCheckAlerts = async () => {
    try {
      await checkPaymentAlerts();
      queryClient.invalidateQueries({ queryKey: ['payment-alerts'] });
      showToast('✅ Vérification des alertes de paiement effectuée.');
    } catch {
      showToast('⚠️ Impossible de vérifier les alertes de paiement.');
    }
  };
  const guestName = (a: any) => {
    const c = a.customer;
    const g = a.guest;
    if (c?.lastName) return `${c.lastName} ${c.firstName || ''}`.trim();
    if (g?.lastName) return `${g.lastName} ${g.firstName || ''}`.trim();
    return 'Client inconnu';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-ghost btn-sm position-relative"
        onClick={() => setIsOpen((v) => !v)}
        title="Alertes de paiement"
      >
        <i className="bi bi-bell" />
        {alerts && alerts.length > 0 && (
          <span
            className="badge"
            style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: 'white', borderRadius: '999px',
              fontSize: '0.65rem', padding: '2px 6px', minWidth: 18,
            }}
          >
            {alerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: 'absolute', top: '110%', right: 0, zIndex: 30,
            width: 380, maxHeight: 420, overflowY: 'auto',
            padding: 16, background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            borderRadius: 12,
          }}
        >
          <div className="d-flex flex-column gap-2">
  <button className="btn btn-outline-accent btn-sm w-100" onClick={handleCheckAlerts}>
    <i className="bi bi-arrow-repeat me-1" />
    Vérifier les paiements en retard (Confirmées)
  </button>
</div>

          {isLoading && <div className="text-muted small">Chargement…</div>}

          {!isLoading && alerts?.length === 0 && (
            <div className="text-muted small py-3 text-center">
              <i className="bi bi-check-circle" /> Aucune alerte en cours.
            </div>
          )}

          {!isLoading && alerts && alerts.length > 0 && (
            <>
              <div className="d-flex flex-column gap-2 mb-3">
                {alerts.map((a: any) => (
                  <div
                    key={a._id}
                    style={{
                      padding: '8px 10px', border: '1px solid #fee2e2',
                      background: '#fef2f2', borderRadius: 8, cursor: 'pointer',
                    }}
                    onClick={() => { openReservation(a._id); setIsOpen(false); }}
                  >
                    <div className="d-flex justify-content-between">
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.reference}</span>
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                        {a.status === 'status_option' ? 'Option expire' : 'Paiement dû'}
                        {' '}
                        {formatDate(a.optionExpiryDate || a.paymentDueDate)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                      {guestName(a)} — Ch. {a.room?.number || '—'}
                    </div>
                  </div>
                ))}
              </div>
             
            </>
          )}
        </div>
      )}
    </div>
  );
}