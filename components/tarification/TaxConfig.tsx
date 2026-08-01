'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Taxes locales (US7)
// Liste des taxes TS/TPT par catégorie d'hôtel depuis
// GET /api/tarification/taxes (FR-026). Configuration/modification
// admin/manager (FR-027/028). Simulateur sans effet de bord via
// GET /api/tarification/taxes/calculate (FR-029/032), avec
// explication taxeMode (FR-031).
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTaxes, createTax, updateTax, calculateTaxes } from '@/lib/api/tarification';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { HotelCategory, LocalTax } from '@/types';

const HOTEL_CATEGORIES: HotelCategory[] = [
  '1_etoile',
  '2_etoiles',
  '3_etoiles',
  '4_etoiles',
  '5_etoiles',
  'riad',
  'maison_hotes',
];

const HOTEL_CATEGORY_LABELS: Record<HotelCategory, string> = {
  '1_etoile': '1 étoile',
  '2_etoiles': '2 étoiles',
  '3_etoiles': '3 étoiles',
  '4_etoiles': '4 étoiles',
  '5_etoiles': '5 étoiles',
  riad: 'Riad',
  maison_hotes: "Maison d'hôtes",
};

const CAN_WRITE_ROLES = ['admin', 'manager'];

const formatDH = (val: string) => Number(val).toLocaleString('fr-FR') + ' DH';

