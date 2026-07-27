# Documentation du service — service-housekeeping

---

## 1. Informations générales

| Champ                             | Valeur                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Nom du service**                | `service-housekeeping`                                                                             |
| **Port**                          | `4002` (variable d'env `PORT`, défaut `4002`) — `src/app.js:3`                                     |
| **Préfixe de montage des routes** | `/api/rooms` — `src/app.js:6`                                                                      |
| **Framework**                     | Express.js v5.2.1                                                                                  |
| **ORM**                           | Mongoose v9.7.4                                                                                    |
| **Base de données**               | MongoDB — URI dans `MONGO_URI`, défaut `mongodb://127.0.0.1:27017/pms_housekeeping` — `index.js:7` |
| **Module system**                 | CommonJS                                                                                           |
| **Authentification**              | JWT (`jsonwebtoken` v9.0.3)                                                                        |

---

## 2. Endpoints exposés

Toutes les routes sont montées sous `/api/rooms` (`src/app.js:6`).

| Méthode | Chemin exact (hors préfixe `/api/rooms`) | Rôles autorisés                                               | Middleware(s)              | Description                                                                                                                                         |
| ------- | ---------------------------------------- | ------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/`                                      | `admin`, `manager`, `housekeeping_supervisor`, `receptionist` | `verifyToken`, `checkRole` | Récupère la liste de toutes les chambres (proxy vers le service réservation). `src/routes/room.routes.js:7`                                         |
| `GET`   | `/statuses`                              | **Aucun** (route publique)                                    | —                          | Retourne les listes de statuts et motifs de blocage valides. `src/routes/room.routes.js:8`                                                          |
| `GET`   | `/:id`                                   | `admin`, `manager`, `housekeeping_supervisor`, `receptionist` | `verifyToken`, `checkRole` | Récupère une chambre par son identifiant MongoDB `_id` (proxy vers le service réservation). `src/routes/room.routes.js:9`                           |
| `GET`   | `/numero/:numero/status`                 | `admin`, `manager`, `housekeeping_supervisor`, `receptionist` | `verifyToken`, `checkRole` | Récupère le statut housekeeping d'une chambre par son numéro. `src/routes/room.routes.js:10`                                                        |
| `PATCH` | `/:id/status`                            | `housekeeping_supervisor`, `admin`                            | `verifyToken`, `checkRole` | Met à jour le statut housekeeping d'une chambre par son `_id`. `src/routes/room.routes.js:13`                                                       |
| `PATCH` | `/numero/:numero/status`                 | `receptionist`, `admin`, `housekeeping_supervisor`            | `verifyToken`, `checkRole` | Met à jour le statut housekeeping d'une chambre par son numéro. `src/routes/room.routes.js:14`                                                      |
| `PATCH` | `/numero/:numero/checkout`               | `receptionist`, `admin`                                       | `verifyToken`, `checkRole` | Déclenche automatiquement le check-out : passe la chambre au statut `sale`. `src/routes/room.routes.js:17`                                          |
| `POST`  | `/night-audit`                           | `admin`                                                       | `verifyToken`, `checkRole` | Déclenche la clôture journalière (Night Audit) : passe toutes les chambres `propre` ou `controlee` au statut `sale`. `src/routes/room.routes.js:20` |

---

## 3. Authentification

### Vérification du token

- **Header attendu** : `Authorization: Bearer <token>` — `src/middlewares/auth.middleware.js:27-28`
- Le token est extrait via `authHeader.split(' ')[1]` (format `Bearer <jwt>`)
- **Algorithme** : celui utilisé par `jsonwebtoken` par défaut pour la vérification (HMAC SHA-256 ou SHA-512 selon la clé signée côté auth-service)
- **Clé de vérification** : variable d'env `JWT_SECRET` — `src/middlewares/auth.middleware.js:35`

### Options de validation JWT

| Option      | Valeur                                                                                                                                                                                                                                  | Source                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `issuer`    | `auth-service` (env `JWT_ISSUER`)                                                                                                                                                                                                       | `src/middlewares/auth.middleware.js:38` |
| `audience`  | `pms-microservices` (env `JWT_AUDIENCE`)                                                                                                                                                                                                | `src/middlewares/auth.middleware.js:39` |
| `expiresIn` | **Non vérifié côté housekeeping** (le service ne configure pas `clockTolerance` ni de validation d'expiration explicite — la vérification par défaut de `jsonwebtoken` valide l'expiration si le champ `exp` est présent dans le token) | —                                       |

### Champ du rôle dans le payload JWT

Le rôle est lu depuis `decoded.role` — `src/middlewares/auth.middleware.js:48`. Le champ exact dans le token est **`role`** (string unique, pas un tableau).

Le champ `sub` est lu depuis `decoded.sub` et exposé via `req.auth.userId` — `src/middlewares/auth.middleware.js:47`.

### Bypass inter-service (webhook)

Une requête peut contourner l'authentification JWT si **toutes** les conditions suivantes sont réunies (`src/middlewares/auth.middleware.js:7-13`) :

1. Le chemin de la requête correspond à `/api/rooms/numero/:numero/status` (regex : `^\/api\/rooms\/numero\/[^/]+\/status(?:\/)?$`)
2. Le header `X-Webhook-Secret` est présent et correspond exactement à la variable d'env `WEBHOOK_SHARED_SECRET`

Dans ce cas, `req.auth` est défini artificiellement à `{ userId: 'system-service', role: 'admin' }`.

---

## 4. Rôles et permissions

### Rôles utilisés dans les routes

| Rôle (valeur exacte)      | Accès                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `admin`                   | Toutes les routes protégées (GET, PATCH status, PATCH checkout, POST night-audit)                                                                                  |
| `manager`                 | `GET /`, `GET /:id`, `GET /numero/:numero/status` (lecture seule)                                                                                                  |
| `housekeeping_supervisor` | `GET /`, `GET /:id`, `GET /numero/:numero/status`, `PATCH /:id/status`, `PATCH /numero/:numero/status` (lecture + modification de statut)                          |
| `receptionist`            | `GET /`, `GET /:id`, `GET /numero/:numero/status`, `PATCH /numero/:numero/status`, `PATCH /numero/:numero/checkout` (lecture + modification par numéro + checkout) |

### Rôle défini mais inutilisé

| Rôle        | Permissions définies                                                      | Utilisé dans les routes ?                          |
| ----------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| `comptable` | `read_invoices`, `read_payments`, `read_financial_reports`, `export_data` | **Non** — `src/middlewares/auth.middleware.js:3-5` |

> **Note** : Le dictionnaire `ROLE_PERMISSIONS` (`src/middlewares/auth.middleware.js:3-5`) n'est pas utilisé par la fonction `checkRole`. Les permissions sont gérées uniquement par liste blanche dans les routes via `checkRole(...)`.

---

## 5. Contrats de requête et réponse

### Statuts et motifs valides (valeurs canoniques)

**Statuts housekeeping** (variable `validStatuses`) — `src/controllers/room.controller.js:4` :

- `sale`
- `nettoyage_en_cours`
- `propre`
- `controlee`
- `bloquee`

**Motifs de blocage** (variable `validReasons`) — `src/controllers/room.controller.js:3` :

- `day_use`
- `probleme_technique`
- `depart_tardif`
- `travaux`

---

### `GET /api/rooms/statuses` — Statuts et motifs valides

**Authentification** : Aucune requise.

**Réponse 200** :

```json
{
  "statuses": ["sale", "nettoyage_en_cours", "propre", "controlee", "bloquee"],
  "blockReasons": ["day_use", "probleme_technique", "depart_tardif", "travaux"]
}
```

`src/controllers/room.controller.js:7`

---

### `GET /api/rooms/` — Liste des chambres

**Authentification** : Requise.

**Réponse 200** : Le JSON brut retourné par le service réservation (`GET /api/rooms` sur `RESERVATION_SERVICE_URL`). Le format exact dépend du service réservation — ce service housekeeping le transmet tel quel. `src/controllers/room.controller.js:49`

**Erreur 500** :

```json
{
  "message": "Erreur serveur",
  "error": "<message d'erreur>"
}
```

**Erreur upstream** (le service réservation renvoie une erreur) :

```json
{
  "message": "Erreur upstream",
  "body": "<corps de la réponse upstream>"
}
```

---

### `GET /api/rooms/:id` — Détail d'une chambre

**Authentification** : Requise.

**Réponse 200** : JSON brut du service réservation (`GET /api/rooms/:id`). Format dépendant du service réservation. `src/controllers/room.controller.js:64`

**Erreurs** : Même format que `GET /` (upstream / 500).

---

### `GET /api/rooms/numero/:numero/status` — Statut housekeeping par numéro

**Authentification** : Requise.

**Réponse 200** :

```json
{
  "numero": "101",
  "statut": "propre",
  "motifBlocage": null,
  "updatedAt": "2026-07-25T10:30:00.000Z"
}
```

`src/controllers/room.controller.js:77`

- `numero` : string — numéro de la chambre
- `statut` : string — statut housekeeping actuel (`housekeepingStatus` ou `statut` ou `status` selon les champs disponibles)
- `motifBlocage` : string | null — motif de blocage si la chambre est bloquée
- `updatedAt` : string (ISO 8601) — date de dernière mise à jour

**Erreur 404** :

```json
{
  "message": "Chambre <numero> non trouvée"
}
```

---

### `PATCH /api/rooms/:id/status` — Modifier le statut par ID

**Authentification** : Requise. Rôles : `housekeeping_supervisor`, `admin`.

**Body attendu** :

```json
{
  "statut": "<string, obligatoire>",
  "motifBlocage": "<string, conditionnel>"
}
```

`src/controllers/room.controller.js:134`

| Champ          | Type   | Obligatoire  | Valeurs acceptées                                              | Notes                                                                         |
| -------------- | ------ | ------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `statut`       | string | Oui          | `sale`, `nettoyage_en_cours`, `propre`, `controlee`, `bloquee` | **400** si invalide                                                           |
| `motifBlocage` | string | Conditionnel | `day_use`, `probleme_technique`, `depart_tardif`, `travaux`    | **Obligatoire** si `statut === 'bloquee'`, sinon mis à `null` automatiquement |

**Réponse 200** : JSON brut du service réservation (objet chambre mis à jour). `src/controllers/room.controller.js:167`

**Erreurs** :
| Code | Condition | Body |
|---|---|---|
| 400 | `statut` non dans la liste | `{ "message": "Statut invalide. Valeurs attendues: sale, nettoyage_en_cours, propre, controlee, bloquee" }` |
| 400 | `statut === 'bloquee'` et `motifBlocage` absent | `{ "message": "Un motif de blocage est obligatoire" }` |
| 400 | `motifBlocage` non dans la liste | `{ "message": "Motif de blocage invalide. Valeurs attendues: day_use, probleme_technique, depart_tardif, travaux" }` |
| 400 | Validation mongoose échouée | `{ "message": "Validation échouée", "error": "<détail>" }` |
| 400 | ID MongoDB invalide (CastError) | `{ "message": "Identifiant de chambre invalide" }` |
| 500 | Erreur serveur | `{ "message": "Erreur serveur", "error": "<détail>" }` |

**Effet secondaire** : Après la mise à jour, une notification webhook est envoyée au front-office et au service réservation (fire-and-forget, ne bloque pas la réponse). `src/controllers/room.controller.js:165`

---

### `PATCH /api/rooms/numero/:numero/status` — Modifier le statut par numéro

**Authentification** : Requise. Rôles : `receptionist`, `admin`, `housekeeping_supervisor`.

**Body attendu** : Identique au `PATCH /:id/status` ci-dessus. `src/controllers/room.controller.js:183`

**Réponse 200** : JSON brut du service réservation (objet chambre mis à jour). `src/controllers/room.controller.js:219`

**Erreurs** : Même format que `PATCH /:id/status`, plus :
| Code | Condition | Body |
|---|---|---|
| 404 | Chambre non trouvée par numéro | `{ "message": "Chambre <numero> non trouvée" }` |

**Effet secondaire** : Notification webhook (même comportement que ci-dessus). `src/controllers/room.controller.js:217`

---

### `PATCH /api/rooms/numero/:numero/checkout` — Déclencher le check-out

**Authentification** : Requise. Rôles : `receptionist`, `admin`.

**Body attendu** : **Aucun** (pas de body utilisé). `src/controllers/room.controller.js:230-257`

**Réponse 200** :

```json
{
  "message": "Chambre <numero> marquée comme sale suite au check-out",
  "room": {
    /* objet chambre mis à jour, format du service réservation */
  }
}
```

`src/controllers/room.controller.js:253`

**Comportement** : La chambre passe automatiquement au statut `sale` avec `motifBlocage: null`. Aucune validation de body n'est nécessaire.

**Erreurs** :
| Code | Condition | Body |
|---|---|---|
| 404 | Chambre non trouvée par numéro | `{ "message": "Chambre <numero> non trouvée" }` |
| 500 | Erreur serveur | `{ "message": "Erreur serveur lors du check-out", "error": "<détail>" }` |

**Effet secondaire** : Notification webhook. `src/controllers/room.controller.js:251`

---

### `POST /api/rooms/night-audit` — Clôture journalière (Night Audit)

**Authentification** : Requise. Rôle : `admin`.

**Body attendu** : **Aucun** (pas de body utilisé). `src/controllers/room.controller.js:260-294`

**Réponse 200** :

```json
{
  "message": "Clôture journalière (Night Audit) appliquée avec succès",
  "chambresModifiees": 5
}
```

`src/controllers/room.controller.js:291`

- `chambresModifiees` : integer — nombre de chambres effectivement passées au statut `sale`

**Comportement** :

1. Récupère la liste complète des chambres depuis le service réservation
2. Filtre les chambres dont le statut housekeeping est `propre` ou `controlee`
3. Passe chacune au statut `sale` (avec `motifBlocage: null`)
4. Envoie une notification webhook pour chaque chambre modifiée

**Erreurs** :
| Code | Condition | Body |
|---|---|---|
| 500 | Erreur serveur | `{ "message": "Erreur serveur lors de la clôture journalière", "error": "<détail>" }` |

---

## 6. Dépendances externes (appels HTTP sortants)

### Service Réservation (`RESERVATION_SERVICE_URL`)

| Direction | Endpoint appelé                      | Méthode | Headers                                                                          | Body                                                                                | Usage                                                                                      |
| --------- | ------------------------------------ | ------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **GET**   | `/api/rooms`                         | `GET`   | `Authorization: <token utilisateur>`                                             | —                                                                                   | Récupérer la liste de toutes les chambres. `src/controllers/room.controller.js:36,47`      |
| **GET**   | `/api/rooms/:id`                     | `GET`   | `Authorization: <token utilisateur>`                                             | —                                                                                   | Récupérer une chambre par ID. `src/controllers/room.controller.js:62`                      |
| **PATCH** | `/api/rooms/:id/housekeeping-status` | `PATCH` | `X-Internal-Secret: <INTERNAL_SERVICE_SECRET>`, `Content-Type: application/json` | `{ "housekeepingStatus": "<statut>", "motifBlocage": "<motif ou null>" }`           | Mettre à jour le statut housekeeping. `src/controllers/room.controller.js:156,209,243,278` |
| **POST**  | `/webhook/room-status`               | `POST`  | `X-Webhook-Secret: <WEBHOOK_SHARED_SECRET>`, `Content-Type: application/json`    | `{ "numero": "<numéro>", "statut": "<statut>", "motifBlocage": "<motif ou null>" }` | Notification de changement de statut. `src/controllers/room.controller.js:110`             |

### Service Front-Office (`FRONTOFFICE_SERVICE_URL`)

| Direction | Endpoint appelé        | Méthode | Headers                                                                       | Body                                                                                | Usage                                                                          |
| --------- | ---------------------- | ------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **POST**  | `/webhook/room-status` | `POST`  | `X-Webhook-Secret: <WEBHOOK_SHARED_SECRET>`, `Content-Type: application/json` | `{ "numero": "<numéro>", "statut": "<statut>", "motifBlocage": "<motif ou null>" }` | Notification de changement de statut. `src/controllers/room.controller.js:110` |

### Variables d'env associées

| Variable                  | Valeur par défaut                                       | Usage                                                            |
| ------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| `RESERVATION_SERVICE_URL` | `http://localhost:4003`                                 | URL de base du service réservation                               |
| `FRONTOFFICE_SERVICE_URL` | (pas de défaut, fallback sur `RESERVATION_SERVICE_URL`) | URL du service front-office                                      |
| `INTERNAL_SERVICE_SECRET` | (pas de défaut)                                         | Secret pour les appels PATCH inter-services (head-to-head)       |
| `WEBHOOK_SHARED_SECRET`   | (pas de défaut)                                         | Secret pour les notifications webhook et le bypass inter-service |

---

## 7. Points d'attention pour le frontend

### Aucun authentification sur `GET /statuses`

La route `GET /api/rooms/statuses` est la seule route publique. Elle ne nécessite pas de token JWT. Elle retourne les listes de statuts et motifs valides — utile pour alimenter des listes déroulantes côté frontend. `src/routes/room.routes.js:8`

### Double identifiant de chambre

Les routes utilisent soit un `_id` MongoDB (ObjectId) soit un `numero` (string, ex: `"101"`). Le frontend doit connaître les deux :

- Routes `/:id` → identifiant MongoDB (ex: `60f7c1b2e4b0a1234567890a`)
- Routes `/numero/:numero/status` → numéro de chambre lisible (ex: `101`)

### Le `PATCH` par numéro effectue un lookup préalable

Le endpoint `PATCH /numero/:numero/status` recherche d'abord la chambre par son numéro via le service réservation avant de mettre à jour. Si la chambre n'existe pas, il renvoie un 404. Ce n'est pas un simple alias du PATCH par ID — il y a un appel HTTP supplémentaire en interne. `src/controllers/room.controller.js:201-202`

### `motifBlocage` obligatoire uniquement pour le statut `bloquee`

Si le frontend envoie `statut: "bloquee"` sans `motifBlocage`, le backend renvoie une erreur 400. Pour tout autre statut, `motifBlocage` est ignoré et automatiquement mis à `null`. `src/controllers/room.controller.js:141-148`

### Le checkout est une action simple sans body

Le endpoint `PATCH /numero/:numero/checkout` ne nécessite aucun body. Il force le statut `sale` (chambre sale après départ). C'est une action sans risque (réversible en changeant le statut manuellement). `src/controllers/room.controller.js:238`

### Night Audit : action globale irréversible en une requête

Le endpoint `POST /night-audit` modifie **toutes** les chambres ayant le statut `propre` ou `controlee` en une seule requête, sans body. C'est une opération de clôture journalière. Le frontend doit demander une confirmation avant de déclencher cette action. `src/controllers/room.controller.js:270`

### Les notifications webhook sont fire-and-forget

Après chaque changement de statut, le service housekeeping notifie le front-office et le service réservation via des webhooks. Si l'un des deux services est indisponible, la notification échoue silencieusement (utilisation de `Promise.allSettled`). Le frontend ne doit pas attendre ces notifications ni les considerer comme critiques pour la validation d'une opération. `src/controllers/room.controller.js:128`

### Les réponses GET proviennent du service réservation

La quasi-totalité des données renvoyées par les endpoints GET (`/`, `/:id`, `/numero/:numero/status`) proviennent du service réservation via des appels proxy. Le format exact de la réponse dépend de ce service. Seul le endpoint `/numero/:nano/status` formate la réponse en un objet standardisé. `src/controllers/room.controller.js:37-38`

### Pas de modèle de données local pour la lecture

Le fichier `src/models/Room.js` définit un schéma Mongoose mais il n'est utilisé que par le seeder (`src/utils/seeder.js`). Les lectures passent systématiquement par le service réservation via HTTP. Le schéma Mongoose sert uniquement de documentation implicite des champs possibles.

### Valeurs de statut en français

Les statuts housekeeping utilisés par le frontend doivent être les valeurs en français : `sale`, `nettoyage_en_cours`, `propre`, `controlee`, `bloquee`. Le schéma Mongoose contient aussi des valeurs en anglais (`cleaning`, `clean`, `inspected`, `blocked`) mais elles ne sont pas dans `validStatuses` et seront rejetées par la validation. `src/controllers/room.controller.js:4` vs `src/models/Room.js:27`

### Pas de pagination

Aucun endpoint ne supporte de pagination. Le endpoint `GET /` retourne toutes les chambres d'un coup (via le service réservation). Le frontend devra gérer la pagination côté client si nécessaire.
