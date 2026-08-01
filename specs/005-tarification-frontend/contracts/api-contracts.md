# Contracts API — Module Tarification

**Source**: `docs/service-tarification.md` §2/§5 (backend tarification 4004) + `docs/api-gateway.md` §2/§3.6/§4.5.
**Convention**: tous les appels passent par `apiClient` (lib/api/client.ts) avec le préfixe gateway `/api/tarification`, réécrit par le gateway en `/api` vers le port 4004. Corps d'erreur du backend : `{ "message": "<texte>" }` (le gateway renvoie `{ "error": "<texte>" }` pour ses propres erreurs).
**Normalisation d'erreur (frontend, R2 research)** : 502 → « Service temporairement indisponible » ; sinon `message`/`error` exact du body ; réseau/hors réponse → « Service temporairement indisponible ». Dérogation Q6 : « Catégorie introuvable » reçu avec caractère corrompu → normalisé en « Catégorie introuvable » propre.
**Rôles (gateway RBAC, api-gateway.md §3.6)** : écritures `/api/tarification/*` → `admin`, `manager` ; `POST /api/tarification/discounts/apply` → **aucune restriction** (tout utilisateur authentifié). Routes GET → aucune restriction (tout JWT valide).

---

## 1. Saisons

### GET `/api/tarification/seasons` — Liste des saisons
Réponse 200 : `Season[]` (voir data-model.md). Les `nom` exacts (`basse|moyenne|haute|pics`) pilotent les colonnes de la matrice (FR-009/010).

### POST `/api/tarification/seasons` — Créer une saison (admin/manager)
Body : `{ "nom": "basse", "dateDebut": "2026-01-01", "dateFin": "2026-03-31" }` → 201 objet Season.
Erreurs (verbatim) : 400/409 du backend selon champs/chevauchement.

### PUT `/api/tarification/seasons/:category` — Modifier les dates (admin/manager) ⚠️ GATE CORS/PUT (Étape 0)
`:category` = `nom` exact (ex: `basse`). Body : `{ "dateDebut"?, "dateFin"? }` — ≥ 1 champ (validation client FR-012).
Réponse 200 : objet Season.
Erreurs (verbatim, FR-013) :
| Code | Body |
|---|---|
| 400 | `{ "message": "Au moins dateDebut ou dateFin doit être fourni" }` |
| 400 | `{ "message": "dateDebut doit être antérieure ou égale à dateFin" }` |
| 404 | `{ "message": "Saison introuvable" }` |
| 409 | `{ "message": "Les dates chevauchent la saison \"...\" (... - ...)" }` |
> Vérification préflight CORS avant implémentation (research R3). Si bloqué → repli PATCH body équivalent (B2) + correctif gateway (B1).

## 2. Grille tarifaire (RatePlans)

### GET `/api/tarification/rateplans` — Liste des tarifs
Réponse 200 : `RatePlan[]` (champs `categorie`, `prixTTC`, `seasonId`, `Season` imbriqué).

### POST `/api/tarification/rateplans` — Créer un tarif (admin/manager)
Body : `{ "categorie": "standard", "prixTTC": 900, "seasonId": 1 }` → 201. Erreur : 404 `{ "message": "Saison introuvable" }`.

### PATCH `/api/tarification/rateplans/:id` — Modifier un prix (admin/manager)
Body : `{ "prixTTC": 950 }` → 200. Erreur : 404 `{ "message": "Tarif introuvable" }`.

### PUT `/api/tarification/rateplans/category/:categorie` — Upsert batch par catégorie (admin/manager) ⚠️ GATE CORS/PUT (Étape 0)
`:categorie` = ENUM exact. Body : `{ "basse": 900, "moyenne": 1100, "haute": 1400, "pics": 1800 }` (clés = noms de saisons, seules existantes avec prix non-nul envoyées).
Réponse 200 : `{ "message": "Tarifs mis à jour", "updated": [{ "season": "basse", "affected": 1 }] }` (FR-020).
> Même gate CORS que §1 (research R3).

## 3. Régimes

### GET `/api/tarification/regimes` — Liste des suppléments
Réponse 200 : `RegimeSupplement[]` (`regime`, `supplementDH`, `seasonId`, `Season`).

### POST `/api/tarification/regimes` — Créer un supplément (admin/manager)
Body : `{ "regime": "DP", "supplementDH": 220, "seasonId": 1 }` → 201. Erreur : 404 `{ "message": "Saison introuvable" }`.

### PATCH `/api/tarification/regimes/:id` — Modifier le montant (admin/manager)
Body : `{ "supplementDH": 250 }` → 200. Erreur : 404 `{ "message": "Supplément introuvable" }`.

## 4. Taxes locales

### GET `/api/tarification/taxes` — Liste des taxes
Réponse 200 : `LocalTax[]` (`categorieHotel`, `montantTS`, `montantTPT`).

### POST `/api/tarification/taxes` — Configurer (admin/manager)
Body : `{ "categorieHotel": "3_etoiles", "montantTS": 25, "montantTPT": 5 }` → 201.

### PATCH `/api/tarification/taxes/:id` — Modifier (admin/manager)
Body : `{ "montantTS"?, "montantTPT"? }` (≥ 1 champ) → 200. Erreur : 404 `{ "message": "Configuration introuvable" }`.

### GET `/api/tarification/taxes/calculate` — Simulateur (sans effet de bord, FR-029/032)
Query : `categorieHotel` (ENUM), `pax`, `nights` — les 3 requis (validation client).
Réponse 200 : `{ categorieHotel, pax, nights, detail: { montantTSParPaxParNuit, montantTPTParPaxParNuit }, totalTS, totalTPT, totalTaxes }`.
Erreurs (verbatim, FR-030) :
| Code | Body |
|---|---|
| 400 | `{ "message": "Paramètres requis : categorieHotel, pax (nombre de personnes), nights (nombre de nuits)" }` |
| 404 | `{ "message": "Aucune taxe configurée pour cette catégorie d'hôtel" }` |

