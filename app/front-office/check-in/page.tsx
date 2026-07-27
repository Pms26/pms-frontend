'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FrontOfficeTabs from '@/components/front-office/FrontOfficeTabs';
import { useModalToast } from '@/components/context/ModalToastContext';
import { getPendingCheckIns, performCheckIn } from '@/lib/api/frontOffice';
import { useAuthStore } from '@/lib/auth/AuthContext';


const FOLIO_A_LINES = [
  { label: 'Hébergement Suite — 2 nuits', date: '08/07/2026', qty: '2', amount: '3 600 DH' },
  { label: 'Petit-déjeuner (BB)', date: '08/07/2026', qty: '2', amount: '0 DH' },
  { label: 'Petit-déjeuner (BB)', date: '09/07/2026', qty: '2', amount: '0 DH' },
  { label: 'Room Service — Dîner', date: '08/07/2026', qty: '1', amount: '450 DH' },
  { label: 'Minibar', date: '09/07/2026', qty: '1', amount: '120 DH' },
  { label: 'Taxe de séjour', date: '08/07/2026', qty: '2', amount: '60 DH' },
];

export default function FrontOfficeCheckInPage() {
  const user = useAuthStore((s) => s.user);
  const isComptable = user?.role === 'comptable';
  const [activeFolio, setActiveFolio] = useState<'A' | 'B'>('A');
  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const { data: checkinEntries = [], isLoading } = useQuery({
    queryKey: ['pending-checkins'],
    queryFn: getPendingCheckIns,
  });

  const mutation = useMutation({
    mutationFn: (reservationId: string) => performCheckIn(reservationId),
    onSuccess: (_data, reservationId) => {
      queryClient.invalidateQueries({ queryKey: ['pending-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      showToast(`✅ Check-in effectué — ${reservationId}`);
    },
  });

  const handleCheckIn = (entryId: string) => {
    mutation.mutate(entryId);
  };

  const handlePrint = () => {
    showToast('🖨️ Impression lancée (placeholder)');
  };

  const handleAddExtra = () => {
    showToast('✨ Ajouter un extra (placeholder)');
  };

  return (
    <section className="pms-section">
      <div className="section-header">
        <h2 className="section-title">Front Office</h2>
      </div>

      <FrontOfficeTabs />

      <div className="fo-panel">
        <div className="row g-3">
          <div className="col-lg-5">
            <div className="glass-card p-4">
              <h6 className="fw-600 mb-3">Réservations à faire entrer</h6>

              {isLoading ? (
                <div>Chargement des réservations...</div>
              ) : checkinEntries.length === 0 ? (
                <div className="text-muted">Aucune arrivée en attente de check-in.</div>
              ) : (
                checkinEntries.map((entry) => (
                  <div key={entry.id} className="checkin-item">
                    <span className="checkin-room-badge">Ch. {entry.room}</span>
                    <div>
                      <div className="checkin-name">{entry.client}</div>
                      <div className="checkin-details">{`${entry.regime} · Arrivée: ${entry.arrival}`}</div>
                    </div>
                    <button
                      type="button"
                      className="checkin-btn"
                      onClick={() => handleCheckIn(entry.id)}
                      disabled={mutation.status === 'pending' || isComptable}
                      style={isComptable ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
                    >
                      <i className="bi bi-check me-1" />
                      {isComptable ? 'Consultation' : 'Check-in'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-lg-7">
            <div className="glass-card p-4">
              <h6 className="fw-600 mb-3">Fiche Folio — Extrait de compte</h6>
              <div className="folio-header mb-3">
                <div className="folio-tabs">
                  <button
                    type="button"
                    className={`folio-tab ${activeFolio === 'A' ? 'active' : ''}`}
                    onClick={() => setActiveFolio('A')}
                  >
                    Folio A — Client
                  </button>
                  <button
                    type="button"
                    className={`folio-tab ${activeFolio === 'B' ? 'active' : ''}`}
                    onClick={() => setActiveFolio('B')}
                  >
                    Folio B — Prise en charge
                  </button>
                </div>
              </div>

              <div>
                <div className="table-responsive">
                  <table className="table pms-table mb-0">
                    <thead>
                      <tr>
                        <th>Prestation</th>
                        <th>Date</th>
                        <th>Qté</th>
                        <th>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeFolio === 'A' ? (
                        FOLIO_A_LINES.map((row) => (
                          <tr key={row.label}>
                            <td>{row.label}</td>
                            <td>{row.date}</td>
                            <td>{row.qty}</td>
                            <td style={{ fontWeight: 700, color: '#10b981' }}>{row.amount}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td>Prise en charge Agence — Maroc Tours</td>
                          <td>08/07/2026</td>
                          <td>1</td>
                          <td style={{ fontWeight: 700, color: '#f59e0b' }}>2 000 DH</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="folio-total-row mt-3">
                <span className="text-muted">Total Folio {activeFolio}</span>
                <span className="folio-total-amount">{activeFolio === 'A' ? '4 230 DH' : '2 000 DH'}</span>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button type="button" className="btn btn-ghost btn-sm" onClick={handlePrint}>
                  <i className="bi bi-printer me-1" /> Imprimer
                </button>
                {!isComptable && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={handleAddExtra}>
                    <i className="bi bi-plus me-1" /> Ajouter extra
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
