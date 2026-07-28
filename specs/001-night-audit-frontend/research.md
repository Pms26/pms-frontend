# Research: Night Audit Frontend — Connexion au Backend

**Feature**: 001-night-audit-frontend
**Date**: 2026-07-27

## R1. NightAuditStatus type mismatch with backend `/status` response

**Decision**: Extend `NightAuditStatus` to include `status` as `"en_cours" | "echouee"` (raw string)
instead of only `isOpen: boolean`. Add `error_details`, `closed_by_role`, and `closed_at` fields.

**Rationale**: The backend returns `status: "en_cours" | "echouee"` and optional `error_details`.
The current frontend loses the error state by mapping to `isOpen: boolean`. The `last_closure`
object also contains `closed_by_role` and `closed_at` which are needed for User Story 1
scenario 4.

**Alternatives considered**:
- Keep `isOpen` as derived field + add raw `status` → chosen approach (backward compatible)
- Remove `isOpen` entirely → rejected (breaking change for existing components)

## R2. Closure type completely mismatches backend `/history` response

**Decision**: Rewrite `Closure` interface to match backend response shape:
```typescript
interface Closure {
  business_date: string;
  status: "cloturee" | "echouee";
  closed_by_role: string;
  closed_at: string;
  total_debit: number | null;
  total_credit: number | null;
  ecart: number | null;
  reports_generated: number;
  error_details?: { code: string };  // e.g. "MANAGER_ECart_BLOCKED" — stored in DB only
}
```
Keep a `ClosureViewModel` or inline mapping for the history table UI.

**Rationale**: The backend `/history` returns `business_date` as identifier (not `id`),
`closed_by_role` (not `closed_by` user name), and includes `status`, `total_credit`,
`ecart`, `reports_generated` which are all required by the spec (FR-015 to FR-017).
The frontend `revenue` and `occupancyRate` fields are not returned by the backend.

**Alternatives considered**:
- Add a mapping layer that creates synthetic `id` and `revenue` → rejected (pretends data exists)
- Keep old type, map only available fields → rejected (loses spec-required data)

## R3. NightAuditReport is static catalog, not dynamic backend data

**Decision**: Replace the static `NightAuditReport` type with a backend-aligned type:
```typescript
interface NightAuditReport {
  id: string;
  type: string; // revenue_daily, receipts_daily, debtors, departures, arrivals, occupancy_forecast
  name: string;
  file_size?: number;
  checksum?: string;
  generated_at?: string;
  download_url?: string; // only in /close response for admin
}
```
The static `icon`, `label`, `color` fields become UI-only derived properties in the
component (not stored in the type).

**Rationale**: The backend returns actual generated reports with IDs, file sizes, and
checksums. The static catalog (`icon`, `label`, `color`) was a placeholder. The 6 report
types can be mapped to icons/colors in the UI layer.

**Alternatives considered**:
- Keep both types (backend + UI) → rejected (unnecessary complexity, one type suffices)
- Extend existing type with backend fields → rejected (too many unrelated fields)

## R4. getNightAuditReports() always returns mocks

**Decision**: Rewrite `getNightAuditReports()` to call `GET /api/night-audit/history/:business_date/reports`
with the current business date. Return empty array if no closure exists yet.

**Rationale**: FR-022 requires this function to call the real backend when `USE_MOCKS=false`.
The backend endpoint returns actual generated reports for a given closure date.

