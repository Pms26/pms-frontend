# Component Contracts — Module Tarification

**Date**: 2026-07-31 | **Constitution**: IV (react-query inline), V (design system custom), II (rôle via `useAuthStore`).

## Structure de page

`app/tarification/page.tsx` — page unique avec 7 onglets `fo-tabs`/`fo-tab` :

| Onglet | Composant (si extrait) | FR | Query keys |
|---|---|---|---|
| Grille tarifaire | `TariffGrid.tsx` | FR-009..020 | `['tarification', 'seasons']`, `['tarification', 'rateplans']` |
| Régimes | `RegimeMatrix.tsx` | FR-021..025 | `['tarification', 'regimes']` |
| Taxes locales | `TaxConfig.tsx` | FR-026..032 | `['tarification', 'taxes']` (simulateur : clé locale au composant) |
| Partenaires | `PartnersTab.tsx` | FR-033..038 | `['tarification', 'partners']`, `['tarification', 'partners', partnerId, 'rates']` |
| Extras & POS | `ExtrasTab.tsx` | FR-039..045 | `['tarification', 'extra-categories']` |
| Remises | `DiscountsTab.tsx` | FR-046..051 | `['tarification', 'discounts']` (prévisualisation : mutation) |
| Packages | `PackagesTab.tsx` | FR-052..057 | `['tarification', 'packages']` |

> Les composants sont extraits dans `components/tarification/` si un onglet dépasse ~300 lignes (décision d'implémentation, pas un contrat). L'onglet « Fiscalité » existant est renommé « Taxes locales ».

## Matrice de rendu par rôle (useAuthStore, FR-058..062)

Accès middleware : `/tarification` → `['admin', 'manager', 'comptable']`. Sidebar : lien masqué pour `receptionist` et `housekeeping_supervisor`.

| Rôle | Lecture (tous onglets) | Boutons création/modification | Prévisualisation remise (onglet Remises) |
|---|---|---|---|
| admin | ✅ | ✅ (tous) | ✅ |
| manager | ✅ | ✅ (tous) | ✅ |
| comptable | ✅ | ❌ (aucun — lecture seule, FR-061) | ✅ (lecture seule : saisie prixInitial + affichage du résultat) |
| receptionist | ❌ (middleware → redirigé) | — | — (hors module ; appelle `applyDiscount` depuis Réservations) |
| housekeeping_supervisor | ❌ (middleware → redirigé) | — | — |

**Frontière API/UI (FR-049/063)** :
- UI : le bouton de prévisualisation (appel `applyDiscount`) est rendu pour les rôles Q2 via `useAuthStore` — garde-fou au niveau composant, jamais dans la couche API.
- API : `applyDiscount` dans `lib/api/tarification.ts` est **sans rôle** — grep de non-régression : `grep -n "role\|useAuthStore" lib/api/tarification.ts` doit retourner 0 occurrence.
- Le comptable peut prévisualiser (route de calcul ouverte à tout rôle authentifié — FR-049, US10 SC6) : le bouton est affiché, seule la création de remise est masquée.

## États par vue (pattern react-query inline, constitution IV)

Chaque bloc de données respecte : `isLoading` → spinner/skeleton design system ; `isError` → affichage de `error.message` (normalisé dans la couche API : message métier exact ou « Service temporairement indisponible ») ; données vides → message d'état vide explicite (Edge Cases spec) ; sinon → contenu. Pas de `loading.tsx`/`error.tsx` (constitution, point non-négociable n°7).

## Règles de prévisualisation & simulation (sans effet de bord)

- Aucun appel à `GET /api/tarification/rates/calculate` dans ce module (FR-002) — absent de tous les chemins d'aperçu (vérifiable par grep en phase d'implémentation).
- Le simulateur de taxes (`taxes/calculate`) et la prévisualisation de remise (`discounts/apply`) sont des calculs purs, sans écriture : utilisables librement (FR-029/032/049).
- Tout total assemblé côté client est étiqueté **« Estimation »** (FR-004). Si grille/régimes non chargés → « Estimation indisponible » plutôt qu'un prix faux (Edge Cases).
- Distinction `taxeMode` expliquée dans le simulateur (FR-031) : `payable_a_la_reservation` (défaut) → taxes incluses ; `sur_place` → taxes exclues du total + note « Les taxes locales sont exclues de ce total et seront ajoutées aux extras au check-out ».

## Affichage des montants

Montants backend en chaînes DECIMAL (`"900.00"`) → parse à l'affichage (DH, arrondi 2 décimales). La ligne BB des régimes est toujours `0,00 DH` et non éditable (FR-022). `valeur_fixe` : explication explicite « remplace le prix » (ex: 800 sur 1100 → 800, pas 300) (FR-047). Aucune valeur brute incohérente affichée (Edge Cases).

## Validations client (blocage avant envoi API, SC-006)

| Vue | Validation |
|---|---|
| Saisons | création : `nom` + `dateDebut` + `dateFin` obligatoires, `dateDebut ≤ dateFin` ; modification : ≥ 1 champ (FR-011/012) |
| Grille (batch) | seules saisons existantes + prix non-nul/non-vide envoyés ; casse ENUM exacte (FR-019) |
| Extras | `prixDH` nombre valide ; `tauxTVA` strictement `10` ou `20` (FR-042/043) |
| Packages | Σ ventilation === prix global, message format backend (FR-054) |
| Simulateur taxes | `categorieHotel`, `pax`, `nights` requis (FR-029) |

## Erreurs affichées verbatim

Toutes les erreurs documentées de `contracts/api-contracts.md` (400/404/409) sont affichées textuellement (FR-013/044/050, SC-007). Dérogation Q6 : seul « Catégorie introuvable » (backend corrompu) est normalisé en chaîne propre. 502/infrastructure → « Service temporairement indisponible » (Edge Cases).
