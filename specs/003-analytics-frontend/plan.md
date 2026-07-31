# Implementation Plan: Module Analytics — Connexion Backend

**Branch**: `003-analytics-frontend` | **Date**: 2026-07-30 | **Spec**: [/specs/003-analytics-frontend/spec.md](./spec.md)

**Input**: Feature specification — Connecter le module Analytics frontend au backend
analytics-service (port 4006) via api-gateway, en supprimant les mocks permanents et en
couvrant les KPIs, tendances, segments, tendance par segment et comparaison N-1.

## Summary

Refonte complète du module Analytics (`/analytics`). Les 7 fonctions API dans
`lib/api/analytics.ts` sont nettoyées de tout fallback mock (USE_MOCKS supprimé,
try/catch ne retourne plus de données mockées). Les fonctions et composants
obsolètes (getTodayArrivals, getTodayDepartures, bouton Exporter) sont supprimés.
Un nouveau type `SegmentTrendResponse` est ajouté pour US5 (tendance par segment).
La page `page.tsx` est réorganisée en 5 sections indépendantes avec gestion d'erreur
granulaire. Le middleware et la sidebar sont mis à jour pour restreindre `/analytics`
aux rôles admin/manager/comptable.

## Technical Context

**Language/Version**: TypeScript 5.5, React ^18, Next.js 14.2.35 (App Router)

**Primary Dependencies**:
- `@tanstack/react-query` 5.101.2 (staleTime 5min, retry 2)
- `axios` 1.18.1 via `lib/api/client.ts` (apiClient)
- `chart.js` 4.4.3 + `react-chartjs-2` 5.3.1
- `zustand` 5.0.14 (auth only — aucun nouveau store)
- `tailwindcss` 3.4.19 (custom design system)

**Storage**: PostgreSQL (via backend analytics-service — pas de stockage frontend)

**Testing**: `npm run lint` + `npm run typecheck` + vérification manuelle via les
scénarios de [quickstart.md](./quickstart.md)

**Target Platform**: Linux server, navigateur moderne (Chrome/Firefox/Edge)

**Project Type**: Web application (frontend Next.js App Router)

**Performance Goals**: Chargement des KPIs < 3s sous conditions réseau normales
(SC-001). Chaque section se charge indépendamment.

**Constraints**:
- Gateway-only : `NEXT_PUBLIC_API_URL` (port 4000). Aucun appel direct aux microservices.
- Pas de fallback mock : les erreurs API affichent "Service temporairement indisponible".
- Architecture existante : `lib/api/<service>.ts` (one file per service), composants
  chart réutilisés, React Query pour le server state.
- Types partagés : réutiliser/étendre `types/index.ts`, pas de duplication.

**Scale/Scope**: 1 page existante refactorée (`app/analytics/page.tsx`),
7 endpoints API consommés (dont 1 nouveau : segments/trend), ~20 types manipulés,
code mort supprimé (~200 lignes retirées de `lib/api/analytics.ts`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Statut | Justification |
|----------|--------|---------------|
| I. Gateway-First Communication | ✅ PASS | Tous les appels utilisent `apiClient` avec préfixe `/api/analytics/...`. Vérifié dans `docs/analytics-service.md`. |
| II. Authenticated Route Protection | ⚠️ GAP (fix planifié) | `/analytics` manque dans `ROLE_RESTRICTIONS` de `middleware.ts`. À ajouter (cf. Research §5). Sidebar : le rôle receptionist voit Analytics dans la section GESTION sans filtre. À corriger. |
| III. Service-Per-File API Layer | ✅ PASS | Toutes les fonctions sont dans `lib/api/analytics.ts` existant. Suppression des fonctions obsolètes, pas de nouveau fichier API. |
| IV. Component-Level Data Fetching | ✅ PASS | `useQuery` directement dans `page.tsx` par section. Pas de custom hooks, pas de store global. |
| V. Custom Design System | ✅ PASS | Tailwind + composants existants. Pas de nouvelle dépendance UI. |
| Non-Negotiable Constraints | ✅ PASS | Gateway-only, contrat vérifié, apiClient partagé, TypeScript strict, français, pas d'UI lib externe. |

### Gates

1. **Endpoints contract verification** ✅ — Tous les endpoints documentés dans
   `docs/analytics-service.md` sont couverts. Aucun endpoint manquant pour les
   fonctionnalités requises (arrivées/départs exclus par clarification).
2. **No forbidden dependencies** ✅ — Aucune nouvelle dépendance introduite.
3. **Mock removal compliance** ✅ — Tous les blocs `if (USE_MOCKS)` sont supprimés
   pour les fonctions analytics. Aucun `catch` ne retourne de données mockées.

## Project Structure

```text
specs/003-analytics-frontend/
├── plan.md               # This file
├── spec.md               # Feature specification (updated)
├── research.md           # Phase 0 research
├── data-model.md         # Phase 1 data model
├── quickstart.md         # Phase 1 validation guide
├── contracts/
│   ├── api-contracts.md  # API endpoint contracts
│   └── component-contracts.md  # Component contracts
├── checklists/
│   └── requirements.md   # Quality checklist
└── tasks.md              # Phase 2 — Tâches d'implémentation

app/
└── analytics/
    └── page.tsx           # MODIFIÉ — refonte complète

lib/
└── api/
    └── analytics.ts       # MODIFIÉ — suppression mocks + code mort + segment trend

types/
└── index.ts              # MODIFIÉ — ajout SegmentTrendResponse, suppression SegmentAnalytics/YTDCard

middleware.ts             # MODIFIÉ — ajout /analytics à ROLE_RESTRICTIONS

components/
├── charts/
│   ├── EvolutionChart.tsx # INCHANGÉ (réutilisé tel quel)
│   └── SegmentChart.tsx  # INCHANGÉ (réutilisé tel quel)
└── layout/
    └── Sidebar.tsx       # MODIFIÉ — restriction Analytics à admin/manager/comptable
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected |
|-----------|------------|------------------------------|
| Aucune | Toutes les modifications respectent la constitution | N/A |

## Design Artifacts Generated

- **research.md** — Décisions architecturales, suppression code mort, stratégie erreur,
  gaps middleware/sidebar identifiés.
- **data-model.md** — Types réutilisés, nouveaux types (SegmentTrendResponse,
  SegmentTrendMonth, SegmentTrendMonthItem), types supprimés, validation rules,
  color mapping.
- **contracts/api-contracts.md** — 7 endpoints documentés avec requête/réponse.
- **contracts/component-contracts.md** — États loading/error/empty par section,
  query keys, layout sections.
- **quickstart.md** — 8 scénarios de validation reproductibles.
