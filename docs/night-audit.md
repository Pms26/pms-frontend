# Documentation API — service-night-audit

> **Fichier généré par audit du code source.** Toutes les informations ci-dessous
> sont vérifiées dans le code, pas dans un PRD ou un document externe.
> Les références `fichier:ligne` indiquent la source exacte dans le code.

---

## 1. Informations générales

| Champ                             | Valeur                                                   |
| --------------------------------- | -------------------------------------------------------- |
| **Nom du service**                | `service-night-audit`                                    |
| **Port**                          | `4007` (défaut, configurable via `PORT`) — `server.js:3` |
| **Préfixe de montage des routes** | `/api/night-audit` — `src/routes/index.js:15-17`         |
| **Route health (pas d'auth)**     | `GET /health` — `src/routes/index.js:7-13`               |

### Stack technique

| Composant           | Technologie               | Source               |
| ------------------- | ------------------------- | -------------------- |
| Framework           | Express.js v5             | `package.json:34`    |
| ORM                 | Drizzle ORM               | `package.json:31`    |
| Base de données     | PostgreSQL (`pg`)         | `package.json:40`    |
| Validation          | Joi                       | `package.json:36`    |
| Authentification    | jsonwebtoken (JWT Bearer) | `package.json:37`    |
| PDF                 | pdfkit                    | `package.json:39`    |
| HTTP inter-services | axios                     | `package.json:30`    |
| Sécurité            | helmet, cors              | `package.json:31,32` |
| Logging             | morgan                    | `package.json:38`    |

### Variables d'environnement requises

| Variable                   | Description                                                     | Source                                |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| `PORT`                     | Port d'écoute (défaut: 4007)                                    | `.env.example:1`                      |
| `DATABASE_URL`             | URL PostgreSQL                                                  | `.env.example:2`                      |
| `JWT_SECRET`               | Secret pour vérifier/ signer les JWT                            | `.env.example:3`                      |
| `FRONTOFFICE_SERVICE_URL`  | URL du service front-office                                     | `.env.example:4`                      |
| `RESERVATIONS_SERVICE_URL` | URL du service réservations                                     | `.env.example:5`                      |
| `STORAGE_PATH`             | Dossier de stockage des PDF (défaut: `./storage/reports`)       | `.env.example:6`                      |
| `UPSTREAM_TIMEOUT_MS`      | Timeout HTTP inter-services en ms (défaut: 10000)               | `.env.example:7`                      |
| `RETRY_DELAY_MS`           | Délai entre retries en ms (défaut: 5000)                        | `.env.example:8`                      |
| `JWT_ISSUER`               | Issuer attendu dans les JWT (défaut: `auth-service`)            | `src/middlewares/auth.js:17`          |
| `JWT_AUDIENCE`             | Audience attendue dans les JWT (défaut: `pms-microservices`)    | `src/middlewares/auth.js:18`          |
| `SERVICE_ID`               | sub du token service-to-service (défaut: `service-night-audit`) | `src/clients/frontOfficeClient.js:16` |
| `SERVICE_ROLE`             | role du token service-to-service (défaut: `admin`)              | `src/clients/frontOfficeClient.js:17` |
| `SERVICE_JWT_EXPIRES_IN`   | TTL du token service-to-service (défaut: `1h`)                  | `src/clients/frontOfficeClient.js:23` |
| `INTERNAL_SERVICE_SECRET`  | Secret pour header `X-Internal-Secret` vers reservations        | `src/clients/reservationClient.js:12` |

---

## 2. Endpoints exposés

### Tableau récapitulatif

| Méthode | Chemin exact                                                 | Rôles autorisés                                 | Middleware(s) appliqué(s)                                                    | Description fonctionnelle                                                             |
| ------- | ------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET`   | `/health`                                                    | **Aucun** (public)                              | Aucun                                                                        | Health check — retourne `{ status: 'ok', service, timestamp }`                        |
| `GET`   | `/api/night-audit/status`                                    | `receptionist`, `manager`, `admin`, `comptable` | `auth`, `requireRole(...)`                                                   | Statut de la journée en cours (date, état, dernière clôture)                          |
| `GET`   | `/api/night-audit/current-business-date`                     | `manager`, `admin`, `comptable`                 | `auth`, `requireRole(...)`                                                   | Retourne la date business courante                                                    |
| `POST`  | `/api/night-audit/check-balance`                             | `manager`, `admin`, `comptable`                 | `auth`, `requireRole(...)`, `validate(checkBalanceSchema)`, `rejectIfClosed` | Vérifie l'équilibre débit/crédit pour une date donnée                                 |
| `POST`  | `/api/night-audit/rollover`                                  | `manager`, `admin`                              | `auth`, `requireRole(...)`                                                   | Avance la date business au jour suivant (via `closureController.rolloverBusinessDay`) |
| `POST`  | `/api/night-audit/close`                                     | `manager`, `admin`                              | `auth`, `requireRole(...)`, `validate(closeSchema)`, `rejectIfClosed`        | Clôture officielle de la journée — génère les rapports PDF                            |
| `GET`   | `/api/night-audit/history`                                   | `admin`, `comptable`                            | `auth`, `requireRole(...)`                                                   | Liste de toutes les clôtures passées (triées par date DESC)                           |
| `GET`   | `/api/night-audit/history/:business_date`                    | `admin`, `comptable`                            | `auth`, `requireRole(...)`                                                   | Détail d'une clôture (revenus, paiements, débiteurs)                                  |
| `GET`   | `/api/night-audit/history/:business_date/reports`            | `admin`, `comptable`                            | `auth`, `requireRole(...)`                                                   | Liste des rapports PDF générés pour une date                                          |
| `GET`   | `/api/night-audit/history/:business_date/reports/:report_id` | `admin`, `comptable`                            | `auth`, `requireRole(...)`                                                   | Téléchargement du PDF d'un rapport (retourne un stream)                               |

### Notes sur les routes

- **Route `/rollover` en double** : `src/routes/closure.js` enregistre **deux** routes `POST /rollover` (lignes 33-38 et 51-77). La première est celle qui sera exécutée (Express résout la première correspondance). La seconde (ligne 51) est du **code mort** — elle ne sera jamais atteinte.
- **Route `/current-business-date`** : Cette route n'existe **pas** dans le PRD ni dans le contrat API (`specs/001-night-audit-service/contracts/api.md`), mais elle est présente dans le code source (`src/routes/closure.js:17-22`).
- **Absence de `/api/night-audit/reports/...`** : Le PRD et les specs prévoient des routes séparées `/reports/:closureId` et `/reports/:closureId/download/:reportId`, mais le code les implémente sous `/api/night-audit/history/:business_date/reports` et `/api/night-audit/history/:business_date/reports/:report_id`.

---

## 3. Authentification

### Mécanisme

- **Header attendu** : `Authorization: Bearer <token>`
- **Format** : JWT classique (header.payload.signature)
- **Vérification** : `jwt.verify(token, JWT_SECRET, { issuer, audience })` — `src/middlewares/auth.js:16-19`

### Options de validation JWT

| Option      | Valeur par défaut                                                         | Source                       |
| ----------- | ------------------------------------------------------------------------- | ---------------------------- |
| `issuer`    | `auth-service` (variable `JWT_ISSUER`)                                    | `src/middlewares/auth.js:17` |
| `audience`  | `pms-microservices` (variable `JWT_AUDIENCE`)                             | `src/middlewares/auth.js:18` |
| `expiresIn` | Vérifié automatiquement par `jwt.verify` (pas de configuration explicite) | `src/middlewares/auth.js:16` |

### Champ du rôle dans le payload JWT

- **Nom du champ** : `role` (sensible à la casse)
- **Champs extraits** : `sub`, `role`, `name` — `src/middlewares/auth.js:20-24`

```js
req.user = {
  sub: decoded.sub,
  role: decoded.role,
  name: decoded.name,
};
```

### Erreurs d'authentification

| Code HTTP | `status`       | `message`                                 | Source                          |
| --------- | -------------- | ----------------------------------------- | ------------------------------- |
| 401       | `UNAUTHORIZED` | `Missing or invalid authorization header` | `src/middlewares/auth.js:7-10`  |
| 401       | `UNAUTHORIZED` | `Invalid or expired token`                | `src/middlewares/auth.js:27-30` |

---

## 4. Rôles et permissions

### Rôles utilisés dans le code

Les rôles sont des **strings sensibles à la casse**, passées en argument à `requireRole()` :

| Rôle           | Définition       |
| -------------- | ---------------- |
| `receptionist` | Réceptionniste   |
| `manager`      | Manager / Gérant |
| `admin`        | Administrateur   |
| `comptable`    | Comptable        |

> **Note** : Le rôle `comptable` n'est **pas mentionné** dans le PRD (`docs/prd.md`) ni dans les specs (`specs/001-night-audit-service/spec.md`), mais il est utilisé dans le code source sur de nombreuses routes. C'est une extension par rapport à la spec initiale.

### Matrice des permissions par route

| Route                                            | `receptionist` | `manager` | `admin` | `comptable` |
| ------------------------------------------------ | :------------: | :-------: | :-----: | :---------: |
| `GET /health`                                    |       ✅       |    ✅     |   ✅    |     ✅      |
| `GET /status`                                    |       ✅       |    ✅     |   ✅    |     ✅      |
| `GET /current-business-date`                     |       ❌       |    ✅     |   ✅    |     ✅      |
| `POST /check-balance`                            |       ❌       |    ✅     |   ✅    |     ✅      |
| `POST /rollover`                                 |       ❌       |    ✅     |   ✅    |     ❌      |
| `POST /close`                                    |       ❌       |    ✅     |   ✅    |     ❌      |
| `GET /history`                                   |       ❌       |    ❌     |   ✅    |     ✅      |
| `GET /history/:business_date`                    |       ❌       |    ❌     |   ✅    |     ✅      |
| `GET /history/:business_date/reports`            |       ❌       |    ❌     |   ✅    |     ✅      |
| `GET /history/:business_date/reports/:report_id` |       ❌       |    ❌     |   ✅    |     ✅      |

### Permissions RBAC déclarées dans le code

Le fichier `src/middlewares/rbac.js` définit un objet `ROLE_PERMISSIONS` :

```js
const ROLE_PERMISSIONS = {
  comptable: [
    "read_invoices",
    "read_payments",
    "read_financial_reports",
    "export_data",
  ],
};
```

**Important** : Cet objet est exposé via `requireRole.ROLE_PERMISSIONS` mais **n'est jamais utilisé** dans le code pour le contrôle d'accès. Le contrôle se fait uniquement via les arguments `allowRoles` passés à `requireRole()` — `src/middlewares/rbac.js:5-14`.

### Comportement spécifique par rôle sur `/close`

Le code dans `src/services/closureService.js:197-226` implémente des règles métier spécifiques au rôle en cas d'écart (`ecart ≠ 0`) :

| Rôle      | Comportement si `ecart ≠ 0`                                                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manager` | **Bloqué** — HTTP 403 `FORBIDDEN` avec message "Manager cannot close with ecart". Le `daily_closures` est enregistré avec `error_details='MANAGER_ECart_BLOCKED'`             |
| `admin`   | Autorisé **uniquement si `justification` est fourni**. Sans justification → HTTP 400 `ECART_BLOCKED`. Le `daily_closures` est enregistré avec `error_details='ECART_BLOCKED'` |

### Accès aux URLs de téléchargement dans la réponse `/close`

Dans la réponse de `POST /close`, le champ `download_url` dans le tableau `reports` n'est inclus **que pour les admins** — `src/services/closureService.js:365` :

```js
...(isAdmin && { download_url: `/api/night-audit/history/${businessDate}/reports/${r.id}` }),
```

Les managers ne reçoivent que les métadonnées des rapports (id, type, nom) sans lien de téléchargement.

---

## 5. Contrats de requête et réponse

### 5.1 `GET /health`

**Auth** : Aucune

**Réponse 200** :

```json
{
  "status": "ok",
  "service": "night-audit",
  "timestamp": "2026-07-13T22:00:00.000Z"
}
```

> Source : `src/routes/index.js:7-13`

---

### 5.2 `GET /api/night-audit/status`

**Auth** : JWT requis

**Réponse 200** — Journée en cours (pas de clôture échouée) :

```json
{
  "business_date": "2026-07-13",
  "status": "en_cours",
  "last_closure": {
    "business_date": "2026-07-12",
    "closed_at": "2026-07-12T23:45:00.000Z",
    "closed_by_role": "manager"
  }
}
```

> Source : `src/services/statusService.js:47-55`

**Réponse 200** — Journée en cours (aucune clôture passée, premier lancement) :

```json
{
  "business_date": "2026-07-27",
  "status": "en_cours"
}
```

> Quand `recentClosure` est vide, le champ `last_closure` est `undefined` — `src/services/statusService.js:50-54`

**Réponse 200** — Dernière tentative a échoué :

```json
{
  "business_date": "2026-07-13",
  "status": "echouee",
  "error_details": {
    "service": "service-frontoffice",
    "code": "SERVICE_UNAVAILABLE"
  },
  "last_closure": {
    "business_date": "2026-07-12",
    "closed_at": "2026-07-12T23:45:00.000Z",
    "closed_by_role": "manager"
  }
}
```

> Source : `src/services/statusService.js:33-45`

**Valeurs possibles pour `status`** : `en_cours`, `echouee`

> Le statut `cloturee` n'est **jamais** retourné par ce endpoint — le code cherche la dernière ligne avec `status != 'cloturee'` ou par défaut retourne `en_cours`.

---

### 5.3 `GET /api/night-audit/current-business-date`

**Auth** : JWT requis

**Réponse 200** :

```json
{
  "current_business_date": "2026-07-13"
}
```

> Source : `src/services/closureService.js:411-421`

Si aucune donnée n'existe en base, `current_business_date` est `null`.

---

### 5.4 `POST /api/night-audit/check-balance`

**Auth** : JWT requis (manager, admin, comptable)
**Middleware** : `validate(checkBalanceSchema)`, `rejectIfClosed`

**Body attendu** :

```json
{
  "business_date": "2026-07-13"
}
```

| Champ           | Type   | Obligatoire | Validation                                 |
| --------------- | ------ | :---------: | ------------------------------------------ |
| `business_date` | string |     ✅      | Pattern `^\d{4}-\d{2}-\d{2}$` (YYYY-MM-DD) |

> Source : `src/middlewares/validate.js:19-27`

**Réponse 200** — Comptes équilibrés :

```json
{
  "business_date": "2026-07-13",
  "equilibre": true,
  "total_debit": 45230.5,
  "total_credit": 45230.5,
  "ecart": 0.0,
  "decomposition": {
    "debit_sources": {
      "frontoffice": 42100.0
    },
    "credit_sources": {
      "payments": 38500.0,
      "debtors": 6730.5
    }
  }
}
```

> Source : `src/services/closureService.js:128-143`

**Réponse 200** — Écart détecté :

```json
{
  "business_date": "2026-07-13",
  "equilibre": false,
  "total_debit": 45230.5,
  "total_credit": 44980.5,
  "ecart": 250.0,
  "decomposition": {
    "debit_sources": {
      "frontoffice": 42100.0
    },
    "credit_sources": {
      "payments": 38250.0,
      "debtors": 6730.5
    }
  }
}
```

**Erreurs possibles** :

| Code HTTP | `status`              | `message`                                      | Condition                                     |
| --------- | --------------------- | ---------------------------------------------- | --------------------------------------------- |
| 400       | `VALIDATION_ERROR`    | Messages Joi (ex: `business_date is required`) | Body invalide                                 |
| 409       | `ALREADY_CLOSED`      | `already closed`                               | La date est déjà clôturée (`status=cloturee`) |
| 503       | `SERVICE_UNAVAILABLE` | `service-frontoffice unavailable, retry later` | Service front-office indisponible après retry |

> Sources : `src/middlewares/validate.js:9-12`, `src/middlewares/immutability.js:18-23`, `src/services/closureService.js:98-102`

---

### 5.5 `POST /api/night-audit/rollover`

**Auth** : JWT requis (manager, admin)
**Middleware** : `auth`, `requireRole("manager", "admin")`

**Body** : Aucun body requis.

**Réponse 200** :

```json
{
  "current_business_date": "2026-07-14"
}
```

> Source : `src/services/closureService.js:370-409`

**Erreurs possibles** :

| Code HTTP | `status`                  | `message`                                             | Condition                                |
| --------- | ------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| 403       | `FORBIDDEN`               | `Insufficient permissions`                            | Rôle non autorisé                        |
| 404       | `NOT_FOUND`               | `No business day history available`                   | Aucune clôture en base                   |
| 409       | `BUSINESS_DAY_NOT_CLOSED` | `Current business day must be closed before rollover` | La dernière clôture n'est pas `cloturee` |

> Sources : `src/middlewares/rbac.js:7-10`, `src/services/closureService.js:378-388`

---

### 5.6 `POST /api/night-audit/close`

**Auth** : JWT requis (manager, admin)
**Middleware** : `auth`, `requireRole("manager", "admin")`, `validate(closeSchema)`, `rejectIfClosed`

**Body attendu** :

```json
{
  "business_date": "2026-07-13",
  "justification": "Écart de 250€ lié à une facture en attente de validation"
}
```

| Champ           | Type   |  Obligatoire   | Validation                                                                                              |
| --------------- | ------ | :------------: | ------------------------------------------------------------------------------------------------------- |
| `business_date` | string |       ✅       | Pattern `^\d{4}-\d{2}-\d{2}$` (YYYY-MM-DD)                                                              |
| `justification` | string | ❌ (optionnel) | Aucune validation — accepte n'importe quelle chaîne. **Requis métier** si `ecart ≠ 0` ET `role = admin` |

> Source : `src/middlewares/validate.js:29-38`

**Réponse 201** — Clôture réussie (rôle admin) :

```json
{
  "business_date": "2026-07-13",
  "status": "cloturee",
  "closed_by": "user-uuid-123",
  "closed_by_role": "admin",
  "closed_at": "2026-07-13T23:55:00.000Z",
  "current_business_date": "2026-07-14",
  "total_debit": 45230.5,
  "total_credit": 44980.5,
  "ecart": 250.0,
  "justification": "Écart de 250€ lié à une facture en attente de validation",
  "warnings": [],
  "reports_generated": 6,
  "reports": [
    {
      "id": "report-uuid-1",
      "type": "revenue_daily",
      "name": "Detailed Daily Revenue",
      "download_url": "/api/night-audit/history/2026-07-13/reports/report-uuid-1"
    },
    {
      "id": "report-uuid-2",
      "type": "receipts_daily",
      "name": "Daily Receipts",
      "download_url": "/api/night-audit/history/2026-07-13/reports/report-uuid-2"
    },
    {
      "id": "report-uuid-3",
      "type": "debtors",
      "name": "Debtors Summary",
      "download_url": "/api/night-audit/history/2026-07-13/reports/report-uuid-3"
    },
    {
      "id": "report-uuid-4",
      "type": "departures",
      "name": "Expected Departures",
      "download_url": "/api/night-audit/history/2026-07-13/reports/report-uuid-4"
    },
    {
      "id": "report-uuid-5",
      "type": "arrivals",
      "name": "Expected Arrivals",
      "download_url": "/api/night-audit/history/2026-07-13/reports/report-uuid-5"
    },
    {
      "id": "report-uuid-6",
      "type": "occupancy_forecast",
      "name": "Occupancy Forecast",
      "download_url": "/api/night-audit/history/2026-07-13/reports/report-uuid-6"
    }
  ]
}
```

> Source : `src/services/closureService.js:348-367`

**Réponse 201** — Clôture réussie (rôle manager) :
Même structure mais **sans `download_url`** dans les objets `reports` :

```json
{
  "reports": [
    {
      "id": "report-uuid-1",
      "type": "revenue_daily",
      "name": "Detailed Daily Revenue"
    }
  ]
}
```

> Le champ `download_url` n'est inclus que si `userRole === 'admin'` — `src/services/closureService.js:365`

**Le champ `current_business_date` dans la réponse** : C'est la nouvelle date business après avancement (J+1 par rapport à `business_date` clôturé). Ce champ n'est pas présent dans les specs/contrats existants.

**Le champ `warnings`** : Tableau contenant les erreurs non bloquantes rencontrées lors de la récupération des données auprès des services réservations (départs, arrivées, occupation). Chaque warning a la forme `{ report: string, reason: string }`. Si les appels vers les réservations échouent, la clôture continue quand même — `src/services/closureService.js:244-273`.

**Erreurs possibles** :

| Code HTTP | `status`              | `message`                                      | Condition                                               |
| --------- | --------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| 400       | `VALIDATION_ERROR`    | Messages Joi                                   | Body invalide                                           |
| 400       | `ECART_BLOCKED`       | `justification required for admin with ecart`  | Admin tente de clôturer avec ecart≠0 sans justification |
| 403       | `FORBIDDEN`           | `Manager cannot close with ecart`              | Manager tente de clôturer avec ecart≠0                  |
| 403       | `FORBIDDEN`           | `Insufficient permissions`                     | Rôle non autorisé                                       |
| 409       | `ALREADY_CLOSED`      | `already closed`                               | Date déjà clôturée                                      |
| 503       | `SERVICE_UNAVAILABLE` | `service-frontoffice unavailable, retry later` | Service front-office indisponible                       |

> Sources : `src/services/closureService.js:156-226`, `src/middlewares/immutability.js:18-23`

---

### 5.7 `GET /api/night-audit/history`

**Auth** : JWT requis (admin, comptable)

**Réponse 200** :

```json
{
  "closures": [
    {
      "business_date": "2026-07-13",
      "status": "cloturee",
      "closed_by_role": "admin",
      "closed_at": "2026-07-13T23:55:00.000Z",
      "total_debit": 45230.50,
      "total_credit": 44980.50,
      "ecart": 250.00,
      "reports_generated": 6,
      "error_details": {
        "warnings": [...]
      }
    },
    {
      "business_date": "2026-07-12",
      "status": "echouee",
      "closed_by_role": "manager",
      "closed_at": "2026-07-12T23:45:00.000Z",
      "total_debit": null,
      "total_credit": null,
      "ecart": null,
      "reports_generated": 0,
      "error_details": {
        "code": "MANAGER_ECart_BLOCKED"
      }
    }
  ]
}
```

> Source : `src/services/historyService.js:8-25`

**Notes** :

- Les clôtures sont retournées triées par `business_date` DESC (la plus récente en premier).
- Le champ `error_details` est un objet JS parsé depuis un champ `text` en DB. Il est `undefined` si le champ était `null`.
- Les champs `total_debit`, `total_credit`, `ecart` sont `null` si la clôture a échoué avant d'atteindre le calcul.

---

### 5.8 `GET /api/night-audit/history/:business_date`

**Auth** : JWT requis (admin, comptable)

**Paramètre de chemin** : `business_date` (string, format YYYY-MM-DD)

**Réponse 200** :

```json
{
  "closure": {
    "business_date": "2026-07-13",
    "status": "cloturee",
    "closed_by": "user-uuid-123",
    "closed_by_role": "admin",
    "closed_at": "2026-07-13T23:55:00.000Z",
    "total_debit": 45230.5,
    "total_credit": 44980.5,
    "ecart": 250.0,
    "justification": "Écart de 250€ lié à une facture en attente de validation",
    "reports_generated": 6
  },
  "revenue_breakdown": [
    {
      "category": "lodging",
      "amount_ht": 32000.0,
      "tva_rate": 20.0,
      "tva_amount": 6400.0,
      "amount_ttc": 38400.0
    },
    {
      "category": "fb",
      "amount_ht": 5200.0,
      "tva_rate": 20.0,
      "tva_amount": 1040.0,
      "amount_ttc": 6240.0
    },
    {
      "category": "extras",
      "amount_ht": 1800.0,
      "tva_rate": 20.0,
      "tva_amount": 360.0,
      "amount_ttc": 2160.0
    },
    {
      "category": "tourism_tax",
      "amount_ht": 0.0,
      "tva_rate": 0.0,
      "tva_amount": 0.0,
      "amount_ttc": 0.0
    }
  ],
  "payment_summary": [
    {
      "payment_method": "cash",
      "total_amount": 8500.0,
      "transaction_count": 42
    },
    {
      "payment_method": "card",
      "total_amount": 28750.0,
      "transaction_count": 156
    },
    {
      "payment_method": "wire_transfer",
      "total_amount": 7980.5,
      "transaction_count": 12
    }
  ],
  "debtors_summary": [
    {
      "debtor_name": "Agence Atlas Voyages",
      "debtor_reference": "ATL-2026-001",
      "amount": 4200.0,
      "invoice_count": 3
    }
  ]
}
```

> Source : `src/services/historyService.js:27-88`

**Erreurs possibles** :

| Code HTTP | `status`    | `message`                              | Condition                      |
| --------- | ----------- | -------------------------------------- | ------------------------------ |
| 403       | `FORBIDDEN` | `Insufficient permissions`             | Rôle non autorisé              |
| 404       | `NOT_FOUND` | `No closure found for date 2026-07-13` | Aucune clôture pour cette date |

---

### 5.9 `GET /api/night-audit/history/:business_date/reports`

**Auth** : JWT requis (admin, comptable)

**Réponse 200** :

```json
{
  "business_date": "2026-07-13",
  "reports": [
    {
      "id": "report-uuid-1",
      "type": "revenue_daily",
      "name": "Detailed Daily Revenue",
      "file_size": 45230,
      "checksum": "a1b2c3d4e5f6...",
      "checksum_algorithm": "sha256",
      "generated_at": "2026-07-13T23:55:10.000Z"
    }
  ]
}
```

> Source : `src/services/historyService.js:90-108`

**Valeurs possibles pour `type`** : `revenue_daily`, `receipts_daily`, `debtors`, `departures`, `arrivals`, `occupancy_forecast`

> Source : `src/services/reportService.js:88-95`

**Le tableau `reports` peut être vide** si aucun rapport n'a été généré pour cette date (clôture échouée).

---

### 5.10 `GET /api/night-audit/history/:business_date/reports/:report_id`

**Auth** : JWT requis (admin, comptable)

**Réponse 200** :

- **Content-Type** : `application/pdf`
- **Content-Disposition** : `attachment; filename="<nom_du_fichier>"`
- **X-Report-Checksum** : `sha256hash` (SHA-256 du fichier)
- **Body** : Stream binaire du fichier PDF

> Source : `src/controllers/historyController.js:32-44`

**Erreurs possibles** :

| Code HTTP | `status`          | `message`                                               | Condition                                                      |
| --------- | ----------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| 403       | `FORBIDDEN`       | `Insufficient permissions`                              | Rôle non autorisé                                              |
| 404       | `NOT_FOUND`       | `Report not found`                                      | `report_id` introuvable en base                                |
| 404       | `NOT_FOUND`       | `Report file not found on disk`                         | Le fichier PDF n'existe plus sur le disque                     |
| 500       | `INTEGRITY_ERROR` | `Report integrity check failed — file may be corrupted` | Le SHA-256 du fichier ne correspond pas au checksum enregistré |

> Sources : `src/services/historyService.js:110-143`

---

### Format standard des erreurs

Toutes les erreurs suivent le format (sauf erreurs 401 d'auth) :

```json
{
  "status": "CODE_ERREUR",
  "message": "Description lisible par un humain"
}
```

Champs optionnels selon le contexte :

- `service` : nom du service amont défaillant (uniquement sur erreurs 503)
- `ecart` : montant de l'écart (potentiellement inclus dans le handler global, mais **jamais défini** sur les objets Error dans le code actuel)

> Source : `src/middlewares/errorHandler.js:1-18`

Les erreurs 401 ont un format légèrement différent :

```json
{
  "status": "UNAUTHORIZED",
  "message": "..."
}
```

Erreur inattendue (sans `err.status`) :

```json
{
  "status": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

---

## 6. Dépendances externes

### 6.1 service-frontoffice

| Élément              | Détail                                                               | Source                                   |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| **Client**           | `src/clients/frontOfficeClient.js`                                   |                                          |
| **URL de base**      | Variable `FRONTOFFICE_SERVICE_URL` (défaut: `http://localhost:4005`) | `src/clients/frontOfficeClient.js:4`     |
| **Authentification** | JWTBearer avec token auto-généré (`service-to-service`)              | `src/clients/frontOfficeClient.js:8-26`  |
| **Timeout**          | `UPSTREAM_TIMEOUT_MS` (défaut: 10000ms)                              | `src/clients/frontOfficeClient.js:5`     |
| **Retry**            | 1 retry après `RETRY_DELAY_MS` (défaut: 5000ms)                      | `src/clients/frontOfficeClient.js:28,39` |

**Endpoints appelés** :

| Méthode | Endpoint complet                                               | Utilisé par                        |
| ------- | -------------------------------------------------------------- | ---------------------------------- |
| `GET`   | `${FRONTOFFICE_SERVICE_URL}/api/invoices?date=${businessDate}` | `checkBalance`, `closeBusinessDay` |
| `GET`   | `${FRONTOFFICE_SERVICE_URL}/api/payments?date=${businessDate}` | `checkBalance`, `closeBusinessDay` |

> Sources : `src/clients/frontOfficeClient.js:50-62`

**Token service-to-service** :

```js
{
  sub: process.env.SERVICE_ID || 'service-night-audit',
  role: process.env.SERVICE_ROLE || 'admin'
}
// Options: issuer='auth-service', audience='pms-microservices', expiresIn='1h'
```

> Source : `src/clients/frontOfficeClient.js:14-25`

---

### 6.2 service-reservations

| Élément              | Détail                                                                | Source                                  |
| -------------------- | --------------------------------------------------------------------- | --------------------------------------- |
| **Client**           | `src/clients/reservationClient.js`                                    |                                         |
| **URL de base**      | Variable `RESERVATIONS_SERVICE_URL` (défaut: `http://localhost:4003`) | `src/clients/reservationClient.js:3`    |
| **Authentification** | Header `X-Internal-Secret` avec valeur de `INTERNAL_SERVICE_SECRET`   | `src/clients/reservationClient.js:12`   |
| **Timeout**          | `UPSTREAM_TIMEOUT_MS` (défaut: 10000ms)                               | `src/clients/reservationClient.js:4`    |
| **Retry**            | 1 retry après `RETRY_DELAY_MS` (défaut: 5000ms)                       | `src/clients/reservationClient.js:7,19` |

**Endpoints appelés** :

| Méthode | Endpoint complet                                                           | Utilisé par        |
| ------- | -------------------------------------------------------------------------- | ------------------ |
| `GET`   | `${RESERVATIONS_SERVICE_URL}/api/internal/departures?date=${businessDate}` | `closeBusinessDay` |
| `GET`   | `${RESERVATIONS_SERVICE_URL}/api/internal/arrivals?date=${businessDate}`   | `closeBusinessDay` |
| `GET`   | `${RESERVATIONS_SERVICE_URL}/api/internal/occupancy?date=${businessDate}`  | `closeBusinessDay` |

> Sources : `src/clients/reservationClient.js:29-48`

**Important** : Les appels vers les réservations sont **non bloquants** pour la clôture. Si l'un de ces appels échoue, la clôture continue avec des données vides et un warning est enregistré — `src/services/closureService.js:244-273`.

---

### 6.3 Résumé des dépendances

```
service-night-audit
  ├── service-frontoffice (auth: JWT Bearer auto-généré)
  │     GET /api/invoices?date=YYYY-MM-DD
  │     GET /api/payments?date=YYYY-MM-DD
  │
  └── service-reservations (auth: header X-Internal-Secret)
        GET /api/internal/departures?date=YYYY-MM-DD
        GET /api/internal/arrivals?date=YYYY-MM-DD
        GET /api/internal/occupancy?date=YYYY-MM-DD
```

---

## 7. Points d'attention pour le frontend

### 7.1 Irréversibilité de la clôture

- Une fois la journée clôturée (`status: "cloturee"`), **aucune modification n'est possible** via aucune route de ce service. Le middleware `rejectIfClosed` (`src/middlewares/immutability.js`) bloque toute tentative sur les routes `check-balance` et `close`.
- Le frontend doit refléter cet état : ne pas proposer de bouton "modifier" ou "rouvrir" pour une date clôturée.

### 7.2 Double route `/rollover` — comportement réel

- Le code source contient deux définitions de `POST /rollover` dans `src/routes/closure.js` (lignes 33-38 et 51-77). **Seule la première sera exécutée** (celle qui appelle `closureController.rolloverBusinessDay`).
- La seconde (ligne 51-77) est du code mort et ne sera jamais atteinte.
- **Le frontend ne doit pas s'appuyer sur le corps de réponse de la seconde route** (qui inclurait `previousDate`, `nextDate`, `note`).

### 7.3 Rôle `comptable` — absent du PRD

- Le rôle `comptable` est utilisé dans le code sur de nombreuses routes (`/status`, `/current-business-date`, `/check-balance`, `/history` et sous-routes) mais **n'est pas mentionné dans le PRD ni dans les specs**.
- Le frontend doit gérer ce rôle et lui donner accès aux fonctionnalités correspondantes.
- Le rôle `comptable` n'a **pas accès** à `/close` ni à `/rollover`.

### 7.4 Le champ `current_business_date` dans la réponse `/close`

- La réponse de `POST /close` inclut `current_business_date` (la nouvelle date après avancement). Ce champ n'est pas dans les specs/contrats.
- Le frontend peut l'utiliser pour mettre à jour l'affichage de la date courante sans avoir besoin d'appeler `/current-business-date`.

### 7.5 Différence d'accès aux téléchargements selon le rôle

- Lors d'une clôture réussie, les **admins** reçoivent `download_url` dans chaque objet `reports`. Les **managers** ne reçoivent que `id`, `type`, `name`.
- Le frontend ne doit afficher les boutons de téléchargement que si `download_url` est présent.

### 7.6 Le champ `warnings` dans la réponse `/close`

- Le tableau `warnings` contient les erreurs non bloquantes lors de la récupération des données réservations. Un warning ne bloque pas la clôture mais indique que certains rapports (départs, arrivées, occupation) pourraient être incomplets.
- Le frontend doit afficher ces warnings comme des alertes non bloquantes.

### 7.7 Statuts possibles du `status` en réponse `/status`

- Le endpoint `/status` ne retourne **jamais** `status: "cloturee"`. Il retourne soit `en_cours`, soit `echouee` (avec `error_details`), soit `en_cours` sans `last_closure` (premier lancement).
- Ne pas confondre le `status` retourné par `/status` (qui est l'état de la journée en cours) avec le `status` dans les réponses de `/history` (qui peut être `cloturee` ou `echouee`).

### 7.8 Le champ `error_details` est un objet parsé

- En base, `error_details` est stocké comme une chaîne de caractères (JSON stringifié). Les endpoints de l'API le retournent comme un **objet JS déjà parsé**.
- Le frontend n'a pas besoin de `JSON.parse()` sur ce champ.

### 7.9 Validation côté client

- La validation Joi sur `business_date` exige le format exact `YYYY-MM-DD` (regex `^\d{4}-\d{2}-\d{2}$`). Le frontend doit soumettre les dates dans ce format.
- Le champ `justification` n'a **aucune validation de contenu** — n'importe quelle chaîne est acceptée, y compris vide.

### 7.10 Comportement de `check-balance` avec `rejectIfClosed`

- Le middleware `rejectIfClosed` extrait `business_date` depuis `req.body.business_date` OU `req.params.business_date`. Pour `check-balance`, c'est toujours `req.body.business_date`.
- Si la date demandée a déjà le statut `cloturee`, la requête est rejetée avec 409 **avant** même d'interroger les services amont.

### 7.11 Les types de rapports

Les 6 types de rapports générés automatiquement lors de la clôture :

| `type`               | `name`                 | Contenu                                                                      |
| -------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `revenue_daily`      | Detailed Daily Revenue | Ventilation par catégorie (lodging, fb, extras, tourism_tax) avec HT/TVA/TTC |
| `receipts_daily`     | Daily Receipts         | Total par mode de paiement (cash, card, cheque, wire_transfer)               |
| `debtors`            | Debtors Summary        | Montants dus par les agences/corporates                                      |
| `departures`         | Expected Departures    | Départs prévus pour la journée                                               |
| `arrivals`           | Expected Arrivals      | Arrivées prévues pour la journée                                             |
| `occupancy_forecast` | Occupancy Forecast     | Prévision d'occupation pour la journée suivante                              |

> Source : `src/services/reportService.js:88-95`

### 7.12 Écarts entre code et PRD

| Élément                                             | PRD / Contrat                                               | Code réel                                                     |
| --------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| Rôle `comptable`                                    | Non mentionné                                               | Utilisé sur 7 routes                                          |
| Route `GET /current-business-date`                  | Non mentionnée                                              | Présente dans le code                                         |
| Route `POST /rollover`                              | Non mentionnée                                              | Présente dans le code                                         |
| Route `GET /history/:date/reports`                  | Prévue sous `/reports/:closureId`                           | Implémentée sous `/history/:business_date/reports`            |
| Route `GET /history/:date/reports/:id`              | Prévue sous `/reports/:closureId/download/:reportId`        | Implémentée sous `/history/:business_date/reports/:report_id` |
| Champ `current_business_date` dans réponse `/close` | Non mentionné                                               | Présent dans le code                                          |
| Champ `warnings` dans réponse `/close`              | Non mentionné                                               | Présent dans le code                                          |
| Champ `error_details` dans réponse `/status`        | Non mentionné                                               | Présent (pour status `echouee`)                               |
| Valeurs de `category` dans revenue                  | PRD: `hebergement`, `restauration`, `extras`, `taxe_sejour` | Code: `lodging`, `fb`, `extras`, `tourism_tax`                |
| Valeurs de `payment_method`                         | PRD: `ESP`, `CB`, `CHQ`, `Virement`                         | Code: `cash`, `card`, `cheque`, `wire_transfer`               |
| Champ `error_details` en DB                         | Non dans le PRD initial                                     | Présent dans le schema Drizzle                                |
| Route `GET /history` accessible par `comptable`     | PRD: admin uniquement                                       | Code: admin + comptable                                       |
