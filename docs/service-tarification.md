# Documentation — service-tarification

---

## 1. Informations générales

| Champ                             | Valeur                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| **Nom du service**                | `service-tarification`                                       |
| **Port**                          | `4004` (variable d'env `PORT`, défaut `4004`) — `index.js:6` |
| **Préfixe de montage des routes** | `/api` — `src/app.js:9`                                      |
| **Framework**                     | Express.js v5.2.1                                            |
| **ORM**                           | Sequelize v6.37.8                                            |
| **Base de données**               | MySQL (Aiven Cloud) via `mysql2`                             |
| **Module system**                 | CommonJS (`"type": "commonjs"` dans `package.json`)          |
| **Autres dépendances**            | `cors`, `dotenv`, `jsonwebtoken`                             |

---

## 2. Endpoints exposés

Toutes les routes sont montées sous le préfixe `/api`. Le chemin complet est donc `/api/<chemin>`.

### Lecture (tous les rôles authentifiés)

| Méthode | Chemin exact                     | Rôles autorisés    | Middleware(s) | Description                                                           |
| ------- | -------------------------------- | ------------------ | ------------- | --------------------------------------------------------------------- |
| `GET`   | `/api/seasons`                   | Tous (authentifié) | `verifyToken` | Récupérer toutes les saisons                                          |
| `GET`   | `/api/rateplans`                 | Tous (authentifié) | `verifyToken` | Récupérer toute la grille tarifaire (avec saison incluse)             |
| `GET`   | `/api/regimes`                   | Tous (authentifié) | `verifyToken` | Récupérer tous les suppléments de régime (avec saison incluse)        |
| `GET`   | `/api/taxes`                     | Tous (authentifié) | `verifyToken` | Récupérer toutes les taxes locales configurées                        |
| `GET`   | `/api/taxes/calculate`           | Tous (authentifié) | `verifyToken` | Calculer le total des taxes pour un séjour (params query)             |
| `GET`   | `/api/partners`                  | Tous (authentifié) | `verifyToken` | Récupérer tous les partenaires                                        |
| `GET`   | `/api/partners/:partnerId/rates` | Tous (authentifié) | `verifyToken` | Récupérer les tarifs négociés d'un partenaire (avec partner + saison) |
| `GET`   | `/api/extra-categories`          | Tous (authentifié) | `verifyToken` | Récupérer toutes les catégories d'extras (avec items inclus)          |
| `GET`   | `/api/discounts`                 | Tous (authentifié) | `verifyToken` | Récupérer toutes les remises                                          |
| `GET`   | `/api/packages`                  | Tous (authentifié) | `verifyToken` | Récupérer tous les packages (avec breakdown inclus)                   |
| `GET`   | `/api/rates/calculate`           | Tous (authentifié) | `verifyToken` | Calcul complet du tarif d'un séjour (hébergement + extras + taxes)    |

### Écriture (admin/manager uniquement)

| Méthode | Chemin exact                         | Rôles autorisés    | Middleware(s)                                  | Description                                             |
| ------- | ------------------------------------ | ------------------ | ---------------------------------------------- | ------------------------------------------------------- |
| `POST`  | `/api/seasons`                       | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer une saison                                        |
| `PUT`   | `/api/seasons/:category`             | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Modifier les dates d'une saison (par nom)               |
| `POST`  | `/api/rateplans`                     | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer un tarif pour une catégorie + saison              |
| `PATCH` | `/api/rateplans/:id`                 | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Modifier le prix TTC d'un tarif existant                |
| `PUT`   | `/api/rateplans/category/:categorie` | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Mettre à jour tous les tarifs d'une catégorie (batch)   |
| `POST`  | `/api/regimes`                       | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer un supplément de régime                           |
| `PATCH` | `/api/regimes/:id`                   | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Modifier le supplément d'un régime                      |
| `POST`  | `/api/taxes`                         | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer/configurer une taxe locale                        |
| `PATCH` | `/api/taxes/:id`                     | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Modifier les montants d'une taxe locale                 |
| `POST`  | `/api/partners`                      | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer un partenaire                                     |
| `PATCH` | `/api/partners/:id`                  | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Modifier un partenaire                                  |
| `POST`  | `/api/partner-rates`                 | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer un tarif négocié pour un partenaire               |
| `POST`  | `/api/extra-categories`              | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer une catégorie d'extra                             |
| `POST`  | `/api/extra-items`                   | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer un item d'extra                                   |
| `PATCH` | `/api/extra-items/:id`               | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Modifier un item d'extra (prix, actif, taux TVA)        |
| `POST`  | `/api/discounts`                     | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer une remise                                        |
| `POST`  | `/api/discounts/apply`               | Tous (authentifié) | `verifyToken`                                  | Appliquer une remise à un prix (calcul, pas d'écriture) |
| `POST`  | `/api/packages`                      | `admin`, `manager` | `verifyToken`, `checkRole('admin', 'manager')` | Créer un package avec sa ventilation                    |

---

## 3. Authentification

| Champ                                | Valeur                                                      | Source                                   |
| ------------------------------------ | ----------------------------------------------------------- | ---------------------------------------- |
| **Header attendu**                   | `Authorization: Bearer <token>`                             | `src/middlewares/auth.middleware.js:4-5` |
| **Méthode d'extraction**             | `req.headers['authorization'].split(' ')[1]`                | `src/middlewares/auth.middleware.js:5`   |
| **Algorithme de vérification**       | Géré par `jsonwebtoken` (défaut HS256)                      | `src/middlewares/auth.middleware.js:9`   |
| **Clé de signature**                 | Variable d'env `JWT_SECRET`                                 | `src/middlewares/auth.middleware.js:11`  |
| **Issuer attendu**                   | Variable d'env `JWT_ISSUER` (défaut: `auth-service`)        | `src/middlewares/auth.middleware.js:13`  |
| **Audience attendue**                | Variable d'env `JWT_AUDIENCE` (défaut: `pms-microservices`) | `src/middlewares/auth.middleware.js:14`  |
| **Champ rôle dans le payload JWT**   | `decoded.role` (champ `role` directement)                   | `src/middlewares/auth.middleware.js:18`  |
| **Champ userId dans le payload JWT** | `decoded.sub` (subject standard JWT)                        | `src/middlewares/auth.middleware.js:18`  |

### Réponses d'erreur auth

| HTTP Status | Condition                | Body                                               |
| ----------- | ------------------------ | -------------------------------------------------- |
| `401`       | Token absent             | `{ "message": "Token manquant" }`                  |
| `403`       | Token invalide ou expiré | `{ "message": "Token invalide ou expiré" }`        |
| `403`       | Rôle insuffisant         | `{ "message": "Accès refusé — rôle insuffisant" }` |

---

## 4. Rôles et permissions

### Rôles utilisés dans ce service

| Rôle (string exacte, casse sensible) | Utilisé dans                                                   |
| ------------------------------------ | -------------------------------------------------------------- |
| `admin`                              | `checkRole('admin', 'manager')` — toutes les routes d'écriture |
| `manager`                            | `checkRole('admin', 'manager')` — toutes les routes d'écriture |

> **Note** : Il n'existe pas de rôle intermédiaire. Toute route GET est accessible à **tout rôle authentifié** (quel que soit la valeur de `role`), les routes d'écriture sont réservées à `admin` et `manager`.

### Matrice des accès

| Rôle                                                | Routes GET (lecture) | Routes POST/PUT/PATCH (écriture)                                               |
| --------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| Tout rôle authentifié                               | ✅ Toutes            | ❌ Sauf `POST /api/discounts/apply` qui est une route de **calcul** (GET-like) |
| `admin`                                             | ✅ Toutes            | ✅ Toutes                                                                      |
| `manager`                                           | ✅ Toutes            | ✅ Toutes                                                                      |
| Tout autre rôle (ex: `receptionist`, `housekeeper`) | ✅ Toutes            | ❌ Sauf `POST /api/discounts/apply`                                            |

> **Attention** : `POST /api/discounts/apply` (`src/routes/tarification.routes.js:46`) est une route POST mais n'a **PAS** de `checkRole` — elle est accessible à tout utilisateur authentifié. Elle effectue uniquement un calcul (aucune écriture en base).

---

## 5. Contrats de requête et réponse

### 5.1 Seasons

#### `GET /api/seasons`

**Réponse 200** :

```json
[
  {
    "id": 1,
    "nom": "basse",
    "dateDebut": "2026-01-01",
    "dateFin": "2026-03-31",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

- `nom` : ENUM — valeurs possibles : `"basse"`, `"moyenne"`, `"haute"`, `"pics"` — `src/models/Season.js:6`

#### `POST /api/seasons`

**Body attendu** :

```json
{
  "nom": "string (ENUM: basse|moyenne|haute|pics) — OBLIGATOIRE",
  "dateDebut": "string (DATEONLY: YYYY-MM-DD) — OBLIGATOIRE",
  "dateFin": "string (DATEONLY: YYYY-MM-DD) — OBLIGATOIRE"
}
```

- Source : `src/controllers/season.controller.js:14`
- **Réponse 201** : objet Season créé (même structure que GET)
- **Erreur 500** : `{ "message": "Erreur serveur", "error": "..." }`

#### `PUT /api/seasons/:category`

- `:category` = le champ `nom` de la saison (ex: `basse`)
- **Body attendu** :

```json
{
  "dateDebut": "string (optionnel)",
  "dateFin": "string (optionnel)"
}
```

- Source : `src/controllers/season.controller.js:25`
- **Au moins un des deux champs doit être fourni** — sinon 400
- **Validation** : `dateDebut` doit être ≤ `dateFin` — sinon 400
- **Validation** : les dates ne doivent pas chevaucher une autre saison existante — sinon 409
- **Réponse 200** : objet Season mis à jour
- **Erreurs possibles** :
  - `400` : `{ "message": "Au moins dateDebut ou dateFin doit être fourni" }`
  - `400` : `{ "message": "dateDebut doit être antérieure ou égale à dateFin" }`
  - `404` : `{ "message": "Saison introuvable" }`
  - `409` : `{ "message": "Les dates chevauchent la saison \"...\" (... - ...)" }`

---

### 5.2 RatePlans (Grille tarifaire)

#### `GET /api/rateplans`

**Réponse 200** :

```json
[
  {
    "id": 1,
    "categorie": "standard",
    "prixTTC": "900.00",
    "seasonId": 1,
    "createdAt": "...",
    "updatedAt": "...",
    "Season": {
      "id": 1,
      "nom": "basse",
      "dateDebut": "2026-01-01",
      "dateFin": "2026-03-31",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
]
```

- `categorie` : ENUM — `"standard"`, `"superieure"`, `"suite"`, `"suite_deluxe"`, `"lodge"`, `"villa"` — `src/models/RatePlan.js:7`
- La saison est incluse grâce à `include: Season` — `src/controllers/rateplan.controller.js:8`

#### `POST /api/rateplans`

**Body attendu** :

```json
{
  "categorie": "string (ENUM obligatoire) — voir ci-dessus",
  "prixTTC": "number (DECIMAL 10,2) — OBLIGATOIRE",
  "seasonId": "integer — OBLIGATOIRE"
}
```

- Source : `src/controllers/rateplan.controller.js:19`
- **Validation** : la saison (`seasonId`) doit exister — sinon 404
- **Réponse 201** : objet RatePlan créé
- **Erreurs possibles** :
  - `404` : `{ "message": "Saison introuvable" }`

#### `PATCH /api/rateplans/:id`

**Body attendu** :

```json
{
  "prixTTC": "number — OBLIGATOIRE"
}
```

- Source : `src/controllers/rateplan.controller.js:34-39`
- **Réponse 200** : objet RatePlan mis à jour
- **Erreurs possibles** :
  - `404` : `{ "message": "Tarif introuvable" }`

#### `PUT /api/rateplans/category/:categorie`

- `:categorie` = nom de la catégorie (ex: `standard`)
- **Body attendu** : objet JSON clé=valeur nom de saison → prix

```json
{
  "basse": 900,
  "moyenne": 1100,
  "haute": 1400,
  "pics": 1800
}
```

- Source : `src/controllers/rateplan.controller.js:51`
- Les clés sont les noms de saisons (insensible à la casse). Seules les saisons existantes et les valeurs non-null sont traitées.
- **Réponse 200** :

```json
{
  "message": "Tarifs mis à jour",
  "updated": [
    { "season": "basse", "affected": 1 },
    { "season": "moyenne", "affected": 1 }
  ]
}
```

---

### 5.3 RegimeSupplements (Suppléments de régime)

#### `GET /api/regimes`

**Réponse 200** :

```json
[
  {
    "id": 1,
    "regime": "BB",
    "supplementDH": "0.00",
    "seasonId": 1,
    "createdAt": "...",
    "updatedAt": "...",
    "Season": { ... }
  }
]
```

- `regime` : ENUM — `"BB"`, `"DP"`, `"PC"` — `src/models/RegimeSupplement.js:7`

#### `POST /api/regimes`

**Body attendu** :

```json
{
  "regime": "string (ENUM: BB|DP|PC) — OBLIGATOIRE",
  "supplementDH": "number (DECIMAL 10,2) — OBLIGATOIRE",
  "seasonId": "integer — OBLIGATOIRE"
}
```

- Source : `src/controllers/regime.controller.js:19`
- **Validation** : la saison doit exister — sinon 404
- **Réponse 201** : objet RegimeSupplement créé

#### `PATCH /api/regimes/:id`

**Body attendu** :

```json
{
  "supplementDH": "number — OBLIGATOIRE"
}
```

- Source : `src/controllers/regime.controller.js:34`
- **Réponse 200** : objet mis à jour
- **404** : `{ "message": "Supplément introuvable" }`

---

### 5.4 LocalTaxes (Taxes locales)

#### `GET /api/taxes`

**Réponse 200** :

```json
[
  {
    "id": 1,
    "categorieHotel": "3_etoiles",
    "montantTS": "25.00",
    "montantTPT": "5.00",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

- `categorieHotel` : ENUM — `"1_etoile"`, `"2_etoiles"`, `"3_etoiles"`, `"4_etoiles"`, `"5_etoiles"`, `"riad"`, `"maison_hotes"` — `src/models/LocalTax.js:6`

#### `POST /api/taxes`

**Body attendu** :

```json
{
  "categorieHotel": "string (ENUM obligatoire) — voir ci-dessus",
  "montantTS": "number (DECIMAL 10,2) — OBLIGATOIRE",
  "montantTPT": "number (DECIMAL 10,2) — OBLIGATOIRE"
}
```

- Source : `src/controllers/localtax.controller.js:16`
- `montantTS` = Taxe de Séjour (DH/pers/nuit), `montantTPT` = Taxe Promotion Touristique (DH/pers/nuit)
- **Réponse 201** : objet LocalTax créé

#### `PATCH /api/taxes/:id`

**Body attendu** :

```json
{
  "montantTS": "number (optionnel)",
  "montantTPT": "number (optionnel)"
}
```

- Source : `src/controllers/localtax.controller.js:27`
- Les champs sont optionnels mais au moins un doit être fourni (sinon rien ne change)
- **Réponse 200** : objet mis à jour
- **404** : `{ "message": "Configuration introuvable" }`

#### `GET /api/taxes/calculate`

**Paramètres de requête (query string)** :
| Param | Type | Obligatoire | Description |
|---|---|---|---|
| `categorieHotel` | string | ✅ | Catégorie d'hôtel (ENUM) |
| `pax` | integer | ✅ | Nombre de personnes |
| `nights` | integer | ✅ | Nombre de nuits |

- Source : `src/controllers/localtax.controller.js:43`
- **Réponse 200** :

```json
{
  "categorieHotel": "3_etoiles",
  "pax": 2,
  "nights": 5,
  "detail": {
    "montantTSParPaxParNuit": "25.00",
    "montantTPTParPaxParNuit": "5.00"
  },
  "totalTS": "250.00",
  "totalTPT": "50.00",
  "totalTaxes": "300.00"
}
```

- **Erreurs possibles** :
  - `400` : `{ "message": "Paramètres requis : categorieHotel, pax (nombre de personnes), nights (nombre de nuits)" }`
  - `404` : `{ "message": "Aucune taxe configurée pour cette catégorie d'hôtel" }`

---

### 5.5 Partners (Partenaires)

#### `GET /api/partners`

**Réponse 200** :

```json
[
  {
    "id": 1,
    "nom": "TripAdvisor",
    "type": "agence_voyage",
    "email": "contact@tripadvisor.com",
    "telephone": "+212...",
    "actif": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

- `type` : ENUM — `"agence_voyage"`, `"tour_operateur"`, `"societe"` — `src/models/Partner.js:7`
- `actif` : BOOLEAN, défaut `true`

#### `POST /api/partners`

**Body attendu** :

```json
{
  "nom": "string — OBLIGATOIRE",
  "type": "string (ENUM: agence_voyage|tour_operateur|societe) — OBLIGATOIRE",
  "email": "string — optionnel",
  "telephone": "string — optionnel"
}
```

- Source : `src/controllers/partner.controller.js:14`
- **Réponse 201** : objet Partner créé (avec `actif: true` par défaut)

#### `PATCH /api/partners/:id`

**Body attendu** (tous les champs optionnels) :

```json
{
  "nom": "string",
  "type": "string (ENUM)",
  "email": "string",
  "telephone": "string",
  "actif": "boolean"
}
```

- Source : `src/controllers/partner.controller.js:27-32`
- **Réponse 200** : objet Partner mis à jour
- **404** : `{ "message": "Partenaire introuvable" }`

---

### 5.6 PartnerRates (Tarifs négociés)

#### `GET /api/partners/:partnerId/rates`

**Réponse 200** :

```json
[
  {
    "id": 1,
    "categorie": "standard",
    "prixNetDH": "800.00",
    "partnerId": 1,
    "seasonId": 1,
    "createdAt": "...",
    "updatedAt": "...",
    "Partner": { ... },
    "Season": { ... }
  }
]
```

- Inclut les objets `Partner` et `Season` — `src/controllers/partnerrate.controller.js:10`

#### `POST /api/partner-rates`

**Body attendu** :

```json
{
  "categorie": "string (ENUM: standard|superieure|suite|suite_deluxe|lodge|villa) — OBLIGATOIRE",
  "prixNetDH": "number (DECIMAL 10,2) — OBLIGATOIRE",
  "partnerId": "integer — OBLIGATOIRE",
  "seasonId": "integer — OBLIGATOIRE"
}
```

- Source : `src/controllers/partnerrate.controller.js:21`
- **Validations** : le partenaire et la saison doivent exister — sinon 404
- **Réponse 201** : objet PartnerRate créé
- **Erreurs possibles** :
  - `404` : `{ "message": "Partenaire introuvable" }`
  - `404` : `{ "message": "Saison introuvable" }`

---

### 5.7 ExtraCategories & ExtraItems

#### `GET /api/extra-categories`

**Réponse 200** :

```json
[
  {
    "id": 1,
    "nom": "restaurant",
    "createdAt": "...",
    "updatedAt": "...",
    "ExtraItems": [
      {
        "id": 1,
        "nom": "Tajine poulet",
        "prixDH": "120.00",
        "tauxTVA": "10",
        "actif": true,
        "categoryId": 1,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
]
```

- `ExtraCategory.nom` : ENUM — `"restaurant"`, `"bar_boissons"`, `"spa"`, `"activites"`, `"transferts"`, `"services"` — `src/models/ExtraCategory.js:6`
- `ExtraItem.tauxTVA` : ENUM string `"10"` ou `"20"` — `src/models/ExtraItem.js:15`

#### `POST /api/extra-categories`

**Body attendu** :

```json
{
  "nom": "string (ENUM obligatoire) — voir ci-dessus"
}
```

- Source : `src/controllers/extra.controller.js:39`
- **Réponse 201** : objet ExtraCategory créé

#### `POST /api/extra-items`

**Body attendu** :

```json
{
  "nom": "string — OBLIGATOIRE",
  "prixDH": "number — OBLIGATOIRE (doit être un nombre valide)",
  "categoryId": "integer — OBLIGATOIRE",
  "tauxTVA": "number — OBLIGATOIRE (doit être 10 ou 20)"
}
```

- Source : `src/controllers/extra.controller.js:50`
- **Validations** :
  - La catégorie (`categoryId`) doit exister → 404 sinon
  - `prixDH` doit être un nombre valide → 400 sinon
  - `tauxTVA` doit être `10` ou `20` → 400 sinon
- **Réponse 201** : objet ExtraItem (avec prixDH et tauxTVA castés en float)
- **Erreurs possibles** :
  - `400` : `{ "message": "prixDH requis et doit être un nombre valide" }`
  - `400` : `{ "message": "tauxTVA requis et doit être 10 ou 20" }`
  - `404` : `{ "message": "Catégorie introuvable" }` _(note: le code contient un caractère corrompu "Cat�gorie")_

#### `PATCH /api/extra-items/:id`

**Body attendu** (tous optionnels) :

```json
{
  "prixDH": "number",
  "actif": "boolean",
  "tauxTVA": "number (10 ou 20)"
}
```

- Source : `src/controllers/extra.controller.js:88`
- **Validations** :
  - Si `prixDH` fourni : doit être un nombre valide → 400 sinon
  - Si `tauxTVA` fourni : doit être 10 ou 20 → 400 sinon
- **Réponse 200** : objet ExtraItem mis à jour
- **Erreurs possibles** :
  - `400` : `{ "message": "prixDH doit être un nombre valide" }`
  - `400` : `{ "message": "tauxTVA doit être 10 ou 20" }`
  - `404` : `{ "message": "Item introuvable" }`

---

### 5.8 Discounts (Remises)

#### `GET /api/discounts`

**Réponse 200** :

```json
[
  {
    "id": 1,
    "nom": "Remise fidélité",
    "type": "pourcentage",
    "valeur": "15.00",
    "actif": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

- `type` : ENUM — `"pourcentage"`, `"valeur_fixe"` — `src/models/Discount.js:7`
- `valeur` : si `pourcentage` = pourcentage (ex: 15 = 15%), si `valeur_fixe` = nouveau prix en DH — `src/models/Discount.js:12`
- `actif` : BOOLEAN, défaut `true`

#### `POST /api/discounts`

**Body attendu** :

```json
{
  "nom": "string — OBLIGATOIRE",
  "type": "string (ENUM: pourcentage|valeur_fixe) — OBLIGATOIRE",
  "valeur": "number (DECIMAL 10,2) — OBLIGATOIRE"
}
```

- Source : `src/controllers/discount.controller.js:14`
- **Réponse 201** : objet Discount créé (avec `actif: true` par défaut)

#### `POST /api/discounts/apply` (accessible à tous les rôles authentifiés)

**Body attendu** :

```json
{
  "discountId": "integer — OBLIGATOIRE",
  "prixInitial": "number — OBLIGATOIRE"
}
```

- Source : `src/controllers/discount.controller.js:25`
- **Logique de calcul** :
  - Si `type === 'pourcentage'` : `prixFinal = prixInitial - (prixInitial * valeur / 100)`
  - Si `type === 'valeur_fixe'` : `prixFinal = valeur` (le prix est remplacé, pas déduit)
- **Réponse 200** :

```json
{
  "prixInitial": 1000,
  "discount": "Remise fidélité",
  "type": "pourcentage",
  "prixFinal": "850.00"
}
```

- **404** : `{ "message": "Remise introuvable" }`

---

### 5.9 Packages

#### `GET /api/packages`

**Réponse 200** :

```json
[
  {
    "id": 1,
    "nom": "Package Romance",
    "prixGlobalDH": "3600.00",
    "actif": true,
    "createdAt": "...",
    "updatedAt": "...",
    "PackageBreakdowns": [
      {
        "id": 1,
        "poste": "hebergement",
        "montantDH": "2000.00",
        "packageId": 1,
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
]
```

- `PackageBreakdown.poste` : ENUM — `"hebergement"`, `"restaurant"`, `"spa"`, `"activites"`, `"autre"` — `src/models/PackageBreakdown.js:7`

#### `POST /api/packages`

**Body attendu** :

```json
{
  "nom": "string — OBLIGATOIRE",
  "prixGlobalDH": "number (DECIMAL 10,2) — OBLIGATOIRE",
  "breakdown": [
    { "poste": "hebergement", "montantDH": 2000 },
    { "poste": "restaurant", "montantDH": 600 },
    { "poste": "spa", "montantDH": 400 }
  ]
}
```

- Source : `src/controllers/package.controller.js:18`
- **Validation critique** : la somme des `montantDH` du `breakdown` doit être **exactement égale** à `prixGlobalDH` → sinon 400
- La création est transactionnelle (tout ou rien) — `src/controllers/package.controller.js:16`
- **Réponse 201** : objet PackageOffer avec `PackageBreakdowns` inclus
- **Erreurs possibles** :
  - `400` : `{ "message": "La ventilation (X DH) ne correspond pas au prix global (Y DH)" }`

---

### 5.10 Calculate Rate (Calcul complet)

#### `GET /api/rates/calculate`

**Paramètres de requête (query string)** :

| Param            | Type                | Obligatoire\*          | Description                                                 |
| ---------------- | ------------------- | ---------------------- | ----------------------------------------------------------- |
| `categorie`      | string              | ✅ si pas de packageId | Catégorie de chambre (ENUM RatePlan)                        |
| `seasonId`       | integer             | ✅ si pas de packageId | ID de la saison                                             |
| `regime`         | string              | ✅ si pas de packageId | Régime (ENUM: BB, DP, PC)                                   |
| `nights`         | integer             | ✅ si pas de packageId | Nombre de nuits (défaut: 1)                                 |
| `partnerId`      | integer             | optionnel              | ID partenaire (utilise tarif négocié si trouvé)             |
| `discountId`     | integer             | optionnel              | ID de la remise à appliquer                                 |
| `packageId`      | integer             | optionnel              | ID du package (remplace la tarification classique)          |
| `categorieHotel` | string              | optionnel              | Catégorie hôtel pour taxes locales (ENUM LocalTax)          |
| `pax`            | integer             | optionnel              | Nombre de personnes (requis si `categorieHotel` fourni)     |
| `taxeMode`       | string              | optionnel              | `"sur_place"` ou autre (défaut: `payable_a_la_reservation`) |
| `extras`         | string (JSON array) | optionnel              | Liste d'extras au format JSON string (voir ci-dessous)      |

\*Si `packageId` est fourni, `categorie`, `seasonId`, `regime`, `nights` ne sont pas obligatoires.

**Format du paramètre `extras`** (query string, encodé en JSON) :

```json
[
  { "extraItemId": 1, "quantite": 2 },
  { "extraItemId": 5, "quantite": 1 }
]
```

- Source : `src/controllers/calculate.controller.js:25-30`

**Réponse 200 (tarification standard)** :

```json
{
  "nights": 5,
  "details": {
    "type": "standard",
    "source": "tarif_public",
    "categorie": "standard",
    "regime": "BB",
    "prixBaseParNuitTTC": "1100.00",
    "supplementRegimeParNuitTTC": "0.00",
    "prixParNuitFinalTTC": "1100.00",
    "totalHebergementTTC": "5500.00",
    "totalHebergementHT": "5000.00",
    "totalHebergementTVA": "500.00",
    "tauxTVA": 10,
    "discount": {
      "nom": "Remise fidélité",
      "type": "pourcentage",
      "valeur": 15,
      "economieParNuit": "165.00",
      "economieTotale": "825.00"
    }
  },
  "extras": [
    {
      "extraItemId": 1,
      "nom": "Tajine poulet",
      "categorie": "restaurant",
      "quantite": 2,
      "montantTTC": "240.00",
      "montantHT": "218.18",
      "montantTVA": "21.82",
      "tauxTVA": 10
    }
  ],
  "taxesLocales": {
    "categorieHotel": "4_etoiles",
    "pax": 2,
    "mode": "payable_a_la_reservation",
    "totalTS": "300.00",
    "totalTPT": "80.00",
    "totalTaxes": "380.00"
  },
  "totalGeneral": "6120.00"
}
```

**Réponse 200 (avec package)** :

```json
{
  "nights": 1,
  "details": {
    "type": "package",
    "nom": "Package Romance",
    "prixGlobalTTC": "3600.00",
    "ventilation": [
      {
        "poste": "hebergement",
        "montantTTC": "2000.00",
        "montantHT": "1818.18",
        "montantTVA": "181.82",
        "tauxTVA": 10
      }
    ]
  },
  "totalGeneral": "3600.00"
}
```

**Note sur les taxes locales** :

- Si `taxeMode === 'sur_place'`, les taxes locales sont **exclues** du `totalGeneral` et une clé `note` est ajoutée :

```json
{
  "note": "Les taxes locales sont exclues de ce total et seront ajoutées aux extras au check-out"
}
```

- Si `taxeMode !== 'sur_place'` (défaut), les taxes sont **inclues** dans le `totalGeneral`.
- Source : `src/controllers/calculate.controller.js:270-285`

**Effets de bord (écritures en base)** :
Ce endpoint **crée des FolioItems** dans la table `FolioItem` pour :

- Chaque extra consommé (type: `extra`)
- Chaque ligne de ventilation de package (type: `package_ventilation`)
- Les taxes locales si mode `sur_place` (type: `taxe_locale`)
- Source : `src/controllers/calculate.controller.js:83-93, 126-136, 244-265`

> ⚠️ **Ceci n'est pas un simple calcul : c'est un endpoint qui écrit en base.** Le frontend doit en tenir compte.

**Logique de recherche du tarif** (`src/controllers/calculate.controller.js:153-174`) :

1. Si `partnerId` fourni, cherche un `PartnerRate` (categorie + seasonId + partnerId)
2. Si pas de partenaire ou pas de tarif trouvé, cherche un `RatePlan` (categorie + seasonId)
3. Si rien n'est trouvé → 404

**Logique du régime** (`src/controllers/calculate.controller.js:199-205`) :

- Si `regime === 'BB'` : pas de supplément (prix de base = BB inclus)
- Si `regime !== 'BB'` (DP ou PC) : cherche le `RegimeSupplement` et ajoute `supplementDH` par nuit

**Erreurs possibles** :

- `400` : `{ "message": "Paramètres requis pour tarification classique : categorie, seasonId, regime, nights" }`
- `400` : `{ "message": "La ventilation (X DH) ne correspond pas au prix global (Y DH)" }` (si package)
- `404` : `{ "message": "Aucun tarif trouvé pour cette catégorie/saison" }`
- `404` : `{ "message": "Package introuvable ou inactif" }`
- `500` : `{ "message": "Erreur serveur", "error": "..." }`

---

## 6. Dépendances externes

**Aucun appel HTTP sortant identifié.** Le service ne communique avec aucun autre microservice via HTTP/axios/fetch.

> Bien que des URLs de services soient définies dans `.env` (AUTH_SERVICE_URL, HOUSEKEEPING_SERVICE_URL, RESERVATIONS_SERVICE_URL, FRONT_OFFICE_SERVICE_URL, ANALYTICS_SERVICE_URL, NIGHT_AUDIT_SERVICE_URL), **aucune n'est utilisée dans le code source**. Une recherche d'`axios`, `fetch`, `http.request`, `got`, `request` dans `src/` ne retourne aucun résultat.

Le service est **purement calcul/data** : il lit et écrit dans sa propre base MySQL, et effectue des calculs de tarification.

---

## 7. Points d'attention pour le frontend

### 7.1 Le endpoint `/api/rates/calculate` n'est pas un simple calcul

C'est un endpoint GET qui **écrit des FolioItems en base** (extras, ventilations de packages, taxes locales). Le frontend ne doit l'appeler qu'au moment du booking, pas pour un simple aperçu de prix. — `src/controllers/calculate.controller.js:83-93, 126-136, 244-265`

### 7.2 `POST /api/discounts/apply` est accessible à tous les rôles

Contrairement aux autres routes POST qui nécessitent `admin`/`manager`, cette route n'a pas de `checkRole`. Elle est conçue comme un endpoint de calcul (prévisualisation d'une remise), pas comme une opération d'écriture. — `src/routes/tarification.routes.js:46`

### 7.3 Le paramètre `extras` dans `/api/rates/calculate` est un JSON encodé en string dans la query string

Format attendu : `[{"extraItemId":1,"quantite":2}]` encodé en URL dans le query param. Le frontend doit `JSON.stringify()` le tableau avant de le passer en query param. — `src/controllers/calculate.controller.js:41-48`

### 7.4 Comportement des remises : `valeur_fixe` remplace le prix, pas une réduction

Si le type de remise est `valeur_fixe`, la `valeur` est le **nouveau prix** (pas un montant déduit). Par exemple, une remise `valeur_fixe` de 800 sur un prix de 1100 donne un prix final de 800 (pas 300). — `src/controllers/discount.controller.js:33`

### 7.5 `PUT /api/rateplans/category/:categorie` est un upsert par saison

Le body contient des clés = noms de saisons (insensibles à la casse) et des valeurs = prix. Les saisons inconnues ou les valeurs `null` sont ignorées silencieusement. — `src/controllers/rateplan.controller.js:58-67`

### 7.6 La validation des chevauchements de saisons est faite côté serveur

`PUT /api/seasons/:category` vérifie que les nouvelles dates ne chevauchent pas une autre saison existante (→ 409). Le frontend n'a pas besoin de refaire cette validation. — `src/controllers/season.controller.js:47-62`

### 7.7 TVA hébergement toujours à 10%

Dans le calcul de tarification classique, la TVA sur l'hébergement est **hardcodée à 10%** — `src/controllers/calculate.controller.js:209-210`. Pour les packages, la TVA par poste dépend du type (`hebergement`/`restaurant` → 10%, autres → 20%) — `src/controllers/calculate.controller.js:113`.

### 7.8 FolioItem : mapping des postes extras

Le mapping entre catégories d'extras et postes de ventilation est défini dans `posteMap` :

- `restaurant` → `"restaurant"`, `bar_boissons` → `"restaurant"`, `spa` → `"spa"`, `activites` → `"activites"`, `transferts` → `"autre"`, `services` → `"autre"` — `src/controllers/calculate.controller.js:13-20`

### 7.9 `taxeMode` influence l'inclusion des taxes dans le total

- `taxeMode === 'sur_place'` → taxes **exclues** du `totalGeneral`, des FolioItems sont créés avec `modePaiement: 'sur_place'`
- Tout autre valeur (ou absent) → taxes **inclues** dans le `totalGeneral`, mode `payable_a_la_reservation`
- Le frontend peut afficher un avertissement si mode `sur_place` (champ `note` dans la réponse). — `src/controllers/calculate.controller.js:237, 270-285`

### 7.10 Les ENUM sont case-sensitive

Toutes les valeurs ENUM (`nom` saison, `categorie`, `regime`, `type` partenaire, etc.) sont **sensibles à la casse** telles que définies dans les modèles Sequelize. Le frontend doit envoyer les valeurs exactes : `"basse"` (pas `"Basse"`), `"BB"` (pas `"bb"`), `"standard"` (pas `"Standard"`).
