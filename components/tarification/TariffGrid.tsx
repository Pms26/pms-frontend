'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Grille tarifaire (US1, US4, US5)
// Matrice catégorie × saison depuis GET /api/tarification/seasons
// et GET /api/tarification/rateplans (FR-009/010/015/016).
// Colonnes = saisons de l'API (nom + dateDebut → dateFin) — jamais
// hardcodées (FR-065). Lignes = ENUM catégorie exact (SC-008).
// US4 : création/modification des saisons (admin/manager).
// US5 : cellules éditables + sauvegarde batch par catégorie
// (updateCategoryRates, FR-019/020).
// ═══════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSeasons,
  createSeason,
  updateSeasonDates,
  getRatePlans,
  updateCategoryRates,
} from '@/lib/api/tarification';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { RoomCategory, Season, SeasonName } from '@/types';

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

const SEASON_NAMES: SeasonName[] = ['basse', 'moyenne', 'haute', 'pics'];

const CAN_WRITE_ROLES = ['admin', 'manager'];

type DraftRow = Partial<Record<SeasonName, string>>;

export default function TariffGrid() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canWrite = !!role && CAN_WRITE_ROLES.includes(role);

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const seasonsQuery = useQuery({
    queryKey: ['tarification', 'seasons'],
    queryFn: getSeasons,
  });
  const ratePlansQuery = useQuery({
    queryKey: ['tarification', 'rateplans'],
    queryFn: getRatePlans,
  });

  const seasons = seasonsQuery.data ?? [];
  const ratePlans = ratePlansQuery.data ?? [];

  // ─── Draft édition (US5) ─────────────────────────────
  const [drafts, setDrafts] = useState<Record<RoomCategory, DraftRow>>(
    {} as Record<RoomCategory, DraftRow>,
  );

  useEffect(() => {
    if (seasons.length === 0 || ratePlans.length === 0) return;
    const next = {} as Record<RoomCategory, DraftRow>;
    for (const cat of ROOM_CATEGORIES) {
      const row: DraftRow = {};
      for (const s of seasons) row[s.nom] = '';
      for (const rp of ratePlans) {
        if (rp.categorie === cat && rp.season) {
          row[rp.season.nom] = parseFloat(rp.prixTTC).toFixed(2);
        }
      }
      next[cat] = row;
    }
    setDrafts(next);
  }, [seasons, ratePlans]);

  const isDirty = (cat: RoomCategory, row: DraftRow) => {
    const orig: DraftRow = {};
    for (const s of seasons) {
      const rp = ratePlans.find((r) => r.categorie === cat && r.seasonId === s.id);
      orig[s.nom] = rp ? parseFloat(rp.prixTTC).toFixed(2) : '';
    }
    return JSON.stringify(orig) !== JSON.stringify(row);
  };

  const setCell = (cat: RoomCategory, season: SeasonName, value: string) => {
    setDrafts((prev) => ({ ...prev, [cat]: { ...prev[cat], [season]: value } }));
  };

  // ─── Mutation batch (US5, FR-019/020) ────────────────
  const saveRowMutation = useMutation({
    mutationFn: (vars: { cat: RoomCategory; row: DraftRow }) => {
      const payload: Partial<Record<SeasonName, number>> = {};
      for (const [nom, val] of Object.entries(vars.row) as [SeasonName, string | undefined][]) {
        if (val !== undefined && val.trim() !== '') {
          const num = Number(val);
          if (!Number.isNaN(num) && num !== 0) payload[nom] = num;
        }
      }
      return updateCategoryRates(vars.cat, payload);
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'rateplans'] });
      const detail = res.updated?.map((u) => `${u.season}: ${u.affected}`).join(' · ');
      showToast(`✅ ${res.message}${detail ? ` (${detail})` : ''}`);
      setDrafts((prev) => {
        const next = { ...prev };
        const resetRow: DraftRow = {};
        for (const s of seasons) {
          const rp = ratePlans.find((r) => r.categorie === vars.cat && r.seasonId === s.id);
          resetRow[s.nom] = rp ? parseFloat(rp.prixTTC).toFixed(2) : '';
        }
        next[vars.cat] = resetRow;
        return next;
      });
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const handleSaveRow = (cat: RoomCategory, row: DraftRow) => {
    saveRowMutation.mutate({ cat, row });
  };

  // ─── Création saison (US4, FR-011) ───────────────────
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [seasonNom, setSeasonNom] = useState<SeasonName>('basse');
  const [seasonDebut, setSeasonDebut] = useState('');
  const [seasonFin, setSeasonFin] = useState('');

  const createSeasonMutation = useMutation({
    mutationFn: (data: { nom: SeasonName; dateDebut: string; dateFin: string }) =>
      createSeason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'seasons'] });
      setShowCreateSeason(false);
      setSeasonDebut('');
      setSeasonFin('');
      showToast('✅ Saison créée');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const handleCreateSeason = () => {
    if (!seasonDebut || !seasonFin) {
      showToast('⚠️ dateDebut et dateFin sont obligatoires.');
      return;
    }
    if (seasonDebut > seasonFin) {
      showToast('⚠️ dateDebut doit être antérieure ou égale à dateFin.');
      return;
    }
    createSeasonMutation.mutate({ nom: seasonNom, dateDebut: seasonDebut, dateFin: seasonFin });
  };

  // ─── Modification dates saison (US4, FR-012) ─────────
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [editDebut, setEditDebut] = useState('');
  const [editFin, setEditFin] = useState('');

  const updateSeasonMutation = useMutation({
    mutationFn: (vars: { category: SeasonName; data: { dateDebut?: string; dateFin?: string } }) =>
      updateSeasonDates(vars.category, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'seasons'] });
      setEditingSeason(null);
      showToast('✅ Dates de saison mises à jour');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const handleSaveSeasonDates = () => {
    if (!editingSeason) return;
    const data: { dateDebut?: string; dateFin?: string } = {};
    if (editDebut) data.dateDebut = editDebut;
    if (editFin) data.dateFin = editFin;
    if (!editDebut && !editFin) {
      showToast('⚠️ Au moins dateDebut ou dateFin doit être fourni.');
      return;
    }
    updateSeasonMutation.mutate({ category: editingSeason.nom, data });
  };

  const formatDate = (d: string) => {
    const parts = d.split('-');
    if (parts.length !== 3) return d;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // ─── États (component-contracts) ─────────────────────
  if (seasonsQuery.isLoading || ratePlansQuery.isLoading) {
    return (
      <div className="glass-card p-4 text-muted">
        <i className="bi bi-arrow-repeat me-2" />Chargement de la grille tarifaire...
      </div>
    );
  }

  if (seasonsQuery.isError || ratePlansQuery.isError) {
    return (
      <div className="alert-security mb-2">
        <i className="bi bi-exclamation-triangle me-2" />
        {(seasonsQuery.error as Error)?.message ?? (ratePlansQuery.error as Error)?.message}
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h6 className="fw-600 mb-0">Matrice Tarifaire — Catégories × Saisons</h6>
        {canWrite && (
          <Button size="sm" icon="calendar-plus" onClick={() => setShowCreateSeason(true)}>
            Nouvelle saison
          </Button>
        )}
      </div>

      {seasons.length === 0 ? (
        <div className="text-muted py-3">
          Aucune saison configurée. Les colonnes de la grille sont dérivées de l'API saisons.
        </div>
      ) : ratePlans.length === 0 && !canWrite ? (
        <div className="text-muted py-3">Aucun tarif renseigné pour le moment.</div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table pms-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  {seasons.map((s) => (
                    <th key={s.id} className="text-center">
                      {s.nom}
                      <br />
                      <small className="text-muted">
                        {formatDate(s.dateDebut)} → {formatDate(s.dateFin)}
                      </small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROOM_CATEGORIES.map((cat) => {
                  const row = drafts[cat] ?? {};
                  return (
                    <tr key={cat}>
                      <td style={{ fontWeight: 600 }}>{ROOM_CATEGORY_LABELS[cat]}</td>
                      {seasons.map((s) => (
                        <td key={s.id} className="text-center">
                          {canWrite ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="form-control form-control-sm pms-input text-center"
                              style={{ width: 110 }}
                              value={row[s.nom] ?? ''}
                              onChange={(e) => setCell(cat, s.nom, e.target.value)}
                            />
                          ) : (
                            <span>
                              {row[s.nom] ? Number(row[s.nom]).toLocaleString('fr-FR') : '—'} DH
                            </span>
                          )}
                        </td>
                      ))}
                      {canWrite && (
                        <td className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            icon="save"
                            loading={saveRowMutation.isPending && saveRowMutation.variables?.cat === cat}
                            disabled={!isDirty(cat, row)}
                            onClick={() => handleSaveRow(cat, row)}
                          >
                            Enregistrer
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canWrite && (
            <div className="d-flex flex-wrap gap-2 mt-3">
              {seasons.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant="ghost"
                  icon="calendar-range"
                  onClick={() => {
                    setEditingSeason(s);
                    setEditDebut(s.dateDebut);
                    setEditFin(s.dateFin);
                  }}
                >
                  {s.nom}
                </Button>
              ))}
              <span className="text-muted small align-self-center">— modifier les dates</span>
            </div>
          )}
        </>
      )}

      {/* ─── Modal création saison (US4) ─── */}
      <Modal
        open={showCreateSeason}
        onClose={() => setShowCreateSeason(false)}
        title="Nouvelle saison"
        icon="calendar-plus"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateSeason(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              icon="check-lg"
              loading={createSeasonMutation.isPending}
              onClick={handleCreateSeason}
            >
              Créer
            </Button>
          </>
        }
      >
        <div className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small mb-1">Nom (ENUM)</label>
            <select
              className="form-select form-select-sm pms-input"
              value={seasonNom}
              onChange={(e) => setSeasonNom(e.target.value as SeasonName)}
            >
              {SEASON_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label small mb-1">Date début</label>
            <input
              type="date"
              className="form-control form-control-sm pms-input"
              value={seasonDebut}
              onChange={(e) => setSeasonDebut(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label small mb-1">Date fin</label>
            <input
              type="date"
              className="form-control form-control-sm pms-input"
              value={seasonFin}
              onChange={(e) => setSeasonFin(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* ─── Modal édition dates saison (US4, FR-012) ─── */}
      <Modal
        open={!!editingSeason}
        onClose={() => setEditingSeason(null)}
        title={`Modifier la saison « ${editingSeason?.nom ?? ''} »`}
        icon="calendar-range"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditingSeason(null)}>
              Annuler
            </Button>
            <Button
              size="sm"
              icon="check-lg"
              loading={updateSeasonMutation.isPending}
              onClick={handleSaveSeasonDates}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small mb-1">Date début (optionnel)</label>
            <input
              type="date"
              className="form-control form-control-sm pms-input"
              value={editDebut}
              onChange={(e) => setEditDebut(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label small mb-1">Date fin (optionnel)</label>
            <input
              type="date"
              className="form-control form-control-sm pms-input"
              value={editFin}
              onChange={(e) => setEditFin(e.target.value)}
            />
          </div>
          <p className="small text-muted mb-0">
            Au moins un champ doit être fourni. Le chevauchement est validé côté serveur
            (erreur 409 affichée telle quelle).
          </p>
        </div>
      </Modal>
    </div>
  );
}
