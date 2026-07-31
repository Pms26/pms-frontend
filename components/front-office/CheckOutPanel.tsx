'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBooking, getStatement, performCheckOut } from '@/lib/api/frontOffice';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import type { CheckOutPayment, PaymentMethod, Statement } from '@/types';

const CHECK_OUT_ROLES = ['admin', 'manager', 'receptionist'];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cb: 'Carte bancaire',
  esp: 'Espèces',
  chq: 'Chèque',
  virement: 'Virement',
  debiteur: 'Débiteur',
};

const formatAmount = (value: number): string =>
  `${Number(value).toLocaleString('fr-FR')} DH`;

function getDepositAmount(deposit: unknown): number {
  if (typeof deposit === 'number') return deposit;
  if (deposit && typeof deposit === 'object') {
    return (deposit as { amount?: number }).amount ?? 0;
  }
  return 0;
}

export default function CheckOutPanel() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canCheckOut = !!role && CHECK_OUT_ROLES.includes(role);

  const [bookingId, setBookingId] = useState('');
  const [searchedId, setSearchedId] = useState('');

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cb');
  const [paymentFolioType, setPaymentFolioType] = useState<'A' | 'B'>('A');
  const [paymentReference, setPaymentReference] = useState('');
  const [payments, setPayments] = useState<CheckOutPayment[]>([]);
  const [checkOutResult, setCheckOutResult] = useState<{ message: string } | null>(null);

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const bookingQuery = useQuery({
    queryKey: ['fo-booking', searchedId],
    queryFn: () => getBooking(searchedId),
    enabled: !!searchedId,
  });

  const statementQuery = useQuery({
    queryKey: ['fo-statement', searchedId],
    queryFn: () => getStatement(searchedId),
    enabled: !!searchedId && bookingQuery.data?.status === 'status_checked_in',
  });

  const checkOutMutation = useMutation({
    mutationFn: (vars: { bookingId: string; payments: CheckOutPayment[] }) =>
      performCheckOut(vars.bookingId, vars.payments),
    onSuccess: (data) => {
      setCheckOutResult(data);
      setPayments([]);
      queryClient.invalidateQueries({ queryKey: ['fo-booking', searchedId] });
      queryClient.invalidateQueries({ queryKey: ['fo-rooms'] });
      showToast(`✅ ${data.message}`);
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const booking = bookingQuery.data;
  const statement: Statement | undefined = statementQuery.data;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = bookingId.trim();
    setSearchedId(id);
    setPayments([]);
    setCheckOutResult(null);
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      showToast('⚠️ Montant invalide.');
      return;
    }
    if (paymentMethod === 'chq' || paymentMethod === 'virement') {
      if (!paymentReference.trim()) {
        showToast('⚠️ Référence requise pour chèque / virement.');
        return;
      }
    }
    setPayments((prev) => [
      ...prev,
      {
        paymentMethod,
        amount,
        folioType: paymentFolioType,
        cardType: paymentMethod === 'cb' ? 'CB' : undefined,
        reference: paymentReference.trim() || undefined,
      },
    ]);
    setPaymentAmount('');
    setPaymentReference('');
  };

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const deposit = statement ? getDepositAmount(booking?.deposit) : 0;
  const remainingBalance = statement
    ? statement.totalCharges - deposit - statement.totalPaid - totalPayments
    : 0;
  const isLocked = !!booking?.locked;

  if (!canCheckOut) return null;

  return (
    <div className="glass-card p-4">
      <h6 className="fw-600 mb-3">Check-out</h6>

      <form onSubmit={handleSearch} className="d-flex gap-2 mb-3">
        <input
          type="text"
          className="form-control pms-input"
          placeholder="Rechercher par numéro de réservation (bookingId)"
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
        />
        <button type="submit" className="btn btn-pms text-nowrap">
          <i className="bi bi-search me-1" /> Rechercher
        </button>
      </form>

      {bookingQuery.isLoading && (
        <div className="text-muted py-2">Chargement de la réservation...</div>
      )}

      {bookingQuery.isError && (
        <div className="alert-security mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          {bookingQuery.error.message}
        </div>
      )}

      {booking && (
        <div className="mb-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h6 className="fw-600 mb-0">
              {booking.ref} —{' '}
              {booking.customer
                ? `${booking.customer.firstName} ${booking.customer.lastName}`
                : booking.guest
                  ? `${booking.guest.firstName} ${booking.guest.lastName}`
                  : 'Client'}{' '}
              <span className="text-muted" style={{ fontWeight: 400 }}>
                ({booking.status.replace('status_', '')})
              </span>
            </h6>
            {isLocked && (
              <span className="hk-badge hk-bloquee">
                <i className="bi bi-lock-fill me-1" /> Verrouillé
              </span>
            )}
          </div>
          <div className="row small text-muted g-1">
            <div className="col-6">Chambre: {booking.room?.roomNumber ?? '—'} ({booking.room?.category ?? '—'})</div>
            <div className="col-6">Arrivée: {booking.checkInDate}</div>
            <div className="col-6">Départ: {booking.checkOutDate}</div>
            <div className="col-6">Pax: {booking.pax}</div>
            <div className="col-6">Régime: {booking.regime}</div>
            <div className="col-6">Segment: {booking.marketSegment ?? '—'}</div>
          </div>
        </div>
      )}

      {booking?.status === 'status_checked_in' && statementQuery.isLoading && (
        <div className="text-muted py-2">Génération du relevé...</div>
      )}

      {booking?.status === 'status_checked_in' && statementQuery.isError && (
        <div className="alert-security mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          {statementQuery.error.message}
        </div>
      )}

      {booking?.status === 'status_checked_out' && (
        <div className="alert-security mb-3">
          <i className="bi bi-info-circle me-2" />
          Réservation déjà soldée et sortie.
        </div>
      )}

      {booking && booking.status !== 'status_checked_in' && booking.status !== 'status_checked_out' && (
        <div className="alert-security mb-3">
          <i className="bi bi-info-circle me-2" />
          Check-out possible uniquement pour une réservation en statut « check-in ».
        </div>
      )}

      {statement && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3">
              <div className="stat-card">
                <div className="stat-label">Total charges</div>
                <div className="stat-value">{formatAmount(statement.totalCharges)}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-card">
                <div className="stat-label">Dépôt</div>
                <div className="stat-value">{formatAmount(deposit)}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-card">
                <div className="stat-label">Déjà payé</div>
                <div className="stat-value">{formatAmount(statement.totalPaid)}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-card stat-card-danger">
                <div className="stat-label">Solde restant</div>
                <div className="stat-value">{formatAmount(remainingBalance)}</div>
              </div>
            </div>
          </div>

          {statement.folios.map((folio) => (
            <div className="mb-3" key={folio.id}>
              <h6 className="fw-600 mb-2">
                Folio {folio.type} — {folio.label}{' '}
                <span className="text-muted" style={{ fontWeight: 400 }}>
                  ({folio.status})
                </span>
              </h6>
              <div className="table-responsive">
                <table className="table pms-table mb-0">
                  <thead>
                    <tr>
                      <th>Prestation</th>
                      <th>Date</th>
                      <th>Qté</th>
                      <th>Prix</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folio.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.date}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unitPrice} DH</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>{item.totalAmount} DH</td>
                      </tr>
                    ))}
                    {folio.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-muted">
                          Aucune prestation.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {statement.payments.length > 0 && (
            <div className="mb-3">
              <h6 className="fw-600 mb-2">Paiements enregistrés</h6>
              <div className="table-responsive">
                <table className="table pms-table mb-0">
                  <thead>
                    <tr>
                      <th>Méthode</th>
                      <th>Montant</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.payments.map((p, i) => (
                      <tr key={i}>
                        <td>{PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}</td>
                        <td>{formatAmount(p.amount)}</td>
                        <td>{p.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {payments.length > 0 && (
            <div className="mb-3">
              <h6 className="fw-600 mb-2">Paiements en attente</h6>
              <div className="table-responsive">
                <table className="table pms-table mb-0">
                  <thead>
                    <tr>
                      <th>Méthode</th>
                      <th>Folio</th>
                      <th>Montant</th>
                      <th>Référence</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={i}>
                        <td>{PAYMENT_METHOD_LABELS[p.paymentMethod]}</td>
                        <td>{p.folioType}</td>
                        <td>{formatAmount(p.amount)}</td>
                        <td>{p.reference ?? '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setPayments((prev) => prev.filter((_, j) => j !== i))}
                          >
                            <i className="bi bi-trash3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2">
                <strong>Total saisi :</strong> {formatAmount(totalPayments)}
              </div>
            </div>
          )}

          <form onSubmit={handleAddPayment} className="row g-2 mb-3">
            <div className="col-12">
              <h6 className="fw-600 mb-1">Saisir un paiement</h6>
            </div>
            <div className="col-6 col-md-3">
              <input
                type="number"
                step="0.01"
                className="form-control form-control-sm pms-input"
                placeholder="Montant"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select form-select-sm pms-input"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm pms-input"
                value={paymentFolioType}
                onChange={(e) => setPaymentFolioType(e.target.value as 'A' | 'B')}
              >
                <option value="A">Folio A</option>
                <option value="B">Folio B</option>
              </select>
            </div>
            <div className="col-6 col-md-4">
              <input
                type="text"
                className="form-control form-control-sm pms-input"
                placeholder={paymentMethod === 'chq' || paymentMethod === 'virement' ? 'Référence *' : 'Référence'}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                disabled={paymentMethod !== 'chq' && paymentMethod !== 'virement'}
              />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-ghost btn-sm">
                <i className="bi bi-plus-circle me-1" /> Ajouter le paiement
              </button>
            </div>
          </form>

          {checkOutResult && (
            <div className="alert-security alert-success mb-3">
              <i className="bi bi-check-circle me-2" />
              {checkOutResult.message}
            </div>
          )}

          <button
            type="button"
            className="btn btn-pms"
            onClick={() => checkOutMutation.mutate({ bookingId: searchedId, payments })}
            disabled={
              isLocked ||
              checkOutMutation.status === 'pending' ||
              remainingBalance > 0
            }
            title={
              remainingBalance > 0
                ? 'Le solde restant doit être couvert par des paiements avant le check-out.'
                : undefined
            }
          >
            {checkOutMutation.status === 'pending' ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" /> Check-out en cours...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-right me-1" /> Effectuer le Check-out
              </>
            )}
          </button>

          {remainingBalance > 0 && (
            <div className="text-muted small mt-2">
              Le solde restant doit être couvert par des paiements avant le check-out.
            </div>
          )}
        </>
      )}
    </div>
  );
}
