# Research: Module Analytics — Connexion Backend

**Date**: 2026-07-30 | **Branch**: `003-analytics-frontend`

## 1. Architecture & Communication

### Decision: Gateway-First, No Mock Fallback

**Context**: La constitution (I. Gateway-First Communication) impose que tout appel API
passe par api-gateway (port 4000). Par ailleurs, l'Assumption spec.md stipule
"Fallback to mock data is not appropriate when the backend is expected to be available."

**Decision**:
- Tous les appels utilisent `apiClient` (`lib/api/client.ts`) avec préfixe
  `/api/analytics/...` — le gateway réécrit vers le service interne (port 4006).
- **Pas de fallback mock** dans les fonctions API analytics. Le `try/catch` affiche
  une erreur utilisateur ("Service temporairement indisponible") via React Query
  `isError` — pas de retour silencieux vers des données mockées.
- Le flag `USE_MOCKS` est neutralisé pour ce module : les fonctions ne vérifient
  plus `if (USE_MOCKS)` et ne contiennent plus de données mockées pérennes.

**Rationale**: Le module doit être connecté au backend réel. Les mocks ont été utiles
en phase de développement initial mais ne doivent plus exister en production. Les
mocks analytics (MOCK_KPIS, MOCK_SEGMENTS, etc.) et les fonctions
getTodayArrivals/getTodayDepartures sont supprimés.

**Alternatives considered**:
- Conserver USE_MOCKS pour développement local → rejeté car le spec demande
  clairement "Service temporairement indisponible" en cas d'erreur, pas de fallback.
  Le développement local peut utiliser le backend réel ou `mockDelay` uniquement
  pour le développement UI (via un flag temporaire, pas permanent).

### Decision: Suppression des mocks permanents et code mort

**Liste des suppressions dans `lib/api/analytics.ts`**:
- Constantes MOCK_KPIS, MOCK_SEGMENTS, MOCK_YTD, MOCK_MONTHLY, MOCK_ARRIVALS, MOCK_DEPARTURES
- Fonctions `generateMockTrend()`, `generateMockSegmentDistribution()`,
  `generateMockComparisonYTD()`
- Fonctions `getTodayArrivals()`, `getTodayDepartures()`
- Tous les blocs `if (USE_MOCKS)` dans chaque fonction API
- Tous les blocs `catch (err) { return MOCK_* }` — remplacer par `catch (err) { throw err }`
  ou laisser l'erreur remonter à React Query
- Fonctions `getSegmentAnalytics()`, `getYTDComparison()`, `getMonthlyData()`
  (remplacées par les appels standardisés ci-dessous)
- Fonctions utilitaires obsolètes : `getSegmentAnalytics` (remplacé par
  `getSegmentDistribution`), `getYTDComparison` (remplacé par `getComparisonYTD`),
  `getMonthlyData` (remplacé par `getDashboardTrend`)
- Helper `formatNum()` (plus utilisé après suppression des anciens mocks)

**Liste des suppressions dans `app/analytics/page.tsx`**:
- Imports `getTodayArrivals`, `getTodayDepartures`
- Suppression du bouton "Exporter"
- Composants ArrivalsList, DeparturesList (si présents en modules séparés)

### Decision: Nouvelle fonction API pour segment trend (US5)

**Endpoint**: `GET /api/analytics/segments/trend?year=`
**Contrat**: docs/analytics-service.md §5.5

Nouvelle fonction `getSegmentTrend(year: number)` dans `lib/api/analytics.ts`.
Retourne `SegmentTrendResponse` (nouveau type).

### Decision: Refonte des fonctions API existantes

Chaque fonction est simplifiée : suppression du bloc USE_MOCKS, suppression du
catch avec fallback mock, l'erreur remonte à React Query.

| Fonction | Endpoint | Remplace |
|----------|----------|----------|
| `getKPIs()` | `GET /api/analytics/dashboard` | existante (sans fallback mock) |
| `getDashboardTrend(year)` | `GET /api/analytics/dashboard/trend?year=` | existante (sans fallback mock) |
| `getSegmentGroups()` | `GET /api/analytics/segments` | existante (sans fallback mock) |
| `getSegmentDistribution(year, month)` | `GET /api/analytics/segments/distribution?year=&month=` | existante (sans fallback mock) |
| `getSegmentTrend(year)` | `GET /api/analytics/segments/trend?year=` | NOUVELLE |
| `getComparisonYTD(year, segment?)` | `GET /api/analytics/comparison/ytd?year=&segment=` | existante (sans fallback mock) |
| `getComparisonMonthly(year, month, segment?)` | `GET /api/analytics/comparison/monthly?year=&month=&segment=` | existante (sans fallback mock) |

