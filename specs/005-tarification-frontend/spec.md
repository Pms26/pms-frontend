# Feature Specification: Module Tarification — Grille Tarifaire, Taxes, Partenaires, Extras, Remises et Packages

**Feature Directory**: `specs/005-tarification-frontend`

**Created**: 2026-07-31

**Status**: Draft

**Input**: User description: "Module frontend Tarification du PMS OASIS — grille tarifaire (saisons + rateplans), suppléments de régime (BB/DP/PC), taxes locales (TS/TPT) avec simulateur, partenaires et tarifs négociés, catalogue d'extras/POS, remises (pourcentage vs valeur_fixe), packages avec ventilation ; connexion complète au backend service-tarification via api-gateway, suppression des mocks, contrôle d'accès par rôle ; distinction critique entre aperçu de prix SANS effet de bord et calcul final à la confirmation du booking (GET /api/rates/calculate écrit des FolioItems)."

## Clarifications

### Session 2026-07-31

- Q: Q1 — Comment assembler l'aperçu de prix sans effet de bord ? → A: **Option A — Estimation assemblée côté client**, construite exclusivement à partir des endpoints sans effet de bord documentés (`rateplans`, `regimes`, `discounts/apply`, `taxes/calculate`, `extra-categories`), étiquetée « Estimation ». `GET /api/rates/calculate` reste réservé à la confirmation du booking et n'est jamais appelé pour un simple affichage. L'aperçu peut ne pas correspondre au centime près à `rates/calculate` (aucun endpoint de calcul complet sans effet de bord n'existe dans la doc).
- Q: Q2 — Visibilité du module par rôle (aucune restriction de rôle côté backend sur les routes GET — décision produit, pas contrainte technique) ? → A: **Option A — admin/manager/comptable uniquement**. `receptionist` est retiré de `/tarification` dans `middleware.ts` ; le lien Sidebar « Tarifs & Extras » est masqué pour `receptionist` et `housekeeping_supervisor` (correction de l'incohérence actuelle où le lien est visible mais l'accès est bloqué) ; `comptable` conserve l'accès en lecture seule. Cohérent avec les modules Night Audit et Analytics.
- Q: Q3 — Conflit PUT / CORS au niveau du gateway (les 2 endpoints PUT documentés ne sont pas dans les méthodes CORS autorisées, api-gateway.md §7.5) ? → A: **Option A — Vérification au plan du module**. Un item de plan vérifie le comportement du préflight PUT pour `PUT /api/tarification/seasons/:category` et `PUT /api/tarification/rateplans/category/:categorie`. Si `PUT` est réellement bloqué, la correction (ajout de `PUT` aux méthodes CORS du gateway) est enregistrée comme dépendance externe hors module ; le code existant (`apiClient.put` dans `updateTarif`) suggère que PUT passe en pratique.
- Q: Q4 — Absence de PATCH/DELETE pour remises et packages ? → A: **Option A — Hors scope : consultation + création uniquement**. Aucun besoin d'édition/désactivation à inclure dans le module ; FR-051/FR-057 restent inchangées ; le point est clos.
- Q: Q5 — Absence de DELETE pour les partenaires ? → A: **Option A — Hors scope : création + modification uniquement**. Aucune suppression de partenaire dans le module (FR-035/036 inchangées) ; le point est clos.
- Q: Q6 — Message backend corrompu « Catégorie introuvable » (caractère cassé côté backend, §5.7) ? → A: **Option B — Normalisation frontend ciblée**. Le message corrompu est remplacé côté client par « Catégorie introuvable » propre, en dérogation ciblée au principe d'affichage verbatim pour ce seul message ; tous les autres messages backend restent affichés verbatim (FR-044).
- Q: Q7 — Coordination de l'aperçu de prix avec le module Réservations ? → A: **Option A — Hors scope : frontière documentée**. Le module Tarification documente les contraintes d'aperçu (FR-001 à FR-004) et expose les fonctions API de lecture ; l'assemblage de l'aperçu dans l'écran de réservation appartient au module Réservations ; la coordination inter-module est notée comme dépendance à confirmer au plan.

## User Scenarios & Testing

### User Story 1 — Consulter la grille tarifaire (saisons + matrice + régimes) (Priority: P1)

En tant que **utilisateur authentifié autorisé sur le module (admin, manager ou comptable — le réceptionniste est exclu, décision Q2)**, je veux consulter les saisons, la grille tarifaire par catégorie × saison et les suppléments de régime, afin de vérifier les tarifs appliqués sans avoir accès à leur modification.

**Why this priority**: La consultation de la grille est la base du module et le point d'entrée de toutes les autres fonctionnalités. C'est aussi le seul usage des routes GET pour les rôles en lecture seule.

**Independent Test**: L'utilisateur se rend sur `/tarification`, onglet « Grille tarifaire », et voit une matrice catégorie × saison dont les colonnes proviennent de l'API des saisons, avec les prix en DH et les suppléments de régime par saison.

**Acceptance Scenarios**:

1. **Given** l'utilisateur est authentifié avec un rôle autorisé, **When** il ouvre `/tarification`, **Then** la matrice tarifaire s'affiche avec une ligne par catégorie (standard, superieure, suite, suite_deluxe, lodge, villa) et une colonne par saison chargée depuis `GET /api/tarification/seasons` (nom exact : basse, moyenne, haute, pics), avec les prix chargés depuis `GET /api/tarification/rateplans`.
2. **Given** les colonnes de la grille, **When** elles sont affichées, **Then** le libellé de chaque colonne est le `nom` exact de la saison avec sa plage de dates `dateDebut` → `dateFin` provenant de l'API — jamais un libellé codé en dur (ex: « Basse Saison Oct–Mars »).
3. **Given** l'utilisateur consulte les suppléments de régime, **When** la vue « Régimes » est ouverte, **Then** la matrice régime (BB, DP, PC) × saison s'affiche avec les `supplementDH` chargés depuis `GET /api/tarification/regimes`, la ligne BB étant toujours affichée à 0,00 DH et non éditable.
4. **Given** le backend retourne une erreur 502 (service indisponible), **When** la grille ne peut pas être chargée, **Then** un message « Service temporairement indisponible » est affiché, pas une page vide ou un crash.
5. **Given** l'utilisateur est admin ou manager, **When** il consulte la grille, **Then** les boutons d'édition (création/modification) sont visibles ; s'il est comptable, ils sont masqués.

---

### User Story 2 — Aperçu de prix SANS effet de bord pendant la configuration d'une réservation (Priority: P1)

En tant que **réceptionniste ou utilisateur configurant une réservation**, je veux voir un aperçu du prix pendant que je choisis la catégorie, la saison, le régime, les extras et une remise, afin de renseigner le client, **sans que cet aperçu déclenche la moindre écriture en base**.

**Why this priority**: ⚠️ POINT CRITIQUE — `GET /api/tarification/rates/calculate` n'est **pas** un calcul pur malgré son verbe GET : il écrit des FolioItems (extras consommés, ventilation de package, taxes locales si `taxeMode=sur_place`) à chaque appel (service-tarification.md §5.10, §7.1). Un aperçu appelé à chaque changement de sélection créerait des FolioItems fantômes. Cette story est distincte de la story « calcul final » et interdit formellement l'usage de cet endpoint en aperçu.

**Independent Test**: L'utilisateur change plusieurs fois les sélections (catégorie, saison, régime, extras, remise) dans un écran d'aperçu ; chaque changement met à jour l'estimation sans qu'aucun appel `GET /api/tarification/rates/calculate` ne soit émis, et aucune donnée n'est écrite en base (aucun FolioItem créé).

**Acceptance Scenarios**:

