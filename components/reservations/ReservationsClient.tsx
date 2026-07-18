'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getReservations } from '@/lib/api/reservations';
import type { Reservation, ReservationStatus, MarketSegment } from '@/types';
import { useSearchParams } from 'next/navigation';
import PlanningGrid from '@/components/planning/PlanningGrid';
import { useModalToast } from '@/components/context/ModalToastContext';

// CSS classes du mockup pour les badges de statut
const STATUS_CSS: Record<ReservationStatus, string> = {
  option:    'status-badge status-option',
  confirmed: 'status-badge status-confirmed',
  voucher:   'status-badge status-voucher',
  inhouse:   'status-badge status-inhouse',
  checkout:  'status-badge status-checkout',
  noshow:    'status-badge status-noshow',
  cancelled: 'status-badge status-cancelled',
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  option:    'Option',
  confirmed: 'Confirmée',
  voucher:   'Garantie Agence',
  inhouse:   'In-House',
  checkout:  'Check-out',
  noshow:    'No-Show',
  cancelled: 'Annulée',
};

const SEGMENT_LABELS: Record<MarketSegment, string> = {
  direct: 'Direct',
  ota:    'OTA',
  b2b:    'B2B / Agence',
};

// Format date from ISO (YYYY-MM-DD) to DD/MM/YYYY
function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export default function ReservationsClient() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | ''>('');
  const [segmentFilter, setSegmentFilter] = useState<MarketSegment | ''>('');

  const searchParams = useSearchParams();
  const view = searchParams?.get('view') || '';

  const { openReservation, showToast } = useModalToast();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', search, statusFilter, segmentFilter],
    queryFn: () =>
      getReservations({
        search:  search  || undefined,
        status:  statusFilter  || undefined,
        segment: segmentFilter || undefined,
      }),
  });

  if (view !== 'list') {
    // planning view (default)
    return <PlanningGrid />;
  }

  return (
    <div>
      {/* ── Section Header ── */}
      <div className="section-header">
        <h2 className="section-title">Réservations</h2>
        <button className="btn btn-pms" onClick={() => openReservation()}>
          <i className="bi bi-plus-lg me-1" />Nouvelle réservation
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="glass-card p-3 mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-md-3">
            <div className="input-group pms-search-group">
              <span className="input-group-text bg-transparent border-0">
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control pms-input"
                placeholder="Nom, chambre, confirmation…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-2">
            <select
              className="form-select pms-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReservationStatus | '')}
            >
              <option value="">Tous statuts</option>
              <option value="option">Option</option>
              <option value="confirmed">Confirmée</option>
              <option value="voucher">Garantie Agence</option>
              <option value="inhouse">In-House</option>
              <option value="checkout">Check-out</option>
              <option value="noshow">No-Show</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>
          <div className="col-md-2">
            <select
              className="form-select pms-input"
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value as MarketSegment | '')}
            >
              <option value="">Tous segments</option>
              <option value="direct">Direct</option>
              <option value="ota">OTA</option>
              <option value="b2b">B2B / Agence</option>
            </select>
          </div>
          <div className="col-auto ms-auto">
            <span className="badge-count">{reservations?.length ?? '--'} réservations</span>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table pms-table mb-0">
            <thead>
              <tr>
                <th>#Rés.</th>
                <th>Client</th>
                <th>Chambre</th>
                <th>Arrivée</th>
                <th>Départ</th>
                <th>Régime</th>
                <th>Segment</th>
                <th>Statut</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j}>
                        <div style={{ height: 12, background: 'rgba(15,23,42,0.06)', borderRadius: 4, width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : reservations?.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-5" style={{ color: 'var(--text-dim)' }}>
                    <i className="bi bi-inbox" style={{ fontSize: '2rem', display: 'block', marginBottom: 8, opacity: 0.4 }} />
                    Aucune réservation trouvée
                  </td>
                </tr>
              ) : (
                reservations?.map((r: Reservation) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
                        {r.id}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.client}</td>
                    <td>Ch. {r.room}</td>
                    <td>{formatDate(r.arrival)}</td>
                    <td>{formatDate(r.departure)}</td>
                    <td>
                      <span className="status-badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.2)' }}>
                        {r.regime}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {SEGMENT_LABELS[r.segment]}
                      </span>
                    </td>
                    <td>
                      <span className={STATUS_CSS[r.status]}>
                        <i className="bi bi-circle-fill" style={{ fontSize: '0.4rem' }} />
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{r.total}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="action-btn" title="Voir" onClick={() => showToast(`Ouverture du dossier ${r.id}`)}><i className="bi bi-eye" /></button>
                        <button className="action-btn" title="Modifier" onClick={() => { openReservation(); showToast(`Édition de ${r.id}`); }}><i className="bi bi-pencil" /></button>
                        <button className="action-btn" title="Imprimer" onClick={() => showToast(`Impression de ${r.id}`)}><i className="bi bi-printer" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
