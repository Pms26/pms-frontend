# Tasks: Module Analytics — Connexion Backend

**Input**: Design documents from `/specs/003-analytics-frontend/`

**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1–US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Project initialization — nothing to do. Project already created,
Next.js, dependencies, and chart components exist from previous modules.

No tasks — repository is ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cleanup, dead code removal, access control fixes, and new types
— MUST complete before any user story implementation.

**⚠️ CRITICAL**: All user stories depend on these tasks.

- [X] T001 [P] **Nettoyage code mort** dans `lib/api/analytics.ts` : supprimer
  `MOCK_KPIS`, `MOCK_SEGMENTS`, `MOCK_YTD`, `MOCK_MONTHLY`, `MOCK_ARRIVALS`,
  `MOCK_DEPARTURES`, `generateMockTrend()`, `generateMockSegmentDistribution()`,
  `generateMockComparisonYTD()`, `getTodayArrivals()`, `getTodayDepartures()`,
  `getSegmentAnalytics()`, `getYTDComparison()`, `getMonthlyData()`, `formatNum()`.
  Supprimer tous les blocs `if (USE_MOCKS) { ... }` dans toutes les fonctions
  restantes. Remplacer tous les `catch (err) { return MOCK_* }` par
  `catch (err) { throw err }` (ou omettre le try/catch). Supprimer les imports
  morts dans `app/analytics/page.tsx` : `getTodayArrivals`, `getTodayDepartures`.
  Supprimer le bouton "Exporter" et son `<select>` année associé dans
  `app/analytics/page.tsx` (ligne 119-127). Supprimer les types obsolètes
  `SegmentAnalytics` et `YTDCard` de `types/index.ts`.
  Ajouter les nouvelles interfaces `SegmentTrendMonthItem`,
  `SegmentTrendMonth`, `SegmentTrendResponse` dans `types/index.ts`
  (data-model.md §2). (US5, research.md §1, §3)

- [X] T002 [P] **Ajouter `/analytics` à `ROLE_RESTRICTIONS`** dans
  `middleware.ts` : ajouter `'/analytics': ['admin', 'manager', 'comptable']`
  dans le dictionnaire `ROLE_RESTRICTIONS` (ligne 18-28). (FR-018,
  research.md §5)

- [X] T003 [P] **Restreindre Analytics dans Sidebar** dans
  `components/layout/Sidebar.tsx` : ajouter le filtre pour que l'item
  "Analytics" (`href: '/analytics'`) ne s'affiche que pour les rôles
  `admin`, `manager`, `comptable` — actuellement, le receptionist le voit
  car la section GESTION n'est pas filtrée pour lui. Solution : dans
  `filteredGestionItems`, ou directement dans le rendu des gestion items,
  ajouter la condition `item.href === '/analytics' ? ['admin', 'manager',
  'comptable'].includes(role) : true`. (FR-018, research.md §5)


- [X] T005 **Refactorer `getComparisonYTD()` — normalisation conservée**
  dans `lib/api/analytics.ts` : **Conserver** le mapping de champs dans
  le `try` : `revenue → totalRevenue`, `nights → totalNights`,
  `totalRooms` défaut à `0` (cf. research.md §7, data-model.md
  Normalisation). Cette normalisation n'est PAS un fallback mock — c'est
  une correction d'incohérence entre deux endpoints backend.
  (FR-010, FR-011, research.md §7)

**Checkpoint**: Foundation ready — dead code removed, access control fixed,
types ready. User story implementation can begin.

---

## Phase 3: User Story 1 — KPIs (Priority: P1) 🎯 MVP

**Goal**: Afficher les 6 cartes KPI (TO Mensuel, TO Journalier, ADR, RevPAR,
DMS, CA Mensuel) avec valeurs, unités et évolutions, chargées depuis
`GET /api/analytics/dashboard`.

**Independent Test**: Naviguer vers `/analytics` → 6 cartes KPI visibles
avec valeurs et évolutions. Un KPI avec `evolution: null` affiche "—".
En cas d'erreur backend → "Service temporairement indisponible".

- [X] T006 [P] [US1] **Refactorer `getKPIs()`** dans `lib/api/analytics.ts` :
  supprimer le bloc `if (USE_MOCKS)` (déjà fait en T001). Remplacer le
  `catch (err) { return MOCK_KPIS }` par `catch (err) { throw err }` pour
  que l'erreur remonte à React Query. Vérifier que le mapping des champs
  (`kpis.toMensuel.value`, etc.) fonctionne avec la réponse réelle du
  backend. Le `avgStayDuration` (DMS) doit être affiché tel quel depuis le
  backend, sans recalcul pour les séjours à cheval sur deux mois. (FR-001,
  FR-002, FR-003, FR-016, FR-020)

