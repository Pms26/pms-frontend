# Feature Specification: Analytics Dashboard — Vue Synthétique de Performance Hôtelière

**Feature Directory**: `specs/002-analytics-dashboard`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Développer le module Dashboard du frontend OASIS PMS — vue synthétique de la performance de l'hôtel sur le mois en cours, avec comparaison à la période précédente, tendance annuelle, et répartition du chiffre d'affaires/nuitées par segment de clientèle."

## Clarifications

### Session 2026-07-28

- Q1: Palette de couleurs pour les groupes de segments (DIRECT/OTA/PARTENAIRES) → A: Utiliser les tokens Tailwind existants : `accent` (#6366f1) pour DIRECT, `emerald` (#10b981) pour OTA, `amber` (#f59e0b) pour PARTENAIRES. Couleurs définies côté frontend, jamais par l'API.
- Q2: Comportement de GET /api/analytics/comparison/monthly quand N-1 absent → A: L'endpoint retourne une réponse 200 valide avec `previous.* = 0` et `deltas.* = null`. Pas de 404. Le composant affiche "N/A" pour tout delta null, sans état d'erreur.
- Q3: Structure exacte des données mockées arrivées/départs → A: Aligner sur les structures existantes dans `lib/api/analytics.ts` : arrivée = `{client, room, type, time}`, départ = `{client, room, balance, status}`. Pas de champs supplémentaires.
- Q4: Métriques du graphique de tendance annuelle → A: Deux courbes simultanées sur le même graphique dual-axis : TO (%) sur axe gauche, ADR (DH) sur axe droit. Pas de sélecteur de métrique. Pas de CA dans ce graphique.

## User Scenarios & Testing

### User Story 1 - Visualiser les KPI du mois en cours (Priority: P1)

En tant qu'admin, manager ou comptable, je veux voir en un coup d'œil les indicateurs clés de performance du mois en cours (TO mensuel, TO du jour, ADR, RevPAR, DMS, CA mensuel) afin de mesurer rapidement la performance de l'hôtel.

**Why this priority**: C'est la fonctionnalité centrale du dashboard. Sans ces indicateurs, la page n'a pas de valeur métier pour les rôles autorisés.

**Independent Test**: En se connectant avec un compte admin/manager/comptable et en naviguant vers /dashboard, l'utilisateur voit 6 cartes KPI affichant les valeurs du mois en cours avec leur évolution par rapport à la période précédente.

**Acceptance Scenarios**:

1. **Given** l'utilisateur est connecté avec le rôle admin, **When** il accède à /dashboard, **Then** six cartes KPI sont affichées : T.O. Mensuel, T.O. Journalier, ADR, RevPAR, DMS, CA Mensuel.
2. **Given** les données API sont disponibles, **When** les KPI sont chargés, **Then** chaque carte affiche une valeur, une unité, et une évolution (delta) par rapport à la période précédente.
3. **Given** l'évolution (evolution) est nulle pour un KPI (pas de comparaison disponible), **When** la carte est affichée, **Then** aucune valeur NaN, Infinity ou undefined n'apparaît ; le delta affiche un tiret ou "N/A" au lieu d'un pourcentage.
4. **Given** les données sont en cours de chargement, **When** l'utilisateur attend, **Then** un squelette de chargement (skeleton) est affiché pour chaque carte KPI.
5. **Given** le backend analytics est indisponible, **When** les données ne peuvent pas être chargées, **Then** les valeurs mockées de démonstration sont affichées à la place d'une page vide ou d'une erreur bloquante.

---

### User Story 2 - Comprendre le périmètre des indicateurs (Priority: P2)

En tant qu'admin, manager ou comptable, je veux savoir que les KPI reflètent uniquement les séjours effectifs (checked_in / checked_out) et non les réservations futures (confirmed), afin de pouvoir interpréter correctement les chiffres.

**Why this priority**: Une mauvaise interprétation des indicateurs (en prenant les confirmed pour des séjours réels) pourrait conduire à des décisions erronées. Cette information doit être communiquée clairement.

**Independent Test**: En survolant ou en consultant l'aide contextuelle d'un KPI, l'utilisateur voit une info-bulle précisant que seuls les statuts checked_in et checked_out sont comptabilisés.

**Acceptance Scenarios**:

1. **Given** un KPI est affiché, **When** l'utilisateur survole l'icône d'information à côté du titre, **Then** une info-bulle indique "Basé sur les séjours effectifs (check-in/check-out), réservations futures exclues".
2. **Given** la section KPI est chargée, **When** l'utilisateur consulte le dashboard, **Then** un petit texte de bas de page ou un badge discret rappelle le périmètre "Séjours effectifs uniquement".

---

### User Story 3 - Visualiser la tendance annuelle (Priority: P1)

En tant qu'admin, manager ou comptable, je veux voir un graphique d'évolution du taux d'occupation (TO) et de l'ADR sur les 12 mois d'une année sélectionnée, afin d'identifier les tendances saisonnières et la corrélation entre ces deux métriques.

**Why this priority**: La tendance annuelle est le deuxième élément le plus important du dashboard après les KPI mensuels. Elle permet une analyse comparative year-to-date essentielle.

**Independent Test**: En naviguant vers /dashboard, l'utilisateur voit un graphique dual-axis avec deux courbes : TO (%) sur l'axe gauche et ADR (DH) sur l'axe droit, pour l'année en cours, avec un sélecteur d'année pour changer la période.

**Acceptance Scenarios**:

1. **Given** l'année en cours est sélectionnée, **When** le graphique se charge, **Then** il affiche 12 points (janvier à décembre) avec les valeurs du taux d'occupation (axe gauche, %) et de l'ADR (axe droit, DH) pour les mois disponibles.
2. **Given** un mois futur sans donnée existe dans l'année sélectionnée, **When** le graphique est affiché, **Then** ce mois affiche la valeur 0 (ou n'est pas tracé) sans générer d'erreur ou de valeur absurde.
3. **Given** l'utilisateur change l'année via le sélecteur, **When** une nouvelle année est choisie, **Then** le graphique se met à jour avec les données de l'année sélectionnée.
4. **Given** les données de tendance ne sont pas disponibles pour une année, **When** l'utilisateur sélectionne cette année, **Then** un message "Aucune donnée pour cette année" est affiché dans la zone du graphique.

