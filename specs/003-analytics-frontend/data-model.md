# Data Model: Module Analytics — Connexion Backend

**Date**: 2026-07-30 | **Branch**: `003-analytics-frontend`

## 1. Types réutilisés (existants dans `types/index.ts`)

Ces types sont déjà définis et utilisés par le module dashboard (002). Ils sont
réutilisés sans modification.

```typescript
// ─── KPI ──────────────────────────────────────────────
export interface KPI {
  label: string;
  value: string;
  unit: string;
  delta: string;
  deltaType: 'positive' | 'negative' | 'neutral';
  icon: string;
  gradient: string;
  gradientCss?: string;
}

// ─── Trend ────────────────────────────────────────────
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

// ─── Segments ─────────────────────────────────────────
export interface SegmentGroup {
  code: string;
  label: string;
}

export interface SegmentGroupsResponse {
  segments: SegmentGroup[];
  groups: Record<string, string[]>;
}

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

// ─── Comparison ───────────────────────────────────────
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

export interface MonthlyComparison {
  period: { current: { year: number; month: number }; previous: { year: number; month: number } };
  segment: string;
  current: ComparisonMetrics;
  previous: ComparisonMetrics;
  deltas: ComparisonDeltas;
}

export interface YTDComparisonItem {
  month: number;
  current: ComparisonMetrics;
  previous: ComparisonMetrics;
  deltas: ComparisonDeltas;
}

export interface YTDComparisonResponse {
  period: { currentYear: number; prevYear: number; upToMonth: number };
  segment: string;
  comparison: YTDComparisonItem[];
}
```

## 2. Nouveaux types (à ajouter dans `types/index.ts`)

### Segment Trend (US5)

```typescript
export interface SegmentTrendMonthItem {
  segment: string;
  label: string;
  nights: number;
  revenue: number;
  adr: number;
}

export interface SegmentTrendMonth {
  month: number;
  segments: SegmentTrendMonthItem[];
}

export interface SegmentTrendResponse {
  year: number;
  months: SegmentTrendMonth[];
}
```

## 3. Types supprimés (à retirer de `types/index.ts`)

- `SegmentAnalytics` — obsolète, remplacé par `SegmentDistribution` + `SegmentTrendResponse`
- `YTDCard` — obsolète, remplacé par `YTDComparisonResponse`

## 4. Relations entre entités

```
┌─────────────────────────────────────────────────────────┐
│  KPI                                                     │
│  6 cartes: TO Mensuel, TO Journalier, ADR, RevPAR,      │
│  DMS, CA Mensuel — chargées depuis GET /dashboard        │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│  TrendResponse                                           │
│  12 TrendMonth (TO + ADR) — GET /dashboard/trend?year=  │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│  SegmentDistribution                                     │
│  Pie (nuités) + Bar (revenus) — GET /segments/          │
│  distribution?year=&month=                              │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│  SegmentTrendResponse                                    │
│  12 mois, segments[] par mois — GET /segments/          │
│  trend?year=                                            │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│  YTDComparisonResponse / MonthlyComparison               │
│  Comparaison N vs N-1 — GET /comparison/ytd ou          │
│  /comparison/monthly                                    │
└─────────────────────────────────────────────────────────┘
```

### Normalisation : comparison/ytd → ComparisonMetrics

Le endpoint `GET /api/analytics/comparison/ytd` (`docs/analytics-service.md` §5.6)
utilise des noms de champs différents de `comparison/monthly` (§5.7) et du type
`ComparisonMetrics` :

| Champ `ComparisonMetrics` | Nom dans YTD | Nom dans monthly | Action |
|--------------------------|--------------|------------------|--------|
| `totalRevenue` | `revenue` | `totalRevenue` | Normaliser : `revenue ?? totalRevenue` |
| `totalNights` | `nights` | `totalNights` | Normaliser : `nights ?? totalNights` |
| `totalRooms` | _absent_ | `totalRooms` | Défaut à `0` |

La fonction `getComparisonYTD()` doit appliquer ce mapping à la réception.
Cette normalisation est conservée même après suppression des fallbacks mock —
c'est une correction de contrat backend, pas un repli de données. Si le backend
est un jour harmonisé, cette normalisation deviendra un safe no-op.

## 6. Validation rules

| Entité | Règle | Source |
|--------|-------|--------|
| KPI.evolution | `null` si prevValue = 0 → afficher "—" | spec FR-002 |
| MonthlyComparison.deltas.* | `null` si valeur N-1 = 0 → afficher "—" | spec FR-013 |
| TrendResponse.months | Toujours 12 mois (1–12). Mois futurs = valeurs 0. | analytics-service.md §5.2 |
| SegmentTrendResponse.months[].segments | Vide `[]` si aucune donnée pour ce mois | analytics-service.md §5.5 |
| SegmentDistribution | Seuls bookings `checked_in`/`checked_out` inclus | analytics-service.md §5.4 |
| YTDComparisonResponse | Mois 1 → mois courant uniquement | analytics-service.md §5.6 |

## 7. Segment color mapping

```
DIRECT      → #6366f1 (indigo)    — SegmentGroup: direct_walk_in, direct_phone_mail, direct_website
OTA         → #10b981 (emerald)   — SegmentGroup: ota_booking, ota_expedia, ota_hotels, ota_agoda, ota_airbnb
PARTENAIRES → #f59e0b (amber)     — SegmentGroup: b2b_agency, b2b_corporate
AUTRES      → #94a3b8 (gray)      — Fallback pour tout code non mappé
```

Défini via `SEGMENT_GROUP_COLORS` dans `lib/api/analytics.ts` (existant, à conserver).
