'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBooking,
  getProforma,
  performCheckIn,
  cancelCheckIn,
  getFolio,
  addFolioItem,
  setItemVisibility,
  deleteFolioItem,
} from '@/lib/api/frontOffice';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import type { FolioDetail } from '@/types';

const CHECK_IN_ROLES = ['admin', 'manager', 'receptionist'];
const DELETE_ROLES = ['admin', 'manager'];

const formatAmount = (value: number): string =>
  `${Number(value).toLocaleString('fr-FR')} DH`;

const formatDate = (value: string): string =>
  value ? new Date(value).toLocaleDateString('fr-FR') : '—';

function getDepositAmount(deposit: unknown): number {
  if (typeof deposit === 'number') return deposit;
  if (deposit && typeof deposit === 'object') {
    return (deposit as { amount?: number }).amount ?? 0;
  }
  return 0;
}

export default function CheckInBooking() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canCheckIn = !!role && CHECK_IN_ROLES.includes(role);
  const canDelete = !!role && DELETE_ROLES.includes(role);

  const [bookingId, setBookingId] = useState('');
  const [searchedId, setSearchedId] = useState('');
  const [proformaRequested, setProformaRequested] = useState(false);
  const [activeFolio, setActiveFolio] = useState<'A' | 'B'>('A');
  const [folioAId, setFolioAId] = useState<string | null>(null);
  const [folioBId, setFolioBId] = useState<string | null>(null);

  const [itemDescription, setItemDescription] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnitPrice, setItemUnitPrice] = useState('');
  const [itemTaxRate, setItemTaxRate] = useState('0');

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const bookingQuery = useQuery({
    queryKey: ['fo-booking', searchedId],
    queryFn: () => getBooking(searchedId),
    enabled: !!searchedId,
  });

  const proformaQuery = useQuery({
    queryKey: ['fo-proforma', searchedId],
    queryFn: () => getProforma(searchedId),
    enabled: !!searchedId && proformaRequested,
  });

  const folioAQuery = useQuery({
    queryKey: ['fo-folio', folioAId],
    queryFn: () => getFolio(folioAId!),
    enabled: !!folioAId,
  });

  const folioBQuery = useQuery({
    queryKey: ['fo-folio', folioBId],
    queryFn: () => getFolio(folioBId!),
    enabled: !!folioBId,
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => performCheckIn(id),
    onSuccess: (data) => {
      setFolioAId(data.folios.folioA.id);
      setFolioBId(data.folios.folioB.id);
      queryClient.invalidateQueries({ queryKey: ['fo-booking', searchedId] });
      showToast(`✅ ${data.message}`);
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelCheckIn(id),
    onSuccess: (data) => {
      setFolioAId(null);
      setFolioBId(null);
      setActiveFolio('A');
      queryClient.invalidateQueries({ queryKey: ['fo-booking', searchedId] });
      showToast(`✅ ${data.message}`);
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (vars: { folioId: string; description: string; category: string; quantity: number; unitPrice: number; taxRate: number }) =>
      addFolioItem(vars.folioId, {
        description: vars.description,
        category: vars.category,
        quantity: vars.quantity,
        unitPrice: vars.unitPrice,
        taxRate: vars.taxRate,
      }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['fo-folio', vars.folioId] });
      setItemDescription('');
      setItemCategory('');
      setItemQuantity('1');
      setItemUnitPrice('');
      setItemTaxRate('0');
      showToast('✅ Prestation ajoutée');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (vars: { itemId: string; folioId: string; isVisible: boolean }) =>
      setItemVisibility(vars.itemId, vars.isVisible),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['fo-folio', vars.folioId] });
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (vars: { itemId: string; folioId: string }) => deleteFolioItem(vars.itemId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['fo-folio', vars.folioId] });
      showToast('✅ Prestation supprimée');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const booking = bookingQuery.data;
  const activeFolioQuery = activeFolio === 'A' ? folioAQuery : folioBQuery;
  const folioDetail = activeFolioQuery.data;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = bookingId.trim();
    setSearchedId(id);
    setProformaRequested(false);
    setFolioAId(null);
    setFolioBId(null);
    setActiveFolio('A');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folioDetail || !folioAId) return;
    if (folioDetail.folio.status === 'closed') return;
    const quantity = Number(itemQuantity) || 1;
    const unitPrice = Number(itemUnitPrice);
    if (!itemDescription.trim() || !itemCategory.trim() || !itemUnitPrice) {
      showToast('⚠️ Description, catégorie et prix unitaire sont requis.');
      return;
    }
    addItemMutation.mutate({
      folioId: folioDetail.folio.id,
      description: itemDescription.trim(),
      category: itemCategory.trim(),
      quantity,
      unitPrice,
      taxRate: Number(itemTaxRate) || 0,
    });
  };

  const isCheckedIn = booking?.status === 'status_checked_in';
  const folioHasItems =
    (folioAQuery.data && folioAQuery.data.allItems.length > 0) ||
    (folioBQuery.data && folioBQuery.data.allItems.length > 0);

  if (!canCheckIn) return null;

  return (
    <div className="glass-card p-4">
      <h6 className="fw-600 mb-3">Check-in</h6>

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
        <>
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="fw-600 mb-0">
                {booking.ref} — {booking.customer
                  ? `${booking.customer.firstName} ${booking.customer.lastName}`
                  : booking.guest
                    ? `${booking.guest.firstName} ${booking.guest.lastName}`
                    : 'Client'}{' '}
                <span className="text-muted" style={{ fontWeight: 400 }}>
                  ({booking.status.replace('status_', '')})
                </span>
              </h6>
              {booking.locked && (
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
              <div className="col-6">Tarif: {formatAmount(booking.roomRate)}</div>
              <div className="col-6">Dépôt: {formatAmount(getDepositAmount(booking.deposit))}</div>
            </div>
          </div>

          {!proformaRequested && !isCheckedIn && !booking.locked && (
            <button
              type="button"
              className="btn btn-ghost btn-sm mb-3"
              onClick={() => setProformaRequested(true)}
            >
              <i className="bi bi-receipt me-1" /> Générer la pro-forma
            </button>
          )}

          {proformaRequested && proformaQuery.isLoading && (
            <div className="text-muted py-2">Génération de la pro-forma...</div>
          )}

          {proformaRequested && proformaQuery.isError && (
            <div className="alert-security mb-3">
              <i className="bi bi-exclamation-triangle me-2" />
              {proformaQuery.error.message}
            </div>
          )}

          {proformaRequested && proformaQuery.data && (
            <div className="checkout-summary mb-3">
              <div className="summary-row">
                <span>Séjour</span>
                <span>
                  {proformaQuery.data.stay.checkInDate} → {proformaQuery.data.stay.checkOutDate} (
                  {proformaQuery.data.stay.nights} nuit{proformaQuery.data.stay.nights > 1 ? 's' : ''})
                </span>
              </div>
              <div className="summary-row">
                <span>Tarif / nuit</span>
                <span>{formatAmount(proformaQuery.data.pricing.roomRate)}</span>
              </div>
              <div className="summary-row">
                <span>Montant estimé</span>
                <span>{formatAmount(proformaQuery.data.pricing.estimatedRoomAmount)}</span>
              </div>
              <div className="summary-row">
                <span>Dépôt</span>
                <span>− {formatAmount(proformaQuery.data.pricing.deposit)}</span>
              </div>
              <div className="summary-row total">
                <span>SOLDE DÛ</span>
                <span>{formatAmount(proformaQuery.data.pricing.balanceDue)}</span>
              </div>
            </div>
          )}

          {isCheckedIn && !booking.locked && (
            <button
              type="button"
              className="btn btn-ghost btn-sm mb-3"
              onClick={() => cancelMutation.mutate(searchedId)}
              disabled={cancelMutation.status === 'pending' || !!folioHasItems}
              title={
                folioHasItems
                  ? 'Impossible d\'annuler : des prestations ont été enregistrées sur le folio.'
                  : undefined
              }
            >
              <i className="bi bi-x-circle me-1" /> Annuler le check-in
            </button>
          )}

          {isCheckedIn && folioHasItems && (
            <div className="text-muted small mb-3">
              Impossible d'annuler : des prestations ont été enregistrées sur le folio.
            </div>
          )}

          {!isCheckedIn && !booking.locked && (
            <button
              type="button"
              className="btn btn-pms btn-sm mb-3"
              onClick={() => checkInMutation.mutate(searchedId)}
              disabled={checkInMutation.status === 'pending'}
            >
              {checkInMutation.status === 'pending' ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" /> Check-in en cours...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-1" /> Effectuer le Check-in
                </>
              )}
            </button>
          )}

          {booking.locked && (
            <div className="alert-security mb-3">
              <i className="bi bi-lock-fill me-2" />
              Dossier verrouillé — aucune action de modification possible.
            </div>
          )}

          {(folioAId || folioBId) && (
            <div className="border-top pt-3 mt-2">
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

              {!folioDetail && activeFolioQuery.isLoading && (
                <div className="text-muted py-2">Chargement du folio depuis l'API...</div>
              )}

              {!folioDetail && activeFolioQuery.isError && (
                <div className="alert-security mb-3">
                  <i className="bi bi-exclamation-triangle me-2" />
                  {activeFolioQuery.error?.message}
                </div>
              )}

              {folioDetail && (
                <>
                  <div className="table-responsive">
                    <table className="table pms-table mb-0">
                      <thead>
                        <tr>
                          <th>Prestation</th>
                          <th>Date</th>
                          <th>Qté</th>
                          <th>Prix</th>
                          <th>Montant</th>
                          <th>Imprimable</th>
                          {canDelete && <th>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {folioDetail.allItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.description}</td>
                            <td>{formatDate(item.date)}</td>
                            <td>{item.quantity}</td>
                            <td>{item.unitPrice} DH</td>
                            <td style={{ fontWeight: 700, color: '#10b981' }}>{item.totalAmount} DH</td>
                            <td>
                              <span
                                className={`hk-badge ${item.isVisibleOnPrint ? 'hk-propre' : 'hk-bloquee'}`}
                                onClick={() =>
                                  visibilityMutation.mutate({
                                    itemId: item.id,
                                    folioId: folioDetail.folio.id,
                                    isVisible: !item.isVisibleOnPrint,
                                  })
                                }
                                style={{ cursor: folioDetail.folio.status === 'closed' ? 'not-allowed' : 'pointer' }}
                              >
                                <i className={`bi ${item.isVisibleOnPrint ? 'bi-eye' : 'bi-eye-slash'} me-1`} />
                                {item.isVisibleOnPrint ? 'Visible' : 'Masquée'}
                              </span>
                            </td>
                            {canDelete && (
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() =>
                                    deleteItemMutation.mutate({
                                      itemId: item.id,
                                      folioId: folioDetail.folio.id,
                                    })
                                  }
                                  disabled={folioDetail.folio.status === 'closed' || deleteItemMutation.status === 'pending'}
                                >
                                  <i className="bi bi-trash3" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="folio-total-row mt-3">
                    <span className="text-muted">
                      Total Folio {folioDetail.folio.type} ({folioDetail.folio.status})
                    </span>
                    <span className="folio-total-amount">{formatAmount(folioDetail.folio.totalAmount)}</span>
                  </div>

                  {folioDetail.folio.status === 'closed' ? (
                    <div className="text-muted small mt-3">
                      Folio clôturé — ajout et suppression de prestations désactivés.
                    </div>
                  ) : (
                    <form onSubmit={handleAddItem} className="row g-2 mt-3">
                      <div className="col-12">
                        <h6 className="fw-600 mb-1">Ajouter une prestation</h6>
                      </div>
                      <div className="col-md-6">
                        <input
                          type="text"
                          className="form-control form-control-sm pms-input"
                          placeholder="Description *"
                          value={itemDescription}
                          onChange={(e) => setItemDescription(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <input
                          type="text"
                          className="form-control form-control-sm pms-input"
                          placeholder="Catégorie *"
                          value={itemCategory}
                          onChange={(e) => setItemCategory(e.target.value)}
                        />
                      </div>
                      <div className="col-4">
                        <input
                          type="number"
                          className="form-control form-control-sm pms-input"
                          placeholder="Quantité"
                          value={itemQuantity}
                          min={1}
                          onChange={(e) => setItemQuantity(e.target.value)}
                        />
                      </div>
                      <div className="col-4">
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm pms-input"
                          placeholder="Prix unitaire *"
                          value={itemUnitPrice}
                          onChange={(e) => setItemUnitPrice(e.target.value)}
                        />
                      </div>
                      <div className="col-4">
                        <input
                          type="number"
                          step="0.01"
                          className="form-control form-control-sm pms-input"
                          placeholder="TVA %"
                          value={itemTaxRate}
                          onChange={(e) => setItemTaxRate(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <button
                          type="submit"
                          className="btn btn-pms btn-sm"
                          disabled={addItemMutation.status === 'pending'}
                        >
                          <i className="bi bi-plus me-1" /> Ajouter
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
