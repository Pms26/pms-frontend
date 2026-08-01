'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Packages (US11)
// Liste des packages depuis GET /api/tarification/packages (FR-052).
// Création admin/manager avec ventilation (FR-053). Validation
// client : Σ montantDH === prixGlobalDH exactement, message au
// format backend (FR-054, SC-006). Seuls les 5 postes documentés
// sont proposés (FR-056). Aucune édition/suppression (FR-057).
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPackages, createPackage } from '@/lib/api/tarification';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { BreakdownPoste } from '@/types';

const POSTES: BreakdownPoste[] = ['hebergement', 'restaurant', 'spa', 'activites', 'autre'];

const POSTE_LABELS: Record<BreakdownPoste, string> = {
  hebergement: 'Hébergement',
  restaurant: 'Restaurant',
  spa: 'SPA',
  activites: 'Activités',
  autre: 'Autre',
};

const CAN_WRITE_ROLES = ['admin', 'manager'];

const formatDH = (val: string) => Number(val).toLocaleString('fr-FR') + ' DH';

interface BreakdownDraft {
  poste: BreakdownPoste;
  montant: string;
}

export default function PackagesTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canWrite = !!role && CAN_WRITE_ROLES.includes(role);

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const packagesQuery = useQuery({
    queryKey: ['tarification', 'packages'],
    queryFn: getPackages,
  });
  const packages = packagesQuery.data ?? [];

  // ─── Création (FR-053) ───────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [formNom, setFormNom] = useState('');
  const [formPrix, setFormPrix] = useState('');
  const [breakdowns, setBreakdowns] = useState<BreakdownDraft[]>([
    { poste: 'hebergement', montant: '' },
  ]);

  const createMutation = useMutation({
    mutationFn: (vars: {
      nom: string;
      prixGlobalDH: number;
      breakdown: { poste: BreakdownPoste; montantDH: number }[];
    }) => createPackage(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'packages'] });
      setShowCreate(false);
      setFormNom('');
      setFormPrix('');
      setBreakdowns([{ poste: 'hebergement', montant: '' }]);
      showToast('✅ Package créé');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const sumBreakdown = breakdowns.reduce((sum, b) => {
    const v = Number(b.montant);
    return sum + (Number.isNaN(v) ? 0 : v);
  }, 0);

  const setBreakdown = (idx: number, patch: Partial<BreakdownDraft>) => {
    setBreakdowns((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };

  const handleCreate = () => {
    if (!formNom.trim()) {
      showToast('⚠️ Le nom est obligatoire.');
      return;
    }
    const prix = Number(formPrix);
    if (Number.isNaN(prix) || prix <= 0) {
      showToast('⚠️ Le prix global doit être un nombre positif.');
      return;
    }
    if (sumBreakdown !== prix) {
      showToast(
        `⚠️ La ventilation (${sumBreakdown} DH) ne correspond pas au prix global (${prix} DH).`,
      );
      return;
    }
    createMutation.mutate({
      nom: formNom.trim(),
      prixGlobalDH: prix,
      breakdown: breakdowns
        .filter((b) => b.montant.trim() !== '')
        .map((b) => ({ poste: b.poste, montantDH: Number(b.montant) })),
    });
  };

  if (packagesQuery.isLoading) {
    return (
      <div className="glass-card p-4 text-muted">
        <i className="bi bi-arrow-repeat me-2" />Chargement des packages...
      </div>
    );
  }

  if (packagesQuery.isError) {
    return (
      <div className="alert-security mb-2">
        <i className="bi bi-exclamation-triangle me-2" />
        {(packagesQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="glass-card p-4">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <h6 className="fw-600 mb-0">Packages</h6>
          {canWrite && (
            <Button size="sm" icon="box-seam" onClick={() => setShowCreate(true)}>
              Nouveau package
            </Button>
          )}
        </div>

        {packages.length === 0 ? (
          <div className="text-muted py-3">
            Aucun package configuré. Les packages proviennent de l'API.
          </div>
        ) : (
          <div className="row g-3">
            {packages.map((p) => (
              <div key={p.id} className="col-md-6 col-lg-4">
                <div className="glass-card p-3 h-100" style={{ boxShadow: 'none' }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="fw-600">{p.nom}</div>
                    <span className={`badge ${p.actif ? 'text-bg-success' : 'text-bg-secondary'}`}>
                      {p.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="fw-600 mb-2" style={{ color: 'var(--accent)' }}>
                    {formatDH(p.prixGlobalDH)}
                  </div>
                  <div className="small">
                    {p.breakdowns.length === 0 ? (
                      <span className="text-muted">Aucune ventilation</span>
                    ) : (
                      p.breakdowns.map((b) => (
                        <div key={b.id} className="d-flex justify-content-between border-bottom py-1">
                          <span className="text-muted">{POSTE_LABELS[b.poste] ?? b.poste}</span>
                          <span>{formatDH(b.montantDH)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Modal création ─── */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouveau package"
        icon="box-seam"
        size="md"
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
          <div className="row g-3">
            <div className="col-md-7">
              <label className="form-label small mb-1">Nom *</label>
              <input
                type="text"
                className="form-control form-control-sm pms-input"
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
              />
            </div>
            <div className="col-md-5">
              <label className="form-label small mb-1">Prix global (DH)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control form-control-sm pms-input"
                value={formPrix}
                onChange={(e) => setFormPrix(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <label className="form-label small mb-0">Ventilation</label>
              <Button
                size="sm"
                variant="ghost"
                icon="plus-lg"
                onClick={() =>
                  setBreakdowns((prev) => [...prev, { poste: 'autre', montant: '' }])
                }
              >
                Ajouter un poste
              </Button>
            </div>

            <div className="d-flex flex-column gap-2">
              {breakdowns.map((b, idx) => (
                <div key={idx} className="d-flex gap-2">
                  <select
                    className="form-select form-select-sm pms-input flex-grow-1"
                    value={b.poste}
                    onChange={(e) => setBreakdown(idx, { poste: e.target.value as BreakdownPoste })}
                  >
                    {POSTES.map((p) => (
                      <option key={p} value={p}>
                        {POSTE_LABELS[p]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control form-control-sm pms-input"
                    style={{ width: 140 }}
                    placeholder="Montant DH"
                    value={b.montant}
                    onChange={(e) => setBreakdown(idx, { montant: e.target.value })}
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    icon="trash"
                    disabled={breakdowns.length === 1}
                    onClick={() => setBreakdowns((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>

            <div
              className={`mt-2 small fw-600 ${sumBreakdown === Number(formPrix) ? 'text-success' : 'text-danger'}`}
            >
              Total ventilation : {sumBreakdown.toLocaleString('fr-FR')} DH
              {formPrix !== '' && ` / Prix global : ${Number(formPrix).toLocaleString('fr-FR')} DH`}
              {sumBreakdown !== Number(formPrix) && ' — la ventilation doit correspondre au prix global.'}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