## 2. Types & Data Model

### Decision: Types partagés existants (réutilisés depuis dashboard)

Les types suivants sont déjà dans `types/index.ts` et sont réutilisés :
- `KPI` (inchangé)
- `TrendMonth` (inchangé)
- `TrendResponse` (inchangé)
- `SegmentGroup` (inchangé)
- `SegmentGroupsResponse` (inchangé)
- `SegmentPieItem` (inchangé)
- `SegmentBarItem` (inchangé)
- `SegmentDistribution` (inchangé)
- `ComparisonMetrics` (inchangé)
- `ComparisonDeltas` (inchangé)
- `MonthlyComparison` (inchangé)
- `YTDComparisonItem` (inchangé)
- `YTDComparisonResponse` (inchangé)

### Decision: Nouveaux types pour segment trend (US5)

Nécessite deux nouveaux types :
- `SegmentTrendMonth` — données d'un mois pour la tendance par segment
- `SegmentTrendResponse` — wrapper année + mois

(voir data-model.md pour les définitions complètes)

### Decision: Suppression des types obsolètes

Types à supprimer de `types/index.ts` :
- `SegmentAnalytics` (remplacé par `SegmentDistribution` + `SegmentTrendResponse`)
- `YTDCard` (remplacé par `YTDComparisonResponse`)

## 3. Composants & UI

### Decision: Réutilisation des composants chart existants

**EvolutionChart.tsx** — utilisé pour US2 (tendance TO + ADR sur 12 mois) :
- Actuellement utilise `getTarifs()` en fallback si pas de props
- Modifié pour accepter les données de `getDashboardTrend()` sans fallback
- Renommer l'interface pour plus de clarté : `EvolutionChartProps` reste

**SegmentChart.tsx** — utilisé pour US3 (donut nuités + bar revenus) :
- Pas de modification structurelle
- Données passées en props depuis `getSegmentDistribution()`