---

### User Story 4 - Visualiser la répartition par segment (Priority: P2)

En tant qu'admin, manager ou comptable, je veux voir la répartition des nuitées (camembert) et du revenu (barres) par segment de clientèle (Direct, OTA, Partenaires), avec sélecteur mois/année, afin d'analyser la composition du chiffre d'affaires.

**Why this priority**: L'analyse par segment permet d'orienter les décisions commerciales. Elle est importante mais secondaire par rapport aux KPI et à la tendance annuelle.

**Independent Test**: En naviguant vers /dashboard, l'utilisateur voit un graphique en camembert pour la répartition des nuitées et un graphique en barres pour la répartition du revenu, avec des sélecteurs mois et année.

**Acceptance Scenarios**:

1. **Given** un mois et une année sont sélectionnés, **When** le graphique camembert se charge, **Then** il affiche le pourcentage de nuitées par segment (DIRECT, OTA, PARTENAIRES) avec la légende et les valeurs en pourcentage.
2. **Given** un mois et une année sont sélectionnés, **When** le graphique en barres se charge, **Then** il affiche le revenu par segment avec les montants en DH.
3. **Given** les segments appartiennent au même groupe (ex: "OTA — Booking.com" et "OTA — Expedia" tous deux dans le groupe OTA), **When** le graphique est affiché, **Then** les segments sont regroupés visuellement par groupe avec une couleur par groupe.
4. **Given** l'utilisateur change le mois ou l'année, **When** la sélection est modifiée, **Then** les deux graphiques (camembert et barres) se mettent à jour simultanément.

---

### User Story 5 - Comparer les performances N vs N-1 en cumul YTD (Priority: P2)

En tant qu'admin, manager ou comptable, je veux voir la comparaison cumulée (YTD) de l'année en cours par rapport à l'année précédente pour l'occupation, l'ADR, le RevPAR et le revenu, afin d'évaluer la progression annuelle.

