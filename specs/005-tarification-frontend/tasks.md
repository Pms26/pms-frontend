---

description: "Task list for Module Tarification frontend"
---

# Tasks: Module Tarification — Grille Tarifaire, Taxes, Partenaires, Extras, Remises et Packages

**Input**: Design documents from `/specs/005-tarification-frontend/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Aucune tâche de test automatisé — l'équipe utilise `npm run lint` + `npx tsc --noEmit` (typecheck strict, pas de script dédié dans package.json) + validation manuelle reproductible via [quickstart.md](./quickstart.md) (scénarios S0..S12). Les tâches de validation citent les scénarios quickstart correspondants.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US12)
- Include exact file paths in descriptions
- Rôles (RBAC gateway, api-gateway.md §3.6) : écritures → admin/manager ; `POST /api/tarification/discounts/apply` → tout rôle authentifié ; GET → tout JWT valide. Rôle UI lu via `useAuthStore` (FR-060), jamais de décodage JWT brut.

## Path Conventions

- **Web app**: `app/`, `components/`, `lib/`, `types/` à la racine du repo (Next.js App Router existant)
- `lib/api/tarification.ts` est le seul fichier API du module (FR-068, constitution §III)
- Montants backend en chaînes DECIMAL (`"900.00"`) → parse à l'affichage, nombres dans les payloads
- ENUM case-sensitive exacts (SC-008) : `basse|moyenne|haute|pics`, `standard|superieure|suite|suite_deluxe|lodge|villa`, `BB|DP|PC`, `1_etoile…maison_hotes`, `agence_voyage|tour_operateur|societe`, `restaurant|bar_boissons|spa|activites|transferts|services`, `pourcentage|valeur_fixe`, `hebergement|restaurant|spa|activites|autre`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Vérification de l'état de base du repo avant toute modification

- [X] T01 Vérifier l'état de base : `npm run lint` et `npx tsc --noEmit` passent sur la branche courante (`feat-Maroua`) avant toute modification
- [X] T02 [P] Lire l'état actuel du module : `app/tarification/page.tsx`, `lib/api/tarification.ts`, `types/index.ts` (section Tarification), `middleware.ts`, `components/layout/Sidebar.tsx`
- [X] T03 [P] Vérifier les primitives disponibles : `components/ui/*` (Badge, Button, Card, Modal, Table) et les classes `fo-tabs`/`fo-tab` pour la future mise en page à 7 onglets ; confirmer que `components/tarification/` n'existe pas encore

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types alignés sur le backend, réécriture complète de `lib/api/tarification.ts` (zéro mock), Gate CORS/PUT (Étape 0), migration du consommateur `EvolutionChart`.

**⚠️ CRITICAL**: Aucune user story ne peut commencer tant que cette phase n'est pas terminée (toutes les vues consomment la nouvelle couche API).

- [X] T04 Étape 0 — Gate CORS/PUT (Q3, research R3) : émettre les deux préflights OPTIONS vers le gateway `http://localhost:4000` (`PUT /api/tarification/seasons/basse` et `PUT /api/tarification/rateplans/category/standard`, headers `Origin: http://localhost:3000`, `Access-Control-Request-Method: PUT`, `Access-Control-Request-Headers: authorization,content-type`) ; consigner le résultat dans `specs/005-tarification-frontend/research.md` (R3) ; si PUT absent de `Access-Control-Allow-Methods` → enregistrer la dépendance externe B1 (ajout PUT aux méthodes CORS gateway) et préparer le repli `TARIFICATION_WRITE_VERB='PATCH'` (B2). **Bloque T008**
- [X] T05 [P] Ajouter les types alignés sur le contrat backend dans `types/index.ts` : `SeasonName`, `Season`, `RatePlan`, `Regime`, `RegimeSupplement`, `HotelCategory`, `LocalTax`, `PartnerType`, `Partner`, `PartnerRate`, `ExtraCategoryName`, `ExtraCategory`, `ExtraItem`, `DiscountType`, `Discount`, `DiscountApplyResult`, `BreakdownPoste`, `PackageOffer`, `PackageBreakdown` (montants DECIMAL en `string` : `prixTTC`, `supplementDH`, `montantTS`, `montantTPT`, `prixNetDH`, `prixDH`, `valeur`, `prixGlobalDH`, `montantDH` — cf. data-model.md)
- [X] T06 Aligner `RoomCategory` sur l'ENUM backend : remplacer `'superior'` par `'superieure'` dans `types/index.ts:39` et mettre à jour les maps d'affichage `app/housekeeping/page.tsx:36`, `components/front-office/RoomList.tsx:21`, `components/planning/PlanningGrid.tsx:16` et `lib/api/housekeeping.ts` (FR-015, SC-008)
- [X] T07 Réécrire le squelette de `lib/api/tarification.ts` : supprimer `MOCK_TARIFS`, `MOCK_EXTRAS`, `MOCK_FISCALITE`, `getTarifs`, `getExtras`, `getFiscalite`, `updateTarif` et toute logique `USE_MOCKS`/`mockDelay`/`return MOCK_TARIFS` (FR-064) ; ajouter les helpers privés `normalizeBackendMessage` (dérogation Q6, match tolérant `'atégorie introuvable'` → « Catégorie introuvable ») et `toApiError` (502 → « Service temporairement indisponible », sinon `message`/`error` exact du body, réseau → « Service temporairement indisponible ») ; ajouter la constante `TARIFICATION_WRITE_VERB` (défaut `'PUT'`, consommée par les fonctions d'écriture des stories 4/5) ; conserver `EXTRA_COLORS`/`EXTRA_ICONS` comme mapping de présentation uniquement
- [X] T08 Implémenter les fonctions saisons + rateplans dans `lib/api/tarification.ts` : `getSeasons`, `createSeason`, `updateSeasonDates` (verbe via `TARIFICATION_WRITE_VERB`), `getRatePlans`, `createRatePlan`, `updateRatePlan`, `updateCategoryRates` (verbe via `TARIFICATION_WRITE_VERB`) ; chacune via `apiClient` avec préfixe `/api/tarification/...` et wrapper `toApiError` (FR-012/019). **Commentaire de conception (vérification service-tarification.md §5.2/§7.5)** : `PUT /api/rateplans/category/:categorie` est un **upsert par saison** (création + mise à jour), donc `createRatePlan`/`updateRatePlan` sont conservées comme fonctions API de complétude du contrat backend mais **intentionnellement non consommées par l'UI** — l'upsert batch de US5 couvre tous les cas d'usage (FR-017/018 subsumés par FR-019) ; pas de nouvelle tâche UI nécessaire
- [X] T09 Implémenter les fonctions régimes + taxes dans `lib/api/tarification.ts` : `getRegimes`, `createRegime`, `updateRegime`, `getTaxes`, `createTax`, `updateTax`, `calculateTaxes` (query params `categorieHotel`, `pax`, `nights`)
- [X] T010 Implémenter les fonctions partenaires + extras dans `lib/api/tarification.ts` : `getPartners`, `createPartner`, `updatePartner`, `getPartnerRates`, `createPartnerRate`, `getExtraCategories`, `createExtraCategory`, `createExtraItem`, `updateExtraItem`
- [X] T011 Implémenter les fonctions remises + packages dans `lib/api/tarification.ts` : `getDiscounts`, `createDiscount`, `applyDiscount` (**sans garde de rôle** — zéro lecture `role`/`useAuthStore`, FR-049/063), `getPackages`, `createPackage`
- [X] T012 [P] Migrer `components/charts/EvolutionChart.tsx` : remplacer le fallback `getTarifs` (lignes 34-40) par un calcul basé sur `getRatePlans`/`getSeasons` (moyenne des prix basse saison) pour que le graphique du dashboard continue de fonctionner après la suppression de `getTarifs`
- [X] T013 Checkpoint fondation : `npx tsc --noEmit` + `npm run lint` passent ; greps — aucune occurrence `MOCK_TARIFS`/`MOCK_EXTRAS`/`MOCK_FISCALITE`/`USE_MOCKS`/`return MOCK_TARIFS` dans `lib/api/tarification.ts`, aucune occurrence `role|useAuthStore` (FR-063), aucune occurrence `rates/calculate` (FR-002)

**Checkpoint**: Fondation prête — l'implémentation des user stories peut commencer en parallèle.

---

## Phase 3: User Story 1 — Consulter la grille tarifaire (Priority: P1) 🎯 MVP

**Goal**: Consultation en lecture de la matrice catégorie × saison et de la matrice des régimes, à partir de l'API, sans aucune donnée hardcodée.

**Independent Test**: L'utilisateur ouvre `/tarification`, onglet « Grille tarifaire » : matrice catégorie × saison dont les colonnes proviennent de `GET /api/tarification/seasons` (nom exact + `dateDebut` → `dateFin`), prix en DH de `GET /api/tarification/rateplans` ; onglet « Régimes » : matrice BB/DP/PC × saison avec BB toujours à 0,00 DH non éditable.

### Implementation for User Story 1

- [X] T014 [P] [US1] Créer `components/tarification/TariffGrid.tsx` : matrice lecture seule, lignes = ENUM catégorie exact (`standard|superieure|suite|suite_deluxe|lodge|villa`), colonnes = `getSeasons` (queryKey `['tarification','seasons']`, libellé = `nom` + `dateDebut` → `dateFin`, jamais hardcodé — FR-009/010/065), prix = `getRatePlans` (queryKey `['tarification','rateplans']`, parse DECIMAL → DH) ; états inline `isLoading`/`isError`→`error.message`/liste vide explicite (component-contracts)
- [X] T015 [P] [US1] Créer `components/tarification/RegimeMatrix.tsx` : matrice régime `BB|DP|PC` × saison lecture seule depuis `getRegimes` (queryKey `['tarification','regimes']`) ; ligne BB toujours `0,00 DH` non éditable (FR-022) ; états inline
- [X] T016 [US1] Restructurer `app/tarification/page.tsx` : page unique à 7 onglets `fo-tabs`/`fo-tab` (Grille tarifaire, Régimes, Taxes locales, Partenaires, Extras & POS, Remises, Packages), libellés français ; rendre `TariffGrid` + `RegimeMatrix` ; états vides placeholders pour les 5 autres onglets ; supprimer les colonnes hardcodées « Basse Saison Oct–Mars » et le texte « Tarifs TTC… DP +220 DH / PC +420 DH par nuit » (FR-065/066) ; renommer l'onglet « Fiscalité » → « Taxes locales »
- [ ] T017 [US1] Valider US1 (quickstart S1) : colonnes issues de l'API saisons, aucun libellé hardcodé, prix en DH, service-tarification arrêté → « Service temporairement indisponible » ; `npx tsc --noEmit` passe

**Checkpoint**: US1 fonctionnelle et testable indépendamment (MVP livrable).

---

## Phase 4: User Story 12 — Contrôle d'accès par rôle et suppression complète des mocks (Priority: P1)

**Goal**: Middleware + Sidebar conformes à la décision Q2 (admin/manager/comptable), vérifications de non-régression (mocks absents, frontière `applyDiscount`). Les contrôles d'écriture par rôle de chaque vue sont implémentés dans la phase de leur story respective (US4..US11).

**Independent Test**: Un comptable consulte toutes les vues en lecture seule (aucun bouton d'écriture) ; un `receptionist`/`housekeeping_supervisor` est redirigé par le middleware et ne voit pas le lien Sidebar ; les greps de recherche de mocks (MOCK_TARIFS, MOCK_EXTRAS, « DP +220 DH », « Oct–Mars ») ne retournent rien.

### Implementation for User Story 12

- [X] T018 [P] [US12] Modifier `middleware.ts` : `ROLE_RESTRICTIONS['/tarification']` → `['admin', 'manager', 'comptable']` (retrait de `receptionist`, décision Q2 — FR-058) ; conserver `pathMatches` tel quel (aucune sous-route)
- [X] T019 [P] [US12] Modifier `components/layout/Sidebar.tsx` : masquer le lien « Tarifs & Extras » (`/tarification`) dans `filteredGestionItems` pour `receptionist` et `housekeeping_supervisor` (FR-062) ; le comptable conserve le lien
- [X] T020 [P] [US12] Vérifier la frontière API/UI (FR-063, R4 research) : `grep -n "role\|useAuthStore" lib/api/tarification.ts` → 0 occurrence (`applyDiscount` reste appelable par tout rôle, y compris `receptionist` depuis le module Réservations)
- [X] T021 [P] [US12] Vérifier la suppression des mocks (quickstart S11) : 0 occurrence `MOCK_TARIFS`/`MOCK_EXTRAS`/`MOCK_FISCALITE`/`return MOCK_TARIFS`/`USE_MOCKS` (lib/), 0 occurrence « Oct–Mars »/« DP +220 »/« PC +420 » (app/ components/), 0 occurrence `TarifCategory`/`FiscaliteItem` (app/ components/ types/ lib/)
- [ ] T022 [US12] Valider l'accès (quickstart S2) : `receptionist` et `housekeeping_supervisor` redirigés par le middleware sur `/tarification` (URL tapée directement, sans boucle) et lien Sidebar masqué ; `admin`/`manager` accès complet

**Checkpoint**: US12 (partie middleware/Sidebar/greps) validée ; le sweep final de lecture seule comptable sur les 7 onglets est exécuté en Phase finale (T059).

---

## Phase 5: User Story 4 — Gérer les saisons (Priority: P1)

**Goal**: Création et modification des dates de saison avec erreurs backend exactes (400/404/409), boutons réservés admin/manager.

**Independent Test**: L'admin crée la saison `basse` (2026-01-01 → 2026-03-31) → 201 et elle apparaît dans la liste ; modification des dates ; chevauchement → message 409 exact.

### Implementation for User Story 4

- [X] T023 [US4] Ajouter le formulaire de création de saison dans `components/tarification/TariffGrid.tsx` (rendu admin/manager uniquement via `useAuthStore`) : champs `nom` (ENUM `basse|moyenne|haute|pics`), `dateDebut`, `dateFin` ; validation client avant envoi : 3 champs requis + `dateDebut ≤ dateFin` (FR-011) ; `useMutation` → `createSeason` ; invalidation `['tarification','seasons']`
- [X] T024 [US4] Ajouter l'édition des dates de saison dans `components/tarification/TariffGrid.tsx` : `updateSeasonDates` (verbe via `TARIFICATION_WRITE_VERB`) avec validation client ≥ 1 champ fourni (FR-012) ; **aucune** validation client du chevauchement (FR-014, le 409 backend s'affiche verbatim FR-013) ; affichage verbatim de « Au moins dateDebut ou dateFin doit être fourni », « dateDebut doit être antérieure ou égale à dateFin », « Saison introuvable », « Les dates chevauchent la saison "..." (... - ...) »
- [ ] T025 [US4] Valider US4 (quickstart S3) : création 201 + apparition en liste ; blocage client si `dateDebut > dateFin` ou champ manquant ; édition date fin seule réussie ; chevauchement → message 409 exact ; `comptable` → aucune action de saison visible (US4 SC6)

**Checkpoint**: US4 fonctionnelle et testable indépendamment.

---

## Phase 6: User Story 5 — Éditer la grille tarifaire en matrice (Priority: P1)

**Goal**: Édition batch par catégorie (upsert `{nomSaison: prix}`) avec casse ENUM exacte et affichage de la réponse « Tarifs mis à jour ».

**Independent Test**: L'admin modifie les prix de la catégorie `standard` et enregistre : payload `{basse: 900, moyenne: 1100, haute: 1400, pics: 1800}`, réponse « Tarifs mis à jour » avec compteurs `updated`, grille rafraîchie.

### Implementation for User Story 5

- [X] T026 [US5] Rendre les cellules de la matrice éditables pour admin/manager dans `components/tarification/TariffGrid.tsx` (saisie numérique par cellule catégorie × saison) ; comptable → cellules non éditables, aucun bouton d'enregistrement (FR-061)
- [X] T027 [US5] Implémenter l'enregistrement par ligne (catégorie) dans `components/tarification/TariffGrid.tsx` : `updateCategoryRates` (verbe via `TARIFICATION_WRITE_VERB`) avec body `{nomSaison: prix}` — clés = noms de saisons exacts (FR-019, SC-008), seules les saisons existantes avec prix non-nul/non-vide envoyées (§7.5) ; afficher « Tarifs mis à jour » + `updated: [{season, affected}]` (FR-020) ; invalidation `['tarification','rateplans']` + refetch
- [ ] T028 [US5] Valider US5 (quickstart S4) : clés du payload en ENUM exact, mauvaise casse impossible via l'UI, comptable → cellule non éditable

**Checkpoint**: US5 fonctionnelle et testable indépendamment.

---

## Phase 7: User Story 2 — Aperçu de prix SANS effet de bord (Priority: P1)

**Goal**: Story frontière (Q7) — le module expose les fonctions de lecture/calcul sans effet de bord (`getRatePlans`, `getRegimes`, `applyDiscount`, `calculateTaxes`, `getExtraCategories`) et n'implémente **aucun** chemin d'aperçu ni appel à `GET /api/tarification/rates/calculate` (FR-002, écrit des FolioItems). L'assemblage de l'aperçu « Estimation » relève du module Réservations.

**Independent Test**: Plusieurs changements de sélection dans un écran d'aperçu ne déclenchent jamais `GET /api/tarification/rates/calculate` et n'écrivent aucun FolioItem — vérifié par grep (S12) et par l'absence de fonction de calcul final dans la couche API.

### Implementation for User Story 2

- [X] T029 [P] [US2] Vérifier que les 5 fonctions sans effet de bord sont exportées et appelables par tout rôle authentifié depuis `lib/api/tarification.ts` : `getRatePlans`, `getRegimes`, `applyDiscount`, `calculateTaxes`, `getExtraCategories` (FR-001/049/063)
- [X] T030 [US2] Ajouter des docblocks français dans `lib/api/tarification.ts` documentant le contrat sans effet de bord (FR-001/003/004) : sources autorisées, règle d'étiquetage « Estimation », et que l'assemblage de l'aperçu appartient au module Réservations (Q7) ; marquer `applyDiscount`/`calculateTaxes` comme « sans effet de bord »
- [X] T031 [US2] Valider quickstart S12 : `grep -rn "rates/calculate" app/tarification/ components/tarification/ lib/api/tarification.ts` → 0 occurrence (FR-002, SC-004)

**Checkpoint**: US2 (frontière) validée — le module est sûr pour tout aperçu consommateur.

---

## Phase 8: User Story 3 — Calcul final à la confirmation réelle d'un booking (Priority: P1)

**Goal**: Story frontière — le calcul final (`GET /api/tarification/rates/calculate`, qui écrit des FolioItems) n'est **jamais** implémenté ni appelé dans ce module ; le contrat (FR-005..008) est documenté pour le module Réservations (Q7).

**Independent Test**: Aucune fonction ni aucun appel `rates/calculate` n'existe dans `lib/api/tarification.ts` (grep) ; le docblock documente l'invocation unique par confirmation, le paramètre `extras` en JSON encodé et la sémantique `taxeMode`.

### Implementation for User Story 3

- [X] T032 [US3] Ajouter un docblock français dans `lib/api/tarification.ts` documentant la frontière du calcul final (FR-005..008) : invocation **exactement une fois** par confirmation de booking, `extras` en query string JSON encodé `JSON.stringify([{extraItemId, quantite}])` (FR-007), sémantique `taxeMode` (`sur_place` → taxes exclues du `totalGeneral` + note « Les taxes locales sont exclues de ce total et seront ajoutées aux extras au check-out », défaut `payable_a_la_reservation` → taxes incluses, FR-008) ; **aucune fonction implémentée** — l'invocation relève du module Réservations
- [X] T033 [US3] Valider : `grep -n "rates/calculate" lib/api/tarification.ts` → 0 occurrence (aucune fonction de calcul final dans le module) ; docblocks de T030/T032 présents (S12)

**Checkpoint**: US3 (frontière) validée.

---

## Phase 9: User Story 6 — Gérer les suppléments de régime par saison (Priority: P2)

**Goal**: Configuration des suppléments BB/DP/PC par saison ; règle métier BB = 0,00 DH non éditable (FR-022).

**Independent Test**: L'admin consulte la matrice régime × saison, voit BB figé à 0,00 DH, modifie le supplément DP d'une saison, le montant persiste après rechargement.

### Implementation for User Story 6

- [X] T034 [US6] Ajouter la création de supplément de régime dans `components/tarification/RegimeMatrix.tsx` (admin/manager uniquement) : `POST createRegime {regime, supplementDH, seasonId}` pour les combinaisons BB/DP/PC × saison manquantes ; 404 « Saison introuvable » verbatim ; invalidation `['tarification','regimes']`
- [X] T035 [US6] Ajouter la modification de supplément dans `components/tarification/RegimeMatrix.tsx` : `PATCH updateRegime {supplementDH}` ; ligne BB verrouillée à `0,00 DH` non éditable (FR-022) ; 404 « Supplément introuvable » verbatim
- [ ] T036 [US6] Valider US6 (quickstart S5) : BB figé, éditions DP/PC persistantes après rechargement, texte hardcodé « DP +220 DH / PC +420 DH par nuit » absent (FR-066)

**Checkpoint**: US6 fonctionnelle et testable indépendamment.

---

## Phase 10: User Story 7 — Configurer les taxes locales et utiliser le simulateur sans effet de bord (Priority: P2)

**Goal**: Configuration TS/TPT par catégorie d'hôtel + simulateur pur sans effet de bord (contrairement à `rates/calculate`).

**Independent Test**: L'admin configure TS/TPT pour une catégorie d'hôtel, puis utilise le simulateur (`categorieHotel`, `pax`, `nights`) et voit le détail et les totaux des taxes.

### Implementation for User Story 7

- [X] T037 [P] [US7] Créer `components/tarification/TaxConfig.tsx` : liste par catégorie d'hôtel (ENUM exact `1_etoile|2_etoiles|3_etoiles|4_etoiles|5_etoiles|riad|maison_hotes`) depuis `getTaxes` (queryKey `['tarification','taxes']`), TS/TPT en DH/pers/nuit (FR-026/027) ; états inline
- [X] T038 [US7] Ajouter la configuration/édition des taxes dans `TaxConfig.tsx` (admin/manager) : `POST createTax {categorieHotel, montantTS, montantTPT}` ; `PATCH updateTax {montantTS?, montantTPT?}` avec ≥ 1 champ ; 404 « Configuration introuvable » verbatim (FR-028)
- [X] T039 [US7] Ajouter le simulateur de taxes dans `TaxConfig.tsx` : champs `categorieHotel`/`pax`/`nights` requis (validation client FR-029) ; `calculateTaxes` ; affichage `detail` (montantTSParPaxParNuit, montantTPTParPaxParNuit), `totalTS`, `totalTPT`, `totalTaxes` ; 400/404 verbatim (FR-030) ; explication `taxeMode` (FR-031) ; étiquette « calcul sans effet de bord » (FR-032)
- [ ] T040 [US7] Valider US7 (quickstart S6) : simulateur 3_etoiles / 2 pax / 5 nuits → détail + totaux ; paramètre manquant → 400 exact ; catégorie non configurée → 404 exact

**Checkpoint**: US7 fonctionnelle et testable indépendamment.

---

## Phase 11: User Story 8 — Gérer les partenaires et leurs tarifs négociés (Priority: P2)

**Goal**: Partenaires (agence_voyage, tour_operateur, societe) + matrice des tarifs négociés par catégorie × saison (configuration uniquement — l'application au booking relève du Front Office).

**Independent Test**: L'admin crée un partenaire, ajoute ses tarifs négociés dans la matrice catégorie × saison, et les retrouve après rechargement.

### Implementation for User Story 8

- [X] T041 [P] [US8] Créer `components/tarification/PartnersTab.tsx` : liste depuis `getPartners` (queryKey `['tarification','partners']`), filtre par type + recherche par nom côté client (FR-034), badge `actif` (FR-033) ; états inline
- [X] T042 [US8] Ajouter la création/modification de partenaire dans `PartnersTab.tsx` (admin/manager) : `POST createPartner {nom, type, email?, telephone?}` (actif: true défaut) ; `PATCH updatePartner` (nom?, type?, email?, telephone?, actif?) incluant le toggle `actif` (FR-035/036) ; 404 « Partenaire introuvable » verbatim ; aucune action de suppression (Q5)
- [X] T043 [US8] Ajouter la matrice des tarifs négociés dans `PartnersTab.tsx` : à la sélection d'un partenaire, `getPartnerRates` (queryKey `['tarification','partners',partnerId,'rates']`) → matrice catégorie × saison avec `prixNetDH` (FR-037) ; création `POST createPartnerRate {categorie, prixNetDH, partnerId, seasonId}` ; 404 « Partenaire introuvable » / « Saison introuvable » verbatim (FR-038) ; mention UI : l'application des tarifs négociés au booking (billToPartnerId) relève du Front Office
- [ ] T044 [US8] Valider US8 (quickstart S7) : filtre + recherche, création (actif par défaut), bascule `actif`, matrice des tarifs négociés, erreurs 404 verbatim

**Checkpoint**: US8 fonctionnelle et testable indépendamment.

---

## Phase 12: User Story 9 — Gérer le catalogue d'extras et POS (Priority: P2)

**Goal**: Catégories + items avec TVA strictement « 10 »/« 20 », prix numérique validé côté client, badge actif/inactif.

**Independent Test**: L'admin crée une catégorie, ajoute un item (prix valide, TVA 10), modifie son prix et le désactive via le toggle — les données persistent après rechargement.

### Implementation for User Story 9

- [X] T045 [P] [US9] Créer `components/tarification/ExtrasTab.tsx` : catégories + items depuis `getExtraCategories` (queryKey `['tarification','extra-categories']`), prix en DH (parse DECIMAL), badge TVA « 10 »/« 20 », badge actif/inactif (FR-039/040) ; états inline
- [X] T046 [US9] Ajouter la création de catégorie et d'item dans `ExtrasTab.tsx` (admin/manager) : `POST createExtraCategory {nom}` ; `POST createExtraItem {nom, prixDH, categoryId, tauxTVA}` avec validation client **avant** soumission — `prixDH` nombre valide et `tauxTVA` strictement `'10'`/`'20'` (FR-042, SC-006)
- [X] T047 [US9] Ajouter la modification d'item dans `ExtrasTab.tsx` : `PATCH updateExtraItem {prixDH?, actif?, tauxTVA?}` avec les mêmes validations sur champs fournis (FR-043) ; toggle actif/inactif avec badge visuel (FR-045) ; erreurs verbatim incluant « Catégorie introuvable » normalisée (match tolérant Q6) — FR-044
- [ ] T048 [US9] Valider US9 (quickstart S8) : prix non-numérique ou TVA 15 → blocage client avant soumission ; bascule actif → badge + PATCH ; capture du message corrompu (Q6) sur `POST /api/tarification/extra-items` avec `categoryId: 999999` → affiché « Catégorie introuvable » propre

**Checkpoint**: US9 fonctionnelle et testable indépendamment.

---

## Phase 13: User Story 10 — Gérer les remises avec prévisualisation (Priority: P2)

**Goal**: Création de remises + prévisualisation via `applyDiscount`, distinction critique pourcentage (réduit) vs valeur_fixe (remplace).

**Independent Test**: L'admin crée une remise `valeur_fixe` de 800, la prévisualise sur un prix de 1100 et voit 800 (et non 300) ; `pourcentage` 15 sur 1100 → 935.

### Implementation for User Story 10

- [X] T049 [P] [US10] Créer `components/tarification/DiscountsTab.tsx` : liste depuis `getDiscounts` (queryKey `['tarification','discounts']`), badges pourcentage/valeur_fixe avec explications (FR-046/047 : « réduction de X % » / « remplace le prix », ex. 800 sur 1100 → 800) ; états inline
- [X] T050 [US10] Ajouter le formulaire de création de remise dans `DiscountsTab.tsx` (admin/manager uniquement) : `POST createDiscount {nom, type, valeur}` (actif: true défaut, FR-048) ; aucun bouton édition/suppression (FR-051)
- [X] T051 [US10] Ajouter la prévisualisation dans `DiscountsTab.tsx` : bouton rendu pour les rôles Q2 (`admin`/`manager`/`comptable`) via `useAuthStore` (FR-049/063) ; mutation `applyDiscount {discountId, prixInitial}` ; affichage `prixInitial`, `discount` (nom), `type`, `prixFinal` ; 404 « Remise introuvable » verbatim (FR-050)
- [ ] T052 [US10] Valider US10 (quickstart S9) : valeur_fixe 800 sur 1100 → 800 (pas 300) ; pourcentage 15 sur 1100 → 935 ; comptable peut prévisualiser mais pas créer ; `grep -n "role\|useAuthStore" lib/api/tarification.ts` → 0

**Checkpoint**: US10 fonctionnelle et testable indépendamment.

---

## Phase 14: User Story 11 — Gérer les packages avec ventilation validée (Priority: P3)

**Goal**: Création de packages avec validation client de la ventilation (Σ montantDH = prixGlobalDH) au format du message backend.

**Independent Test**: « Package Romance » 3600 DH ventilé 2000/600/400 (total 3000 ≠ 3600) → blocage client immédiat avec « La ventilation (X DH) ne correspond pas au prix global (Y DH) » ; après correction (total 3600) → création réussie.

### Implementation for User Story 11

- [X] T053 [P] [US11] Créer `components/tarification/PackagesTab.tsx` : liste depuis `getPackages` (queryKey `['tarification','packages']`), affichage `prixGlobalDH` + ventilation par poste (ENUM exact `hebergement|restaurant|spa|activites|autre`, FR-052) ; états inline
- [X] T054 [US11] Ajouter le formulaire de création de package dans `PackagesTab.tsx` (admin/manager) : `nom`, `prixGlobalDH`, lignes de ventilation limitées aux 5 postes documentés (FR-056) ; validation client avant soumission Σ `montantDH` === `prixGlobalDH` avec message « La ventilation (X DH) ne correspond pas au prix global (Y DH) » (FR-054, SC-006) ; `POST createPackage {nom, prixGlobalDH, breakdown: [{poste, montantDH}]}` transactionnel ; 400 backend échappé affiché verbatim (FR-055) ; aucun bouton édition/suppression (FR-057)
- [ ] T055 [US11] Valider US11 (quickstart S10) : total 3000 ≠ 3600 → blocage client ; total corrigé → création réussie ; seuls les 5 postes proposés

**Checkpoint**: US11 fonctionnelle et testable indépendamment.

---

## Phase 15: Polish & Cross-Cutting Concerns

**Purpose**: Validation globale, performance, conformité finale (sweeps de non-régression sur l'ensemble du module).

- [ ] T056 [P] Vérification globale du projet : `npx tsc --noEmit` et `npm run lint` passent avec zéro erreur
- [ ] T057 [P] Exécuter la validation complète quickstart S0..S12 et consigner les résultats (le résultat du Gate CORS/PUT S0 est déjà consigné dans `research.md` R3)
- [ ] T058 [P] Vérification performance (SC-010) : chaque onglet charge en < 3 s — query keys indépendantes par onglet conformément au component-contracts, aucune requête bloquante
- [ ] T059 [P] Sweep de conformité final : lecture seule comptable sur les 7 onglets (aucun bouton d'écriture, FR-059/061) ; greps — 0 occurrence mocks/hardcode (S11), 0 occurrence `rates/calculate` dans le module (S12), 0 occurrence `role|useAuthStore` dans `lib/api/tarification.ts` (FR-063), 0 libellé de saison/régime hardcodé (FR-065/066) ; tous les appels de `lib/api/tarification.ts` passent par `apiClient` avec préfixe `/api/tarification/...` (FR-068)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories** (types + couche API + Gate CORS/PUT)
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — No dependencies on other stories. **Blocks US4, US5, US6** (ils étendent les composants créés dans US1 : `TariffGrid.tsx`, `RegimeMatrix.tsx`, onglets de `app/tarification/page.tsx`)
- **US12 (P1)**: Can start after Foundational — middleware/Sidebar indépendants de US1
- **US4 (P1)**: Depends on US1 (étend `TariffGrid.tsx`) — indépendante de US5 (mais même fichier que US5 → séquentielles entre elles)
- **US5 (P1)**: Depends on US1 (étend `TariffGrid.tsx`) — indépendante de US4 (même fichier → séquentielles entre elles)
- **US2 (P1)**: Can start after Foundational (fonctions API exposées) — indépendante des autres stories
- **US3 (P1)**: Can start after Foundational — indépendante des autres stories
- **US6 (P2)**: Depends on US1 (étend `RegimeMatrix.tsx`)
- **US7 (P2)**: Can start after Foundational + US1 (onglets de la page) — indépendante des autres stories
- **US8 (P2)**: Can start after Foundational + US1 — indépendante des autres stories
- **US9 (P2)**: Can start after Foundational + US1 — indépendante des autres stories
- **US10 (P2)**: Can start after Foundational + US1 — indépendante des autres stories
- **US11 (P3)**: Can start after Foundational + US1 — indépendante des autres stories

### Within Each User Story

- Models/types before services (types = phase fondation)
- Services (lib/api) before endpoints (composants)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- Foundational [P]: T005 (types) et T012 (EvolutionChart) peuvent tourner en parallèle de T004/T007-T011
- Once Foundational completes, all user stories can start in parallel (if team capacity allows) — à l'exception de US4/US5 (même fichier `TariffGrid.tsx`) et des stories dépendant de US1
- US4 et US5 partagent `TariffGrid.tsx` → séquentielles entre elles mais parallèles aux autres stories
- US7..US11 créent chacune un composant distinct (`components/tarification/*.tsx`) → parallélisables entre elles
- All US12 verification greps (T020, T021) can run in parallel
- All Polish tasks (T056..T059) can run in parallel

---

## Parallel Example: User Story 1 (MVP)

```bash
# Launch both matrix components together (different files):
Task: "Créer components/tarification/TariffGrid.tsx (matrice lecture seule)"
Task: "Créer components/tarification/RegimeMatrix.tsx (matrice régimes lecture seule)"

# Puis, une fois les deux créés (séquentiel — importe les deux composants):
Task: "Restructurer app/tarification/page.tsx (7 onglets, suppression hardcode)"
```

## Parallel Example: User Story 12 (Accès + mocks)

```bash
# Launch together (different files / greps indépendants):
Task: "Modifier middleware.ts (ROLE_RESTRICTIONS /tarification)"
Task: "Modifier components/layout/Sidebar.tsx (masquer lien Tarifs & Extras)"
Task: "Grep non-régression FR-063 (role|useAuthStore dans lib/api/tarification.ts)"
Task: "Grep suppression mocks (quickstart S11)"
```

## Parallel Example: User Stories 7–11 (P2/P3, après fondation)

```bash
# Once Foundational + US1 are done, launch per-component stories together:
Task: "US7 — Créer components/tarification/TaxConfig.tsx"
Task: "US8 — Créer components/tarification/PartnersTab.tsx"
Task: "US9 — Créer components/tarification/ExtrasTab.tsx"
Task: "US10 — Créer components/tarification/DiscountsTab.tsx"
Task: "US11 — Créer components/tarification/PackagesTab.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — Gate CORS/PUT T004, types T005/T006, réécriture API T007-T011, migration EvolutionChart T012)
3. Complete Phase 3: User Story 1 (Grille + Régimes en lecture seule)
4. **STOP and VALIDATE**: Test US1 independently (quickstart S1 + tsc --noEmit)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (grille/régimes lecture) → Test independently → Demo (MVP!)
3. Add US12 (accès rôle + mocks) puis US4 (saisons) → Test → Demo
4. Add US5 (édition grille) → Test → Demo
5. Add US2/US3 (frontières aperçu/calcul final) → vérification par grep
6. Add US6..US10 (P2) → chacune testée indépendamment → Demo
7. Add US11 (P3, packages) → Test → Demo
8. Final: Polish & sweeps de conformité

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational + US1 are done:
   - Developer A: US4 → US5 (même fichier `TariffGrid.tsx`, séquentiel)
   - Developer B: US6 (Régimes)
   - Developer C: US7 (Taxes) puis US10 (Remises)
   - Developer D: US8 (Partenaires) puis US11 (Packages)
   - Developer E: US9 (Extras) + US12 (accès/greps)
3. Stories complete and integrate independently (chaque story est testable indépendamment via quickstart)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable (test indépendant dans chaque phase)
- Gate CORS/PUT (T004) doit précéder toute implémentation des stories 4/5 — le verbe d'écriture est centralisé dans `TARIFICATION_WRITE_VERB`, jamais encodé en dur dans `updateSeasonDates`/`updateCategoryRates`
- Le module ne lit jamais `USE_MOCKS` (FR-064) ; les erreurs backend sont affichées verbatim (dérogation unique Q6 pour « Catégorie introuvable »)
- **CRITICAL** : Écart à la constitution §III (absence totale de `USE_MOCKS` dans `lib/api/tarification.ts`) confirmé et assumé par l'utilisateur le 2026-07-31 — plan.md, Constitution Check ligne III : statut « ✅ PASS (écart assumé) », et Complexity Tracking (4e ligne). Le module suit délibérément le pattern no-mock déjà livré sur Analytics et Front Office ; ne pas réintroduire de fallback mock.
- `applyDiscount` reste sans rôle dans la couche API (FR-049/063) — seule l'UI de l'onglet Remises est restreinte aux rôles Q2
- Aucun appel à `GET /api/tarification/rates/calculate` dans ce module (FR-002) — frontière US2/US3
- Aucun bouton édition/suppression pour remises/packages (FR-051/057), aucune suppression de partenaire (Q5)
- Rôles lus via `useAuthStore` (FR-060) ; pas de `loading.tsx`/`error.tsx` (pattern react-query inline, constitution n°7)
- T006 touche des fichiers **hors du module Tarification** (`app/housekeeping/page.tsx`, `components/front-office/RoomList.tsx`, `components/planning/PlanningGrid.tsx`, `lib/api/housekeeping.ts`) — à confirmer/coordonner avant exécution si un autre développeur possède ces fichiers (renommage `RoomCategory` `'superior'` → `'superieure'`, FR-015/SC-008)
- FR-017/018 : `createRatePlan`/`updateRatePlan` conservées comme fonctions API de complétude, non consommées par l'UI — `PUT /api/rateplans/category/:categorie` est un upsert par saison (service-tarification.md §7.5) qui couvre création et modification (cf. commentaire T008)
- Commit after each task or logical group
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