1. **Given** l'utilisateur configure une réservation (catégorie, saison, régime, extras, remise), **When** il modifie une sélection quelconque, **Then** l'aperçu est recalculé à partir des seules sources sans effet de bord documentées : `GET /api/tarification/rateplans` (prix de base), `GET /api/tarification/regimes` (suppléments de régime), `POST /api/tarification/discounts/apply` (prévisualisation de remise), `GET /api/tarification/taxes/calculate` (taxes locales), `GET /api/tarification/extra-categories` (prix des extras).
2. **Given** l'utilisateur est dans l'écran d'aperçu, **When** il modifie la sélection, **Then** **jamais** un appel à `GET /api/tarification/rates/calculate` n'est émis — vérifié par inspection de code et par l'absence de FolioItems créés en base.
3. **Given** l'aperçu est assemblé côté client à partir des sources sans effet de bord, **When** il est affiché, **Then** il est explicitement étiqueté « Estimation » (aucun endpoint de calcul complet sans effet de bord n'existant dans la documentation — voir Questions Ouvertes).
4. **Given** l'utilisateur sélectionne une remise dans l'aperçu, **When** il souhaite voir son effet, **Then** la prévisualisation passe par `POST /api/tarification/discounts/apply` (accessible à tout rôle authentifié, sans effet de bord — §7.2) et affiche prixInitial, prixFinal et le type de remise.
5. **Given** les taxes locales sont activées dans l'aperçu, **When** la catégorie d'hôtel, le nombre de personnes et de nuits sont renseignés, **Then** le total des taxes est calculé par `GET /api/tarification/taxes/calculate` et l'impact du mode (`sur_place` vs `payable_a_la_reservation`) est expliqué à l'utilisateur (FR-031).

---

### User Story 3 — Calcul final à la confirmation réelle d'un booking (Priority: P1)

En tant que **système au moment de la confirmation d'une réservation**, je déclenche le calcul complet du tarif via `GET /api/tarification/rates/calculate`, une seule fois, au moment où l'écriture des FolioItems est le comportement voulu.

**Why this priority**: Le calcul final est le seul usage légitime de `GET /api/rates/calculate`. Cette story documente la frontière : l'écriture des FolioItems y est **désirée**, contrairement à la story 2. Séparer les deux usages en stories distinctes garantit qu'aucun flow d'aperçu ne puisse être confondu avec la confirmation.

**Independent Test**: La confirmation d'un booking déclenche exactement un appel à `GET /api/tarification/rates/calculate` avec tous les paramètres, et les FolioItems attendus (extras, ventilation de package, taxes si `sur_place`) sont créés en base.

**Acceptance Scenarios**:

1. **Given** une réservation est confirmée, **When** la confirmation est déclenchée, **Then** `GET /api/tarification/rates/calculate` est appelé **exactement une fois** avec les paramètres de la réservation (categorie ou packageId, seasonId, regime, nights, partnerId optionnel, discountId optionnel, categorieHotel/pax optionnels, taxeMode, extras).
2. **Given** la confirmation inclut des extras, **When** le calcul final est émis, **Then** le paramètre `extras` est passé en query string comme JSON encodé en URL (`JSON.stringify([{extraItemId, quantite}])`) conformément à §5.10 et §7.3.
3. **Given** `taxeMode=sur_place` est choisi, **When** le calcul final est émis, **Then** les taxes locales sont exclues du `totalGeneral` et la note « Les taxes locales sont exclues de ce total et seront ajoutées aux extras au check-out » est affichée (§5.10, §7.9) ; sinon (mode par défaut `payable_a_la_reservation`) les taxes sont incluses dans le `totalGeneral`.
4. **Given** le frontend a besoin du prix pour un simple affichage avant confirmation, **When** aucun booking n'est confirmé, **Then** aucun appel à `GET /api/tarification/rates/calculate` n'est émis (renvoi à la story 2).
5. **Given** le backend retourne une erreur métier du calcul final (400 paramètres, 404 tarif/package introuvable), **When** elle survient, **Then** le message exact du backend est affiché, et aucune écriture partielle n'est présentée comme réussie.

---

### User Story 4 — Gérer les saisons (création, modification des dates, erreurs 400/409) (Priority: P1)

En tant que **admin ou manager**, je veux créer des saisons et modifier leurs dates, afin de maintenir la grille tarifaire à jour, avec une gestion claire des chevauchements de dates.

**Why this priority**: Les saisons structurent toute la grille tarifaire. Sans leur gestion, la matrice n'a pas de colonnes exploitables.

**Independent Test**: L'admin crée une saison (ex: nom `basse`, dateDebut `2026-01-01`, dateFin `2026-03-31`), modifie ses dates, et reçoit les messages d'erreur exacts du backend en cas de chevauchement ou de champs invalides.

**Acceptance Scenarios**:

1. **Given** l'utilisateur est admin ou manager, **When** il crée une saison avec `nom` (ENUM exact : basse, moyenne, haute, pics), `dateDebut` et `dateFin` (YYYY-MM-DD), **Then** la saison est créée via `POST /api/tarification/seasons` et apparaît dans la liste (réponse 201).
2. **Given** l'utilisateur soumet une saison avec des champs manquants ou `dateDebut > dateFin`, **When** il valide, **Then** la validation client bloque l'envoi et affiche un message explicite avant tout aller-retour.
3. **Given** l'utilisateur modifie les dates d'une saison, **When** il valide, **Then** `PUT /api/tarification/seasons/:category` (ex: `/api/tarification/seasons/basse`) est appelé avec `dateDebut` et/ou `dateFin`, au moins un champ étant requis côté client.
4. **Given** les nouvelles dates chevauchent une autre saison existante, **When** l'utilisateur valide la modification, **Then** le message exact du backend est affiché : `Les dates chevauchent la saison "..." (... - ...)` (409) — la validation de chevauchement n'est pas dupliquée côté client (§7.6).
5. **Given** le backend retourne une erreur, **When** elle survient, **Then** le message exact est affiché : 400 « Au moins dateDebut ou dateFin doit être fourni », 400 « dateDebut doit être antérieure ou égale à dateFin », 404 « Saison introuvable », ou le message 400/409 renvoyé par le POST.
6. **Given** l'utilisateur est comptable, **When** il consulte les saisons, **Then** aucune action de création/modification n'est visible.

---

### User Story 5 — Éditer la grille tarifaire en matrice (upsert par catégorie) (Priority: P1)

En tant que **admin ou manager**, je veux éditer les prix dans la matrice catégorie × saison, afin de mettre à jour la grille tarifaire, avec une saisie cohérente avec le format upsert attendu par le backend.

**Why this priority**: La grille tarifaire est le cœur métier de la tarification. L'édition par ligne (catégorie) correspond au format batch upsert `PUT /api/rateplans/category/:categorie`.

**Independent Test**: L'admin modifie les prix d'une catégorie dans la grille et enregistre : le payload envoyé est `{nomSaison: prix}` pour la catégorie, la réponse « Tarifs mis à jour » avec les compteurs `updated` s'affiche, et la grille se rafraîchit avec les nouvelles valeurs.

**Acceptance Scenarios**:

1. **Given** la matrice catégorie × saison est affichée, **When** l'utilisateur est admin ou manager, **Then** chaque cellule de prix est éditable (saisie numérique) avec les valeurs chargées depuis l'API.
2. **Given** l'utilisateur modifie les prix d'une catégorie, **When** il clique sur « Enregistrer », **Then** `PUT /api/tarification/rateplans/category/:categorie` est appelé avec un body `{nomSaison: prix}` — les clés étant les noms exacts de saisons (basse, moyenne, haute, pics) et seules les saisons existantes avec prix non-nul/non-vide étant envoyées (§5.2, §7.5).
3. **Given** la mise à jour réussit, **When** la réponse 200 arrive, **Then** le message « Tarifs mis à jour » et le détail `updated: [{season, affected}]` sont affichés, et la matrice est rafraîchie depuis `GET /api/tarification/rateplans`.
4. **Given** la catégorie dans l'URL de la mise à jour batch, **When** elle est envoyée, **Then** elle respecte la casse exacte de l'ENUM (standard, superieure, suite, suite_deluxe, lodge, villa) — jamais « Standard » ou « Supérieure ».
5. **Given** l'utilisateur est comptable, **When** il consulte la grille, **Then** les cellules ne sont pas éditables et aucun bouton d'enregistrement n'est visible.

