# Feature Specification: Night Audit Frontend — Connexion au Backend

**Feature Branch**: `001-night-audit-frontend`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Connecter le module frontend Night Audit au vrai backend service-night-audit, en remplaçant tous les mocks par les vrais appels API et en couvrant les deux pages existantes (/night-audit et /night-audit/history)."

## Clarifications

Four ambiguities were identified during `/speckit.clarify` and resolved on
2026-07-27:

### C1. Rollover Scope → **Out of Scope**
- **Question**: Le rollover (POST `/api/night-audit/rollover`) doit-il être implémenté dans cette feature ?
- **Answer**: Non. Le rollover est une action complémentaire distincte de la clôture. L'UI actuelle n'a pas de bouton rollover. Il sera couvert dans une feature séparée.
- **Impact**: FR-009, User Story 4, SC-005 ne mentionnent que le masquage de la clôture pour le comptable.

### C2. History Detail → **Modal (GlobalModals)**
- **Question**: Comment afficher le détail d'une clôture depuis l'historique ?
- **Answer**: Dans un modal réutilisant le composant `components/layout/GlobalModals.tsx`. Pas de nouvelle route ni de page dédiée.
- **Impact**: User Story 6 décrit le pattern d'interaction modal. FR-018 précisée.

### C3. Check-Balance Prerequisite → **Mandatory**
- **Question**: La vérification d'équilibre est-elle un prérequis obligatoire avant la clôture ?
- **Answer**: Oui. Le bouton "Clôturer" reste désactivé (grisé) tant que "Vérifier l'équilibre" n'a pas été exécuté au moins une fois dans la session.
- **Impact**: User Story 3, FR-006, FR-026 (nouveau), edge case ajouté.

### C4. Téléchargement Comptable → **Depuis l'historique uniquement**
- **Question**: Le comptable peut-il télécharger les rapports depuis la réponse de clôture (/close) ?
- **Answer**: Non. Le comptable ne peut télécharger que depuis l'historique (GET `/history/:date/reports/:report_id` l'autorise). Depuis la réponse /close, le comptable ne voit que les métadonnées sans lien de téléchargement (download_url n'est fourni que pour les admins).
- **Impact**: FR-020, FR-021, User Story 7 scenario 3.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulter le statut de la journée (Priority: P1)

En tant que manager/admin/comptable, je veux voir l'état actuel de la journée
métier (date en cours, statut ouvert/échoué, date de dernière clôture) afin de
savoir si je peux procéder aux opérations de night audit.

**Why this priority**: C'est la page d'entrée du module. Sans affichage correct
du statut, aucune autre action n'a de sens — le statut conditionne la
disponibilité de toutes les actions (check-balance, close).

**Independent Test**: En se connectant avec un compte admin/manager/comptable et
en naviguant vers /night-audit, l'utilisateur voit la date métier courante, le
statut (en cours ou échoué), et la date de la dernière clôture si elle existe.

**Acceptance Scenarios**:

1. **Given** une journée est en cours (pas encore clôturée), **When** l'utilisateur
   accède à /night-audit, **Then** la page affiche la date métier courante et le
   statut "en cours".
2. **Given** la dernière tentative de clôture a échoué, **When** l'utilisateur
   accède à /night-audit, **Then** la page affiche le statut "échoué" avec les
   détails de l'erreur (service défaillant, code d'erreur).
3. **Given** aucune clôture n'a jamais été effectuée (premier lancement), **When**
   l'utilisateur accède à /night-audit, **Then** la page affiche la date du jour
   comme date métier et aucun affichage de "dernière clôture".
4. **Given** une clôture précédente a été effectuée, **When** l'utilisateur voit
   la section "dernière clôture", **Then** la date, l'heure et le rôle de celui
   qui a clôturé sont affichés.

---

### User Story 2 - Vérifier l'équilibre débit/crédit (Priority: P1)

En tant que manager/admin/comptable, je veux vérifier l'équilibre
débit/crédit de la journée avant de lancer la clôture, afin de détecter
d'éventuels écarts.

**Why this priority**: L'opération de vérification est un prérequis fonctionnel
avant toute clôture. Sans elle, l'utilisateur ne peut pas savoir s'il y a un
écart, ce qui conditionne le comportement de la clôture (justification
obligatoire ou blocage).

**Independent Test**: En cliquant sur "Vérifier l'équilibre", l'utilisateur voit
les totaux débit, crédit et l'écart éventuel, avec une décomposition par source.

