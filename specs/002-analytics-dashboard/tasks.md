# Tasks: Analytics Dashboard

**Input**: Design documents from `/specs/002-analytics-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, contracts/component-contracts.md, quickstart.md

**Tests**: Non requis (aucun framework de test dans package.json). Validation via `npm run build` + `npm run lint` + navigation manuelle.

**Organization**: Tasks grouped by user story in priority order (P1 → P2 → P3). Each story is independently buildable, testable, and verifiable via quickstart.md scenarios.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, or independent sections within same file with no line-range overlap)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: No project setup needed (dependencies already installed, branch exists)

- [X] T001 Verify branch `002-analytics-dashboard` exists and is up to date with base branch

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types and utility functions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Add new TypeScript interfaces to `types/index.ts`:
  `SegmentGroup`, `TrendMonth`, `TrendResponse`, `SegmentGroupsResponse`, `SegmentPieItem`, `SegmentBarItem`,
  `SegmentDistribution`, `ComparisonMetrics`, `ComparisonDeltas`, `MonthlyComparison`,
  `YTDComparisonItem`, `YTDComparisonResponse` — definitions per `data-model.md`
- [X] T003 [P] Add `formatDelta()` and `mapSegmentToGroup()` utility functions in `lib/api/analytics.ts`
  as exported helpers, with `SEGMENT_GROUP_COLORS` constant (`DIRECT→accent`, `OTA→emerald`,
  `PARTENAIRES→amber`, `AUTRES→#94a3b8`) per `contracts/component-contracts.md` §4–5

**Checkpoint**: Foundation ready — types and utilities available for all stories

---

## Phase 3: User Story 8 — Contrôle d'accès par rôle (Priority: P1)

**Goal**: Restreindre l'accès à `/dashboard` aux rôles admin/manager/comptable uniquement (middleware + sidebar)

**Independent Test**: Un receptionist ou housekeeping_supervisor accédant à `/dashboard` est redirigé
vers `/front-office` ou `/housekeeping`. Un admin/manager/comptable voit la page normalement.
Le lien "Tableau de bord" dans la sidebar n'apparaît que pour ces rôles.

**Coverage**: DASH-FR-027, DASH-FR-028

- [X] T005 [P] [US8] Add `/dashboard` to `ROLE_RESTRICTIONS` in `middleware.ts` with
  `['admin', 'manager', 'comptable']` — per spec DASH-FR-027
- [X] T006 [P] [US8] Update `Sidebar.tsx` to conditionally show "Tableau de bord" link
  only for admin/manager/comptable roles via `useAuthStore((s) => s.user)?.role` —
  per existing role-based UI pattern in sidebar (see `exploitationItems` filter pattern)

**Checkpoint**: US8 functional — unauthorized roles cannot access `/dashboard`

---

## Phase 4: User Story 1 — Visualiser les KPI du mois en cours (Priority: P1) 🎯 MVP

**Goal**: 6 cartes KPI (TO mensuel, TO journalier, ADR, RevPAR, DMS, CA mensuel) avec valeurs,
unités, deltas, skeletons, et fallback mock

**Independent Test**: Naviguer vers `/dashboard` → 6 cartes KPI visibles avec valeurs et
deltas. Pendant le chargement : skeletons gris. Delta T.O. Journalier toujours "—". API
indisponible → données mockées affichées.

**Coverage**: DASH-FR-001, DASH-FR-002, DASH-FR-003, DASH-FR-004, DASH-FR-005, DASH-FR-006, DASH-FR-030

- [X] T007 [US1] Refactor `getKPIs()` in `lib/api/analytics.ts` — update mock data to match
  spec values, update API mapping to handle `{ value, prevValue, evolution }` object format
  from `GET /api/analytics/dashboard` (see `contracts/api-contracts.md` §1). Ensure `evolution === null` →
  `delta=""`, `deltaType="neutral"`. Add try/catch fallback to mock. Keep existing function
  signature so existing consumers are unaffected.