- [X] T007 [US1] **Implémenter section KPIs** dans `app/analytics/page.tsx` :
  ajouter un `useQuery({ queryKey: ['analytics-kpis'], queryFn: getKPIs })`.
  Afficher 6 cartes KPI en grille (`grid-cols-1 md:grid-cols-3 lg:grid-cols-6`).
  Chaque carte : label, valeur + unité, delta (vert/rouge/neutre).
  Gérer les états : `isLoading` → skeleton cards, `isError` → message
  "Service temporairement indisponible". Tooltip sur icône info → "Basé
  sur les séjours effectifs (check-in/check-out) uniquement". (FR-001,
  FR-002, FR-003, FR-016)

**Checkpoint**: US1 complète — 6 cartes KPI fonctionnelles, testables
indépendamment.

---

## Phase 4: User Story 2 — Tendance mensuelle (Priority: P1)

**Goal**: Afficher un graphique dual-axis TO (%) + ADR (DH) sur 12 mois,
avec sélecteur d'année et gestion des mois futurs.

**Independent Test**: Naviguer vers `/analytics` → graphique tendance visible
avec 12 points. Changer l'année → mise à jour. Mois futurs → visibles mais
distincts. Année vide → message explicite. Erreur → "Service temporairement
indisponible".

- [X] T008 [P] [US2] **Refactorer `getDashboardTrend(year)`** dans
  `lib/api/analytics.ts` : supprimer le bloc `if (USE_MOCKS)` (déjà fait
  en T001). Remplacer `catch (err) { return generateMockTrend(year) }`
  par `catch (err) { throw err }`. (FR-004, FR-016)

- [X] T009 [US2] **Implémenter section tendance mensuelle** dans
  `app/analytics/page.tsx` : ajouter `useQuery({ queryKey:
  ['analytics-trend', selectedYear], queryFn: () =>
  getDashboardTrend(selectedYear) })`. Ajouter `useState` pour `selectedYear`
  (défaut: année courante) et un sélecteur d'année. Afficher le graphique
  via `EvolutionChart` avec les props `labels`, `occupancyData`, `adrData`.
  Mois futurs : axe complet mais style distinct (pointillés ou grisé).
  Si toutes les données sont à 0 → message "Aucune donnée pour l'année
  sélectionnée". (FR-004, FR-005, FR-006, FR-016)

**Checkpoint**: US1 + US2 complètes — page Analytics fonctionnelle avec
KPIs et tendance. MVP atteignable.

---

## Phase 5: User Story 3 — Distribution segments (Priority: P2)

**Goal**: Afficher la répartition des nuités (donut) et des revenus (barres)
par segment de marché, avec sélecteurs mois/année.

**Independent Test**: Naviguer vers `/analytics` → section distribution avec
donut + barres. Changer mois/année → mise à jour. Période vide → message
"Aucune donnée pour cette période". Erreur → "Service temporairement
indisponible".

- [X] T010 [P] [US3] **Refactorer `getSegmentGroups()` et
  `getSegmentDistribution(year, month)`** dans `lib/api/analytics.ts` :
  supprimer les blocs `if (USE_MOCKS)` (déjà fait en T001). Remplacer les
  `catch` retournant des données mockées par `catch (err) { throw err }`.
  (FR-007, FR-017, FR-019)

- [X] T011 [US3] **Implémenter section distribution segments** dans
  `app/analytics/page.tsx` : ajouter `useState` pour `selectedMonth` (défaut:
  mois courant). Ajouter `useQuery` pour `getSegmentGroups()` et
  `getSegmentDistribution(selectedYear, selectedMonth)`. Afficher :
  sélecteurs mois + année, graphique donut (`SegmentChart type="doughnut"`)
  avec répartition des nuités, graphique barres (`SegmentChart type="bar"`)
  avec revenus. Couleurs par groupe via `SEGMENT_GROUP_COLORS`. Gérer les
  états empty (pieChart/barChart vides → "Aucune donnée pour cette période")
  et error. (FR-007, FR-008, FR-016, FR-019)

**Checkpoint**: US1 + US2 + US3 complètes.

---

## Phase 6: User Story 4 — Comparaison N vs N-1 (Priority: P2)

**Goal**: Afficher un tableau comparatif N vs N-1 en vue YTD ou mensuelle,
avec filtre segment optionnel et formatage des deltas.

**Independent Test**: Naviguer vers `/analytics` → section comparaison avec
onglets YTD/Mensuel. Changer année/mois/segment → tableau mis à jour.
Delta null → "—". Delta positif → vert avec "+". Delta négatif → rouge
avec "-". Erreur → "Service temporairement indisponible".

