# Data Model — Module Tarification

**Feature**: `/specs/005-tarification-frontend/spec.md`
**Date**: 2026-07-31
**Source du contrat**: `docs/service-tarification.md` §5 (réponses 200 et erreurs exactes), `docs/api-gateway.md` §3.6 (RBAC).

Tous les types ci-dessous sont ajoutés/alignés dans `types/index.ts` (FR-067). Les montants backend sont retournés en **chaînes DECIMAL** (`"900.00"`) : `prixTTC`, `supplementDH`, `montantTS`, `montantTPT`, `prixNetDH`, `prixDH`, `valeur`, `prixGlobalDH`, `montantDH`. L'UI les parse pour l'affichage et la saisie ; les payloads de création/modification envoient des **nombres**. Les ENUM sont **case-sensitive** (service-tarification.md §7.10). Le mapping backend→frontend vit dans `lib/api/tarification.ts`, jamais dans les composants (constitution §III).

## Entités

### Season (service-tarification.md §5.1)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `nom` | `SeasonName` | `nom` | ENUM `basse \| moyenne \| haute \| pics` — c'est le **libellé de colonne** de la matrice (FR-009/010), jamais hardcodé |
| `dateDebut` | `string` (YYYY-MM-DD) | `dateDebut` | |
| `dateFin` | `string` (YYYY-MM-DD) | `dateFin` | |

**Validation client** (FR-011/012/014) : création — `nom`, `dateDebut`, `dateFin` obligatoires et `dateDebut ≤ dateFin` ; modification — **au moins un** de `dateDebut`/`dateFin` fourni. Le chevauchement est validé **côté serveur uniquement** (409, §7.6) — jamais dupliqué côté client.

### RatePlan (service-tarification.md §5.2)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `categorie` | `RoomCategory` | `categorie` | ENUM `standard \| superieure \| suite \| suite_deluxe \| lodge \| villa` |
| `prixTTC` | `string` | `prixTTC` | DECIMAL — parse à l'affichage (DH) |
| `seasonId` | `number` | `seasonId` | |
| `season` | `Season` | `Season` (imbriqué) | Le mapping de la matrice utilise `Season.nom` pour les colonnes |

**Upsert batch** (§5.2, §7.5) : body `{ nomSaison: prix }` — clés = noms exacts de saisons ; seules les saisons existantes avec prix **non-nul/non-vide** sont envoyées (les inconnues/`null` sont ignorées par le backend). Réponse : `{ message: "Tarifs mis à jour", updated: [{ season, affected }] }` (FR-019/020).

### RegimeSupplement (service-tarification.md §5.3)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `regime` | `Regime` | `regime` | ENUM `BB \| DP \| PC` |
| `supplementDH` | `string` | `supplementDH` | DECIMAL — **BB toujours 0,00 DH et non éditable** (règle métier, FR-022) |
| `seasonId` | `number` | `seasonId` | |
| `season` | `Season` | `Season` (imbriqué) | |

### LocalTax (service-tarification.md §5.4)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `categorieHotel` | `HotelCategory` | `categorieHotel` | ENUM `1_etoile \| 2_etoiles \| 3_etoiles \| 4_etoiles \| 5_etoiles \| riad \| maison_hotes` |
| `montantTS` | `string` | `montantTS` | Taxe de Séjour, DH/pers/nuit |
| `montantTPT` | `string` | `montantTPT` | Taxe Promotion Touristique, DH/pers/nuit |

### Partner (service-tarification.md §5.5)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `nom` | `string` | `nom` | |
| `type` | `PartnerType` | `type` | ENUM `agence_voyage \| tour_operateur \| societe` |
| `email` | `string \| null` | `email` | |
| `telephone` | `string \| null` | `telephone` | |
| `actif` | `boolean` | `actif` | Défaut `true` à la création |

### PartnerRate (service-tarification.md §5.6)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `categorie` | `RoomCategory` | `categorie` | |
| `prixNetDH` | `string` | `prixNetDH` | DECIMAL — tarif négocié prioritaire dans le calcul final si `partnerId` fourni (§5.10) |
| `partnerId` | `number` | `partnerId` | |
| `seasonId` | `number` | `seasonId` | |
| `partner` | `Partner` | `Partner` (imbriqué) | |
| `season` | `Season` | `Season` (imbriqué) | |

### ExtraCategory (service-tarification.md §5.7)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `nom` | `ExtraCategoryName` | `nom` | ENUM `restaurant \| bar_boissons \| spa \| activites \| transferts \| services` |
| `items` | `ExtraItem[]` | `ExtraItems` (imbriqué) | |

> `EXTRA_COLORS`/`EXTRA_ICONS` (`lib/api/tarification.ts`) sont conservés comme **mapping de présentation uniquement** (assumption spec) — ils ne contiennent ni nom ni prix métier.

### ExtraItem (service-tarification.md §5.7)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `nom` | `string` | `nom` | |
| `prixDH` | `string` | `prixDH` | DECIMAL — parse à l'affichage (DH) |
| `tauxTVA` | `'10' \| '20'` | `tauxTVA` | **string strictement `"10"` ou `"20"`** (ENUM backend) |
| `actif` | `boolean` | `actif` | |
| `categoryId` | `number` | `categoryId` | |

**Validation client** (FR-042/043) : `prixDH` nombre valide et `tauxTVA` strictement 10 ou 20 **avant** soumission (SC-006). Dérogation Q6 : le 404 backend « Catégorie introuvable » (caractère corrompu, §5.7) est normalisé en « Catégorie introuvable » propre (FR-044).

