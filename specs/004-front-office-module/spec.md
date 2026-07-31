# Feature Specification: Module Front Office — Gestion Complète du Séjour

**Feature Directory**: `specs/004-front-office-module`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Développer le module Front Office du frontend OASIS PMS — consultation des chambres, check-in, folios (prestations facturées), check-out avec encaissement, et paiements/factures du jour, en remplaçant les données codées en dur par de vrais appels API, avec contrôle d'accès strict par rôle."

## Clarifications

### Session 2026-07-31

- **Q1**: Où placer la section "Paiements et Factures du Jour" (US6, FR-030/031/032) ? → **A**: Option A — Troisième onglet dans FrontOfficeTabs, route `/front-office/payments`, avec trois sous-sections (paiements du jour, factures du jour, et consultation de folio en lecture seule — FR-037). Accessible à tous les rôles authentifiés (admin, manager, receptionist, housekeeping_supervisor, comptable). Cette route a un périmètre d'accès plus large que les onglets check-in et check-out (restreints selon la matrice de rôles). La sous-section "Consultation de folio" est le moyen concret pour le comptable d'exercer son droit GET sur les folios (FR-033).
- **Q2**: La spec restreint housekeeping_supervisor de l'accès aux pages de check-in/check-out/folios (US1, US7) alors que les endpoints GET correspondants dans le backend n'ont pas de restriction de rôle (front-office.md §2.3, §2.4, lignes "(sans role)" de la matrice). → **A**: Confirmé — c'est un choix de restriction UI volontaire et plus strict que ce que l'API backend autorise. Voir Assumptions.

## User Scenarios & Testing

### User Story 1 — Consulter les chambres et filtrer par statut housekeeping (Priority: P1)

En tant que **réceptionniste, gouvernante, admin ou manager**, je veux voir la liste des chambres actives avec leur statut housekeeping, et filtrer par statut pour identifier les chambres disponibles ou nécessitant une intervention, afin d'organiser les affectations et le travail d'étage.

**Why this priority**: La consultation des chambres est le prérequis pour tout le cycle de vie du séjour. Sans cette vue, aucun utilisateur ne peut travailler.

**Independent Test**: L'utilisateur connecté avec un rôle autorisé (admin, manager, receptionist, housekeeping_supervisor) navigue vers /front-office/check-in et voit la liste des chambres avec leur statut housekeeping (propre, sale, controlee, etc.) et peut filtrer par statut via une liste déroulante.

**Acceptance Scenarios**:

1. **Given** l'utilisateur a le rôle receptionist et navigue vers /front-office/check-in, **When** la page se charge, **Then** une liste de toutes les chambres actives est affichée avec pour chaque chambre : numéro, catégorie, étage, type de lit, capacité max, et statut housekeeping.
2. **Given** l'utilisateur sélectionne un statut housekeeping dans le filtre (ex: "propre"), **When** le filtre est appliqué, **Then** seules les chambres avec ce statut sont affichées.
3. **Given** l'utilisateur est housekeeping_supervisor, **When** il clique sur une chambre, **Then** il peut modifier le statut housekeeping via une interface dédiée, avec un champ obligatoire "Motif de blocage" si le statut choisi est "bloquee".
4. **Given** l'utilisateur est receptionist, **When** il consulte une chambre, **Then** il voit le statut housekeeping mais ne peut pas le modifier (aucun bouton/action de modification affiché).
5. **Given** le backend retourne une erreur 502 (service indisponible), **When** la liste des chambres ne peut pas être chargée, **Then** un message "Service temporairement indisponible" est affiché, pas une page vide ou un crash.

---

### User Story 2 — Effectuer un check-in complet avec pro-forma (Priority: P1)

En tant que **réceptionniste, admin ou manager**, je veux consulter les détails d'une réservation, générer et afficher la facture pro-forma, puis effectuer le check-in en une action, afin d'enregistrer l'arrivée du client.

**Why this priority**: Le check-in est l'opération centrale du Front Office. Sans elle, le cycle de vie du séjour ne peut pas démarrer.

**Independent Test**: L'utilisateur saisit un numéro de réservation, voit les détails et la pro-forma si disponible, et clique sur "Check-in" pour finaliser l'arrivée. Les folios A et B sont créés et le statut passe à status_checked_in.

**Acceptance Scenarios**:

