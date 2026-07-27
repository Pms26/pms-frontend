# Documentation Technique — Service Analytics

---

## 1. Informations générales

| Propriété              | Valeur                                               |
| ---------------------- | ---------------------------------------------------- |
| **Nom du service**     | `analytics-service`                                  |
| **Description**        | KPIs, Segments, Comparaison N-1                      |
| **Port**               | `4006` (par défaut, configurable via `PORT`)         |
| **Préfixe des routes** | `/api/dashboard`, `/api/segments`, `/api/comparison` |
| **Framework**          | Express.js v5.2.1                                    |
| **ORM**                | Drizzle ORM v0.45.2                                  |
| **Base de données**    | PostgreSQL (via `pg` v8.22.0)                        |
| **Auth**               | `jsonwebtoken` v9.0.3                                |

---

## 2. Endpoints exposés

| Méthode | Chemin exact                 | Rôles autorisés                 | Middleware(s) appliqué(s)       | Description                                            |
| ------- | ---------------------------- | ------------------------------- | ------------------------------- | ------------------------------------------------------ |
| `GET`   | `/api/health`                | _Aucun_                         | —                               | Health check (pas de protection)                       |
| `GET`   | `/`                          | _Aucun_                         | —                               | Health check racine (pas de protection)                |
| `POST`  | `/api/seed`                  | _Aucun rôle vérifié_            | `auth` (vérifie JWT uniquement) | Génère des données de test (rooms, bookings, payments) |
| `GET`   | `/api/dashboard`             | `manager`, `admin`, `comptable` | `auth`, `requireRole`           | KPIs du mois en cours (TO, ADR, RevPAR, DMS, CA)       |
| `GET`   | `/api/dashboard/trend`       | `manager`, `admin`, `comptable` | `auth`, `requireRole`           | Tendance mensuelle sur une année complète              |
| `GET`   | `/api/segments`              | `manager`, `admin`, `comptable` | `auth`, `requireRole`           | Liste des segments et groupes disponibles              |
| `GET`   | `/api/segments/distribution` | `manager`, `admin`, `comptable` | `auth`, `requireRole`           | Distribution des segments par nuits et revenus         |
| `GET`   | `/api/segments/trend`        | `manager`, `admin`, `comptable` | `auth`, `requireRole`           | Tendance mensuelle par segment sur une année           |
| `GET`   | `/api/comparison/ytd`        | `manager`, `admin`, `comptable` | `auth`, `requireRole`           | Comparaison année courante vs année N-1 (YTD)          |
| `GET`   | `/api/comparison/monthly`    | `manager`, `admin`, `comptable` | `auth`, `requireRole`           | Comparaison d'un mois spécifique vs N-1                |

---

## 3. Authentification

### Mécanisme

- **Header attendu** : `Authorization: Bearer <token>`
- **Algorithme** : déterminé par `jwt.verify` (accepte HS256/HS384/HS512 selon le token signé)
- **Champ du payload** : `role` (champ exact `decoded.role`)
- **Champs extra extraits** : `sub`, `name`

### Options de validation JWT

- **issuer** : `process.env.JWT_ISSUER` ou `'auth-service'` par défaut (`middleware/auth.js:21`)
- **audience** : `process.env.JWT_AUDIENCE` ou `'pms-microservices'` par défaut (`middleware/auth.js:22`)
- **expiration** : gérée nativement par `jsonwebtoken` (le champ `exp` du token est vérifié automatiquement)

### Messages d'erreur

| Cas                            | Statut | Body                                                                                 |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------ |
| Header manquant ou mal formaté | `401`  | `{ "status": "UNAUTHORIZED", "message": "Missing or invalid authorization header" }` |
| Token invalide ou expiré       | `401`  | `{ "status": "UNAUTHORIZED", "message": "Invalid or expired token" }`                |
| Rôle non autorisé              | `403`  | `{ "status": "FORBIDDEN", "message": "Insufficient permissions" }`                   |

---

## 4. Rôles et permissions

