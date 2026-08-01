// ═══════════════════════════════════════════════════════════
// OASIS PMS — Tarification API
// Backend: service-tarification (port 4004) via gateway
// Routes: /api/seasons, /api/rateplans, /api/regimes, /api/taxes,
//         /api/partners, /api/partner-rates, /api/extra-categories,
//         /api/extra-items, /api/discounts, /api/packages
// Pattern: Analytics / Front Office (aucun fallback mock) — les
// erreurs backend sont normalisées ici : 502 → « Service
// temporairement indisponible », sinon message exact du body
// { message } / { error }. Dérogation Q6 (FR-044) : « Catégorie
// introuvable » reçu avec caractère corrompu est normalisé.
// Mapping backend→frontend (constitution §III) : les champs
// imbriqués du backend (« Season », « ExtraItems », « Partner »,
// « PackageBreakdowns ») sont normalisés ici, jamais dans les
// composants.
// ═══════════════════════════════════════════════════════════

import axios from 'axios';
import apiClient from './client';
import type {
  Season,
  SeasonName,
  RatePlan,
  RoomCategory,
  RegimeSupplement,
  LocalTax,
  HotelCategory,
  Partner,
  PartnerType,
  PartnerRate,
  ExtraCategory,
  ExtraItem,
  Discount,
  DiscountType,
  DiscountApplyResult,
  PackageOffer,
} from '@/types';

// ─── Helpers privés ────────────────────────────────────────

// Dérogation Q6 (FR-044) — exception explicite et UNIQUE au principe verbatim :
// le backend renvoie « Catégorie introuvable » avec un caractère corrompu
// (service-tarification.md §5.7). Match TOLÉRANT volontaire : on teste le
// squelette « atégorie introuvable » pour ne dépendre ni du caractère cassé
// exact, ni de son encodage. Tout autre message backend reste affiché verbatim.
function normalizeBackendMessage(msg: string): string {
  if (msg.includes('atégorie introuvable')) return 'Catégorie introuvable';
  return msg;
}

function toApiError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 502) return new Error('Service temporairement indisponible');
    const body = err.response?.data as { message?: string; error?: string } | undefined;
    const msg = body?.message ?? body?.error;
    if (msg) return new Error(normalizeBackendMessage(msg));
  }
  return new Error('Service temporairement indisponible');
}

// Verbe d'écriture des stories 4/5 (research R3 — Branche B).
// Défaut `'PUT'` (contrat backend). Si le gateway bloque PUT en CORS
// (dépendance externe B1 à planifier), basculer sur `'PATCH'` avec body
// équivalent — prérequis : le backend doit exposer PATCH sur les deux
// chemins (ou le gateway réécrire PATCH→PUT).
export const TARIFICATION_WRITE_VERB: 'PUT' | 'PATCH' = 'PUT';

const AXIOS_VERB: Record<'PUT' | 'PATCH', 'put' | 'patch'> = {
  PUT: 'put',
  PATCH: 'patch',
};

// Mapping de présentation uniquement (assumption spec) — ne contient ni
// nom ni prix métier. Les index correspondent aux catégories d'extras.
export const EXTRA_COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4', '#f43f5e'];
export const EXTRA_ICONS = ['egg-fried', 'cup-straw', 'droplet', 'geo-alt', 'car-front', 'bag-heart'];

// ─── Saisons (US4) ─────────────────────────────────────────

