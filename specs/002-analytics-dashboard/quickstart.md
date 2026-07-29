# Quickstart — Validation du Dashboard

**Date**: 2026-07-28 | **Branch**: `002-analytics-dashboard`

## Prérequis

- Node.js ≥ 18
- `npm install` exécuté (dépendances déjà installées)
- `.env.local` avec `NEXT_PUBLIC_API_URL=http://localhost:4000` (gateway)
- Backend analytics (port 4006) accessible via gateway (port 4000), **ou** `NEXT_PUBLIC_USE_MOCKS=true` pour mode déconnecté

## Commandes

```bash
# Lancer le serveur de développement
npm run dev

# Vérifier la compilation TypeScript
npm run build

# Vérifier le lint
npm run lint
```

## Scénarios de validation

### S1 — Affichage des 6 KPI

**Étapes**:
1. Lancer `npm run dev`
2. Naviguer vers `http://localhost:3000/dashboard`
3. Vérifier que 6 cartes KPI sont visibles : T.O. Mensuel, T.O. Journalier, ADR, RevPAR, DMS, CA Mensuel
4. Vérifier que chaque carte contient : icône, libellé, valeur + unité, delta d'évolution

**Critères**: DASH-FR-001, DASH-FR-002

### S2 — Skeleton au chargement

**Étapes**:
1. Activer le throttling navigateur (Slow 3G) ou ajouter un `await mockDelay(4000)` temporaire
2. Recharger `/dashboard`
3. Vérifier que 6 squelettes gris sont affichés pendant le chargement (pas de layout shift)
4. Vérifier que les valeurs réelles apparaissent après le chargement

**Critères**: DASH-FR-006

### S3 — Delta N/A pour T.O. Journalier

**Étapes**:
1. Naviguer vers `/dashboard`
2. Vérifier que la carte T.O. Journalier affiche un tiret "—" dans la zone delta (pas de NaN/Infinity)
3. Vérifier que la couleur du delta est grise (neutre)

**Critères**: DASH-FR-003, DASH-FR-005

### S4 — Graphique tendance annuelle

**Étapes**:
1. Naviguer vers `/dashboard`
2. Vérifier la présence d'un graphique dual-axis avec TO% (axe gauche) et ADR DH (axe droit)
3. Changer l'année via le sélecteur → le graphique se met à jour
4. Sélectionner une année fictive (ex: 2027) → message "Aucune donnée pour l'année sélectionnée"
5. Sélectionner l'année courante avec données → 12 mois affichés (janvier → décembre)

**Critères**: DASH-FR-008, DASH-FR-009, DASH-FR-010, DASH-FR-011

### S5 — Graphiques segments

**Étapes**:
1. Naviguer vers `/dashboard`
2. Vérifier le camembert (nuitées par segment) avec 3 couleurs : accent/emerald/amber
3. Vérifier le barChart (revenus par segment) avec les mêmes couleurs
4. Changer le mois → les deux graphiques se mettent à jour
5. Changer l'année → les deux graphiques se mettent à jour

**Critères**: DASH-FR-012, DASH-FR-013, DASH-FR-014, DASH-FR-015, DASH-FR-016, DASH-FR-017

### S6 — Comparaison N vs N-1

**Étapes**:
1. Naviguer vers `/dashboard`
2. Voir la section "Comparaison N vs N-1" avec deux onglets : "Cumul YTD" et "Mensuel"
3. Vérifier que chaque vue affiche : valeur N, valeur N-1, delta
4. Basculer entre les onglets → les données changent
5. Appliquer un filtre segment → les données sont filtrées

**Critères**: DASH-FR-018, DASH-FR-019, DASH-FR-020, DASH-FR-022

### S7 — Arrivées et départs du jour

**Étapes**:
1. Naviguer vers `/dashboard`
2. Vérifier la section "Arrivées du jour" avec client, chambre, type, heure
3. Vérifier la section "Départs du jour" avec client, chambre, solde, statut
4. Vérifier la présence d'un badge "Démo" sur les deux sections

**Critères**: DASH-FR-023, DASH-FR-024, DASH-FR-025, DASH-FR-026

### S8 — Contrôle d'accès

**Étapes**:
1. Se connecter avec un compte `receptionist` ou `housekeeping_supervisor`
2. Naviguer vers `/dashboard` → redirigé vers `/front-office` ou `/housekeeping`
3. Se connecter avec `admin`, `manager` ou `comptable`
4. Naviguer vers `/dashboard` → accès autorisé
5. Vérifier dans la Sidebar que le lien "Tableau de bord" n'apparaît que pour les rôles autorisés

**Critères**: DASH-FR-027, DASH-FR-028

### S9 — Edge cases API

**Étapes**:
1. Configurer `NEXT_PUBLIC_USE_MOCKS=false` mais backend analytics arrêté
2. Naviguer vers `/dashboard`
3. Vérifier que les données mockées de fallback s'affichent (pas de page blanche, pas d'erreur)
4. Vérifier qu'aucun NaN/Infinity/undefined n'apparaît dans l'interface

**Critères**: Edge case "Données API indisponibles", DASH-FR-030

### S10 — Build et lint

**Étapes**:
1. `npm run build` → succès (zéro erreur TypeScript)
2. `npm run lint` → zéro warning/erreur

**Critères**: Constitution TypeScript strict, lint clean

## Contrats de référence

- **API endpoints**: Voir `contracts/api-contracts.md` pour les 6 endpoints et leurs formats de réponse
- **Types**: Voir `data-model.md` pour les interfaces TypeScript (TrendResponse, MonthlyComparison, SegmentDistribution, etc.)
- **Composants**: Voir `contracts/component-contracts.md` pour les props et queryKeys

## Comportements attendus

| Condition | Résultat attendu | Référence |
|---|---|---|
| `evolution: null` | Delta affiche "—" (tiret) | DASH-FR-003 |
| `deltas.*: null` | Delta affiche "N/A" | DASH-FR-021, Q2 |
| Mois futur sans données | Valeur 0 sur le graphique | DASH-FR-010 |
| Année sans données | Message "Aucune donnée pour l'année" | DASH-FR-011 |
| API indisponible | Fallback mock, pas d'écran vide | DASH-FR-030 |
| Segment inconnu | Catégorie "Autres" | Edge case |
| Changement rapide sélecteur | Dernière requête seulement (React Query) | Edge case |
