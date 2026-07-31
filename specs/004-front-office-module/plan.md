# Implementation Plan: Module Front Office — Gestion Complète du Séjour

**Branch**: `004-front-office-module` | **Date**: 2026-07-31 | **Spec**: [/specs/004-front-office-module/spec.md](./spec.md)

**Input**: Feature specification — refonte du module Front Office : consultation des chambres, check-in avec pro-forma, folios (prestations), check-out avec encaissement exact, et paiements/factures du jour, en remplaçant toutes les données codées en dur par de vrais appels API, avec contrôle d'accès strict par rôle.

## Summary

Refonte complète du module Front Office sur les routes `app/front-office/check-in`, `app/front-office/check-out` (modifiées sur place) et une nouvelle route `app/front-office/payments`. `lib/api/frontOffice.ts` est réécrite en suivant le **pattern Analytics validé (aucun fallback mock)** : 17 fonctions API sans vérification de `USE_MOCKS`, avec normalisation des erreurs dans la couche API (messages métier exacts du backend, « Service temporairement indisponible » pour les 502). Les données codées en dur (`FOLIO_A_LINES`, résumé de paiement « 3 000 DH ») sont supprimées et remplacées par les appels `GET /api/folios/:folioId`, `GET /api/checkout/:bookingId/statement`, etc. Les types `Room`, `Booking`, `Folio`, `FolioItem`, `Statement`, `Payment`, `Invoice` sont ajoutés dans `types/index.ts`. Le middleware et la Sidebar sont mis à jour selon la matrice de front-office.md §4. Deux corrections de spec incluses : (1) le comptable obtient un chemin concret de consultation de folio en lecture seule via la nouvelle sous-section « Consultation de folio » de `/front-office/payments` (US6, FR-037, FR-033) ; (2) FR-038 interdit tout élément UI déclenchant `POST /api/seed`.

## Technical Context

**Language/Version**: TypeScript 5.5 (strict), React ^18, Next.js 14.2.35 (App Router)

**Primary Dependencies**:
- `@tanstack/react-query` 5.101.2 (staleTime 5min, retry 2 — aucun changement global)
- `axios` 1.18.1 via `lib/api/client.ts` (apiClient partagé, interceptor 401)
- `zustand` 5.0.14 (auth only — rôle lu via `useAuthStore`, jamais de décodage JWT brut, FR-035)
- `tailwindcss` 3.4.19 (design system custom) + composants `components/ui/` + icônes Bootstrap Icons
- Aucune nouvelle dépendance introduite

**Storage**: PostgreSQL (via backend front-office 4005 — aucun stockage frontend)

**Testing**: `npm run lint` + `npm run typecheck` + validation manuelle via [quickstart.md](./quickstart.md)

**Target Platform**: Linux server, navigateur moderne (Chrome/Firefox/Edge)

**Project Type**: Web application (frontend Next.js App Router)

**Performance Goals**: Chargement des listes (chambres, paiements, factures) < 3s sous conditions réseau normales. Chaque section se charge indépendamment (React Query par query key).

**Constraints**:
- Gateway-only : `NEXT_PUBLIC_API_URL` (port 4000), préfixes `/api/front-office/...`, jamais d'appel direct au port 4005.
- **Aucun fallback mock** (pattern Analytics) : `lib/api/frontOffice.ts` ne vérifie jamais `USE_MOCKS`, aucun catch ne retourne de données mockées.
- Erreurs : messages métier exacts du backend (400/404/503) affichés textuellement ; « Service temporairement indisponible » pour 502/infrastructure.
- Roles : strings exactes `admin`, `manager`, `receptionist`, `housekeeping_supervisor`, `comptable`.
- Routes : uniquement check-in, check-out, payments (aucune route en dehors de ces trois).
- Pas de nouvelle route de composant à l'intérieur des pages (pas de loading.tsx/error.tsx, pattern react-query inline existant).

