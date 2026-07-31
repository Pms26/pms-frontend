# Component Contracts: Module Analytics — Connexion Backend

## 1. EvolutionChart

**File**: `components/charts/EvolutionChart.tsx`

**Usage**: US2 — Tendance mensuelle TO + ADR

| Prop | Type | Required | Source |
|------|------|----------|--------|
| `labels` | `string[]` | Non | `useMemo` from `TrendResponse.months` |
| `occupancyData` | `number[]` | Non | `TrendResponse.months[].occupancyRate` |
| `adrData` | `number[]` | Non | `TrendResponse.months[].adr` |
| `year` | `number` | Non | Current year or selected |

**Behavior**:
- Si props fournies → utilise les données analytics
- Si aucune prop → fallback actuel `getTarifs()` (conservé pour backward compat
  avec le module tarification)
- Dual-axis : TO (%) à gauche, ADR (DH) à droite

## 2. SegmentChart

**File**: `components/charts/SegmentChart.tsx`

**Usage**: US3 — Distribution segments (donut nuités + bar revenus)

| Prop | Type | Required | Source |
|------|------|----------|--------|
| `type` | `'doughnut' \| 'bar'` | Oui (default: doughnut) | — |
| `pieData` | `SegmentPieData[]` | Pour doughnut | `SegmentDistribution.pieChart` |
| `barData` | `SegmentBarData[]` | Pour bar | `SegmentDistribution.barChart` |

**Behavior**:
- Données passées en props uniquement (pas de fallback interne pour ce module)
- Couleurs déterminées par `SEGMENT_GROUP_COLORS` via `mapSegmentToGroup()`

## 3. Page: app/analytics/page.tsx

### États par section

| Section | Loading | Error | Empty data |
|---------|---------|-------|------------|
| KPIs (US1) | Skeleton 6 cards | "Service temporairement indisponible" | N/A (toujours 6 KPIs ou erreur) |
| Trend (US2) | Skeleton chart | "Service temporairement indisponible" | "Aucune donnée pour l'année sélectionnée" |
| Distribution (US3) | Skeleton charts | "Service temporairement indisponible" | "Aucune donnée pour cette période" |
| Segment Trend (US5) | Skeleton chart | "Service temporairement indisponible" | "Aucune donnée pour cette année" |
| Comparison (US4) | Skeleton table | "Service temporairement indisponible" | Tableau vide avec tirets |

### Query keys

| Key | Function |
|-----|----------|
| `['analytics-kpis']` | `getKPIs()` |
| `['analytics-trend', year]` | `getDashboardTrend(year)` |
| `['analytics-segment-groups']` | `getSegmentGroups()` |
| `['analytics-distribution', year, month]` | `getSegmentDistribution(year, month)` |
| `['analytics-segment-trend', year]` | `getSegmentTrend(year)` |
| `['analytics-comparison-ytd', year, segment]` | `getComparisonYTD(year, segment)` |
| `['analytics-comparison-monthly', year, month, segment]` | `getComparisonMonthly(year, month, segment)` |

### State

```typescript
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
const [comparisonTab, setComparisonTab] = useState<'ytd' | 'monthly'>('ytd');
const [segmentFilter, setSegmentFilter] = useState<string>('all');
```

### Layout sections (top→bottom)

1. **KPIs** — 6 cards grid (`grid-cols-1 md:grid-cols-3 lg:grid-cols-6`)
2. **Trend** — EvolutionChart (dual-axis TO/ADR) + year selector
3. **Segment Distribution** — 2-column grid: donut (left) + bar (right)
4. **Segment Trend** — Multi-line chart (nights per segment over 12 months)
5. **Comparison** — Tab switcher (YTD/Monthly) + year/month/segment filters + table