- [X] T008 [US1] Rewrite `app/dashboard/page.tsx` KPISection: use `useQuery({ queryKey: ['kpis'],
  queryFn: getKPIs })`, render 6-column grid of `<KPICard>` components with inline skeleton
  (6 placeholder cards) during `isLoading`. Remove old inline skeleton and update section
  structure per DASH-FR-001 through DASH-FR-006. Remove `getRoomsSummary` import (no longer
  needed in dashboard — statut chambres is housekeeping domain, not analytics).

**Checkpoint**: US1 functional — 6 KPI cards visible with data/skeleton/delta behavior

---

## Phase 5: User Story 3 — Visualiser la tendance annuelle (Priority: P1)

**Goal**: Graphique dual-axis (TO% gauche, ADR DH droite) sur 12 mois avec sélecteur d'année

**Independent Test**: Graphique TO/ADR avec 12 mois, sélecteur année change les données,
année sans données → message "Aucune donnée pour l'année sélectionnée"

**Coverage**: DASH-FR-008, DASH-FR-009, DASH-FR-010, DASH-FR-011

- [X] T009 [US3] Add `getDashboardTrend(year: number)` in `lib/api/analytics.ts`:
  mock 12-month data array, `USE_MOCKS` check, `apiClient.get('/api/analytics/dashboard/trend', { params: { year } })`,
  try/catch with mock fallback, map backend `TrendMonth[]` to response shape. Per `contracts/api-contracts.md` §2.
- [X] T010 [P] [US3] Refactor `components/charts/EvolutionChart.tsx`: add `EvolutionChartProps`
  (`labels`, `occupancyData`, `adrData`, `year` — all optional). When props provided, use them
  instead of `getTarifs()`. When props empty, keep existing fallback for backward compatibility.
  Update Chart.js dataset configuration to use props data.
- [X] T011 [US3] Add TrendSection to `app/dashboard/page.tsx`: `useState<number>(currentYear)`
  for year selector, `useQuery({ queryKey: ['dashboard-trend', year], queryFn: () =>
  getDashboardTrend(year) })`, year `<select>` dropdown, `<EvolutionChart>` with trend data.
  Handle empty year (all months 0) → show "Aucune donnée pour l'année sélectionnée" message.
  Handle loading state → spinner in chart area.

**Checkpoint**: US3 functional — trend chart with year selector working

---

## Phase 6: User Story 2 — Périmètre des indicateurs (Priority: P2)

**Goal**: Informer l'utilisateur que les KPI excluent les réservations futures (statuts
checked_in/checked_out uniquement)

**Independent Test**: Survol de l'icône info → tooltip "Basé sur les séjours effectifs…".
Badge ou texte "Séjours effectifs uniquement" visible dans la section KPI.

**Coverage**: DASH-FR-007

- [X] T012 [US2] Add info tooltip to KPICard area in `app/dashboard/page.tsx`:
  `<i className="bi bi-info-circle" title="Basé sur les séjours effectifs (check-in/check-out), réservations futures exclues" />`
  next to section title. Add small footer text: `<p className="text-xs text-slate-500 mt-2">Séjours effectifs uniquement</p>`
  below KPI grid. Per DASH-FR-007.

**Checkpoint**: US2 functional — tooltip and badge visible on KPI section

---

## Phase 7: User Story 4 — Répartition par segment (Priority: P2)

**Goal**: Camembert (nuitées) + barres (CA) par segment, avec sélecteurs mois/année,
couleurs par groupe (accent/emerald/amber)

**Independent Test**: Deux graphiques (camembert + barres), sélecteurs mois/année,
couleurs DIRECT = accent, OTA = emerald, PARTENAIRES = amber

**Coverage**: DASH-FR-012, DASH-FR-013, DASH-FR-014, DASH-FR-015, DASH-FR-016, DASH-FR-017