- [X] T012 [P] [US4] **Refactorer `getComparisonMonthly(year, month,
  segment?)`** dans `lib/api/analytics.ts` : supprimer le bloc
  `if (USE_MOCKS)` (déjà fait en T001). Remplacer `catch` retournant des
  données mockées par `catch (err) { throw err }`. (FR-011, FR-016)

- [X] T013 [US4] **Implémenter section comparaison** dans
  `app/analytics/page.tsx` : ajouter `useState` pour `comparisonTab`
  (`'ytd' | 'monthly'`) et `segmentFilter`. Ajouter `useQuery` pour
  `getComparisonYTD(selectedYear, segmentFilter)` et
  `getComparisonMonthly(selectedYear, selectedMonth, segmentFilter)` selon
  l'onglet actif. Afficher : onglets YTD/Mensuel, sélecteurs année + mois
  (pour mensuel), filtre segment (dropdown), tableau comparatif avec
  colonnes : période/mois, N, N-1, delta. Utiliser `formatDelta()` existant
  pour le rendu des deltas (vert/rouge/tiret). Gérer les états empty et
  error. (FR-010, FR-011, FR-012, FR-013, FR-014, FR-016)

**Checkpoint**: US1–US4 complètes. Toutes les fonctionnalités principales
de la spec livrées.

---

## Phase 7: User Story 5 — Tendance par segment (Priority: P3)

**Goal**: Afficher un graphique multi-lignes de l'évolution mensuelle des
nuités (ou revenus) par segment de marché sur 12 mois.

**Independent Test**: Naviguer vers `/analytics` → section tendance par
segment avec graphique multi-lignes. Changer année → mise à jour.
Année vide → message explicite. Erreur → "Service temporairement
indisponible".

- [X] T014 [P] [US5] **Implémenter `getSegmentTrend(year)`** dans
  `lib/api/analytics.ts` : nouvelle fonction qui appelle
  `apiClient.get('/api/analytics/segments/trend', { params: { year } })`
  et retourne `SegmentTrendResponse`. Pas de bloc `USE_MOCKS`, pas de
  fallback mock — l'erreur remonte à React Query via `throw`. Mapper la
  réponse backend au type frontend (champs identiques). (US5, FR-009)

- [X] T015 [US5] **Implémenter section tendance par segment** dans
  `app/analytics/page.tsx` : ajouter `useQuery({ queryKey:
  ['analytics-segment-trend', selectedYear], queryFn: () =>
  getSegmentTrend(selectedYear) })`. Afficher un graphique multi-lignes
  (une ligne par segment présent dans les données) en utilisant
  `react-chartjs-2` directement (pattern dataset multi-line existant dans
  la page). Couleurs par groupe via `SEGMENT_GROUP_COLORS`. Dataset :
  `nights` par défaut. Gérer les états : `isLoading` → skeleton chart,
  `isError` → message, empty (tous les mois avec `segments: []`) →
  "Aucune donnée pour cette année". (US5, FR-009, FR-016)

**Checkpoint**: Toutes les user stories complètes.

---

## Phase 8: Validation finale

**Purpose**: Valider chaque scénario de quickstart.md pour confirmer que
toutes les fonctionnalités sont opérationnelles.

- [X] T016 **Validation S1 — KPIs** : naviguer vers `/analytics`, vérifier
  6 cartes KPI avec valeurs, unités, évolutions (vert/rouge/neutre).
  Tooltip présent. `evolution: null` → "—". DMS (`avgStayDuration`)
  affiché tel quel depuis le backend, sans recalcul. **SC-001** : le
  chargement des KPIs doit être < 3s — vérification qualitative à l'œil
  pendant cette validation (pas de framework de mesure automatisé).
  (quickstart.md S1, FR-001, FR-002, FR-003, FR-020, SC-001)

- [X] T017 **Validation S2 — Trend mensuel** : vérifier graphique dual-axis
  TO/ADR avec 12 points. Changer année → mise à jour. Mois futurs visibles
  et distincts. Année vide → message. (quickstart.md S2, FR-004, FR-005,
  FR-006)

- [X] T018 **Validation S3 — Distribution segments** : vérifier donut
  (nuités) + barres (revenus). Changer mois/année → mise à jour. Période
  vide → message. (quickstart.md S3, FR-007, FR-008)

- [X] T019 **Validation S4 — Segment trend** : vérifier graphique
  multi-lignes avec une ligne par segment et légende. Couleurs par groupe.
  (quickstart.md S4, FR-009)

- [X] T020 **Validation S5 — Comparaison N vs N-1** : onglet YTD →
  tableau mois par mois. Onglet Mensuel → mois spécifique. Filtre segment
  → données filtrées. Delta null → "—". Delta positif → "+" vert,
  négatif → "-" rouge. (quickstart.md S5, FR-010, FR-011, FR-012,
  FR-013, FR-014)

