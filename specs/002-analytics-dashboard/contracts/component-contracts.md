# Component Contracts — Analytics Dashboard

## 1. React Query queryKeys

```typescript
// KPI cards
['kpis']                                         // getKPIs()

// Trend
['dashboard-trend', year]                        // getDashboardTrend(year)

// Segment groups (cached 30min, rarely changes)
['segment-groups']                               // getSegmentGroups()

// Segment distribution
['segment-distribution', year, month]            // getSegmentDistribution(year, month)

// Comparison YTD
['comparison-ytd', year, segment]                // getComparisonYTD(year, segment)

// Comparison monthly
['comparison-monthly', year, month, segment]     // getComparisonMonthly(year, month, segment)

// Arrivals / Departures (always mocked)
['today-arrivals']                               // getTodayArrivals()
['today-departures']                             // getTodayDepartures()
```

## 2. Props contracts

### EvolutionChart (modifié)

```typescript
interface EvolutionChartProps {
  labels?: string[];          // Mois (ex: ["Jan", "Fév", ...])
  occupancyData?: number[];   // TO % par mois
  adrData?: number[];         // ADR DH par mois
  year?: number;              // Année affichée (pour titre/légende)
}
```

Comportement: si aucune prop → fallback `getTarifs()` (comportement actuel). Si props → utilise les données analytics.

### SegmentChart (modifié)

```typescript
interface SegmentPieData {
  label: string;
  value: number;
  color: string;
}

interface SegmentBarData {
  label: string;
  revenue: number;
  color: string;
}

interface SegmentChartProps {
  type?: 'doughnut' | 'bar';  // Type de graphique
  pieData?: SegmentPieData[]; // Données camembert
  barData?: SegmentBarData[]; // Données barres
}
```

Comportement: si aucune data prop → fallback `getTarifs()`. Si data fournie → utilise les données analytics.

### KPICard (inchangé)

```typescript
interface KPICardProps {
  kpi: KPI;
}
```

## 3. Sous-composants dashboard (optionnels — si extraits de page.tsx)

```typescript
// KPISection
interface KPISectionProps {
  kpis: KPI[] | undefined;
  isLoading: boolean;
}

// TrendSection
interface TrendSectionProps {
  // useState géré en interne
}

// SegmentSection
interface SegmentSectionProps {
  // useState géré en interne
}

// ComparisonSection
interface ComparisonSectionProps {
  // useState géré en interne
}

// ArrivalsDeparturesSection
interface ArrivalsDeparturesSectionProps {
  arrivals: Arrival[];
  departures: Departure[];
}
```

## 4. Couleurs segments (frontend uniquement)

```typescript
const SEGMENT_GROUP_COLORS: Record<string, string> = {
  DIRECT:      '#6366f1',  // token accent
  OTA:         '#10b981',  // token emerald
  PARTENAIRES: '#f59e0b',  // token amber
  AUTRES:      '#94a3b8',  // token slate-400
};
```

## 5. Fonctions utilitaires

```typescript
// Dans lib/api/analytics.ts
function mapSegmentToGroup(segmentCode: string, groups: Record<string, string[]>): string {
  for (const [group, codes] of Object.entries(groups)) {
    if (codes.includes(segmentCode)) return group;
  }
  return 'AUTRES';
}

function formatDelta(delta: number | null): { text: string; type: 'positive' | 'negative' | 'neutral' } {
  if (delta === null) return { text: '—', type: 'neutral' };
  const sign = delta > 0 ? '+' : '';
  return {
    text: `${sign}${delta.toFixed(1)}%`,
    type: delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral',
  };
}
```