**Acceptance Scenarios**:

1. **Given** la journée est ouverte et les comptes sont équilibrés (écart = 0),
   **When** l'utilisateur lance la vérification, **Then** la page affiche les
   totaux débit et crédit identiques, l'écart à zéro, et un indicateur visuel
   de succès (ex: icône verte "Équilibré").
2. **Given** la journée est ouverte et un écart existe (écart ≠ 0), **When**
   l'utilisateur lance la vérification, **Then** la page affiche les totaux
   débit et crédit, l'écart, la décomposition par source (frontoffice,
   paiements, débiteurs), et un indicateur visuel d'alerte (ex: icône
   orange/rouge "Écart détecté").
3. **Given** la date demandée est déjà clôturée, **When** l'utilisateur lance
   la vérification, **Then** un message d'erreur indique que la journée est
   déjà clôturée.
4. **Given** le service front-office est indisponible, **When** l'utilisateur
   lance la vérification, **Then** un message d'erreur indique que le service
   est temporairement indisponible et suggère de réessayer.

---

### User Story 3 - Clôturer la journée (Priority: P1)

En tant que manager ou admin, je veux clôturer la journée métier afin de
valider définitivement les opérations et générer les rapports.

**Why this priority**: C'est l'action centrale du module — l'objectif final
du night audit.

**Prerequisite**: La vérification d'équilibre (User Story 2) doit avoir
été exécutée au moins une fois dans la session avant que le bouton
"Clôturer" ne devienne actif. Le bouton est désactivé (grisé) tant que
la vérification n'a pas été lancée, même si la journée est ouverte.

**Independent Test**: En cliquant sur "Clôturer la journée" puis en confirmant,
la journée est clôturée, les rapports sont générés, et la date métier avance
au jour suivant.

**Acceptance Scenarios**:

1. **Given** la journée est ouverte et les comptes sont équilibrés, **When**
   l'admin confirme la clôture (sans fournir de justification), **Then** la
   journée est clôturée, les 6 rapports PDF sont générés, la date métier
   avance au jour suivant, et l'admin reçoit les liens de téléchargement
   pour chaque rapport.
2. **Given** la journée est ouverte et un écart existe, **When** l'admin tente
   de clôturer sans fournir de justification, **Then** un message d'erreur
   indique qu'une justification est requise en cas d'écart pour le rôle admin.
3. **Given** la journée est ouverte et un écart existe, **When** l'admin fournit
   une justification et confirme la clôture, **Then** la journée est clôturée
   avec la justification enregistrée, les rapports sont générés, et la date
   métier avance.
4. **Given** la journée est ouverte et un écart existe, **When** le manager tente
   de clôturer, **Then** un message d'erreur indique que le manager ne peut pas
   clôturer en cas d'écart.
5. **Given** la journée est déjà clôturée, **When** un utilisateur tente de
   clôturer à nouveau, **Then** un message indique que la journée est déjà
   clôturée.
6. **Given** le service front-office est indisponible lors de la clôture, **When**
   l'utilisateur tente de clôturer, **Then** un message d'erreur indique
   l'indisponibilité du service.
7. **Given** des warnings existent lors de la clôture (données réservations
   partiellement indisponibles), **When** la clôture réussit malgré les
   warnings, **Then** les warnings sont affichés comme alertes non bloquantes
   après la clôture.
8. **Given** la journée est ouverte mais la vérification d'équilibre n'a pas
   encore été exécutée dans la session, **When** l'utilisateur accède à la
   page, **Then** le bouton "Clôturer" est affiché mais désactivé (grisé)
   et le bouton "Vérifier l'équilibre" est actif. L'utilisateur doit d'abord
   lancer la vérification pour activer la clôture.

---

### User Story 4 - Masquer les actions pour le rôle comptable (Priority: P2)

En tant que comptable, je veux voir le statut et pouvoir vérifier
l'équilibre, mais je ne dois pas voir le bouton de clôture, car cette
action ne relève pas de mon rôle.

**Why this priority**: Les restrictions de rôle pour le comptable sont déjà
partiellement en place côté middleware. Cette story couvre le masquage UI
correspondant.

**Independent Test**: En se connectant avec un compte comptable, l'utilisateur
voit la page /night-audit sans le bouton "Clôturer" mais avec l'accès au
check-balance.

**Acceptance Scenarios**:

1. **Given** l'utilisateur a le rôle comptable, **When** il accède à
   /night-audit, **Then** le bouton "Lancer la Clôture" n'est pas affiché.