1. **Given** l'utilisateur fournit un bookingId valide, **When** il consulte les détails, **Then** les informations du client, de la chambre, des dates et des montants sont affichées.
2. **Given** le statut de la réservation est status_option, status_confirmed ou status_voucher, **When** l'utilisateur demande la pro-forma, **Then** la facture pro-forma est générée et affichée avec le détail du séjour, du tarif et du solde dû.
3. **Given** le statut de la réservation n'est pas autorisé pour la pro-forma (ex: status_checked_in), **When** l'utilisateur demande la pro-forma, **Then** le message d'erreur exact retourné par le backend est affiché.
4. **Given** le statut housekeeping de la chambre est "controlee" ou "propre", **When** l'utilisateur clique sur "Check-in", **Then** le check-in est effectué avec succès et les folios A et B sont créés.
5. **Given** la chambre n'est pas prête (statut housekeeping ≠ "controlee" et ≠ "propre"), **When** l'utilisateur tente le check-in, **Then** un message d'erreur explicite "Chambre non prête. Statut: <statut>" est affiché et le check-in est bloqué.
6. **Given** le dossier est verrouillé (locked après check-out), **When** l'utilisateur tente le check-in, **Then** le message "Check-in impossible. Dossier verrouillé après check-out." est affiché.

---

### User Story 3 — Annuler un check-in si aucune prestation n'a été enregistrée (Priority: P2)

En tant que **réceptionniste, admin ou manager**, je veux pouvoir annuler un check-in tant qu'aucune prestation n'a été ajoutée aux folios, afin de corriger une erreur d'arrivée sans conséquence comptable.

**Why this priority**: Fonctionnalité importante pour la flexibilité opérationnelle, mais moins critique que le check-in lui-même. Un check-in erroné peut être géré temporairement.

**Independent Test**: L'utilisateur consulte un check-in actif, voit le bouton "Annuler le check-in" actif uniquement si le folio ne contient aucune prestation, et procède à l'annulation.

**Acceptance Scenarios**:

1. **Given** le statut de la réservation est status_checked_in et le folio est vide (aucune prestation), **When** l'utilisateur clique sur "Annuler le check-in", **Then** le check-in est annulé et le statut repasse à status_confirmed.
2. **Given** le folio contient au moins une prestation, **When** l'utilisateur consulte la réservation, **Then** le bouton "Annuler le check-in" est désactivé (grisé) avec un message "Impossible d'annuler : des prestations ont été enregistrées."
3. **Given** les prestations existent sur le folio mais l'utilisateur tente l'annulation par API, **When** l'API retourne une erreur 400, **Then** le message d'erreur exact "Impossible d'annuler. Des prestations ont été enregistrées sur le folio." est affiché.

---

### User Story 4 — Gérer les prestations d'un folio (ajout, masquage, suppression) (Priority: P1)

En tant que **réceptionniste, admin ou manager**, je veux ajouter des prestations au folio d'un client (minibar, spa, room service), masquer des prestations à l'impression, et les supprimer (admin/manager uniquement), afin de gérer la facturation du séjour.

**Why this priority**: La gestion des prestations est le cœur de la facturation. Sans elle, les folios sont vides et le check-out ne peut pas être finalisé correctement.

**Independent Test**: L'utilisateur sélectionne un folio, voit la liste des prestations avec leurs montants, peut en ajouter (tous rôles autorisés), masquer à l'impression (tous rôles autorisés), et supprimer (admin/manager uniquement). Le receptionist ne voit pas le bouton "Supprimer".

**Acceptance Scenarios**:

1. **Given** l'utilisateur est admin, manager ou receptionist, **When** il consulte un folio ouvert, **Then** la liste de toutes les prestations (allItems) est affichée avec description, catégorie, quantité, prix unitaire, montant total, et indicateur de visibilité à l'impression.
2. **Given** l'utilisateur est admin, manager ou receptionist, **When** il clique sur "Ajouter une prestation", **Then** un formulaire lui permet de saisir description, catégorie, quantité et prix unitaire, et la prestation est ajoutée au folio.
3. **Given** le folio est clôturé (closed), **When** l'utilisateur tente d'ajouter une prestation, **Then** le formulaire d'ajout est désactivé avec le message "Folio clôturé. Impossible d'ajouter des prestations."
4. **Given** l'utilisateur est receptionist, **When** il consulte une prestation, **Then** le bouton "Supprimer" n'est pas affiché (conformément à la matrice des rôles).
5. **Given** l'utilisateur est admin ou manager, **When** il consulte une prestation sur un folio ouvert, **Then** le bouton "Supprimer" est affiché et actif.
6. **Given** l'utilisateur est admin, manager ou receptionist, **When** il masque une prestation à l'impression, **Then** l'indicateur de visibilité bascule et le montant total du folio (totalAmount) reste inchangé.
7. **Given** l'utilisateur consulte un folio, **When** il voit les prestations, **Then** la distinction entre allItems (toutes) et printableItems (visibles à l'impression) est claire, et le montant total affiché correspond au total réel (jamais affecté par le masquage).