**Scale/Scope**: 2 pages modifiées, 1 nouvelle page (`app/front-office/payments/page.tsx`), 1 fichier API réécrit (`lib/api/frontOffice.ts`, 17 fonctions), ~14 nouveaux types dans `types/index.ts` (+ alignement du type `Room`), middleware + Sidebar + FrontOfficeTabs modifiés, ~150 lignes de données codées en dur supprimées.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Statut | Justification |
|----------|--------|---------------|
| I. Gateway-First Communication | ✅ PASS | Tous les appels utilisent `apiClient` avec préfixe gateway `/api/front-office/...` (vérifié dans `docs/api-gateway.md` §2.2/2.3 et `docs/front-office.md`). |
| II. Authenticated Route Protection | ⚠️ GAP (fix planifié) | `middleware.ts` doit être restreint exactement selon front-office.md §4 : `housekeeping_supervisor` ne peut pas accéder à check-out ; `comptable` ne peut pas accéder à check-in/check-out. Ajout des entrées spécifiques `/front-office/check-in`, `/front-office/check-out`, `/front-office/payments`. Sidebar : le lien Front Office du comptable pointe vers `/front-office/payments`. |
| III. Service-Per-File API Layer | ⚠️ GAP (fix planifié) | `lib/api/frontOffice.ts` actuel vérifie `USE_MOCKS` et retombe silencieusement sur des données mockées — supprimé. Écart validé par la spec (Assumptions « Absence de fallback mock ») et par le pattern Analytics livré. |
| IV. Component-Level Data Fetching | ✅ PASS | `useQuery`/`useMutation` directement dans les pages et composants. Pas de custom hooks, pas de store global. |
| V. Custom Design System | ✅ PASS | Tailwind + composants `components/ui/` + Bootstrap Icons. Aucune nouvelle dépendance UI. |
| Non-Negotiable Constraints | ✅ PASS | Gateway-only, contrats vérifiés dans `docs/front-office.md`, apiClient partagé, TypeScript strict, français, pas d'UI lib externe. |

### Gates

1. **Endpoints contract verification** ✅ — Tous les endpoints consommés sont documentés dans `docs/front-office.md` §2. Aucun endpoint manquant pour les fonctionnalités requises. Les chemins d'appel frontend utilisent le préfixe gateway `/api/front-office` (réécrit par le gateway vers le backend, `docs/api-gateway.md` §2.3).
2. **No forbidden dependencies** ✅ — Aucune nouvelle dépendance. Stack imposée : React Query, axios/apiClient, Zustand (auth only), Tailwind, Bootstrap Icons.
3. **Mock removal compliance** ✅ — Tous les blocs `if (USE_MOCKS)` et mocks (`MOCK_CHECKINS`, `MOCK_CHECKOUTS`, `MOCK_FOLIO_A/B`) sont supprimés de `lib/api/frontOffice.ts`. Les erreurs sont normalisées et propagées (jamais de repli silencieux).
4. **Comptable folio access gap resolved** ✅ — FR-037 (sous-section « Consultation de folio » sur `/front-office/payments`, recherche par bookingId ou folioId) rend le droit GET folios du comptable exerçable dans l'UI. Le gateway autorise le comptable sur `GET /api/front-office/folios*` et `GET /api/front-office/checkout*` (`docs/api-gateway.md` §3.6).
5. **Seed endpoint never exposed** ✅ — FR-038 : aucun élément UI ne déclenche `POST /api/front-office/seed`. Vérification par grep en phase d'implémentation (cf. checklists).

## Project Structure

### Documentation (this feature)

```text
specs/004-front-office-module/
├── plan.md               # This file (/speckit.plan command output)
├── spec.md               # Feature specification (corrigée : FR-033/037/038, US6)
├── research.md           # Phase 0 output (/speckit.plan command)
├── data-model.md         # Phase 1 output (/speckit.plan command)
├── quickstart.md         # Phase 1 output (/speckit.plan command)
├── contracts/            # Phase 1 output (/speckit.plan command)
│   ├── api-contracts.md
│   └── component-contracts.md
└── checklists/
    └── requirements.md   # Quality checklist
```

### Source Code (repository root)