2. **Given** l'utilisateur a le rôle comptable, **When** il accède à
   /night-audit, **Then** l'avertissement "Opération Irréversible" n'est
   pas affiché.
3. **Given** l'utilisateur a le rôle comptable, **When** il accède à
   /night-audit, **Then** la vérification d'équilibre est disponible.

---

### User Story 5 - Consulter l'historique des clôtures (Priority: P2)

En tant que admin ou comptable, je veux voir la liste des clôtures passées
afin de pouvoir consulter les informations financières des journées
précédentes.

**Why this priority**: L'historique est une fonctionnalité de consultation
essentielle pour le comptable et l'admin, mais secondaire par rapport à
l'action de clôture elle-même.

**Independent Test**: En naviguant vers /night-audit/history, l'utilisateur
voit la liste des clôtures triées par date décroissante avec les informations
de chaque clôture.

**Acceptance Scenarios**:

1. **Given** des clôtures existent en base, **When** l'utilisateur accède à
   /night-audit/history, **Then** la liste affiche chaque clôture avec sa
   date métier, son statut (clôturée ou échouée), le rôle de celui qui a
   clôturé, la date/heure de clôture, les totaux débit/crédit, et l'écart.
2. **Given** une clôture a échoué, **When** l'utilisateur la voit dans la
   liste, **Then** les champs total_debit, total_credit et ecart affichent
   "N/A" ou sont vides (pas de faux zéros).
3. **Given** aucune clôture n'existe, **When** l'utilisateur accède à
   /night-audit/history, **Then** un message indique qu'aucune clôture
   n'est disponible.

---

### User Story 6 - Consulter le détail d'une clôture (Priority: P2)

En tant que admin ou comptable, je veux voir le détail complet d'une
clôture (ventilation des revenus, répartition des paiements, débiteurs)
afin de pouvoir analyser les finances de la journée.

**Why this priority**: Le détail est nécessaire pour l'analyse financière
mais n'est accessible qu'après avoir trouvé la clôture dans la liste.

**Independent Test**: En cliquant sur une clôture dans l'historique,
l'utilisateur voit un modal s'ouvrir avec la ventilation des revenus par
catégorie, la répartition des paiements par mode, et le résumé des
débiteurs.

**Interaction Pattern**: Le détail s'affiche dans un **modal** (pattern
GlobalModals existant dans `components/layout/GlobalModals.tsx`). Pas de
nouvelle route ni de page dédiée. Le modal se ferme avec le bouton X ou en
cliquant à l'extérieur.

**Acceptance Scenarios**:

1. **Given** une clôture existe pour le 2026-07-13, **When** l'utilisateur
   consulte le détail, **Then** il voit la ventilation des revenus
   (hébergement, restauration, extras, taxe de séjour) avec montants HT,
   taux TVA, montant TVA et montant TTC pour chaque catégorie.
2. **Given** la clôture contient des paiements, **When** l'utilisateur
   consulte le résumé des paiements, **Then** il voit le total par mode
   de paiement (espèces, carte, virement) avec le nombre de transactions.
3. **Given** la clôture contient des débiteurs, **When** l'utilisateur
   consulte le résumé des débiteurs, **Then** il voit le nom de
   l'agence/corporate, la référence, le montant dû et le nombre de
   factures.

---

### User Story 7 - Télécharger les rapports PDF (Priority: P3)

En tant que admin, je veux télécharger les rapports PDF générés lors
de la clôture afin de pouvoir les archiver ou les transmettre.

**Why this priority**: Le téléchargement est une action complémentaire à
la consultation. Le comptable a accès aux métadonnées des rapports mais
pas au téléchargement direct.

**Independent Test**: En tant qu'admin, l'utilisateur peut télécharger
chaque rapport PDF depuis la page de détail d'une clôture ou depuis la
page principale après clôture.

**Acceptance Scenarios**:

1. **Given** l'utilisateur est admin et une clôture a généré des rapports,
   **When** il consulte les rapports, **Then** chaque rapport affiche un
   bouton/icône de téléchargement.
2. **Given** l'utilisateur est manager et une clôture a généré des rapports,
   **When** il consulte les rapports, **Then** les métadonnées (type, nom)
   sont affichées mais aucun lien de téléchargement n'est proposé.