---

### User Story 5 — Effectuer un check-out avec encaissement exact (Priority: P1)

En tant que **réceptionniste, admin ou manager**, je veux consulter l'extrait de compte complet (folios A+B, paiements déjà enregistrés, total dû), puis effectuer le check-out en encaissant le montant exact du solde, réparti sur un ou plusieurs modes de paiement, afin de clôturer le séjour du client.

**Why this priority**: Le check-out est l'opération finale du cycle de vie du séjour. Sans elle, la chambre ne peut pas être libérée et le client ne peut pas partir.

**Independent Test**: L'utilisateur consulte l'extrait de compte d'une réservation en cours, voit le total des charges, le total payé, et le solde dû. Il sélectionne un ou plusieurs modes de paiement pour un montant total égal au solde dû, et finalise le check-out.

**Acceptance Scenarios**:

1. **Given** le statut de la réservation est status_checked_in, **When** l'utilisateur consulte l'extrait de compte, **Then** il voit les folios A et B avec toutes leurs prestations, le total des charges (totalCharges), le total déjà payé (totalPaid), et le solde dû (balanceDue = totalCharges - totalPaid).
2. **Given** l'utilisateur est sur l'extrait de compte, **When** il examine les montants, **Then** les valeurs affichées proviennent de l'API (GET /api/checkout/:bookingId/statement) et non de données codées en dur.
3. **Given** l'utilisateur doit encaisser un solde dû, **When** il sélectionne un ou plusieurs modes de paiement (cb, esp, chq, virement, debiteur), **Then** le total des montants saisis correspond exactement au solde dû (validation frontend avec tolérance 1 centime).
4. **Given** le total des paiements saisis ne correspond pas au solde dû, **When** l'utilisateur tente de valider, **Then** un message d'erreur est affiché côté frontend sans envoi à l'API ("Le montant total des paiements doit correspondre au solde dû").
5. **Given** le check-out est effectué avec succès, **When** l'utilisateur voit la confirmation, **Then** un message explicite l'informe que l'opération est irréversible : le dossier est verrouillé, le statut est passé à status_checked_out, les folios sont clôturés, et le check-in ne peut plus être réactivé.
6. **Given** le statut de la réservation est status_checked_out, **When** l'utilisateur consulte l'extrait de compte, **Then** l'extrait est toujours visible (GET autorisé pour status_checked_out) mais aucune action de modification n'est proposée.

---

### User Story 6 — Consulter les paiements, factures du jour et folios en lecture seule (Priority: P3)

En tant que **comptable, admin, manager, réceptionniste ou gouvernante**, je veux voir la liste des paiements enregistrés aujourd'hui, la liste des folios clôturés/factures du jour, et consulter un folio précis en lecture seule, afin d'avoir une vue d'ensemble de l'activité financière quotidienne.

**Why this priority**: Fonctionnalité de consultation transverse, utile pour le suivi quotidien mais non bloquante pour les opérations de Front Office. La sous-section de consultation de folio en lecture seule est le **seul moyen pour le rôle comptable d'exercer son droit GET sur les folios** (FR-033), les onglets check-in et check-out lui étant bloqués par le middleware — sans elle, ce droit ne serait pas exerçable dans l'UI.

**Independent Test**: L'utilisateur navigue vers l'onglet "Paiements" de FrontOfficeTabs (route `/front-office/payments`) et voit trois sous-sections : la liste des paiements du jour, la liste des factures du jour, et la consultation de folio en lecture seule (recherche par bookingId ou folioId).

**Acceptance Scenarios**:

