'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFolio, getStatement } from '@/lib/api/frontOffice';
import { useAuthStore } from '@/lib/auth/AuthContext';
import type { PaymentMethod } from '@/types';

const FOLLOWER_ROLES = ['admin', 'manager', 'receptionist', 'comptable'];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cb: 'Carte bancaire',
  esp: 'Espèces',
  chq: 'Chèque',
  virement: 'Virement',
  debiteur: 'Débiteur',
};

const formatAmount = (value: number): string =>
  `${Number(value).toLocaleString('fr-FR')} DH`;

export default function FolioConsultation() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const [mode, setMode] = useState<'folioId' | 'bookingId'>('folioId');
  const [folioId, setFolioId] = useState('');
  const [searchedFolioId, setSearchedFolioId] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [searchedBookingId, setSearchedBookingId] = useState('');

  const folioQuery = useQuery({
    queryKey: ['fo-folio-consult', searchedFolioId],
    queryFn: () => getFolio(searchedFolioId),
    enabled: !!searchedFolioId,
  });

  const statementQuery = useQuery({
    queryKey: ['fo-statement-consult', searchedBookingId],
    queryFn: () => getStatement(searchedBookingId),
    enabled: !!searchedBookingId,
  });

  if (!role || !FOLLOWER_ROLES.includes(role)) return null;

  const handleFolioSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedFolioId(folioId.trim());
  };

  const handleBookingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchedBookingId(bookingId.trim());
  };

  const isFolioLoading = !!searchedFolioId && folioQuery.isLoading;
  const isFolioError = !!searchedFolioId && folioQuery.isError;
  const isStatementLoading = !!searchedBookingId && statementQuery.isLoading;
  const isStatementError = !!searchedBookingId && statementQuery.isError;

  return (
    <div className="glass-card p-4">
      <h6 className="fw-600 mb-3">Consultation de folio</h6>

      <div className="d-flex gap-2 mb-3">
        <button
          type="button"
          className={`btn btn-sm ${mode === 'folioId' ? 'btn-pms' : 'btn-ghost'}`}
          onClick={() => setMode('folioId')}
        >
          Par folioId
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'bookingId' ? 'btn-pms' : 'btn-ghost'}`}
          onClick={() => setMode('bookingId')}
        >
          Par bookingId
        </button>
      </div>

      {mode === 'folioId' && (
        <form onSubmit={handleFolioSearch} className="d-flex gap-2 mb-3">
          <input
            type="text"
            className="form-control pms-input"
            placeholder="Saisir un folioId"
            value={folioId}
            onChange={(e) => setFolioId(e.target.value)}
          />
          <button type="submit" className="btn btn-pms text-nowrap">
            <i className="bi bi-search me-1" /> Consulter
          </button>
        </form>
      )}

      {mode === 'bookingId' && (
        <form onSubmit={handleBookingSearch} className="d-flex gap-2 mb-3">
          <input
            type="text"
            className="form-control pms-input"
            placeholder="Saisir un bookingId"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
          />
          <button type="submit" className="btn btn-pms text-nowrap">
            <i className="bi bi-search me-1" /> Consulter
          </button>
        </form>
      )}

      {isFolioLoading && <div className="text-muted py-2">Chargement du folio...</div>}

      {isFolioError && (
        <div className="alert-security mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          {folioQuery.error.message}
        </div>
      )}

      {folioQuery.data && (
        <div className="table-responsive">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-600 mb-0">
              Folio {folioQuery.data.folio.type} — {folioQuery.data.folio.label}{' '}
              <span className="text-muted" style={{ fontWeight: 400 }}>
                ({folioQuery.data.folio.status})
              </span>
            </h6>
            <span className="folio-total-amount">{formatAmount(folioQuery.data.folio.totalAmount)}</span>
          </div>
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
              {folioQuery.data.allItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.date}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice} DH</td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>{item.totalAmount} DH</td>
                </tr>
              ))}
              {folioQuery.data.allItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted">
                    Aucune prestation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isStatementLoading && <div className="text-muted py-2">Chargement de l'extrait...</div>}

      {isStatementError && (
        <div className="alert-security mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          {statementQuery.error.message}
        </div>
      )}

      {statementQuery.data && (
        <>
          <div className="row small text-muted g-1 mb-3">
            <div className="col-6">Référence: {statementQuery.data.booking.ref}</div>
            <div className="col-6">Client: {statementQuery.data.booking.customer}</div>
            <div className="col-6">Chambre: {statementQuery.data.booking.room}</div>
            <div className="col-6">Nuits: {statementQuery.data.booking.nights}</div>
            <div className="col-6">Arrivée: {statementQuery.data.booking.checkIn}</div>
            <div className="col-6">Départ: {statementQuery.data.booking.checkOut ?? '—'}</div>
          </div>

          {statementQuery.data.folios.map((folio) => (
            <div className="mb-3" key={folio.id}>
              <h6 className="fw-600 mb-2">
                Folio {folio.type} — {folio.label}{' '}
                <span className="text-muted" style={{ fontWeight: 400 }}>
                  ({folio.status}) — {formatAmount(folio.totalAmount)}
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

          {statementQuery.data.payments.length > 0 && (
            <div className="mb-3">
              <h6 className="fw-600 mb-2">Paiements</h6>
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
                    {statementQuery.data.payments.map((p, i) => (
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

          <div className="d-flex justify-content-between border-top pt-2">
            <span className="text-muted">Total charges</span>
            <span className="fw-600">{formatAmount(statementQuery.data.totalCharges)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Total payé</span>
            <span className="fw-600" style={{ color: '#10b981' }}>
              {formatAmount(statementQuery.data.totalPaid)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
