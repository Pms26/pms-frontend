# Tasks: Night Audit Frontend — Connexion au Backend

**Input**: Design documents from `/specs/001-night-audit-frontend/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/night-audit-api.md, quickstart.md

**Tests**: No test framework configured in this project. Validation is done via quickstart.md scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared types and API layer that ALL user stories depend on

- [X] T001 Rewrite TypeScript types in `types/index.ts`: replace existing NightAuditStatus, Closure, NightAuditReport with backend-aligned types from `data-model.md` (NightAuditStatus extended with `status` raw field + `errorDetails`, Closure rewritten, NightAuditReport rewritten). Add new types: CheckBalanceResponse, ClosureDetail, RevenueBreakdown, PaymentSummary, DebtorSummary. Use camelCase field names per data-model.md. **⚠️ The existing Closure type (with `id: string`, `closedBy: string`) must be entirely replaced by the new backend-aligned type — not merged or kept in parallel.**
- [X] T002 Rewrite `getNightAuditStatus()` in `lib/api/nightAudit.ts` to call `GET /api/night-audit/status`, implement `mapBackendStatus()` mapping raw backend snake_case fields to frontend camelCase types. **⚠️ The existing `mapBackendStatus()` uses a flat `lastClosedDate` field — it must be replaced by the nested `lastClosure` object (`{ businessDate, closedAt, closedByRole } | null`) per data-model.md, not just added alongside it.** Preserve `USE_MOCKS` + `mockDelay()` fallback pattern.
- [X] T003 [P] Rewrite `getNightAuditReports()` in `lib/api/nightAudit.ts` (currently always returns mocks) to call `GET /api/night-audit/history/:business_date/reports` when `USE_MOCKS=false`. Return empty array if no closure exists yet. Per FR-022.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core API functions and infrastructure that MUST be complete before user story UI work can begin

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete

- [X] T004 Rewrite `checkBalance()` in `lib/api/nightAudit.ts` to call `POST /api/night-audit/check-balance` with `business_date` body. Return type must be `CheckBalanceResponse` from `data-model.md` (not `NightAuditCheck[]`). Implement `mapCheckBalance()` to map decomposition from backend `Record<string, number>` (key-value objects) to frontend `decomposition.debitSources`/`decomposition.creditSources`. Handle 409 ALREADY_CLOSED error.
- [X] T005 Rewrite `closeDay()` in `lib/api/nightAudit.ts` to call `POST /api/night-audit/close` with `{ business_date, justification? }` body. Implement `mapClosure()` mapping. Handle HTTP 201 success, and errors: 400 ECART_BLOCKED, 403 FORBIDDEN (manager with ecart — map to French message), 409 ALREADY_CLOSED, 503 SERVICE_UNAVAILABLE. Return mapped Closure with reports array (download_url is relative path, prepend gateway URL for admin).
- [X] T006 [P] Add `getClosureDetail(businessDate: string)` to `lib/api/nightAudit.ts` — calls `GET /api/night-audit/history/:business_date`. Implement `mapClosureDetail()` mapping revenue_breakdown/payment_summary/debtors_summary from snake_case to camelCase. Per R5.
- [X] T007 [P] Add `getClosureReports(businessDate: string)` to `lib/api/nightAudit.ts` — calls `GET /api/night-audit/history/:business_date/reports`. Returns list of reports for a specific closure. Per R5.
- [X] T008 [P] Add `downloadReport(businessDate: string, reportId: string)` to `lib/api/nightAudit.ts` — calls `GET /api/night-audit/history/:business_date/reports/:report_id` with `responseType: 'blob'`. Creates blob URL and triggers download via `<a>` element. Per R5.
- [X] T009 Add error handling utility in `lib/api/nightAudit.ts`: a `mapNightAuditError()` function that takes HTTP status + error body (`{ status, message }`) and returns French user-facing messages per the error table in `contracts/night-audit-api.md` FR-014. Handle: 400 ECART_BLOCKED, 403 FORBIDDEN, 409 ALREADY_CLOSED, 503 SERVICE_UNAVAILABLE, 500 INTEGRITY_ERROR.

**Checkpoint**: All API functions implemented — user story UI work can now begin

---

## Phase 3: User Story 1 — Consulter le statut (Priority: P1) 🎯 MVP

**Goal**: Display current business day status on /night-audit page (date, status, last closure details)

**Independent Test**: Navigate to /night-audit → see business date, status badge "En cours"/"Échoué", and last closure info if exists (quickstart Scenario 1)

### Implementation for User Story 1

- [X] T010 [US1] Rewrite status display section in `app/night-audit/page.tsx`: replace hardcoded/mock data with `useQuery` calling `getNightAuditStatus()` from `lib/api/nightAudit.ts`. Display `businessDate`, status badge (green "En cours" / red "Échoué"), `errorDetails` when status is "echouee". Show `lastClosure` section with date/time/role when not null. Add skeleton loading state during fetch. Per FR-001, FR-002, FR-003.

**Checkpoint**: Status page shows real backend data

---

## Phase 4: User Story 2 — Vérifier l'équilibre (Priority: P1)

**Goal**: Check-balance button displays debit/credit totals, ecart, and decomposition by source

**Independent Test**: Click "Vérifier l'équilibre" → see totals, ecart indicator, decomposition table (quickstart Scenario 2)

### Implementation for User Story 2

- [X] T011 [US2] Rewrite check-balance section in `app/night-audit/page.tsx`: replace hardcoded `NightAuditCheck[]` grid with a "Vérifier l'équilibre" button triggering `useMutation` calling `checkBalance()`. Display results: `totalDebit`, `totalCredit`, `ecart` with visual indicator (green "Équilibré" if ecart=0, orange/red "Écart détecté" if ecart≠0). Show decomposition by source from `decomposition.debitSources`/`decomposition.creditSources` as key-value pairs. Handle 503 SERVICE_UNAVAILABLE with retry message. Per FR-004, FR-005.

**Checkpoint**: Check-balance shows real backend data with decomposition

---

## Phase 5: User Story 3 — Clôturer la journée (Priority: P1)

**Goal**: Close button triggers closure with confirmation modal, shows results (reports, warnings), handles all error cases

**Independent Test**: Click "Clôturer" → confirm → see success/reports/errors (quickstart Scenarios 3-6)

**Prerequisite**: User Story 2 (check-balance) must be functional

### Implementation for User Story 3

- [X] T012 [US3] Refactor closure confirmation modal in `app/night-audit/page.tsx` + `components/context/ModalToastContext.tsx` + `components/layout/GlobalModals.tsx`: move inline confirmation modal to GlobalModals pattern (R7). Add `isClosureConfirmOpen`, `openClosureConfirm()`, `closeClosureConfirm()` to ModalToastContext. Render `ClosureConfirmModal` in GlobalModals.tsx. Remove `adminPassword` state (R8 — backend uses JWT, password field is UI-only artifact). Per FR-006, FR-007.
- [X] T013 [US3] Implement close mutation in `app/night-audit/page.tsx`: `useMutation` calling `closeDay()`. On success: display reports list with download icons (admin only — per FR-012, FR-020), show warnings as non-blocking amber alerts (FR-011), update business date display. Handle errors via `mapNightAuditError()`: ECART_BLOCKED (admin without justification), FORBIDDEN (manager with ecart — FR-008), ALREADY_CLOSED, SERVICE_UNAVAILABLE. Per FR-014.
- [X] T014 [US3] Add check-balance prerequisite gating in `app/night-audit/page.tsx`: track whether `checkBalance()` has been called at least once in session via local state. When not checked, "Clôturer" button is disabled (grised `opacity-50 cursor-not-allowed`). Enable only after check-balance results are displayed. Per FR-006, FR-026, User Story 3 scenario 8.

**Checkpoint**: Full closure workflow functional — status, check-balance, close with all error cases

---

## Phase 6: User Story 4 — Masquer actions pour comptable (Priority: P2)

**Goal**: Comptable role sees status and check-balance but not close button or irreversible warning

**Independent Test**: Login as comptable → /night-audit shows no close button (quickstart Scenario 7)

### Implementation for User Story 4

- [X] T015 [P] [US4] Add role-based visibility in `app/night-audit/page.tsx`: read role from `useAuthStore((s) => s.user)?.role`. Hide "Lancer la Clôture" button and "Opération Irréversible" warning when role is `comptable`. Check-balance remains visible. Per FR-009, FR-010.

**Checkpoint**: Comptable role UI restriction functional

---

## Phase 7: User Story 5 — Historique des clôtures (Priority: P2)

**Goal**: History page shows real list of past closures sorted by date descending

**Independent Test**: Navigate to /night-audit/history → see real closure list (quickstart Scenario 8)

### Implementation for User Story 5

- [X] T016 [US5] Rewrite history page in `app/night-audit/history/page.tsx`: replace mock data with `useQuery` calling `getClosureHistory()` from `lib/api/nightAudit.ts`. Display table with columns per R12: Date Métier, Statut (badge), Clôturé le, Par (role), Total Débit, Total Crédit, Écart, Rapports. Show "N/A" or dash for null totals (FR-017). Empty state: "Aucune clôture disponible". Add skeleton loading. Per FR-015, FR-016.

**Checkpoint**: History page shows real backend data

---

## Phase 8: User Story 6 — Détail clôture en modal (Priority: P2)

**Goal**: Click on closure row opens modal with revenue breakdown, payment summary, debtors summary

**Independent Test**: Click closure in history → modal shows financial detail (quickstart Scenario 9)

### Implementation for User Story 6

- [X] T017 [US6] Add ClosureDetailModal to `components/layout/GlobalModals.tsx`: render revenue breakdown table (category, HT, TVA rate, TVA amount, TTC), payment summary (method, total, count), debtors summary (name, reference, amount, invoice count). Close on X or outside click. Per FR-018.
- [X] T018 [US6] Add detail modal state to `components/context/ModalToastContext.tsx`: add `closureDetailDate: string | null`, `openClosureDetail(date: string)`, `closeClosureDetail()`. Per C2.
- [X] T019 [US6] Wire closure row click in `app/night-audit/history/page.tsx`: on row click, call `openClosureDetail(businessDate)` from ModalToastContext. The modal then calls `getClosureDetail()` via `useQuery` with the selected date. Per FR-018.

**Checkpoint**: Closure detail modal functional from history page

---

## Phase 9: User Story 7 — Téléchargement rapports PDF (Priority: P3)

**Goal**: Admin and comptable can download PDF reports from history; manager/comptable see metadata only from close response

**Independent Test**: Click download icon on report → PDF downloads (quickstart Scenarios 10-11)

### Implementation for User Story 7

- [X] T020 [US7] Add download buttons in ClosureDetailModal (`components/layout/GlobalModals.tsx`): for each report, show download icon (admin + comptable — backend allows both on GET /history/:date/reports/:report_id). Call `downloadReport()` which uses `responseType: 'blob'`. Per FR-020.
- [X] T021 [US7] Handle download_url visibility in close response display (`app/night-audit/page.tsx`): after successful closure, show report metadata for all roles but download links only for admin (download_url is only present for admin in POST /close response). Manager and comptable see type/name only. Per FR-021, C4.

**Checkpoint**: PDF download functional for admin and comptable from history

---

## Phase 10: Validation — getNightAuditReports() (Priority: P2)

**Goal**: Verify that T003 correctly implemented `getNightAuditReports()` to call the real backend

**Independent Test**: Set USE_MOCKS=false → function returns real report types (quickstart Scenario 12)

### Validation Checkpoint (no new code — verify T003)

Confirm that `getNightAuditReports()` in `lib/api/nightAudit.ts`:
- Calls `GET /api/night-audit/history/:business_date/reports` when `USE_MOCKS=false`
- Returns `NightAuditReport[]` from data-model.md with camelCase fields (`fileSize`, `generatedAt`, `downloadUrl` — NOT snake_case)
- Returns empty array when no closure exists
- Per FR-022, FR-025

**Checkpoint**: No mocks returned when USE_MOCKS=false — T003 correctly implemented

---

## Phase 11: User Story 9 — États de chargement et d'erreur (Priority: P2)

**Goal**: All API actions show loading spinners and explicit French error messages

**Independent Test**: Simulate slow/error API → see appropriate loading/error states (quickstart Scenarios 13-14)

### Implementation for User Story 9

- [X] T023 [US9] Add loading states across all sections in `app/night-audit/page.tsx`: skeleton/spinner during status fetch (`useQuery isLoading`), during check-balance mutation (`useMutation isPending`), during close mutation. Each section independently shows loading without blocking others. Per User Story 9 scenario 1.
- [X] T024 [US9] Add error states across all sections in `app/night-audit/page.tsx`: display French error messages from `mapNightAuditError()` inline in each section (not page-level crash). Handle: network error, timeout, 5xx (generic "Erreur réseau"), plus specific errors per FR-014. Per User Story 9 scenarios 2-4.

**Checkpoint**: Loading and error states complete across all user stories

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T025 [P] Run quickstart.md validation: go through all 14 scenarios in `specs/001-night-audit-frontend/quickstart.md` with `USE_MOCKS=false` and verify each scenario passes against the real backend.
- [ ] T026 Verify `middleware.ts` ROLE_RESTRICTIONS: confirm `/night-audit` allows admin/manager/comptable, `/night-audit/history` allows admin/comptable (manager gets 403 from backend). No code changes expected — verification only.
- [ ] T027 Verify constitution compliance: all API functions use `apiClient` from `lib/api/client.ts` (Principle I), `useQuery`/`useMutation` used directly in components (Principle IV), no external UI libs (Principle V), French-only strings, TypeScript strict with no `any`.
- [X] T028 Code cleanup: remove dead code from original mock-based implementation (old NightAuditCheck type, MOCK_CHECKS array, admin password validation logic, any unused imports in page files).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist before API functions can return them)
- **User Stories (Phase 3+)**: All depend on Phase 2 completion
  - Phase 3 (US1) and Phase 4 (US2) can proceed in parallel after Phase 2
  - Phase 5 (US3) depends on Phase 4 (check-balance prerequisite)
  - Phases 6-11 (US4-US9) depend on Phase 2 but are independent of each other
- **Polish (Phase 12)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US3 (P1)**: Depends on US2 (check-balance prerequisite gating)
- **US4 (P2)**: Can start after Phase 2 — no dependencies on other stories
- **US5 (P2)**: Can start after Phase 2 — no dependencies on other stories
- **US6 (P2)**: Depends on US5 (modal opens from history row)
- **US7 (P3)**: Depends on US6 (download from detail modal)
- **US8 (P2)**: Covered by T003 in Phase 1 — Phase 10 is a validation checkpoint only (no new code)
- **US9 (P2)**: Can start after Phase 2 — depends on US1-US3 for error handling scope

### Within Each User Story

- Models/types before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T003, T006, T007, T008 (Phase 1-2 API functions) can all run in parallel
- US1 and US2 can be implemented in parallel after Phase 2
- US4, US5 can be implemented in parallel
- US6 and US7 can be implemented in parallel once US5 is done

---

## Parallel Example: Phase 1-2 API Functions

```bash
# All API functions can be implemented in parallel (different functions, same file but no interdependency):
Task: T003 — Rewrite getNightAuditReports() in lib/api/nightAudit.ts
Task: T006 — Add getClosureDetail() in lib/api/nightAudit.ts
Task: T007 — Add getClosureReports() in lib/api/nightAudit.ts
Task: T008 — Add downloadReport() in lib/api/nightAudit.ts
```

## Parallel Example: User Stories after Foundational

```bash
# After Phase 2 completes, these can all start in parallel:
Task: T010 — US1: Status display in app/night-audit/page.tsx
Task: T011 — US2: Check-balance in app/night-audit/page.tsx
Task: T015 — US4: Comptable role hiding in app/night-audit/page.tsx
Task: T016 — US5: History list in app/night-audit/history/page.tsx
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup (types + getNightAuditStatus + getNightAuditReports)
2. Complete Phase 2: Foundational (checkBalance, closeDay, error handling, new API functions)
3. Complete Phase 3: US1 (status display)
4. Complete Phase 4: US2 (check-balance)
5. Complete Phase 5: US3 (closure with confirmation modal, prerequisite gating)
6. **STOP and VALIDATE**: Run quickstart Scenarios 1-6
7. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Add US1 + US2 + US3 → Test (Scenarios 1-6) → Deploy/Demo (MVP!)
3. Add US4 → Test (Scenario 7) → Deploy/Demo
4. Add US5 + US6 → Test (Scenarios 8-9) → Deploy/Demo
5. Add US7 → Test (Scenarios 10-11) → Deploy/Demo
6. Add US9 → Test (Scenarios 12-14) → Deploy/Demo

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 + Phase 2 together
2. Once foundational is done:
   - Developer A: US1 + US2 + US3 (MVP core)
   - Developer B: US4 + US5 (independent UI tasks)
   - Developer C: US6 + US7 + US9 (modal + error handling)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify quickstart scenarios pass after each story phase
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All TypeScript field names use camelCase per data-model.md (NOT snake_case from research.md examples)
- `download_url` in POST /close response is a relative path — frontend must prepend gateway URL
- `MANAGER_ECart_BLOCKED` is a DB code only — HTTP response is 403 FORBIDDEN
- Rollover is explicitly out of scope (C1) — no "Avancer la date" button
