# Night Audit API Contract — Frontend Consumption Guide

**Feature**: 001-night-audit-frontend
**Date**: 2026-07-27
**Source**: `docs/night-audit.md` (backend contract)

All endpoints are called through the api-gateway at `NEXT_PUBLIC_API_URL`
(port 4000). The gateway preserves the `/api/night-audit` prefix (no rewrite).

## Endpoints Used by Frontend

### 1. GET /api/night-audit/status

**Purpose**: Get current business day status
**Roles**: admin, manager, comptable, receptionist

**Response 200**:
```json
{
  "business_date": "2026-07-08",
  "status": "en_cours",
  "last_closure": {
    "business_date": "2026-07-07",
    "closed_at": "2026-07-07T23:15:00.000Z",
    "closed_by_role": "admin"
  }
}
```

**Response 200 (failed status)**:
```json
{
  "business_date": "2026-07-08",
  "status": "echouee",
  "error_details": {
    "service": "service-frontoffice",
    "code": "SERVICE_UNAVAILABLE"
  }
}
```

> `error_details` is an object with `service` and `code` keys (no `message`
> field) — `statusService.js:33-45`. The `code` key is used, not `error_code`.

**Frontend mapping**: `mapBackendStatus()` in `lib/api/nightAudit.ts`

---

### 2. POST /api/night-audit/check-balance

**Purpose**: Verify debit/credit balance
**Roles**: admin, manager, comptable
**Middleware**: rejectIfClosed (blocks if status === "cloturee")

**Request**:
```json
{
  "business_date": "2026-07-08"
}
```

**Response 200 (balanced)**:
```json
{
  "business_date": "2026-07-08",
  "equilibre": true,
  "total_debit": 45230.50,
  "total_credit": 45230.50,
  "ecart": 0.0,
  "decomposition": {
    "debit_sources": {
      "frontoffice": 42100.00
    },
    "credit_sources": {
      "payments": 38500.00,
      "debtors": 6730.50
    }
  }
}
```

> Decomposition uses objects (key-value), not arrays — `closureService.js:128-143`.

**Response 200 (unbalanced)**:
```json
{
  "business_date": "2026-07-08",
  "equilibre": false,
  "total_debit": 45230.50,
  "total_credit": 44980.50,
  "ecart": 250.00,
  "decomposition": {
    "debit_sources": {
      "frontoffice": 42100.00
    },
    "credit_sources": {
      "payments": 38250.00,
      "debtors": 6730.50
    }
  }
}
```

**Error 409**: `ALREADY_CLOSED` — journée déjà clôturée

**Frontend mapping**: `mapCheckBalance()` in `lib/api/nightAudit.ts`

---

### 3. POST /api/night-audit/close

**Purpose**: Official day closure + PDF generation
**Roles**: admin, manager
**Middleware**: rejectIfClosed, validate

**Request**:
```json
{
  "business_date": "2026-07-08",
  "justification": "Écart de 1500 DH dû à une correction manuelle"  // optional
}
```

**Response 201 (success, balanced)**:
```json
{
  "business_date": "2026-07-08",
  "status": "cloturee",
  "closed_by": "user-uuid-123",
  "closed_by_role": "admin",
  "closed_at": "2026-07-08T23:30:00.000Z",
  "current_business_date": "2026-07-09",
  "total_debit": 125000.00,
  "total_credit": 125000.00,
  "ecart": 0,
  "justification": null,
  "warnings": [],
  "reports_generated": 6,
  "reports": [
    {
      "id": "report-uuid-1",
      "type": "revenue_daily",
      "name": "Detailed Daily Revenue",
      "download_url": "/api/night-audit/history/2026-07-08/reports/report-uuid-1"
    }
  ]
}
```

> `download_url` is a **relative path** (not an absolute URL). The frontend
> must prepend `NEXT_PUBLIC_API_URL` (the gateway) when constructing the
> full download URL. Only present for admin role — `closureService.js:365`.

**Response 201 (success, unbalanced, admin with justification)**:
```json
{
  "business_date": "2026-07-08",
  "status": "cloturee",
  "closed_by": "user-uuid-123",
  "closed_by_role": "admin",
  "closed_at": "2026-07-08T23:30:00.000Z",
  "current_business_date": "2026-07-09",
  "total_debit": 125000.00,
  "total_credit": 123500.00,
  "ecart": 1500.00,
  "justification": "Écart de 1500 DH dû à une correction manuelle",
  "warnings": [
    { "report": "arrivals", "reason": "Données réservations partiellement indisponibles" }
  ],
  "reports_generated": 6,
  "reports": [
    {
      "id": "report-uuid-1",
      "type": "revenue_daily",
      "name": "Detailed Daily Revenue",
      "download_url": "/api/night-audit/history/2026-07-08/reports/report-uuid-1"
    }
  ]
}
```

**Response 201 (success, manager — no download_url)**:
```json
{
  "reports": [
    {
      "id": "report-uuid-1",
      "type": "revenue_daily",
      "name": "Detailed Daily Revenue"
    }
  ]
}
```

> `download_url` is only present when `userRole === 'admin'` — `closureService.js:365`.
> Manager receives report metadata (id, type, name) without download link.

**Error responses** (see Error Response Format below):
- 400 `ECART_BLOCKED`: Admin sans justification en cas d'écart
- 403 `FORBIDDEN` (message: "Manager cannot close with ecart"): Manager en cas d'écart
- 409 `ALREADY_CLOSED`: Journée déjà clôturée
- 503 `SERVICE_UNAVAILABLE`: Service front-office indisponible

