'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Extras & POS (US9)
// Catégories + items depuis GET /api/tarification/extra-categories
// (FR-039). Création catégorie/item, modification prix/TVA/statut
// admin/manager (FR-040..043). Validation client avant envoi :
// prixDH nombre valide, tauxTVA strictement 10 ou 20 (FR-042, SC-006).
// Badge actif/inactif (FR-045).
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getExtraCategories,
  createExtraCategory,
  createExtraItem,
  updateExtraItem,
  EXTRA_COLORS,
  EXTRA_ICONS,
} from '@/lib/api/tarification';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { ExtraCategoryName, ExtraItem } from '@/types';

const EXTRA_CATEGORY_NAMES: ExtraCategoryName[] = [
  'restaurant',
  'bar_boissons',
  'spa',
  'activites',
  'transferts',
  'services',
];

const EXTRA_CATEGORY_LABELS: Record<ExtraCategoryName, string> = {
  restaurant: 'Restaurant',
  bar_boissons: 'Bar & Boissons',
  spa: 'SPA & Bien-être',
  activites: 'Activités',
  transferts: 'Transferts',
  services: 'Services',
};

const CAN_WRITE_ROLES = ['admin', 'manager'];

const formatDH = (val: string) => Number(val).toLocaleString('fr-FR') + ' DH';

