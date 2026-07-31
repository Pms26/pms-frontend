# Feature Specification: Module Analytics — Connexion Backend

**Feature Directory**: `003-analytics-frontend`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "Connecter le module Analytics frontend au backend analytics-service (port 4006) via api-gateway, en supprimant les mocks permanents et en couvrant les KPIs, tendances, segments et comparaison N-1."

## User Scenarios & Testing

### User Story 1 — Visualiser les KPIs du mois en cours (Priority: P1)

En tant que **manager, admin ou comptable**, je veux voir les 6 indicateurs clés du mois en cours (TO Mensuel, TO Journalier, ADR, RevPAR, DMS, CA Mensuel) avec leur évolution par rapport à la période précédente, afin d'évaluer rapidement la performance de l'établissement.

**Why this priority**: Les KPIs sont la première information qu'un utilisateur cherche en ouvrant la page Analytics. Sans eux, le module n'a pas de valeur.

**Independent Test**: L'utilisateur consulte la page Analytics et voit 6 cartes KPI avec des valeurs chiffrées, des unités, et une indication d'évolution (hausse, baisse, ou neutre).

**Acceptance Scenarios**:

1. **Given** l'utilisateur a le rôle manager/admin/comptable et consulte la page Analytics, **When** les données du backend sont disponibles, **Then** 6 cartes KPI sont affichées : TO Mensuel (%), TO Journalier (%), ADR (DH), RevPAR (DH), DMS (nuits), CA Mensuel (DH), chacune avec sa valeur et son évolution.
2. **Given** un KPI a une évolution positive (ex: +8.5%), **When** la carte est affichée, **Then** le delta est affiché en vert avec un indicateur visuel de hausse.
3. **Given** un KPI a une évolution négative (ex: -3.2%), **When** la carte est affichée, **Then** le delta est affiché en rouge avec un indicateur visuel de baisse.
4. **Given** un KPI a `evolution: null` (valeur précédente à 0 ou absente), **When** la carte est affichée, **Then** le delta affiche un tiret « — » ou « N/A » — jamais NaN, Infinity, ou 0%.
5. **Given** le backend est indisponible (502), **When** la page tente de charger les KPIs, **Then** un message « Service temporairement indisponible » est affiché, les cartes restent vides sans crash.
6. **Given** l'utilisateur survole l'icône d'information des KPIs, **When** il consulte le tooltip, **Then** le tooltip précise « Basé sur les séjours effectifs (check-in/check-out) uniquement ».

---

### User Story 2 — Consulter la tendance mensuelle (Priority: P1)

En tant que **manager, admin ou comptable**, je veux visualiser l'évolution du Taux d'Occupation et de l'ADR sur 12 mois pour une année donnée, afin d'identifier les tendances saisonnières.

**Why this priority**: La tendance mensuelle est le deuxième élément le plus consulté après les KPIs. Elle permet l'analyse comparative sur le long terme.

**Independent Test**: L'utilisateur voit un graphique d'évolution avec 12 points (janvier à décembre) et peut changer l'année via un sélecteur.

**Acceptance Scenarios**:

1. **Given** l'utilisateur consulte la section tendance, **When** l'année courante est sélectionnée, **Then** les 12 mois de l'année sont affichés, y compris les mois futurs (ceux-ci affichent des valeurs à 0 avec un libellé explicite « Mois à venir » ou sont grisés).
2. **Given** l'utilisateur change l'année via le sélecteur d'année, **When** une nouvelle année est choisie, **Then** le graphique se met à jour avec les données des 12 mois de cette année.
3. **Given** une année sans donnée (ex: année future), **When** les données retournent des 0 pour tous les mois, **Then** le graphique affiche un message « Aucune donnée pour l'année sélectionnée » plutôt qu'un graphique vide.
4. **Given** les mois futurs de l'année en cours ont des valeurs à 0, **When** le graphique est affiché, **Then** ces mois sont visibles sur l'axe (pour préserver la continuité temporelle) mais visuellement distincts (ligne en pointillés ou zone grisée) pour ne pas induire en erreur.

---

### User Story 3 — Explorer la distribution par segments de marché (Priority: P2)

En tant que **manager, admin ou comptable**, je veux voir la répartition des nuits (pie chart) et des revenus (bar chart) par segment de marché pour une période donnée, afin d'identifier les canaux de réservation les plus performants.