```text
app/
├── front-office/
│   ├── page.tsx                    # MODIFIÉ — redirection par rôle (anti boucle) : comptable → /front-office/payments, admin/manager/receptionist/housekeeping_supervisor → /front-office/check-in ; rôle lu depuis useAuthStore après hydratation (FR-035), sinon /login
│   ├── check-in/
│   │   └── page.tsx                # MODIFIÉ — zone chambres (liste+filtr+statut) + zone check-in (recherche booking, détail, pro-forma, action check-in/annulation, folios)
│   ├── check-out/
│   │   └── page.tsx                # MODIFIÉ — recherche booking, extrait de compte, encaissement réparti, validation montant exact
│   └── payments/
│       └── page.tsx                # NOUVEAU — paiements du jour + factures du jour + consultation de folio en lecture seule

components/
├── front-office/
│   ├── FrontOfficeTabs.tsx         # MODIFIÉ — 3e onglet « Paiements », filtrage des onglets par rôle
│   ├── RoomList.tsx                # NOUVEAU — liste chambres + filtre statut + détail + maj statut (FR-001..006)
│   ├── CheckInBooking.tsx          # NOUVEAU — recherche bookingId, détail réservation, pro-forma, check-in/cancel, folios (FR-007..014, FR-036)
│   ├── CheckOutPanel.tsx           # NOUVEAU — extrait de compte + encaissement + validation (FR-023..029)
│   └── FolioConsultation.tsx       # NOUVEAU — consultation folio lecture seule (FR-037)
└── layout/
    └── Sidebar.tsx                 # MODIFIÉ — lien Front Office du comptable → /front-office/payments

lib/
└── api/
    └── frontOffice.ts              # MODIFIÉ (réécrit) — 17 fonctions, zéro mock, erreurs normalisées

types/
└── index.ts                        # MODIFIÉ — Room aligné front-office.md §5.1, + HousekeepingStatus, Booking, Proforma, Folio, FolioItem, FolioDetail, Statement, Payment, PaymentMethod, PaymentsResponse, Invoice, InvoicesResponse, CheckInResult, CheckOutPayment, CheckOutResult ; suppression de FolioEntry, CheckOutSummary, PaymentMode

middleware.ts                       # MODIFIÉ — ROLE_RESTRICTIONS front-office par route + matcher à frontière de chemin
```

**Structure Decision**: Structure App Router existante, un `page.tsx` par route (constitution : pas de `loading.tsx`/`error.tsx`). Les sous-sections sont extraites en composants `components/front-office/` pour rester sous la limite de complexité par fichier ; si une sous-section reste courte (< ~300 lignes), elle peut être maintenue inline dans `page.tsx` (décision d'implémentation, pas de contrat). Aucun nouveau fichier API ni nouveau store.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Absence de fallback mock dans `lib/api/frontOffice.ts` (écart au pattern constitutionnel III) | Validé par la spec (Assumptions) et aligné sur le pattern Analytics livré : afficher les vraies erreurs backend plutôt que des données factices silencieuses | Retour mock silencieux = risque d'afficher des données fausses (SC-004, SC-005) ; le pattern Analytics a déjà établi le précédent approuvé |
| Alignement du type partagé `Room` et du module housekeeping (4 fichiers mécaniques) | Le type `Room` actuel (id/type/status/reason) ne correspond pas au contrat backend `GET /api/rooms` (front-office.md §5.1) ; un seul type source de vérité dans `types/index.ts` | Dupliquer en `FrontOfficeRoom` aurait créé deux types « chambre » divergents sur le même contrat backend |
| Matcher middleware à frontière de chemin (`path === p || path.startsWith(p + '/')`) | L'entrée générique `/front-office` matcherait aussi `/front-office/check-in|check-out|payments` via `startsWith` et neutraliserait les restrictions spécifiques | Conserver `startsWith` brut sur l'entrée `/front-office` laisserait le comptable et la gouvernante atteindre check-out |

## Design Artifacts Generated

- **research.md** — Décisions : préfixes gateway `/api/front-office/...`, stratégie d'erreur (normalisation dans la couche API, 502 → « Service temporairement indisponible »), alignement types partagés, matcher middleware, absence d'endpoint « arrivées/départs du jour » → recherche par bookingId, consultation folio du comptable, seed jamais exposé.
- **data-model.md** — Entités et types : Room, HousekeepingStatus, Booking, Proforma, Folio, FolioItem, Statement, Payment, Invoice + règles de validation (montant exact ± 1 centime, statuts autorisés, modes de paiement) + transitions d'état.
- **contracts/api-contracts.md** — 17 endpoints documentés (requête/réponse/erreurs exactes) avec les chemins gateway.
- **contracts/component-contracts.md** — États loading/error/empty par page et sous-section, query keys, matrices de rendu par rôle.
- **quickstart.md** — Scénarios de validation reproductibles (check-in complet, pro-forma, annulation, check-out exact, consultation comptable, seed absent).
