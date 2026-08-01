'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Matrice des régimes (US1, US6)
// Matrice régime BB|DP|PC × saison depuis GET /api/tarification/regimes
// (FR-021). Ligne BB toujours 0,00 DH et non éditable (FR-022) — BB
// est inclus dans le prix de base (§5.3, §5.10).
// US6 : création/modification des suppléments DP/PC (admin/manager).
// Aucune valeur de supplément hardcodée (FR-025/066).
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRegimes,
  getSeasons,
  createRegime,
  updateRegime,
} from '@/lib/api/tarification';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { RegimeSupplement, Season } from '@/types';

const REGIMES: ('BB' | 'DP' | 'PC')[] = ['BB', 'DP', 'PC'];

const CAN_WRITE_ROLES = ['admin', 'manager'];

const formatDH = (val: string) => Number(val).toLocaleString('fr-FR') + ' DH';

export default function RegimeMatrix() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canWrite = !!role && CAN_WRITE_ROLES.includes(role);

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const regimesQuery = useQuery({
    queryKey: ['tarification', 'regimes'],
    queryFn: getRegimes,
  });
  const seasonsQuery = useQuery({
    queryKey: ['tarification', 'seasons'],
    queryFn: getSeasons,
  });

  const regimes = regimesQuery.data ?? [];
  const seasons = seasonsQuery.data ?? [];

  // ─── Création (US6, FR-023) ──────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [newRegime, setNewRegime] = useState<'DP' | 'PC'>('DP');
  const [newSeasonId, setNewSeasonId] = useState<number | ''>('');
  const [newMontant, setNewMontant] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: { regime: 'DP' | 'PC'; supplementDH: number; seasonId: number }) =>
      createRegime(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'regimes'] });
      setShowCreate(false);
      setNewMontant('');
      setNewSeasonId('');
      showToast('✅ Supplément de régime créé');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newSeasonId) {
      showToast('⚠️ La saison est obligatoire.');
      return;
    }
    const montant = Number(newMontant);
    if (Number.isNaN(montant) || montant <= 0) {
      showToast('⚠️ Le montant doit être un nombre positif.');
      return;
    }
    createMutation.mutate({ regime: newRegime, supplementDH: montant, seasonId: newSeasonId });
  };

  // ─── Modification (US6, FR-024) ──────────────────────
  const [editing, setEditing] = useState<RegimeSupplement | null>(null);
  const [editMontant, setEditMontant] = useState('');

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; supplementDH: number }) =>
      updateRegime(vars.id, { supplementDH: vars.supplementDH }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'regimes'] });
      setEditing(null);
      showToast('✅ Supplément mis à jour');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const handleSaveEdit = () => {
    if (!editing) return;
    const montant = Number(editMontant);
    if (Number.isNaN(montant) || montant < 0) {
      showToast('⚠️ Le montant doit être un nombre valide.');
      return;
    }
    updateMutation.mutate({ id: editing.id, supplementDH: montant });
  };

  const seasonLabel = (s?: Season) => (s ? `${s.nom} (${s.dateDebut} → ${s.dateFin})` : '');

  if (regimesQuery.isLoading || seasonsQuery.isLoading) {
    return (
      <div className="glass-card p-4 text-muted">
        <i className="bi bi-arrow-repeat me-2" />Chargement des régimes...
      </div>
    );
  }

  if (regimesQuery.isError || seasonsQuery.isError) {
    return (
      <div className="alert-security mb-2">
        <i className="bi bi-exclamation-triangle me-2" />
        {(regimesQuery.error as Error)?.message ?? (seasonsQuery.error as Error)?.message}
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h6 className="fw-600 mb-0">Suppléments de régime — Régime × Saison</h6>
        {canWrite && (
          <Button size="sm" icon="plus-lg" onClick={() => setShowCreate(true)}>
            Nouveau supplément
          </Button>
        )}
      </div>

      {seasons.length === 0 ? (
        <div className="text-muted py-3">
          Aucune saison configurée — la matrice des régimes dépend des saisons.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table pms-table">
            <thead>
              <tr>
                <th>Régime</th>
                {seasons.map((s) => (
                  <th key={s.id} className="text-center">
                    {s.nom}
                  </th>
                ))}
                {canWrite && <th className="text-center">Action</th>}
              </tr>
            </thead>
            <tbody>
              {REGIMES.map((regime) => {
                const cells = seasons.map((s) =>
                  regimes.find((r) => r.regime === regime && r.seasonId === s.id),
                );
                const isBB = regime === 'BB';
                return (
                  <tr key={regime}>
                    <td style={{ fontWeight: 600 }}>{regime}</td>
                    {cells.map((cell, idx) => {
                      const s = seasons[idx];
                      return (
                        <td key={s.id} className="text-center">
                          {isBB ? (
                            <span className="text-muted">0,00 DH</span>
                          ) : cell ? (
                            <span>{formatDH(cell.supplementDH)}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                    {canWrite && (
                      <td className="text-center">
                        {isBB ? (
                          <span className="text-muted small">Inclus</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="pencil"
                            disabled={!cells.some(Boolean)}
                            onClick={() => {
                              const first = cells.find(Boolean);
                              if (!first) return;
                              setEditing(first);
                              setEditMontant(parseFloat(first.supplementDH).toFixed(2));
                            }}
                          >
                            Modifier
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canWrite && (
        <div className="alert-info-box mt-3 mb-0">
          <i className="bi bi-info-circle me-2" />
          BB est inclus dans le prix de base (0,00 DH, non éditable). DP et PC sont des
          suppléments par nuit en DH, gérés ici pour chaque saison.
        </div>
      )}

      {/* ─── Modal création (US6) ─── */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouveau supplément de régime"
        icon="plus-lg"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button size="sm" icon="check-lg" loading={createMutation.isPending} onClick={handleCreate}>
              Créer
            </Button>
          </>
        }
      >
        <div className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small mb-1">Régime</label>
            <select
              className="form-select form-select-sm pms-input"
              value={newRegime}
              onChange={(e) => setNewRegime(e.target.value as 'DP' | 'PC')}
            >
              <option value="DP">DP</option>
              <option value="PC">PC</option>
            </select>
          </div>
          <div>
            <label className="form-label small mb-1">Saison</label>
            <select
              className="form-select form-select-sm pms-input"
              value={newSeasonId}
              onChange={(e) => setNewSeasonId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">— Sélectionner —</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {seasonLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label small mb-1">Supplément (DH / nuit)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-sm pms-input"
              value={newMontant}
              onChange={(e) => setNewMontant(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* ─── Modal modification (US6) ─── */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Modifier ${editing?.regime ?? ''} — ${editing?.season ? seasonLabel(editing.season) : ''}`}
        icon="pencil"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button size="sm" icon="check-lg" loading={updateMutation.isPending} onClick={handleSaveEdit}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small mb-1">Supplément (DH / nuit)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-sm pms-input"
              value={editMontant}
              onChange={(e) => setEditMontant(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