3. **Given** l'utilisateur est comptable et une clôture a généré des rapports,
   **When** il consulte la liste des rapports depuis l'historique, **Then**
   le bouton de téléchargement est affiché (l'endpoint GET /history/:date/
   reports/:report_id autorise le comptable). Cependant, quand les rapports
   sont affichés dans la réponse de clôture (page /night-audit après close),
   le comptable ne voit que les métadonnées sans lien de téléchargement
   (car download_url n'est fourni que pour les admins dans la réponse /close).

---

### User Story 8 - Supprimer les mocks et connecter getNightAuditReports() (Priority: P2)

La fonction getNightAuditReports() est actuellement mockée en permanence
(même en mode API). Elle doit être réécrite pour appeler le vrai endpoint
backend et retourner les données réelles.

**Why this priority**: Les mocks empêchent toute utilisation réelle du
module. La suppression des mocks est un prérequis fonctionnel.

**Independent Test**: Avec USE_MOCKS=false et le backend opérationnel,
la fonction retourne les vrais types de rapports depuis le backend.

**Acceptance Scenarios**:

1. **Given** le backend est opérationnel et USE_MOCKS=false, **When** la
   page /night-audit se charge, **Then** les types de rapports affichés
   correspondent aux 6 types réels du backend (revenue_daily, receipts_daily,
   debtors, departures, arrivals, occupancy_forecast).
2. **Given** le backend n'est pas encore opérationnel (pas de clôture
   effectuée), **When** la fonction est appelée, **Then** un tableau vide
   est retourné (pas une erreur, pas des mocks).

---

### User Story 9 - Gestion des états de chargement et d'erreur (Priority: P2)

Chaque action du module (consultation du statut, vérification de
l'équilibre, clôture) doit afficher des états visuels de chargement
et des messages d'erreur explicites en cas d'échec.

**Why this priority**: Les états de chargement et d'erreur sont
actuellement partiellement absents. Ils sont essentiels pour
l'expérience utilisateur en conditions réelles (lenteurs, erreurs réseau,
services indisponibles).

**Independent Test**: En simulant un temps de réponse long ou une erreur
API, l'utilisateur voit des indicateurs de chargement appropriés et des
messages d'erreur compréhensibles.

**Acceptance Scenarios**:

1. **Given** une requête API est en cours, **When** l'utilisateur attend,
   **Then** un indicateur de chargement est visible (spinner, skeleton)
   sur la section concernée.
2. **Given** une requête API échoue (erreur réseau, timeout, 5xx),
   **When** l'erreur est reçue, **Then** un message d'erreur explicite
   est affiché dans la section concernée (pas un crash, pas une page vide).
3. **Given** la vérification d'équilibre échoue (service front-office
   indisponible), **When** l'erreur 503 est reçue, **Then** le message
   indique que le service est temporairement indisponible et suggère de
   réessayer.
4. **Given** la clôture échoue avec une erreur spécifique (ECART_BLOCKED,
   403 FORBIDDEN pour le manager, ALREADY_CLOSED), **When** l'erreur est
   reçue, **Then** le message correspond exactement au message du backend.

---

### Edge Cases

- Que se passe-t-il quand le champ `last_closure` est absent de la réponse
  `/status` (premier lancement) ? → L'interface ne doit pas afficher de
  section "dernière clôture".
- Que se passe-t-il quand `error_details` dans `/status` contient un code
  inconnu ? → Afficher le code brut comme information de débogage.
- Que se passe-t-il quand la liste des rapports est vide (clôture échouée
  avant génération) ? → Afficher un message "Aucun rapport généré".
- Que se passe-t-il quand le téléchargement d'un rapport échoue (fichier
  corrompu, checksum incorrect) ? → Le backend retourne une erreur 500
  avec status INTEGRITY_ERROR. Le frontend doit afficher un message
  d'erreur informatif.
- Que se passe-t-il quand `warnings` contient des entries lors d'une
  clôture réussie ? → Afficher les warnings comme alertes non bloquantes
  (style orange/amber) sous le message de succès.
- Que se passe-t-il quand le format de `business_date` n'est pas YYYY-MM-DD
  ? → Le backend rejette avec une erreur 400 VALIDATION_ERROR. Le frontend
  doit valider le format côté client avant soumission.
- Que se passe-t-il quand `justification` est vide alors qu'un écart existe
  pour le rôle admin ? → Le backend retourne 400 ECART_BLOCKED. Le frontend
  doit empêcher la soumission ou afficher l'erreur.
