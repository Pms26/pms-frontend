# Data Model — Analytics Dashboard

**Date**: 2026-07-28 | **Branch**: `002-analytics-dashboard`

## 1. Entités

### 1.1 KPI (existant, étendu)

| Champ | Type | Description | Règle de validation |
|---|---|---|---|
| `label` | `string` | Libellé affiché (ex: "T.O. Mensuel") | Requis, non vide |
| `value` | `string` | Valeur formatée (ex: "78") | Requis, chaîne formatée en français |
| `unit` | `string` | Unité (%, DH, nuits) | Requis |
| `delta` | `string` | Évolution formatée (ex: "+4.2%") ou "" | Chaîne vide si null |
| `deltaType` | `'positive' \| 'negative' \| 'neutral'` | Type de tendance | `'neutral'` quand delta vide/null |
| `icon` | `string` | Nom icône Bootstrap (ex: "houses") | Requis |
| `gradient` | `string` | Classe gradient Tailwind | Requis |
| `gradientCss` | `string` | Valeur CSS gradient | Optionnel |

**Règles métier**:
- `toJournalier` a toujours `delta=""` et `deltaType="neutral"` (DASH-FR-005)
- Si `evolution` API est `null`, `delta=""` et `deltaType="neutral"` (DASH-FR-003)
- Valeurs formatées avec `toLocaleString('fr-FR')` (espace comme séparateur milliers)

### 1.2 TrendMonth (nouveau)

| Champ | Type | Description | Règle de validation |
|---|---|---|---|
| `month` | `number` | Numéro du mois (1-12) | Requis, 1 ≤ month ≤ 12 |
| `totalRooms` | `number` | Nombre total de chambres actives | Requis, ≥ 0 |
| `totalNights` | `number` | Total nuitées occupées | Requis, ≥ 0 |
| `totalRevenue` | `number` | Revenu total du mois | Requis, ≥ 0 |
| `occupancyRate` | `number` | Taux d'occupation (%) | Requis, 0-100 |
| `adr` | `number` | Average Daily Rate (DH) | Requis, ≥ 0 |
| `revpar` | `number` | RevPAR (DH) | Requis, ≥ 0 |
| `avgStayDuration` | `number` | Durée moyenne séjour (nuits) | Requis, ≥ 0 |
| `activeBookings` | `number` | Nombre de réservations actives | Requis, ≥ 0 |

**Règles métier**:
- Mois futurs : toutes les valeurs à 0 (API garantie, DASH-FR-010)
- 12 mois toujours retournés par l'API (docs/analytics-service.md §5.2)

### 1.3 TrendResponse (nouveau)

| Champ | Type | Description |
|---|---|---|
| `year` | `number` | Année sélectionnée |
| `months` | `TrendMonth[]` | Tableau de 12 mois |

### 1.4 SegmentGroup (nouveau)

| Champ | Type | Description |
|---|---|---|
| `code` | `string` | Code du segment (ex: `direct_walk_in`) |
| `label` | `string` | Libellé affiché (ex: "Direct - Walk-in") |

### 1.5 SegmentGroupsResponse (nouveau)

| Champ | Type | Description |
|---|---|---|
| `segments` | `SegmentGroup[]` | Liste de tous les segments disponibles |
| `groups` | `Record<string, string[]>` | Mapping groupe → liste de codes segment |

**Groupes définis** (docs/analytics-service.md §5.3):
- `DIRECT`: `direct_walk_in`, `direct_phone_mail`, `direct_website`
- `OTA`: `ota_booking`, `ota_expedia`, `ota_hotels`, `ota_agoda`, `ota_airbnb`
- `PARTENAIRES`: `b2b_agency`, `b2b_corporate`

### 1.6 SegmentPieItem (nouveau)

| Champ | Type | Description |
|---|---|---|
| `segment` | `string` | Code du segment |
| `label` | `string` | Libellé affiché |
| `nights` | `number` | Nombre de nuitées |
| `percentage` | `number` | Pourcentage (0-100) |

### 1.7 SegmentBarItem (nouveau)

| Champ | Type | Description |
|---|---|---|
| `segment` | `string` | Code du segment |
| `label` | `string` | Libellé affiché |
| `revenue` | `number` | Revenu en DH |

### 1.8 SegmentDistribution (nouveau)

| Champ | Type | Description |
|---|---|---|
| `period` | `{ year: number; month: number }` | Période concernée |
| `totalNights` | `number` | Total nuitées tous segments |
| `pieChart` | `SegmentPieItem[]` | Données pour le camembert |
| `barChart` | `SegmentBarItem[]` | Données pour le barChart |

### 1.9 ComparisonMetrics (nouveau)

| Champ | Type | Description |
|---|---|---|
| `totalRooms` | `number` | Chambres actives |
| `totalNights` | `number` | Nuitées totales |
| `totalRevenue` | `number` | Revenu total |
| `occupancyRate` | `number` | Taux d'occupation (%) |
| `adr` | `number` | ADR (DH) |
| `revpar` | `number` | RevPAR (DH) |