## 5. Partenaires

### GET `/api/tarification/partners` — Liste
Réponse 200 : `Partner[]` (`nom`, `type`, `email`, `telephone`, `actif`). Filtre par type + recherche par nom (FR-034, côté client sur la liste chargée).

### POST `/api/tarification/partners` — Créer (admin/manager)
Body : `{ "nom", "type", "email"?, "telephone"? }` → 201 (`actif: true` défaut).

### PATCH `/api/tarification/partners/:id` — Modifier (admin/manager)
Body : `{ "nom"?, "type"?, "email"?, "telephone"?, "actif"? }` → 200. Erreur : 404 `{ "message": "Partenaire introuvable" }`.

## 6. Tarifs négociés

### GET `/api/tarification/partners/:partnerId/rates` — Matrice par partenaire
Réponse 200 : `PartnerRate[]` (`categorie`, `prixNetDH`, `partnerId`, `seasonId`, `Partner` + `Season`).

### POST `/api/tarification/partner-rates` — Créer un tarif négocié (admin/manager)
Body : `{ "categorie", "prixNetDH", "partnerId", "seasonId" }` → 201.
Erreurs (verbatim, FR-038) : 404 `{ "message": "Partenaire introuvable" }` ; 404 `{ "message": "Saison introuvable" }`.

## 7. Extras & POS

### GET `/api/tarification/extra-categories` — Catégories avec items
Réponse 200 : `ExtraCategory[]` (`nom`, `ExtraItems[]` imbriqué : `nom`, `prixDH`, `tauxTVA` "10"|"20", `actif`, `categoryId`).

### POST `/api/tarification/extra-categories` — Créer une catégorie (admin/manager)
Body : `{ "nom": "restaurant" }` → 201.

### POST `/api/tarification/extra-items` — Créer un item (admin/manager)
Body : `{ "nom", "prixDH", "categoryId", "tauxTVA" }`. Validation client AVANT soumission : `prixDH` nombre valide, `tauxTVA` strictement 10/20 (FR-042, SC-006).
Erreurs (verbatim, FR-044) : 400 `{ "message": "prixDH requis et doit être un nombre valide" }` ; 400 `{ "message": "tauxTVA requis et doit être 10 ou 20" }` ; 404 « Catégorie introuvable » (normalisé, Q6).

### PATCH `/api/tarification/extra-items/:id` — Modifier (admin/manager)
Body : `{ "prixDH"?, "actif"?, "tauxTVA"? }` (mêmes validations sur champs fournis).
Erreurs (verbatim) : 400 `{ "message": "prixDH doit être un nombre valide" }` ; 400 `{ "message": "tauxTVA doit être 10 ou 20" }` ; 404 `{ "message": "Item introuvable" }`.

## 8. Remises

### GET `/api/tarification/discounts` — Liste
Réponse 200 : `Discount[]` (`nom`, `type`, `valeur`, `actif`).

### POST `/api/tarification/discounts` — Créer (admin/manager)
Body : `{ "nom", "type", "valeur" }` → 201 (`actif: true` défaut).

### POST `/api/tarification/discounts/apply` — Prévisualisation (**tout rôle authentifié**, FR-049/063)
Body : `{ "discountId": 1, "prixInitial": 1100 }`.
Réponse 200 : `{ "prixInitial": 1100, "discount": "Remise fidélité", "type": "pourcentage", "prixFinal": "935.00" }`.
Logique (§5.8, §7.4) : `pourcentage` → `prixInitial − (prixInitial × valeur / 100)` ; `valeur_fixe` → `prixFinal = valeur` (le prix est remplacé, pas déduit — ex: 800 sur 1100 → 800).
Erreur : 404 `{ "message": "Remise introuvable" }` (verbatim, FR-050).
> **Frontière API/UI** : cette fonction n'est **jamais** conditionnée par rôle dans `lib/api/tarification.ts` (grep `role|useAuthStore` = 0 occurrence). Seul le bouton UI de prévisualisation de l'onglet Remises est réservé aux rôles Q2 (admin/manager/comptable) via `useAuthStore`. Le module Réservations peut l'appeler pour `receptionist` (hors scope, Q7).

## 9. Packages

### GET `/api/tarification/packages` — Liste
Réponse 200 : `PackageOffer[]` (`nom`, `prixGlobalDH`, `actif`, `PackageBreakdowns[]` : `poste`, `montantDH`, `packageId`).

### POST `/api/tarification/packages` — Créer (admin/manager, transactionnel)
Body : `{ "nom", "prixGlobalDH", "breakdown": [{ "poste": "hebergement", "montantDH": 2000 }] }`. Validation client : Σ `montantDH` === `prixGlobalDH` (FR-054, SC-006).
Erreur : 400 `{ "message": "La ventilation (X DH) ne correspond pas au prix global (Y DH)" }` (affiché aussi côté client si échappée, FR-055).

## 10. Frontière : calcul final (réservé module Réservations)

### GET `/api/tarification/rates/calculate` — ⚠️ Écrit des FolioItems (FR-002/005, §5.10/§7.1)
**Jamais appelé** par ce module (aucun chemin d'aperçu ni de page). Documenté pour la frontière contractuelle : paramètres `categorie|packageId`, `seasonId`, `regime`, `nights`, `partnerId?`, `discountId?`, `categorieHotel?/pax?`, `taxeMode?`, `extras` (JSON string encodé, FR-007). L'invocation à la confirmation de booking relève du module Réservations (Q7).