- [X] T013 [P] [US4] Add `getSegmentGroups()` in `lib/api/analytics.ts`:
  `apiClient.get('/api/analytics/segments')`, mock data with `groups` map and `segments` list
  per `contracts/api-contracts.md` §3. try/catch with mock fallback.
- [X] T014 [P] [US4] Add `getSegmentDistribution(year: number, month: number)` in
  `lib/api/analytics.ts`: `apiClient.get('/api/analytics/segments/distribution', { params: { year, month } })`,
  mock data with `pieChart[]` and `barChart[]` per `contracts/api-contracts.md` §4.
  try/catch with mock fallback. Use `mapSegmentToGroup()` to assign group colors.
- [X] T015 [P] [US4] Refactor `components/charts/SegmentChart.tsx`: add `SegmentChartProps`
  (`type: 'doughnut' | 'bar'`, `pieData`, `barData` — all optional). When props provided,
  render Chart.js with props data. When empty, keep existing `getTarifs()` fallback.
  Support both doughnut and bar chart types based on `type` prop.
- [X] T016 [US4] Add SegmentSection to `app/dashboard/page.tsx`: `useState` for month and year
  selectors, `useQuery` for `getSegmentGroups()` (cached), `useQuery` for `getSegmentDistribution(year, month)`,
  render `<SegmentChart type="doughnut" pieData={...} />` and
  `<SegmentChart type="bar" barData={...} />`. Month/year changes re-trigger both charts.

**Checkpoint**: US4 functional — segment distribution charts with filters working

---

## Phase 8: User Story 5 — Comparaison YTD (Priority: P2)

**Goal**: Comparaison cumulée N vs N-1 pour occupation, ADR, RevPAR, revenu, avec filtre segment

**Independent Test**: Section "Comparaison N vs N-1" onglet "Cumul YTD" avec valeurs N, N-1, deltas.
Filtre segment filtre les données.

**Coverage**: DASH-FR-018, DASH-FR-020, DASH-FR-021, DASH-FR-022

- [X] T017 [US5] Add `getComparisonYTD(year: number, segment?: string)` in `lib/api/analytics.ts`:
  `apiClient.get('/api/analytics/comparison/ytd', { params: { year, segment } })`,
  mock data with `comparison[]` array per `contracts/api-contracts.md` §5.
  try/catch with mock fallback. Use `formatDelta()` for display-ready deltas.
- [X] T018 [US5] Add ComparisonSection with YTD tab to `app/dashboard/page.tsx`:
  `useState` for active tab ('ytd'), `useState` for segment filter, `useState` for year,
  `useQuery({ queryKey: ['comparison-ytd', year, segment], queryFn: () =>
  getComparisonYTD(year, segment) })`. Render YTD table: column headers N / N-1 / Delta,
  rows for occupancy, ADR, RevPAR, revenue. Delta null → "—" with `formatDelta()`.
  Segment filter as `<select>` with "Tous" + dynamic segment list.

**Checkpoint**: US5 functional — YTD comparison with segment filter working

---

## Phase 9: User Story 6 — Comparaison mensuelle (Priority: P2)

**Goal**: Comparaison mois par mois N vs N-1 avec filtre segment

**Independent Test**: Onglet "Mensuel" dans section comparaison, mois/année sélecteurs,
comparaison N vs N-1 avec deltas

**Coverage**: DASH-FR-019, DASH-FR-020, DASH-FR-021, DASH-FR-022

- [X] T019 [US6] Add `getComparisonMonthly(year: number, month: number, segment?: string)` in
  `lib/api/analytics.ts`: `apiClient.get('/api/analytics/comparison/monthly', { params: { year, month, segment } })`,
  mock data per `contracts/api-contracts.md` §6. Ensure `previous.* = 0` and `deltas.* = null`
  in mock for edge case testing. try/catch with mock fallback.