### Discount (service-tarification.md §5.8)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `nom` | `string` | `nom` | |
| `type` | `DiscountType` | `type` | ENUM `pourcentage \| valeur_fixe` |
| `valeur` | `string` | `valeur` | `pourcentage` : % (ex: 15 = 15 %) ; `valeur_fixe` : **nouveau prix** (remplace, pas déduit — §7.4, FR-047) |
| `actif` | `boolean` | `actif` | Défaut `true` |

### DiscountApplyResult (service-tarification.md §5.8, POST /api/discounts/apply)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `prixInitial` | `number` | `prixInitial` | |
| `discount` | `string` | `discount` | Nom de la remise |
| `type` | `DiscountType` | `type` | |
| `prixFinal` | `string` | `prixFinal` | DECIMAL |

**Règle de calcul** (§5.8) : `pourcentage` → `prixFinal = prixInitial − (prixInitial × valeur / 100)` ; `valeur_fixe` → `prixFinal = valeur` (ex: 800 sur 1100 → 800, pas 300 — FR-047). **Accessible à tout rôle authentifié** (FR-049/063, R4 research) — aucun conditionnement par rôle dans la couche API.

### PackageOffer & PackageBreakdown (service-tarification.md §5.9)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `number` | `id` | |
| `nom` | `string` | `nom` | |
| `prixGlobalDH` | `string` | `prixGlobalDH` | DECIMAL |
| `actif` | `boolean` | `actif` | |
| `breakdowns` | `PackageBreakdown[]` | `PackageBreakdowns` (imbriqué) | |

`PackageBreakdown` : `id: number`, `poste: BreakdownPoste` (ENUM `hebergement \| restaurant \| spa \| activites \| autre`), `montantDH: string`, `packageId: number`.

**Validation client** (FR-054/056, SC-006) : somme des `montantDH` = `prixGlobalDH` **exactement**, avant soumission ; message au format backend « La ventilation (X DH) ne correspond pas au prix global (Y DH) ». Seuls les 5 postes documentés sont proposés.

## Réponses agrégées / payloads de création

| Action | Body / réponse notable |
|---|---|
| Créer une saison | `{nom, dateDebut, dateFin}` → 201 |
| Modifier une saison | `{dateDebut?, dateFin?}` (≥ 1 champ) → 200 objet Season |
| Créer un tarif | `{categorie, prixTTC, seasonId}` → 201 |
| Modifier un tarif | `{prixTTC}` → 200 |
| Upsert batch catégorie | `{nomSaison: prix}` → `{message, updated: [{season, affected}]}` |
| Créer un régime | `{regime, supplementDH, seasonId}` → 201 |
| Créer une taxe | `{categorieHotel, montantTS, montantTPT}` → 201 |
| Simulateur taxes | `GET .../taxes/calculate?categorieHotel&pax&nights` → `{categorieHotel, pax, nights, detail, totalTS, totalTPT, totalTaxes}` |
| Créer un partenaire | `{nom, type, email?, telephone?}` → 201 (actif: true) |
| Modifier un partenaire | PATCH `{nom?, type?, email?, telephone?, actif?}` → 200 |
| Créer un tarif négocié | `{categorie, prixNetDH, partnerId, seasonId}` → 201 |
| Créer une catégorie extra | `{nom}` → 201 |
| Créer un item extra | `{nom, prixDH, categoryId, tauxTVA}` → 201 |
| Modifier un item extra | PATCH `{prixDH?, actif?, tauxTVA?}` → 200 |
| Créer une remise | `{nom, type, valeur}` → 201 (actif: true) |
| Appliquer une remise | `{discountId, prixInitial}` → 200 `DiscountApplyResult` |
| Créer un package | `{nom, prixGlobalDH, breakdown: [{poste, montantDH}]}` → 201 (transactionnel) |

## Règles de validation (frontend, avant envoi API)

1. **Saison** : création — 3 champs obligatoires + `dateDebut ≤ dateFin` (FR-011) ; modification — ≥ 1 champ (FR-012). Chevauchement : **jamais** validé côté client (FR-014, 409 backend verbatim).
2. **Grille tarifaire** : batch — seules les saisons existantes avec prix non-nul/non-vide envoyées ; casse ENUM exacte (`standard`, jamais `Standard` — FR-019, SC-008).
3. **Régime** : ligne `BB` figée à 0,00 DH, non éditable (FR-022).
4. **Item extra** : `prixDH` nombre valide ; `tauxTVA` strictement `10` ou `20` (FR-042/043, SC-006).
5. **Package** : Σ `breakdown.montantDH` === `prixGlobalDH` (FR-054, SC-006).
6. **Simulateur taxes** : `categorieHotel`, `pax`, `nights` requis (FR-029).

## Frontières contractuelles (ni données ni fonctions de ce module)

- `GET /api/tarification/rates/calculate` : **jamais** appelé pour un affichage/aperçu (écrit des FolioItems, FR-002/003/005). L'invocation à la confirmation de booking relève du module Réservations (Q7). Aucune fonction de calcul final n'est implémentée dans `lib/api/tarification.ts`.
- Remises et packages : **aucun** endpoint PATCH/DELETE documenté — l'UI ne propose ni édition ni suppression (FR-051/057).
- Partenaires : aucun endpoint DELETE — pas d'action de suppression (FR-035/036).
- `applyDiscount` : couche API sans rôle (R4) ; l'UI de l'onglet Remises est soumise à la restriction Q2.

## Types supprimés

`TarifCategory`, `ExtraItem` (ancien `{name, price}`), `ExtraCategory` (ancien `{cat, color, icon, items}`), `FiscaliteItem` — remplacés par les types ci-dessus (FR-067).

## Types conservés (inchangés)

`UserRole`, `User`, `AuthState`, `LoginResponse`, `RoomCategory` (réutilisé pour `RatePlan.categorie`/`PartnerRate.categorie`), types Night Audit / Analytics / Front Office / Réservations, `Client`.