export default function ExtrasTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canWrite = !!role && CAN_WRITE_ROLES.includes(role);

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const extrasQuery = useQuery({
    queryKey: ['tarification', 'extra-categories'],
    queryFn: getExtraCategories,
  });
  const categories = extrasQuery.data ?? [];

  // ─── Création catégorie (FR-040) ─────────────────────
  const [showCreateCat, setShowCreateCat] = useState(false);
  const [newCatNom, setNewCatNom] = useState<ExtraCategoryName>('restaurant');

  const createCatMutation = useMutation({
    mutationFn: (nom: ExtraCategoryName) => createExtraCategory({ nom }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'extra-categories'] });
      setShowCreateCat(false);
      showToast('✅ Catégorie créée');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  // ─── Création item (FR-040..043) ─────────────────────
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [itemCategoryId, setItemCategoryId] = useState<number | ''>('');
  const [itemNom, setItemNom] = useState('');
  const [itemPrix, setItemPrix] = useState('');
  const [itemTVA, setItemTVA] = useState<'10' | '20'>('10');

  const createItemMutation = useMutation({
    mutationFn: (vars: { nom: string; prixDH: number; categoryId: number; tauxTVA: '10' | '20' }) =>
      createExtraItem(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'extra-categories'] });
      setShowCreateItem(false);
      setItemNom('');
      setItemPrix('');
      showToast('✅ Item ajouté');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const handleCreateItem = () => {
    if (!itemCategoryId) {
      showToast('⚠️ La catégorie est obligatoire.');
      return;
    }
    if (!itemNom.trim()) {
      showToast('⚠️ Le nom est obligatoire.');
      return;
    }
    const prix = Number(itemPrix);
    if (Number.isNaN(prix) || prix < 0) {
      showToast('⚠️ prixDH requis et doit être un nombre valide.');
      return;
    }
    if (itemTVA !== '10' && itemTVA !== '20') {
      showToast('⚠️ tauxTVA requis et doit être 10 ou 20.');
      return;
    }
    createItemMutation.mutate({
      nom: itemNom.trim(),
      prixDH: prix,
      categoryId: itemCategoryId,
      tauxTVA: itemTVA,
    });
  };

  // ─── Modification item (FR-043/045) ──────────────────
  const [editing, setEditing] = useState<ExtraItem | null>(null);
  const [editPrix, setEditPrix] = useState('');
  const [editTVA, setEditTVA] = useState<'10' | '20'>('10');

  const updateItemMutation = useMutation({
    mutationFn: (vars: { id: number; prixDH: number; tauxTVA: '10' | '20' }) =>
      updateExtraItem(vars.id, { prixDH: vars.prixDH, tauxTVA: vars.tauxTVA }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'extra-categories'] });
      setEditing(null);
      showToast('✅ Item mis à jour');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const handleSaveItem = () => {
    if (!editing) return;
    const prix = Number(editPrix);
    if (Number.isNaN(prix) || prix < 0) {
      showToast('⚠️ prixDH doit être un nombre valide.');
      return;
    }
    if (editTVA !== '10' && editTVA !== '20') {
      showToast('⚠️ tauxTVA doit être 10 ou 20.');
      return;
    }
    updateItemMutation.mutate({ id: editing.id, prixDH: prix, tauxTVA: editTVA });
  };

  const toggleItemMutation = useMutation({
    mutationFn: (vars: { id: number; actif: boolean }) =>
      updateExtraItem(vars.id, { actif: vars.actif }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'extra-categories'] });
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  if (extrasQuery.isLoading) {
    return (
      <div className="glass-card p-4 text-muted">
        <i className="bi bi-arrow-repeat me-2" />Chargement des extras...
      </div>
    );
  }

  if (extrasQuery.isError) {
    return (
      <div className="alert-security mb-2">
        <i className="bi bi-exclamation-triangle me-2" />
        {(extrasQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex gap-2 flex-wrap">
        {canWrite && (
          <>
            <Button size="sm" icon="folder-plus" onClick={() => setShowCreateCat(true)}>
              Nouvelle catégorie
            </Button>
            <Button size="sm" icon="bag-plus" onClick={() => setShowCreateItem(true)}>
              Nouvel item
            </Button>
          </>
        )}
      </div>

      {categories.length === 0 ? (
        <div className="glass-card p-4 text-muted">
          Aucune catégorie d'extras configurée.
        </div>
      ) : (
        <div className="row g-3">
          {categories.map((cat, i) => (
            <div key={cat.id} className="col-md-6 col-lg-4">
              <div className="extras-cat-card">
                <div className="extras-cat-header">
                  <div
                    className="extras-cat-icon"
                    style={{ background: EXTRA_COLORS[i % EXTRA_COLORS.length] }}
                  >
                    <i className={`bi bi-${EXTRA_ICONS[i % EXTRA_ICONS.length]}`} />
                  </div>
                  <div className="extras-cat-title">
                    {EXTRA_CATEGORY_LABELS[cat.nom] ?? cat.nom}
                  </div>
                </div>
                <div>
                  {cat.items.length === 0 ? (
                    <div className="extras-item text-muted">Aucun item</div>
                  ) : (
                    cat.items.map((item) => (
                      <div key={item.id} className="extras-item">
                        <div className="d-flex align-items-center gap-2">
                          <span>{item.nom}</span>
                          <span className="badge text-bg-light" style={{ fontSize: 10 }}>
                            TVA {item.tauxTVA}%
                          </span>
                          <span className={`badge ${item.actif ? 'text-bg-success' : 'text-bg-secondary'}`} style={{ fontSize: 10 }}>
                            {item.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <span className="extras-price">{formatDH(item.prixDH)}</span>
                        {canWrite && (
                          <div className="d-flex gap-1 mt-1">
                            <button
                              type="button"
                              className="btn btn-pms btn-sm"
                              onClick={() => {
                                setEditing(item);
                                setEditPrix(parseFloat(item.prixDH).toFixed(2));
                                setEditTVA(item.tauxTVA);
                              }}
                            >
                              <i className="bi bi-pencil" />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => toggleItemMutation.mutate({ id: item.id, actif: !item.actif })}
                              title={item.actif ? 'Désactiver' : 'Activer'}
                            >
                              <i className={`bi ${item.actif ? 'bi-toggle-off' : 'bi-toggle-on'}`} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal création catégorie ─── */}
      <Modal
        open={showCreateCat}
        onClose={() => setShowCreateCat(false)}
        title="Nouvelle catégorie d'extras"
        icon="folder-plus"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateCat(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              icon="check-lg"
              loading={createCatMutation.isPending}
              onClick={() => createCatMutation.mutate(newCatNom)}
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
              value={newCatNom}
              onChange={(e) => setNewCatNom(e.target.value as ExtraCategoryName)}
            >
              {EXTRA_CATEGORY_NAMES.map((n) => (
                <option key={n} value={n}>
                  {EXTRA_CATEGORY_LABELS[n]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ─── Modal création item ─── */}
      <Modal
        open={showCreateItem}
        onClose={() => setShowCreateItem(false)}
        title="Nouvel item"
        icon="bag-plus"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateItem(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              icon="check-lg"
              loading={createItemMutation.isPending}
              onClick={handleCreateItem}
            >
              Créer
            </Button>
          </>
        }
      >
        <div className="d-flex flex-column gap-3">
          <div>
            <label className="form-label small mb-1">Catégorie</label>
            <select
              className="form-select form-select-sm pms-input"
              value={itemCategoryId}
              onChange={(e) => setItemCategoryId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">— Sélectionner —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {EXTRA_CATEGORY_LABELS[c.nom] ?? c.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label small mb-1">Nom</label>
            <input
              type="text"
              className="form-control form-control-sm pms-input"
              value={itemNom}
              onChange={(e) => setItemNom(e.target.value)}
            />
          </div>
          <div className="row g-3">
            <div className="col-6">
              <label className="form-label small mb-1">Prix (DH)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control form-control-sm pms-input"
                value={itemPrix}
                onChange={(e) => setItemPrix(e.target.value)}
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-1">TVA (%)</label>
              <select
                className="form-select form-select-sm pms-input"
                value={itemTVA}
                onChange={(e) => setItemTVA(e.target.value as '10' | '20')}
              >
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── Modal modification item ─── */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Modifier — ${editing?.nom ?? ''}`}
        icon="pencil"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button
              size="sm"
              icon="check-lg"
              loading={updateItemMutation.isPending}
              onClick={handleSaveItem}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="row g-3">
          <div className="col-6">
            <label className="form-label small mb-1">Prix (DH)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-sm pms-input"
              value={editPrix}
              onChange={(e) => setEditPrix(e.target.value)}
            />
          </div>
          <div className="col-6">
            <label className="form-label small mb-1">TVA (%)</label>
            <select
              className="form-select form-select-sm pms-input"
              value={editTVA}
              onChange={(e) => setEditTVA(e.target.value as '10' | '20')}
            >
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
