'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useModalToast } from '@/components/context/ModalToastContext';
import { updateRoomStatus } from '@/lib/api/housekeeping';
import {
  getRoomsForBooking,
  getMarketSegmentsList,
  getBookingRaw,
  createBooking,
  updateBookingRaw,
  searchClients,
  type BookingRoom,
  type BookingMarketSegment,
} from '@/lib/api/reservations';
import { getClosureDetail, downloadReport, getClosureReports } from '@/lib/api/nightAudit';
import type { RoomStatus, Client, ClosureDetail, NightAuditReport } from '@/types';

const BASE_PRICE_BY_CATEGORY: Record<string, number> = {
  Standard: 600,
  'Supérieure': 800,
  Suite: 1100,
  'Suite Deluxe': 1500,
  Lodge: 1300,
  Villa: 2500,
};
const REGIME_SUPPLEMENT: Record<string, number> = { BB: 0, DP: 220, PC: 420 };

function nightsBetween(arrival: string, departure: string): number {
  if (!arrival || !departure) return 0;
  const d1 = new Date(arrival);
  const d2 = new Date(departure);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

interface FormState {
  nom: string;
  prenom: string;
  nationalite: string;
  passeport: string;
  email: string;
  telephone: string;
  arrival: string;
  departure: string;
  roomId: string;
  pax: number;
  regime: 'BB' | 'DP' | 'PC';
  segmentId: string;
  taxeSejour: 'payable_a_reservation' | 'payable_sur_place';
  acompteMontant: string;
  acompteDate: string;
  commentaires: string;
}

const EMPTY_FORM: FormState = {
  nom: '',
  prenom: '',
  nationalite: '',
  passeport: '',
  email: '',
  telephone: '',
  arrival: '',
  departure: '',
  roomId: '',
  pax: 2,
  regime: 'BB',
  segmentId: '',
  taxeSejour: 'payable_a_reservation',
  acompteMontant: '',
  acompteDate: '',
  commentaires: '',
};

export function ReservationModal() {
  const { isReservationOpen, reservationEditId, closeReservation, showToast } = useModalToast();
  const queryClient = useQueryClient();

  const isEditMode = Boolean(reservationEditId);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [rooms, setRooms] = useState<BookingRoom[]>([]);
  const [segments, setSegments] = useState<BookingMarketSegment[]>([]);
  const [loadingRefData, setLoadingRefData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isClosedBooking, setIsClosedBooking] = useState(false);
  const [editReference, setEditReference] = useState<string | null>(null);

  const [clientResults, setClientResults] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!isReservationOpen) return;

    let mounted = true;
    setLoadingRefData(true);
    setErrorMsg(null);

    Promise.all([getRoomsForBooking(), getMarketSegmentsList()])
      .then(([roomsData, segmentsData]) => {
        if (!mounted) return;
        setRooms(roomsData);
        setSegments(segmentsData);
      })
      .catch(() => {
        if (mounted) setErrorMsg('Impossible de charger les chambres/segments.');
      })
      .finally(() => {
        if (mounted) setLoadingRefData(false);
      });

    return () => { mounted = false; };
  }, [isReservationOpen]);

  useEffect(() => {
    if (!isReservationOpen) return;

    if (!reservationEditId) {
      setForm(EMPTY_FORM);
      setLinkedCustomerId(null);
      setIsClosedBooking(false);
      setEditReference(null);
      return;
    }

    let mounted = true;
    getBookingRaw(reservationEditId)
      .then((b) => {
        if (!mounted) return;
        setIsClosedBooking(b.status === 'status_checked_out');
        setEditReference(b.reference || null);
        setForm({
          nom: b.guest?.lastName || '',
          prenom: b.guest?.firstName || '',
          nationalite: b.guest?.nationality || '',
          passeport: b.guest?.idNumber || '',
          email: b.guest?.email || '',
          telephone: b.guest?.phone || '',
          arrival: b.checkInDate ? b.checkInDate.slice(0, 10) : '',
          departure: b.checkOutDate ? b.checkOutDate.slice(0, 10) : '',
          roomId: b.room?._id || b.room || '',
          pax: b.pax || 1,
          regime: b.regime || 'BB',
          segmentId: b.marketSegment?._id || b.marketSegment || '',
          taxeSejour: b.cityTax?.mode || 'payable_a_reservation',
          acompteMontant: b.deposit?.amount ? String(b.deposit.amount) : '',
          acompteDate: b.deposit?.date ? b.deposit.date.slice(0, 10) : '',
          commentaires: b.notes || '',
        });
        setLinkedCustomerId(b.customer?._id || b.customer || null);
      })
      .catch(() => {
        if (mounted) setErrorMsg('Impossible de charger cette réservation.');
      });

    return () => { mounted = false; };
  }, [isReservationOpen, reservationEditId]);

  useEffect(() => {
    if (form.nom.trim().length < 2) {
      setClientResults([]);
      setShowClientDropdown(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await searchClients(form.nom.trim());
        setClientResults(results);
        setShowClientDropdown(results.length > 0);
      } catch {
        // silencieux
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [form.nom]);

  const selectClient = (c: Client) => {
    setForm((prev) => ({
      ...prev,
      nom: c.nom,
      prenom: c.prenom,
      email: c.email || prev.email,
      telephone: c.tel || prev.telephone,
    }));
    setLinkedCustomerId(String(c.id));
    setShowClientDropdown(false);
  };

  const selectedRoom = rooms.find((r) => r._id === form.roomId);
  const nights = nightsBetween(form.arrival, form.departure);
  const basePrice = selectedRoom ? BASE_PRICE_BY_CATEGORY[selectedRoom.category] || 600 : 0;
  const estimatedTotal = nights * (basePrice + REGIME_SUPPLEMENT[form.regime]);

  const validate = (): string | null => {
    if (!form.nom.trim()) return 'Le nom est obligatoire.';
    if (!form.prenom.trim()) return 'Le prénom est obligatoire.';
    if (!form.arrival) return "La date d'arrivée est obligatoire.";
    if (!form.departure) return 'La date de départ est obligatoire.';
    if (form.departure <= form.arrival) return 'La date de départ doit être après la date d\'arrivée.';
    if (!form.roomId) return 'Veuillez sélectionner une chambre.';
    if (!form.segmentId) return 'Veuillez sélectionner un segment de marché.';
    return null;
  };

  const buildPayload = () => ({
    room: form.roomId,
    checkInDate: form.arrival,
    checkOutDate: form.departure,
    guest: {
      lastName: form.nom.trim(),
      firstName: form.prenom.trim(),
      nationality: form.nationalite || undefined,
      idNumber: form.passeport || undefined,
      email: form.email || undefined,
      phone: form.telephone || undefined,
    },
    marketSegment: form.segmentId,
    pax: form.pax || 1,
    regime: form.regime,
    estimatedTotal,
    notes: form.commentaires || undefined,
    cityTax: { mode: form.taxeSejour },
    deposit: form.acompteMontant
      ? { amount: Number(form.acompteMontant), date: form.acompteDate || undefined }
      : undefined,
  });

  const handleSave = async (status: 'status_option' | 'status_confirmed') => {
    const validationError = validate();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = buildPayload();

      if (isEditMode && reservationEditId) {
        await updateBookingRaw(reservationEditId, payload);
        showToast(`✅ Réservation ${reservationEditId} mise à jour.`);
      } else {
        const result = await createBooking({ ...payload, status } as any);
        showToast(`✅ Réservation créée (${result.customerStatus || 'ok'}).`);
      }

      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      closeReservation();
      setForm(EMPTY_FORM);
    } catch (err: any) {
      const backendMsg = err?.response?.data?.message;
      if (err?.response?.status === 409) {
        setErrorMsg(backendMsg || 'Cette chambre est déjà réservée sur cette période.');
      } else {
        setErrorMsg(backendMsg || 'Une erreur est survenue lors de l\'enregistrement.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isReservationOpen) return null;

  return (
    <div className="modal fade show d-block" id="reservationModal" tabIndex={-1} style={{ display: 'block' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content pms-modal">
          <div className="modal-header pms-modal-header">
            <h5 className="modal-title">
              <i className="bi bi-journal-plus me-2" />
              {isEditMode ? `Modifier la Réservation ${editReference || reservationEditId}` : 'Nouvelle Réservation'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={() => closeReservation()} />
          </div>

          <div className="modal-body p-4">
            {isClosedBooking && (
              <div className="alert alert-warning mb-3">
                Ce dossier est clôturé (check-out effectué) : modification impossible.
              </div>
            )}
            {errorMsg && (
              <div className="alert alert-danger mb-3">{errorMsg}</div>
            )}

            <div className="row g-3">
              {/* ── Fiche Client ── */}
              <div className="col-lg-6">
                <div className="modal-section-title mb-2"><i className="bi bi-person-fill me-2" />Fiche Client</div>
                <div className="row g-2">
                  <div className="col-6" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-control pms-input"
                      placeholder="Nom *"
                      value={form.nom}
                      onChange={(e) => { updateField('nom', e.target.value); setLinkedCustomerId(null); }}
                      onFocus={() => setShowClientDropdown(clientResults.length > 0)}
                    />
                    {showClientDropdown && (
                      <div className="autocomplete-dropdown" style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                        background: 'white', border: '1px solid #e2e8f0', borderRadius: 6,
                        maxHeight: 160, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}>
                        {clientResults.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => selectClient(c)}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem' }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            {c.nom} {c.prenom} {c.email ? `— ${c.email}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-6">
                    <input type="text" className="form-control pms-input" placeholder="Prénom *"
                      value={form.prenom} onChange={(e) => updateField('prenom', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <input type="text" className="form-control pms-input" placeholder="Nationalité"
                      value={form.nationalite} onChange={(e) => updateField('nationalite', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <input type="text" className="form-control pms-input" placeholder="N° Passeport/CIN"
                      value={form.passeport} onChange={(e) => updateField('passeport', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <input type="email" className="form-control pms-input" placeholder="E-mail"
                      value={form.email} onChange={(e) => updateField('email', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <input type="tel" className="form-control pms-input" placeholder="Téléphone"
                      value={form.telephone} onChange={(e) => updateField('telephone', e.target.value)} />
                  </div>
                  {linkedCustomerId && (
                    <div className="col-12">
                      <small style={{ color: 'var(--accent)' }}>
                        <i className="bi bi-link-45deg" /> Lié à une fiche client existante
                      </small>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Détails du Séjour ── */}
              <div className="col-lg-6">
                <div className="modal-section-title mb-2"><i className="bi bi-calendar3 me-2" />Détails du Séjour</div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label small text-muted">Arrivée *</label>
                    <input type="date" className="form-control pms-input"
                      value={form.arrival} onChange={(e) => updateField('arrival', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Départ *</label>
                    <input type="date" className="form-control pms-input"
                      value={form.departure} onChange={(e) => updateField('departure', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Chambre</label>
                    <select className="form-select pms-input" value={form.roomId}
                      onChange={(e) => updateField('roomId', e.target.value)} disabled={loadingRefData}>
                      <option value="">— Sélectionner —</option>
                      {rooms.map((r) => (
                        <option key={r._id} value={r._id}>{r.number} — {r.category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Nombre de PAX</label>
                    <input type="number" className="form-control pms-input" min={1}
                      value={form.pax} onChange={(e) => updateField('pax', Number(e.target.value))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Régime</label>
                    <select className="form-select pms-input" value={form.regime}
                      onChange={(e) => updateField('regime', e.target.value)}>
                      <option value="BB">BB — Bed &amp; Breakfast</option>
                      <option value="DP">DP — Demi-Pension (+220 DH)</option>
                      <option value="PC">PC — Pension Complète (+420 DH)</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Segment marché</label>
                    <select className="form-select pms-input" value={form.segmentId}
                      onChange={(e) => updateField('segmentId', e.target.value)} disabled={loadingRefData}>
                      <option value="">— Sélectionner —</option>
                      {segments.map((s) => (
                        <option key={s._id} value={s._id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Taxe de séjour ── */}
              <div className="col-lg-6">
                <div className="modal-section-title mb-2"><i className="bi bi-receipt me-2" />Taxe de Séjour</div>
                <div className="d-flex gap-4">
                  <label className="radio-option">
                    <input type="radio" name="ts" value="payable_a_reservation"
                      checked={form.taxeSejour === 'payable_a_reservation'}
                      onChange={() => updateField('taxeSejour', 'payable_a_reservation')} />
                    {' '}Payable à la réservation
                  </label>
                  <label className="radio-option">
                    <input type="radio" name="ts" value="payable_sur_place"
                      checked={form.taxeSejour === 'payable_sur_place'}
                      onChange={() => updateField('taxeSejour', 'payable_sur_place')} />
                    {' '}Payable sur place (Extra)
                  </label>
                </div>
              </div>

              {/* ── Acompte ── */}
              <div className="col-lg-6">
                <div className="modal-section-title mb-2"><i className="bi bi-cash me-2" />Acompte</div>
                <div className="row g-2">
                  <div className="col-6">
                    <input type="number" className="form-control pms-input" placeholder="Montant acompte (DH)"
                      value={form.acompteMontant} onChange={(e) => updateField('acompteMontant', e.target.value)} />
                  </div>
                  <div className="col-6">
                    <input type="date" className="form-control pms-input"
                      value={form.acompteDate} onChange={(e) => updateField('acompteDate', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="col-12">
                <div className="res-total-bar">
                  <span>Total estimé (indicatif) :</span>
                  <span className="res-total-val">{estimatedTotal.toLocaleString('fr-FR')} DH</span>
                </div>
              </div>

              <div className="col-12">
                <textarea className="form-control pms-input" rows={2}
                  placeholder="Commentaires / Demandes spéciales (ex: chambre à l'étage, lit bébé, allergies…)"
                  value={form.commentaires} onChange={(e) => updateField('commentaires', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="modal-footer pms-modal-footer">
            <button className="btn btn-ghost" onClick={() => closeReservation()} disabled={saving}>
              Annuler
            </button>
            {!isEditMode && (
              <button className="btn btn-outline-accent" disabled={saving || isClosedBooking}
                onClick={() => handleSave('status_option')}>
                <i className="bi bi-clock me-1" />
                {saving ? 'Enregistrement…' : 'Enregistrer en Option'}
              </button>
            )}
            <button className="btn btn-pms" disabled={saving || isClosedBooking}
              onClick={() => handleSave('status_confirmed')}>
              <i className="bi bi-check-circle me-1" />
              {saving ? 'Enregistrement…' : isEditMode ? 'Enregistrer les modifications' : 'Confirmer la Réservation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoomModal() {
  const queryClient = useQueryClient();
  const {
    isRoomOpen,
    closeRoom,
    selectedRoomId,
    selectedRoomStatus,
    selectedRoomReason,
    setSelectedRoomStatus,
    setSelectedRoomReason,
    showToast,
  } = useModalToast();

  const [localStatus, setLocalStatus] = useState<HousekeepingStatus | null>(selectedRoomStatus);
  const [localReason, setLocalReason] = useState(selectedRoomReason);

  useEffect(() => {
    setLocalStatus(selectedRoomStatus);
    setLocalReason(selectedRoomReason);
  }, [selectedRoomStatus, selectedRoomReason]);

  const handleApply = async () => {
    if (!selectedRoomId || !localStatus) return;
    try {
      await updateRoomStatus(selectedRoomId, localStatus, localStatus === 'bloquee' ? localReason : undefined);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      showToast(`✅ Statut de la chambre ${selectedRoomId} mis à jour vers ${localStatus}`);
      closeRoom();
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.body ? `${data.message} — ${JSON.stringify(data.body)}` : data?.message;
      showToast(`⚠️ ${msg || 'Impossible de mettre à jour le statut de la chambre.'}`);
    }
  };

  return (
    <div className={`modal fade ${isRoomOpen ? 'show d-block' : ''}`} id="roomModal" tabIndex={-1} style={{ display: isRoomOpen ? 'block' : undefined }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content pms-modal">
          <div className="modal-header pms-modal-header">
            <h5 className="modal-title">Chambre {selectedRoomId || '—'}</h5>
            <button type="button" className="btn-close btn-close-white" onClick={() => closeRoom()} />
          </div>
          <div className="modal-body p-4">
            <label className="form-label fw-600">Changer le statut</label>
            <select
              className="form-select pms-input mb-3"
              value={localStatus ?? ''}
              onChange={(e) => setLocalStatus(e.target.value as HousekeepingStatus)}
            >
              <option value="sale">Sale</option>
              <option value="nettoyage_en_cours">Nettoyage en cours</option>
              <option value="propre">Propre</option>
              <option value="controlee">Contrôlée</option>
              <option value="bloquee">Bloquée</option>
            </select>
            {localStatus === 'bloquee' && (
              <div>
                <label className="form-label fw-600">Motif de blocage</label>
                <select
                  className="form-select pms-input"
                  value={localReason}
                  onChange={(e) => setLocalReason(e.target.value)}
                >
                  <option value="day_use">Day Use</option>
                  <option value="probleme_technique">Problème technique</option>
                  <option value="depart_tardif">Départ tardif</option>
                  <option value="travaux">Travaux / Rénovation</option>
                </select>
              </div>
            )}
          </div>
          <div className="modal-footer pms-modal-footer">
            <button className="btn btn-ghost" onClick={() => closeRoom()}>Annuler</button>
            <button className="btn btn-pms" onClick={handleApply}>Appliquer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClosureConfirmModal({
  onConfirm,
  isPending,
  businessDate,
}: {
  onConfirm: (justification?: string) => void;
  isPending: boolean;
  businessDate: string;
}) {
  const { isClosureConfirmOpen, closeClosureConfirm } = useModalToast();
  const [justification, setJustification] = useState('');
  const [showJustification, setShowJustification] = useState(false);

  if (!isClosureConfirmOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      tabIndex={-1}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content pms-modal">
          <div className="pms-modal-header">
            <h5 className="modal-title">Confirmer la Clôture</h5>
          </div>
          <div className="modal-body p-4 text-center">
            <div className="na-modal-icon mb-3">
              <i className="bi bi-moon-stars-fill" />
            </div>
            <h5 className="fw-700 mb-2">Journée {businessDate}</h5>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Êtes-vous certain de vouloir clôturer la journée ? Cette opération est <strong>irréversible</strong>.
            </p>
            <div className="mb-3 text-start">
              <button
                className="btn btn-ghost btn-sm mb-2"
                onClick={() => setShowJustification(!showJustification)}
              >
                <i className={`bi bi-${showJustification ? 'chevron-up' : 'chevron-down'} me-1`} />
                {showJustification ? 'Masquer' : 'Ajouter une justification'}
              </button>
              {showJustification && (
                <textarea
                  className="form-control pms-input"
                  rows={3}
                  placeholder="Justification de l'écart (requis si écart non nul pour admin)"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              )}
            </div>
          </div>
          <div className="pms-modal-footer">
            <button
              className="btn btn-ghost"
              onClick={() => {
                closeClosureConfirm();
                setJustification('');
                setShowJustification(false);
              }}
            >
              Annuler
            </button>
            <button
              className="btn btn-danger-pms"
              onClick={() => {
                onConfirm(justification || undefined);
                setJustification('');
                setShowJustification(false);
              }}
              disabled={isPending}
            >
              {isPending ? (
                <><span className="spinner-border spinner-border-sm me-2" />Clôture en cours...</>
              ) : (
                <><i className="bi bi-check-lg me-1" />Confirmer la clôture</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClosureDetailModal({ userRole }: { userRole?: string }) {
  const { closureDetailDate, closeClosureDetail } = useModalToast();

  const { data: detail, isLoading } = useQuery<ClosureDetail>({
    queryKey: ['closure-detail', closureDetailDate],
    queryFn: () => getClosureDetail(closureDetailDate!),
    enabled: !!closureDetailDate,
  });

  const { data: reports } = useQuery<NightAuditReport[]>({
    queryKey: ['closure-reports', closureDetailDate],
    queryFn: () => getClosureReports(closureDetailDate!),
    enabled: !!closureDetailDate,
  });

  if (!closureDetailDate) return null;

  const handleDownload = async (reportId: string) => {
    if (!closureDetailDate) return;
    try {
      await downloadReport(closureDetailDate, reportId);
    } catch {
      // error handled by the downloadReport function
    }
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeClosureDetail();
      }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content pms-modal">
          <div className="pms-modal-header">
            <h5 className="modal-title">
              <i className="bi bi-file-earmark-bar-graph me-2" />
              Détail Clôture — {closureDetailDate}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={closeClosureDetail} />
          </div>
          <div className="modal-body p-4">
            {isLoading ? (
              <div className="text-center py-4">
                <span className="spinner-border spinner-border-sm me-2" />
                Chargement...
              </div>
            ) : detail ? (
              <>
                {/* Revenue Breakdown */}
                <h6 className="fw-600 mb-3"><i className="bi bi-cash-stack me-2" />Ventilation des Revenus</h6>
                <div className="table-responsive mb-4">
                  <table className="table table-sm table-bordered" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr className="table-light">
                        <th>Catégorie</th>
                        <th className="text-end">HT</th>
                        <th className="text-end">TVA %</th>
                        <th className="text-end">TVA</th>
                        <th className="text-end">TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.revenueBreakdown.map((r, i) => (
                        <tr key={i}>
                          <td className="text-capitalize">{r.category.replace('_', ' ')}</td>
                          <td className="text-end">{r.amountHt.toLocaleString('fr-FR')} DH</td>
                          <td className="text-end">{(r.tvaRate * 100).toFixed(0)}%</td>
                          <td className="text-end">{r.tvaAmount.toLocaleString('fr-FR')} DH</td>
                          <td className="text-end fw-600">{r.amountTtc.toLocaleString('fr-FR')} DH</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payment Summary */}
                <h6 className="fw-600 mb-3"><i className="bi bi-credit-card me-2" />Récapitulatif Paiements</h6>
                <div className="table-responsive mb-4">
                  <table className="table table-sm table-bordered" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr className="table-light">
                        <th>Moyen de paiement</th>
                        <th className="text-end">Total</th>
                        <th className="text-end">Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.paymentSummary.map((p, i) => (
                        <tr key={i}>
                          <td className="text-capitalize">{p.paymentMethod.replace('_', ' ')}</td>
                          <td className="text-end">{p.totalAmount.toLocaleString('fr-FR')} DH</td>
                          <td className="text-end">{p.transactionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Debtors Summary */}
                {detail.debtorsSummary.length > 0 && (
                  <>
                    <h6 className="fw-600 mb-3"><i className="bi bi-people me-2" />Débiteurs</h6>
                    <div className="table-responsive mb-4">
                      <table className="table table-sm table-bordered" style={{ fontSize: '0.82rem' }}>
                        <thead>
                          <tr className="table-light">
                            <th>Nom</th>
                            <th>Référence</th>
                            <th className="text-end">Montant</th>
                            <th className="text-end">Factures</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.debtorsSummary.map((d, i) => (
                            <tr key={i}>
                              <td>{d.debtorName}</td>
                              <td className="font-mono text-xs">{d.debtorReference}</td>
                              <td className="text-end">{d.amount.toLocaleString('fr-FR')} DH</td>
                              <td className="text-end">{d.invoiceCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Reports with download */}
                {reports && reports.length > 0 && (
                  <>
                    <h6 className="fw-600 mb-3"><i className="bi bi-file-pdf me-2" />Rapports PDF</h6>
                    <div className="row g-2">
                      {reports.map((report) => (
                        <div key={report.id} className="col-md-6">
                          <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ background: 'rgba(15,23,42,0.03)' }}>
                            <i className="bi bi-file-earmark-pdf" style={{ color: '#ef4444', fontSize: '1.1rem' }} />
                            <div className="flex-1" style={{ fontSize: '0.8rem' }}>
                              <div className="fw-600">{report.name}</div>
                              {report.fileSize && (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                  {(report.fileSize / 1024).toFixed(0)} Ko
                                </div>
                              )}
                            </div>
                            {(userRole === 'admin' || userRole === 'comptable') && (
                              <button
                                className="btn btn-sm btn-ghost p-1"
                                onClick={() => handleDownload(report.id)}
                                title="Télécharger"
                              >
                                <i className="bi bi-download" style={{ color: 'var(--accent)' }} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                Aucune donnée disponible
              </div>
            )}
          </div>
          <div className="pms-modal-footer">
            <button className="btn btn-ghost" onClick={closeClosureDetail}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const { toastMessage, hideToast } = useModalToast();

  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3">
      <div id="pmsToast" className={`toast pms-toast align-items-center border-0 ${toastMessage ? 'show' : ''}`} role="alert" style={{ display: toastMessage ? 'flex' : 'none' }}>
        <div className="d-flex">
          <div className="toast-body" id="pmsToastBody">{toastMessage || 'Action effectuée.'}</div>
          <button type="button" className="btn-close btn-close-white me-2 m-auto" onClick={() => hideToast()} />
        </div>
      </div>
    </div>
  );
}

export default function GlobalModals() {
  return (
    <>
      <ReservationModal />
      <RoomModal />
      <ToastContainer />
    </>
  );
}