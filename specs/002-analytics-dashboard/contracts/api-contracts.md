# API Contracts — Analytics Dashboard

**Source**: `docs/analytics-service.md` | **Gateway préfixe**: `/api/analytics/...`

## 1. GET /api/analytics/dashboard

> Chemin appelé par `apiClient.get('/api/analytics/dashboard')`. Le gateway réécrit vers le service interne `GET /api/dashboard` (port 4006).

**But**: KPIs du mois en cours (6 indicateurs)

**Paramètres**: Aucun

**Rôles**: `admin`, `manager`, `comptable`

**Réponse 200**:
```json
{
  "period": { "year": 2026, "month": 7 },
  "kpis": {
    "toMensuel":      { "value": 65.2, "prevValue": 60.1, "evolution": 8.5 },
    "toJournalier":   { "value": 58.33, "prevValue": null, "evolution": null },
    "adr":            { "value": 1200, "prevValue": 1100, "evolution": 9.1 },
    "revpar":         { "value": 780, "prevValue": 661.1, "evolution": 18.0 },
    "dms":            { "value": 2.3, "prevValue": 2.1, "evolution": 9.5 },
    "caMensuel":      { "value": 150000, "prevValue": 130000, "evolution": 15.4 }
  },
  "raw": {
    "current": { "totalRooms": 30, "totalNights": 120, "totalRevenue": 150000, "occupancyRate": 65.2, "adr": 1200, "revpar": 780, "avgStayDuration": 2.3, "activeBookings": 52 },
    "prev": { "totalRooms": 30, "totalNights": 110, "totalRevenue": 130000, "occupancyRate": 60.1, "adr": 1100, "revpar": 661.1, "avgStayDuration": 2.1, "activeBookings": 50 }
  }
}
```

**Fonction API**: `getKPIs()` → `KPI[]`
- Mapping: `kpis.toMensuel.value` → `KPI.value`, `kpis.toMensuel.evolution` → `KPI.delta`
- `evolution === null` → `delta=""`, `deltaType="neutral"`

## 2. GET /api/analytics/dashboard/trend

> Chemin appelé par `apiClient.get('/api/analytics/dashboard/trend')`. Le gateway réécrit vers `GET /api/dashboard/trend` (port 4006).

**But**: Tendance mensuelle TO/ADR sur 12 mois

**Paramètres**:
| Param | Type | Obligatoire | Défaut |
|---|---|---|---|
| `year` | integer | Non | Année courante |

**Rôles**: `admin`, `manager`, `comptable`

**Réponse 200**:
```json
{
  "year": 2026,
  "months": [
    { "month": 1, "totalRooms": 30, "totalNights": 500, "totalRevenue": 600000, "occupancyRate": 53.76, "adr": 1200, "revpar": 645.16, "avgStayDuration": 2.1, "activeBookings": 85 }
  ]
}
```

**Fonction API**: `getDashboardTrend(year: number)` → `TrendResponse`

## 3. GET /api/analytics/segments

> Chemin appelé par `apiClient.get('/api/analytics/segments')`. Le gateway réécrit vers `GET /api/segments` (port 4006).

**But**: Liste des segments disponibles et leurs groupes

**Paramètres**: Aucun

**Rôles**: `admin`, `manager`, `comptable`

**Réponse 200**:
```json
{
  "segments": [
    { "code": "direct_walk_in", "label": "Direct - Walk-in" }
  ],
  "groups": {
    "DIRECT": ["direct_walk_in", "direct_phone_mail", "direct_website"],
    "OTA": ["ota_booking", "ota_expedia", "ota_hotels", "ota_agoda", "ota_airbnb"],
    "PARTENAIRES": ["b2b_agency", "b2b_corporate"]
  }
}
```

**Fonction API**: `getSegmentGroups()` → `SegmentGroupsResponse`

## 4. GET /api/analytics/segments/distribution

> Chemin appelé par `apiClient.get('/api/analytics/segments/distribution')`. Le gateway réécrit vers `GET /api/segments/distribution` (port 4006).

