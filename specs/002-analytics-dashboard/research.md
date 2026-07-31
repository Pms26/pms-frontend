# Research — Analytics Dashboard

**Date**: 2026-07-28 | **Branch**: `002-analytics-dashboard`

## 1. Résolution des points nécessitant clarification

### 1.1 Mapping des segments API → groupes frontend

**Constat**: L'API retourne des segments avec des codes comme `direct_walk_in`, `ota_booking`, `b2b_agency`. La spec demande 3 groupes visuels : DIRECT, OTA, PARTENAIRES. Le service analytics définit dans `/api/segments` la structure `groups` qui mappe chaque code à son groupe.

**Décision**: Utiliser l'endpoint `GET /api/segments` pour récupérer la liste des groupes et le mapping code→groupe. Côté frontend, les couleurs sont assignées par groupe :
- `DIRECT` → token `accent` (`#6366f1`)
- `OTA` → token `emerald` (`#10b981`)
- `PARTENAIRES` → token `amber` (`#f59e0b`)
- `Autres` (groupe inconnu) → token `slate-400` (`#94a3b8`)

**Fallback mock**: Les mocks intègrent déjà les 3 segments représentatifs. Si l'API segments n'est pas disponible, utiliser les groupes en dur depuis les mocks.

### 1.2 Refonte d'EvolutionChart et SegmentChart

**Constat**: Les deux composants utilisent actuellement `getTarifs()` depuis `lib/api/tarification` en interne via `useEffect`. Pour le dashboard, ils doivent consommer les données analytics.

**Décision**: Refactoring minimal — ajouter des props `data` et `options` optionnelles :

```typescript
// EvolutionChart accepte désormais les données en props
interface EvolutionChartProps {
  labels: string[];
  occupancyData: number[];
  adrData: number[];
  year: number;
}

// SegmentChart accepte les données de distribution
interface SegmentChartProps {
  pieData: { label: string; value: number; color: string }[];
  barData: { label: string; revenue: number; color: string }[];
}
```

Si aucune prop n'est fournie, le composant conserve son comportement actuel (fallback tarification) pour backward compatibility. Les changements sont limités à l'ajout de `useEffect` dépendant des props plutôt que de `getTarifs()` interne.

### 1.3 Types TypeScript pour la comparaison mensuelle

**Constat**: Les types existants (`KPI`, `SegmentAnalytics`, `YTDCard`) ne couvrent pas la comparaison mensuelle N vs N-1 (qui a `current`, `previous`, `deltas`).

**Décision**: Ajouter les interfaces suivantes dans `types/index.ts` :

```typescript
export interface MonthlyComparison {
  period: {
    current: { year: number; month: number };
    previous: { year: number; month: number };
  };
  segment: string;
  current: ComparisonMetrics;
  previous: ComparisonMetrics;
  deltas: ComparisonDeltas;
}

export interface ComparisonMetrics {
  totalRooms: number;
  totalNights: number;
  totalRevenue: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
}

export interface ComparisonDeltas {
  occupancyRate: number | null;
  adr: number | null;
  revpar: number | null;
  revenue: number | null;
}
```

### 1.4 Structure des données de tendance annuelle

**Constat**: Le type `MOCK_MONTHLY` dans `analytics.ts` est un objet plat. Le besoin est d'avoir un tableau de 12 mois avec TO et ADR.

**Décision**: Créer une interface `TrendData` typée :

```typescript
export interface TrendMonth {
  month: number;
  totalRooms: number;
  totalNights: number;
  totalRevenue: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  avgStayDuration: number;
  activeBookings: number;
}

export interface TrendResponse {
  year: number;
  months: TrendMonth[];
}
```

### 1.5 Gestion des données de distribution segments

**Constat**: L'API `/api/segments/distribution` retourne `pieChart` et `barChart` séparément.

**Décision**: Créer une interface `SegmentDistribution` qui agrège les deux :

```typescript
export interface SegmentPieItem {
  segment: string;
  label: string;
  nights: number;
  percentage: number;
}

export interface SegmentBarItem {
  segment: string;
  label: string;
  revenue: number;
}

export interface SegmentDistribution {
  period: { year: number; month: number };
  totalNights: number;
  pieChart: SegmentPieItem[];
  barChart: SegmentBarItem[];
}
```

### 1.6 Structuration du page.tsx