---

### User Story 6 — Gérer les suppléments de régime par saison (BB/DP/PC) (Priority: P2)

En tant que **admin ou manager**, je veux configurer les suppléments de régime par saison, afin que le calcul reflète la règle métier : **BB sans supplément** (prix de base), **DP/PC avec un montant par nuit**.

**Why this priority**: Les régimes impactent directement le prix final. La règle BB = prix de base est structurante et doit être explicitement respectée dans l'UI.

**Independent Test**: L'admin consulte la matrice régime × saison, voit BB figé à 0,00 DH, modifie le supplément DP d'une saison, et le nouveau montant est persistant après rechargement.

**Acceptance Scenarios**:

1. **Given** la matrice régime × saison est affichée, **When** elle est chargée depuis `GET /api/tarification/regimes`, **Then** chaque cellule montre `supplementDH` par nuit, avec le régime ENUM exact (BB, DP, PC).
2. **Given** la règle métier BB, **When** la matrice est affichée, **Then** la ligne BB est toujours 0,00 DH et n'est pas éditable (aucun champ de saisie).
3. **Given** une combinaison régime × saison n'existe pas encore, **When** l'utilisateur la saisit, **Then** elle est créée via `POST /api/tarification/regimes` avec `{regime, supplementDH, seasonId}`.
4. **Given** une combinaison existe, **When** l'utilisateur modifie son montant, **Then** `PATCH /api/tarification/regimes/:id` est appelé avec `{supplementDH}`.
5. **Given** le backend retourne une erreur, **When** elle survient, **Then** le message exact est affiché (404 « Saison introuvable » ou « Supplément introuvable »).

---

### User Story 7 — Configurer les taxes locales et utiliser le simulateur sans effet de bord (Priority: P2)

En tant que **admin ou manager**, je veux configurer la Taxe de Séjour (TS) et la Taxe de Promotion Touristique (TPT) par catégorie d'hôtel, et tester le calcul des taxes, afin de garantir la conformité fiscale.

**Why this priority**: Les taxes locales sont une obligation légale par catégorie d'hôtel. Le simulateur `GET /api/taxes/calculate` est un vrai calcul **sans effet de bord** (contrairement à rates/calculate) et peut être utilisé librement.

**Independent Test**: L'admin configure TS/TPT pour une catégorie d'hôtel, puis utilise le simulateur (catégorie, pax, nuits) et voit le détail et le total des taxes.

**Acceptance Scenarios**:

1. **Given** la vue Taxes locales, **When** elle est chargée depuis `GET /api/tarification/taxes`, **Then** une ligne par catégorie d'hôtel (ENUM exact : 1_etoile, 2_etoiles, 3_etoiles, 4_etoiles, 5_etoiles, riad, maison_hotes) affiche `montantTS` et `montantTPT` en DH/pers/nuit.
2. **Given** l'utilisateur est admin ou manager, **When** il configure une catégorie, **Then** `POST /api/tarification/taxes` `{categorieHotel, montantTS, montantTPT}` est appelé ; pour une modification, `PATCH /api/tarification/taxes/:id` `{montantTS?, montantTPT?}` avec au moins un champ.
3. **Given** l'utilisateur utilise le simulateur, **When** il renseigne `categorieHotel`, `pax` et `nights`, **Then** `GET /api/tarification/taxes/calculate` est appelé et affiche le détail (`montantTSParPaxParNuit`, `montantTPTParPaxParNuit`), `totalTS`, `totalTPT` et `totalTaxes`.
4. **Given** le simulateur est utilisé, **When** les paramètres sont manquants ou la catégorie n'est pas configurée, **Then** les messages exacts du backend sont affichés : 400 « Paramètres requis : categorieHotel, pax (nombre de personnes), nights (nombre de nuits) » ou 404 « Aucune taxe configurée pour cette catégorie d'hôtel ».
5. **Given** l'utilisateur consulte le simulateur, **When** il veut comprendre l'impact des taxes sur le total, **Then** la distinction `taxeMode` est expliquée : mode `payable_a_la_reservation` (défaut) → taxes incluses dans le total ; mode `sur_place` → taxes exclues du total et ajoutées aux extras au check-out (FR-031).

---

### User Story 8 — Gérer les partenaires et leurs tarifs négociés (Priority: P2)

En tant que **admin ou manager**, je veux gérer les partenaires (agences, tour-opérateurs, sociétés) et leurs tarifs négociés par catégorie × saison, afin de configurer les accords commerciaux.

**Why this priority**: Les tarifs négociés alimentent le calcul (partnerId → tarif négocié prioritaire, §5.10) et sont liés au pont `billToPartnerId` côté Front Office. Ce module gère la **configuration** des tarifs, pas leur application à une réservation.

**Independent Test**: L'admin crée un partenaire, ajoute ses tarifs négociés dans la matrice catégorie × saison, et les retrouve après rechargement.

**Acceptance Scenarios**:

1. **Given** la vue Partenaires, **When** elle est chargée depuis `GET /api/tarification/partners`, **Then** la liste affiche `nom`, `type` (ENUM exact : agence_voyage, tour_operateur, societe), email, téléphone et le statut `actif`, avec un filtre par type.
2. **Given** l'utilisateur est admin ou manager, **When** il crée un partenaire, **Then** `POST /api/tarification/partners` `{nom, type, email?, telephone?}` est appelé (`actif: true` par défaut) ; une modification passe par `PATCH /api/tarification/partners/:id`.
3. **Given** l'utilisateur est admin ou manager, **When** il bascule le statut `actif` d'un partenaire, **Then** `PATCH /api/tarification/partners/:id` `{actif}` est appelé.
4. **Given** un partenaire est sélectionné, **When** la vue « Tarifs négociés » est ouverte, **Then** `GET /api/tarification/partners/:partnerId/rates` affiche la matrice catégorie × saison avec `prixNetDH`.
5. **Given** l'utilisateur est admin ou manager, **When** il saisit un tarif négocié, **Then** `POST /api/tarification/partner-rates` `{categorie, prixNetDH, partnerId, seasonId}` est appelé ; les erreurs 404 « Partenaire introuvable » / « Saison introuvable » sont affichées verbatim.
6. **Given** le module Front Office utilise `billToPartnerId`, **When** un tarif négocié est configuré ici, **Then** l'UI précise que ce module configure les tarifs négociés — leur application à une réservation relève du Front Office.

---

### User Story 9 — Gérer le catalogue d'extras et POS (Priority: P2)

En tant que **admin ou manager**, je veux gérer les catégories d'extras et leurs items (prix, TVA, actif/inactif), afin de maintenir le catalogue POS utilisé par le Front Office et le calcul final.

**Why this priority**: Le catalogue d'extras est référencé par le calcul final (paramètre `extras` de rates/calculate) et par le Front Office. Ses contraintes de validation (prix numérique, TVA strictement 10 ou 20) doivent être respectées dès la saisie.

**Independent Test**: L'admin crée une catégorie, ajoute un item avec un prix valide et une TVA à 10, modifie son prix, et le désactive via le toggle — les données persistent après rechargement.

**Acceptance Scenarios**:

1. **Given** la vue Extras & POS, **When** elle est chargée depuis `GET /api/tarification/extra-categories`, **Then** les catégories (ENUM exact : restaurant, bar_boissons, spa, activites, transferts, services) et leurs items (`nom`, `prixDH`, `tauxTVA` "10" ou "20", `actif`) s'affichent avec les prix en DH issus de l'API.
2. **Given** l'utilisateur est admin ou manager, **When** il crée une catégorie, **Then** `POST /api/tarification/extra-categories` `{nom}` est appelé.
3. **Given** l'utilisateur crée un item, **When** il saisit nom, prix, catégorie et TVA, **Then** le formulaire valide côté client que `prixDH` est un nombre valide et `tauxTVA` est strictement 10 ou 20 **avant** soumission à `POST /api/tarification/extra-items` `{nom, prixDH, categoryId, tauxTVA}`.
4. **Given** l'utilisateur modifie un item, **When** il change le prix, la TVA ou le statut, **Then** `PATCH /api/tarification/extra-items/:id` `{prixDH?, actif?, tauxTVA?}` est appelé avec les mêmes validations sur les champs fournis.
5. **Given** un item, **When** l'utilisateur bascule actif/inactif, **Then** un badge visuel reflète le statut et `PATCH /api/tarification/extra-items/:id` `{actif}` est appelé.
6. **Given** le backend rejette une soumission, **When** l'erreur survient, **Then** le message exact est affiché (400 « prixDH requis et doit être un nombre valide », 400 « tauxTVA requis et doit être 10 ou 20 », 404 « Catégorie introuvable », 404 « Item introuvable »).

---

### User Story 10 — Gérer les remises avec prévisualisation (pourcentage vs valeur_fixe) (Priority: P2)

En tant que **admin ou manager**, je veux créer des remises et prévisualiser leur effet, en distinguant clairement les deux types, afin d'éviter les erreurs d'interprétation.