**Frontend mapping**: `mapClosure()` in `lib/api/nightAudit.ts`

---

### 4. GET /api/night-audit/history

**Purpose**: List all past closures
**Roles**: admin, comptable

**Response 200**:
```json
{
  "closures": [
    {
      "business_date": "2026-07-07",
      "status": "cloturee",
      "closed_by_role": "admin",
      "closed_at": "2026-07-07T23:15:00.000Z",
      "total_debit": 118000.00,
      "total_credit": 118000.00,
      "ecart": 0,
      "reports_generated": 6,
      "error_details": null
    },
    {
      "business_date": "2026-07-06",
      "status": "echouee",
      "closed_by_role": "manager",
      "closed_at": "2026-07-06T23:20:00.000Z",
      "total_debit": null,
      "total_credit": null,
      "ecart": null,
      "reports_generated": 0,
      "error_details": {
        "code": "MANAGER_ECart_BLOCKED"
      }
    }
  ]
}
```

**Frontend mapping**: Array of `mapClosure()` calls

---

### 5. GET /api/night-audit/history/:business_date

**Purpose**: Closure detail with financial breakdown
**Roles**: admin, comptable

**Response 200**:
```json
{
  "closure": {
    "business_date": "2026-07-07",
    "status": "cloturee",
    "closed_by_role": "admin",
    "closed_at": "2026-07-07T23:15:00.000Z",
    "total_debit": 118000.00,
    "total_credit": 118000.00,
    "ecart": 0,
    "reports_generated": 6,
    "justification": null,
    "warnings": [],
    "error_details": null
  },
  "revenue_breakdown": [
    { "category": "lodging", "amount_ht": 85000.00, "tva_rate": 0.20, "tva_amount": 17000.00, "amount_ttc": 102000.00 },
    { "category": "fb", "amount_ht": 12000.00, "tva_rate": 0.20, "tva_amount": 2400.00, "amount_ttc": 14400.00 },
    { "category": "extras", "amount_ht": 3000.00, "tva_rate": 0.20, "tva_amount": 600.00, "amount_ttc": 3600.00 },
    { "category": "tourism_tax", "amount_ht": -2000.00, "tva_rate": 0, "tva_amount": 0, "amount_ttc": -2000.00 }
  ],
  "payment_summary": [
    { "payment_method": "card", "total_amount": 75000.00, "transaction_count": 45 },
    { "payment_method": "cash", "total_amount": 28000.00, "transaction_count": 30 },
    { "payment_method": "wire_transfer", "total_amount": 15000.00, "transaction_count": 5 }
  ],
  "debtors_summary": [
    { "debtor_name": "Agence Atlas Voyages", "debtor_reference": "ATL-2026-001", "amount": 4200.00, "invoice_count": 3 }
  ]
}
```

**Frontend mapping**: `mapClosureDetail()` in `lib/api/nightAudit.ts`

---

### 6. GET /api/night-audit/history/:business_date/reports

**Purpose**: List PDF reports for a specific closure
**Roles**: admin, comptable

**Response 200**:
```json
{
  "reports": [
    {
      "id": "rpt_001",
      "type": "revenue_daily",
      "name": "revenue_daily_2026-07-07.pdf",
      "file_size": 245760,
      "checksum": "a1b2c3d4e5f6",
      "checksum_algorithm": "MD5",
      "generated_at": "2026-07-07T23:15:05.000Z"
    }
  ]
}
```

**Frontend mapping**: Array of report objects, no mapping needed

---

### 7. GET /api/night-audit/history/:business_date/reports/:report_id

**Purpose**: Download PDF report (binary stream)
**Roles**: admin, comptable

**Response 200**: Binary PDF stream (`Content-Type: application/pdf`)

**Frontend usage**: Create blob URL and trigger download via `<a>` element

---

## Error Response Format

All error responses follow this shape (source: `errorHandler.js:1-18`):

```json
{
  "status": "CODE_ERREUR",
  "message": "Description lisible par un humain"
}
```

**Key names**: `status` (not `error`), `message`. No `statusCode` in the body
— the HTTP status code is in the response header, not the body.

Optional fields depending on context:
- `service`: name of the failing upstream service (only on 503 errors)

> Auth errors (401) use the same shape: `{ "status": "UNAUTHORIZED", "message": "..." }`

**Frontend error mapping** (FR-014):

| HTTP Status | `status` value | Frontend Message |
|-------------|---------------|------------------|
| 400 | `ECART_BLOCKED` | "Une justification est requise en cas d'écart" |
| 403 | `FORBIDDEN` | "Le manager ne peut pas clôturer en cas d'écart" |
| 409 | `ALREADY_CLOSED` | "La journée est déjà clôturée" |
| 503 | `SERVICE_UNAVAILABLE` | "Le service est temporairement indisponible. Veuillez réessayer." |
| 400 | `VALIDATION_ERROR` | "Le format de la date est invalide (attendu: YYYY-MM-DD)" |
| 500 | `INTEGRITY_ERROR` | "Erreur d'intégrité du fichier. Veuillez réessayer." |

> Note: `MANAGER_ECart_BLOCKED` is NOT an error response status value. The
> manager gets HTTP 403 with `status: "FORBIDDEN"`. The `MANAGER_ECart_BLOCKED`
> code appears only in `error_details` stored in the database closure record.
