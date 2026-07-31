# Tasks: Module Front Office — Gestion Complète du Séjour

**Input**: Design documents from `/specs/004-front-office-module/`

**Prerequisites**: plan.md, spec.md (user stories US1–US7), research.md (R1–R9), data-model.md, contracts/api-contracts.md, contracts/component-contracts.md, quickstart.md (scénarios S1–S12).

**Tests**: Validation manuelle via les scénarios de `quickstart.md` (S1–S12) — aucun test unitaire demandé (pas d'approche TDD dans la spec). `npm run lint` + `npx tsc --noEmit` (pas de script typecheck dans package.json) à chaque checkpoint.

**Organization**: Tasks grouped by user story in priority order — P1 (US1 chambres, US2 check-in, US4 folios, US5 check-out), P2 (US3 annulation), P3 (US6 paiements/factures/consultation). US7 (contrôle d'accès) est transversal : implémenté en phase Foundational (middleware, page racine, Sidebar, onglets) + rendu conditionnel par rôle intégré dans chaque story.

**Gestion des conflits de fichiers (prérequis)** : `lib/api/frontOffice.ts` (17 fonctions) et `types/index.ts` (14+ types) sont des fichiers partagés. Ils sont écrits **une seule fois** dans la phase Foundational (T003, T005) — aucune tâche `[P]` n'y touche. Les pages/onglets partagés (check-in, check-out, CheckInBooking) sont modifiés dans des phases séquentielles distinctes, jamais en parallèle.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Vérification des prérequis et des contrats avant toute modification

- [X] T001 [P] Vérifier les contrats API front-office : relire `docs/front-office.md` (§2 endpoints, §5 réponses/erreurs exactes, §7 validations) et `docs/api-gateway.md` (§2.2/2.3 préfixe `/api/front-office`, §3.6 RBAC) et confirmer leur conformité avec `contracts/api-contracts.md` — aucun endpoint inventé (constitution Non-Negotiable #2, plan Gates #1)
- [X] T002 [P] Vérifier l'état de référence du repo : `npm install` à jour, `npm run lint` et `npx tsc --noEmit` passent avant toute modification (plan Technical Context, constitution TS strict)

**Checkpoint**: Base vérifiée — les tâches Foundational peuvent commencer.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types partagés, alignement housekeeping, couche API sans mock, contrôle d'accès (US7), anti-boucle, nettoyage du code mort. **⚠️ CRITICAL**: Aucun travail par user story avant cette phase.

> **Ordre de commit** : T003–T010 forment une unité atomique — le typecheck strict (`npx tsc --noEmit`) doit passer au checkpoint de fin de phase. Si la suppression des anciens types dans T003 (`FolioEntry`, `CheckOutSummary`, `PaymentMode`, `RoomStatus`) casse un consommateur, exécuter d'abord T005/T010 (suppression des consommateurs), puis T003 (suppression des types).

- [X] T003 Ajouter les types front-office dans `types/index.ts` : aligner `Room` sur le contrat `GET /api/rooms` (front-office.md §5.1 : `id`, `roomNumber`, `category`, `floor`, `bedType`, `maxOccupancy`, `housekeepingStatus`, `blockReason`) ; ajouter `HousekeepingStatus` (`sale | nettoyage_en_cours | propre | controlee | bloquee`), `Booking`, `Proforma`, `Folio`, `FolioItem`, `FolioDetail`, `Statement`, `StatementFolio`, `Payment`, `PaymentMethod` (`'cb' | 'esp' | 'chq' | 'virement' | 'debiteur'`), `PaymentsResponse`, `Invoice`, `InvoiceItem`, `InvoicesResponse`, `CheckInResult`, `CheckOutPayment`, `CheckOutResult` ; supprimer `FolioEntry`, `CheckOutSummary`, `PaymentMode`, `RoomStatus` après suppression de leurs consommateurs (T005/T010) (FR-001..037, data-model.md, R3/R7)
- [X] T004 Aligner le module housekeeping livré sur les types `Room`/`HousekeepingStatus` : `lib/api/housekeeping.ts` (mapping BE→FE nouvelle forme, maps FE↔BE sur `HousekeepingStatus`), `app/housekeeping/page.tsx` (`room.status` → `room.housekeepingStatus`, `room.reason` → `room.blockReason`, `HK_STATUS`/`ROOM_ICON` indexés par `HousekeepingStatus`), `components/layout/GlobalModals.tsx` et `components/context/ModalToastContext.tsx` (`RoomStatus` → `HousekeepingStatus`) (R3, FR-001 — dépend de T003)
- [X] T005 Réécrire `lib/api/frontOffice.ts` en suivant le pattern Analytics (aucun fallback mock) : 17 fonctions `getRooms`, `getRoomsByStatus`, `getRoom`, `updateRoomStatus`, `getBooking`, `getProforma`, `performCheckIn`, `cancelCheckIn`, `getStatement`, `performCheckOut`, `getFolio`, `addFolioItem`, `setItemVisibility`, `setItemsVisibility`, `deleteFolioItem`, `getPayments`, `getInvoices` + helper privé `toApiError` (502 → « Service temporairement indisponible », sinon `body.error` exact, réseau → « Service temporairement indisponible ») ; préfixes gateway `/api/front-office/...` via `apiClient` ; **supprimer** `USE_MOCKS`, `MOCK_CHECKINS`, `MOCK_CHECKOUTS`, `MOCK_FOLIO_A/B`, `mockDelay`, et les usages de `FolioEntry`/`CheckOutSummary`/`PaymentMode` (FR-001..037, SC-004/005, research.md R1/R2/R7, contracts/api-contracts.md — dépend de T003)
- [X] T006 [P] Mettre à jour `middleware.ts` : matcher à frontière de chemin `path === p || path.startsWith(p + '/')` remplaçant le `startsWith` brut de la boucle `ROLE_RESTRICTIONS`, et entrées par sous-route — `/front-office/check-in` → `['admin', 'manager', 'receptionist', 'housekeeping_supervisor']`, `/front-office/check-out` → `['admin', 'manager', 'receptionist']`, `/front-office/payments` → tous les 5 rôles, `/front-office` → tous les 5 rôles (page racine) — pour que l'entrée générique `/front-office` ne neutralise pas les restrictions spécifiques (FR-033, US7, research.md R4, plan Complexity Tracking)
- [X] T007 [P] Corriger la boucle de redirection de `app/front-office/page.tsx` : redirection par rôle lue depuis `useAuthStore` après hydratation (`isHydrating === false`) — `comptable` → `/front-office/payments`, `admin`/`manager`/`receptionist`/`housekeeping_supervisor` → `/front-office/check-in`, session nulle → `/login` — au lieu d'une redirection fixe vers check-in (jamais de décodage JWT brut, FR-035) ; déjà implémenté partiellement — vérifier et ajuster si besoin (FR-033/035, quickstart.md S12)
- [X] T008 [P] Modifier `components/layout/Sidebar.tsx` : l'item « Front Office » du comptable pointe vers `/front-office/payments` (au lieu de `/front-office/check-in`) ; les autres rôles autorisés conservent `/front-office/check-in` (FR-033/034, research.md R8)
- [X] T009 [P] Modifier `components/front-office/FrontOfficeTabs.tsx` : ajouter l'onglet « Paiements » (`/front-office/payments`, icône `bi-cash-stack`) et filtrer les onglets par rôle via `useAuthStore` (FR-035) — `comptable` → « Paiements » uniquement ; `housekeeping_supervisor` → « Check-in » + « Paiements » ; `admin`/`manager`/`receptionist` → les trois onglets (FR-034/035, US7-1, research.md R8)
- [X] T010 [P] Supprimer les données codées en dur des pages : `FOLIO_A_LINES` (bloc prestations factices) dans `app/front-office/check-in/page.tsx`, et le résumé de paiement codé en dur (« 3 000 DH / 450 DH / 3 540 DH ») + liste `PAYMENT_MODES` (`cb/esp/chq/vir/deb`) dans `app/front-office/check-out/page.tsx` (SC-004, FR-012/024 — dépend de T003 pour la suppression des types obsolètes)

**Checkpoint**: Foundation ready — couche API sans mock, types en place, contrôle d'accès US7 configuré (middleware + navigation), code mort supprimé. `npx tsc --noEmit` doit passer. Les user stories peuvent commencer (en parallèle si staffing le permet).

---

## Phase 3: User Story 1 — Consulter les chambres et filtrer par statut housekeeping (Priority: P1) 🎯 MVP

**Goal**: Zone chambres dans `/front-office/check-in` : liste des chambres actives, filtre par statut housekeeping, détail de chambre, mise à jour du statut (admin/manager/housekeeping_supervisor), lecture seule pour receptionist.

**Independent Test**: Connecté avec un rôle autorisé, naviguer vers `/front-office/check-in` : liste des chambres avec numéro, catégorie, étage, type de lit, capacité, statut housekeeping ; filtre par statut fonctionnel ; receptionist sans contrôle de modification. La restriction « housekeeping_supervisor voit uniquement la zone chambres » (aucune zone check-in : recherche, pro-forma, action check-in, folios) est validée sur la page intégrée finale US1+US2 (T013/T014) — voir T024 (FR-034, US7-1). (quickstart.md S1, S2)

### Implementation for User Story 1

- [X] T011 [P] [US1] Créer `components/front-office/RoomList.tsx` : liste `getRooms()` (queryKey `['fo-rooms']`), filtre `getRoomsByStatus(status)` (queryKey `['fo-rooms', status]`, statuts valides `sale | nettoyage_en_cours | propre | controlee | bloquee`), détail `getRoom(roomId)` (queryKey `['fo-room', roomId]`, UUID ou numéro), mutation `updateRoomStatus(roomId, housekeepingStatus, blockReason?)` avec champ `blockReason` obligatoire si `bloquee` (FR-005) ; états loading/error/empty (« Aucune chambre ») ; rendu de la modification de statut **uniquement** pour admin/manager/housekeeping_supervisor (lecture `useAuthStore`, FR-006/034/035) ; invalidation `['fo-rooms']` après mutation (FR-001..006, US7-1, contracts/component-contracts.md)
- [X] T012 [US1] Intégrer la zone chambres dans `app/front-office/check-in/page.tsx` via `<RoomList/>` en remplaçant la liste/le statut codés en dur (FR-001..006 — dépend de T011)

**Checkpoint**: US1 fonctionnelle et testable indépendamment (S1, S2).

---

## Phase 4: User Story 2 — Effectuer un check-in complet avec pro-forma (Priority: P1)

**Goal**: Zone check-in : recherche d'une réservation par bookingId, détail complet, génération et affichage de la pro-forma, action de check-in, chargement des folios A et B depuis l'API.

**Independent Test**: Saisir un bookingId valide → détails affichés ; « Générer la pro-forma » → pro-forma (statut option/confirmed/voucher) ; « Check-in » → succès, folios A et B chargés depuis l'API ; erreurs métier exactes affichées textuellement. (quickstart.md S3, S4)

### Implementation for User Story 2

- [X] T013 [P] [US2] Créer `components/front-office/CheckInBooking.tsx` : recherche bookingId → `getBooking(bookingId)` (queryKey `['fo-booking', bookingId]`, `enabled: !!bookingId`, FR-007) ; pro-forma `getProforma(bookingId)` (queryKey `['fo-proforma', bookingId]`, FR-008) avec erreur exacte « Pro-forma indisponible. Statut actuel: <status> » (FR-009) ; action `performCheckIn(bookingId)` (mutation, FR-010) avec messages métier exacts (dossier verrouillé, statut non autorisé, chambre non prête, chambre introuvable, service housekeeping indisponible — FR-011) ; après succès, charger folios A/B via `getFolio(folioId)` (queryKeys `['fo-folio', id]`, FR-012) et invalider `['fo-booking', bookingId]` ; zone rendue uniquement pour admin/manager/receptionist (FR-034, US7-1)
- [X] T014 [US2] Intégrer la zone check-in dans `app/front-office/check-in/page.tsx` via `<CheckInBooking/>` en remplaçant la recherche/les données codées en dur ; rendre la zone check-in (recherche, pro-forma, action check-in, folios) **uniquement** pour admin/manager/receptionist — jamais pour `housekeeping_supervisor` — ce rendu conditionnel doit être réappliqué/préservé lors du remplacement de l'ancienne zone codée en dur (FR-007..012, FR-034, US7-1 — dépend de T013)

**Checkpoint**: US1 et US2 fonctionnelles indépendamment (S1–S4).

---

## Phase 5: User Story 4 — Gérer les prestations d'un folio (Priority: P1)

**Goal**: Sur le folio affiché après check-in : distinction `allItems`/`printableItems`, ajout de prestation, masquage à l'impression (individuel/groupé), suppression (admin/manager uniquement), désactivation si folio `closed`.

**Independent Test**: Ouvrir un folio ouvert → liste des prestations avec indicateur de visibilité et total réel ; ajouter une prestation → total mis à jour ; masquer → `totalAmount` inchangé ; receptionist sans bouton « Supprimer » ; admin/manager avec bouton actif ; folio clôturé → ajout/suppression désactivés. (quickstart.md S5)

### Implementation for User Story 4

- [X] T015 [US4] Étendre la section prestations de `components/front-office/CheckInBooking.tsx` : affichage `allItems` vs `printableItems` et `totalAmount` (FR-015/016) ; formulaire d'ajout `addFolioItem(folioId, item)` avec champs requis `description`, `category`, `quantity` (défaut 1), `unitPrice`, `taxRate` (optionnel, défaut 0) (FR-017) ; masquage `setItemVisibility`/`setItemsVisibility` (FR-019) ; bouton « Supprimer » `deleteFolioItem` **rendu uniquement** pour admin/manager (FR-020/021) ; désactivation ajout/suppression si folio `closed` avec message explicite (FR-018/022) ; invalidation `['fo-folio', folioId]` après chaque mutation (US7-4/5, FR-034/035 — dépend de T013)

**Checkpoint**: US4 fonctionnelle (S5). Le cycle séjour peut être facturé.

---

## Phase 6: User Story 5 — Effectuer un check-out avec encaissement exact (Priority: P1)

**Goal**: Extrait de compte complet (folios A+B, paiements existants, totaux), calcul du solde dû, encaissement réparti sur plusieurs modes, validation du montant exact avant envoi, notification d'irréversibilité.

**Independent Test**: Saisir un bookingId `status_checked_in` → extrait complet depuis l'API ; `balanceDue = totalCharges − totalPaid` ; total ≠ balanceDue → blocage frontend sans envoi API ; total = balanceDue (± 1 centime) → check-out réussi + notification d'irréversibilité ; extrait re-consultable en lecture seule après check-out. (quickstart.md S6)

### Implementation for User Story 5

- [X] T016 [P] [US5] Créer `components/front-office/CheckOutPanel.tsx` : recherche bookingId → `getStatement(bookingId)` (queryKey `['fo-statement', bookingId]`, `enabled: !!bookingId`, FR-023) ; affichage folios A+B, items, paiements existants, `totalCharges`, `totalPaid` (FR-024) ; calcul client `balanceDue = totalCharges − totalPaid` (FR-026) ; saisie de montant par mode `cb | esp | chq | virement | debiteur` (FR-027) ; validation `Math.abs(Σ montants − balanceDue) < 0.01` sinon blocage sans envoi + « Le montant total des paiements doit correspondre au solde dû » (FR-028) ; `balanceDue = 0` → aucun paiement requis ; `performCheckOut(bookingId, payments)` (mutation, FR-025) avec erreurs exactes (statut, aucun mode, mode invalide, montant ≠ solde, folio introuvable, 502 → « Service temporairement indisponible ») ; après succès notification d'irréversibilité (dossier verrouillé, `status_checked_out`, folios clôturés — FR-029, SC-010) ; si statut déjà `status_checked_out` → lecture seule sans action (FR-036, US5-6) ; invalidation `['fo-statement', bookingId]`
- [X] T017 [US5] Intégrer `CheckOutPanel` dans `app/front-office/check-out/page.tsx` en remplaçant l'interface codée en dur (résumé de paiement déjà supprimé en T010) (FR-023..029 — dépend de T016)

**Checkpoint**: US5 fonctionnelle (S6). Cycle complet check-in → prestations → check-out opérationnel.

---

## Phase 7: User Story 3 — Annuler un check-in si aucune prestation n'a été enregistrée (Priority: P2)

**Goal**: Bouton « Annuler le check-in » sur une réservation `status_checked_in`, actif uniquement si les folios sont vides.

**Independent Test**: Check-in actif avec folio vide → annulation possible (statut repasse à `status_confirmed`) ; folio contenant des prestations → bouton désactivé avec message explicite. (spec US3, quickstart.md S5 étape 6)

### Implementation for User Story 3

- [X] T018 [US3] Ajouter l'annulation de check-in dans `components/front-office/CheckInBooking.tsx` : bouton « Annuler le check-in » → `cancelCheckIn(bookingId)` (mutation) ; désactivé si les folios chargés contiennent des items avec message « Impossible d'annuler : des prestations ont été enregistrées sur le folio. » (FR-014) ; après succès invalider `['fo-booking', bookingId]` et `['fo-folio', ...]` (FR-013 — dépend de T013)

**Checkpoint**: US3 fonctionnelle. Le cycle de vie complet est couvert.

---

## Phase 8: User Story 6 — Consulter les paiements, factures du jour et folios en lecture seule (Priority: P3)

**Goal**: Nouvelle route `/front-office/payments` : paiements du jour, factures du jour, et sous-section « Consultation de folio » en lecture seule (admin/manager/receptionist/comptable — moyen concret pour le comptable d'exercer son droit GET folios, FR-037).

**Independent Test**: Naviguer vers l'onglet « Paiements » → trois sous-sections ; liste paiements du jour (montant, mode, date) ; liste factures du jour (folio, total, prestations) ; recherche folioId/bookingId en lecture seule sans aucun bouton de modification ; date sans données → « Aucune donnée pour cette date ». (quickstart.md S7, S8)

### Implementation for User Story 6

- [X] T019 [P] [US6] Créer `app/front-office/payments/page.tsx` : sous-section « Paiements du jour » `getPayments(date)` (queryKey `['fo-payments', date]`, FR-030) et « Factures du jour » `getInvoices(date)` (queryKey `['fo-invoices', date]`, FR-031) ; sélecteur de date avec valeur par défaut `new Date().toISOString().slice(0,10)` ; état vide « Aucune donnée pour cette date » (FR-032) ; inclure `<FolioConsultation/>` rendu uniquement pour admin/manager/receptionist/comptable (FR-037, US6-1/7)
- [X] T020 [P] [US6] Créer `components/front-office/FolioConsultation.tsx` : recherche par folioId → `getFolio(folioId)` (queryKey `['fo-folio-consult', folioId]`) ou par bookingId → `getStatement(bookingId)` (queryKey `['fo-statement-consult', bookingId]`) ; affichage **lecture seule stricte** — `allItems` + `totalAmount` (folio) ou folios A+B + paiements + `totalCharges`/`totalPaid` (statement) ; **aucun** bouton d'ajout/masquage/suppression pour tous rôles (FR-037, US6-5/6) ; erreurs exactes du backend (« Folio introuvable », « Extrait disponible uniquement pour les séjours en cours ou terminés ») sans crash (US6-8) ; sous-section non rendue pour `housekeeping_supervisor` (US6-7, FR-037)

**Checkpoint**: US6 fonctionnelle (S7, S8). Le comptable peut consulter les folios en lecture seule via l'UI.

---

## Phase 9: Validation Finale & Transversal

**Purpose**: Vérifications transversales (FR-038, typecheck/lint) puis validation des scénarios S1–S12 de `quickstart.md`.

- [X] T021 Validation FR-038 — endpoint seed jamais exposé : exécuter `grep -rn "seed" app/ components/ --include="*.tsx" --include="*.ts"` (aucune référence de bouton/lien/formulaire vers `POST /api/front-office/seed` — seule occurrence attendue : commentaire/document) et `grep -n "seed" lib/api/frontOffice.ts` (aucune fonction seed) ; vérifier manuellement l'absence d'élément UI déclenchant un re-seed (FR-038, SC-011, research.md R9, contracts/api-contracts.md §6)
- [X] T022 [P] Valider `npx tsc --noEmit` (typecheck strict, zéro erreur) et `npm run lint` (zéro erreur) sur l'ensemble du module (constitution TS strict)
- [ ] T023 [P] Valider S1 — liste des chambres et filtre : connecter `receptionist` → `/front-office/check-in`, liste des chambres actives depuis l'API (aucune donnée codée en dur), filtre par statut, détail de chambre, aucun contrôle de modification pour receptionist (US1, FR-001/002/003/006, quickstart.md S1)
- [ ] T024 [P] Valider S2 — modification du statut housekeeping : connecter `housekeeping_supervisor`, changer en `bloquee` sans motif → champ exigé ; avec motif → PATCH réussi ; seule la zone chambres est visible pour ce rôle — validé sur la page intégrée finale (US1 ET US2, après T014/`CheckInBooking`) : aucun élément de la zone check-in (recherche, pro-forma, action check-in, folios) ne doit être rendu pour ce rôle, couvrant le risque de régression entre les phases 3 et 4 (FR-004/005, FR-034, US7-1, quickstart.md S2)
- [ ] T025 [P] Valider S3 — check-in complet avec pro-forma : bookingId valide → détails ; « Générer la pro-forma » → pro-forma ; « Check-in » → succès, folios A et B chargés depuis l'API, `FOLIO_A_LINES` disparu, `totalAmount` cohérent (US2, FR-007/008/010/012, quickstart.md S3)
- [ ] T026 [P] Valider S4 — erreurs métier exactes du check-in : statut non autorisé, chambre non prête, dossier verrouillé, service housekeeping indisponible → messages textuels exacts, jamais de message générique (US2, FR-009/011, SC-005, quickstart.md S4)
- [ ] T027 [P] Valider S5 — gestion des prestations du folio : allItems/printableItems, ajout, masquage sans impact sur `totalAmount`, bouton « Supprimer » absent pour receptionist / présent pour admin/manager, folio clôturé → désactivé, annulation désactivée si folio non vide (US4/US3, FR-015..022/013/014, SC-006/007/008, quickstart.md S5)
- [ ] T028 [P] Valider S6 — check-out avec encaissement exact : extrait complet depuis l'API (résumé codé en dur « 3 000 DH / 450 DH / 3 540 DH » disparu), `balanceDue`, blocage frontend si total ≠ balanceDue sans envoi API, succès à l'égalité ± 1 centime, notification d'irréversibilité, extrait en lecture seule après check-out (US5, FR-023..029/036, SC-009/010, quickstart.md S6)
- [ ] T029 [P] Valider S7 — paiements et factures du jour : connecter chaque rôle (y compris `comptable` et `housekeeping_supervisor`) → `/front-office/payments`, sous-sections paiements/factures avec date du jour par défaut, date sans données → « Aucune donnée pour cette date » (US6, FR-030/031/032, quickstart.md S7)
- [ ] T030 [P] Valider S8 — consultation de folio du comptable : connecter `comptable` → sidebar vers `/front-office/payments`, onglets filtrés, recherche folioId et bookingId en lecture seule sans bouton de modification, folio/booking inexistant → message exact sans crash, sous-section absente pour `housekeeping_supervisor`, `/front-office/check-out` bloqué pour le comptable (US6, FR-037/033, SC-003, quickstart.md S8)
- [ ] T031 [P] Valider S9 — contrôle d'accès middleware : matrice complète de la table S9 (quickstart.md) — route index `/front-office` → target par rôle, check-in/check-out/payments par rôle, matcher à frontière de chemin opérationnel (US7, FR-033, quickstart.md S9)
- [X] T032 [P] Valider S10 — aucun fallback mock : arrêter le backend front-office, recharger les trois pages → messages d'erreur (« Service temporairement indisponible » ou message exact 400/404/503), jamais de données mockées ni de tableau vide silencieux ; vérifier par grep l'absence de `USE_MOCKS`, `MOCK_CHECKINS`, `MOCK_CHECKOUTS`, `MOCK_FOLIO_A/B`, `FOLIO_A_LINES` et de données « 3 000 DH » dans `lib/api/frontOffice.ts` et les pages (SC-004/005, quickstart.md S10)
- [X] T033 [P] Valider S11 — seed jamais exposé : vérification grep (cf. T021) + revue manuelle d'absence d'élément UI déclenchant un re-seed des données (FR-038, SC-011, quickstart.md S11)
- [ ] T034 [P] Valider S12 — redirection de la route index `/front-office` par rôle : connecter `comptable`, saisir directement `/front-office` (URL tapée/favori/lien externe sans passer par la Sidebar) → atterrissage sur `/front-office/payments` en une seule redirection, sans boucle (`ERR_TOO_MANY_REDIRECTS` interdit) ; répéter pour admin/manager/receptionist/housekeeping_supervisor → `/front-office/check-in` ; cible lue depuis `useAuthStore` après hydratation ; session expirée → `/login` (FR-033/035, quickstart.md S12)

**Checkpoint**: Module validé de bout en bout — le quickstart S1–S12 passe intégralement.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Aucune dépendance — démarrage immédiat.
- **Foundational (Phase 2)**: Dépend du Setup — **bloque toutes les user stories** (T003 types → T004 housekeeping → T005 API ; T006–T010 indépendants).
- **User Stories (Phase 3+)**: Dépendent de la Foundational.
- **Validation (Phase 9)**: Dépend de toutes les user stories choisies.

### User Story Dependencies

- **US1 (P1)**: Après Foundational — aucune dépendance vers d'autres stories. 🎯 **MVP**.
- **US2 (P1)**: Après Foundational — indépendant de US1 au niveau fichier (check-in zone vs zone chambres du même `page.tsx` intégré séquentiellement : US1 d'abord).
- **US4 (P1)**: Dépend de US2 (modifie `components/front-office/CheckInBooking.tsx` créé en US2).
- **US5 (P1)**: Après Foundational — indépendant des autres stories (fichiers `CheckOutPanel.tsx` + `check-out/page.tsx`).
- **US3 (P2)**: Dépend de US2 (modifie `CheckInBooking.tsx`). Peut être exécuté après US4.
- **US6 (P3)**: Après Foundational — indépendant des autres stories (nouveaux fichiers `payments/page.tsx` + `FolioConsultation.tsx`).
- **US7 (transversal, P1)**: Défini en Foundational (middleware, page racine, Sidebar, onglets) + rendu conditionnel par rôle intégré dans chaque story (FR-034/035).

### Within Each User Story

- Composant de sous-section (`[P]`) → intégration dans la page (séquentiel) → validation du scénario quickstart correspondant.
- Aucun test unitaire (validation manuelle quickstart).
- Commit après chaque tâche ou groupe logique.

### Parallel Opportunities

- **Setup**: T001 et T002 en parallèle.
- **Foundational**: T006 (middleware), T007 (page racine), T008 (Sidebar), T009 (onglets), T010 (code mort) en parallèle — fichiers distincts. T003 → T004 → T005 séquentiels (dépendances de types).
- **Inter-stories**: après la Foundational, T011 (US1), T013 (US2), T016 (US5), T019 et T020 (US6) peuvent démarrer en parallèle — fichiers distincts, `lib/api/frontOffice.ts` et `types/index.ts` déjà fournis (T003/T005).
- **Au sein d'une story**: création du composant (T011/T013/T016) puis intégration page (T012/T014/T017) — séquentiel.
- **Validation**: T022–T034 en parallèle (scénarios manuels indépendants) ; T021 (grep FR-038) avant ou avec T033.

---

## Parallel Example: Lancement après Foundational

```bash
# Tous ces composants sont indépendants (fichiers distincts, API/types déjà fournis) :
Task: "T011 [P] [US1] Créer components/front-office/RoomList.tsx — liste, filtre, détail, maj statut (FR-001..006)"
Task: "T013 [P] [US2] Créer components/front-office/CheckInBooking.tsx — recherche, détail, pro-forma, check-in, folios (FR-007..012)"
Task: "T016 [P] [US5] Créer components/front-office/CheckOutPanel.tsx — extrait, encaissement exact (FR-023..029)"
Task: "T019 [P] [US6] Créer app/front-office/payments/page.tsx — paiements + factures du jour (FR-030/031/032)"
Task: "T020 [P] [US6] Créer components/front-office/FolioConsultation.tsx — consultation folio lecture seule (FR-037)"
```

⚠️ **Ne PAS lancer en parallèle** (même fichier, séquentiel) : T012/T014 (intégrations dans `app/front-office/check-in/page.tsx`), T015/T018 (modifications de `CheckInBooking.tsx` après T013), T017 (après T016). Aucune tâche `[P]` ne touche `lib/api/frontOffice.ts` ni `types/index.ts`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 : Setup (T001–T002)
2. Phase 2 : Foundational (T003–T010 — CRITICAL, bloque tout)
3. Phase 3 : US1 (T011–T012)
4. **STOP and VALIDATE** : S1, S2 indépendamment
5. Deploy/demo si prêt

### Incremental Delivery

1. Setup + Foundational → fondation prête (types, API sans mock, contrôle d'accès, anti-boucle, code mort supprimé)
2. US1 (chambres) → test indépendant → démo (MVP)
3. US2 (check-in + pro-forma) → test indépendant → démo
4. US4 (prestations folio) → test indépendant
5. US5 (check-out encaissement) → test indépendant → cycle séjour complet (démo)
6. US3 (annulation) → test indépendant
7. US6 (paiements/factures/consultation) → test indépendant
8. Phase 9 : Validation intégrale S1–S12

### Parallel Team Strategy

1. Équipe complète : Setup + Foundational ensemble
2. Après la Foundational :
   - Développeur A : US1 (T011–T012) → puis US5 (T016–T017)
   - Développeur B : US2 (T013–T014) → puis US3 (T018) et US4 (T015)
   - Développeur C : US6 (T019–T020)
3. Intégration dans `app/front-office/check-in/page.tsx` séquencée : US1 puis US2 (même fichier, jamais en parallèle)
4. Chaque story se valide par ses scénarios quickstart (S1/S2, S3/S4, S5, S6, S5-6, S7/S8)

---

## Notes

- [P] tasks = fichiers différents, aucune dépendance — vérifié sur les fichiers partagés (`lib/api/frontOffice.ts`, `types/index.ts`) : aucune tâche `[P]` ne les modifie.
- [Story] label mappe la tâche à la user story pour la traçabilité.
- Chaque user story est indépendamment complétable et testable via quickstart.
- Messages d'erreur backend affichés textuellement (jamais de message générique pour les cas métier — FR-009/011, SC-005) ; « Service temporairement indisponible » pour 502.
- Rôle toujours lu depuis `useAuthStore` (FR-035), jamais de décodage JWT brut côté client.
- Frontend validation check-out : `Math.abs(Σ montants − balanceDue) < 0.01` avant envoi API (FR-028).
- Commit après chaque tâche ou groupe logique ; s'arrêter à chaque checkpoint pour valider la story indépendamment.