- [X] T020 [US6] Add Monthly tab to ComparisonSection in `app/dashboard/page.tsx`:
  extend `useState` for month selector (1–12), `useQuery({ queryKey: ['comparison-monthly',
  year, month, segment], queryFn: () => getComparisonMonthly(year, month, segment) })`.
  Add tab switcher between "Cumul YTD" and "Mensuel". Monthly view renders same table format
  but with `current`/`previous`/`deltas` from single-month response. Month/year/segment
  selectors shared or parallel with YTD view.

**Checkpoint**: US6 functional — monthly comparison with filters working

---

## Phase 10: User Story 7 — Arrivées et départs du jour (Priority: P3)

**Goal**: Listes arrivées/départs du jour avec données mockées et badge "Démo"

**Independent Test**: Deux encarts "Arrivées du jour" et "Départs du jour" avec badge "Démo".
Données mockées affichées en permanence.

**Coverage**: DASH-FR-023, DASH-FR-024, DASH-FR-025, DASH-FR-026

- [X] T021 [P] [US7] Add demo badge utility — create inline `<span className="badge bg-warning text-dark ms-2">Démo</span>`
  next to "Arrivées du jour" and "Départs du jour" section titles in `app/dashboard/page.tsx`.
  Per DASH-FR-025.
- [X] T022 [P] [US7] Render arrivals/departures lists in `app/dashboard/page.tsx`:
  use existing `getTodayArrivals()` and `getTodayDepartures()` (already mocked always per
  DASH-FR-026). Keep existing render pattern (avatar, client, room, time/balance).

**Checkpoint**: US7 functional — arrivals/departures with demo badge visible

---

## Phase 11: Validation Finale

**Purpose**: Valider que tous les edge cases sont gérés et que le build/lint passent

**Note — Success Criteria with qualitative verification**: SC-001 (KPI <3s), SC-002 (trend <2s),
SC-003 (segment <2s), SC-005 (redirect <1s), and SC-008 (gateway calls) are documented as
indicative performance/quality objectives. No automated performance test framework exists in the
project (see research.md §1.9). These criteria are verified qualitatively during manual navigation
of quickstart.md scenarios S1–S8 — not measured precisely. They are aspirational gates, not automated checks.

**Coverage**: Quickstart S9 (Edge cases API), S10 (Build + Lint)

- [X] T023 [P] Edge case validation:
  - Test `getComparisonMonthly` mock with `previous.* = 0` and `deltas.* = null` →
    verify "—" displayed instead of NaN/Infinity (DASH-FR-021)
  - Test `getDashboardTrend` with future year (e.g. 2027) → verify "Aucune donnée"
    message (DASH-FR-011)
  - Test `mapSegmentToGroup` with unknown code → verify "AUTRES" group returned
  - Test `formatDelta(null)` → `{ text: '—', type: 'neutral' }`
  - Test KPISection with `toJournalier.evolution = null` → delta "—", deltaType neutral
  - Test `USE_MOCKS=true` with backend down → mock data displayed, no error screen
  - Test rapid selector changes → React Query handles via queryKey invalidation
- [X] T024 [P] Verify DASH-FR-029 (never expose POST `/api/analytics/seed` in UI):
  Run `grep -r "/api/analytics/seed" app/ components/ --include="*.tsx" --include="*.ts"`
  — must return zero matches. If any match found, remove or audit the calling component
  to ensure no UI trigger exists.
- [X] T025 Run `npm run build` — verify zero TypeScript errors
- [X] T026 Run `npm run lint` — verify zero warnings/errors
- [X] T027 Run through ALL quickstart.md validation scenarios (S1–S10) manually in browser