**But**: Distribution nuitées (pieChart) et revenus (barChart) par segment

**Paramètres**:
| Param | Type | Obligatoire | Défaut |
|---|---|---|---|
| `year` | integer | Non | Année courante |
| `month` | integer | Non | Mois courant |

**Rôles**: `admin`, `manager`, `comptable`

**Réponse 200**:
```json
{
  "period": { "year": 2026, "month": 7 },
  "totalNights": 500,
  "pieChart": [
    { "segment": "direct_walk_in", "label": "Direct - Walk-in", "nights": 150, "percentage": 30.0 }
  ],
  "barChart": [
    { "segment": "direct_walk_in", "label": "Direct - Walk-in", "revenue": 180000 }
  ]
}
```

**Fonction API**: `getSegmentDistribution(year: number, month: number)` → `SegmentDistribution`

## 5. GET /api/analytics/comparison/ytd

> Chemin appelé par `apiClient.get('/api/analytics/comparison/ytd')`. Le gateway réécrit vers `GET /api/comparison/ytd` (port 4006).

**But**: Comparaison cumulée YTD (mois 1 → mois courant)

**Paramètres**:
| Param | Type | Obligatoire | Défaut |
|---|---|---|---|
| `year` | integer | Non | Année courante |
| `segment` | string | Non | "all" (tous) |

**Rôles**: `admin`, `manager`, `comptable`

**Réponse 200**:
```json
{
  "period": { "currentYear": 2026, "prevYear": 2025, "upToMonth": 7 },
  "segment": "all",
  "comparison": [
    {
      "month": 1,
      "current": { "occupancyRate": 53.76, "adr": 1200, "revpar": 645.16, "revenue": 600000, "nights": 500 },
      "previous": { "occupancyRate": 50.0, "adr": 1100, "revpar": 550.0, "revenue": 550000, "nights": 458 },
      "deltas": { "occupancyRate": 7.5, "adr": 9.1, "revpar": 17.3, "revenue": 9.1 }
    }
  ]
}
```

**Fonction API**: `getComparisonYTD(year: number, segment?: string)` → `YTDComparisonResponse`

## 6. GET /api/analytics/comparison/monthly

> Chemin appelé par `apiClient.get('/api/analytics/comparison/monthly')`. Le gateway réécrit vers `GET /api/comparison/monthly` (port 4006).

**But**: Comparaison d'un mois spécifique vs N-1

**Paramètres**:
| Param | Type | Obligatoire | Défaut |
|---|---|---|---|
| `year` | integer | Non | Année courante |
| `month` | integer | Non | Mois courant |
| `segment` | string | Non | "all" |

**Rôles**: `admin`, `manager`, `comptable`

**Réponse 200**:
```json
{
  "period": { "current": { "year": 2026, "month": 7 }, "previous": { "year": 2025, "month": 7 } },
  "segment": "all",
  "current": { "totalRooms": 30, "totalNights": 120, "totalRevenue": 150000, "occupancyRate": 65.2, "adr": 1200, "revpar": 780 },
  "previous": { "totalRooms": 30, "totalNights": 110, "totalRevenue": 130000, "occupancyRate": 60.1, "adr": 1100, "revpar": 661.1 },
  "deltas": { "occupancyRate": 8.5, "adr": 9.1, "revpar": 18.0, "revenue": 15.4 }
}
```

**Comportement N-1 absent**: `previous.* = 0`, `deltas.* = null` (toujours 200, jamais 404)

**Fonction API**: `getComparisonMonthly(year: number, month: number, segment?: string)` → `MonthlyComparison`

## 7. POST /api/analytics/seed

> Chemin appelé par `apiClient.post('/api/analytics/seed')`. Le gateway réécrit vers `POST /api/seed` (port 4006).

**⚠️ Destructif — ne jamais exposer côté UI** (DASH-FR-029)

Protégé par JWT uniquement (pas de vérification de rôle). Toute personne authentifiée peut supprimer/régénérer les données de test.