**Constat**: Le fichier `page.tsx` fait déjà 190 lignes. L'ajout de 4 nouvelles sections (tendance, segments, comparaison YTD, comparaison mensuelle) le rendrait trop volumineux.

**Décision**: Extraire chaque section en sous-composant dans `components/dashboard/` :
- `components/dashboard/KPISection.tsx` — Les 6 cartes KPI (déjà largement dans page.tsx)
- `components/dashboard/TrendSection.tsx` — Graphique tendance annuelle + sélecteur année
- `components/dashboard/SegmentSection.tsx` — Graphiques camembert + barres + sélecteurs mois/année
- `components/dashboard/ComparisonSection.tsx` — Onglets YTD/Mensuel + tableaux + filtre segment
- `components/dashboard/ArrivalsDeparturesSection.tsx` — Arrivées et départs du jour

Ces sous-composants sont optionnels (peuvent être inlinés si page.tsx reste sous 400 lignes).

### 1.7 Stratégie skeleton et états vides

**Décision**:
- **KPI**: `isLoading` de React Query → skeleton inline (6 cards grises). Pas de composant skeleton séparé.
- **Graphiques**: `isLoading` → spinner centré dans la glass-card. Si données vides → message "Aucune donnée".
- **Comparaison**: `isLoading` → skeleton de tableau (3 lignes × 4 colonnes). Si deltas null → "N/A".
- **Arrivées/Départs**: Toujours mockées, pas de chargement. Badge "Démo" permanent.

### 1.8 Gestion des segments inconnus (edge case)

**Décision**: Créer une fonction utilitaire `mapSegmentToGroup(code: string): SegmentGroup` dans `analytics.ts` qui :
1. Vérifie le code dans la map des groupes (récupérée de `GET /api/segments`)
2. Si non trouvé, retourne `'AUTRES'`
3. La couleur `AUTRES` est `#94a3b8` (slate-400)

### 1.9 Aucun framework de test

**Constat**: `package.json` n'a que `next lint` comme script de validation. Pas de Jest, Playwright, ou autre.

**Décision**: La validation se fait via :
1. `npm run build` — vérifie que le code compile (TypeScript strict)
2. `npm run lint` — vérifie les règles ESLint
3. Navigation manuelle dans `/dashboard` — vérifie l'affichage, les deltas, les skeletons, les edge cases
4. Aucun test automatisé n'est ajouté dans ce plan (hors scope)

## 2. Analyse des dépendances

| Dépendance | Utilisation dans le dashboard | Source |
|---|---|---|
| `@tanstack/react-query` | `useQuery` pour 6 appels API | Déjà dans package.json |
| `axios` | apiClient pour tous les appels | Déjà dans package.json |
| `chart.js` + `react-chartjs-2` | Graphiques tendance et segments | Déjà dans package.json |
| `zustand` | Auth store uniquement | Déjà dans package.json |
| Bootstrap Icons | Icônes dans KPICard et sections | Feuille CSS externe déjà présente |

Aucune nouvelle dépendance npm n'est requise.

## 3. Décisions d'architecture

| Décision | Choix | Justification |
|---|---|---|
| Structure page.tsx | Sections extraites en sous-composants si >400 lignes | Maintenabilité |
| Props chart | Props optionnelles ; fallback tarification si absentes | Backward compat |
| Couleurs segments | Tokens Tailwind (accent/emerald/amber) + catégorie Autres | Défini par spéc |
| Deltas null | Afficher "N/A" avec tiret, couleur grise | Spéc Q2 |
| Badge Démo | Badge "Démo" sur arrivées/départs | Spéc DASH-FR-025 |
| Sélecteurs | `useState` local, pas de store global | Constitution §IV |

## 4. Alternatives considérées et rejetées

| Alternative | Raison du rejet |
|---|---|
| Extraire les composants chart dans `/components/charts/` avec props obligatoires | Rupture backward compat ; nécessite de modifier tous les consommateurs existants |
| Utiliser un store Zustand pour les filtres (mois/année/segment) | Violation constitution §IV (Zustand auth only) |
| Créer une nouvelle page `/dashboard-v2` | Spéc dit "modifiée sur place, pas de nouvelle page" |
| Ajouter date-fns pour le formatage des dates | Constitution §Explicitly Absent ; les dates sont des ISO strings |
| Utiliser `loading.tsx` ou `error.tsx` | Constitution §Non-Negotiable #7 ; pattern existant inline |
| Grouper les segments par couleur individuelle | Spéc Q1 : couleurs par groupe uniquement |
