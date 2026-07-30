# Quickstart: Module Analytics — Connexion Backend

**Date**: 2026-07-30 | **Branch**: `003-analytics-frontend`

## Prerequisites

1. Node modules installés : `npm install`
2. Backend analytics (port 4006) accessible via gateway (port 4000)
3. `NEXT_PUBLIC_USE_MOCKS=false` dans `.env.local` (ou omis — false par défaut)
4. Authentification : token JWT valide pour un rôle `admin`, `manager`, ou `comptable`

## Setup

```bash
# Lancer le frontend en dev
npm run dev
```

## Scenarios de validation

### S1 — KPIs (US1)

1. Naviguer vers `/analytics`
2. **Attendu** : 6 cartes KPI (TO Mensuel, TO Journalier, ADR, RevPAR, DMS, CA Mensuel)
   avec valeurs, unités, et évolutions (vert/hausse, rouge/baisse, neutre/tiret)
3. Vérifier : tooltip sur icône info → "Basé sur les séjours effectifs (check-in/check-out) uniquement"
4. Vérifier : `evolution: null` → affiche "—" pas NaN/Infinity

### S2 — Trend mensuel (US2)

1. Dans `/analytics`, section tendance
2. **Attendu** : Graphique dual-axis TO (%) + ADR (DH) avec 12 points
3. Changer l'année via le sélecteur → le graphique se met à jour
4. Mois futurs : visibles (axe complet) mais visuellement distincts
5. Année vide : message "Aucune donnée pour l'année sélectionnée"

### S3 — Distribution segments (US3)

1. Section distribution segments
2. **Attendu** : Donut (répartition nuités) + Barres (revenus par segment)
3. Changer mois/année → les deux graphiques se mettent à jour
4. Période sans données : message "Aucune donnée pour cette période"

### S4 — Segment Trend (US5)

1. Section tendance par segment
2. **Attendu** : Graphique multi-lignes, une ligne par segment + légende
3. Couleurs par groupe : DIRECT=indigo, OTA=emerald, PARTENAIRES=amber

### S5 — Comparaison N vs N-1 (US4)

1. Section comparaison, onglet YTD
2. **Attendu** : Tableau mois par mois, colonnes : N, N-1, delta
3. Basculer sur onglet Mensuel → mois spécifique vs même mois N-1
4. Appliquer filtre segment → données filtrées
5. `delta: null` → affiche "—"

### S6 — Erreur backend

1. Arrêter le service backend (ou `NEXT_PUBLIC_USE_MOCKS=false` sans backend)
2. Recharger `/analytics`
3. **Attendu** : Chaque section affiche "Service temporairement indisponible"
   — pas de crash, pas de page blanche, pas de données mockées

### S7 — Contrôle d'accès

1. Se connecter avec un rôle `receptionist`
2. Naviguer vers `/analytics`
3. **Attendu** : Redirigé vers `/front-office` (ou page d'accueil du rôle)
4. Vérifier : lien Analytics absent de la sidebar

### S8 — Nettoyage (code mort)

1. Vérifier que `getTodayArrivals()`, `getTodayDepartures()` n'existent plus
   dans `lib/api/analytics.ts`
2. Vérifier qu'aucun import de ces fonctions n'existe dans `app/analytics/page.tsx`
3. Vérifier que le bouton "Exporter" n'apparaît plus dans le rendu
4. Vérifier que `lib/api/analytics.ts` ne contient plus de bloc `if (USE_MOCKS)`

## Références

- [Spec](../spec.md)
- [API Contracts](./contracts/api-contracts.md)
- [Component Contracts](./contracts/component-contracts.md)
- [Data Model](./data-model.md)
- [Research](./research.md)