**Why this priority**: La comparaison YTD est un indicateur de pilotage essentiel pour la direction, mais elle est moins prioritaire que les KPI instantanés et la tendance.

**Independent Test**: En naviguant vers /dashboard, l'utilisateur voit une section "Comparaison N vs N-1" avec un onglet ou une sous-section "Cumul YTD" affichant les deltas pour chaque indicateur.

**Acceptance Scenarios**:

1. **Given** l'année en cours est sélectionnée pour la vue YTD, **When** les données sont chargées, **Then** les indicateurs cumulés (occupation, ADR, RevPAR, revenu) sont affichés avec leur valeur N, valeur N-1, et le delta en pourcentage.
2. **Given** la valeur N-1 est zéro pour un indicateur (pas d'activité l'année précédente), **When** le delta est calculé, **Then** le delta affiche "N/A" ou un tiret au lieu de 0% ou Infinity.
3. **Given** un filtre optionnel par segment est appliqué, **When** l'utilisateur sélectionne un segment dans le filtre, **Then** les données YTD sont filtrées pour ne montrer que le segment sélectionné.
4. **Given** aucun segment n'est sélectionné (filtre "Tous"), **When** la vue YTD est affichée, **Then** les données globales (tous segments confondus) sont présentées.

---

### User Story 6 - Comparer les performances N vs N-1 par mois (Priority: P2)

En tant qu'admin, manager ou comptable, je veux voir la comparaison mois par mois d'une période donnée par rapport à la même période de l'année précédente, afin d'analyser les variations saisonnières.

**Why this priority**: La comparaison mensuelle permet une analyse plus fine que le YTD. Même priorité que la vue YTD car les deux sont complémentaires.

**Independent Test**: En naviguant vers la section "Comparaison N vs N-1", l'utilisateur bascule sur l'onglet "Mensuel" et voit la comparaison du mois sélectionné avec le même mois de l'année précédente.

**Acceptance Scenarios**:

