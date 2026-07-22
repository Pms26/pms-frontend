// ═══════════════════════════════════════════════════════════
// OASIS PMS — Tarification API
// Backend: service-tarification (port 4004) via gateway
// Routes: /api/seasons, /api/rateplans, /api/extra-categories, /api/taxes
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { TarifCategory, ExtraCategory, FiscaliteItem } from '@/types';

const MOCK_TARIFS: TarifCategory[] = [
  { cat: 'Standard', basse: 900, moyenne: 1100, haute: 1400, pics: 1800 },
  { cat: 'Supérieure', basse: 1200, moyenne: 1500, haute: 1900, pics: 2400 },
  { cat: 'Suite', basse: 1800, moyenne: 2200, haute: 2800, pics: 3500 },
  { cat: 'Suite Deluxe', basse: 2400, moyenne: 3000, haute: 3800, pics: 4800 },
  { cat: 'Lodge', basse: 2800, moyenne: 3400, haute: 4200, pics: 5200 },
  { cat: 'Villa', basse: 4000, moyenne: 5000, haute: 6500, pics: 8000 },
];

const MOCK_EXTRAS: ExtraCategory[] = [
  { cat: 'Restaurant', color: '#f59e0b', icon: 'egg-fried', items: [{ name: 'Tajine poulet', price: '120 DH' }, { name: 'Couscous', price: '95 DH' }] },
  { cat: 'Bar & Boissons', color: '#ec4899', icon: 'cup-straw', items: [{ name: 'Soft / Eau', price: '25 DH' }, { name: 'Cocktail', price: '80 DH' }] },
  { cat: 'SPA & Bien-être', color: '#8b5cf6', icon: 'droplet', items: [{ name: 'Massage 60mn', price: '350 DH' }] },
];

const MOCK_FISCALITE: FiscaliteItem[] = [
  { label: 'Taxe de Séjour', description: 'Par personne et par nuit', amount: '25 – 30 DH/pers/nuit' },
  { label: 'TPT', description: 'Taxe de Promotion Touristique — 2%', amount: '2% du CA HT' },
  { label: 'TVA Hôtelière', description: 'Taux 10%', amount: '10%' },
];

const EXTRA_COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4', '#f43f5e'];
const EXTRA_ICONS = ['egg-fried', 'cup-straw', 'droplet', 'geo-alt', 'car-front', 'bag-heart'];

export async function getTarifs(): Promise<TarifCategory[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_TARIFS;
  }

  const [seasonsRes, rateplansRes] = await Promise.all([
    apiClient.get('/api/tarification/seasons'),
    apiClient.get('/api/tarification/rateplans'),
  ]);

  const seasons = seasonsRes.data || [];
  const rateplans = rateplansRes.data || [];

  const seasonMap: Record<string, any> = {};
  for (const s of seasons) seasonMap[s.id] = s;

  const grid: Record<string, Record<string, number>> = {};
  for (const rp of rateplans) {
    const cat = rp.categorie || 'Standard';
    const seasonName = seasonMap[rp.seasonId]?.nom || 'basse';
    if (!grid[cat]) grid[cat] = {};
    grid[cat][seasonName.toLowerCase()] = parseFloat(rp.prixTTC) || 0;
  }

  if (Object.keys(grid).length === 0) return MOCK_TARIFS;

  return Object.entries(grid).map(([cat, prices]) => ({
    cat,
    basse: prices.basse || prices.basse_saison || 0,
    moyenne: prices.moyenne || 0,
    haute: prices.haute || 0,
    pics: prices.pics || prices.pointe || 0,
  }));
}

export async function getExtras(): Promise<ExtraCategory[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_EXTRAS;
  }

  const res = await apiClient.get('/api/tarification/extra-categories');
  const categories = Array.isArray(res.data) ? res.data : res.data.categories || [];

  return categories.map((cat: any, i: number) => ({
    cat: cat.nom || cat.name || `Catégorie ${i + 1}`,
    color: EXTRA_COLORS[i % EXTRA_COLORS.length],
    icon: EXTRA_ICONS[i % EXTRA_ICONS.length],
    items: (cat.ExtraItems || cat.extraItems || cat.items || []).map((item: any) => ({
      name: item.nom || item.name || '',
      price: `${item.prixDH || item.price || 0} DH`,
    })),
  }));
}

export async function getFiscalite(): Promise<FiscaliteItem[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    return MOCK_FISCALITE;
  }

  const res = await apiClient.get('/api/tarification/taxes');
  const taxes = Array.isArray(res.data) ? res.data : res.data.taxes || [];

  return taxes.map((tax: any) => ({
    label: `Taxe — ${tax.categorieHotel || 'Général'}`,
    description: `TS: ${tax.montantTS || 0} DH/pers/nuit — TPT: ${tax.montantTPT || 0} DH/pers/nuit`,
    amount: `${tax.montantTS || 0} DH + ${tax.montantTPT || 0} DH`,
  }));
}

export async function updateTarif(cat: string, data: Partial<TarifCategory>): Promise<TarifCategory> {
  if (USE_MOCKS) {
    await mockDelay(500);
    const tarif = MOCK_TARIFS.find((t) => t.cat === cat);
    if (!tarif) throw new Error(`Catégorie ${cat} introuvable`);
    return { ...tarif, ...data };
  }

  const prices = { basse: data.basse, moyenne: data.moyenne, haute: data.haute, pics: data.pics };
  await apiClient.put(`/api/tarification/rateplans/category/${encodeURIComponent(cat)}`, prices);
  return { cat, basse: data.basse || 0, moyenne: data.moyenne || 0, haute: data.haute || 0, pics: data.pics || 0 };
}