**Why this priority**: ⚠️ La distinction est critique : une remise `pourcentage` **réduit** le prix, une remise `valeur_fixe` **remplace** le prix (ce n'est pas une déduction — §5.8, §7.4). La prévisualisation passe par `POST /api/discounts/apply`, accessible à tout rôle authentifié et **sans effet de bord**.

**Independent Test**: L'admin crée une remise `valeur_fixe` de 800, la prévisualise sur un prix de 1100 et voit 800 (et non 300). L'UI explique le sens de chaque type.

**Acceptance Scenarios**:

1. **Given** la vue Remises, **When** elle est chargée depuis `GET /api/tarification/discounts`, **Then** chaque remise affiche `nom`, `type` (ENUM exact : pourcentage, valeur_fixe), `valeur` et `actif`, avec un badge visuel différenciant les deux types.
2. **Given** l'utilisateur est admin ou manager, **When** il crée une remise, **Then** `POST /api/tarification/discounts` `{nom, type, valeur}` est appelé (`actif: true` par défaut).
3. **Given** l'utilisateur prévisualise une remise, **When** il saisit un `prixInitial` et choisit une remise, **Then** `POST /api/tarification/discounts/apply` `{discountId, prixInitial}` est appelé (accessible à tout rôle authentifié) et affiche `prixInitial`, `discount` (nom), `type` et `prixFinal`.
4. **Given** la remise est de type `pourcentage`, **When** la prévisualisation est affichée, **Then** le prix final est calculé comme `prixInitial - (prixInitial * valeur / 100)` et l'UI indique « réduction de X % ».
5. **Given** la remise est de type `valeur_fixe`, **When** la prévisualisation est affichée, **Then** le prix final est la `valeur` elle-même (le prix est remplacé, pas déduit) et l'UI l'explique explicitement, ex: « remise valeur_fixe de 800 sur un prix de 1100 → prix final 800 (et non 300) ».
6. **Given** l'utilisateur n'est pas admin/manager, **When** il consulte la vue Remises, **Then** le bouton de création est masqué, mais la prévisualisation reste accessible (POST /discounts/apply est une route de calcul ouverte à tous).

---

### User Story 11 — Gérer les packages avec ventilation validée (Priority: P3)

En tant que **admin ou manager**, je veux créer des packages avec une ventilation par poste, afin de proposer des offres groupées, avec une validation immédiate de la cohérence des montants.

**Why this priority**: Les packages sont une offre commerciale complémentaire. La validation « somme de la ventilation = prix global » doit être immédiate côté client pour éviter un aller-retour (le backend valide aussi, §5.9).

**Independent Test**: L'admin crée un package « Package Romance » à 3600 DH ventilé (hebergement 2000, restaurant 600, spa 400 — total 3000 ≠ 3600) : l'UI bloque avec un message explicite ; après correction (total = 3600), la création passe.

**Acceptance Scenarios**:

1. **Given** la vue Packages, **When** elle est chargée depuis `GET /api/tarification/packages`, **Then** chaque package affiche `nom`, `prixGlobalDH`, `actif` et sa ventilation `PackageBreakdowns` (poste ENUM exact : hebergement, restaurant, spa, activites, autre).
2. **Given** l'utilisateur est admin ou manager, **When** il crée un package, **Then** le formulaire permet de saisir `nom`, `prixGlobalDH` et des lignes de ventilation (poste + `montantDH`).
3. **Given** la somme des montants de la ventilation ne correspond pas au prix global, **When** l'utilisateur tente de soumettre, **Then** l'UI bloque l'envoi et affiche immédiatement le message « La ventilation (X DH) ne correspond pas au prix global (Y DH) » (format identique au message backend 400, §5.9).
4. **Given** la ventilation est exacte, **When** l'utilisateur soumet, **Then** `POST /api/tarification/packages` `{nom, prixGlobalDH, breakdown: [{poste, montantDH}]}` est appelé et la création est transactionnelle (tout ou rien).
5. **Given** le backend retourne l'erreur 400, **When** elle survient malgré la validation client, **Then** le message exact est affiché.

---

### User Story 12 — Contrôle d'accès par rôle et suppression complète des mocks (Priority: P1)

En tant que **comptable**, je consulte toutes les configurations en lecture seule ; en tant que **housekeeping_supervisor** ou **receptionist**, je n'ai pas accès au module ; en tant que **admin/manager**, j'ai la gestion complète. Par ailleurs, aucune donnée codée en dur ne doit subsister dans le module.

**Why this priority**: La matrice des rôles est une exigence de sécurité (toutes les routes d'écriture sont admin/manager — §2, §4) et la suppression des mocks est l'objectif même de la connexion au backend.

**Independent Test**: Un comptable voit toutes les vues en lecture seule sans aucun bouton d'écriture. Un utilisateur non autorisé (housekeeping_supervisor, et réceptionniste selon Q2) est bloqué par le middleware et ne voit pas le lien Sidebar. Une recherche de mocks (MOCK_TARIFS, MOCK_EXTRAS, « DP +220 DH », « Oct–Mars », etc.) ne retourne rien.

**Acceptance Scenarios**:

1. **Given** l'utilisateur est admin ou manager, **When** il ouvre chaque vue, **Then** toutes les actions de création/modification sont visibles et fonctionnelles.
2. **Given** l'utilisateur est comptable, **When** il ouvre chaque vue, **Then** toutes les données s'affichent en lecture seule — aucun bouton de création/modification n'est rendu.
3. **Given** l'utilisateur est housekeeping_supervisor, **When** il navigue vers `/tarification`, **Then** le middleware le redirige (rôle exclu de `ROLE_RESTRICTIONS`) et le lien « Tarifs & Extras » de la Sidebar n'est pas affiché pour ce rôle (correction de l'incohérence actuelle où le lien est visible mais l'accès est bloqué).
4. **Given** l'utilisateur est réceptionniste, **When** il navigue vers `/tarification`, **Then** le middleware le redirige (rôle exclu de `ROLE_RESTRICTIONS` — décision Q2, option A) et le lien « Tarifs & Extras » de la Sidebar n'est pas affiché pour ce rôle.
5. **Given** le module connecté au backend, **When** le code est revu, **Then** aucune donnée métier codée en dur ne subsiste : les prix, libellés de saisons, suppléments de régime, taxes, items d'extras, remises et packages proviennent exclusivement des appels API (FR-064 à FR-068).

---

### Edge Cases

- **Service indisponible (502)** : Quand le gateway retourne 502 (service-tarification down), afficher « Service temporairement indisponible » — jamais de crash ni de page blanche (api-gateway.md §4.1, §7.6).
- **Session expirée pendant l'opération** : Si le token expire pendant une écriture, redirection vers /login via le gestionnaire 401/refresh existant, sans perte de données.
- **Chevauchement de dates de saison** : Le backend valide le chevauchement (409) — le client ne valide que la complétude et l'ordre des dates (§7.6). Le message 409 exact est affiché verbatim.
- **Saison inconnue dans la mise à jour batch** : Les clés de saison inconnues ou les valeurs `null` sont ignorées silencieusement par `PUT /api/rateplans/category/:categorie` (§7.5) — l'UI n'envoie que les saisons existantes avec prix non vides.
- **`prixTTC`/`montantDH` retournés en chaîne DECIMAL** : Les montants backend sont des chaînes (ex: `"900.00"`) — l'UI les parse pour l'affichage et la saisie, sans jamais afficher de valeur brute incohérente.
- **`tauxTVA` strictement 10 ou 20** : Le formulaire bloque toute autre valeur côté client avant soumission (les messages 400 du backend s'affichent néanmoins verbatim si un cas échappe à la validation).
- **Remise `valeur_fixe` mal interprétée comme déduction** : L'UI explique explicitement que la valeur remplace le prix (ex: 800 sur 1100 → 800, pas 300).
- **Ventilation de package non exacte** : L'UI bloque avant soumission avec le message formaté comme le 400 backend.
- **Message backend corrompu « Catégorie introuvable »** : Le backend contient un caractère corrompu dans ce message (§5.7). **Décision Q6 (option B)** : le frontend normalise ce seul message en « Catégorie introuvable » propre côté client ; tous les autres messages backend sont affichés verbatim.
- **Listes vides** : Aucune saison, aucun tarif, aucun partenaire, aucun item actif… → message d'état vide explicite, pas un tableau vide silencieux.
- **Aperçu de prix sans données** : Si la grille ou les régimes ne sont pas chargés, l'aperçu affiche « Estimation indisponible » plutôt qu'un prix faux.
- **`GET /api/rates/calculate` jamais appelé en aperçu** : Garanti par design (fonction absente de tous les chemins d'aperçu) et vérifié par revue de code (FR-002, SC-004).

## Requirements

### Functional Requirements

#### Section Aperçu de prix & calcul final (point critique)

- **FR-001**: System MUST provide a price preview during reservation configuration assembled EXCLUSIVELY from side-effect-free documented sources: `GET /api/tarification/rateplans` (prix de base par catégorie × saison), `GET /api/tarification/regimes` (suppléments de régime), `POST /api/tarification/discounts/apply` (prévisualisation de remise), `GET /api/tarification/taxes/calculate` (taxes locales), `GET /api/tarification/extra-categories` (prix des extras). **Décision Q1 (option A)** : l'aperçu est assemblé côté client à partir de ces sources et étiqueté « Estimation » ; il peut ne pas correspondre au centime près à `rates/calculate`.
- **FR-002**: System MUST NEVER call `GET /api/tarification/rates/calculate` for any price display or preview before a booking confirmation — this endpoint writes FolioItems on every call (extras consommés, ventilation de package, taxes locales si `taxeMode=sur_place`) per service-tarification.md §5.10 and §7.1. This is enforced by design: the function is absent from every preview path.
- **FR-003**: Changing any selection in the reservation configuration (categorie, saison, régime, extras, remise) MUST NOT trigger any API call that writes to the database.
- **FR-004**: System MUST label the client-assembled preview as « Estimation », since no documented side-effect-free full-calculation endpoint exists (see Open Questions).
- **FR-005**: System MUST invoke `GET /api/tarification/rates/calculate` ONLY at the moment of real booking confirmation, where the resulting FolioItem writes are the intended behavior — exactly once per confirmation (FR-006), never during data entry.
- **FR-006**: System MUST ensure exactly one invocation of `GET /api/tarification/rates/calculate` per booking confirmation — never in a loop and never on selection change.
- **FR-007**: For the final confirmation call only, System MUST pass the `extras` parameter as a URL-encoded JSON string (`JSON.stringify([{extraItemId, quantite}])`) per §5.10 and §7.3.
- **FR-008**: System MUST apply the documented `taxeMode` semantics (§5.10, §7.9) when presenting the final total: `sur_place` → taxes excluded from `totalGeneral` + note « Les taxes locales sont exclues de ce total et seront ajoutées aux extras au check-out »; any other value / absent → taxes included in `totalGeneral`.

#### Section Saisons

- **FR-009**: System MUST load the seasons list from `GET /api/tarification/seasons`, displaying for each season its `nom` (exact lowercase ENUM: `basse`, `moyenne`, `haute`, `pics`), `dateDebut` and `dateFin`.
- **FR-010**: System MUST NOT hardcode season names or date ranges in the grid UI — matrix columns and labels derive from the seasons API response.
- **FR-011**: System MUST allow admin/manager to create a season via `POST /api/tarification/seasons` with body `{nom, dateDebut, dateFin}`, enforcing client-side that all fields are present and `dateDebut ≤ dateFin` before submission.
- **FR-012**: System MUST allow admin/manager to modify a season's dates via `PUT /api/tarification/seasons/:category` (`:category` = exact `nom`, e.g. `basse`) with body `{dateDebut?, dateFin?}`, enforcing client-side that at least one field is provided before submission.
- **FR-013**: System MUST display verbatim the documented backend error messages for season writes: 400 « Au moins dateDebut ou dateFin doit être fourni », 400 « dateDebut doit être antérieure ou égale à dateFin », 404 « Saison introuvable », 409 « Les dates chevauchent la saison "..." (... - ...) ». Any 400/409 returned by `POST /api/seasons` (champs manquants, chevauchement) MUST also be displayed verbatim.
- **FR-014**: System MUST NOT duplicate the server-side overlap validation client-side (§7.6) — the client validates completeness and date ordering only; overlaps surface through the backend 409 message.

#### Section Grille tarifaire (RatePlans)

- **FR-015**: System MUST load the rate grid from `GET /api/tarification/rateplans` (entries: `id`, `categorie`, `prixTTC`, `seasonId`, nested `Season`). `categorie` uses the exact lowercase ENUM: `standard`, `superieure`, `suite`, `suite_deluxe`, `lodge`, `villa`.
- **FR-016**: System MUST display the grid as a matrix rows=categories × columns=seasons (columns dynamic from FR-009/FR-010), prices in DH.
- **FR-017**: System MUST allow admin/manager to create a single rate via `POST /api/tarification/rateplans` `{categorie, prixTTC, seasonId}`; display 404 « Saison introuvable » verbatim.
- **FR-018**: System MUST allow admin/manager to update a single rate via `PATCH /api/tarification/rateplans/:id` `{prixTTC}`; display 404 « Tarif introuvable » verbatim.
- **FR-019**: System MUST provide row-based batch editing per category submitting `PUT /api/tarification/rateplans/category/:categorie` with body `{nomSaison: prix}` (e.g. `{"basse": 900, "moyenne": 1100, "haute": 1400, "pics": 1800}`), the keys being exact season names and only existing seasons with non-null prices being sent (§5.2, §7.5 upsert).
- **FR-020**: System MUST display the batch update response: message « Tarifs mis à jour » and the per-season affected counts (`updated: [{season, affected}]`).

#### Section Régimes

- **FR-021**: System MUST load regime supplements from `GET /api/tarification/regimes` (`id`, `regime`, `supplementDH`, `seasonId`, nested `Season`). `regime` uses the exact uppercase ENUM: `BB`, `DP`, `PC`.
- **FR-022**: System MUST display regime supplements in a régime × saison matrix. The `BB` row MUST always show 0,00 DH and MUST NOT be editable (business rule: BB is included in the base price — §5.3, §5.10).
- **FR-023**: System MUST allow admin/manager to create a regime supplement via `POST /api/tarification/regimes` `{regime, supplementDH, seasonId}`; display 404 « Saison introuvable » verbatim.
- **FR-024**: System MUST allow admin/manager to modify a regime supplement via `PATCH /api/tarification/regimes/:id` `{supplementDH}`; display 404 « Supplément introuvable » verbatim.
- **FR-025**: System MUST display DP/PC supplements as per-night DH additions sourced from the API — never hardcoded (the current « DP +220 DH / PC +420 DH par nuit » text is mock data and MUST be removed).

#### Section Taxes locales

- **FR-026**: System MUST load local taxes from `GET /api/tarification/taxes` (`id`, `categorieHotel`, `montantTS`, `montantTPT`). `categorieHotel` uses the exact ENUM: `1_etoile`, `2_etoiles`, `3_etoiles`, `4_etoiles`, `5_etoiles`, `riad`, `maison_hotes`.
- **FR-027**: System MUST display `montantTS` (Taxe de Séjour) and `montantTPT` (Taxe de Promotion Touristique) as DH/pers/nuit per hotel category — sourced from the API, never hardcoded.
- **FR-028**: System MUST allow admin/manager to configure taxes via `POST /api/tarification/taxes` `{categorieHotel, montantTS, montantTPT}` and edit via `PATCH /api/tarification/taxes/:id` `{montantTS?, montantTPT?}` (at least one field); display 404 « Configuration introuvable » verbatim.
- **FR-029**: System MUST provide a side-effect-free tax simulator calling `GET /api/tarification/taxes/calculate?categorieHotel&pax&nights`, displaying `detail` (montantTSParPaxParNuit, montantTPTParPaxParNuit), `totalTS`, `totalTPT` and `totalTaxes`. All three inputs are required (client-side validation).
- **FR-030**: System MUST display verbatim the simulator's documented errors: 400 « Paramètres requis : categorieHotel, pax (nombre de personnes), nights (nombre de nuits) », 404 « Aucune taxe configurée pour cette catégorie d'hôtel ».
- **FR-031**: System MUST display the `taxeMode` distinction (§7.9): `payable_a_la_reservation` (default) → taxes included in the total; `sur_place` → taxes excluded from the total and added to extras at check-out, with the documented note « Les taxes locales sont exclues de ce total et seront ajoutées aux extras au check-out ».
- **FR-032**: System MUST clearly label the tax simulator as a pure calculation WITHOUT side effects (unlike `rates/calculate`).

#### Section Partenaires et tarifs négociés

- **FR-033**: System MUST load partners from `GET /api/tarification/partners` (`id`, `nom`, `type`, `email`, `telephone`, `actif`). `type` uses the exact ENUM: `agence_voyage`, `tour_operateur`, `societe`.
- **FR-034**: System MUST allow filtering partners by type and/or searching by name.
- **FR-035**: System MUST allow admin/manager to create a partner via `POST /api/tarification/partners` `{nom, type, email?, telephone?}` (`actif: true` default) and edit via `PATCH /api/tarification/partners/:id` (optional `nom`, `type`, `email`, `telephone`, `actif`); display 404 « Partenaire introuvable » verbatim.
- **FR-036**: System MUST allow toggling a partner's `actif` status via `PATCH /api/tarification/partners/:id` `{actif}`.
- **FR-037**: System MUST load a partner's negotiated rates from `GET /api/tarification/partners/:partnerId/rates` (`id`, `categorie`, `prixNetDH`, `partnerId`, `seasonId`, nested `Partner` + `Season`) and display them in a categorie × saison matrix.
- **FR-038**: System MUST allow admin/manager to create a negotiated rate via `POST /api/tarification/partner-rates` `{categorie, prixNetDH, partnerId, seasonId}`; display 404 « Partenaire introuvable » / « Saison introuvable » verbatim. This module configures negotiated rates only — their application to a reservation (via the `billToPartnerId` bridge in the Front Office module) is out of scope here.

#### Section Extras & POS

- **FR-039**: System MUST load extra categories with items from `GET /api/tarification/extra-categories` (category: `id`, `nom`; item: `id`, `nom`, `prixDH`, `tauxTVA`, `actif`, `categoryId`). Category `nom` uses the exact ENUM: `restaurant`, `bar_boissons`, `spa`, `activites`, `transferts`, `services`. `tauxTVA` is the string `"10"` or `"20"`.
- **FR-040**: System MUST display item prices in DH from the numeric `prixDH` — never a hardcoded price string.
- **FR-041**: System MUST allow admin/manager to create a category via `POST /api/tarification/extra-categories` `{nom}`.
- **FR-042**: System MUST allow admin/manager to create an item via `POST /api/tarification/extra-items` `{nom, prixDH, categoryId, tauxTVA}`, with client-side validation BEFORE submission that `prixDH` is a valid number and `tauxTVA` is strictly `10` or `20` (§5.7), avoiding round-trips for the documented 400 errors.
- **FR-043**: System MUST allow admin/manager to edit an item via `PATCH /api/tarification/extra-items/:id` `{prixDH?, actif?, tauxTVA?}`, applying the same validations to provided fields.
- **FR-044**: System MUST display the documented 400/404 messages verbatim: « prixDH requis et doit être un nombre valide », « tauxTVA requis et doit être 10 ou 20 », « Catégorie introuvable », « prixDH doit être un nombre valide », « tauxTVA doit être 10 ou 20 », « Item introuvable ». **Décision Q6 (option B)** : le message « Catégorie introuvable » reçu du backend contient un caractère corrompu (§5.7) — le frontend le normalise en une chaîne propre « Catégorie introuvable » (dérogation ciblée au principe verbatim) ; tous les autres messages sont affichés tels que reçus.
- **FR-045**: System MUST provide an actif/inactif toggle per item (`PATCH /api/tarification/extra-items/:id` `{actif}`) with a visual status badge, rendered only for admin/manager.

#### Section Remises

- **FR-046**: System MUST load discounts from `GET /api/tarification/discounts` (`id`, `nom`, `type`, `valeur`, `actif`). `type` uses the exact ENUM: `pourcentage`, `valeur_fixe`.
- **FR-047**: System MUST clearly distinguish the two discount types in the UI: `pourcentage` (e.g. 15 = 15% reduction) vs `valeur_fixe` (the `valeur` IS the new price, replacing the initial price — NOT a deduction) (§5.8, §7.4). Example displayed: a `valeur_fixe` of 800 on 1100 → 800, not 300.
- **FR-048**: System MUST allow admin/manager to create a discount via `POST /api/tarification/discounts` `{nom, type, valeur}` (`actif: true` default).
- **FR-049**: System MUST provide a side-effect-free preview via `POST /api/tarification/discounts/apply` `{discountId, prixInitial}`, accessible to ALL authenticated roles (calculation route without `checkRole` — §2, §4, §7.2). Display `prixInitial`, `discount` (nom), `type`, `prixFinal`.
- **FR-050**: System MUST display 404 « Remise introuvable » verbatim from the apply preview.
- **FR-051**: No discount modification or deletion endpoint is documented in service-tarification.md — the UI MUST NOT offer edit/delete actions for discounts (see Open Questions).

#### Section Packages

- **FR-052**: System MUST load packages from `GET /api/tarification/packages` (`id`, `nom`, `prixGlobalDH`, `actif`, `PackageBreakdowns`: `id`, `poste`, `montantDH`, `packageId`). `poste` uses the exact ENUM: `hebergement`, `restaurant`, `spa`, `activites`, `autre`.
- **FR-053**: System MUST allow admin/manager to create a package via `POST /api/tarification/packages` `{nom, prixGlobalDH, breakdown: [{poste, montantDH}]}`.
- **FR-054**: System MUST validate client-side BEFORE submission that the sum of `breakdown.montantDH` exactly equals `prixGlobalDH`, showing an immediate error in the backend's message format « La ventilation (X DH) ne correspond pas au prix global (Y DH) » (§5.9), preventing a round-trip.
- **FR-055**: System MUST display the backend 400 message verbatim if it still occurs.
- **FR-056**: The breakdown form MUST offer only the documented `poste` values: `hebergement`, `restaurant`, `spa`, `activites`, `autre`.
- **FR-057**: No package modification or deletion endpoint is documented — the UI MUST NOT offer edit/delete for packages (see Open Questions).

#### Section Rôles et contrôle d'accès

- **FR-058**: The middleware (`middleware.ts`) MUST restrict `/tarification` to `['admin', 'manager', 'comptable']` (**décision Q2 — option A**) — `receptionist` est retiré de la liste actuelle, `housekeeping_supervisor` reste exclu, `comptable` conserve l'accès en lecture seule. Décision produit, indépendante du fait que le backend n'impose aucune restriction de rôle sur les routes GET.
- **FR-059**: System MUST hide every create/edit/modify UI action (buttons, forms, toggles) for roles other than admin/manager — all write routes are admin/manager-only (§2, §4).
- **FR-060**: System MUST read the user's role from the Zustand auth store (`useAuthStore`) for client-side role checks — never from raw JWT decoding (constitution §II).
- **FR-061**: comptable MUST be read-only: all data displays fully, all write controls hidden (consistent with night-audit and analytics modules).
- **FR-062**: System MUST fix the sidebar inconsistency: the « Tarifs & Extras » link is currently visible for `housekeeping_supervisor` (and for `receptionist` until the Q2 change) while the middleware redirects — the link MUST be hidden for `housekeeping_supervisor` and `receptionist`.
- **FR-063**: The `applyDiscount` API function (`POST /api/tarification/discounts/apply`) MUST be callable for ALL authenticated roles and used by the remise preview (FR-049), while all other write API functions are only reachable from admin/manager UI.

#### Section Suppression des mocks et données hardcodées

- **FR-064**: System MUST remove `MOCK_TARIFS`, `MOCK_EXTRAS`, `MOCK_FISCALITE` and the mock fallback in `getTarifs` (the `return MOCK_TARIFS` when the grid is empty) from `lib/api/tarification.ts`.
- **FR-065**: System MUST remove the hardcoded season column labels and date ranges (« Basse Saison Oct–Mars », etc.) from `app/tarification/page.tsx` — derived from `GET /api/tarification/seasons` (FR-010).
- **FR-066**: System MUST remove the hardcoded « Tarifs TTC… DP +220 DH / PC +420 DH par nuit » informational text — derived from `GET /api/tarification/regimes` (FR-025).
- **FR-067**: System MUST replace the mock-shaped types (`TarifCategory`, `ExtraItem`, `ExtraCategory`, `FiscaliteItem` in `types/index.ts`) with backend-shaped types (Season, RatePlan, RegimeSupplement, LocalTax, Partner, PartnerRate, ExtraCategory, ExtraItem, Discount, PackageOffer, PackageBreakdown, etc.).
- **FR-068**: All API functions MUST live in `lib/api/tarification.ts`, use the shared `apiClient` from `lib/api/client.ts` with the gateway prefix `/api/tarification/...` (never direct calls to service-tarification port 4004), and perform backend-to-frontend mapping (field names, enums) inside the API file — not in components (constitution §I, §III).

### Key Entities

- **Saison (Season)** — Période tarifaire avec `nom` (ENUM basse, moyenne, haute, pics), `dateDebut`, `dateFin`. Structure les colonnes de la grille tarifaire.
- **Tarif (RatePlan)** — Prix TTC d'une catégorie × saison (`categorie`, `prixTTC`, `seasonId`). Les 6 catégories : standard, superieure, suite, suite_deluxe, lodge, villa.
- **Supplément de régime (RegimeSupplement)** — Montant par nuit ajouté au prix de base selon le régime (BB, DP, PC) × saison. BB = 0 (prix de base).
- **Taxe locale (LocalTax)** — TS (Taxe de Séjour) et TPT (Taxe Promotion Touristique), en DH/pers/nuit, par catégorie d'hôtel (1_etoile…5_etoiles, riad, maison_hotes).
- **Partenaire (Partner)** — Entité commerciale (agence_voyage, tour_operateur, societe) avec email, téléphone, actif.
- **Tarif négocié (PartnerRate)** — Prix net d'un partenaire × catégorie × saison (`prixNetDH`). Prioritaire sur le tarif public dans le calcul final si `partnerId` fourni.
- **Catégorie d'extra (ExtraCategory)** — Regroupement d'items (restaurant, bar_boissons, spa, activites, transferts, services).
- **Item d'extra (ExtraItem)** — Prestation du catalogue POS avec `prixDH`, `tauxTVA` ("10" ou "20"), `actif`.
- **Remise (Discount)** — Réduction tarifaire de type `pourcentage` (réduit le prix) ou `valeur_fixe` (remplace le prix).
- **Package (PackageOffer)** — Offre groupée avec prix global (`prixGlobalDH`), ventilation (`PackageBreakdowns`) par poste (hebergement, restaurant, spa, activites, autre). Somme de la ventilation = prix global.
- **Aperçu / Simulation (Price Preview)** — Estimation affichée pendant la configuration d'une réservation, assemblée exclusivement à partir de sources sans effet de bord ; jamais issue de `GET /api/rates/calculate`.
- **Calcul final** — Invocation unique de `GET /api/rates/calculate` au moment de la confirmation réelle d'un booking, avec écriture voulue des FolioItems.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un admin/manager peut configurer l'intégralité du module (saisons, grille tarifaire, régimes, taxes, partenaires, extras, remises, packages) uniquement via l'UI, et les données persistent après rechargement de la page.
- **SC-002**: Un comptable consulte toutes les vues en lecture seule — aucun bouton de création/modification n'est visible dans le module, vérifié sur chaque vue.
- **SC-003**: Aucune donnée codée en dur ne subsiste dans le module (MOCK_TARIFS, MOCK_EXTRAS, « DP +220 DH », « Oct–Mars », etc.) — toutes les valeurs affichées proviennent des appels API, vérifié par revue de code.
- **SC-004**: L'aperçu de prix ne déclenche jamais d'écriture en base : aucun FolioItem n'est créé lors de la configuration d'une réservation, vérifié par l'absence de `GET /api/rates/calculate` dans tous les chemins d'aperçu et par test de bout en bout (0 FolioItem après multiples changements de sélection).
- **SC-005**: Le calcul final (`GET /api/rates/calculate`) est invoqué exactement une fois par confirmation de booking — jamais pendant la saisie.
- **SC-006**: Les validations client évitent les aller-retours documentés : tauxTVA strictement 10 ou 20, prixDH numérique, somme de la ventilation de package = prix global, dateDebut ≤ dateFin — 100 % des soumissions erronées de ces cas sont bloquées côté client.
- **SC-007**: Tous les messages d'erreur métier documentés du backend (409 chevauchement, 400 champs, 404 introuvable) sont affichés textuellement à l'utilisateur — aucun message générique « Erreur » pour ces cas.
- **SC-008**: Les valeurs ENUM envoyées respectent exactement la casse documentée (basse, moyenne, haute, pics ; BB, DP, PC ; standard, superieure, suite, suite_deluxe, lodge, villa ; agence_voyage, tour_operateur, societe ; restaurant, bar_boissons, spa, activites, transferts, services ; pourcentage, valeur_fixe ; hebergement, restaurant, spa, activites, autre ; 1_etoile…maison_hotes).
- **SC-009**: En cas de 502 (service-tarification down), un message « Service temporairement indisponible » est affiché — aucun crash, aucune page blanche.
- **SC-010**: La grille tarifaire se charge et s'affiche en moins de 3 secondes dans des conditions réseau normales.

## Assumptions

- **Source de vérité backend**: Seuls les endpoints, rôles, formats et comportements documentés dans `docs/service-tarification.md` sont décrits. Le frontend passe exclusivement par le gateway avec le préfixe `/api/tarification/...` (qui est réécrit en `/api/...` par le gateway — api-gateway.md §2.2) via le `apiClient` partagé.
- **Structure de page**: Le module reste une page unique `/tarification` organisée en onglets (Grille tarifaire, Taxes locales, Partenaires, Extras & POS, Remises, Packages), étendant l'onglet structuré existant (`fo-tabs`/`fo-tab`), conformément aux modules single-page existants (dashboard, analytics, night-audit). L'onglet « Fiscalité » actuel est renommé « Taxes locales ».
- **Rôle backend**: Les rôles sont des chaînes exactes sensibles à la casse : `admin`, `manager`, `receptionist`, `housekeeping_supervisor`, `comptable`. La vérification UI lit `useAuthStore`.
- **Absence de fallback mock**: Conformément au pattern validé pour les modules Analytics et Front Office, aucune fonction API de `lib/api/tarification.ts` ne vérifie `USE_MOCKS` ni ne retourne de données mockées en cas d'échec — un message utilisateur clair est affiché (« Service temporairement indisponible » pour 502/infrastructure, message métier exact du backend sinon). Les mocks actuels sont supprimés (FR-064).
- **Montants DECIMAL en chaînes**: `prixTTC`, `supplementDH`, `montantTS`, `montantTPT`, `prixNetDH`, `prixDH`, `valeur`, `prixGlobalDH`, `montantDH` sont retournés en chaînes (ex: `"900.00"`) — l'UI parse/arrondit pour l'affichage et renvoie des nombres dans les payloads de création/modification.
- **Mise à jour des types**: Les types mock (`TarifCategory`, `ExtraItem`, `ExtraCategory`, `FiscaliteItem`) sont remplacés par des types alignés sur les réponses backend dans `types/index.ts` (FR-067).
- **Mapping côté API**: Le mapping backend→frontend (traduction de champs, remapping d'ENUM) se fait dans `lib/api/tarification.ts`, pas dans les composants (constitution §III).
- **Couleurs/icônes de présentation**: Le backend n'expose ni couleur ni icône pour les catégories d'extras — les constantes `EXTRA_COLORS`/`EXTRA_ICONS` peuvent être conservées comme mapping de présentation uniquement (elles ne constituent pas des données métier et ne doivent pas contenir de noms/prix mockés).
- **Pas de modification/suppression pour remises et packages**: Aucun endpoint PATCH/DELETE n'est documenté pour `/discounts` et `/packages` — l'UI couvre la consultation et la création uniquement (FR-051, FR-057). Voir Questions Ouvertes.
- **Pas de suppression pour partenaires**: Aucun endpoint DELETE n'est documenté pour `/partners` — pas d'action de suppression (Questions Ouvertes).
- **La confirmation de booking relève du module Réservations**: L'invocation de `GET /api/rates/calculate` à la confirmation (FR-005 à FR-008) décrit la frontière contractuelle de ce module ; l'aperçu de prix décrit ici (FR-001 à FR-004) s'applique à tout écran de configuration de réservation. **Décision Q7 (option A)** : le module Tarification fournit les fonctions API de lecture (`getRatePlans`, `getRegimes`, `applyDiscount`, `calculateTaxes`, `getExtraCategories`) et documente les contraintes d'aperçu ; l'assemblage de l'aperçu dans l'écran de réservation appartient au module Réservations, avec coordination inter-module notée comme dépendance au plan.
- **Réutilisation du pattern d'erreurs**: Les états de chargement et d'erreur suivent le pattern existant (react-query `isLoading`/`isError` gérés inline), conformément à la constitution §III et au point non-négociable n°7.
- **Locale**: Tous les textes UI sont en français (constitution).

## Open Questions

1. **Q1 — Aperçu de prix sans effet de bord : aucune simulation documentée** : La documentation ne contient aucun endpoint de calcul complet **sans effet de bord** (le seul calcul complet, `GET /api/rates/calculate`, écrit des FolioItems). → **Résolue (2026-07-31) : Option A** — l'aperçu est assemblé côté client à partir des endpoints sans effet de bord documentés (rateplans, regimes, discounts/apply, taxes/calculate, extra-categories) et étiqueté « Estimation » (FR-001, FR-004, User Story 2). L'option C (nouvel endpoint backend) reste une possibilité future hors scope, non requise pour ce module.
2. **Q2 — Visibilité du module par rôle** : → **Résolue (2026-07-31) : Option A — admin/manager/comptable uniquement** (FR-058, FR-062, User Story 12). Le backend n'impose aucune restriction de rôle sur les routes GET (service-tarification.md §4, api-gateway.md §3.6) — la restriction est une décision produit. `receptionist` et `housekeeping_supervisor` sont exclus du module (middleware + Sidebar), `comptable` conserve la lecture seule.
3. **PUT et CORS au niveau du gateway** : → **Résolue (2026-07-31) : Option A — vérification au plan du module.** `PUT` n'est pas dans les méthodes CORS autorisées du gateway (api-gateway.md §7.5), or `PUT /api/tarification/seasons/:category` et `PUT /api/tarification/rateplans/category/:categorie` sont documentés côté backend. Un item de plan vérifie le préflight PUT (le code existant `apiClient.put` dans `updateTarif` suggère qu'il passe). Si bloqué, la correction (ajout de `PUT` aux méthodes autorisées) est une dépendance externe côté gateway — hors scope du module.
4. **Absence de PATCH/DELETE pour remises et packages** : → **Résolue (2026-07-31) : hors scope — consultation + création uniquement.** Aucun besoin d'édition/désactivation n'est inclus dans le module (FR-051, FR-057). Toute évolution future nécessiterait de nouveaux endpoints backend non documentés, à planifier en dehors de ce module.
5. **Absence de DELETE pour partenaires** : → **Résolue (2026-07-31) : hors scope — création + modification uniquement.** Aucune suppression de partenaire dans le module (FR-035, FR-036). Un besoin futur de suppression exigerait un endpoint backend non documenté, à planifier en dehors de ce module.
6. **Message backend corrompu « Catégorie introuvable »** : → **Résolue (2026-07-31) : Option B — normalisation frontend ciblée.** Le backend contient un caractère corrompu dans ce message (service-tarification.md §5.7). Le frontend remplace ce seul message par « Catégorie introuvable » propre côté client (dérogation ciblée au principe verbatim, FR-044, Edge Cases) ; tous les autres messages restent affichés verbatim. Le correctif backend reste souhaitable mais hors scope du module.
7. **Aperçu de prix dans les modules consommateurs** : → **Résolue (2026-07-31) : hors scope — frontière documentée.** Le formulaire de configuration de réservation vit dans le module Réservations ; le module Tarification documente les contraintes d'aperçu (US2, FR-001 à FR-004) et fournit les fonctions API de lecture dans `lib/api/tarification.ts`. L'assemblage de l'aperçu dans l'écran de réservation relève du module Réservations (décision Q7 — option A) ; l'alignement inter-module est noté comme dépendance à confirmer lors de la planification (coordination au plan).
