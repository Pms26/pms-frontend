'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Remises (US10)
// Liste des remises depuis GET /api/tarification/discounts (FR-046)
// avec badge pourcentage vs valeur_fixe (FR-047). Création
// admin/manager (FR-048). Prévisualisation via POST
// /api/tarification/discounts/apply (calcul sans effet de bord,
// FR-049) — bouton réservé aux rôles Q2 (admin/manager/comptable)
// via useAuthStore ; la couche API est sans rôle (FR-063).
// valeur_fixe : « remplace le prix » (FR-047).
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDiscounts, createDiscount, applyDiscount } from '@/lib/api/tarification';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { Discount, DiscountType } from '@/types';

const CAN_CREATE_ROLES = ['admin', 'manager'];
const CAN_PREVIEW_ROLES = ['admin', 'manager', 'comptable'];

const TYPE_LABELS: Record<DiscountType, string> = {
  pourcentage: 'Pourcentage',
  valeur_fixe: 'Valeur fixe (remplace le prix)',
};

export default function DiscountsTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canCreate = !!role && CAN_CREATE_ROLES.includes(role);
  const canPreview = !!role && CAN_PREVIEW_ROLES.includes(role);

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const discountsQuery = useQuery({
    queryKey: ['tarification', 'discounts'],
    queryFn: getDiscounts,
  });
  const discounts = discountsQuery.data ?? [];

  // ─── Création (FR-048) ───────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [formNom, setFormNom] = useState('');
  const [formType, setFormType] = useState<DiscountType>('pourcentage');
  const [formValeur, setFormValeur] = useState('');

  const createMutation = useMutation({
    mutationFn: (vars: { nom: string; type: DiscountType; valeur: number }) =>
      createDiscount(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'discounts'] });
      setShowCreate(false);
      setFormNom('');
      setFormValeur('');
      showToast('✅ Remise créée');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!formNom.trim()) {
      showToast('⚠️ Le nom est obligatoire.');
      return;
    }
    const valeur = Number(formValeur);
    if (Number.isNaN(valeur) || valeur <= 0) {
      showToast('⚠️ La valeur doit être un nombre positif.');
      return;
    }
    if (formType === 'pourcentage' && valeur > 100) {
      showToast('⚠️ Un pourcentage ne peut pas dépasser 100.');
      return;
    }
    createMutation.mutate({ nom: formNom.trim(), type: formType, valeur });
  };

  // ─── Prévisualisation (FR-049) ───────────────────────
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [prixInitial, setPrixInitial] = useState('');

  const previewMutation = useMutation({
    mutationFn: (vars: { discountId: number; prixInitial: number }) =>
      applyDiscount(vars),
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const handlePreview = () => {
    if (!selectedId) {
      showToast('⚠️ Sélectionnez une remise.');
      return;
    }
    const prix = Number(prixInitial);
    if (Number.isNaN(prix) || prix <= 0) {
      showToast('⚠️ Le prix initial doit être un nombre positif.');
      return;
    }
    previewMutation.mutate({ discountId: selectedId, prixInitial: prix });
  };

  const preview = previewMutation.data;

  if (discountsQuery.isLoading) {
    return (
      <div className="glass-card p-4 text-muted">
        <i className="bi bi-arrow-repeat me-2" />Chargement des remises...
      </div>
    );
  }

  if (discountsQuery.isError) {
    return (
      <div className="alert-security mb-2">
        <i className="bi bi-exclamation-triangle me-2" />
        {(discountsQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="glass-card p-4">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <h6 className="fw-600 mb-0">Remises</h6>
          {canCreate && (
            <Button size="sm" icon="percent" onClick={() => setShowCreate(true)}>
              Nouvelle remise
            </Button>
          )}
        </div>

        {discounts.length === 0 ? (
          <div className="text-muted py-3">
            Aucune remise configurée. Les remises proviennent de l'API.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table pms-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th className="text-center">Valeur</th>
                  <th className="text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.nom}</td>
                    <td>
                      <span className={`badge ${d.type === 'pourcentage' ? 'text-bg-info' : 'text-bg-warning'}`}>
                        {TYPE_LABELS[d.type]}
                      </span>
                    </td>
                    <td className="text-center">
                      {d.type === 'pourcentage'
                        ? `${Number(d.valeur).toLocaleString('fr-FR')} %`
                        : `${Number(d.valeur).toLocaleString('fr-FR')} DH`}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${d.actif ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {d.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {discounts.some((d) => d.type === 'valeur_fixe') && (
          <div className="alert-info-box mt-3 mb-0">
            <i className="bi bi-info-circle me-2" />
            Une remise <strong>valeur fixe</strong> remplace le prix (ex: 800 sur 1100 → 800, pas
            300). Une remise en pourcentage déduit le montant du prix initial.
          </div>
        )}
      </div>

      {/* ─── Prévisualisation (US10 SC6, FR-049) ─── */}
      {canPreview && (
        <div className="glass-card p-4">
          <h6 className="fw-600 mb-1">Prévisualiser une remise</h6>
          <p className="small text-muted mb-3">
            <i className="bi bi-info-circle me-1" />
            Calcul sans effet de bord (POST /api/tarification/discounts/apply) — aucune écriture.
          </p>
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label small mb-1">Remise</label>
              <select
                className="form-select form-select-sm pms-input"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">— Sélectionner —</option>
                {discounts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nom} ({d.type === 'pourcentage' ? `${d.valeur}%` : `${d.valeur} DH`})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small mb-1">Prix initial (DH)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control form-control-sm pms-input"
                value={prixInitial}
                onChange={(e) => setPrixInitial(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <Button
                size="sm"
                icon="calculator"
                loading={previewMutation.isPending}
                onClick={handlePreview}
              >
                Prévisualiser
              </Button>
            </div>
          </div>

          {preview && (
            <div className="mt-3 p-3 rounded-2" style={{ background: 'var(--bg-hover, #f8fafc)' }}>
              <div className="d-flex justify-content-center gap-4 align-items-center flex-wrap">
                <div className="text-center">
                  <div className="small text-muted">Prix initial</div>
                  <div className="fw-600">{Number(preview.prixInitial).toLocaleString('fr-FR')} DH</div>
                </div>
                <div className="text-muted">
                  <i className="bi bi-arrow-right" />
                </div>
                <div className="text-center">
                  <div className="small text-muted">Remise : {preview.discount}</div>
                  <div className="small text-muted">
                    {preview.type === 'pourcentage' ? 'pourcentage' : 'valeur fixe (remplace le prix)'}
                  </div>
                </div>
                <div className="text-muted">
                  <i className="bi bi-arrow-right" />
                </div>
                <div className="text-center">
                  <div className="small text-muted">Prix final</div>
                  <div className="fw-600" style={{ color: 'var(--accent)' }}>
                    {Number(preview.prixFinal).toLocaleString('fr-FR')} DH
                  </div>
                </div>
              </div>
            </div>
          )}

          {previewMutation.isError && (
            <div className="alert-security mt-3 mb-0">
              <i className="bi bi-exclamation-triangle me-2" />
              {previewMutation.error.message}
            </div>
          )}
        </div>
      )}

      {/* ─── Modal création ─── */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouvelle remise"
        icon="percent"
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
              onChange={(e) => setFormType(e.target.value as DiscountType)}
            >
              <option value="pourcentage">Pourcentage</option>
              <option value="valeur_fixe">Valeur fixe (remplace le prix)</option>
            </select>
          </div>
          <div>
            <label className="form-label small mb-1">
              Valeur ({formType === 'pourcentage' ? '%' : 'DH — remplace le prix'})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-sm pms-input"
              value={formValeur}
              onChange={(e) => setFormValeur(e.target.value)}
            />
          </div>
          {formType === 'valeur_fixe' && (
            <p className="small text-muted mb-0">
              Une valeur fixe <strong>remplace</strong> le prix (ex: 800 sur 1100 → 800, pas 300).
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