**Why this priority**: La segmentation est essentielle pour les décisions commerciales et marketing, mais secondaire par rapport aux KPIs globaux.

**Independent Test**: L'utilisateur sélectionne un mois et une année, et voit deux graphiques (donut + barres) se mettre à jour avec les données de distribution.

**Acceptance Scenarios**:

1. **Given** l'utilisateur consulte la section segments, **When** les données sont chargées, **Then** un graphique donut affiche la répartition des nuits par segment avec les pourcentages, et un graphique à barres affiche le revenu par segment.
2. **Given** l'utilisateur change le mois ou l'année via les sélecteurs, **When** la période est modifiée, **Then** les deux graphiques se mettent à jour avec les données de la nouvelle période.
3. **Given** le backend ne contient aucune donnée pour la période sélectionnée, **When** la réponse a `pieChart: []` et `barChart: []`, **Then** un message « Aucune donnée pour cette période » est affiché à la place des graphiques.
4. **Given** les groupes de segments sont chargés, **When** la page s'affiche, **Then** les couleurs des segments suivent la logique des groupes (DIRECT/OTA/PARTENAIRES) pour assurer la cohérence visuelle.

---

### User Story 4 — Comparer les performances N vs N-1 (Priority: P2)

En tant que **manager, admin ou comptable**, je veux comparer les performances de l'année courante avec l'année précédente, soit en cumul YTD soit mois par mois, afin d'évaluer la croissance ou le déclin.

**Why this priority**: La comparaison N-1 est cruciale pour l'analyse stratégique mais moins fréquente que la consultation des KPIs quotidiens.

**Independent Test**: L'utilisateur sélectionne l'onglet YTD ou Mensuel, choisit une année/mois et éventuellement un segment, et voit un tableau comparatif avec les deltas.

**Acceptance Scenarios**:

1. **Given** l'utilisateur est sur l'onglet YTD, **When** il sélectionne une année, **Then** un tableau comparatif affiche les métriques (TO, ADR, RevPAR, Revenu) en cumul du mois 1 au mois courant, avec les valeurs N, N-1, et le delta.
2. **Given** l'utilisateur est sur l'onglet Mensuel, **When** il sélectionne une année et un mois, **Then** un tableau comparatif affiche les métriques du mois sélectionné vs le même mois l'année précédente.
3. **Given** l'utilisateur sélectionne un segment spécifique dans le filtre, **When** les données sont chargées, **Then** seules les réservations de ce segment sont incluses dans les calculs.
4. **Given** un delta est `null` (valeur N-1 à 0), **When** la cellule du delta est affichée, **Then** un tiret « — » est affiché — jamais « NaN », « Infinity » ou « 0 % ».
5. **Given** une métrique est en hausse, **When** le delta est affiché, **Then** la valeur est précédée de « + » et colorée en vert.
6. **Given** une métrique est en baisse, **When** le delta est affiché, **Then** la valeur est précédée de « - » et colorée en rouge.

---

### User Story 5 — Consulter la tendance mensuelle par segment (Priority: P3)

En tant que **manager, admin ou comptable**, je veux voir l'évolution mensuelle des performances (nuits et revenus) pour chaque segment de marché sur 12 mois, afin d'analyser les tendances par canal de distribution.

**Why this priority**: La tendance par segment est une fonctionnalité avancée, utile pour l'analyse marketing approfondie mais moins critique au quotidien.

**Independent Test**: L'utilisateur voit un graphique d'évolution par segment avec les nuités et/ou revenus par mois.

**Acceptance Scenarios**:

1. **Given** l'utilisateur consulte la section tendance par segment, **When** une année est sélectionnée, **Then** un graphique multi-lignes affiche l'évolution mensuelle des nuits (ou revenus) pour chaque segment présent dans les données.
2. **Given** un segment n'a aucune nuit pour un mois donné, **When** le graphique est affiché, **Then** ce mois affiche 0 pour ce segment (pas de trou dans la ligne).

---

### Edge Cases