1. **Given** l'utilisateur est connecté (admin, manager, receptionist, housekeeping_supervisor ou comptable), **When** il navigue vers l'onglet `/front-office/payments`, **Then** la page s'affiche avec les sous-sections paiements du jour et factures du jour ; la sous-section "Consultation de folio" est affichée pour les rôles admin, manager, receptionist et comptable uniquement.
2. **Given** l'utilisateur consulte la sous-section des paiements, **When** les données sont chargées, **Then** la liste des paiements du jour est affichée avec le montant, le mode de paiement, et la date de traitement.
3. **Given** l'utilisateur consulte la sous-section des factures, **When** les données sont chargées, **Then** la liste des folios clôturés du jour est affichée avec le montant total et les prestations associées.
4. **Given** aucun paiement ou facture n'existe pour la date demandée, **When** l'utilisateur consulte la sous-section correspondante, **Then** un message "Aucune donnée pour cette date" est affiché (pas d'erreur).
5. **Given** l'utilisateur a le rôle comptable (ou admin, manager, receptionist), **When** il saisit un folioId dans la sous-section "Consultation de folio", **Then** le détail complet du folio (`GET /api/folios/:folioId`) est affiché en lecture seule — prestations `allItems`, total (`totalAmount`) — sans aucun bouton d'ajout, de masquage ou de suppression.
6. **Given** l'utilisateur a le rôle comptable (ou admin, manager, receptionist), **When** il saisit un bookingId dans la sous-section "Consultation de folio", **Then** l'extrait de compte (`GET /api/checkout/:bookingId/statement`) est affiché en lecture seule — folios A et B, prestations, paiements, totalCharges, totalPaid — sans aucune action de modification.
7. **Given** l'utilisateur a le rôle housekeeping_supervisor, **When** il consulte la page `/front-office/payments`, **Then** la sous-section "Consultation de folio" n'est pas affichée (pas de droit GET sur les folios selon la matrice front-office.md §4).
8. **Given** un folio ou une réservation introuvable est recherché, **When** l'utilisateur valide la recherche, **Then** le message d'erreur exact du backend est affiché (ex: "Folio introuvable") sans crash ni page vide.

---

### User Story 7 — Contrôle d'accès strict par rôle (Priority: P1)

En tant que **gouvernante (housekeeping_supervisor)**, je ne dois pouvoir que consulter les chambres et modifier leur statut housekeeping, sans aucun accès au check-in/check-out/folios. En tant que **comptable**, je ne dois pouvoir que consulter les folios, paiements et factures en lecture seule.

**Why this priority**: La matrice des rôles est une exigence de sécurité contractuelle. Chaque rôle doit être strictement limité à ses actions autorisées, sans possibilité de contournement.

**Independent Test**: Un utilisateur avec le rôle housekeeping_supervisor tente d'accéder à /front-office/check-in et voit la liste des chambres mais pas les actions de check-in. Un utilisateur avec le rôle comptable tente d'accéder aux folios et voit les données en lecture seule.

**Acceptance Scenarios**:

1. **Given** l'utilisateur a le rôle housekeeping_supervisor, **When** il navigue vers /front-office/check-in, **Then** il voit uniquement la liste des chambres avec possibilité de modifier le statut housekeeping, sans aucun élément UI lié au check-in, aux folios ou au check-out.
2. **Given** l'utilisateur a le rôle housekeeping_supervisor, **When** il tente d'accéder à /front-office/check-out, **Then** le middleware le redirige (accès refusé).
3. **Given** l'utilisateur a le rôle comptable, **When** il consulte un folio, **Then** il voit les détails en lecture seule sans bouton d'ajout, masquage ou suppression de prestation.
4. **Given** l'utilisateur a le rôle receptionist, **When** il consulte une prestation, **Then** le bouton "Supprimer" n'est pas présent dans l'UI.
5. **Given** l'utilisateur a le rôle admin ou manager, **When** il consulte une prestation, **Then** le bouton "Supprimer" est présent et actif.

---

### Edge Cases

- **Service indisponible (502)** : Quand le gateway retourne 502 (housekeeping, réservations ou tarification indisponible), afficher "Service temporairement indisponible" — jamais de crash ou de page blanche.
- **Chambre non prête au check-in** : Si le statut housekeeping n'est ni "controlee" ni "propre", le check-in est refusé avec le message exact du backend "Chambre non prête. Statut: <statut>".
- **Dossier verrouillé** : Si booking.locked === true (après check-out), le check-in est impossible. Afficher le message exact "Check-in impossible. Dossier verrouillé après check-out."
- **Montant de paiement incorrect au check-out** : Le frontend valide que le total des paiements saisis correspond exactement au solde dû avant l'envoi, pour éviter un rejet 400 inutile.
- **Check-in annulable uniquement si folio vide** : Si des prestations existent sur les folios, l'action d'annulation est désactivée dans l'UI avec un message explicite.
- **Folio clôturé** : Si le statut du folio est "closed", les actions d'ajout et de suppression de prestation sont désactivées.
- **Statut housekeeping invalide** : Si l'utilisateur tente de filtrer avec un statut housekeeping invalide (hors liste : sale, nettoyage_en_cours, propre, controlee, bloquee), le backend retourne une erreur 400 qui doit être affichée à l'utilisateur.
- **Session expirée pendant l'opération** : Si le token expire pendant une action de check-in ou check-out, la redirection vers /login doit s'effectuer sans perte de données (l'utilisateur peut reprendre après reconnexion).
- **Pro-forma indisponible** : Si le statut de la réservation n'est pas status_option, status_confirmed ou status_voucher, afficher le message d'erreur exact "Pro-forma indisponible. Statut actuel: <status>".
- **Folio ou réservation introuvable en consultation** : Dans la sous-section "Consultation de folio" de `/front-office/payments`, un folioId ou bookingId inexistant affiche le message d'erreur exact du backend (ex: "Folio introuvable") — jamais de crash ni de tableau vide silencieux.

## Requirements

### Functional Requirements

#### Section Chambres (Room View)

- **FR-001**: System MUST display a list of all active rooms loaded from `GET /api/rooms`, showing for each room: room number, category, floor, bed type, max occupancy, and housekeeping status.
- **FR-002**: System MUST provide a filter by housekeeping status, calling `GET /api/rooms/status/:status`, with valid status values: `sale`, `nettoyage_en_cours`, `propre`, `controlee`, `bloquee`.
- **FR-003**: System MUST display room detail when a room is selected, loaded from `GET /api/rooms/:roomId` (which accepts UUID or room number).
- **FR-004**: System MUST allow users with role admin, manager, or housekeeping_supervisor to update the housekeeping status via `PATCH /api/rooms/:roomId/status` (or `/api/rooms/numero/:numero/status`).
- **FR-005**: System MUST require a `blockReason` field when the new housekeeping status is `bloquee`, enforced as mandatory in the UI.
- **FR-006**: System MUST NOT display any housekeeping status modification UI for users with role receptionist (read-only room access).

#### Section Check-in

- **FR-007**: System MUST allow users to retrieve booking details via `GET /api/checkin/:bookingId`, displaying customer/guest info, room, dates, pax, regime, rates, deposit, and market segment.
- **FR-008**: System MUST generate and display the pro-forma invoice via `GET /api/checkin/:bookingId/proforma` when the booking status is `status_option`, `status_confirmed`, or `status_voucher`.
- **FR-009**: System MUST display the exact error message from the backend when the pro-forma is unavailable (status not in allowed set), without generic fallback.
- **FR-010**: System MUST allow users with role admin, manager, or receptionist to execute the check-in action via `POST /api/checkin/:bookingId` (empty body).
- **FR-011**: System MUST display the specific business error returned by the backend for each check-in failure case: dossier verrouillé, statut non autorisé, chambre non prête (statut housekeeping ≠ controlee/propre), chambre introuvable, service housekeeping indisponible (503).
- **FR-012**: System MUST display folio data (Folio A + Folio B items) loaded from the API (`GET /api/folios/:folioId`) after successful check-in, replacing any hardcoded FOLIO_A_LINES data.
- **FR-013**: System MUST allow users with role admin, manager, or receptionist to cancel a check-in via `DELETE /api/checkin/:bookingId`, but only when the booking status is `status_checked_in` and no folio items exist.
- **FR-014**: System MUST disable the "Cancel check-in" button in the UI when folio items exist, with an explicit message "Impossible d'annuler : des prestations ont été enregistrées sur le folio."

#### Section Folios (Prestations)

- **FR-015**: System MUST display the complete folio detail loaded from `GET /api/folios/:folioId`, distinguishing between `allItems` (all items including hidden) and `printableItems` (visible on print only).
- **FR-016**: System MUST display the folio total amount (`totalAmount`) based on all items, never affected by the print visibility flag.
- **FR-017**: System MUST allow users with role admin, manager, or receptionist to add a new folio item via `POST /api/folios/:folioId/items`, with required fields: description, category, quantity, unitPrice, and optional taxRate.
- **FR-018**: System MUST disable the add-item UI when the folio status is `closed`, with an explicit message.
- **FR-019**: System MUST allow users with role admin, manager, or receptionist to toggle item print visibility individually (`PATCH /api/folios/items/:itemId/visibility`) or in batch (`PATCH /api/folios/:folioId/items/visibility`).
- **FR-020**: System MUST allow users with role admin or manager ONLY to delete a folio item via `DELETE /api/folios/items/:itemId`.
- **FR-021**: System MUST NOT display any delete button for users with role receptionist (per matrix).
- **FR-022**: System MUST disable the delete-item UI when the folio status is `closed`, with an explicit message.

#### Section Check-out

- **FR-023**: System MUST display the complete account statement loaded from `GET /api/checkout/:bookingId/statement`, showing: booking info, folios A+B with all items, existing payments, totalCharges, and totalPaid.
- **FR-024**: System MUST replace any hardcoded payment summary data (e.g., "3 000 DH", "450 DH") with values from the account statement API response.
- **FR-025**: System MUST allow users with role admin, manager, or receptionist to execute the check-out action via `POST /api/checkout/:bookingId`.
- **FR-026**: System MUST calculate `balanceDue = totalCharges - totalPaid` client-side and display it as the amount to be collected.
- **FR-027**: System MUST allow the user to split the payment across one or more payment methods among: `cb`, `esp`, `chq`, `virement`, `debiteur` (case-sensitive, lowercase).
- **FR-028**: System MUST validate client-side that the sum of entered payments exactly matches `balanceDue` (within 1 centime tolerance) before submitting, displaying an explicit error if mismatched.
- **FR-029**: System MUST display an irreversible-operation warning after successful check-out: booking locked definitively, status set to `status_checked_out`, folios closed, check-in cannot be reactivated.

#### Section Paiements et Factures du Jour (route `/front-office/payments`)

- **FR-030**: System MUST display the daily payments list loaded from `GET /api/payments?date=YYYY-MM-DD`, accessible to all authenticated roles via the `/front-office/payments` route (third FrontOfficeTabs tab).
- **FR-031**: System MUST display the daily invoices/closed folios list loaded from `GET /api/invoices?date=YYYY-MM-DD`, accessible to all authenticated roles via the `/front-office/payments` route.
- **FR-032**: System MUST display an empty-state message "Aucune donnée pour cette date" when the API returns zero results for payments or invoices.
- **FR-037**: System MUST provide a read-only "Consultation de folio" subsection on the `/front-office/payments` route, allowing roles admin, manager, receptionist and comptable to load a folio detail via `GET /api/folios/:folioId` (search by folioId) or via `GET /api/checkout/:bookingId/statement` (search by bookingId). The subsection MUST NOT display any modification action (add, toggle visibility, delete) for any role — consultation only. This subsection is the concrete UI path through which the comptable role exercises its GET access to folios (FR-033), since the check-in/check-out pages are blocked for it by the middleware. For the housekeeping_supervisor role, the subsection MUST NOT be rendered.

#### Contrôle d'Accès et Sécurité

- **FR-033**: The middleware (`middleware.ts`) MUST restrict route access according to the exact role matrix defined in front-office.md §4: housekeeping_supervisor restricted to rooms only (check-in page, rooms zone); comptable restricted to folios (GET), payments (GET), and invoices (GET) — its GET access to folios MUST be exercisable through the read-only "Consultation de folio" subsection of the `/front-office/payments` route (FR-037), the only page where a folio is visible to it; receptionist allowed full check-in/check-out/folios except DELETE folio items. The `/front-office/payments` route is an exception — accessible to all authenticated roles (admin, manager, receptionist, housekeeping_supervisor, comptable).
- **FR-034**: System MUST conditionally render UI actions based on the user's role at the component level — no action button shall be visible for unauthorized roles.
- **FR-035**: System MUST read the user's role from the Zustand auth store (`useAuthStore`) for client-side role checks, never from raw JWT decoding.
- **FR-036**: System MUST NOT expose any UI to modify folios or check-in after check-out (irreversibility enforced by disabling all modification actions when status is `status_checked_out`).
- **FR-038**: System MUST NOT expose any UI element (button, link, form) that triggers the seed endpoint (`POST /api/seed` on the front-office service, reachable via the gateway at `POST /api/front-office/seed`) — this endpoint is unauthenticated and destructive per front-office.md §2.1. No seed data in `lib/api/frontOffice.ts`, no button/link/form referencing it anywhere in the UI. Consistent with DASH-FR-029 (analytics dashboard) and FR-015 (analytics module).

### Key Entities

- **Chambre (Room)** — Une chambre d'hôtel avec numéro, catégorie, étage, type de lit, capacité, statut housekeeping (sale, nettoyage_en_cours, propre, controlee, bloquee) et motif de blocage optionnel.
- **Réservation (Booking)** — Un séjour réservé avec référence, statut (status_option, status_confirmed, status_voucher, status_checked_in, status_checked_out), client, chambre, dates, pax, régime, tarif, dépôt, segment de marché.
- **Check-in** — L'action d'enregistrer l'arrivée d'un client. Crée les folios A et B, passe le statut à status_checked_in.
- **Check-out** — L'action de clôturer le séjour avec encaissement. Passe le statut à status_checked_out, verrouille le dossier, clôture les folios, marque la chambre "sale".
- **Folio** — Compte de prestations facturées, de type A (séjour) ou B (extras). Statut open ou closed. Contient des items (prestations) avec montant total.
- **Prestation (Folio Item)** — Ligne de facturation avec description, catégorie, quantité, prix unitaire, taux de taxe, montant total, et indicateur de visibilité à l'impression (isVisibleOnPrint).
- **Paiement (Payment)** — Transaction financière avec montant, mode de paiement (cb, esp, chq, virement, debiteur), référence, et date de traitement.
- **Extrait de Compte (Statement)** — Vue consolidée d'une réservation en cours ou terminée : folios A+B, items, paiements, totalCharges, totalPaid.
- **Facture Pro-forma** — Estimation du coût du séjour avant check-in, incluant le détail du séjour, le tarif, et le solde dû après dépôt.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un réceptionniste peut consulter les chambres, effectuer un check-in complet avec pro-forma, gérer les prestations d'un folio (sauf suppression), et effectuer un check-out avec calcul exact du montant à encaisser, le tout sans accès à la suppression de prestation ni aux statistiques de performance.
- **SC-002**: Une gouvernante (housekeeping_supervisor) peut consulter les chambres et changer leur statut housekeeping, sans aucun accès aux écrans de check-in, check-out ou folios.
- **SC-003**: Un comptable peut consulter les folios, paiements et factures en lecture seule, sans aucune action de modification disponible dans l'UI — la consultation des folios s'exerce via la sous-section "Consultation de folio" de `/front-office/payments` (recherche par bookingId ou folioId), le comptable étant bloqué du check-in/check-out par le middleware.
- **SC-004**: Aucune donnée codée en dur (FOLIO_A_LINES, résumé de paiement "3 000 DH", etc.) ne subsiste dans le code final — toutes les valeurs affichées proviennent des appels API.
- **SC-005**: Toutes les erreurs métier précises du backend (chambre non prête, dossier verrouillé, montant incorrect, statut non autorisé) sont affichées textuellement à l'utilisateur — aucun message générique "Erreur" pour ces cas.
- **SC-006**: Les actions de modification de folio (ajout, masquage, suppression) sont désactivées dans l'UI quand le statut du folio est "closed", avec un message explicite.
- **SC-007**: L'action d'annulation de check-in est désactivée dans l'UI quand des prestations existent sur les folios, avec un message explicite.
- **SC-008**: Le montant total du folio (totalAmount) reste inchangé après masquage d'une prestation à l'impression — confirmé par inspection visuelle.
- **SC-009**: Le check-out échoue côté frontend (pas d'envoi API) si le total des paiements saisis ne correspond pas au solde dû, avec un message d'erreur explicite.
- **SC-010**: Une notification explicite est affichée après check-out réussi, informant du caractère irréversible de l'opération.
- **SC-011**: Le endpoint de seed n'est jamais atteignable depuis un élément UI de l'application (bouton, lien, formulaire) — confirmé par revue de code. (FR-038)

## Assumptions

- Le module Front Office utilise les routes existantes `app/front-office/check-in/page.tsx` et `app/front-office/check-out/page.tsx` avec l'onglet `FrontOfficeTabs` pour la navigation (redirection `/front-office` → `/front-office/check-in`). Un troisième onglet est ajouté pour les paiements et factures du jour sur la route `/front-office/payments`.
- La route `/front-office/payments` inclut une troisième sous-section "Consultation de folio" en lecture seule (FR-037). C'est le seul chemin UI par lequel le comptable accède aux folios : le middleware lui bloque `/front-office/check-in` et `/front-office/check-out`. Dans la Sidebar, le lien "Front Office" pointe vers `/front-office/payments` pour le rôle comptable, vers `/front-office/check-in` pour les autres rôles autorisés. Les onglets `FrontOfficeTabs` sont filtrés par rôle : le comptable ne voit que l'onglet "Paiements", la gouvernante (housekeeping_supervisor) voit "Check-in" (zone chambres uniquement) et "Paiements".
- Les fonctions API sont implémentées dans `lib/api/frontOffice.ts` suivant le pattern Service-Per-File défini dans la constitution, avec le `apiClient` partagé.
- Les types TypeScript correspondants sont ajoutés dans `types/index.ts` (Room, Folio, FolioItem, Statement, Payment, Invoice, etc.).
- Le middleware `middleware.ts` est modifié pour ajouter les routes `/front-office/check-in`, `/front-office/check-out`, et leurs sous-routes dans la map `ROLE_RESTRICTIONS` selon la matrice exacte de front-office.md §4 (check-in : admin/manager/receptionist/housekeeping_supervisor ; check-out : admin/manager/receptionist). La route `/front-office/payments` est accessible à tous les rôles authentifiés (admin, manager, receptionist, housekeeping_supervisor, comptable) — périmètre d'accès plus large que les deux autres onglets.
- **Restriction UI volontaire, plus stricte que l'API backend** : Les endpoints `GET /api/checkin/:bookingId`, `GET /api/checkin/:bookingId/proforma` et `GET /api/checkout/:bookingId/statement` n'ont aucun middleware `authorizeRoles` côté backend (front-office.md §2.3, §2.4) — tout utilisateur authentifié, quel que soit son rôle, peut techniquement les appeler. La spec restreint volontairement l'accès UI pour housekeeping_supervisor et comptable à ces fonctionnalités (US1, US7, FR-033/034), ce qui est un choix produit délibéré. L'implémentation doit garantir que ces restrictions sont appliquées à la fois dans le middleware (blocage de navigation) et au niveau des composants (éléments UI masqués), bien que l'API backend ne les refuse pas.
- Les appels API utilisent les préfixes gateway (`/api/rooms`, `/api/checkin`, `/api/checkout`, `/api/folios`, `/api/payments`, `/api/invoices`) et passent par `apiClient` — jamais d'appel direct au service front-office (port 4005).
- **Absence de fallback mock** : contrairement au pattern constitutionnel général (Section III, Mock/API Pattern), ce module suit le pattern Analytics validé. Aucune fonction API dans `lib/api/frontOffice.ts` ne vérifie `USE_MOCKS` et aucune ne contient de bloc catch avec retour de données mockées. En cas d'échec API, un message d'erreur utilisateur clair est affiché : "Service temporairement indisponible" pour les erreurs 502/infrastructure, ou le message métier exact du backend pour les erreurs 400/404/503 spécifiques (voir FR-011, FR-009).
- Les rôles backend sont des chaînes exactes, sensibles à la casse : `admin`, `manager`, `receptionist`, `housekeeping_supervisor`, `comptable`.
- Les composants UI utilisent le design system existant (Tailwind CSS, composants de `components/ui/`, icônes Bootstrap Icons) sans nouvelle dépendance externe.
- Les chargements et états d'erreur suivent le pattern existant (react-query `isLoading` et `isError` gérés inline dans les composants).
- Les données sont affichées en Français conformément à la constitution (locale fr).
- Les données des paiements et factures du jour sont chargées avec la date du jour comme valeur par défaut du paramètre `date`.
- Le calcul du solde dû (balanceDue) côté frontend est effectué après réception des données de l'extrait de compte.
