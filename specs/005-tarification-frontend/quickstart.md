# Quickstart: Module Tarification — Grille Tarifaire, Taxes, Partenaires, Extras, Remises et Packages

**Date**: 2026-07-31 | **Branch**: `005-tarification-frontend`

## Prerequisites

1. Node modules installés : `npm install`
2. Backend service-tarification (port 4004) + gateway (port 4000) opérationnels
3. `NEXT_PUBLIC_USE_MOCKS` non actif (le module tarification ne lit jamais ce flag — FR-064)
4. Comptes de test avec les rôles `admin` / `manager` / `comptable` (et `receptionist`/`housekeeping_supervisor` pour les tests d'accès)
5. Données seedées côté backend : saisons, rateplans, régimes, taxes, partenaires, extras, remises, packages

## Setup

```bash
npm run dev          # frontend Next.js
npm run lint         # eslint
npx tsc --noEmit     # typecheck strict (pas de script dédié dans package.json)
```

## Scénarios de validation

### S0 — Gate CORS/PUT (Étape 0, décision Q3 — AVANT stories 4 et 5)

1. Vérifier le préflight CORS des deux endpoints PUT (frontend servi sur `http://localhost:3000`) :
   ```bash
   curl -i -X OPTIONS http://localhost:4000/api/tarification/seasons/basse \
     -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: PUT" \
     -H "Access-Control-Request-Headers: authorization,content-type"
   curl -i -X OPTIONS http://localhost:4000/api/tarification/rateplans/category/standard \
     -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: PUT" \
     -H "Access-Control-Request-Headers: authorization,content-type"
   ```
2. **Attendu (Branche A)** : la réponse du gateway contient `Access-Control-Allow-Methods` avec `PUT` → implémentation en `apiClient.put` (conforme doc §5.1/§5.2).
3. **Attendu (Branche B)** : `PUT` absent des méthodes CORS (défaut gateway §4.5) → consigner le résultat dans research R3, basculer `TARIFICATION_WRITE_VERB` sur `PATCH` (body équivalent) pour les stories 4/5 et enregistrer la dépendance externe « ajouter PUT aux méthodes CORS du gateway » (vérifiée avant release). L'implémentation ne contient **aucun** verbe en dur dans `updateSeasonDates`/`updateCategoryRates`.

### S1 — Consultation de la grille en lecture (US1, FR-009/010/015/016)

1. Connecter `admin`, ouvrir `/tarification`, onglet « Grille tarifaire »
2. **Attendu** : matrice catégorie × saison, colonnes provenant de `GET /api/tarification/seasons` (nom exact + `dateDebut` → `dateFin`) — aucun libellé « Basse Saison Oct–Mars » hardcodé (FR-065)
3. Prix en DH chargés depuis `GET /api/tarification/rateplans` — aucune valeur codée en dur
4. Arrêter le service-tarification → recharger → « Service temporairement indisponible », pas de page vide (FR-064, SC-009)

### S2 — Rôles et lecture seule comptable (US1 SC5, US12, FR-058..062)

1. Connecter `admin`/`manager` → boutons de création/modification visibles partout
2. Connecter `comptable` → toutes les vues s'affichent, **aucun** bouton de création/modification rendu
3. Connecter `receptionist` → navigation vers `/tarification` → redirigé par le middleware ; lien Sidebar « Tarifs & Extras » masqué (FR-058/062)
4. Connecter `housekeeping_supervisor` → même comportement (lien masqué + middleware)
5. URL `/tarification` tapée directement par `receptionist`/`housekeeping_supervisor` → redirection middleware sans boucle

### S3 — Gestion des saisons avec erreurs exactes (US4, FR-009..014)

1. Connecter `admin`, créer une saison `basse` (2026-01-01 → 2026-03-31) → 201, apparaît dans la liste
2. `dateDebut > dateFin` ou champ manquant → **blocage client** avant tout aller-retour (FR-011)
3. Modifier les dates d'une saison (PUT via le verbe décidé à S0) → succès
4. Dates chevauchant une autre saison → message exact 409 « Les dates chevauchent la saison "..." (... - ...) » (FR-013, pas de validation client du chevauchement — FR-014)
5. Date fin seule → succès (au moins un champ suffit, FR-012) ; aucune date fournie → message exact 400 « Au moins dateDebut ou dateFin doit être fourni »
6. Connecter `comptable` → aucune action visible sur les saisons (US4 SC6, corrigé)

### S4 — Édition de la grille en matrice (US5, FR-017..020)

1. Connecter `admin`, modifier les prix de la catégorie `standard`, « Enregistrer »
2. **Attendu** : payload `{basse: 900, moyenne: 1100, haute: 1400, pics: 1800}` envoyé en clés exactes (ENUM), seules les saisons avec prix non-vides incluses (FR-019)
3. Réponse 200 → « Tarifs mis à jour » + détail `updated: [{season, affected}]` (FR-020), grille rafraîchie
4. Tenter une catégorie « Standard » (mauvaise casse) → impossible via l'UI (ENUM contraint) (SC-008)
5. Connecter `comptable` → cellules non éditables, aucun bouton d'enregistrement (FR-061)

### S5 — Régimes BB/DP/PC (US6, FR-021..025)

1. Onglet « Régimes » → matrice régime × saison depuis l'API
2. Ligne `BB` toujours `0,00 DH`, non éditable (FR-022) ; DP/PC modifiables
3. Nouvelle combinaison DP × saison → création ; modification → PATCH ; montant persiste après rechargement
4. **Attendu** : le texte « DP +220 DH / PC +420 DH par nuit » a disparu (FR-066)

### S6 — Taxes locales et simulateur (US7, FR-026..032)

1. Onglet « Taxes locales » → une ligne par catégorie d'hôtel (TS/TPT en DH/pers/nuit) depuis l'API
2. Configurer/modifier une catégorie (POST/PATCH) ; erreur 404 « Configuration introuvable » verbatim
3. Simulateur : `categorieHotel` 3_etoiles, `pax` 2, `nights` 5 → détail, `totalTS`, `totalTPT`, `totalTaxes` (sans écriture)
4. Paramètre manquant → 400 exact ; catégorie non configurée → 404 exact (FR-030)
5. Explication `taxeMode` affichée (FR-031) ; le simulateur est étiqueté « calcul sans effet de bord » (FR-032)

### S7 — Partenaires et tarifs négociés (US8, FR-033..038)

1. Liste depuis l'API avec filtre par type + recherche par nom (FR-034)
2. Création (actif par défaut), modification, bascule `actif` (FR-035/036)
3. « Tarifs négociés » d'un partenaire → matrice catégorie × saison (`prixNetDH`) ; création d'un tarif négocié ; erreurs 404 « Partenaire introuvable » / « Saison introuvable » verbatim (FR-037/038)
4. **Attendu** : mention UI que l'application des tarifs négociés au booking relève du Front Office (FR-038)

### S8 — Extras & POS (US9, FR-039..045)

1. Catégories + items depuis l'API, prix en DH, TVA `"10"`/`"20"`, badge actif/inactif
2. Créer un item : `prixDH` non-numérique ou TVA 15 → **blocage client avant soumission** (FR-042, SC-006)
3. Modifier prix/TVA/statut → PATCH, mêmes validations (FR-043)
4. Bascule actif/inactif → badge mis à jour + PATCH (FR-045)
5. **Capture du message corrompu (Q6)** : déclencher un vrai 404 sur `POST /api/tarification/extra-items` avec un `categoryId` invalide (ex: 999999) → le backend renvoie « Catégorie introuvable » avec son caractère corrompu ; l'UI l'affiche normalisé en « Catégorie introuvable » propre (match tolérant `atégorie introuvable`, cf. research R2) ; tous les autres messages restent verbatim (FR-044). La chaîne corrompue exacte ainsi capturée sert à valider le match tolérant du code — elle n'est documentée nulle part dans `service-tarification.md` et ne doit pas être devinée

### S9 — Remises et prévisualisation (US10, FR-046..051)

1. Liste avec badge `pourcentage` vs `valeur_fixe` (FR-047)
2. Créer une remise `valeur_fixe` de 800, prévisualiser sur `prixInitial` 1100 → **prixFinal 800** (pas 300) + explication « remplace le prix » (FR-047, US10 Independent Test)
3. Remise `pourcentage` 15 sur 1100 → 935 (FR-047)
4. Remise inexistante → « Remise introuvable » verbatim (FR-050)
5. Connecter `comptable` → bouton de création masqué mais **prévisualisation accessible** (US10 SC6, FR-049)
6. **Frontière API/UI (FR-063)** : `grep -n "role\|useAuthStore" lib/api/tarification.ts` → **0 occurrence** ; `applyDiscount` reste appelable par tout rôle authentifié (utilisable par `receptionist` depuis le module Réservations, hors scope)
7. **Attendu** : aucun bouton édition/suppression de remise (aucun endpoint PATCH/DELETE documenté — FR-051)

### S10 — Packages avec ventilation (US11, FR-052..057)

1. Créer « Package Romance » 3600 DH ventilé 2000/600/400 (total 3000 ≠ 3600) → **blocage client** immédiat avec « La ventilation (X DH) ne correspond pas au prix global (Y DH) » (FR-054, SC-006)
2. Corriger le total à 3600 → création transactionnelle réussie (FR-053)
3. Erreur 400 échappée → message exact verbatim (FR-055) ; seuls les 5 postes documentés proposés (FR-056)
4. **Attendu** : aucun bouton édition/suppression de package (FR-057)

### S11 — Absence de mocks (FR-064..068, SC-003)

1. `grep -rn "MOCK_TARIFS\|MOCK_EXTRAS\|MOCK_FISCALITE" lib/ app/ components/ types/` → aucune occurrence
2. `grep -rn "return MOCK_TARIFS" lib/api/tarification.ts` → aucune occurrence
3. `grep -rn "Oct–Mars\|DP +220\|PC +420" app/ components/` → aucune occurrence
4. `grep -n "USE_MOCKS" lib/api/tarification.ts` → aucune occurrence
5. `grep -rn "TarifCategory\|FiscaliteItem" app/ components/ types/ lib/` → aucune occurrence (types backend en place, FR-067)
6. Vérifier que tous les appels de `lib/api/tarification.ts` passent par `apiClient` avec préfixe `/api/tarification/...` (FR-068)

### S12 — Aperçu sans effet de bord (FR-001..004, SC-004)

1. Ce module n'implémente pas d'écran d'aperçu : vérifier par grep qu'**aucun** appel à `rates/calculate` n'existe dans les pages/composants du module
2. `grep -rn "rates/calculate" app/tarification/ components/tarification/ lib/api/tarification.ts` → aucune occurrence (l'aperçu « Estimation » appartient au module Réservations, Q7)
3. Vérifier que les seules fonctions de calcul utilisables sans effet de bord sont exposées : `applyDiscount`, `calculateTaxes` (+ `getRatePlans`, `getRegimes`, `getExtraCategories` pour la lecture)

## Références

- [Spec](../spec.md)
- [API Contracts](./contracts/api-contracts.md)
- [Component Contracts](./contracts/component-contracts.md)
- [Data Model](./data-model.md)
- [Research](./research.md)