- Que se passe-t-il quand l'utilisateur tente de clôturer sans avoir lancé
  la vérification d'équilibre ? → Le bouton "Clôturer" est désactivé (grisé)
  tant que la vérification n'a pas été exécutée au moins une fois dans la
  session. L'utilisateur doit d'abord cliquer sur "Vérifier l'équilibre".

## Requirements *(mandatory)*

### Functional Requirements

#### Page /night-audit

- **FR-001**: Le système MUST afficher la date métier courante en chargeant
  le statut depuis le backend.
- **FR-002**: Le système MUST afficher le statut de la journée ("en cours"
  ou "échoué") avec les détails pertinents.
- **FR-003**: Le système MUST afficher la date, l'heure et le rôle de la
  dernière clôture quand elle existe.
- **FR-004**: Le système MUST permettre la vérification de l'équilibre
  débit/crédit pour la date courante, en affichant les totaux débit,
  crédit, écart, et la décomposition par source.
- **FR-005**: Le système MUST afficher un indicateur visuel distinctif
  quand un écart est détecté (équilibré vs écart).
- **FR-006**: Le système MUST permettre la clôture de la journée avec
  confirmation, **après** que la vérification d'équilibre a été exécutée
  au moins une fois dans la session. Le bouton "Clôturer" est désactivé
  (grisé) tant que la vérification n'a pas été lancée.
- **FR-007**: Le système MUST exiger une justification de la part de
  l'admin quand un écart existe avant d'autoriser la clôture.
- **FR-008**: Le système MUST bloquer la clôture pour le manager quand
  un écart existe, avec un message d'erreur explicite.
- **FR-009**: Le système MUST masquer l'action de clôture pour le rôle
  comptable.
- **FR-010**: Le système MUST masquer l'avertissement "Opération
  Irréversible" pour le rôle comptable.
- **FR-011**: Le système MUST afficher les warnings non bloquants après
  une clôture réussie quand des avertissements existent.
- **FR-012**: Le système MUST afficher les rapports générés après une
  clôture avec les métadonnées (type, nom) et, pour les admins, les
  liens de téléchargement.
- **FR-013**: Le système MUST valider le format YYYY-MM-DD de la date
  métier côté client avant toute soumission.