**Alternatives considered**:
- Fetch reports from `/close` response → rejected (only available immediately after closure)
- Use `/history` list endpoint → rejected (doesn't return individual reports)

## R5. Missing API functions for history detail and report download

**Decision**: Add three new functions to `lib/api/nightAudit.ts`:

1. `getClosureDetail(businessDate: string)` → `GET /api/night-audit/history/:business_date`
   Returns closure detail with revenue_breakdown, payment_summary, debtors_summary.

2. `getClosureReports(businessDate: string)` → `GET /api/night-audit/history/:business_date/reports`
   Returns list of reports for a specific closure.

3. `downloadReport(businessDate: string, reportId: string)` → `GET /api/night-audit/history/:business_date/reports/:report_id`
   Returns binary PDF stream. Use `responseType: 'blob'` on apiClient.

**Rationale**: These endpoints exist in the backend but have no frontend implementation.
They are required for User Stories 5, 6, and 7.

**Alternatives considered**:
- Fetch all data from `/history` list → rejected (list endpoint doesn't include detail/reports)
- Use client-side PDF generation → rejected (PDFs are server-generated)

## R6. CheckBalance type doesn't match backend response

**Decision**: Create a new `CheckBalanceResponse` type matching the backend:
```typescript
interface CheckBalanceResponse {
  business_date: string;
  equilibre: boolean;
  total_debit: number;
  total_credit: number;
  ecart: number;
  decomposition: {
    debit_sources: Record<string, number>;  // e.g. { "frontoffice": 42100.0 }
    credit_sources: Record<string, number>; // e.g. { "payments": 38500.0, "debtors": 6730.5 }
  };
}
```
Replace the current `NightAuditCheck[]` pattern with this structured response.

**Rationale**: The backend `/check-balance` returns a structured decomposition object
with **key-value pairs** (source name as key, amount as value), NOT an array. The
current `NightAuditCheck[]` type was a UI placeholder that doesn't match the backend
shape. Source: `closureService.js:128-143`.

**Note on MANAGER_ECart_BLOCKED**: This code does NOT appear in any HTTP error
response. When a manager attempts to close with an ecart, the backend returns
HTTP **403** with `status: "FORBIDDEN"` and `message: "Manager cannot close
with ecart"`. The `MANAGER_ECart_BLOCKED` string only appears in the
`error_details.code` field stored in the database `daily_closures` record
(`closureService.js:197-226`). The frontend must intercept HTTP 403 on
`POST /close` and map it to the message "Le manager ne peut pas clôturer
en cas d'écart".

**Alternatives considered**:
- Map decomposition to NightAuditCheck[] → rejected (lossy,pretends checks exist)
- Keep both types → rejected (unnecessary)

## R7. Confirmation modal uses inline pattern, not GlobalModals

**Decision**: Refactor the closure confirmation modal to use the GlobalModals pattern:
add `isClosureConfirmOpen`, `openClosureConfirm()`, `closeClosureConfirm()` to
`ModalToastContext`, and render the modal in `GlobalModals.tsx` as `ClosureConfirmModal`.

**Rationale**: Constitution Principle V mandates using existing design patterns. The
GlobalModals pattern is the established way to manage modals in this codebase. The
current inline modal with raw Bootstrap CSS classes is inconsistent.

**Alternatives considered**:
- Keep inline modal → rejected (inconsistent with codebase patterns)
- Create a new modal component outside GlobalModals → rejected (breaks pattern)

## R8. Admin password field is UI-only, never sent to backend

**Decision**: Remove the `adminPassword` state and validation logic from the page.
The backend `/close` endpoint does not accept a password field — it uses JWT-based
authentication. The password field was a UI artifact with no server-side equivalent.

**Rationale**: The `closeDay()` function never sends the password. The backend validates
the user's role via JWT. The password field creates confusion (user thinks it's required
but it's never used).

**Alternatives considered**:
- Send password to backend → rejected (backend doesn't accept it)
- Keep as UI-only confirmation → rejected (misleading, spec says "avec confirmation"
  which is handled by the modal itself, not a password)

## R9. NightAuditCheck[] doesn't exist in backend

**Decision**: Remove `NightAuditCheck` type entirely. Replace the pre-audit checks
grid with the actual check-balance results from `POST /check-balance`. The frontend
currently hardcodes 6 check items; the backend returns a decomposition object.

The page will show:
- A "Vérifier l'équilibre" button (not automatic checks on load)
- Results displayed after user clicks the button (decomposition by source)

**Rationale**: The backend `/status` endpoint does NOT return individual checks.
The `/check-balance` endpoint returns the decomposition. The spec (User Story 2)
describes check-balance as a user-initiated action, not an automatic load.

**Alternatives considered**:
- Create synthetic checks from decomposition → rejected (pretends data exists)
- Keep hardcoded checks → rejected (not connected to backend)

## R10. Middleware ROLE_RESTRICTIONS more permissive than backend for history

**Decision**: Leave frontend middleware as-is. The frontend middleware allows
`admin`, `manager`, `comptable` on `/night-audit/history`, but the backend only
allows `admin`, `comptable`. The backend will reject manager requests with 403.

**Rationale**: The middleware is a first-pass filter. The backend enforces the actual
permissions. Adding manager to the frontend middleware allows the manager to see
the history page but they'll get a 403 from the backend — which is handled by
the error state in the query. Changing the middleware would be a separate concern.

**Alternatives considered**:
- Remove manager from frontend ROLE_RESTRICTIONS → rejected (middleware.ts is
  "not modified" per spec assumptions)
- Add manager to backend → rejected (out of scope)

## R11. mapBackendStatus() hardcodes checks, loses error state

**Decision**: Rewrite `mapBackendStatus()` to:
1. Map `status: "en_cours"` → display status
2. Map `status: "echouee"` → display error state with `error_details`
3. Remove hardcoded `checks: MOCK_CHECKS`
4. Map `last_closure` with all fields (business_date, closed_at, closed_by_role)

**Rationale**: The mapping function is the bridge between backend and frontend types.
It must preserve all backend data, not discard it.

**Alternatives considered**:
- Delete mapping function, use raw backend types → rejected (breaks Principle III)
- Keep mapping but add missing fields → chosen approach

## R12. History page table columns don't match backend data

**Decision**: Update history table columns to match backend `/history` response:
- Replace `ID` column with `Date Métier` (business_date)
- Replace `CA Jour` (revenue) with `Total Débit` (total_debit)
- Add `Total Crédit` column
- Add `Écart` column
- Replace `T.O.` (occupancy rate — not in backend) with `Statut` (status badge)
- Keep `Clôturé le`, `Par`, `Justification` columns

**Rationale**: The backend doesn't return `revenue` or `occupancyRate`. The spec
(FR-016) requires displaying: date métier, statut, rôle du clôtureur, date/heure,
totaux débit/crédit, écart, nombre de rapports.

**Alternatives considered**:
- Keep old columns, fill with "N/A" → rejected (wastes space, doesn't match spec)
- Add new columns alongside old → rejected (too many columns)
