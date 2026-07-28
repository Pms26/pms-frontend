'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useModalToast } from '@/components/context/ModalToastContext';
import { updateRoomStatus } from '@/lib/api/housekeeping';
import { getClosureDetail, downloadReport, getClosureReports } from '@/lib/api/nightAudit';
import type { RoomStatus, ClosureDetail, NightAuditReport } from '@/types';

export function ReservationModal() {
  const { isReservationOpen, closeReservation } = useModalToast();

  return (
    <div className={`modal fade ${isReservationOpen ? 'show d-block' : ''}`} id="reservationModal" tabIndex={-1} aria-hidden="true" style={{ display: isReservationOpen ? 'block' : undefined }}>
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content pms-modal">
          <div className="modal-header pms-modal-header">
            <h5 className="modal-title"><i className="bi bi-journal-plus me-2" />Nouvelle Réservation</h5>
            <button type="button" className="btn-close btn-close-white" onClick={() => closeReservation()} />
          </div>
          <div className="modal-body p-4">
            <div className="row g-3">
              <div className="col-lg-6">
                <div className="modal-section-title mb-2"><i className="bi bi-person-fill me-2" />Fiche Client</div>
                <div className="row g-2">
                  <div className="col-6">
                    <input type="text" className="form-control pms-input" placeholder="Nom *" id="resNom" />
                    <div className="autocomplete-dropdown d-none" id="clientDropdown" />
                  </div>
                  <div className="col-6"><input type="text" className="form-control pms-input" placeholder="Prénom *" /></div>
                  <div className="col-6"><input type="text" className="form-control pms-input" placeholder="Nationalité" /></div>
                  <div className="col-6"><input type="text" className="form-control pms-input" placeholder="N° Passeport/CIN" /></div>
                  <div className="col-6"><input type="email" className="form-control pms-input" placeholder="E-mail" /></div>
                  <div className="col-6"><input type="tel" className="form-control pms-input" placeholder="Téléphone" /></div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="modal-section-title mb-2"><i className="bi bi-calendar3 me-2" />Détails du Séjour</div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label small text-muted">Arrivée *</label>
                    <input type="date" className="form-control pms-input" id="resArrival" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Départ *</label>
                    <input type="date" className="form-control pms-input" id="resDeparture" />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Chambre</label>
                    <select className="form-select pms-input">
                      <option>201 — Standard</option>
                      <option>205 — Suite</option>
                      <option>310 — Lodge</option>
                      <option>102 — Standard</option>
                      <option>308 — Suite Deluxe</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Nombre de PAX</label>
                    <input type="number" className="form-control pms-input" defaultValue={2} min={1} />
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Régime</label>
                    <select className="form-select pms-input" id="resRegime">
                      <option value="BB">BB — Bed &amp; Breakfast</option>
                      <option value="DP">DP — Demi-Pension (+220 DH)</option>
                      <option value="PC">PC — Pension Complète (+420 DH)</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label small text-muted">Segment marché</label>
                    <select className="form-select pms-input">
                      <option>Direct — Téléphone/Mail</option>
                      <option>Direct — Walk-in</option>
                      <option>Direct — Site web</option>
                      <option>OTA — Booking.com</option>
                      <option>OTA — Expedia</option>
                      <option>OTA — Airbnb</option>
                      <option>B2B — Agence / TO</option>
                      <option>B2B — Corporate</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="modal-section-title mb-2"><i className="bi bi-receipt me-2" />Taxe de Séjour</div>
                <div className="d-flex gap-4">
                  <label className="radio-option"><input type="radio" name="ts" value="resa" defaultChecked /> Payable à la réservation</label>
                  <label className="radio-option"><input type="radio" name="ts" value="place" /> Payable sur place (Extra)</label>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="modal-section-title mb-2"><i className="bi bi-cash me-2" />Acompte</div>
                <div className="row g-2">
                  <div className="col-6"><input type="number" className="form-control pms-input" placeholder="Montant acompte (DH)" /></div>
                  <div className="col-6"><input type="date" className="form-control pms-input" placeholder="Date limite" /></div>
                </div>
              </div>
              <div className="col-12">
                <div className="res-total-bar">
                  <span>Total estimé (HT + TVA) :</span>
                  <span className="res-total-val">3 000 DH</span>
                </div>
              </div>
              <div className="col-12">
                <textarea className="form-control pms-input" rows={2} placeholder="Commentaires / Demandes spéciales (ex: chambre à l'étage, lit bébé, allergies…)" />
              </div>
            </div>
          </div>
          <div className="modal-footer pms-modal-footer">
            <button className="btn btn-ghost" onClick={() => closeReservation()}>Annuler</button>
            <button className="btn btn-outline-accent" onClick={() => { closeReservation(); }}><i className="bi bi-clock me-1" />Enregistrer en Option</button>
            <button className="btn btn-pms" onClick={() => { closeReservation(); }}><i className="bi bi-check-circle me-1" />Confirmer la Réservation</button>
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

  const [localStatus, setLocalStatus] = useState<RoomStatus | null>(selectedRoomStatus);
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
    } catch (error) {
      showToast('⚠️ Impossible de mettre à jour le statut de la chambre.');
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
              onChange={(e) => setLocalStatus(e.target.value as RoomStatus)}
            >
              <option value="sale">Sale</option>
              <option value="encours">Nettoyage en cours</option>
              <option value="propre">Propre</option>
              <option value="controlee">Contrôlée</option>
              <option value="bloquee">Bloquée</option>
              <option value="inhouse">In-House</option>
            </select>
            {localStatus === 'bloquee' && (
              <div>
                <label className="form-label fw-600">Motif de blocage</label>
                <select
                  className="form-select pms-input"
                  value={localReason}
                  onChange={(e) => setLocalReason(e.target.value)}
                >
                  <option value="Day Use">Day Use</option>
                  <option value="Problème technique">Problème technique</option>
                  <option value="Départ tardif">Départ tardif</option>
                  <option value="Travaux / Rénovation">Travaux / Rénovation</option>
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
