'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Partenaires (US8)
// Liste des partenaires depuis GET /api/tarification/partners avec
// filtre par type + recherche par nom (FR-034). Création /
// modification / bascule actif admin/manager (FR-035/036).
// Tarifs négociés par partenaire : matrice catégorie × saison via
// GET /api/tarification/partners/:partnerId/rates (FR-037/038).
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPartners,
  createPartner,
  updatePartner,
  getPartnerRates,
  createPartnerRate,
  getSeasons,
} from '@/lib/api/tarification';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { Partner, PartnerType, RoomCategory, SeasonName } from '@/types';

const PARTNER_TYPES: PartnerType[] = ['agence_voyage', 'tour_operateur', 'societe'];

const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  agence_voyage: 'Agence de voyage',
  tour_operateur: 'Tour opérateur',
  societe: 'Société',
};

const ROOM_CATEGORIES: RoomCategory[] = [
  'standard',
  'superieure',
  'suite',
  'suite_deluxe',
  'lodge',
  'villa',
];

const ROOM_CATEGORY_LABELS: Record<RoomCategory, string> = {
  standard: 'Standard',
  superieure: 'Supérieure',
  suite: 'Suite',
  suite_deluxe: 'Suite Deluxe',
  lodge: 'Lodge',
  villa: 'Villa',
};

const CAN_WRITE_ROLES = ['admin', 'manager'];

