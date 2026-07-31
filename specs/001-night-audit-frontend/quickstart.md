# Quickstart Validation Guide: Night Audit Frontend

**Feature**: 001-night-audit-frontend
**Date**: 2026-07-27

## Prerequisites

- Node.js 18+ installed
- Backend `service-night-audit` running on port 4007
- Api-gateway running on port 4000
- `NEXT_PUBLIC_API_URL=http://localhost:4000`
- `NEXT_PUBLIC_USE_MOCKS=false` (real backend mode)
- Valid JWT token for admin, manager, or comptable role

## Setup

```bash
# 1. Set environment variables
export NEXT_PUBLIC_API_URL=http://localhost:4000
export NEXT_PUBLIC_USE_MOCKS=false

# 2. Start dev server
npm run dev
```

## Validation Scenarios

### Scenario 1: Status Display (User Story 1)

**Route**: `/night-audit`
**Role**: admin, manager, or comptable

**Steps**:
1. Log in with a valid account
2. Navigate to `/night-audit`

**Expected**:
- Page displays current business date (e.g., "2026-07-08")
- Status badge shows "En cours" (green) or "Échoué" (red)
- If a previous closure exists: "Dernière clôture" section shows date, time, and role
- If no closure exists: no "Dernière clôture" section
- Skeleton loading appears during data fetch

**Backend call**: `GET /api/night-audit/status`

---

### Scenario 2: Check-Balance (User Story 2)

**Route**: `/night-audit`
**Role**: admin, manager, or comptable

**Steps**:
1. Navigate to `/night-audit`
2. Click "Vérifier l'équilibre"

**Expected**:
- Loading spinner appears during API call
- Results show: Total Débit, Total Crédit, Écart
- If balanced (écart = 0): green "Équilibré" indicator
- If unbalanced (écart ≠ 0): orange/red "Écart détecté" indicator
- Decomposition by source displayed (frontoffice, paiements, débiteurs)

**Backend call**: `POST /api/night-audit/check-balance`

---

### Scenario 3: Check-Balance Prerequisite (User Story 3, FR-026)

**Route**: `/night-audit`
**Role**: admin or manager

**Steps**:
1. Navigate to `/night-audit` (fresh session)
2. Observe the "Clôturer" button state

**Expected**:
- "Clôturer" button is **disabled** (grayed out) on initial load
- "Vérifier l'équilibre" button is active
- After clicking "Vérifier l'équilibre" and results appear, "Clôturer" becomes **enabled**

**Backend call**: `POST /api/night-audit/check-balance` (to enable close)

---

### Scenario 4: Closure — Balanced (User Story 3)

**Route**: `/night-audit`
**Role**: admin

**Steps**:
1. Click "Vérifier l'équilibre" (required first)
2. Click "Clôturer la journée"
3. Confirmation modal appears
4. Click "Confirmer"

**Expected**:
- Modal closes
- Success toast displayed
- 6 report items appear with download icons
- Business date advances to next day
- If warnings: orange warning banners shown below success message

**Backend call**: `POST /api/night-audit/close`

---

### Scenario 5: Closure — Unbalanced, Admin with Justification (User Story 3)

**Route**: `/night-audit`
**Role**: admin

**Steps**:
1. Trigger unbalanced check-balance
2. Click "Clôturer la journée"
3. Enter justification in modal
4. Click "Confirmer"

**Expected**:
- Closure succeeds with justification recorded
- Reports generated with warnings

**Backend call**: `POST /api/night-audit/close` with `justification`

---

### Scenario 6: Closure — Unbalanced, Manager Blocked (User Story 3)

**Route**: `/night-audit`
**Role**: manager

**Steps**:
1. Trigger unbalanced check-balance
2. Attempt to close

**Expected**:
- Error toast: "Le manager ne peut pas clôturer en cas d'écart"

**Backend call**: `POST /api/night-audit/close` → 403 `FORBIDDEN`
(message: "Manager cannot close with ecart")

---

### Scenario 7: Comptable Role Hiding (User Story 4)

**Route**: `/night-audit`
**Role**: comptable

**Steps**:
1. Log in as comptable
2. Navigate to `/night-audit`

**Expected**:
- Status section visible
- Check-balance button visible and functional
- "Clôturer" button NOT visible
- "Opération Irréversible" warning NOT visible

---

### Scenario 8: History List (User Story 5)

**Route**: `/night-audit/history`
**Role**: admin or comptable

**Steps**:
1. Navigate to `/night-audit/history`

**Expected**:
- Table shows closures sorted by date descending
- Columns: Date Comptable, Statut, Clôturé le, Par, Total Débit, Total Crédit, Écart, Rapports
- Failed closures show "N/A" for numeric fields
- Empty state: "Aucune clôture disponible" message

**Backend call**: `GET /api/night-audit/history`

---

### Scenario 9: Closure Detail Modal (User Story 6)

**Route**: `/night-audit/history`
**Role**: admin or comptable

**Steps**:
1. Navigate to `/night-audit/history`
2. Click on a closure row

**Expected**:
- Modal opens (GlobalModals pattern)
- Revenue breakdown table: category, HT, TVA rate, TVA amount, TTC
- Payment summary: method, total amount, transaction count
- Debtors summary: name, reference, amount due, invoice count
- Modal closes with X button or outside click

**Backend call**: `GET /api/night-audit/history/:business_date`

---

### Scenario 10: PDF Download (User Story 7)

**Route**: `/night-audit/history`
**Role**: admin

**Steps**:
1. Navigate to `/night-audit/history`
2. Open closure detail modal
3. Click download icon on a report

**Expected**:
- PDF file downloads to browser
- File opens correctly in PDF viewer

**Backend call**: `GET /api/night-audit/history/:business_date/reports/:report_id`

---

### Scenario 11: Comptable Download from History (User Story 7, C4)

**Route**: `/night-audit/history`
**Role**: comptable

**Steps**:
1. Log in as comptable
2. Navigate to `/night-audit/history`
3. Open closure detail modal

**Expected**:
- Download icons visible on report items (backend allows comptable)
- Downloads work correctly

**Backend call**: `GET /api/night-audit/history/:business_date/reports/:report_id`

---

### Scenario 12: No Mocks Returned (SC-008)

**Route**: `/night-audit`
**Role**: any

**Steps**:
1. Set `NEXT_PUBLIC_USE_MOCKS=false`
2. Navigate to `/night-audit`
3. Open browser DevTools Network tab

**Expected**:
- Real API calls visible in Network tab
- No mock data returned
- Responses match backend contract (see `contracts/night-audit-api.md`)

---

### Scenario 13: Error Handling — Service Unavailable (User Story 9)

**Route**: `/night-audit`
**Role**: admin

**Steps**:
1. Stop the backend service
2. Click "Vérifier l'équilibre"

**Expected**:
- Error message: "Le service est temporairement indisponible. Veuillez réessayer."
- No crash, no empty page

---

### Scenario 14: Error Handling — Already Closed (User Story 9)

**Route**: `/night-audit`
**Role**: admin

**Steps**:
1. Navigate to `/night-audit` when day is already closed
2. Attempt to close again

**Expected**:
- Error message: "La journée est déjà clôturée"

**Backend call**: `POST /api/night-audit/close` → 409 `ALREADY_CLOSED`
