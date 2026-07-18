'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FrontOfficeTabs from '@/components/front-office/FrontOfficeTabs';
import { useModalToast } from '@/components/context/ModalToastContext';
import { getPendingCheckOuts, performCheckOut } from '@/lib/api/frontOffice';
import type { PaymentMode } from '@/types';

const PAYMENT_MODES = [
  { id: 'cb', label: 'CB', icon: 'bi-credit-card-2-front' },
  { id: 'esp', label: 'Espèces', icon: 'bi-cash' },
  { id: 'chq', label: 'Chèque', icon: 'bi-file-earmark-text' },
  { id: 'vir', label: 'Virement', icon: 'bi-bank' },
  { id: 'deb', label: 'Débiteur', icon: 'bi-building-check' },
];

export default function FrontOfficeCheckOutPage() {
  const [selectedCheckoutId, setSelectedCheckoutId] = useState<string | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<PaymentMode[]>([]);
  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const { data: checkoutEntries = [], isLoading } = useQuery({
    queryKey: ['pending-checkouts'],
    queryFn: getPendingCheckOuts,
  });

  useEffect(() => {
    if (!selectedCheckoutId && checkoutEntries.length > 0) {
      setSelectedCheckoutId(checkoutEntries[0].id);
    }
    if (selectedCheckoutId && !checkoutEntries.some((entry) => entry.id === selectedCheckoutId)) {
      setSelectedCheckoutId(checkoutEntries[0]?.id ?? null);
    }
  }, [checkoutEntries, selectedCheckoutId]);

  const togglePaymentMode = (mode: PaymentMode) => {
    setSelectedPayments((current) =>
      current.includes(mode) ? current.filter((item) => item !== mode) : [...current, mode],
    );
  };

  const selectedCheckout = checkoutEntries.find((entry) => entry.id === selectedCheckoutId);

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedCheckoutId) {
        throw new Error('Aucune réservation sélectionnée');
      }
      return performCheckOut(selectedCheckoutId, selectedPayments);
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setSelectedPayments([]);
      showToast(`✅ Check-out validé avec ${selectedPayments.join(', ')}`);
    },
  });

  const handleValidateCheckout = () => {
    if (!selectedCheckout) {
      showToast('⚠️ Sélectionnez une réservation à valider.');
      return;
    }

    if (selectedPayments.length === 0) {
      showToast('⚠️ Sélectionnez au moins un mode de paiement avant de valider.');
      return;
    }

    mutation.mutate();
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
              <h6 className="fw-600 mb-3">Départs du jour</h6>

              {isLoading ? (
                <div>Chargement des départs...</div>
              ) : checkoutEntries.length === 0 ? (
                <div className="text-muted">Aucun départ du jour pour le moment.</div>
              ) : (
                checkoutEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`checkin-item ${selectedCheckoutId === entry.id ? 'active' : ''}`}
                    style={selectedCheckoutId === entry.id ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px rgba(99,102,241,0.4)' } : undefined}
                    onClick={() => setSelectedCheckoutId(entry.id)}
                  >
                    <span className="checkin-room-badge" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                      Ch. {entry.room}
                    </span>
                    <div>
                      <div className="checkin-name">{entry.client}</div>
                      <div className="checkin-details">Départ: {entry.departure} · {entry.total}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-lg-7">
            <div className="glass-card p-4">
              <h6 className="fw-600 mb-3">Encaissement &amp; Validation</h6>

              <div className="checkout-summary mb-4">
                <div className="summary-row">
                  <span>Hébergement</span>
                  <span>3 000 DH</span>
                </div>
                <div className="summary-row">
                  <span>Extras / Bar</span>
                  <span>450 DH</span>
                </div>
                <div className="summary-row">
                  <span>Taxe de séjour</span>
                  <span>90 DH</span>
                </div>
                <div className="summary-row total">
                  <span>TOTAL DÛ</span>
                  <span>3 540 DH</span>
                </div>
              </div>

              <h6 className="fw-600 mb-2">Mode de règlement</h6>
              <div className="payment-modes row g-2 mb-4">
                {PAYMENT_MODES.map((mode) => (
                  <div key={mode.id} className="col-6 col-md-4">
                    <label className={`pay-mode-card ${selectedPayments.includes(mode.id as PaymentMode) ? 'active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(mode.id as PaymentMode)}
                        onChange={() => togglePaymentMode(mode.id as PaymentMode)}
                      />
                      <i className={`bi ${mode.icon}`} />
                      <span>{mode.label}</span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="alert-security mb-3">
                <i className="bi bi-shield-lock-fill me-2" />
                Après validation, le dossier sera définitivement verrouillé.
              </div>

              <button type="button" className="btn btn-pms w-100 py-3" onClick={handleValidateCheckout}>
                <i className="bi bi-check-circle me-2" /> Valider le Check-out
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