### Rôles utilisés dans les routes

| Rôle (string exacte) | Routes accessibles                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manager`            | `/api/dashboard`, `/api/dashboard/trend`, `/api/segments`, `/api/segments/distribution`, `/api/segments/trend`, `/api/comparison/ytd`, `/api/comparison/monthly` |
| `admin`              | `/api/dashboard`, `/api/dashboard/trend`, `/api/segments`, `/api/segments/distribution`, `/api/segments/trend`, `/api/comparison/ytd`, `/api/comparison/monthly` |
| `comptable`          | `/api/dashboard`, `/api/dashboard/trend`, `/api/segments`, `/api/segments/distribution`, `/api/segments/trend`, `/api/comparison/ytd`, `/api/comparison/monthly` |

> Les trois rôles ont exactement les mêmes permissions sur ce service. Le rôle `comptable` a aussi des permissions définies dans `ROLE_PERMISSIONS` (`middleware/auth.js:4`) : `['read_invoices', 'read_payments', 'read_financial_reports', 'export_data']`, mais ce dictionnaire n'est **jamais utilisé** dans le code actuel (aucune route ne l'appelle).

### Routes non protégées

- `GET /api/health`
- `GET /`

### Routes protégées par JWT uniquement (sans vérification de rôle)

- `POST /api/seed` (protégé par `auth` mais aucun `requireRole`)

---

## 5. Contrats de requête et réponse

### 5.1 `GET /api/dashboard`

**Query parameters** : aucun

**Réponse 200** :

```json
{
  "period": { "year": 2026, "month": 7 },
  "kpis": {
    "toMensuel": { "value": 65.2, "prevValue": 60.1, "evolution": 8.5 },
    "toJournalier": { "value": 58.33, "prevValue": null, "evolution": null },
    "adr": { "value": 1200, "prevValue": 1100, "evolution": 9.1 },
    "revpar": { "value": 780, "prevValue": 661.1, "evolution": 18.0 },
    "dms": { "value": 2.3, "prevValue": 2.1, "evolution": 9.5 },
    "caMensuel": { "value": 150000, "prevValue": 130000, "evolution": 15.4 }
  },
  "raw": {
    "current": {
      "totalRooms": 30,
      "totalNights": 120,
      "totalRevenue": 150000,
      "occupancyRate": 65.2,
      "adr": 1200,
      "revpar": 780,
      "avgStayDuration": 2.3,
      "activeBookings": 52
    },
    "prev": {
      "totalRooms": 30,
      "totalNights": 110,
      "totalRevenue": 130000,
      "occupancyRate": 60.1,
      "adr": 1100,
      "revpar": 661.1,
      "avgStayDuration": 2.1,
      "activeBookings": 50
    }
  }
}
```

**Détails des KPIs** :

- `toMensuel` : Taux d'occupation mensuel (%) — nbre de nuits occupées / (nbre chambres actives × jours dans le mois)
- `toJournalier` : Taux d'occupation du jour (%) — basé sur les bookings actifs aujourd'hui
- `adr` : Average Daily Rate — revenu total / nuits totales
- `revpar` : Revenue Per Available Room — revenu total / (chambres × jours)
- `dms` : Durée Moyenne de Séjour — nbre total de jours / nbre de réservations actives
- `caMensuel` : Chiffre d'Affaires mensuel — somme des paiements des bookings actifs du mois
- `evolution` : Variation en % par rapport à la période précédente (mois-1 ou mois N-1). `null` si la valeur précédente est 0 ou absente.

**Note** : Seuls les bookings avec `status` = `checked_in` ou `checked_out` sont comptés. Les réservations `confirmed` sont exclues.

**Erreur 500** : `{ "error": "<message d'erreur JS>" }`

---

### 5.2 `GET /api/dashboard/trend`

**Query parameters** :
| Param | Type | Obligatoire | Description |
|---|---|---|---|
| `year` | integer | Non | Année cible (défaut : année courante) |

**Réponse 200** :

```json
{
  "year": 2026,
  "months": [
    {
      "month": 1,
      "totalRooms": 30,
      "totalNights": 500,
      "totalRevenue": 600000,
      "occupancyRate": 53.76,
      "adr": 1200,
      "revpar": 645.16,
      "avgStayDuration": 2.1,
      "activeBookings": 85
    },
    {
      "month": 2,
      "totalRooms": 30,
      "totalNights": 480,
      "totalRevenue": 576000,
      "occupancyRate": 57.14,
      "adr": 1200,
      "revpar": 685.71,
      "avgStayDuration": 2.0,
      "activeBookings": 80
    }
  ]
}
```

> Retourne les 12 mois (1–12) de l'année spécifiée, même si les données futures sont vides (valeurs à 0).

---

### 5.3 `GET /api/segments`

**Query parameters** : aucun

**Réponse 200** :

```json
{
  "segments": [
    { "code": "direct_walk_in", "label": "Direct - Walk-in" },
    { "code": "direct_phone_mail", "label": "Direct - Tel/Email" },
    { "code": "direct_website", "label": "Direct - Site Web" },
    { "code": "ota_booking", "label": "OTA - Booking.com" },
    { "code": "ota_expedia", "label": "OTA - Expedia" },
    { "code": "ota_hotels", "label": "OTA - Hotels.com" },
    { "code": "ota_agoda", "label": "OTA - Agoda" },
    { "code": "ota_airbnb", "label": "OTA - Airbnb" },
    { "code": "b2b_agency", "label": "Agence / TO" },
    { "code": "b2b_corporate", "label": "Corporate / Société" }
  ],
  "groups": {
    "DIRECT": ["direct_walk_in", "direct_phone_mail", "direct_website"],
    "OTA": [
      "ota_booking",
      "ota_expedia",
      "ota_hotels",
      "ota_agoda",
      "ota_airbnb"
    ],
    "PARTENAIRES": ["b2b_agency", "b2b_corporate"]
  }
}
```

> **Ne dépend pas de la base de données** — les données sont en dur dans le code (`segmentController.js:6-23`).

---

### 5.4 `GET /api/segments/distribution`

**Query parameters** :
| Param | Type | Obligatoire | Description |
|---|---|---|---|
| `year` | integer | Non | Année (défaut : année courante) |
| `month` | integer | Non | Mois 1–12 (défaut : mois courant) |

**Réponse 200** :

```json
{
  "period": { "year": 2026, "month": 7 },
  "totalNights": 500,
  "pieChart": [
    {
      "segment": "direct_walk_in",
      "label": "Direct - Walk-in",
      "nights": 150,
      "percentage": 30.0
    },
    {
      "segment": "ota_booking",
      "label": "OTA - Booking.com",
      "nights": 120,
      "percentage": 24.0
    }
  ],
  "barChart": [
    {
      "segment": "direct_walk_in",
      "label": "Direct - Walk-in",
      "revenue": 180000
    },
    {
      "segment": "ota_booking",
      "label": "OTA - Booking.com",
      "revenue": 144000
    }
  ]
}
```

**Détails** :

- `pieChart` : trié par nombre de nuits décroissant, avec pourcentage par segment
- `barChart` : trié par revenu décroissant
- Seuls les bookings `checked_in` ou `checked_out` sont inclus

---

### 5.5 `GET /api/segments/trend`

**Query parameters** :
| Param | Type | Obligatoire | Description |
|---|---|---|---|
| `year` | integer | Non | Année (défaut : année courante) |

**Réponse 200** :

```json
{
  "year": 2026,
  "months": [
    {
      "month": 1,
      "segments": [
        {
          "segment": "direct_walk_in",
          "label": "Direct - Walk-in",
          "nights": 150,
          "revenue": 180000,
          "adr": 1200
        },
        {
          "segment": "ota_booking",
          "label": "OTA - Booking.com",
          "nights": 120,
          "revenue": 144000,
          "adr": 1200
        }
      ]
    }
  ]
}
```

> Chaque mois contient uniquement les segments qui ont au moins une nuit dans ce mois.

---

### 5.6 `GET /api/comparison/ytd`

**Query parameters** :
| Param | Type | Obligatoire | Description |
|---|---|---|---|
| `year` | integer | Non | Année courante à comparer (défaut : année courante) |
| `segment` | string | Non | Code de segment à filtrer (défaut : tous) |

**Réponse 200** :

```json
{
  "period": { "currentYear": 2026, "prevYear": 2025, "upToMonth": 7 },
  "segment": "all",
  "comparison": [
    {
      "month": 1,
      "current": {
        "occupancyRate": 53.76,
        "adr": 1200,
        "revpar": 645.16,
        "revenue": 600000,
        "nights": 500
      },
      "previous": {
        "occupancyRate": 50.0,
        "adr": 1100,
        "revpar": 550.0,
        "revenue": 550000,
        "nights": 458
      },
      "deltas": {
        "occupancyRate": 7.5,
        "adr": 9.1,
        "revpar": 17.3,
        "revenue": 9.1
      }
    }
  ]
}
```

**Détails** :

- Retourne les données du mois 1 jusqu'au mois en cours (YTD = Year To Date)
- La comparaison est toujours N vs N-1 (même mois l'année précédente)
- Si `segment` est fourni, seules les réservations de ce segment sont calculées
- `deltas` : `null` si la valeur N-1 est 0

---

### 5.7 `GET /api/comparison/monthly`

**Query parameters** :
| Param | Type | Obligatoire | Description |
|---|---|---|---|
| `year` | integer | Non | Année (défaut : année courante) |
| `month` | integer | Non | Mois 1–12 (défaut : mois courant) |
| `segment` | string | Non | Code de segment à filtrer (défaut : tous) |

**Réponse 200** :

```json
{
  "period": {
    "current": { "year": 2026, "month": 7 },
    "previous": { "year": 2025, "month": 7 }
  },
  "segment": "all",
  "current": {
    "totalRooms": 30,
    "totalNights": 120,
    "totalRevenue": 150000,
    "occupancyRate": 65.2,
    "adr": 1200,
    "revpar": 780
  },
  "previous": {
    "totalRooms": 30,
    "totalNights": 110,
    "totalRevenue": 130000,
    "occupancyRate": 60.1,
    "adr": 1100,
    "revpar": 661.1
  },
  "deltas": {
    "occupancyRate": 8.5,
    "adr": 9.1,
    "revpar": 18.0,
    "revenue": 15.4
  }
}
```

---

### 5.8 `POST /api/seed`

**Body** : aucun

**Réponse 200** : `{ "message": "Seed terminé avec succès" }`

**Erreur 500** : `{ "error": "<message d'erreur>" }`

**Attention** : Cette route est **destructrice** — elle supprime et régénère toutes les données (rooms, bookings, payments). Protégée par JWT mais **aucune vérification de rôle** (`server.js:25`).

---

### 5.9 `GET /api/health`

**Réponse 200** : `{ "service": "Analytics", "status": "running", "port": "4006" }`

---

### Format d'erreur générique

Toutes les erreurs non gérées retournent :

```json
{ "error": "<message d'erreur JavaScript>" }
```

Statut : `500`

> Aucune validation de body de requête n'est implémentée (aucun body n'est envoyé — tous les endpoints sont GET ou POST sans body).

---

## 6. Dépendances externes

| Dépendance                             | Utilisation                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- |
| PostgreSQL                             | Base de données directe (pas d'appel à un autre service pour les données) |
| `auth-service`                         | JWT signé par ce service (issuer par défaut : `auth-service`)             |
| `RESERVATIONS_SERVICE_URL` (port 4003) | Variable présente dans `.env` mais **jamais utilisée** dans le code       |
| `HOUSEKEEPING_SERVICE_URL` (port 4002) | Variable présente dans `.env` mais **jamais utilisée** dans le code       |
| `TARIFICATION_SERVICE_URL` (port 4004) | Variable présente dans `.env` mais **jamais utilisée** dans le code       |
| `FRONT_OFFICE_SERVICE_URL` (port 4005) | Variable presente dans `.env` mais **jamais utilisée** dans le code       |
| `NIGHT_AUDIT_SERVICE_URL` (port 4007)  | Variable presente dans `.env` mais **jamais utilisée** dans le code       |

> **Aucun appel HTTP interne** n'est effectué par ce service. Il lit directement les tables `bookings`, `rooms` et `payments` dans la base PostgreSQL partagée. Le `INTERNAL_SERVICE_SECRET` dans `.env` n'est pas utilisé non plus.

---

## 7. Points d'attention pour le frontend

### 7.1 Données partagées via la base de données

Ce service lit **directement** les tables `bookings`, `rooms` et `payments`. Il ne reçoit pas ces données d'un autre service via API. Cela signifie que :

- Les données sont cohérentes en temps réel avec les autres services (front-office, night-audit, etc.)
- Si une réservation n'est pas encore dans la base (ex: non créée par le front-office), elle n'apparaîtra pas ici

### 7.2 Filtre sur le statut des bookings

Dans tous les calculs de KPIs, **seuls les bookings avec `status` = `checked_in` ou `checked_out`** sont pris en compte (`dashboardController.js:40`, `segmentController.js:40`, `comparisonController.js:22`). Les réservations avec `status` = `confirmed` sont **exclues** des métriques.

### 7.3 Segments codés en dur

La liste des segments (`direct_walk_in`, `ota_booking`, etc.) et leurs libellés sont définis **en dur** dans le code (`segmentController.js:6-23`). L'endpoint `/api/segments` retourne ces données sans appeler la base. Pour ajouter un segment, il faudra modifier le code backend.

### 7.4 Calcul des deltas (évolutions)

Le calcul de l'évolution (`evolution` dans les réponses) utilise la formule : `(current - previous) / previous * 100`. Si la valeur précédente est `0`, le delta est `null` (`dashboardController.js:106`, `comparisonController.js:73,108`). Le frontend doit gérer ce cas (`null`) pour éviter d'afficher `NaN` ou `Infinity`.

### 7.5 Aucune validation de body

Les endpoints `POST /api/seed` n'acceptent aucun body. Tous les autres endpoints sont GET avec des query parameters. Aucune validation de schéma de requête n'est implémentée côté serveur (pas de `joi`, `zod`, ou middleware de validation).

### 7.6 Route `/api/seed` — action destructive

La route `POST /api/seed` supprime et régénère **toutes** les données (rooms, bookings, payments). Elle est protégée par JWT mais n'a **aucune vérification de rôle** (`server.js:25`). Tout utilisateur authentifié peut l'appeler. Le frontend ne devrait **jamais** exposer cette action aux utilisateurs finaux.

### 7.7 Pas de pagination ni de filtres avancés

Aucun endpoint ne supporte la pagination ou le filtrage par plage de dates. Le trend mensuel retourne toujours 12 mois. Pour de grandes quantités de données, les réponses peuvent être volumineuses.

### 7.8 `avgStayDuration` (DMS) — calcul précis

Le DMS est calculé sur la durée totale de séjour (checkIn → checkOut), **pas** sur les nuits comptées dans le mois. Une réservation qui chevauche deux mois aura sa durée totale comptée, pas seulement la portion dans le mois. (`dashboardController.js:49`)

### 7.9 Comparaison YTD — plage de mois

La comparaison YTD (`/api/comparison/ytd`) retourne les données du mois 1 jusqu'au mois en cours uniquement. Si on appelle cette route en mars, on reçoit les mois 1, 2, 3. (`comparisonController.js:69`)

### 7.10 Pas de CORS restrictif

Le middleware CORS est configuré sans origin spécifique (`cors()` sans options — `server.js:10`). Toute origine est acceptée. En production, il faudra restreindre les origines autorisées.

---

_Document généré le 2026-07-27 à partir de l'analyse du code source._
