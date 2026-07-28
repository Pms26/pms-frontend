# Data Model: Night Audit Frontend

**Feature**: 001-night-audit-frontend
**Date**: 2026-07-27

## Overview

This document defines the TypeScript types that map backend API responses to
frontend data structures. Types are defined in `types/index.ts` and mapped
in `lib/api/nightAudit.ts`.

## Types

### NightAuditStatus (extended)

Maps from `GET /api/night-audit/status` response.

```typescript
interface NightAuditStatus {
  businessDate: string;                    // "2026-07-08"
  status: "en_cours" | "echouee";         // raw backend status
  isOpen: boolean;                         // derived: status === "en_cours"
  lastClosure: {
    businessDate: string;
    closedAt: string;                      // ISO timestamp
    closedByRole: string;                  // "admin" | "manager"
  } | null;
  errorDetails: {
    service: string;                       // e.g. "service-frontoffice"
    code: string;                          // e.g. "SERVICE_UNAVAILABLE"
  } | null;                                // only when status === "echouee"
}
```

**Mapping rules** (in `mapBackendStatus()`):
- `raw.business_date` → `businessDate`
- `raw.status` → `status` (raw) + `isOpen` (derived)
- `raw.last_closure` → `lastClosure` (with field mapping)
- `raw.error_details` → `errorDetails` (key is `code`, not `error_code`)

---

### CheckBalanceResponse (new)

Maps from `POST /api/night-audit/check-balance` response.

```typescript
interface CheckBalanceResponse {
  businessDate: string;
  equilibre: boolean;
  totalDebit: number;
  totalCredit: number;
  ecart: number;
  decomposition: {
    debitSources: Record<string, number>;  // e.g. { "frontoffice": 42100.0 }
    creditSources: Record<string, number>; // e.g. { "payments": 38500.0, "debtors": 6730.5 }
  };
}
```

**Mapping rules** (in `mapCheckBalance()`):
- `raw.business_date` → `businessDate`
- `raw.equilibre` → `equilibre`
- `raw.total_debit` → `totalDebit`
- `raw.total_credit` → `totalCredit`
- `raw.ecart` → `ecart`
- `raw.decomposition.debit_sources` → `decomposition.debitSources`
- `raw.decomposition.credit_sources` → `decomposition.creditSources`

> Backend decomposition uses objects (key-value pairs), not arrays.
> Source: `closureService.js:128-143`

---

### Closure (rewritten)

Maps from `GET /api/night-audit/history` and `POST /api/night-audit/close` responses.

```typescript
interface Closure {
  businessDate: string;                    // "2026-07-08" — primary key
  status: "cloturee" | "echouee";
  closedByRole: string;                    // "admin" | "manager"
  closedAt: string;                        // ISO timestamp
  totalDebit: number | null;               // null if status === "echouee"
  totalCredit: number | null;              // null if status === "echouee"
  ecart: number | null;                    // null if status === "echouee"
  reportsGenerated: number;
  justification?: string;                  // only in /close response and /history/:date
  warnings?: Array<{                       // only in /close response
    report: string;
    reason: string;
  }>;
  errorDetails?: {                         // only when status === "echouee"
    code: string;                          // e.g. "MANAGER_ECart_BLOCKED"
  };
}
```

**Mapping rules** (in `mapClosure()`):
- `raw.business_date` → `businessDate`
- `raw.status` → `status`
- `raw.closed_by_role` → `closedByRole`
- `raw.closed_at` → `closedAt`
- `raw.total_debit` → `totalDebit`
- `raw.total_credit` → `totalCredit`
- `raw.ecart` → `ecart`
- `raw.reports_generated` → `reportsGenerated`
- `raw.justification` → `justification`
- `raw.warnings` → `warnings`
- `raw.error_details` → `errorDetails`

---

### ClosureDetail (new)

Maps from `GET /api/night-audit/history/:business_date` response.

```typescript
interface ClosureDetail {
  closure: Closure;
  revenueBreakdown: RevenueBreakdown[];
  paymentSummary: PaymentSummary[];
  debtorsSummary: DebtorSummary[];
}
```

---

### RevenueBreakdown

```typescript
interface RevenueBreakdown {
  category: "lodging" | "fb" | "extras" | "tourism_tax";
  amountHt: number;
  tvaRate: number;                         // e.g., 0.20 for 20%
  tvaAmount: number;
  amountTtc: number;
}
```

---

### PaymentSummary

```typescript
interface PaymentSummary {
  paymentMethod: "cash" | "card" | "wire_transfer";
  totalAmount: number;
  transactionCount: number;
}
```

---

### DebtorSummary

```typescript
interface DebtorSummary {
  debtorName: string;                      // agency/corporate name
  debtorReference: string;
  amount: number;                          // total amount due
  invoiceCount: number;
}
```

**Mapping rules**:
- `raw.debtor_name` → `debtorName`
- `raw.debtor_reference` → `debtorReference`
- `raw.amount` → `amount`
- `raw.invoice_count` → `invoiceCount`

> Source: `historyService.js:27-88`

---

### NightAuditReport (rewritten)

Maps from `GET /api/night-audit/history/:business_date/reports` response.

```typescript
interface NightAuditReport {
  id: string;
  type: string;                            // revenue_daily, receipts_daily, debtors,
                                           // departures, arrivals, occupancy_forecast
  name: string;                            // display name
  fileSize?: number;                       // bytes
  checksum?: string;
  generatedAt?: string;                    // ISO timestamp
  downloadUrl?: string;                    // only in /close response for admin
}
```

**UI-derived properties** (NOT stored in type, computed in component):

| Report Type | Icon | Color |
|------------|------|-------|
| `revenue_daily` | `bi-cash-stack` | green |
| `receipts_daily` | `bi-receipt` | blue |
| `debtors` | `bi-people` | amber |
| `departures` | `bi-box-arrow-right` | red |
| `arrivals` | `bi-box-arrow-in-right` | teal |
| `occupancy_forecast` | `bi-calendar-event` | indigo |

---

## Relationships

```
NightAuditStatus
  └── lastClosure: Closure (subset: businessDate, closedAt, closedByRole)

Closure
  └── businessDate → ClosureDetail.closure
       ├── revenueBreakdown: RevenueBreakdown[]
       ├── paymentSummary: PaymentSummary[]
       └── debtorsSummary: DebtorSummary[]

Closure
  └── businessDate → NightAuditReport[] (via /history/:date/reports)
```

## State Transitions

### Closure Status
```
[no closure] → en_cours (GET /status)
en_cours → cloturee (POST /close, success)
en_cours → echouee (POST /close, failure)
echouee → cloturee (POST /close, retry success)
cloturee → (terminal, rejectIfClosed blocks further operations)
```

### Check-Balance Prerequisite (UI state)
```
[session start] → not_checked (close button disabled)
not_checked → checked (after POST /check-balance succeeds)
checked → not_checked (page refresh or new session)
```

## Validation Rules

| Field | Rule | Source |
|-------|------|--------|
| `business_date` | Format YYYY-MM-DD, validated client-side | FR-013 |
| `justification` | Required when ecart !== 0 and role === admin | FR-007 |
| `status` | Backend returns only "en_cours" or "echouee" for /status | docs/night-audit.md |
| `reports` | Empty array if no closure exists yet | Edge case |
