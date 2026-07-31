# API Contracts: Module Analytics — Connexion Backend

**Source**: `docs/analytics-service.md` | **Gateway préfixe**: `/api/analytics/...`

## 1. GET /api/analytics/dashboard

> `apiClient.get('/api/analytics/dashboard')` → gateway → `GET /api/dashboard` (port 4006)

**Roles**: `manager`, `admin`, `comptable`

**Response 200**:
```json
{
  "period": { "year": 2026, "month": 7 },
  "kpis": {
    "toMensuel": { "value": 65.2, "prevValue": 60.1, "evolution": 8.5 },
    "toJournalier": { "value": 58.33, "prevValue": null, "evolution": null },
    "adr": { "value": 1200, "prevValue": 1100, "evolution": 9.1 },
    "revpar": { "value": 780, "prevValue": 661.1, "evolution": 18.0 },
    "dms": { "value": 2.3, "prevValue": 2.1, "evolution": 9.5 },
    "caMensuel": { "value": 150000, "prevValue": 130000, "evolution": 15.4 }
  }
}
```

**Error**: 401/403 → React Query `isError`. 500 → `{ "error": "<message>" }`.

## 2. GET /api/analytics/dashboard/trend

> `apiClient.get('/api/analytics/dashboard/trend', { params: { year } })` → `GET /api/dashboard/trend`

**Roles**: `manager`, `admin`, `comptable`

**Params**: `year` (integer, optional, default: current year)

**Response 200**:
```json
{
  "year": 2026,
  "months": [
    {
      "month": 1,
      "totalRooms": 30,
      "totalNights": 500,
      "totalRevenue": 600000,
      "occupancyRate": 53.76,
      "adr": 1200,
      "revpar": 645.16,
      "avgStayDuration": 2.1,
      "activeBookings": 85
    }
  ]
}
```

**Note**: 12 mois toujours retournés. Mois futurs = valeurs à 0.

## 3. GET /api/analytics/segments

> `apiClient.get('/api/analytics/segments')` → `GET /api/segments`

**Roles**: `manager`, `admin`, `comptable`

**Response 200**:
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

## 4. GET /api/analytics/segments/distribution

> `apiClient.get('/api/analytics/segments/distribution', { params: { year, month } })` → `GET /api/segments/distribution`

**Roles**: `manager`, `admin`, `comptable`

**Params**: `year` (int, optional), `month` (int 1–12, optional)

**Response 200**:
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

## 5. GET /api/analytics/segments/trend

> `apiClient.get('/api/analytics/segments/trend', { params: { year } })` → `GET /api/segments/trend`

**Roles**: `manager`, `admin`, `comptable`

**Params**: `year` (int, optional, default: current year)

**Response 200**:
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

**Note**: Mois sans données → `segments: []`. Année vide → 12 mois avec `segments: []`.

## 6. GET /api/analytics/comparison/ytd

> `apiClient.get('/api/analytics/comparison/ytd', { params: { year, segment } })` → `GET /api/comparison/ytd`

**Roles**: `manager`, `admin`, `comptable`

**Params**: `year` (int, optional), `segment` (string, optional)

**Response 200**:
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

## 7. GET /api/analytics/comparison/monthly

> `apiClient.get('/api/analytics/comparison/monthly', { params: { year, month, segment } })` → `GET /api/comparison/monthly`

**Roles**: `manager`, `admin`, `comptable`

**Params**: `year` (int, optional), `month` (int 1–12, optional), `segment` (string, optional)

**Response 200**:
```json
{
  "period": { "current": { "year": 2026, "month": 7 }, "previous": { "year": 2025, "month": 7 } },
  "segment": "all",
  "current": { "totalRooms": 30, "totalNights": 120, "totalRevenue": 150000, "occupancyRate": 65.2, "adr": 1200, "revpar": 780 },
  "previous": { "totalRooms": 30, "totalNights": 110, "totalRevenue": 130000, "occupancyRate": 60.1, "adr": 1100, "revpar": 661.1 },
  "deltas": { "occupancyRate": 8.5, "adr": 9.1, "revpar": 18.0, "revenue": 15.4 }
}
```