export default function PartnersTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canWrite = !!role && CAN_WRITE_ROLES.includes(role);

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const partnersQuery = useQuery({
    queryKey: ['tarification', 'partners'],
    queryFn: getPartners,
  });
  const partners = partnersQuery.data ?? [];

  // ─── Filtres (FR-034) ────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<PartnerType | ''>('');
  const [search, setSearch] = useState('');

  const filtered = partners.filter((p) => {
    if (typeFilter && p.type !== typeFilter) return false;
    if (search.trim() && !p.nom.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  // ─── Création / modification (FR-035/036) ─────────────
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [formNom, setFormNom] = useState('');
  const [formType, setFormType] = useState<PartnerType>('agence_voyage');
  const [formEmail, setFormEmail] = useState('');
  const [formTel, setFormTel] = useState('');

  const saveMutation = useMutation({
    mutationFn: (vars: {
      editing: Partner | null;
      nom: string;
      type: PartnerType;
      email?: string;
      telephone?: string;
      actif?: boolean;
    }) =>
      vars.editing
        ? updatePartner(vars.editing.id, {
            nom: vars.nom,
            type: vars.type,
            email: vars.email || undefined,
            telephone: vars.telephone || undefined,
          })
        : createPartner({
            nom: vars.nom,
            type: vars.type,
            email: vars.email || undefined,
            telephone: vars.telephone || undefined,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'partners'] });
      setShowModal(false);
      setEditing(null);
      showToast('✅ Partenaire enregistré');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormNom('');
    setFormType('agence_voyage');
    setFormEmail('');
    setFormTel('');
    setShowModal(true);
  };

  const openEdit = (p: Partner) => {
    setEditing(p);
    setFormNom(p.nom);
    setFormType(p.type);
    setFormEmail(p.email ?? '');
    setFormTel(p.telephone ?? '');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formNom.trim()) {
      showToast('⚠️ Le nom est obligatoire.');
      return;
    }
    saveMutation.mutate({
      editing,
      nom: formNom.trim(),
      type: formType,
      email: formEmail,
      telephone: formTel,
    });
  };

  const toggleActiveMutation = useMutation({
    mutationFn: (vars: { id: number; actif: boolean }) =>
      updatePartner(vars.id, { actif: vars.actif }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'partners'] });
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  // ─── Tarifs négociés (FR-037/038) ────────────────────
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const ratesQuery = useQuery({
    queryKey: ['tarification', 'partners', selectedPartner?.id, 'rates'],
    queryFn: () => getPartnerRates(selectedPartner!.id),
    enabled: !!selectedPartner,
  });
  const seasonsQuery = useQuery({
    queryKey: ['tarification', 'seasons'],
    queryFn: getSeasons,
  });
  const seasons = seasonsQuery.data ?? [];

  const createRateMutation = useMutation({
    mutationFn: (vars: { categorie: RoomCategory; prixNetDH: number; partnerId: number; seasonId: number }) =>
      createPartnerRate(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tarification', 'partners', selectedPartner?.id, 'rates'],
      });
      showToast('✅ Tarif négocié enregistré');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const [rateCat, setRateCat] = useState<RoomCategory>('standard');
  const [rateSeasonId, setRateSeasonId] = useState<number | ''>('');
  const [ratePrix, setRatePrix] = useState('');

  const handleCreateRate = () => {
    if (!selectedPartner) return;
    if (!rateSeasonId) {
      showToast('⚠️ La saison est obligatoire.');
      return;
    }
    const prix = Number(ratePrix);
    if (Number.isNaN(prix) || prix <= 0) {
      showToast('⚠️ Le prix net doit être un nombre positif.');
      return;
    }
    createRateMutation.mutate({
      categorie: rateCat,
      prixNetDH: prix,
      partnerId: selectedPartner.id,
      seasonId: rateSeasonId,
    });
    setRatePrix('');
  };

  if (partnersQuery.isLoading) {
    return (
      <div className="glass-card p-4 text-muted">
        <i className="bi bi-arrow-repeat me-2" />Chargement des partenaires...
      </div>
    );
  }

  if (partnersQuery.isError) {
    return (
      <div className="alert-security mb-2">
        <i className="bi bi-exclamation-triangle me-2" />
        {(partnersQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="glass-card p-4">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <h6 className="fw-600 mb-0">Partenaires</h6>
          {canWrite && (
            <Button size="sm" icon="plus-lg" onClick={openCreate}>
              Nouveau partenaire
            </Button>
          )}
        </div>

        <div className="d-flex gap-2 mb-3 flex-wrap">
          <select
            className="form-select form-select-sm pms-input"
            style={{ width: 220 }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as PartnerType | '')}
          >
            <option value="">Tous les types</option>
            {PARTNER_TYPES.map((t) => (
              <option key={t} value={t}>
                {PARTNER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="form-control form-control-sm pms-input"
            style={{ width: 240 }}
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-muted py-3">Aucun partenaire ne correspond à la recherche.</div>
        ) : (
          <div className="table-responsive">
            <table className="table pms-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th className="text-center">Statut</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.nom}</td>
                    <td>{PARTNER_TYPE_LABELS[p.type] ?? p.type}</td>
                    <td className="small text-muted">
                      {p.email || '—'}
                      {p.telephone ? ` · ${p.telephone}` : ''}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${p.actif ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {p.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="d-flex gap-2 justify-content-center">
                        {canWrite ? (
                          <>
                            <Button size="sm" variant="ghost" icon="pencil" onClick={() => openEdit(p)}>
                              Modifier
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              icon={p.actif ? 'toggle-off' : 'toggle-on'}
                              onClick={() => toggleActiveMutation.mutate({ id: p.id, actif: !p.actif })}
                            >
                              {p.actif ? 'Désactiver' : 'Activer'}
                            </Button>
                          </>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          icon="cash-coin"
                          onClick={() => setSelectedPartner(p)}
                        >
                          Tarifs
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Tarifs négociés (FR-037/038) ─── */}
      {selectedPartner && (
        <div className="glass-card p-4">
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <h6 className="fw-600 mb-0">
              Tarifs négociés — {selectedPartner.nom}
            </h6>
            <Button size="sm" variant="ghost" icon="x-lg" onClick={() => setSelectedPartner(null)}>
              Fermer
            </Button>
          </div>

          {seasonsQuery.isLoading || ratesQuery.isLoading ? (
            <div className="text-muted py-2">
              <i className="bi bi-arrow-repeat me-2" />Chargement...
            </div>
          ) : ratesQuery.isError ? (
            <div className="alert-security mb-2">
              <i className="bi bi-exclamation-triangle me-2" />
              {(ratesQuery.error as Error).message}
            </div>
          ) : (
            <>
              <div className="table-responsive mb-3">
                <table className="table pms-table">
                  <thead>
                    <tr>
                      <th>Catégorie</th>
                      {seasons.map((s) => (
                        <th key={s.id} className="text-center">
                          {s.nom}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROOM_CATEGORIES.map((cat) => {
                      const row = seasons.map((s) =>
                        (ratesQuery.data ?? []).find((r) => r.categorie === cat && r.seasonId === s.id),
                      );
                      return (
                        <tr key={cat}>
                          <td style={{ fontWeight: 600 }}>{ROOM_CATEGORY_LABELS[cat]}</td>
                          {row.map((r, idx) => (
                            <td key={seasons[idx].id} className="text-center">
                              {r ? `${Number(r.prixNetDH).toLocaleString('fr-FR')} DH` : '—'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {canWrite && (
                <div className="d-flex gap-2 align-items-end flex-wrap">
                  <div>
                    <label className="form-label small mb-1">Catégorie</label>
                    <select
                      className="form-select form-select-sm pms-input"
                      value={rateCat}
                      onChange={(e) => setRateCat(e.target.value as RoomCategory)}
                    >
                      {ROOM_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {ROOM_CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label small mb-1">Saison</label>
                    <select
                      className="form-select form-select-sm pms-input"
                      value={rateSeasonId}
                      onChange={(e) => setRateSeasonId(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">—</option>
                      {seasons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label small mb-1">Prix net (DH)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-control form-control-sm pms-input"
                      style={{ width: 130 }}
                      value={ratePrix}
                      onChange={(e) => setRatePrix(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    icon="plus-lg"
                    loading={createRateMutation.isPending}
                    onClick={handleCreateRate}
                  >
                    Ajouter
                  </Button>
                </div>
              )}

              <div className="alert-info-box mt-3 mb-0">
                <i className="bi bi-info-circle me-2" />
                L'application de ces tarifs négociés à la réservation (booking) relève du
                module Front Office. Ici, ils sont uniquement configurés.
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Modal création / modification partenaire ─── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifier le partenaire' : 'Nouveau partenaire'}
        icon="building"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button size="sm" icon="check-lg" loading={saveMutation.isPending} onClick={handleSave}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small mb-1">Nom *</label>
            <input
              type="text"
              className="form-control form-control-sm pms-input"
              value={formNom}
              onChange={(e) => setFormNom(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label small mb-1">Type</label>
            <select
              className="form-select form-select-sm pms-input"
              value={formType}
              onChange={(e) => setFormType(e.target.value as PartnerType)}
            >
              {PARTNER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PARTNER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label small mb-1">Email</label>
            <input
              type="email"
              className="form-control form-control-sm pms-input"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label small mb-1">Téléphone</label>
            <input
              type="tel"
              className="form-control form-control-sm pms-input"
              value={formTel}
              onChange={(e) => setFormTel(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
