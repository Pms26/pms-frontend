# Implementation Plan: Module Tarification — Grille Tarifaire, Taxes, Partenaires, Extras, Remises et Packages

**Branch**: `005-tarification-frontend` | **Date**: 2026-07-31 | **Spec**: [/specs/005-tarification-frontend/spec.md](./spec.md)

**Input**: Feature specification — connexion complète du module frontend Tarification au backend service-tarification via api-gateway : grille tarifaire (saisons + rateplans), suppléments de régime (BB/DP/PC), taxes locales (TS/TPT) avec simulateur sans effet de bord, partenaires et tarifs négociés, catalogue d'extras/POS, remises (pourcentage vs valeur_fixe) avec prévisualisation, packages avec ventilation validée. Suppression des mocks, contrôle d'accès par rôle (décision Q2 : admin/manager/comptable), et distinction critique entre aperçu SANS effet de bord et calcul final à la confirmation du booking (`GET /api/rates/calculate` écrit des FolioItems).

**Correction de spec (2026-07-31)** : User Story 4, Acceptance Scenario 6 mentionnait « comptable ou réceptionniste » — `réceptionniste` est retiré : le réceptionniste est bloqué par le middleware avant d'atteindre `/tarification` (Q2), il ne peut pas « consulter les saisons » ici. Le scénario ne couvre désormais que `comptable` (lecture seule), cohérent avec FR-058/059/061 et US12.

## Summary