export default function TaxConfig() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canWrite = !!role && CAN_WRITE_ROLES.includes(role);

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const taxesQuery = useQuery({
    queryKey: ['tarification', 'taxes'],
    queryFn: getTaxes,
  });
  const taxes = taxesQuery.data ?? [];

  // ─── Configuration / modification (FR-027/028) ───────
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LocalTax | null>(null);
  const [configCat, setConfigCat] = useState<HotelCategory>('3_etoiles');
  const [configTS, setConfigTS] = useState('');
  const [configTPT, setConfigTPT] = useState('');

  const saveMutation = useMutation({
    mutationFn: (vars: {
      editing: LocalTax | null;
      categorieHotel: HotelCategory;
      montantTS: number;
      montantTPT: number;
    }) =>
      vars.editing
        ? updateTax(vars.editing.id, { montantTS: vars.montantTS, montantTPT: vars.montantTPT })
        : createTax({ categorieHotel: vars.categorieHotel, montantTS: vars.montantTS, montantTPT: vars.montantTPT }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarification', 'taxes'] });
      setShowModal(false);
      setEditing(null);
      showToast('✅ Configuration des taxes enregistrée');
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setConfigCat('3_etoiles');
    setConfigTS('');
    setConfigTPT('');
    setShowModal(true);
  };

  const openEdit = (tax: LocalTax) => {
    setEditing(tax);
    setConfigCat(tax.categorieHotel);
    setConfigTS(parseFloat(tax.montantTS).toFixed(2));
    setConfigTPT(parseFloat(tax.montantTPT).toFixed(2));
    setShowModal(true);
  };

  const handleSave = () => {
    const ts = Number(configTS);
    const tpt = Number(configTPT);
    if (Number.isNaN(ts) || ts < 0 || Number.isNaN(tpt) || tpt < 0) {
      showToast('⚠️ Les montants TS et TPT doivent être des nombres valides.');
      return;
    }
    saveMutation.mutate({
      editing,
      categorieHotel: configCat,
      montantTS: ts,
      montantTPT: tpt,
    });
  };

  // ─── Simulateur (FR-029..032) ────────────────────────
  const [simCat, setSimCat] = useState<HotelCategory>('3_etoiles');
  const [simPax, setSimPax] = useState('2');
  const [simNights, setSimNights] = useState('5');
  const [simError, setSimError] = useState<string | null>(null);

  const simQuery = useQuery({
    queryKey: ['tarification', 'taxes', 'simulate', simCat, simPax, simNights],
    queryFn: () =>
      calculateTaxes({ categorieHotel: simCat, pax: Number(simPax), nights: Number(simNights) }),
    enabled: false,
    retry: false,
  });

  const runSimulation = () => {
    if (!simCat || simPax === '' || simNights === '') {
      setSimError('Paramètres requis : categorieHotel, pax (nombre de personnes), nights (nombre de nuits).');
      return;
    }
    const pax = Number(simPax);
    const nights = Number(simNights);
    if (Number.isNaN(pax) || pax <= 0 || Number.isNaN(nights) || nights <= 0) {
      setSimError('pax et nights doivent être des entiers positifs.');
      return;
    }
    setSimError(null);
    simQuery.refetch();
  };

  const simResult = simQuery.data;

  if (taxesQuery.isLoading) {
    return (
      <div className="glass-card p-4 text-muted">
        <i className="bi bi-arrow-repeat me-2" />Chargement des taxes...
      </div>
    );
  }

  if (taxesQuery.isError) {
    return (
      <div className="alert-security mb-2">
        <i className="bi bi-exclamation-triangle me-2" />
        {(taxesQuery.error as Error).message}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-3">
      {/* ─── Tableau des taxes ─── */}
      <div className="glass-card p-4">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <h6 className="fw-600 mb-0">Taxes locales — TS &amp; TPT (DH / pers. / nuit)</h6>
          {canWrite && (
            <Button size="sm" icon="plus-lg" onClick={openCreate}>
              Configurer une catégorie
            </Button>
          )}
        </div>

        {taxes.length === 0 ? (
          <div className="text-muted py-3">
            Aucune taxe configurée. Les montants proviennent de l'API taxes.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table pms-table">
              <thead>
                <tr>
                  <th>Catégorie d'hôtel</th>
                  <th className="text-center">Taxe de Séjour (TS)</th>
                  <th className="text-center">Taxe Promotion Touristique (TPT)</th>
                  {canWrite && <th className="text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {taxes.map((tax) => (
                  <tr key={tax.id}>
                    <td style={{ fontWeight: 600 }}>
                      {HOTEL_CATEGORY_LABELS[tax.categorieHotel] ?? tax.categorieHotel}
                    </td>
                    <td className="text-center">{formatDH(tax.montantTS)}</td>
                    <td className="text-center">{formatDH(tax.montantTPT)}</td>
                    {canWrite && (
                      <td className="text-center">
                        <Button size="sm" variant="ghost" icon="pencil" onClick={() => openEdit(tax)}>
                          Modifier
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Simulateur ─── */}
      <div className="glass-card p-4">
        <h6 className="fw-600 mb-1">Simulateur de taxes locales</h6>
        <p className="small text-muted mb-3">
          <i className="bi bi-info-circle me-1" />
          Calcul sans effet de bord (GET /api/tarification/taxes/calculate) — aucune écriture.
        </p>
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label small mb-1">Catégorie d'hôtel</label>
            <select
              className="form-select form-select-sm pms-input"
              value={simCat}
              onChange={(e) => setSimCat(e.target.value as HotelCategory)}
            >
              {HOTEL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {HOTEL_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small mb-1">Pax</label>
            <input
              type="number"
              min="1"
              className="form-control form-control-sm pms-input"
              value={simPax}
              onChange={(e) => setSimPax(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small mb-1">Nuits</label>
            <input
              type="number"
              min="1"
              className="form-control form-control-sm pms-input"
              value={simNights}
              onChange={(e) => setSimNights(e.target.value)}
            />
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <Button size="sm" icon="calculator" loading={simQuery.isFetching} onClick={runSimulation}>
              Calculer
            </Button>
          </div>
        </div>

        {simError && (
          <div className="alert-security mt-3 mb-0">
            <i className="bi bi-exclamation-triangle me-2" />
            {simError}
          </div>
        )}

        {simQuery.isError && (
          <div className="alert-security mt-3 mb-0">
            <i className="bi bi-exclamation-triangle me-2" />
            {(simQuery.error as Error).message}
          </div>
        )}

        {simResult && !simQuery.isError && (
          <div className="mt-3 p-3 rounded-2" style={{ background: 'var(--bg-hover, #f8fafc)' }}>
            <div className="row text-center g-3">
              <div className="col-6 col-md-3">
                <div className="small text-muted">Total TS</div>
                <div className="fw-600">{Number(simResult.totalTS).toLocaleString('fr-FR')} DH</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="small text-muted">Total TPT</div>
                <div className="fw-600">{Number(simResult.totalTPT).toLocaleString('fr-FR')} DH</div>
              </div>
              <div className="col-12 col-md-6">
                <div className="small text-muted">Total taxes ({simResult.pax} pers. × {simResult.nights} nuits)</div>
                <div className="fw-600" style={{ color: 'var(--accent)' }}>
                  {Number(simResult.totalTaxes).toLocaleString('fr-FR')} DH
                </div>
              </div>
            </div>
            <div className="alert-info-box mt-3 mb-0">
              <i className="bi bi-info-circle me-2" />
              Détail : TS {formatDH(simResult.detail.montantTSParPaxParNuit)}/pers/nuit · TPT{' '}
              {formatDH(simResult.detail.montantTPTParPaxParNuit)}/pers/nuit.
              Mode <strong>payable à la réservation</strong> : taxes incluses dans le total. Mode{' '}
              <strong>sur place</strong> : les taxes sont exclues du total et ajoutées aux extras
              au check-out.
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal configuration / édition ─── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Modifier les taxes' : 'Configurer une catégorie'}
        icon="receipt"
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
            <label className="form-label small mb-1">Catégorie d'hôtel</label>
            <select
              className="form-select form-select-sm pms-input"
              value={configCat}
              disabled={!!editing}
              onChange={(e) => setConfigCat(e.target.value as HotelCategory)}
            >
              {HOTEL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {HOTEL_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label small mb-1">Taxe de Séjour (DH / pers. / nuit)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-sm pms-input"
              value={configTS}
              onChange={(e) => setConfigTS(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label small mb-1">TPT (DH / pers. / nuit)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control form-control-sm pms-input"
              value={configTPT}
              onChange={(e) => setConfigTPT(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
