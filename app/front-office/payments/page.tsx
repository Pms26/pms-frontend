'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import FrontOfficeTabs from '@/components/front-office/FrontOfficeTabs';
import FolioConsultation from '@/components/front-office/FolioConsultation';
import { getPayments, getInvoices } from '@/lib/api/frontOffice';
import { useAuthStore } from '@/lib/auth/AuthContext';
import type { PaymentMethod } from '@/types';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cb: 'Carte bancaire',
  esp: 'Espèces',
  chq: 'Chèque',
  virement: 'Virement',
  debiteur: 'Débiteur',
};

const formatAmount = (value: number): string =>
  `${Number(value).toLocaleString('fr-FR')} DH`;

export default function FrontOfficePaymentsPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const paymentsQuery = useQuery({
    queryKey: ['fo-payments', date],
    queryFn: () => getPayments(date),
  });

  const invoicesQuery = useQuery({
    queryKey: ['fo-invoices', date],
    queryFn: () => getInvoices(date),
  });

  return (
    <section className="pms-section">
      <div className="section-header">
        <h2 className="section-title">Front Office</h2>
      </div>

      <FrontOfficeTabs />

      <div className="fo-panel">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-600 mb-0">Consultations financières</h6>
          <input
            type="date"
            className="form-control pms-input"
            style={{ width: 'auto' }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="row g-3">
          <div className="col-lg-6">
            <div className="glass-card p-4 h-100">
              <h6 className="fw-600 mb-3">Paiements du jour</h6>

              {paymentsQuery.isLoading && (
                <div className="text-muted py-2">Chargement des paiements...</div>
              )}

              {paymentsQuery.isError && (
                <div className="alert-security mb-3">
                  <i className="bi bi-exclamation-triangle me-2" />
                  {paymentsQuery.error.message}
                </div>
              )}

              {paymentsQuery.data && paymentsQuery.data.payments.length === 0 && (
                <div className="text-muted py-2">Aucune donnée pour cette date</div>
              )}

              {paymentsQuery.data && paymentsQuery.data.payments.length > 0 && (
                <>
                  <div className="d-flex justify-content-between small text-muted mb-2">
                    <span>
                      {paymentsQuery.data.count} paiement{paymentsQuery.data.count > 1 ? 's' : ''}
                    </span>
                    <span>Total : {formatAmount(paymentsQuery.data.totalAmount)}</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table pms-table mb-0">
                      <thead>
                        <tr>
                          <th>Montant</th>
                          <th>Mode</th>
                          <th>Référence</th>
                          <th>Date</th>
                          <th>Booking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsQuery.data.payments.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 700, color: '#10b981' }}>{formatAmount(p.amount)}</td>
                            <td>{PAYMENT_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</td>
                            <td>{p.reference ?? '—'}</td>
                            <td>{p.processedAt}</td>
                            <td>{p.bookingId}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="glass-card p-4 h-100">
              <h6 className="fw-600 mb-3">Factures du jour</h6>

              {invoicesQuery.isLoading && (
                <div className="text-muted py-2">Chargement des factures...</div>
              )}

              {invoicesQuery.isError && (
                <div className="alert-security mb-3">
                  <i className="bi bi-exclamation-triangle me-2" />
                  {invoicesQuery.error.message}
                </div>
              )}

              {invoicesQuery.data && invoicesQuery.data.invoices.length === 0 && (
                <div className="text-muted py-2">Aucune donnée pour cette date</div>
              )}

              {invoicesQuery.data && invoicesQuery.data.invoices.length > 0 && (
                <>
                  <div className="d-flex justify-content-between small text-muted mb-2">
                    <span>
                      {invoicesQuery.data.count} facture{invoicesQuery.data.count > 1 ? 's' : ''}
                    </span>
                    <span>Total : {formatAmount(invoicesQuery.data.totalAmount)}</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table pms-table mb-0">
                      <thead>
                        <tr>
                          <th>Folio</th>
                          <th>Booking</th>
                          <th>Type</th>
                          <th>Label</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoicesQuery.data.invoices.map((inv) => (
                          <tr key={inv.folioId}>
                            <td>{inv.folioId}</td>
                            <td>{inv.bookingRef ?? '—'}</td>
                            <td>{inv.folioType}</td>
                            <td>{inv.label}</td>
                            <td style={{ fontWeight: 700, color: '#10b981' }}>{formatAmount(inv.totalAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {role !== 'housekeeping_supervisor' && (
          <div className="mt-3">
            <FolioConsultation />
          </div>
        )}
      </div>
    </section>
  );
}