Refonte du module Tarification. `app/tarification/page.tsx` devient une page unique organisée en onglets (`fo-tabs`/`fo-tab` existants) : **Grille tarifaire** (matrice catégorie × saison avec édition batch par catégorie + création de tarif), **Régimes** (matrice BB/DP/PC × saison, BB figé à 0,00 DH), **Taxes locales** (TS/TPT par catégorie d'hôtel + simulateur), **Partenaires** (liste, filtre, création/modification, tarifs négociés), **Extras & POS** (catégories + items avec TVA stricte 10/20 et toggle actif), **Remises** (création + prévisualisation via `POST /api/tarification/discounts/apply`), **Packages** (création avec ventilation validée côté client). `lib/api/tarification.ts` est réécrit en suivant le **pattern Analytics/Front Office validé (aucun fallback mock)** : ~27 fonctions, normalisation des erreurs dans la couche API (messages métier exacts du backend, « Service temporairement indisponible » pour 502). Les mocks (`MOCK_TARIFS`, `MOCK_EXTRAS`, `MOCK_FISCALITE`, repli `return MOCK_TARIFS`) et les libellés hardcodés (« Basse Saison Oct–Mars », « DP +220 DH / PC +420 DH par nuit ») sont supprimés. Les types mock (`TarifCategory`, `ExtraItem`, `ExtraCategory`, `FiscaliteItem`) sont remplacés par des types alignés sur le contrat backend. Le middleware restreint `/tarification` à `['admin','manager','comptable']` et la Sidebar masque le lien « Tarifs & Extras » pour `receptionist` et `housekeeping_supervisor` (Q2).

**Deux points intégrés au plan (demande utilisateur)** :
1. **Contingence PUT/CORS (Q3)** — Étape 0 (Gate CORS/PUT) placée en **tout début de plan**, avant les stories 4 et 5 : vérification explicite du préflight CORS pour `PUT /api/tarification/seasons/:category` et `PUT /api/tarification/rateplans/category/:categorie`. Si le préflight bloque PUT, une **alternative de repli documentée** s'applique (PATCH avec body équivalent en relais frontend immédiat + correctif gateway CORS comme dépendance externe) — le blocage ne peut pas être découvert en cours de développement sans solution.
2. **Frontière API vs UI pour `applyDiscount` (FR-049/FR-063)** — la fonction `applyDiscount` dans `lib/api/tarification.ts` n'est **jamais** conditionnée par rôle (aucun `useAuthStore`, aucune lecture de `role` dans la couche API) : elle reste appelable par tout rôle authentifié, y compris `receptionist` depuis le module Réservations (hors scope). Seule l'**UI** du module Tarification (bouton de prévisualisation dans l'onglet Remises) est soumise à la restriction Q2 (admin/manager/comptable), imposée au niveau composant. Le plan distingue explicitement ces deux niveaux (gates + checklist de non-régression).

## Technical Context

**Language/Version**: TypeScript 5.5 (strict), React ^18, Next.js 14.2.35 (App Router)

**Primary Dependencies**:
- `@tanstack/react-query` 5.101.2 (staleTime 5min, retry 2 — aucun changement global)
- `axios` 1.18.1 via `lib/api/client.ts` (apiClient partagé, interceptor 401/refresh)
- `zustand` 5.0.14 (auth only — rôle lu via `useAuthStore`, jamais de décodage JWT brut, FR-060)
- `tailwindcss` 3.4.19 (design system custom) + composants `components/ui/` + icônes Bootstrap Icons
- Aucune nouvelle dépendance introduite

**Storage**: PostgreSQL/MySQL (via backend service-tarification 4004, relayé par le gateway 4000) — aucun stockage frontend

**Testing**: `npm run lint` + `npx tsc --noEmit` (typecheck strict, pas de script dédié dans package.json) + validation manuelle via [quickstart.md](./quickstart.md)

**Target Platform**: Linux server, navigateur moderne (Chrome/Firefox/Edge)

**Project Type**: Web application (frontend Next.js App Router)

**Performance Goals**: Chargement des listes (saisons, grille, partenaires, extras, remises, packages) < 3s sous conditions réseau normales (SC-010). Chaque onglet se charge indépendamment (React Query par query key).

**Constraints**:
- Gateway-only : `NEXT_PUBLIC_API_URL` (port 4000), préfixes `/api/tarification/...` (réécrits en `/api/...` par le gateway, api-gateway.md §2.2), jamais d'appel direct au port 4004.
- **Aucun fallback mock** (pattern Analytics/Front Office) : `lib/api/tarification.ts` ne vérifie jamais `USE_MOCKS`, aucun catch ne retourne de données mockées ; `MOCK_TARIFS`/`MOCK_EXTRAS`/`MOCK_FISCALITE` et le repli `return MOCK_TARIFS` de `getTarifs` sont supprimés (FR-064).
- Erreurs : messages métier exacts du backend (400/404/409/503) affichés verbatim (dérogation Q6 uniquement pour « Catégorie introuvable » normalisé) ; « Service temporairement indisponible » pour 502/infrastructure.
- `GET /api/tarification/rates/calculate` **jamais** appelé dans les chemins d'aperçu (écrit des FolioItems — FR-002, FR-005) ; réservé au module Réservations pour la confirmation de booking (frontière documentée, Q7).
- Rôles : strings exactes `admin`, `manager`, `receptionist`, `housekeeping_supervisor`, `comptable` ; `/tarification` restreint aux rôles retenus par la décision Q2 (admin, manager, comptable).
- ENUM case-sensitive (service-tarification.md §7.10) : `basse|moyenne|haute|pics`, `standard|superieure|suite|suite_deluxe|lodge|villa`, `BB|DP|PC`, `1_etoile…maison_hotes`, `agence_voyage|tour_operateur|societe`, `restaurant|bar_boissons|spa|activites|transferts|services`, `pourcentage|valeur_fixe`, `hebergement|restaurant|spa|activites|autre`.
- Montants DECIMAL en chaînes (`"900.00"`) : parse à l'affichage, nombres dans les payloads.
- Page unique `/tarification`, pas de `loading.tsx`/`error.tsx` (pattern react-query inline, constitution point non-négociable n°7).

**Scale/Scope**: 1 page modifiée (`app/tarification/page.tsx`), 1 fichier API réécrit (`lib/api/tarification.ts`, ~27 fonctions), ~13 nouveaux types dans `types/index.ts` + suppression de 4 types mock, middleware + Sidebar modifiés, sous-composants `components/tarification/` (créés si un onglet dépasse ~300 lignes, décision d'implémentation), ~60 lignes de mocks/hardcoding supprimées.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Statut | Justification |
|----------|--------|---------------|
| I. Gateway-First Communication | ✅ PASS | Tous les appels utilisent `apiClient` avec préfixe gateway `/api/tarification/...` (réécrit en `/api/...` vers le port 4004 — `docs/api-gateway.md` §2.2/2.3, §3.6, §7.5). |
| II. Authenticated Route Protection | ⚠️ GAP (fix planifié) | `middleware.ts` : retrait de `receptionist` de `/tarification` → `['admin', 'manager', 'comptable']` (décision Q2, FR-058). Sidebar : lien « Tarifs & Extras » masqué pour `receptionist` et `housekeeping_supervisor` (FR-062). Rôle lu via `useAuthStore` (FR-060). |
| III. Service-Per-File API Layer | ✅ PASS (écart assumé) | `lib/api/tarification.ts` actuel vérifie `USE_MOCKS` et retombe sur `MOCK_TARIFS` — supprimé (FR-064). Mapping backend→frontend dans la couche API (FR-068). **`applyDiscount` sans aucune garde de rôle** (FR-049/063). Décision utilisateur (2026-07-31) : le module Tarification suit délibérément le pattern no-mock déjà établi par Analytics et Front Office. Écart à §III (USE_MOCKS obligatoire) confirmé et assumé par le porteur du projet — pas un gap à corriger. |
| IV. Component-Level Data Fetching | ✅ PASS | `useQuery`/`useMutation` directement dans les pages et composants `components/tarification/`. Pas de custom hooks, pas de store global. |
| V. Custom Design System | ✅ PASS | Tailwind + composants `components/ui/` + `fo-tabs`/`fo-tab` + Bootstrap Icons. Aucune nouvelle dépendance UI. |
| Non-Negotiable Constraints | ✅ PASS | Gateway-only, contrats vérifiés dans `docs/service-tarification.md`/`docs/api-gateway.md`, apiClient partagé, TypeScript strict, français, pas d'UI lib externe. |

### Gates

1. **Endpoints contract verification** ✅ — Tous les endpoints consommés sont documentés dans `docs/service-tarification.md` §2/§5 et `docs/api-gateway.md` §2/§3.6. Chemins frontend avec préfixe gateway `/api/tarification` (réécrit par le gateway vers le port 4004). Aucun endpoint inventé.
2. **No forbidden dependencies** ✅ — Aucune nouvelle dépendance. Stack imposée : React Query, axios/apiClient, Zustand (auth only), Tailwind, Bootstrap Icons.
3. **Mock removal compliance** ✅ — `MOCK_TARIFS`, `MOCK_EXTRAS`, `MOCK_FISCALITE`, repli `return MOCK_TARIFS` et libellés hardcodés (« Basse Saison Oct–Mars », « DP +220 DH / PC +420 DH par nuit ») supprimés de `lib/api/tarification.ts` et `app/tarification/page.tsx` (FR-064/065/066). Vérification par grep en phase d'implémentation.
4. **Gate CORS/PUT — Étape 0 (décision Q3, avant stories 4 et 5)** ⚠️ → voir section « Étape 0 — Vérification préflight CORS/PUT » ci-dessous. Le résultat de la vérification conditionne le verbe d'écriture des fonctions `updateSeasonDates` et `updateCategoryRates`. Une alternative de repli (PATCH body équivalent + dépendance externe gateway) est **documentée et prête à appliquer** — aucun blocage découvert en cours de développement sans solution.
5. **Gate frontière API/UI `applyDiscount` (FR-049/063)** ✅ — Niveau API : `applyDiscount` sans rôle (aucune lecture `useAuthStore`/`role` dans `lib/api/tarification.ts`), appelable par tout rôle authentifié — le gateway n'impose aucune restriction sur `POST /api/tarification/discounts/apply` (api-gateway.md §3.6, ligne 159) et le backend n'a pas de `checkRole` (service-tarification.md §7.2). Niveau UI : bouton de prévisualisation de l'onglet Remises rendu uniquement pour les rôles Q2 (admin/manager/comptable), garde-fou au niveau composant via `useAuthStore`. Vérification par grep (cf. checklists).

### Étape 0 — Vérification préflight CORS/PUT (Q3)

**Position** : toute première étape du plan, **avant** l'implémentation des stories 4 (saisons) et 5 (grille tarifaire) — le seul usage de `apiClient.put` est dans `updateTarif` (ligne 115 de `lib/api/tarification.ts`), jamais validé contre le gateway.

**Procédure** (frontend sur `http://localhost:3000`, gateway sur `http://localhost:4000`) :
- Émettre un préflight OPTIONS vers le gateway pour les deux endpoints :
  - `OPTIONS http://localhost:4000/api/tarification/seasons/basse` avec headers `Origin: http://localhost:3000`, `Access-Control-Request-Method: PUT`, `Access-Control-Request-Headers: authorization,content-type`
  - `OPTIONS http://localhost:4000/api/tarification/rateplans/category/standard` (mêmes headers)
- Lire la réponse : `Access-Control-Allow-Methods` doit contenir `PUT`. Référence : les méthodes CORS du gateway sont `GET, POST, PATCH, DELETE, OPTIONS` — **`PUT` n'est pas dans la liste** (api-gateway.md §4.5, ligne 234 ; alerte §7.3 ligne 357). Le risque de blocage est réel.
- Enregistrer le résultat dans research.md (R3) et figer le choix de verbe dans `lib/api/tarification.ts`.

**Branche A — PUT autorisé** : conserver `apiClient.put` pour `updateSeasonDates` (`PUT /api/tarification/seasons/:category`) et `updateCategoryRates` (`PUT /api/tarification/rateplans/category/:categorie`), conforme à la documentation backend et au code existant.

**Branche B — PUT bloqué par le préflight** : appliquer immédiatement le repli documenté, sans attendre un correctif externe :
- **B1 — Correctif définitif (dépendance externe hors module)** : ajouter `PUT` aux méthodes CORS du gateway (api-gateway.md §4.5, `methods`). Enregistrée comme dépendance à planifier côté infra ; vérifiée en fin de module avant release.
- **B2 — Repli frontend immédiat** : la couche API expose un sélecteur de verbe `TARIFICATION_WRITE_VERB` (constante module, défaut `'PUT'`) consommé par `updateSeasonDates`/`updateCategoryRates` ; si PUT est bloqué, basculer sur **`PATCH` avec un body équivalent** (`{dateDebut?, dateFin?}` / `{nomSaison: prix}`) pour ne pas bloquer les stories 4/5. ⚠️ Prérequis externe documenté : le backend service-tarification doit accepter `PATCH` sur ces deux chemins (ou le gateway doit réécrire PATCH→PUT), à valider avant toute release — B2 est un relais d'implémentation, pas un choix de contrat final.

**Conséquence** : les stories 4 et 5 n'encodent jamais le verbe en dur ; le choix est centralisé et décidé à l'Étape 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-tarification-frontend/
├── plan.md               # This file (/speckit.plan command output)
├── spec.md               # Feature specification (corrigée : US4 SC6, retrait « réceptionniste »)
├── research.md           # Phase 0 output (/speckit.plan command)
├── data-model.md         # Phase 1 output (/speckit.plan command)
├── quickstart.md         # Phase 1 output (/speckit.plan command)
└── contracts/            # Phase 1 output (/speckit.plan command)
    ├── api-contracts.md
    └── component-contracts.md
```

### Source Code (repository root)

```text
app/
└── tarification/
    └── page.tsx                    # MODIFIÉ — page unique à 7 onglets (fo-tabs/fo-tab) : Grille tarifaire,
                                    #   Régimes, Taxes locales, Partenaires, Extras & POS, Remises, Packages ;
                                    #   zéro données hardcodées (FR-065/066), états loading/error/empty inline

components/
├── tarification/                   # NOUVEAU — sous-composants par onglet (créés si un onglet > ~300 lignes) :
│   ├── TariffGrid.tsx              #   matrice catégorie × saison, édition batch par catégorie (FR-015..020)
│   ├── RegimeMatrix.tsx            #   matrice BB/DP/PC × saison, BB figé à 0,00 DH non éditable (FR-021..025)
│   ├── TaxConfig.tsx               #   TS/TPT par catégorie d'hôtel + simulateur taxes/calculate (FR-026..032)
│   ├── PartnersTab.tsx             #   liste/filtre partenaires + tarifs négociés (FR-033..038)
│   ├── ExtrasTab.tsx               #   catégories + items, TVA 10/20, toggle actif (FR-039..045)
│   ├── DiscountsTab.tsx            #   création remise + prévisualisation (bouton réservé rôles Q2) (FR-046..051)
│   └── PackagesTab.tsx             #   création package + ventilation validée (FR-052..057)
└── layout/
    └── Sidebar.tsx                 # MODIFIÉ — lien « Tarifs & Extras » masqué pour receptionist et
                                    #   housekeeping_supervisor (FR-062)

lib/
└── api/
    └── tarification.ts             # MODIFIÉ (réécrit) — ~27 fonctions, zéro mock, erreurs normalisées,
                                    #   mapping backend→frontend ; applyDiscount SANS garde de rôle (FR-049/063)

types/
└── index.ts                        # MODIFIÉ — suppression TarifCategory, ExtraItem, ExtraCategory,
                                    #   FiscaliteItem ; + Season, RatePlan, RegimeSupplement, LocalTax,
                                    #   Partner, PartnerRate, ExtraCategory, ExtraItem, Discount,
                                    #   DiscountApplyResult, PackageOffer, PackageBreakdown (FR-067)

middleware.ts                       # MODIFIÉ — ROLE_RESTRICTIONS '/tarification' → ['admin','manager','comptable']
```

**Structure Decision**: Structure App Router existante, un `page.tsx` pour `/tarification` (constitution : pas de `loading.tsx`/`error.tsx`). Les onglets sont extraits en composants `components/tarification/` pour rester sous la limite de complexité par fichier ; si un onglet reste court (< ~300 lignes), il peut être maintenu inline dans `page.tsx` (décision d'implémentation, pas un contrat). Aucun nouveau fichier API ni nouveau store. Vue « Régimes » (requise par US1 SC3 et US6) en onglet dédié pour une séparation claire de la matrice des tarifs.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Absence de fallback mock dans `lib/api/tarification.ts` (écart au pattern constitutionnel III) | Validé par la spec (Assumptions « Absence de fallback mock ») et aligné sur le pattern Analytics/Front Office livré : afficher les vraies erreurs backend plutôt que des données factices silencieuses | Retour mock silencieux = risque d'afficher des données fausses (SC-003/004) ; le pattern Analytics a déjà établi le précédent approuvé |
| Sélecteur de verbe PUT/PATCH dans la couche API (`TARIFICATION_WRITE_VERB`, contingence Q3) | Le verbe d'écriture des stories 4/5 dépend d'une vérification CORS dont l'issue est inconnue avant l'Étape 0 ; centraliser le verbe permet d'appliquer le repli PATCH sans réécrire les stories | Encoder `PUT` en dur = blocage découvert en cours de développement sans solution, exactement le scénario que Q3 doit prévenir |
| Suppression des types mock `TarifCategory`/`ExtraItem`/`ExtraCategory`/`FiscaliteItem` (impact migrations d'affichage) | FR-067 exige des types alignés sur le contrat backend (Season, RatePlan, …) ; le mapping vit dans `lib/api/tarification.ts` (constitution §III), les composants consomment la nouvelle forme | Conserver les types mock = données « mock-shaped » incompatibles avec les réponses réelles et double source de vérité |
| Absence totale de `USE_MOCKS` dans `lib/api/tarification.ts` (constitution §III) | Confirmé explicitement par l'utilisateur le 2026-07-31 : cohérence avec le pattern déjà livré sur Analytics et Front Office, pas un oubli | Réintroduire `USE_MOCKS` romprait la cohérence avec les 2 modules déjà en production suivant ce pattern |

## Design Artifacts Generated

- **research.md** — Décisions : préfixes gateway `/api/tarification/...`, stratégie d'erreur sans fallback mock (pattern Analytics), **vérification préflight CORS/PUT (Q3) et repli PATCH documenté**, **frontière API vs UI pour `applyDiscount` (FR-049/063)**, alignement des types sur le contrat backend, contrôle d'accès middleware + Sidebar (Q2).
- **data-model.md** — Entités et types : Season, RatePlan, RegimeSupplement, LocalTax, Partner, PartnerRate, ExtraCategory, ExtraItem, Discount, DiscountApplyResult, PackageOffer, PackageBreakdown + règles de validation (ENUM exacts, TVA 10/20, ventilation = prix global, dateDebut ≤ dateFin) + types supprimés.
- **contracts/api-contracts.md** — ~27 endpoints documentés (chemin gateway, chemin backend, rôles, body, erreurs exactes) incluant le contrat `POST /api/tarification/discounts/apply` (tout rôle) et les deux endpoints PUT soumis au gate CORS.
- **contracts/component-contracts.md** — Structure d'onglets, query keys, états loading/error/empty, matrices de rendu par rôle, règles de prévisualisation « Estimation » sans effet de bord.
- **quickstart.md** — Scénarios de validation reproductibles (grille, saisons avec vérification préflight PUT, matrice, régimes, taxes + simulateur, partenaires, extras, remises + prévisualisation, packages, contrôle d'accès, absence de mocks, frontière `applyDiscount`).
