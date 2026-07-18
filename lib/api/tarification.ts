// ═══════════════════════════════════════════════════════════
// OASIS PMS — Tarification API
// Endpoints: /api/tarification/tarifs, /extras, /fiscalite
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { TarifCategory, ExtraCategory, FiscaliteItem } from '@/types';

// ─── Mock Data ───────────────────────────────────────────

const MOCK_TARIFS: TarifCategory[] = [
  { cat: 'Standard',     basse: 900,  moyenne: 1100, haute: 1400, pics: 1800 },
  { cat: 'Supérieure',   basse: 1200, moyenne: 1500, haute: 1900, pics: 2400 },
  { cat: 'Suite',        basse: 1800, moyenne: 2200, haute: 2800, pics: 3500 },
  { cat: 'Suite Deluxe', basse: 2400, moyenne: 3000, haute: 3800, pics: 4800 },
  { cat: 'Lodge',        basse: 2800, moyenne: 3400, haute: 4200, pics: 5200 },
  { cat: 'Villa',        basse: 4000, moyenne: 5000, haute: 6500, pics: 8000 },
];

const MOCK_EXTRAS: ExtraCategory[] = [
  {
    cat: 'Restaurant', color: '#f59e0b', icon: 'egg-fried',
    items: [
      { name: 'Tajine poulet', price: '120 DH' },
      { name: 'Couscous', price: '95 DH' },
      { name: 'Pastilla', price: '110 DH' },
      { name: 'Mechoui (400g)', price: '180 DH' },
    ],
  },
  {
    cat: 'Bar & Boissons', color: '#ec4899', icon: 'cup-straw',
    items: [
      { name: 'Soft / Eau', price: '25 DH' },
      { name: 'Jus frais', price: '40 DH' },
      { name: 'Café / Thé', price: '25 DH' },
      { name: 'Cocktail', price: '80 DH' },
    ],
  },
  {
    cat: 'SPA & Bien-être', color: '#8b5cf6', icon: 'droplet',
    items: [
      { name: 'Massage relaxant 60mn', price: '350 DH' },
      { name: 'Soin du visage', price: '280 DH' },
      { name: 'Hammam + gommage', price: '200 DH' },
      { name: 'Accès piscine', price: '100 DH' },
    ],
  },
  {
    cat: 'Activités', color: '#10b981', icon: 'geo-alt',
    items: [
      { name: 'Excursion Quad', price: '450 DH' },
      { name: 'Nuit sous tente désert', price: '800 DH' },
      { name: 'Montgolfière', price: '1 200 DH' },
      { name: 'Golf (18 trous)', price: '600 DH' },
    ],
  },
  {
    cat: 'Transferts', color: '#06b6d4', icon: 'car-front',
    items: [
      { name: 'Transfert aéroport (aller)', price: '250 DH' },
      { name: 'Transfert aller-retour', price: '450 DH' },
      { name: 'Location véhicule/jour', price: '600 DH' },
    ],
  },
  {
    cat: 'Services', color: '#f43f5e', icon: 'bag-heart',
    items: [
      { name: 'Blanchisserie (5 pièces)', price: '120 DH' },
      { name: 'Room service (+30%)', price: '+30%' },
      { name: 'Baby sitting/h', price: '80 DH' },
    ],
  },
];

const MOCK_FISCALITE: FiscaliteItem[] = [
  { label: 'Taxe de Séjour (TS)', description: 'Par personne et par nuit. Varie selon la catégorie de l\'établissement.', amount: '25 – 30 DH/pers/nuit' },
  { label: 'Taxe de Promotion Touristique (TPT)', description: 'Calculée sur le CA hébergement brut HT. Taux de 2%.', amount: '2% du CA hébergement HT' },
  { label: 'TVA Hôtelière', description: 'Taux de 10% sur l\'hébergement et la restauration.', amount: '10%' },
  { label: 'TVA Boissons alcoolisées', description: 'Taux de 20% sur les boissons alcoolisées.', amount: '20%' },
];

// ─── API Functions ───────────────────────────────────────

export async function getTarifs(): Promise<TarifCategory[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_TARIFS;
  }

  const res = await apiClient.get<TarifCategory[]>('/api/tarification/tarifs');
  return res.data;
}

export async function getExtras(): Promise<ExtraCategory[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_EXTRAS;
  }

  const res = await apiClient.get<ExtraCategory[]>('/api/tarification/extras');
  return res.data;
}

export async function getFiscalite(): Promise<FiscaliteItem[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_FISCALITE;
  }

  const res = await apiClient.get<FiscaliteItem[]>('/api/tarification/fiscalite');
  return res.data;
}

export async function updateTarif(cat: string, data: Partial<TarifCategory>): Promise<TarifCategory> {
  if (USE_MOCKS) {
    await mockDelay(500);
    const tarif = MOCK_TARIFS.find((t) => t.cat === cat);
    if (!tarif) throw new Error(`Catégorie ${cat} introuvable`);
    return { ...tarif, ...data };
  }

  const res = await apiClient.put<TarifCategory>(`/api/tarification/tarifs/${encodeURIComponent(cat)}`, data);
  return res.data;
}