**Checkpoint**: All stories complete, build clean, edge cases handled

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US8 (Phase 3)**: Depends on Foundational — no user story content can be exposed without access control
- **US1 (Phase 4)**: Depends on Foundational — first content story
- **US3 (Phase 5)**: Depends on Foundational + US1 (page.tsx foundation) — but can be parallel with US1 if TrendSection is extracted as separate component
- **US2 (Phase 6)**: Depends on US1 (uses KPISection)
- **US4 (Phase 7)**: Depends on Foundational + US1 (page.tsx restructure)
- **US5 (Phase 8)**: Depends on Foundational + US1 (ComparisonSection uses page.tsx layout)
- **US6 (Phase 9)**: Depends on US5 (extends ComparisonSection with Monthly tab)
- **US7 (Phase 10)**: Depends on US1 (page.tsx restructure — arrivals section rendered in same layout)
- **Validation (Phase 11)**: Depends on all user stories complete

### User Story Dependencies

- **US8 (P1)**: No story dependencies — can be first
- **US1 (P1)**: No story dependencies — can be parallel with US8, US3
- **US3 (P1)**: Can be parallel with US1 (different chart, different API function)
- **US2 (P2)**: Depends on US1 (adds tooltip/footer to KPISection)
- **US4 (P2)**: Depends on US1 (page.tsx restructure needed for layout section)
- **US5 (P2)**: Depends on US1 (ComparisonSection uses page.tsx layout)
- **US6 (P2)**: Depends on US5 (shares ComparisonSection tabs)
- **US7 (P3)**: Can be parallel with most stories (uses existing mock functions)

### Parallel Opportunities

- T002 + T003 (Foundational types/utilities) — parallel: different files
- T005 + T006 (US8 middleware + sidebar) — parallel: different files
- T007 + T005 + T006 (US1 API + US8) — parallel: different concerns
- T009 + T010 (US3 API + chart refactor) — parallel: different files
- T013 + T014 + T015 (US4 API functions + chart refactor) — parallel: different files
- T017 + T019 (US5 + US6 API functions) — parallel: different API functions
- T021 + T022 (US7 demo badge + arrivals list) — parallel: same file, independent sections with no line-range overlap

### Within Each User Story

- API functions before UI components
- Chart refactoring before integration in page.tsx
- Section independently testable in browser

---

## Implementation Strategy

### MVP (Phase 1–4: US8 + US1)

1. Setup + Foundational (types/utilities)
2. US8: middleware + sidebar (access control)
3. US1: KPI cards with mock fallback
4. **MVP STOP**: Dashboard page shows 6 KPI cards with skeletons and deltas. Access control working.
   Deployable/demoable.

### Incremental Delivery

1. **MVP**: US8 + US1 → 6 KPI cards with access control
2. **+ US3**: Trend chart with year selector
3. **+ US4**: Segment distribution charts
4. **+ US5 + US6**: Comparison N vs N-1 tabs
5. **+ US2**: KPI scope tooltip
6. **+ US7**: Arrivals/departures with demo badge
7. **Validation**: Edge cases + build/lint

### Parallel Team Strategy

With multiple developers:

1. Developer A: US8 + US1 (KPI + access control — MVP)
2. Developer B: US3 (trend chart) — parallel with Developer A's US1
3. Developer C: assists on US4 (segment charts) after US1 is done, then picks up US5 + US6
4. US4 and US5 both start only after US1 page.tsx restructure is complete
5. All merge independently; US6 requires US5 for tab structure

---

## Notes

- **[P]** tasks = different files, OR independent sections within the same file with no line-range overlap — can be parallel
- **[Story]** label maps task to specific user story for traceability
- Each user story independently testable via quickstart.md S1–S8 scenarios
- Verify `npm run build` passes after each task or logical group
- Commit after each task or group
- Stop at any checkpoint to validate story independently
- No new package dependencies required
- All API calls use `apiClient.get('/api/analytics/...')` — never direct fetch
- All API functions follow pattern: `USE_MOCKS → mockDelay() → return MOCK` / `try { apiClient } catch → return MOCK`