export async function getSeasons(): Promise<Season[]> {
  try {
    const res = await apiClient.get('/api/tarification/seasons');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createSeason(data: {
  nom: SeasonName;
  dateDebut: string;
  dateFin: string;
}): Promise<Season> {
  try {
    const res = await apiClient.post('/api/tarification/seasons', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateSeasonDates(
  category: SeasonName,
  data: { dateDebut?: string; dateFin?: string },
): Promise<Season> {
  try {
    const res = await apiClient[AXIOS_VERB[TARIFICATION_WRITE_VERB]](
      `/api/tarification/seasons/${encodeURIComponent(category)}`,
      data,
    );
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Grille tarifaire (US1/US5) ────────────────────────────

// Contrat sans effet de bord (FR-001) : lecture seule des tarifs publics.
// Source autorisée de la grille — appelable par tout rôle authentifié.
export async function getRatePlans(): Promise<RatePlan[]> {
  try {
    const res = await apiClient.get('/api/tarification/rateplans');
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map((rp: any) => ({
      id: rp.id,
      categorie: rp.categorie,
      prixTTC: rp.prixTTC,
      seasonId: rp.seasonId,
      season: rp.Season ? { id: rp.Season.id, nom: rp.Season.nom, dateDebut: rp.Season.dateDebut, dateFin: rp.Season.dateFin } : undefined,
    }));
  } catch (err) {
    throw toApiError(err);
  }
}

// Fonction API de complétude du contrat backend (§5.2), intentionnellement
// NON consommée par l'UI : PUT /api/rateplans/category/:categorie est un
// upsert par saison (création + mise à jour) qui couvre tous les cas (FR-019).
export async function createRatePlan(data: {
  categorie: RoomCategory;
  prixTTC: number;
  seasonId: number;
}): Promise<RatePlan> {
  try {
    const res = await apiClient.post('/api/tarification/rateplans', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// Fonction API de complétude du contrat backend (§5.2) — non consommée par
// l'UI (upsert batch FR-019 couvre la modification, cf. createRatePlan).
export async function updateRatePlan(id: number, data: { prixTTC: number }): Promise<RatePlan> {
  try {
    const res = await apiClient.patch(`/api/tarification/rateplans/${id}`, data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// Upsert batch par catégorie (US5, FR-019/020). Body : clés = noms exacts de
// saisons (case-sensitive, SC-008), seules les saisons existantes avec prix
// non-nul sont envoyées. Verbe via TARIFICATION_WRITE_VERB (research R3).
export async function updateCategoryRates(
  categorie: RoomCategory,
  prices: Partial<Record<SeasonName, number>>,
): Promise<{ message: string; updated: { season: string; affected: number }[] }> {
  try {
    const res = await apiClient[AXIOS_VERB[TARIFICATION_WRITE_VERB]](
      `/api/tarification/rateplans/category/${encodeURIComponent(categorie)}`,
      prices,
    );
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Régimes (US1/US6) ─────────────────────────────────────

// Contrat sans effet de bord (FR-001) : lecture seule des suppléments de
// régime — appelable par tout rôle authentifié.
export async function getRegimes(): Promise<RegimeSupplement[]> {
  try {
    const res = await apiClient.get('/api/tarification/regimes');
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map((r: any) => ({
      id: r.id,
      regime: r.regime,
      supplementDH: r.supplementDH,
      seasonId: r.seasonId,
      season: r.Season ? { id: r.Season.id, nom: r.Season.nom, dateDebut: r.Season.dateDebut, dateFin: r.Season.dateFin } : undefined,
    }));
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createRegime(data: {
  regime: 'BB' | 'DP' | 'PC';
  supplementDH: number;
  seasonId: number;
}): Promise<RegimeSupplement> {
  try {
    const res = await apiClient.post('/api/tarification/regimes', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateRegime(id: number, data: { supplementDH: number }): Promise<RegimeSupplement> {
  try {
    const res = await apiClient.patch(`/api/tarification/regimes/${id}`, data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Taxes locales (US7) ───────────────────────────────────

export async function getTaxes(): Promise<LocalTax[]> {
  try {
    const res = await apiClient.get('/api/tarification/taxes');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createTax(data: {
  categorieHotel: HotelCategory;
  montantTS: number;
  montantTPT: number;
}): Promise<LocalTax> {
  try {
    const res = await apiClient.post('/api/tarification/taxes', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateTax(id: number, data: { montantTS?: number; montantTPT?: number }): Promise<LocalTax> {
  try {
    const res = await apiClient.patch(`/api/tarification/taxes/${id}`, data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// Contrat sans effet de bord (FR-029/032) : simulateur de taxes locales,
// aucun calcul côté client ni écriture — appelable par tout rôle authentifié.
// Erreurs verbatim : 400 paramètres requis / 404 « Aucune taxe configurée… ».
export async function calculateTaxes(params: {
  categorieHotel: HotelCategory;
  pax: number;
  nights: number;
}): Promise<{
  categorieHotel: HotelCategory;
  pax: number;
  nights: number;
  detail: { montantTSParPaxParNuit: string; montantTPTParPaxParNuit: string };
  totalTS: string;
  totalTPT: string;
  totalTaxes: string;
}> {
  try {
    const res = await apiClient.get('/api/tarification/taxes/calculate', { params });
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Partenaires (US8) ─────────────────────────────────────

export async function getPartners(): Promise<Partner[]> {
  try {
    const res = await apiClient.get('/api/tarification/partners');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createPartner(data: {
  nom: string;
  type: PartnerType;
  email?: string;
  telephone?: string;
}): Promise<Partner> {
  try {
    const res = await apiClient.post('/api/tarification/partners', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updatePartner(
  id: number,
  data: { nom?: string; type?: PartnerType; email?: string; telephone?: string; actif?: boolean },
): Promise<Partner> {
  try {
    const res = await apiClient.patch(`/api/tarification/partners/${id}`, data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getPartnerRates(partnerId: number): Promise<PartnerRate[]> {
  try {
    const res = await apiClient.get(`/api/tarification/partners/${partnerId}/rates`);
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map((pr: any) => ({
      id: pr.id,
      categorie: pr.categorie,
      prixNetDH: pr.prixNetDH,
      partnerId: pr.partnerId,
      seasonId: pr.seasonId,
      partner: pr.Partner ? { id: pr.Partner.id, nom: pr.Partner.nom, type: pr.Partner.type, email: pr.Partner.email, telephone: pr.Partner.telephone, actif: pr.Partner.actif } : undefined,
      season: pr.Season ? { id: pr.Season.id, nom: pr.Season.nom, dateDebut: pr.Season.dateDebut, dateFin: pr.Season.dateFin } : undefined,
    }));
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createPartnerRate(data: {
  categorie: RoomCategory;
  prixNetDH: number;
  partnerId: number;
  seasonId: number;
}): Promise<PartnerRate> {
  try {
    const res = await apiClient.post('/api/tarification/partner-rates', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Extras & POS (US9) ────────────────────────────────────

// Contrat sans effet de bord (FR-001) : lecture seule des catégories
// d'extras et de leurs items — appelable par tout rôle authentifié.
export async function getExtraCategories(): Promise<ExtraCategory[]> {
  try {
    const res = await apiClient.get('/api/tarification/extra-categories');
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map((cat: any) => ({
      id: cat.id,
      nom: cat.nom,
      items: (cat.ExtraItems || []).map((i: any) => ({
        id: i.id,
        nom: i.nom,
        prixDH: i.prixDH,
        tauxTVA: i.tauxTVA,
        actif: i.actif,
        categoryId: i.categoryId,
      } as ExtraItem)),
    }));
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createExtraCategory(data: { nom: ExtraCategory['nom'] }): Promise<ExtraCategory> {
  try {
    const res = await apiClient.post('/api/tarification/extra-categories', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createExtraItem(data: {
  nom: string;
  prixDH: number;
  categoryId: number;
  tauxTVA: '10' | '20';
}): Promise<ExtraItem> {
  try {
    const res = await apiClient.post('/api/tarification/extra-items', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateExtraItem(
  id: number,
  data: { prixDH?: number; actif?: boolean; tauxTVA?: '10' | '20' },
): Promise<ExtraItem> {
  try {
    const res = await apiClient.patch(`/api/tarification/extra-items/${id}`, data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Remises (US10) ────────────────────────────────────────

export async function getDiscounts(): Promise<Discount[]> {
  try {
    const res = await apiClient.get('/api/tarification/discounts');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createDiscount(data: { nom: string; type: DiscountType; valeur: number }): Promise<Discount> {
  try {
    const res = await apiClient.post('/api/tarification/discounts', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// Contrat sans effet de bord (FR-049/063, R4) : prévisualisation d'une
// remise, aucun calcul ni écriture côté client. Aucune garde de profil ici —
// appelable par tout utilisateur authentifié (y compris receptionist depuis
// le module Réservations, Q7). La restriction Q2 vit uniquement dans l'UI de
// l'onglet Remises, jamais dans cette couche (vérifiable par grep).
// Logique §5.8 : pourcentage → prixInitial − (prixInitial × valeur / 100) ;
// valeur_fixe → prixFinal = valeur (remplace, pas déduit).
export async function applyDiscount(data: { discountId: number; prixInitial: number }): Promise<DiscountApplyResult> {
  try {
    const res = await apiClient.post('/api/tarification/discounts/apply', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Packages (US11) ───────────────────────────────────────

export async function getPackages(): Promise<PackageOffer[]> {
  try {
    const res = await apiClient.get('/api/tarification/packages');
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map((p: any) => ({
      id: p.id,
      nom: p.nom,
      prixGlobalDH: p.prixGlobalDH,
      actif: p.actif,
      breakdowns: (p.PackageBreakdowns || []).map((b: any) => ({
        id: b.id,
        poste: b.poste,
        montantDH: b.montantDH,
        packageId: b.packageId,
      })),
    }));
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createPackage(data: {
  nom: string;
  prixGlobalDH: number;
  breakdown: { poste: 'hebergement' | 'restaurant' | 'spa' | 'activites' | 'autre'; montantDH: number }[];
}): Promise<PackageOffer> {
  try {
    const res = await apiClient.post('/api/tarification/packages', data);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Frontière : calcul final (US3) ────────────────────────
//
// ⚠️ Aucune fonction de calcul final n'est implémentée dans ce module :
// l'endpoint de calcul complet de la tarification (service-tarification.md
// §5.10, §7.1) **écrit des FolioItems** en base — ce n'est pas un simple
// calcul. Il ne doit JAMAIS être appelé pour un affichage ou un aperçu.
//
// Contrat d'invocation (réservé au module Réservations, Q7) :
// - Exécuté exactement une fois par confirmation de booking.
// - Paramètres : categorie|packageId, seasonId, regime, nights, partnerId?,
//   discountId?, categorieHotel?/pax?, taxeMode?, extras (query string JSON
//   encodé : `JSON.stringify([{ extraItemId, quantite }])`, FR-007).
// - Sémantique `taxeMode` (FR-008) : `sur_place` → taxes locales EXCLUES du
//   `totalGeneral` + note « Les taxes locales sont exclues de ce total et
//   seront ajoutées aux extras au check-out » ; défaut
//   `payable_a_la_reservation` → taxes incluses.
// - L'assemblage de l'aperçu (étiquetage « Estimation ») relève également du
//   module Réservations. L'onglet Grille/Remises ne montre jamais de total
//   calculé via cet endpoint.