- [X] T021 **Validation S6 — Erreur backend** : arrêter le backend,
  `NEXT_PUBLIC_USE_MOCKS=false`. Chaque section affiche "Service
  temporairement indisponible" — pas de crash, pas de page blanche, pas
  de données mockées. (quickstart.md S6, FR-016)

- [X] T022 **Validation S7 — Contrôle d'accès** : connexion avec rôle
  `receptionist` → navigation vers `/analytics` redirigée. Lien Analytics
  absent de la sidebar. (quickstart.md S7, FR-018)

- [X] T023 **Validation S8 — Nettoyage** : vérifier que
  `getTodayArrivals()`/`getTodayDepartures()` n'existent plus dans
  `lib/api/analytics.ts`. Aucun import de ces fonctions dans le code.
  Bouton "Exporter" absent du rendu. Aucun bloc `if (USE_MOCKS)` dans
  `lib/api/analytics.ts`. (quickstart.md S8, research.md §1)

- [X] T024 **Validation S9 — Seed endpoint non exposé** : exécuter
  `grep -r "/api/analytics/seed" app/ components/ --include="*.tsx" --include="*.ts"`
  — doit retourner zéro résultat. Vérifier qu'aucun bouton, lien ou
  formulaire dans l'UI ne référence le endpoint seed. (FR-015, SC-007)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup         ─── Aucune (ready)
     │
Phase 2: Foundational  ─── BLOCKS toutes les US
     │
     ├──> Phase 3: US1 ─── KPIs (P1) ⬥ MVP
     │
     ├──> Phase 4: US2 ─── Trend (P1)
     │
     ├──> Phase 5: US3 ─── Distribution (P2) [parallèle possible après T001]
     │
     ├──> Phase 6: US4 ─── Comparaison (P2) [parallèle possible après T001]
     │
     └──> Phase 7: US5 ─── Segment trend (P3) [parallèle possible après T001]
                    │
Phase 8: Validation ─── Dépend de toutes les US
```

### User Story Dependencies

- **US1 (P1)**: Dépend de T001, T002, T003 (Foundational)
- **US2 (P1)**: Dépend de T001, T002, T003 (Foundational)
- **US3 (P2)**: Dépend de T001, T002, T003 (Foundational)
- **US4 (P2)**: Dépend de T001, T005 (Foundational — T005 est le refactor
  de getComparisonYTD)
- **US5 (P3)**: Dépend de T001 (Foundational — ajout des nouveaux types)

**Aucune dépendance entre US** — toutes peuvent être implémentées en
parallèle après la Phase Foundational.

### Parallel Opportunities

- **T001** (Foundational) : isolation d'analytics.ts + types/index.ts
  — T002 et T003 peuvent tourner en parallèle (fichiers différents)
- **T002+T003** (Foundational) : parallèles entre eux et avec T001
  (middleware.ts, Sidebar.tsx — fichiers différents)
- **T006+T008+T010+T012+T014** (refactoring API) : tous en parallèle
  (même fichier `analytics.ts` mais fonctions indépendantes — attention
  aux conflits git si travail simultané)
- **T007+T009+T011+T013+T015** (sections page) : en parallèle si
  développeurs séparés (même fichier `page.tsx` — sections différentes
  mais conflits probables)
- **T016 à T024** (validation) : validation séquentielle recommandée

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 2 Foundational (T001–T005)
2. Phase 3 US1 KPIs (T006–T007)
3. **STOP and VALIDATE** via S1 + S6 + S7 + S8

### Incremental Delivery

1. Foundation → Validation S6, S7, S8
2. US1 → Validation S1
3. US2 → Validation S2
4. US3 → Validation S3
5. US4 → Validation S5
6. US5 → Validation S4
7. Full validation (S1–S8)

---

## Notes

- `getComparisonYTD()` conserve sa normalisation de champs
  (revenue→totalRevenue, nights→totalNights, totalRooms→0) —
  cette normalisation n'est PAS un fallback mock (research.md §7)
- `SEGMENT_GROUP_COLORS`, `mapSegmentToGroup()`, `formatDelta()`
  sont conservés dans `lib/api/analytics.ts` — ils sont réutilisés
  par plusieurs US
- Le flag `USE_MOCKS` dans `lib/api/client.ts` n'est pas supprimé —
  il peut encore être utile pour d'autres modules. Seules les
  fonctions analytics ne l'utilisent plus
- `EvolutionChart.tsx` et `SegmentChart.tsx` sont réutilisés sans
  modification — les données sont passées en props depuis page.tsx
