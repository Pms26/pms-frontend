# Implementation Plan: Analytics Dashboard

**Branch**: `002-analytics-dashboard` | **Date**: 2026-07-28 | **Spec**: `/specs/002-analytics-dashboard/spec.md`

**Input**: Feature specification from user description: "Développer le module Dashboard du frontend OASIS PMS — vue synthétique de la performance de l'hôtel sur le mois en cours, avec comparaison à la période précédente, tendance annuelle, et répartition du chiffre d'affaires/nuitées par segment de clientèle."

## Summary

Refonte de la page `/dashboard` existante pour afficher 6 cartes KPI (TO mensuel, TO journalier, ADR, RevPAR, DMS, CA mensuel), un graphique dual-axis tendance annuelle (TO%/ADR), deux graphiques segment (doughnut nuitées + barres CA), une section comparaison N vs N-1 (YTD + mensuelle avec filtre segment), et les arrivées/départs du jour en mode démo. Stack : Next.js App Router, TanStack React Query, axios via apiClient, Chart.js, Zustand (auth uniquement), Tailwind. Les appels API suivent le pattern USE_MOCKS + try/catch + fallback mock. Aucune nouvelle dépendance introduite.

## Technical Context

**Language/Version**: TypeScript 5.5 (strict mode), React ^18, Next.js 14.2.35 (App Router)

**Primary Dependencies**: @tanstack/react-query 5.101.2 (server state), axios 1.18.1 (HTTP via apiClient), Chart.js 4.4.3 + react-chartjs-2 5.3.1 (graphiques), Zustand 5.0.14 (auth uniquement), Tailwind CSS 3.4.19 (styles)

**Storage**: Server state cache React Query (staleTime 5 min, retry 2, refetchOnWindowFocus: false). Pas de localStorage pour les données dashboard (uniquement le token JWT via auth).

**Testing**: `next lint` uniquement. Aucun framework de test (jest/playwright) dans package.json. La validation est manuelle via `npm run dev` et `npm run build`.

**Target Platform**: Navigateur web moderne (Next.js SSR avec App Router, côté client après hydratation)

**Project Type**: Web application frontend (Next.js App Router — module unique page)

**Performance Goals**: 
- KPI chargés en <3s depuis l'arrivée sur /dashboard (data: { kpis })
- Graphiques mis à jour en <2s après changement de filtre année/mois/segment
- Redirection unauthorized <1s (middleware)

**Constraints**:
- Aucun NaN, Infinity, undefined visible quelles que soient les conditions de données
- Deltas null → afficher "N/A" (tiret), jamais de calcul sur division par zéro
- Appels API via gateway uniquement (préfixe `/api/analytics/...`)
- Toutes les données via apiClient (pas de fetch natif)
- Les arrivées/départs restent en mock permanent (badge "Démo")
- `toJournalier` : delta toujours null (pas d'évolution possible)
- Mois futurs dans tendance : valeur 0 sans erreur
- Année sans données : message "Aucune donnée pour l'année sélectionnée"
- Segment inconnu/nouveau : catégorie "Autres"

**Scale/Scope**: 1 page existante refactorée, 6 cartes KPI, 3 blocs graphiques (tendance, segments, comparaison), 2 listes arrivées/départs. 6 nouveaux endpoints API consommés. ~300 lignes de modifications dans `lib/api/analytics.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate I — Gateway-First Communication
**PASS** — Tous les appels utilisent apiClient avec préfixe gateway (`/api/analytics/...`). Aucun appel direct aux microservices (port 4006). Contrats endpoint vérifiés dans `docs/analytics-service.md`.

### Gate II — Authenticated Route Protection
**PASS** — `/dashboard` ajouté à `ROLE_RESTRICTIONS` dans `middleware.ts` avec rôles `['admin', 'manager', 'comptable']`. Sidebar filtre par rôle via `useAuthStore`.

### Gate III — Service-Per-File API Layer
**PASS** — Toutes les nouvelles fonctions API ajoutées dans `lib/api/analytics.ts` existant. Mapping backend→frontend dans le fichier API, pas dans les composants.

### Gate IV — Component-Level Data Fetching with React Query
**PASS** — `useQuery` utilisé directement dans `app/dashboard/page.tsx`. queryKeys incluent l'entité et les filtres. QueryClient configuré globalement dans Providers.

### Gate V — Custom Design System Without External UI Libraries
**PASS** — Pas de nouvelle dépendance UI. Tokens Tailwind existants. Composants KPICard réutilisé. Pas de shadcn/MUI/Bootstrap JS.

### Gate VI — French-only Interface
**PASS** — Tous les libellés en français. Pas d'i18n.

### Gate VII — TypeScript strict mode
**PASS** — Tous les nouveaux types et fonctions respectent `strict: true`. Aucun `any` ajouté.

### Gate VIII — No external UI dependencies
**PASS** — Chart.js/react-chartjs-2 déjà dans la stack. Pas de nouveau package.

### Gate IX — Existing loading/error pattern (no loading.tsx/error.tsx)
**PASS** — États de chargement gérés via `isLoading` de React Query inline dans le composant. Skeletons inline.

### Gate X — Contract verification
**PASS** — `docs/analytics-service.md` consulté. Tous les endpoints, rôles, formats de réponse vérifiés. Aucune incohérence entre le spec et les contrats documentés.

### Gate XI — No Zustand beyond auth
**PASS** — Pas de nouveau store Zustand pour le dashboard. React Query cache + useState pour sélecteurs.

**Résultat**: Tous les gates PASS. Aucune violation nécessitant justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-analytics-dashboard/
├── plan.md              # Ce fichier (output speckit.plan)
├── research.md          # Phase 0 — décisions de design
├── data-model.md        # Phase 1 — types et structures de données
├── quickstart.md        # Phase 1 — guide de validation
├── contracts/           # Phase 1 — contrats d'interface
│   ├── api-contracts.md      # Contrats endpoint API
│   └── component-contracts.md # Contrats props composants
└── tasks.md             # Phase 2 (output speckit.tasks — pas créé par speckit.plan)
```

### Source Code (repository root)

```text
app/
└── dashboard/
    └── page.tsx              # MODIFIÉ : refonte complète du dashboard

components/
├── ui/
│   └── KPICard.tsx           # RÉUTILISÉ (inchangé)
├── charts/
│   ├── EvolutionChart.tsx    # MODIFIÉ : accepte props data/options au lieu de getTarifs
│   └── SegmentChart.tsx      # MODIFIÉ : accepte props data/options au lieu de getTarifs
└── layout/
    └── Sidebar.tsx           # MODIFIÉ : visibilité Dashboard par rôle

lib/
└── api/
    └── analytics.ts          # MODIFIÉ : nouvelles fonctions + mocks + try/catch

types/
└── index.ts                  # MODIFIÉ : nouveaux types (MonthlyComparison, SegmentGroup, TrendData, etc.)

middleware.ts                 # MODIFIÉ : ajout /dashboard à ROLE_RESTRICTIONS
```

**Structure Decision**: Aucun nouveau fichier ajouté hormis la documentation dans `specs/`. Toutes les modifications sont des modifications sur place de fichiers existants, conformément à la contrainte "pas de nouvelle page ni de nouvelle route". Les sous-composants de section (KPISection, TrendSection, SegmentSection, ComparisonSection, ArrivalsDeparturesSection) peuvent être créés dans `components/dashboard/` si la complexité de `page.tsx` le justifie, mais l'approche par défaut est un seul fichier `page.tsx` avec du JSX structuré par sections commentées.

## Complexity Tracking

> Aucune violation constitutionnelle — cette section est vide.