- **FR-014**: Le système MUST gérer les erreurs spécifiques du backend
  (ECART_BLOCKED pour admin sans justification, 403 FORBIDDEN pour manager
  en cas d'écart, ALREADY_CLOSED, SERVICE_UNAVAILABLE, VALIDATION_ERROR)
  avec des messages explicites.

#### Page /night-audit/history

- **FR-015**: Le système MUST afficher la liste des clôtures passées
  triées par date décroissante.
- **FR-016**: Le système MUST afficher pour chaque clôture : date métier,
  statut, rôle du clôtureur, date/heure de clôture, totaux débit/crédit,
  écart, nombre de rapports.
- **FR-017**: Le système MUST gérer le cas où les totaux sont null
  (clôture échouée) en affichant "N/A" ou un tiret.
- **FR-018**: Le système MUST permettre de consulter le détail d'une
  clôture via un **modal** (GlobalModals) incluant la ventilation des
  revenus, le résumé des paiements et le résumé des débiteurs.
- **FR-019**: Le système MUST afficher la liste des rapports PDF pour
  chaque clôture avec les métadonnées (type, nom, taille, date de
  génération).
- **FR-020**: Le système MUST permettre le téléchargement des rapports
  PDF pour les admins (depuis l'historique et la réponse de clôture)
  et pour les comptables (depuis l'historique uniquement).
- **FR-021**: Le système MUST masquer les liens de téléchargement pour
  le manager et le comptable quand les rapports sont affichés dans la
  réponse de clôture (pas de download_url fourni par le backend pour
  ces rôles).

#### Couche API (lib/api/nightAudit.ts)

- **FR-022**: La fonction getNightAuditReports() MUST appeler le vrai
  endpoint backend quand USE_MOCKS est désactivé, au lieu de retourner
  des données mockées en permanence.
- **FR-023**: Toute nouvelle fonction API MUST suivre le pattern
  USE_MOCKS + mockDelay + try/catch avec fallback.
- **FR-024**: Le mapping backend-to-frontend des données MUST être
  effectué dans la couche API, pas dans les composants.
- **FR-025**: Les types TypeScript partagés MUST être mis à jour pour
  refléter la structure réelle des réponses backend.
- **FR-026**: Le bouton "Clôturer" MUST rester désactivé (grisé) tant que
  la vérification d'équilibre (User Story 2) n'a pas été exécutée au moins
  une fois dans la session utilisateur, même si la journée est ouverte.

### Key Entities

- **Statut de journée** (`NightAuditStatus`): Date métier courante,
  statut (en_cours/echouee), détails d'erreur éventuels, date et
  moment de la dernière clôture.
- **Équilibre** (`CheckBalance`): Date vérifiée, flag équilibré/non,
  totaux débit/crédit, écart, décomposition par source (frontoffice,
  paiements, débiteurs).
- **Clôture** (`Closure`): Date métier clôturée, statut (cloturee/echouee),
  identifiant et rôle du clôtureur, timestamp de clôture, totaux
  débit/crédit, écart, justification, nombre de rapports, détails
  d'erreur éventuels, warnings éventuels.
- **Ventilation des revenus** (`RevenueBreakdown`): Catégorie (lodging,
  fb, extras, tourism_tax), montant HT, taux TVA, montant TVA,
  montant TTC.
- **Résumé des paiements** (`PaymentSummary`): Mode de paiement (cash,
  card, wire_transfer), montant total, nombre de transactions.
- **Débiteur** (`DebtorSummary`): Nom, référence, montant dû, nombre
  de factures.
- **Rapport** (`NightAuditReport`): Identifiant, type (6 types possibles),
  nom, taille du fichier, checksum, algorithme de checksum, date de
  génération, URL de téléchargement (admin uniquement).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: L'utilisateur peut consulter le statut de la journée en
  moins de 3 secondes après navigation vers /night-audit.
- **SC-002**: La vérification d'équilibre affiche les résultats en
  moins de 5 secondes même avec un volume standard de transactions.
- **SC-003**: La clôture de la journée se termine en moins de 15 secondes
  (incluant la génération des rapports PDF).
- **SC-004**: 100% des erreurs backend spécifiques (ECART_BLOCKED, 403
  FORBIDDEN pour manager, ALREADY_CLOSED, SERVICE_UNAVAILABLE) produisent
  un message d'erreur français compréhensible pour l'utilisateur.
- **SC-005**: Le rôle comptable ne voit aucune action de clôture sur la
  page /night-audit.
- **SC-006**: La page /night-audit/history affiche toutes les clôtures
  existantes sans omission.
- **SC-007**: Le téléchargement de rapport PDF fonctionne pour le rôle
  admin depuis la page d'historique.
- **SC-008**: Aucun mock n'est retourné quand USE_MOCKS=false et que le
  backend est opérationnel.

## Assumptions

- Le service-night-audit est opérationnel et accessible via api-gateway
  (port 4000, préfixe `/api/night-audit` préservé sans réécriture).
- Les rôles admin, manager, comptable et receptionist sont les seuls
  rôles existants dans le système.
- Le rôle `receptionist` a accès à GET /status mais pas à /check-balance,
  /close, /rollover, /history — conformément à la matrice de permissions.
- La validation du format de date (YYYY-MM-DD) est effectuée côté client
  avant soumission pour éviter les erreurs 400 inutiles.
- Les types TypeScript dans `types/index.ts` doivent être étendus pour
  couvrir les nouvelles structures de données (RevenueBreakdown,
  PaymentSummary, DebtorSummary, CheckBalance) — les types actuels
  (NightAuditStatus, Closure) ne couvrent pas tous les champs du backend.
- Les composants existants dans `app/night-audit/` et
  `app/night-audit/history/` sont modifiés sur place (pas de nouvelle
  page).
- La couche API `lib/api/nightAudit.ts` est modifiée sur place pour
  remplacer les mocks par les vrais appels.
- Le middleware `middleware.ts` n'est pas modifié — les restrictions
  de rôle pour le comptable sur `/night-audit/history` sont déjà en place.
- Les icones Bootstrap Icons (`bi bi-*`) continuent d'être utilisées
  pour les indicateurs visuels.
- **Rollover hors périmètre** (C1): L'endpoint `POST /api/night-audit/rollover`
  n'est pas implémenté dans ce cycle. Aucun bouton "Avancer la date" n'est
  ajouté à l'UI. Le masquage pour le comptable (FR-009) reste valide.
- **Détail de clôture en modal** (C2): Le détail d'une clôture (ventilation
  des revenus, paiements, débiteurs) s'affiche dans un modal réutilisant
  `components/layout/GlobalModals.tsx`. Pas de nouvelle route dédiée.