1. **Given** la vue mensuelle est sélectionnée avec un mois et une année, **When** les données sont chargées, **Then** le mois courant est comparé au même mois de l'année N-1 pour l'occupation, l'ADR, le RevPAR et le revenu.
2. **Given** un filtre par segment est appliqué sur la vue mensuelle, **When** l'utilisateur sélectionne un segment, **Then** les données sont filtrées en conséquence.
3. **Given** l'année N-1 n'a pas de données pour le mois sélectionné (hôtel fermé, pas d'activité), **When** l'API retourne une réponse 200 valide avec `previous.* = 0` et `deltas.* = null`, **Then** les champs N-1 affichent 0 et le delta affiche "N/A" (pas de calcul erroné, pas d'état d'erreur).

---

### User Story 7 - Consulter les arrivées et départs du jour (Priority: P3)

En tant qu'admin, manager ou comptable, je veux voir la liste des arrivées et des départs prévus pour la journée en cours, afin d'anticiper le flux de clients.

**Why this priority**: Ces données sont actuellement mockées (aucun endpoint public disponible). La fonctionnalité est utile mais ne peut pas être connectée à une vraie API sans développement backend complémentaire. Elle est conservée en mode démo.

**Independent Test**: En naviguant vers /dashboard, l'utilisateur voit deux encarts "Arrivées du jour" et "Départs du jour" avec des données de démonstration clairement identifiées comme telles.

**Acceptance Scenarios**:

1. **Given** le dashboard est chargé, **When** l'utilisateur voit la section "Arrivées du jour", **Then** chaque entrée affiche : nom du client (`client`), numéro de chambre (`room`), type de pension (`type`) et heure d'arrivée (`time`).
2. **Given** le dashboard est chargé, **When** l'utilisateur voit la section "Départs du jour", **Then** chaque entrée affiche : nom du client (`client`), numéro de chambre (`room`), solde (`balance`) et statut du solde (`status`).
3. **Given** les données sont mockées, **When** l'utilisateur examine ces sections, **Then** un badge ou une indication visuelle "Démo" signale qu'il s'agit de données de démonstration, pas de données réelles.

---

### User Story 8 - Contrôle d'accès par rôle (Priority: P1)

En tant que receptionist ou housekeeping_supervisor, je ne dois pas pouvoir accéder à la page /dashboard, car ces données de performance ne relèvent pas de mon périmètre.

**Why this priority**: La protection des données financières et de performance est un prérequis de sécurité. Les rôles non autorisés ne doivent en aucun cas voir ces informations.

**Independent Test**: En se connectant avec un compte receptionist et en tentant d'accéder à /dashboard, l'utilisateur est redirigé vers une autre page (ex: /front-office) ou voit un message d'accès refusé.

**Acceptance Scenarios**:

1. **Given** l'utilisateur a le rôle receptionist, **When** il navigue vers /dashboard, **Then** il est redirigé vers /front-office ou /login selon la configuration du middleware.
2. **Given** l'utilisateur a le rôle housekeeping_supervisor, **When** il navigue vers /dashboard, **Then** il est redirigé vers /housekeeping ou /login selon la configuration du middleware.
3. **Given** l'utilisateur a le rôle admin, **When** il navigue vers /dashboard, **Then** la page s'affiche normalement (accès autorisé).
4. **Given** l'utilisateur a le rôle comptable, **When** il navigue vers /dashboard, **Then** la page s'affiche normalement (accès autorisé).

---

### Edge Cases

- **Données API indisponibles (timeout, 5xx)**: Le dashboard doit continuer à fonctionner avec les données mockées de fallback, sans afficher d'écran vide ou d'erreur bloquante. Un toast ou un message discret peut indiquer le mode démo.
- **Valeur evolution = null pour un KPI**: Le delta doit afficher un tiret "—" ou "N/A" dans la carte KPI, pas de texte vide, pas de "NaN" ou "Infinity".
- **Mois futur dans le graphique de tendance annuelle**: Les mois sans données doivent afficher une valeur de 0 ou être simplement omis du tracé, sans générer d'erreur JavaScript.
- **Segment avec zéro nuitée ou zéro revenu**: Le segment doit apparaître dans la légende avec 0% ou 0 DH, pas être absent ni casser le graphique.
- **Année sans aucune donnée dans le graphique de tendance**: Afficher un message explicite "Aucune donnée pour l'année sélectionnée" dans la zone du graphique.
- **Delta YTD null quand N-1 = 0**: Pour un segment ou une année sans activité en N-1, le delta doit afficher "N/A" au lieu de tenter un calcul de pourcentage (qui produirait Infinity ou une valeur absurde).
- **Utilisateur avec session expirée**: La redirection vers /login doit s'effectuer proprement, sans affichage partiel du dashboard avant redirection (déjà géré par middleware.ts).
- **Sélecteur d'année avec année future (ex: 2027)**: Le graphique de tendance doit afficher toutes les valeurs à 0 avec un message "Aucune donnée pour l'année sélectionnée" — pas d'erreur.
- **Changement rapide de sélecteur (mois/année/segment)**: Les requêtes API précédentes doivent être annulées (ou ignorées si une réponse plus récente existe déjà) pour éviter l'affichage de données périmées. React Query gère ce cas via queryKey.
- **Segment inconnu ou nouveau non mappé dans les graphiques**: Si un segment ne correspond à aucun groupe connu (DIRECT/OTA/PARTENAIRES), il doit être affiché dans une catégorie "Autres" avec une couleur distincte.

## Requirements

### Functional Requirements

#### Section KPI (Indicateurs Clés de Performance)

- **DASH-FR-001**: Le système MUST afficher six cartes KPI sur le dashboard : T.O. Mensuel, T.O. Journalier, ADR, RevPAR, DMS, CA Mensuel.
- **DASH-FR-002**: Chaque carte KPI MUST afficher la valeur, l'unité, et le delta d'évolution par rapport à la période précédente.
- **DASH-FR-003**: Le système MUST gérer le cas où evolution = null pour un KPI en affichant un tiret "—" ou "N/A" dans le champ delta, sans jamais afficher NaN, Infinity ou undefined.
- **DASH-FR-004**: Le système MUST afficher un indicateur visuel de tendance pour le delta : vert (positif), rouge (négatif), gris (neutre ou N/A).
- **DASH-FR-005**: Le système MUST afficher le T.O. Journalier sans delta d'évolution (toujours null par nature).
- **DASH-FR-006**: Le système MUST afficher un état de chargement (skeleton) pour chaque carte KPI pendant le chargement des données.
- **DASH-FR-007**: Le système MUST afficher un message contextuel (tooltip ou badge) indiquant que les KPI sont basés sur les séjours effectifs (checked_in/checked_out), réservations futures (confirmed) exclues.

#### Section Tendance Annuelle

- **DASH-FR-008**: Le système MUST afficher un graphique dual-axis avec deux courbes sur 12 mois pour une année sélectionnée : taux d'occupation (TO, %) sur l'axe gauche et ADR (DH) sur l'axe droit. Pas de sélecteur de métrique et pas d'affichage du CA dans ce graphique.
- **DASH-FR-009**: Le système MUST fournir un sélecteur d'année permettant à l'utilisateur de changer l'année affichée.
- **DASH-FR-010**: Le système MUST gérer les mois futurs sans données en affichant la valeur 0 ou en omettant ces points du tracé, sans erreur.
- **DASH-FR-011**: Le système MUST afficher un message "Aucune donnée pour l'année sélectionnée" si l'année choisie ne contient aucune donnée.

#### Section Répartition par Segment

- **DASH-FR-012**: Le système MUST afficher un graphique en camembert (pieChart) représentant la répartition des nuitées par segment de clientèle.
- **DASH-FR-013**: Le système MUST afficher un graphique en barres (barChart) représentant la répartition du revenu (CA) par segment.
- **DASH-FR-014**: Chaque segment MUST être affiché avec son pourcentage (camembert) et son montant en DH (barres).
- **DASH-FR-015**: Le système MUST regrouper visuellement les segments par groupe (DIRECT / OTA / PARTENAIRES) avec des couleurs distinctes par groupe, définies côté frontend via les tokens Tailwind existants : `accent` pour DIRECT, `emerald` pour OTA, `amber` pour PARTENAIRES.
- **DASH-FR-016**: Le système MUST fournir des sélecteurs mois et année pour filtrer les données de répartition par segment.
- **DASH-FR-017**: Le système MUST mettre à jour les deux graphiques simultanément lors du changement de mois ou d'année.

#### Section Comparaison N vs N-1

- **DASH-FR-018**: Le système MUST afficher une vue "Cumul YTD" comparant les performances cumulées (occupation, ADR, RevPAR, revenu) de l'année N vs N-1.
- **DASH-FR-019**: Le système MUST afficher une vue "Mensuelle" comparant les performances d'un mois donné vs le même mois de l'année N-1.
- **DASH-FR-020**: Chaque vue de comparaison MUST afficher la valeur N, la valeur N-1, et le delta (différence ou pourcentage d'évolution).
- **DASH-FR-021**: Le système MUST gérer delta = null quand aucune donnée N-1 n'existe (l'API retourne `previous.* = 0`, `deltas.* = null` dans une réponse 200), en affichant "N/A" dans le champ delta — jamais de calcul de pourcentage sur une base zéro.
- **DASH-FR-022**: Le système MUST fournir un filtre optionnel par segment sur les deux vues (YTD et mensuelle).

#### Section Arrivées / Départs du Jour

- **DASH-FR-023**: Le système MUST afficher la liste des arrivées du jour avec les champs suivants, alignés sur la structure mockée existante dans `lib/api/analytics.ts` : `client` (nom du client), `room` (numéro de chambre), `type` (type de pension, ex: BB/DP), `time` (heure d'arrivée).
- **DASH-FR-024**: Le système MUST afficher la liste des départs du jour avec les champs suivants, alignés sur la structure mockée existante dans `lib/api/analytics.ts` : `client` (nom du client), `room` (numéro de chambre), `balance` (solde à régler, ex: "0 DH"), `status` (statut du solde, ex: "soldé").
- **DASH-FR-025**: Le système MUST identifier visuellement ces données comme des données de démonstration (badge "Démo"), étant donné qu'aucun endpoint public n'expose ces listes pour le moment.
- **DASH-FR-026**: Le comportement de secours (fallback) des sections arrivées/départs MUST être basé sur les données mockées dans `lib/api/analytics.ts` (fonctions `getTodayArrivals` / `getTodayDepartures`).

#### Contrôle d'Accès et Sécurité

- **DASH-FR-027**: Le middleware (`middleware.ts`) MUST restreindre l'accès à la route `/dashboard` aux seuls rôles admin, manager et comptable.
- **DASH-FR-028**: La Sidebar MUST afficher le lien "Tableau de bord" uniquement pour les rôles admin, manager et comptable.
- **DASH-FR-029**: Le système MUST never exposer côté UI l'action POST `/api/analytics/seed` (endpoint destructif sans contrôle de rôle côté backend).

#### Couche API (lib/api/analytics.ts)

- **DASH-FR-030**: Le système MUST utiliser les fonctions API existantes dans `lib/api/analytics.ts` avec le pattern USE_MOCKS + try/catch + fallback vers les données mockées.
- **DASH-FR-031**: Le système MUST appeler `GET /api/analytics/dashboard` pour les KPI du mois en cours.
- **DASH-FR-032**: Le système MUST appeler `GET /api/analytics/dashboard/trend?year=` pour la tendance annuelle.
- **DASH-FR-033**: Le système MUST appeler `GET /api/analytics/segments` pour les groupes de segments.
- **DASH-FR-034**: Le système MUST appeler `GET /api/analytics/segments/distribution?year=&month=` pour la répartition par segment.
- **DASH-FR-035**: Le système MUST appeler `GET /api/analytics/comparison/ytd?year=&segment=` pour la comparaison YTD.
- **DASH-FR-036**: Le système MUST appeler `GET /api/analytics/comparison/monthly?year=&month=&segment=` pour la comparaison mensuelle.
- **DASH-FR-037**: Tous les appels API MUST passer par le gateway (préfixe `/api/analytics/...`) en utilisant l'`apiClient` partagé de `lib/api/client.ts`.

### Key Entities

- **KPI** (`types/index.ts` — interface existante) : Indicateur clé de performance avec label, valeur, unité, delta (évolution), type de delta (positif/négatif/neutre), icône et gradient. Les KPI dashboard sont au nombre de 6 (TO mensuel, TO journalier, ADR, RevPAR, DMS, CA mensuel).
- **SegmentAnalytics** (`types/index.ts` — interface existante) : Analyses par segment de clientèle avec les nuitées et CA pour N et N-1, les deltas, et l'ADR. Les segments sont regroupés en 3 grandes familles : DIRECT, OTA, PARTENAIRES.
- **YTDCard** (`types/index.ts` — interface existante) : Cartes de comparaison YTD avec label, valeur, barre de progression et détail textuel. Utilisée pour la section Comparaison YTD.
- **Données de Tendance Mensuelle** : Structure avec labels (mois), valeurs d'occupation (TO %), ADR (DH), et répartition des nuitées par segment pour chaque mois de l'année.
- **Données de Comparaison Mensuelle** : Structure avec les valeurs du mois courant et du même mois N-1 pour l'occupation, l'ADR, le RevPAR et le revenu, avec deltas.
- **Segment Group** : Regroupement de segments individuels en catégories (DIRECT, OTA, PARTENAIRES). Chaque groupe a une couleur associée pour les graphiques.
- **Arrivée du Jour** : `client` (nom du client), `room` (numéro de chambre), `type` (type de pension, ex: BB/DP), `time` (heure d'arrivée).
- **Départ du Jour** : `client` (nom du client), `room` (numéro de chambre), `balance` (solde à régler, ex: "0 DH"), `status` (statut du solde, ex: "soldé").

## Success Criteria

### Measurable Outcomes

- **SC-001**: L'utilisateur admin/manager/comptable voit les 6 KPI (TO mensuel, TO du jour, ADR, RevPAR, DMS, CA mensuel) avec leurs évolutions respectives en moins de 3 secondes après l'arrivée sur /dashboard.
- **SC-002**: Le graphique de tendance annuelle s'affiche avec les 12 mois de l'année sélectionnée et se met à jour en moins de 2 secondes après changement d'année.
- **SC-003**: Les graphiques de répartition par segment (camembert et barres) s'affichent avec les données du mois/année sélectionnés et se mettent à jour en moins de 2 secondes après changement de filtre.
- **SC-004**: La comparaison N vs N-1 (YTD et mensuelle) affiche les deltas pour tous les indicateurs sans aucune valeur NaN, Infinity ou undefined, même quand N-1 = 0.
- **SC-005**: Un receptionist ou housekeeping_supervisor qui tente d'accéder à /dashboard est redirigé vers une autre page (accès refusé) en moins de 1 seconde.
- **SC-006**: Aucune erreur JavaScript visible (NaN, Infinity, undefined, crash) n'apparaît sur le dashboard, quelles que soient les conditions de données (API indisponible, données partielles, valeurs nulles, années sans données).
- **SC-007**: Les arrivées et départs du jour sont affichés avec un badge "Démo" lorsque les données mockées sont utilisées.
- **SC-008**: Tous les appels API du dashboard transitent par le gateway (préfixe `/api/analytics/...`), vérifiable via les logs réseau du navigateur.

## Assumptions

- Le service analytics (port 4006) expose tous les endpoints requis via le gateway (port 4000) : `/api/analytics/dashboard`, `/api/analytics/dashboard/trend`, `/api/analytics/segments`, `/api/analytics/segments/distribution`, `/api/analytics/comparison/ytd`, `/api/analytics/comparison/monthly`.
- Les données KPI sont calculées côté backend en ne comptant que les bookings avec statut `checked_in` ou `checked_out` ; le frontend n'a pas à filtrer.
- Le endpoint `GET /api/analytics/segments` retourne la liste des groupes de segments (DIRECT, OTA, PARTENAIRES) avec leurs codes et labels. Les couleurs par groupe sont définies côté frontend via les tokens Tailwind existants (`accent`, `emerald`, `amber`).
- Le endpoint `GET /api/analytics/segments/distribution` retourne à la fois les données pour le camembert (nuitées) et pour le barChart (revenus).
- Le endpoint `GET /api/analytics/comparison/monthly` retourne une réponse 200 avec `previous.occupancyRate = 0`, `previous.adr = 0`, `previous.revpar = 0`, `previous.revenue = 0` et `deltas.* = null` quand aucune donnée N-1 n'existe — pas d'erreur 404.
- Le filtre segment optionnel sur les vues de comparaison est passé en paramètre query et géré côté backend.
- Le comportement actuel de fallback vers les données mockées (via try/catch) est conservé pour permettre le développement frontend sans backend opérationnel.
- La page dashboard existante (`app/dashboard/page.tsx`) est modifiée sur place — pas de nouvelle page créée.
- Les arrivées/départs du jour restent en mode mocké permanent (aucun endpoint public n'expose ces données) avec un badge "Démo" pour signaler le caractère non connecté de ces données. Cette décision est documentée ici et dans DASH-FR-025/DASH-FR-026.
- Le composant chart existant `EvolutionChart.tsx` (dual-axis TO/ADR) est conservé sans modification structurelle : seule la source de données passe des mocks tarification aux données de `GET /api/analytics/dashboard/trend`.
- Les composants chart existants (`EvolutionChart.tsx`, `SegmentChart.tsx`) sont adaptés pour consommer les données de l'API analytics au lieu des données mockées de tarification.
- Le middleware `middleware.ts` doit être modifié pour ajouter `/dashboard` à la map `ROLE_RESTRICTIONS` avec les rôles `admin`, `manager`, `comptable`.
- Le format des données de comparaison mensuelle nécessite probablement l'ajout de nouveaux types dans `types/index.ts` ou l'extension des types existants.
- Les sélecteurs de mois/année utilisent le pattern existant (select dropdown) déjà en place sur le dashboard.
- Les icônes Bootstrap Icons (`bi bi-*`) continuent d'être utilisées pour tous les éléments visuels du dashboard.