### 1.10 ComparisonDeltas (nouveau)

| Champ | Type | Description |
|---|---|---|
| `occupancyRate` | `number \| null` | Delta TO (%) |
| `adr` | `number \| null` | Delta ADR (%) |
| `revpar` | `number \| null` | Delta RevPAR (%) |
| `revenue` | `number \| null` | Delta revenu (%) |

**Règles métier**: `null` quand la valeur N-1 est 0 (DASH-FR-021). L'API retourne toujours 200 dans ce cas avec `previous.* = 0` et `deltas.* = null`.

### 1.11 MonthlyComparison (nouveau)

| Champ | Type | Description |
|---|---|---|
| `period` | `{ current: { year, month }, previous: { year, month } }` | Périodes comparées |
| `segment` | `string` | Filtre segment ("all" si aucun) |
| `current` | `ComparisonMetrics` | Mois courant |
| `previous` | `ComparisonMetrics` | Même mois N-1 |
| `deltas` | `ComparisonDeltas` | Évolutions |

### 1.12 YTDComparisonItem (nouveau)

| Champ | Type | Description |
|---|---|---|
| `month` | `number` | Mois (1-12) |
| `current` | `ComparisonMetrics` | Données N |
| `previous` | `ComparisonMetrics` | Données N-1 |
| `deltas` | `ComparisonDeltas` | Évolutions |

### 1.13 YTDComparisonResponse (nouveau)

| Champ | Type | Description |
|---|---|---|
| `period` | `{ currentYear, prevYear, upToMonth }` | Période YTD |
| `segment` | `string` | Filtre segment |
| `comparison` | `YTDComparisonItem[]` | Mois 1 → mois courant |

### 1.14 SegmentAnalytics (existant)

Type existant dans `types/index.ts`. Conservé pour backward compat. Les nouvelles fonctions de distribution utilisent `SegmentDistribution` à la place.

### 1.15 YTDCard (existant)

Type existant dans `types/index.ts`. Conservé mais la section comparaison YTD utilise désormais `YTDComparisonResponse` pour les données brutes, et `YTDCard` reste disponible pour l'affichage carte si nécessaire.

### 1.16 Arrival / Departure (existant, mocks)

Structures mockées dans `analytics.ts` :
- **Arrivée**: `{ client: string, room: string, type: string, time: string }`
- **Départ**: `{ client: string, room: string, balance: string, status: string }`

Ces structures restent inchangées. Aucun endpoint public. Toujours mockées (DASH-FR-026).

## 2. Relations entre entités

```
DashboardPage
├── KPISection
│   └── 6 × KPI (getKPIs → GET /api/dashboard)
├── TrendSection
│   ├── AnnéeSelector (useState)
│   └── EvolutionChart (props: TrendMonth[])
│       └── getDashboardTrend(year) → GET /api/dashboard/trend?year=
├── SegmentSection
│   ├── MoisSelector (useState)
│   ├── AnnéeSelector (useState)
│   ├── SegmentChart doughnut (props: SegmentPieItem[])
│   └── SegmentChart barres (props: SegmentBarItem[])
│       └── getSegmentDistribution(year, month) → GET /api/segments/distribution
├── ComparisonSection
│   ├── Tab YTD / Mensuel (useState)
│   ├── SegmentFilter (useState)
│   ├── YTDView
│   │   └── getComparisonYTD(year, segment) → GET /api/comparison/ytd
│   └── MonthlyView
│       └── getComparisonMonthly(year, month, segment) → GET /api/comparison/monthly
└── ArrivalsDeparturesSection
    ├── ArrivalsList → getTodayArrivals() (toujours mock)
    └── DeparturesList → getTodayDepartures() (toujours mock)
```

## 3. États et transitions

Tous les composants de données suivent le même cycle React Query :
```
idle → loading (skeleton) → success (data) | error (fallback mock)
```

Pas d'état mutation (GET-only). Les sélecteurs (mois/année/segment) sont des `useState` locaux qui déclenchent des `useQuery` avec des `queryKey` différentes, ce qui provoque le re-fetch automatique via React Query.

## 4. Règles de validation (données API → UI)

| Règle | Condition | Action |
|---|---|---|
| Delta null | `evolution === null` ou `deltas.* === null` | Afficher "—" (tiret), couleur grise |
| Valeur N-1 = 0 | `previous.* === 0` | Delta → null (pas de division par zéro) |
| Mois futur | `month > currentMonth` | Afficher valeur 0 (API), ou "Aucune donnée" si année complète vide |
| Segment inconnu | Code non trouvé dans `groups` | Classer en "Autres", couleur `#94a3b8` |
| API indisponible | try/catch attrape l'erreur | Fallback vers mock data, pas d'écran vide |
| Année sans données | Tous les mois occupancyRate = 0 | Afficher "Aucune donnée pour l'année sélectionnée" |