**Nouveau composant pour US5 (tendance par segment, multi-lignes)** :
- Le graphique multi-lignes est assemblé dans `page.tsx` directement en
  utilisant `react-chartjs-2` (comme fait actuellement dans la page existante
  pour le graphique d'évolution mensuelle par canal), pas de nouveau fichier
  composant dédié.
- Utilise le dataset multi-line pattern déjà présent dans la page actuelle.

### Decision: Suppression du bouton Exporter

Le bouton "Exporter" dans `app/analytics/page.tsx` est supprimé car :
- Aucun endpoint backend ne supporte l'export
- Hors scope de cette spécification (confirmé par clarification Q2)

## 4. Error Handling Strategy

### Decision: React Query error states, pas de fallback mock

Toutes les fonctions API analytics lèvent leurs erreurs (ou les laissent remonter)
vers React Query. Les composants utilisent `isError` / `error` de `useQuery` :

```tsx
const { data, isLoading, isError } = useQuery({ ... });

if (isLoading) return <Skeleton />;
if (isError) return <ErrorMessage message="Service temporairement indisponible" />;
```

Pas d'ErrorMessage global — chaque section (KPI, tendance, segments, comparaison)
gère son propre état d'erreur pour éviter qu'un endpoint mort n'entraîne la chute
de toute la page.

## 5. Middleware & Sidebar Verification

### Finding: Gap dans ROLE_RESTRICTIONS pour /analytics

**Constat**: `/analytics` n'est **pas** présent dans `ROLE_RESTRICTIONS` dans
`middleware.ts`. Cela signifie que tout utilisateur authentifié (y compris
`receptionist` et `housekeeping_supervisor`) peut accéder à `/analytics` en
navigant directement via l'URL, même si la sidebar masque le lien.

**Recommandation**: Ajouter `/analytics` à `ROLE_RESTRICTIONS` dans `middleware.ts`
avec rôles `['admin', 'manager', 'comptable']` pour être cohérent avec FR-018
et les permissions documentées dans `docs/analytics-service.md`.

### Finding: Sidebar — gap pour le rôle receptionist

**Constat**: Dans `Sidebar.tsx`, le rôle `receptionist` voit la section GESTION
qui inclut "Analytics" (ligne 31, pas de filtre par rôle pour non-comptable dans
la section gestion). FR-018 exige que receptionist ne voie pas Analytics.

**Recommandation**: Restreindre l'affichage d'Analytics dans la sidebar aux rôles
`admin`, `manager`, `comptable` (cf. `docs/analytics-service.md` §4).

## 6. Page Structure refactor

### Decision: refonte de app/analytics/page.tsx

La page actuelle est un bloc monolithique. La nouvelle structure :

1. **KPIs** (US1) — 6 cartes KPI via `getKPIs()`
2. **Trend mensuel** (US2) — `EvolutionChart` via `getDashboardTrend(year)`
3. **Segments distribution** (US3) — SegmentChart donut + bar via `getSegmentDistribution()`
4. **Comparison N vs N-1** (US4) — tableau comparatif via `getComparisonYTD()` / `getComparisonMonthly()`
5. **Segment trend** (US5) — graphique multi-lignes via `getSegmentTrend()`

Chaque section a son propre `useQuery` avec clé dédiée.
Les sélecteurs (année, mois) sont gérés via `useState`.
Pas de sous-composants dédiés — les sections restent dans `page.tsx` pour
simplicité, sauf si la lisibilité se dégrade.

## 7. Incohérence nommée : comparison/ytd vs comparison/monthly

### Constat

Le backend analytics-service a deux formats de réponse différents pour les métriques
de comparaison, ce qui est une incohérence reconnue du service backend :

| Champ | `GET /comparison/ytd` | `GET /comparison/monthly` |
|-------|----------------------|---------------------------|
| `totalRevenue` | ❌ utilise `revenue` | ✅ `totalRevenue` |
| `totalNights` | ❌ utilise `nights` | ✅ `totalNights` |
| `totalRooms` | ❌ absent | ✅ présent |

Source : `docs/analytics-service.md` §5.6 (YTD) vs §5.7 (monthly).

### Décision : Normalisation dans getComparisonYTD()

La fonction `getComparisonYTD()` **DOIT** normaliser les champs à la réception
pour que le type `ComparisonMetrics` soit cohérent partout :

```typescript
current: {
  totalRooms: item.current?.totalRooms ?? 0,          // absent en YTD → 0
  totalNights: item.current?.nights ?? item.current?.totalNights ?? 0,
  totalRevenue: item.current?.revenue ?? item.current?.totalRevenue ?? 0,
  occupancyRate: item.current?.occupancyRate ?? 0,
  adr: item.current?.adr ?? 0,
  revpar: item.current?.revpar ?? 0,
},
```

Cette normalisation **n'est pas un fallback mock** — c'est une correction de mapping
de champs entre deux endpoints du même service. Elle doit être conservée même après
la suppression de tous les autres fallbacks mock (le `try/catch` ne doit plus
retourner de données mockées, mais le mapping dans le `try` est légitime).

Si le backend est un jour corrigé pour être cohérent (utilisation de `totalRevenue`/
`totalNights`/`totalRooms` dans les deux endpoints), cette normalisation deviendra
un safe no-op et pourra être supprimée.

### Vérification backend

**Statut au 2026-07-30** : Incohérence toujours présente dans `docs/analytics-service.md`.
Aucune correction backend planifiée connue. La normalisation frontend reste nécessaire.

## 8. Segment Trend (US5) — endpoint details

**Endpoint**: `GET /api/analytics/segments/trend?year=`

**Réponse type**:
```json
{
  "year": 2026,
  "months": [
    {
      "month": 1,
      "segments": [
        { "segment": "direct_walk_in", "label": "Direct - Walk-in", "nights": 150, "revenue": 180000, "adr": 1200 }
      ]
    }
  ]
}
```

**Comportement attendu**:
- 12 mois toujours retournés (mois futurs = `segments: []`)
- Chaque mois ne contient que les segments avec ≥1 nuit
- Si année vide → `months` tableau de 12 mois avec `segments: []`

**Visualisation**:
- Graphique multi-lignes (une ligne par segment, un point par mois)
- Dataset : `nights` par défaut, option `revenue` si pertinent
- Couleurs par groupe : DIRECT = indigo (#6366f1), OTA = emerald (#10b981), PARTENAIRES = amber (#f59e0b)
