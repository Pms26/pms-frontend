'use client';

import { useQueryClient } from '@tanstack/react-query';
import { changeBookingStatus, cancelBooking } from '@/lib/api/reservations';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getReservations } from '@/lib/api/reservations';
import type { Reservation, ReservationStatus, MarketSegment } from '@/types';
import { useSearchParams } from 'next/navigation';
import PlanningGrid from '@/components/planning/PlanningGrid';
import { useModalToast } from '@/components/context/ModalToastContext';
import PaymentAlertsPanel from '@/components/reservations/PaymentAlertsPanel';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { getRoomsForBooking, shiftBooking, releaseExpiredOptions, type BookingRoom } from '@/lib/api/reservations';
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

const OVERRIDE_ROLES = ['admin', 'manager'];

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

  const queryClient = useQueryClient();
  const [rooms, setRooms] = useState<BookingRoom[]>([]);

  const user = useAuthStore((s) => s.user);
  const canOverride = OVERRIDE_ROLES.includes(user?.role || '');

  useEffect(() => {
    getRoomsForBooking().then(setRooms).catch(() => {});
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await changeBookingStatus(id, newStatus);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      showToast(`✅ Statut de ${id} mis à jour.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Impossible de changer le statut.';
      showToast(`⚠️ ${msg}`);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm(`Annuler la réservation ${id} ? Cette action est réversible en changeant à nouveau le statut.`)) {
      return;
    }
    try {
      await cancelBooking(id);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      showToast(`✅ Réservation ${id} annulée.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Impossible d\'annuler cette réservation.';
      showToast(`⚠️ ${msg}`);
    }
  };

  const handleShift = async (id: string, newRoomId: string) => {
    if (!newRoomId) return;
    if (!window.confirm('Confirmer le déplacement vers cette chambre ?')) return;

    try {
      const result = await shiftBooking(id, newRoomId);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      showToast(result?.message ? `✅ ${result.message}` : `✅ Réservation ${id} déplacée.`);
    } catch (err: any) {
      if (err?.response?.status === 403 && err?.response?.data?.requiresAdminOverride) {
        showToast(`⛔ ${err.response.data.message} — droits admin/manager requis.`);
      } else {
        const msg = err?.response?.data?.message || 'Impossible de déplacer cette réservation.';
        showToast(`⚠️ ${msg}`);
      }
    }
  };

  const handleReleaseExpired = async () => {
    if (!window.confirm('Libérer toutes les options expirées ? Cette action est irréversible.')) return;
    try {
      const result = await releaseExpiredOptions();
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      showToast(`✅ ${result?.message || 'Options expirées libérées.'}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Impossible de libérer les options expirées.';
      showToast(`⚠️ ${msg}`);
    }
  };

  const handlePrint = (r: Reservation) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      showToast('⚠️ Autorise les pop-ups pour imprimer.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Réservation ${r.reference || r.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
            h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            td:first-child { font-weight: 600; width: 200px; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>Bon de Réservation ${r.reference || r.id}</h1>
          <table>
            <tr><td>Client</td><td>${r.client}</td></tr>
            <tr><td>Chambre</td><td>${r.room}</td></tr>
            <tr><td>Arrivée</td><td>${formatDate(r.arrival)}</td></tr>
            <tr><td>Départ</td><td>${formatDate(r.departure)}</td></tr>
            <tr><td>Régime</td><td>${r.regime}</td></tr>
            <tr><td>Segment</td><td>${SEGMENT_LABELS[r.segment]}</td></tr>
            <tr><td>Statut</td><td>${STATUS_LABELS[r.status]}</td></tr>
            <tr><td>Total</td><td>${r.total}</td></tr>
            ${r.pax ? `<tr><td>PAX</td><td>${r.pax}</td></tr>` : ''}
            ${r.notes ? `<tr><td>Commentaires</td><td>${r.notes}</td></tr>` : ''}
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

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
  <div className="d-flex gap-2 align-items-center">
    <PaymentAlertsPanel />
    {canOverride && (
      <button className="btn btn-outline-secondary" title="Libérer les options expirées" onClick={handleReleaseExpired}>
        <i className="bi bi-hourglass-split me-1" />Libérer les options expirées
      </button>
    )}
    <button className="btn btn-pms" onClick={() => openReservation()}>
      <i className="bi bi-plus-lg me-1" />Nouvelle réservation
    </button>
  </div>
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
                reservations?.map((r: Reservation) => {
                  const currentRoom = rooms.find((room) => room.number === r.room);
                  const sameCategoryRooms = rooms.filter(
                    (room) => room.number !== r.room && room.category === currentRoom?.category,
                  );
                  const otherCategoryRooms = rooms.filter(
                    (room) => room.number !== r.room && room.category !== currentRoom?.category,
                  );

                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
                          {r.reference || r.id}
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
                          <button className="action-btn" title="Voir" onClick={() => openReservation(r.id)}>
                            <i className="bi bi-eye" />
                          </button>
                          <button className="action-btn" title="Modifier" onClick={() => openReservation(r.id)}>
                            <i className="bi bi-pencil" />
                          </button>
                          {r.status !== 'checkout' && r.status !== 'cancelled' && (
                            <select
                              className="form-select form-select-sm"
                              style={{ width: 'auto', fontSize: '0.75rem', padding: '2px 6px' }}
                              value=""
                              onChange={(e) => {
                                if (e.target.value) handleStatusChange(r.id, e.target.value);
                              }}
                              title="Changer le statut"
                            >
                              <option value="">Statut…</option>
                              <option value="status_option">Option</option>
                              <option value="status_confirmed">Confirmée</option>
                              <option value="status_voucher">Garantie Agence</option>
                              <option value="status_checked_in">In-House</option>
                            </select>
                          )}
                          {r.status !== 'checkout' && r.status !== 'cancelled' && (
                            <select
                              className="form-select form-select-sm"
                              style={{ width: 'auto', fontSize: '0.75rem', padding: '2px 6px' }}
                              value=""
                              onChange={(e) => {
                                const roomId = e.target.value;
                                e.target.value = '';
                                if (roomId) handleShift(r.id, roomId);
                              }}
                              title="Déplacer vers une autre chambre"
                            >
                              <option value="">Déplacer…</option>
                              {sameCategoryRooms.length > 0 && (
                                <optgroup label="Même catégorie">
                                  {sameCategoryRooms.map((room) => (
                                    <option key={room._id} value={room._id}>
                                      {room.number} — {room.category}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {otherCategoryRooms.length > 0 && (
                                <optgroup label={canOverride ? 'Autre catégorie (admin/manager)' : 'Autre catégorie — réservé admin/manager'}>
                                  {otherCategoryRooms.map((room) => (
                                    <option key={room._id} value={room._id} disabled={!canOverride}>
                                      {room.number} — {room.category}{!canOverride ? ' 🔒' : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          )}
                          {r.status !== 'checkout' && r.status !== 'cancelled' && (
                            <button className="action-btn" title="Annuler" onClick={() => handleCancel(r.id)}>
                              <i className="bi bi-x-circle" style={{ color: '#ef4444' }} />
                            </button>
                          )}
                          <button className="action-btn" title="Imprimer" onClick={() => handlePrint(r)}>
                            <i className="bi bi-printer" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}