1. **Backend indisponible** — Tous les endpoints peuvent retourner 502 (gateway) ou 500 (service). Le comportement attendu est l'affichage d'un message « Service temporairement indisponible » — jamais de crash ou de page blanche.
2. **Données à 0 pour les mois futurs** — L'API retourne tous les mois 1-12. Les mois futurs de l'année en cours ont des valeurs à 0. Ils ne doivent pas être cachés (pour préserver l'axe temporel complet) mais doivent être visuellement identifiés comme mois sans données.
3. **Delta null** — Quand `evolution` ou `delta` est `null`, l'affichage doit être « — » (tiret) ou « N/A ». Ne jamais afficher NaN, Infinity, ou 0%.
4. **Aucun segment trouvé pour une période** — L'API segments/trend retourne uniquement les segments ayant au moins une nuit. Si la période a 0 nuit, la tendance par segment peut être vide.
5. **Année vide** — Si tous les mois d'une année retournent des 0, le graphique de tendance doit afficher un message explicite au lieu d'un graphique vide.
6. **Valeurs extrêmes** — Les montants (CA, revenus) peuvent atteindre des valeurs élevées. Le formatage doit gérer l'affichage lisible (séparateurs de milliers, arrondis).
7. **ADR et DMS avec décimales** — L'ADR et le DMS sont des nombres décimaux. L'affichage doit conserver au moins 1 décimale pour le DMS, 0 ou 1 pour l'ADR.

## Requirements

### Functional Requirements

- **FR-001**: System MUST display 6 KPI cards (TO Mensuel, TO Journalier, ADR, RevPAR, DMS, CA Mensuel) loaded from the backend dashboard endpoint, with each card showing the current value, unit, and evolution vs previous period.
- **FR-002**: System MUST handle `evolution: null` by displaying a dash « — » instead of a numeric value — never NaN, Infinity, or 0%.
- **FR-003**: System MUST display a tooltip explaining that KPIs are based on checked-in/checked-out bookings only, as documented in the backend specification.
- **FR-004**: System MUST display a monthly trend chart (TO + ADR) for the 12 months of a selected year, loaded from the trend endpoint.
- **FR-005**: System MUST provide a year selector for the trend chart, defaulting to the current year.
- **FR-006**: System MUST display future months of the current year (with 0 values) on the trend chart axis but visually distinguish them from months with actual data.
- **FR-007**: System MUST display a segment distribution section with a pie chart (nights distribution) and a bar chart (revenue distribution) for a given month/year, loaded from the distribution endpoint.
- **FR-008**: System MUST provide month and year selectors for the segment distribution section, defaulting to current month and year.
- **FR-009**: System MUST display a segment trend chart (evolution over 12 months) loaded from the segment trend endpoint.
- **FR-010**: System MUST provide a YTD comparison view (month 1 to current month) vs previous year, loaded from the YTD comparison endpoint.
- **FR-011**: System MUST provide a monthly comparison view (specific month vs same month previous year), loaded from the monthly comparison endpoint.
- **FR-012**: System MUST provide an optional segment filter for both comparison views.
- **FR-013**: System MUST handle `delta: null` in comparison data by displaying a dash « — » — never NaN, Infinity, or 0%.
- **FR-014**: System MUST display positive deltas with a « + » prefix in green and negative deltas with a « - » prefix in red.
- **FR-015**: System MUST NOT expose any UI element (button, link, form) that triggers the seed endpoint (`POST /api/analytics/seed`), as this is a destructive action protected only by JWT without role verification.
- **FR-016**: System MUST display a user-friendly error message (not a crash or blank page) when any API call fails (502 gateway error, 500 server error, or network error).
- **FR-017**: System MUST load segment groups and segments list from the backend segments endpoint — NOT hardcoded on the frontend.
- **FR-018**: System MUST NOT display the Analytics module in the sidebar for users with role `receptionist`.
- **FR-019**: System MUST apply consistent group-based coloring for segments using the DIRECT/OTA/PARTENAIRES grouping returned by the backend.
- **FR-020**: System MUST display the DMS (avgStayDuration) value as-is from the backend, without attempting to recalculate a monthly portion for stays spanning two months.

### Key Entities

- **KPI (Key Performance Indicator)** — A measurable metric with a current value, unit, previous value, and evolution percentage. Six KPIs exist: TO Mensuel, TO Journalier, ADR, RevPAR, DMS, CA Mensuel.
- **Segment** — A market channel for reservations (e.g., direct_walk_in, ota_booking). Segments are organized into groups (DIRECT, OTA, PARTENAIRES) and are defined server-side.
- **Trend** — A collection of 12 monthly data points (occupancy rate, ADR, RevPAR, nights, revenue) for a given year.
- **Distribution** — A breakdown of nights and revenue by segment for a specific month/year, presented as pie chart (nights percentage) and bar chart (revenue).
- **Comparison** — A side-by-side view of metrics between a current period (YTD or specific month) and the same period in the previous year, with calculated deltas.
- **Booking (réservation)** — The underlying data entity. Only bookings with status `checked_in` or `checked_out` are counted in all KPI calculations.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can load the Analytics page and see all 6 KPI cards with values and evolutions within 3 seconds of page load (under normal network conditions).
- **SC-002**: A user can navigate between YTD and Monthly comparison tabs, change year/month/segment filters, and see updated data without a full page reload.
- **SC-003**: A user can visualize 12-month trend data for any available year (current year + past years) using the year selector.
- **SC-004**: A user can view segment distribution (pie + bar charts) for any month of any available year using month/year selectors.
- **SC-005**: Zero occurrences of "NaN", "Infinity", or undefined values displayed to users in any data state (null deltas, empty responses, future months).
- **SC-006**: Users with receptionist role cannot navigate to the Analytics page (redirected or blocked), while manager/admin/comptable can access all features without restriction.
- **SC-007**: The seed endpoint is never reachable from any UI element in the application — confirmed by code review and automated UI testing.


## Clarifications

### Session 2026-07-30

- Q: FR-019 et SC-008 référencent getTodayArrivals()/getTodayDepartures() connectés au backend, mais analytics-service.md n'a aucun endpoint pour les arrivées/départs du jour. → A: Option A (variante suppression pure). FR-019 et SC-008 sont supprimés. Les arrivées/départs du jour sont exclus du scope du module Analytics. Les fonctions et leur rendu UI doivent être supprimés du codebase durant l'implémentation (pas laissés en mock permanent).

## Assumptions

- **Target users**: manager, admin, and comptable have identical permissions on all analytics endpoints. No role-based differentiation is needed within the analytics module.
- **Receptionist access**: The middleware (`middleware.ts`) and sidebar filtering already block receptionist from accessing `/analytics`. This is assumed functional and only needs verification, not modification.
- **Data freshness**: The backend reads directly from the shared PostgreSQL database, so data reflects the latest state from front-office operations. No caching layer is assumed on the frontend beyond React Query defaults.
- **Empty data handling**: Months with no data return 0 values from the backend. The frontend should differentiate between "no data yet" (future months) and "data exists but is 0" (past months with no activity) based on the current date.
- **Segment color mapping**: Colors are assigned per group (DIRECT = indigo, OTA = emerald, PARTENAIRES = amber, AUTRES = gray) to provide visual consistency across all segment-related charts.
- **No pagination needed**: The backend does not support pagination. All endpoints return complete datasets (12 months, all segments). This is acceptable for the expected data volume of a single property.
- **Error handling**: All API errors are caught and result in user-friendly messages rather than raw error propagation. Fallback to mock data is not appropriate when the backend is expected to be available.
- **Existing components**: The EvolutionChart and SegmentChart components are reused for trend and distribution visualizations respectively. No new chart components are needed.
- **Arrivées/départs du jour (hors scope)**: Les fonctions `getTodayArrivals()` et `getTodayDepartures()` et leur rendu associé (ArrivalsList, DeparturesList) sont **exclus du scope** de ce module. Le backend analytics-service n'expose aucun endpoint pour cette donnée, et aucun développement backend dédié n'est planifié. Ces fonctions et leur UI associée doivent être supprimées du code existant durant la phase d'implémentation — pas laissées inertes (voir [tasks.md](../tasks.md) pour la tâche dédiée).
- **NEXT_PUBLIC_USE_MOCKS flag**: When this flag transitions from `true` to `false` in the deployment environment, all analytics API functions automatically use real backend calls.

## Open Questions

1. **Tendance par segment — affichage spécifique ?** Le backend retourne un tableau par mois avec les données segmentées, mais le format exact de visualisation (graphique multi-lignes, tableau, ou les deux) n'est pas imposé par les endpoints. Le choix actuel dans `page.tsx` est un graphique à ligne. À valider si une visualisation alternative est souhaitée.
2. **Export Excel/CSV ?** La maquette actuelle contient un bouton « Exporter » sans endpoint backend documenté. L'export n'est pas couvert par la spec backend. À clarifier si une fonctionnalité d'export est attendue et, si oui, si elle doit être implémentée côté frontend (formatage côté client) ou backend.
