# service-reservations — Documentation API

Microservice Réservations & Planning du PMS OASIS.

---

## 1. Informations générales

| Champ                         | Valeur                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Nom du service                | `service-reservations`                                                                   |
| Port                          | `4003` (variable d'env `PORT`, défaut `4003` — `server.js:6`)                            |
| Préfixe routes publiques      | `/api/rooms`, `/api/bookings`, `/api/planning`, `/api/market-segments`, `/api/customers` |
| Préfixe routes inter-services | `/api/internal`                                                                          |
| Préfixe webhooks              | `/webhook`                                                                               |
| Health check                  | `GET /health` (pas d'auth — `src/app.js:17-19`)                                          |
| Framework                     | Express.js (`^4.19.2`)                                                                   |
| ORM                           | Mongoose (`^8.5.0`)                                                                      |
| Base de données               | MongoDB (URI dans `MONGO_URI`)                                                           |
| Langage                       | Node.js (CommonJS)                                                                       |
| Scheduler                     | `node-cron` — tâche toutes les 15 min (libération options expirées + alertes paiement)   |

### Variables d'environnement requises au démarrage (`server.js:8-16`)

- `JWT_SECRET` — secret pour vérifier les tokens JWT utilisateur
- `INTERNAL_SERVICE_SECRET` — secret partagé pour les appels inter-services
- `WEBHOOK_SHARED_SECRET` — secret partagé pour les webhooks (housekeeping)
- `MONGO_URI` — URI de connexion MongoDB
- `JWT_ISSUER` (optionnel, défaut `auth-service`)
- `JWT_AUDIENCE` (optionnel, défaut `pms-microservices`)

Le service **refuse de démarrer** si l'un des trois premiers secrets est manquant.

---

## 2. Endpoints exposés

### Routes publiques (authentification JWT utilisateur)

| Méthode  | Chemin exact                         | Rôles autorisés                    | Middleware(s)              | Description                                                               |
| -------- | ------------------------------------ | ---------------------------------- | -------------------------- | ------------------------------------------------------------------------- |
| `GET`    | `/health`                            | Aucun (public)                     | —                          | Health check                                                              |
| `GET`    | `/api/rooms`                         | Tous authentifiés                  | `verifyToken`              | Liste toutes les chambres (triées par numéro)                             |
| `POST`   | `/api/rooms`                         | `admin`, `manager`                 | `verifyToken`, `checkRole` | Créer une chambre                                                         |
| `PUT`    | `/api/rooms/:id`                     | `admin`, `manager`                 | `verifyToken`, `checkRole` | Modifier une chambre (exclut les champs housekeeping)                     |
| `GET`    | `/api/bookings`                      | Tous authentifiés                  | `verifyToken`              | Liste des réservations (filtres query: `status`, `segment`, `from`, `to`) |
| `GET`    | `/api/bookings/payment-alerts`       | Tous authentifiés                  | `verifyToken`              | Liste des alertes de paiement en cours                                    |
| `GET`    | `/api/bookings/:id`                  | Tous authentifiés                  | `verifyToken`              | Détail d'une réservation                                                  |
| `POST`   | `/api/bookings`                      | `admin`, `manager`, `receptionist` | `verifyToken`, `checkRole` | Créer une réservation                                                     |
| `POST`   | `/api/bookings/release-expired`      | `admin`, `manager`, `receptionist` | `verifyToken`, `checkRole` | Libérer manuellement les options expirées                                 |
| `POST`   | `/api/bookings/check-payment-alerts` | `admin`, `manager`, `receptionist` | `verifyToken`, `checkRole` | Déclencher le check des alertes paiement                                  |
| `PUT`    | `/api/bookings/:id`                  | `admin`, `manager`, `receptionist` | `verifyToken`, `checkRole` | Modifier une réservation                                                  |
| `PATCH`  | `/api/bookings/:id/status`           | `admin`, `manager`, `receptionist` | `verifyToken`, `checkRole` | Changer le statut (cycle de vie)                                          |
| `PATCH`  | `/api/bookings/:id/shift`            | `admin`, `manager`, `receptionist` | `verifyToken`, `checkRole` | Déplacer une réservation vers une autre chambre                           |
| `DELETE` | `/api/bookings/:id`                  | `admin`, `manager`, `receptionist` | `verifyToken`, `checkRole` | Annuler une réservation (passe en `status_cancelled`)                     |
| `GET`    | `/api/planning`                      | Tous authentifiés                  | `verifyToken`              | Grille du planning (query: `from`, `to` requis)                           |
| `GET`    | `/api/market-segments`               | Tous authentifiés                  | `verifyToken`              | Liste des segments de marché                                              |
| `GET`    | `/api/customers`                     | Tous authentifiés                  | `verifyToken`              | Liste des clients                                                         |
| `GET`    | `/api/customers/search`              | Tous authentifiés                  | `verifyToken`              | Recherche clients (query: `q`, min 2 caractères)                          |
| `GET`    | `/api/customers/:id`                 | Tous authentifiés                  | `verifyToken`              | Détail d'un client                                                        |
| `POST`   | `/api/customers`                     | `admin`, `manager`, `receptionist` | `verifyToken`, `checkRole` | Créer un client                                                           |
| `PUT`    | `/api/customers/:id`                 | `admin`, `manager`, `receptionist` | `verifyToken`, `checkRole` | Modifier un client                                                        |

### Routes inter-services (secret partagé, pas de JWT)

| Méthode | Chemin exact                               | Auth                                      | Description                                            |
| ------- | ------------------------------------------ | ----------------------------------------- | ------------------------------------------------------ |
| `PATCH` | `/api/rooms/:id/housekeeping-status`       | `X-Internal-Secret`                       | Mettre à jour le statut housekeeping d'une chambre     |
| `GET`   | `/api/internal/bookings/:id`               | `X-Internal-Secret` ou `X-Webhook-Secret` | Récupérer une réservation par ID ou référence          |
| `PATCH` | `/api/internal/bookings/:id/status`        | `X-Internal-Secret` ou `X-Webhook-Secret` | Changer le statut d'une réservation                    |
| `PATCH` | `/api/internal/bookings/:id`               | `X-Internal-Secret` ou `X-Webhook-Secret` | Mettre à jour des champs arbitraires d'une réservation |
| `GET`   | `/api/internal/transfers?date=YYYY-MM-DD`  | `X-Internal-Secret` ou `X-Webhook-Secret` | Réservations avec transfert à une date                 |
| `GET`   | `/api/internal/departures?date=YYYY-MM-DD` | `X-Internal-Secret` ou `X-Webhook-Secret` | Réservations avec départ à une date                    |
| `GET`   | `/api/internal/arrivals?date=YYYY-MM-DD`   | `X-Internal-Secret` ou `X-Webhook-Secret` | Réservations avec arrivée à une date                   |
| `GET`   | `/api/internal/occupancy?date=YYYY-MM-DD`  | `X-Internal-Secret` ou `X-Webhook-Secret` | Taux d'occupation prévisionnel                         |

### Routes webhooks

| Méthode | Chemin exact           | Auth               | Description                                                 |
| ------- | ---------------------- | ------------------ | ----------------------------------------------------------- |
| `POST`  | `/webhook/room-status` | `X-Webhook-Secret` | Recevoir le statut housekeeping depuis service-housekeeping |

---

## 3. Authentification

### JWT utilisateur (`src/middlewares/auth.middleware.js:10-37`)

| Champ                              | Valeur                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| Header attendu                     | `Authorization: Bearer <token>`                                                          |
| Algorithme                         | Détecté automatiquement par `jsonwebtoken` (dépend du token émis)                        |
| Champ du rôle dans le payload      | **`role`** (singulier) — accès via `decoded.role` (`auth.middleware.js:32`)              |
| Champ de l'identifiant utilisateur | **`sub`** — accès via `decoded.sub` (`auth.middleware.js:31`)                            |
| Issuer vérifié                     | `process.env.JWT_ISSUER` ou `"auth-service"` par défaut (`auth.middleware.js:22`)        |
| Audience vérifiée                  | `process.env.JWT_AUDIENCE` ou `"pms-microservices"` par défaut (`auth.middleware.js:23`) |
| Erreur token manquant              | `401 — { message: "Token manquant" }`                                                    |
| Erreur token invalide/expiré       | `403 — { message: "Token invalide ou expiré" }`                                          |

### Auth inter-services — routes `/api/internal/*` (`src/routes/internalRoutes.js:9-21`)

- Header attendu : `X-Internal-Secret` **ou** `X-Webhook-Secret`
- Valeur attendue : identique à `process.env.INTERNAL_SERVICE_SECRET`
- Erreur : `403 — { message: "Accès interne refusé — secret manquant ou invalide" }`

### Auth webhook — route `/webhook/room-status` (`src/controllers/webhookController.js:5-8`)

- Header attendu : `X-Webhook-Secret`
- Valeur attendue : identique à `process.env.WEBHOOK_SHARED_SECRET`
- Erreur : `401 — { message: "Secret webhook invalide" }`

### Auth housekeeping — route `/api/rooms/:id/housekeeping-status` (`src/controllers/roomController.js:51-53`)

- Header attendu : `X-Internal-Secret`
- Valeur attendue : identique à `process.env.INTERNAL_SERVICE_SECRET`
- Erreur : `401 — { message: "Secret interne invalide" }`

---

## 4. Rôles et permissions

### Rôles utilisés (valeurs exactes, casse-sensitive)

| Rôle           | Utilisé dans                                        |
| -------------- | --------------------------------------------------- |
| `admin`        | `checkRole` sur rooms, bookings, customers          |
| `manager`      | `checkRole` sur rooms, bookings, customers          |
| `receptionist` | `checkRole` sur bookings, customers (pas sur rooms) |

### Permissions par rôle

| Rôle           | Lecture (GET) | Écriture rooms | Écriture bookings | Écriture customers | Override déplacement chambre |
| -------------- | ------------- | -------------- | ----------------- | ------------------ | ---------------------------- |
| `admin`        | Oui           | Oui            | Oui               | Oui                | Oui                          |
| `manager`      | Oui           | Oui            | Oui               | Oui                | Oui                          |
| `receptionist` | Oui           | Non            | Oui               | Oui                | Non                          |

### Override admin pour room shifting (`src/utils/authHelper.js:5,21`)

Le déplacement de chambre (`PATCH /api/bookings/:id/shift`) vérifie un **second** token JWT (dans le header Authorization déjà présent) pour autoriser un "override" si :

- La nouvelle chambre est d'une **catégorie différente**, **ou**
- La chambre cible est déjà réservée sur la même période

Seuls `admin` et `manager` sont autorisés à valider cet override (`ROLES_ALLOWED_TO_OVERRIDE`).

### Rôles définis mais non utilisés dans les routes

| Rôle          | Permissions définies (`auth.middleware.js:3-6`)                           | Routes applicables           |
| ------------- | ------------------------------------------------------------------------- | ---------------------------- |
| `comptable`   | `read_invoices`, `read_payments`, `read_financial_reports`, `export_data` | Aucune route dans ce service |
| `gouvernante` | `housekeeping_status`, `room_restock`, `report_issues`                    | Aucune route dans ce service |

---

## 5. Contrats de requête et réponse

### 5.1 Chambres

#### `GET /api/rooms`

Réponse `200` :

```json
[
  {
    "_id": "string (ObjectId)",
    "roomId": "string",
    "name": "string",
    "number": "string (unique)",
    "category": "Standard | Supérieure | Suite | Suite Deluxe | Lodge | Villa",
    "capacity": "number",
    "floor": "number",
    "priceMultiplier": "number",
    "isActive": "boolean",
    "housekeepingStatus": "string (défaut: propre)",
    "motifBlocage": "string | null",
    "createdAt": "Date",
    "updatedAt": "Date"
  }
]
```

#### `POST /api/rooms`

Body attendu (champs Mongoose Room — `src/models/Room.js:3-69`) :

| Champ             | Type      | Obligatoire | Notes                                                                     |
| ----------------- | --------- | ----------- | ------------------------------------------------------------------------- |
| `number`          | `string`  | **Oui**     | Unique                                                                    |
| `category`        | `string`  | **Oui**     | Enum: `Standard`, `Supérieure`, `Suite`, `Suite Deluxe`, `Lodge`, `Villa` |
| `capacity`        | `number`  | Non         | Défaut: 2                                                                 |
| `floor`           | `number`  | Non         | Défaut: 0                                                                 |
| `priceMultiplier` | `number`  | Non         | Défaut: 1                                                                 |
| `isActive`        | `boolean` | Non         | Défaut: true                                                              |

Réponse `201` : objet Room complet.

Erreurs :

- `400 — { message: "..." }` (erreur validation Mongoose)

#### `PUT /api/rooms/:id`

Body : mêmes champs que POST. **Les champs suivants sont systématiquement supprimés du body** avant update (`roomController.js:31-32`) :

- `housekeepingStatus`
- `motifBlocage`
- `status`
- `blockReason`

Réponse `200` : objet Room mis à jour.

Erreurs :

- `400 — { message: "..." }`
- `404 — { message: "Chambre introuvable" }`

#### `PATCH /api/rooms/:id/housekeeping-status` (interne)

Body :

| Champ                | Type     | Obligatoire  | Notes                                             |
| -------------------- | -------- | ------------ | ------------------------------------------------- |
| `housekeepingStatus` | `string` | **Oui**      | Statut ménage                                     |
| `motifBlocage`       | `string` | Conditionnel | Obligatoire si `housekeepingStatus === "bloquee"` |

Réponse `200` : objet Room mis à jour.

Erreurs :

- `400 — { message: "housekeepingStatus requis" }`
- `400 — { message: "Validation échouée", details: "..." }`
- `400 — { message: "Identifiant de chambre invalide" }`
- `401 — { message: "Secret interne invalide" }`
- `404 — { message: "Chambre non trouvée" }`

---

### 5.2 Réservations

#### `GET /api/bookings`

Query params optionnels :
| Param | Type | Description |
|---|---|---|
| `status` | `string` | Filtrer par statut |
| `segment` | `string` | Filtrer par ID du marketSegment |
| `from` | `string (Date)` | Date début (inclusive) |
| `to` | `string (Date)` | Date fin (inclusive) |

Réponse `200` :

```json
[
  {
    "_id": "ObjectId",
    "reference": "string (auto: R-YYYY-XXX)",
    "bookingId": "string",
    "status": "string (enum BOOKING_STATUSES)",
    "guest": {
      "lastName": "string",
      "firstName": "string",
      "nationality": "string",
      "idNumber": "string",
      "email": "string",
      "phone": "string"
    },
    "customer": "ObjectId | null (populé avec fiche Customer si lié)",
    "room": "ObjectId (populé: { number, category })",
    "marketSegment": "ObjectId (populé: { code, label, category })",
    "checkInDate": "Date",
    "checkOutDate": "Date",
    "pax": "number",
    "regime": "BB | DP | PC",
    "estimatedTotal": "number",
    "totalAmount": "number",
    "paidAmount": "number",
    "status": "string",
    "statusHistory": [{ "status": "string", "changedAt": "Date" }],
    "createdAt": "Date",
    "updatedAt": "Date"
  }
]
```

Tri : `checkInDate` croissant.

#### `GET /api/bookings/:id`

Réponse `200` : objet Booking complet (room et marketSegment peuplés sans restrictions de champs select).

Erreurs : `404`, `500`.

#### `POST /api/bookings`

Body (`src/controllers/bookingController.js:47` + `src/models/Booking.js:44-189`) :

| Champ             | Type                | Obligatoire      | Notes                                                                                |
| ----------------- | ------------------- | ---------------- | ------------------------------------------------------------------------------------ | ---------------------- | ---------------- | ---------- | ---------------------------------- |
| `room`            | `ObjectId (string)` | **Oui**          | ID de la chambre                                                                     |
| `checkInDate`     | `Date`              | **Oui**          |                                                                                      |
| `checkOutDate`    | `Date`              | **Oui**          |                                                                                      |
| `guest`           | `object`            | **Oui**          | `{ lastName (required), firstName (required), nationality, idNumber, email, phone }` |
| `marketSegment`   | `ObjectId (string)` | **Oui**          | ID du segment de marché                                                              |
| `pax`             | `number`            | Non              | Défaut: 1                                                                            |
| `regime`          | `string`            | Non              | Enum: `BB`, `DP`, `PC`. Défaut: `BB`                                                 |
| `estimatedTotal`  | `number`            | **Oui** (schema) | Montant estimé                                                                       |
| `discount`        | `object`            | Non              | `{ type: "pourcentage"                                                               | "percentage"           | "valeur_absolue" | "absolute" | "absolute_value", value: number }` |
| `notes`           | `string`            | Non              |                                                                                      |
| `comments`        | `string`            | Non              |                                                                                      |
| `agencyId`        | `string`            | Non              | Réf. agence (pour segments OTA/b2b)                                                  |
| `corporateId`     | `string`            | Non              | Réf. société                                                                         |
| `roomRate`        | `number`            | Non              | Tarif journalier                                                                     |
| `billToPartnerId` | `string`            | Non              |                                                                                      |
| `billToLabel`     | `string`            | Non              |                                                                                      |
| `cityTax`         | `object`            | Non              | `{ mode: "payable_a_reservation"                                                     | "payable_sur_place" }` |
| `deposit`         | `object`            | Non              | `{ amount: number, date: Date }`                                                     |

**Comportement spécial** (`bookingController.js:44-111`) :

- Si `guest` est fourni avec un `email` ou un couple `lastName`/`firstName` qui correspond à un client existant, la réservation est liée à ce client (`customer` mis à jour). Sinon, un nouveau `Customer` est créé automatiquement.
- Le `totalAmount` est calculé automatiquement via `computeTotalAmount(estimatedTotal, discount)`.
- Conflit de dates vérifié : si la chambre est déjà réservée sur la période chevauchante (statuts `status_option`, `status_confirmed`, `status_voucher`, `status_checked_in`), erreur `409`.
- La `reference` est auto-générée au format `R-YYYY-XXX` par le pre-save hook (`Booking.js:192-198`).
- Si `status === "status_option"` et pas d'`optionExpiryDate`, elle est auto-définie à +24h (`Booking.js:229-231`).
- Si `status === "status_confirmed"` et pas de `paymentDueDate`, elle est auto-définie à +48h (`Booking.js:237-239`).

Réponse `201` :

```json
{
  "booking": {
    /* objet Booking complet */
  },
  "customerStatus": "aucun client renseigné | nouveau client créé | client existant retrouvé et lié",
  "customer": {
    /* objet Customer ou null */
  }
}
```

Erreurs :

- `400 — { message: "Chambre invalide" }`
- `409 — { message: "Conflit : la chambre X est déjà réservée sur cette période (réf. Y)" }`
- `400 — { message: "..." }` (validation Mongoose)

#### `PUT /api/bookings/:id`

Body : champs arbitraires de Booking. Si `estimatedTotal` ou `discount` est fourni, le `totalAmount` est recalculé (`bookingController.js:182-188`).

Réponse `200` : objet Booking mis à jour.

Erreurs : `400`, `404`.

#### `PATCH /api/bookings/:id/status`

Body :

| Champ            | Type     | Obligatoire | Notes                                                  |
| ---------------- | -------- | ----------- | ------------------------------------------------------ |
| `status`         | `string` | **Oui**     | Doit être dans `BOOKING_STATUSES`                      |
| `paymentDueDate` | `Date`   | Non         | Appliqué uniquement si `status === "status_confirmed"` |

**Contrainte** : impossible de modifier le statut d'une réservation déjà `status_checked_out` → `403`.

Réponse `200` : objet Booking mis à jour.

Erreurs :

- `400 — { message: "Statut invalide" }`
- `403 — { message: "Dossier clôturé : impossible de modifier une réservation déjà check-out" }`
- `404 — { message: "Réservation introuvable" }`

#### `PATCH /api/bookings/:id/shift`

Body :

| Champ               | Type                | Obligatoire | Notes                                                           |
| ------------------- | ------------------- | ----------- | --------------------------------------------------------------- |
| `newRoomId`         | `ObjectId (string)` | **Oui**     | ID de la chambre cible                                          |
| `newEstimatedTotal` | `number`            | Non         | Requis si changement de catégorie (pour recalculer totalAmount) |

**Contraintes** (`bookingController.js:114-178`) :

- Impossible de déplacer une réservation `status_checked_out` → `403`.
- Si la chambre cible est d'une catégorie différente **ou** déjà réservée, un override admin/manager est requis (re-vérification du token JWT).
- En cas de refus d'override → `403` avec `requiresAdminOverride: true`.
- Un commentaire est ajouté automatiquement au champ `comments`.

Réponse `200` :

```json
{
  "booking": {
    /* objet Booking mis à jour */
  },
  "tariffAdjustmentSuggested": "boolean",
  "message": "string"
}
```

Erreurs :

- `400 — { message: "Chambre cible invalide" }`
- `403 — { message: "Dossier clôturé : ..." }` ou `{ message: "Déplacement refusé : ...", requiresAdminOverride: true, reason: "...", categoryMismatch: "boolean", roomConflict: "boolean" }`
- `404 — { message: "Réservation introuvable" }`

#### `DELETE /api/bookings/:id`

Met à jour le statut en `status_cancelled` (pas de suppression physique).

Réponse `200` : objet Booking mis à jour.

Erreurs : `400`, `404`.

#### `POST /api/bookings/release-expired`

Aucun body.

Réponse `200` :

```json
{
  "message": "X option(s) expirée(s) libérée(s)",
  "released": [
    /* tableau de Booking annulés */
  ]
}
```

#### `POST /api/bookings/check-payment-alerts`

Aucun body.

Réponse `200` :

```json
{
  "message": "X nouvelle(s) alerte(s) de paiement déclenchée(s)",
  "atRisk": [
    {
      /* Booking peuplé avec room.number et customer {lastName, firstName, email, phone} */
    }
  ]
}
```

#### `GET /api/bookings/payment-alerts`

Réponse `200` : tableau de Bookings à risque (`status_confirmed`, `paymentDueDate` dépassée, `deposit.amount <= 0`), triés par `paymentDueDate` croissant. Room peuplée (`number`), Customer peuplé (`lastName`, `firstName`, `email`, `phone`).

---

### 5.3 Planning

#### `GET /api/planning`

Query params **requis** :
| Param | Type | Format |
|---|---|---|
| `from` | `string` | `YYYY-MM-DD` |
| `to` | `string` | `YYYY-MM-DD` |

Réponse `200` :

```json
{
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD",
  "planning": [
    {
      "room": {
        /* objet Room complet, uniquement isActive=true */
      },
      "bookings": [
        {
          "_id": "ObjectId",
          "reference": "string",
          "guest": { "lastName": "string", "firstName": "string" },
          "room": "ObjectId",
          "checkInDate": "Date",
          "checkOutDate": "Date",
          "status": "string",
          "marketSegment": { "code": "string", "label": "string" }
        }
      ]
    }
  ]
}
```

Les réservations incluses sont celles qui se chevauchent avec la période `[from, to[` (statut ≠ `status_cancelled`).

Erreurs :

- `400 — { message: "Paramètres 'from' et 'to' requis (YYYY-MM-DD)" }`
- `500`

---

### 5.4 Segments de marché

#### `GET /api/market-segments`

Réponse `200` :

```json
[
  {
    "_id": "ObjectId",
    "code": "string (enum: direct_walk_in, direct_phone_mail, direct_website, ota_booking, ota_expedia, ota_hotels, ota_agoda, ota_airbnb, b2b_agency, b2b_corporate)",
    "category": "DIRECT | OTA | PARTENAIRES",
    "label": "string",
    "partnerRefId": "string | null",
    "createdAt": "Date",
    "updatedAt": "Date"
  }
]
```

Tri : `category` puis `label` alphabétique.

---

### 5.5 Clients

#### `GET /api/customers`

Réponse `200` : tableau de tous les clients, triés par `lastName`.

#### `GET /api/customers/search?q=terme`

Query param `q` requis, minimum 2 caractères.

Réponse `200` : tableau (max 10 résultats) de clients dont `email`, `lastName` ou `firstName` matchent le terme (regex insensible à la casse).

Erreurs :

- `400 — { message: "Le paramètre 'q' doit contenir au moins 2 caractères" }`

#### `GET /api/customers/:id`

Réponse `200` : objet Customer.

Erreurs : `404`, `500`.

#### `POST /api/customers`

Body (`src/models/Customer.js:7-30`) :

| Champ             | Type       | Obligatoire | Notes                        |
| ----------------- | ---------- | ----------- | ---------------------------- |
| `lastName`        | `string`   | **Oui**     |                              |
| `firstName`       | `string`   | **Oui**     |                              |
| `email`           | `string`   | Non         | Lowercase, trim, défaut null |
| `phone`           | `string`   | Non         |                              |
| `nationality`     | `string`   | Non         |                              |
| `idNumber`        | `string`   | Non         | N° Passeport / CIN           |
| `historicalNotes` | `[string]` | Non         | Défaut: []                   |

Réponse `201` : objet Customer créé.

Erreurs : `400` (validation Mongoose).

#### `PUT /api/customers/:id`

Body : champs arbitraires de Customer.

Réponse `200` : objet Customer mis à jour.

Erreurs : `400`, `404`.

---

### 5.6 Routes inter-services

#### `GET /api/internal/bookings/:id`

Le paramètre `:id` accepte un **ObjectId MongoDB** ou une **référence** (ex: `R-2026-001`). La recherche tente d'abord par ObjectId, puis fallback par champ `reference` (`internalRoutes.js:28-48`).

Réponse `200` : objet Booking complet (room, customer, marketSegment peuplés).

Erreurs : `404`, `500`.

#### `PATCH /api/internal/bookings/:id/status`

Body : `{ "status": "string" }` — doit être dans `BOOKING_STATUSES`.

Réponse `200` : objet Booking mis à jour.

Erreurs : `400` (statut invalide), `404`, `500`.

#### `PATCH /api/internal/bookings/:id`

Body : champs arbitraires (ex: `actualCheckIn`, `actualCheckOut`, etc.). Appliqué via `Object.assign` sans validation schéma.

Réponse `200` : objet Booking mis à jour.

Erreurs : `400`, `404`.

#### `GET /api/internal/transfers?date=YYYY-MM-DD`

Réponse `200` :

```json
[
  {
    "bookingId": "ObjectId",
    "reference": "string",
    "roomNumber": "string",
    "guestName": "string (lastName firstName)",
    "amount": "number"
  }
]
```

Filtre : statuts `status_checked_in` ou `status_checked_out`, `updatedAt` dans la journée.

#### `GET /api/internal/departures?date=YYYY-MM-DD`

Réponse `200` :

```json
[
  {
    "bookingId": "ObjectId",
    "reference": "string",
    "roomNumber": "string",
    "category": "string",
    "guestName": "string",
    "guestEmail": "string",
    "guestPhone": "string",
    "checkInDate": "Date",
    "checkOutDate": "Date",
    "status": "string"
  }
]
```

Filtre : statuts `status_confirmed` ou `status_checked_in`, `checkOutDate` dans la journée.

#### `GET /api/internal/arrivals?date=YYYY-MM-DD`

Même structure que departures. Filtre : statuts `status_option`, `status_confirmed`, `status_voucher`, `checkInDate` dans la journée.

#### `GET /api/internal/occupancy?date=YYYY-MM-DD`

Réponse `200` :

```json
{
  "date": "YYYY-MM-DD",
  "totalRooms": "number",
  "occupied": "number",
  "available": "number",
  "arriving": "number",
  "departing": "number",
  "occupancyRate": "string (pourcentage, 1 décimale)"
}
```

Toutes les routes internes retournent `400 — { message: "Paramètre 'date' requis (YYYY-MM-DD)" }` si le paramètre `date` est absent.

---

### 5.7 Webhook

#### `POST /webhook/room-status`

Header : `X-Webhook-Secret` (doit correspondre à `WEBHOOK_SHARED_SECRET`).

Body :

| Champ          | Type     | Obligatoire  | Notes                                 |
| -------------- | -------- | ------------ | ------------------------------------- |
| `numero`       | `string` | **Oui**      | Numéro de la chambre                  |
| `statut`       | `string` | **Oui**      | Nouveau statut housekeeping           |
| `motifBlocage` | `string` | Conditionnel | Obligatoire si `statut === "bloquee"` |

Réponse `200` :

- `{ message: "Statut de chambre mis à jour", room: { /* Room */ } }` si chambre trouvée
- `{ message: "Chambre introuvable localement" }` si chambre inconnue (retourne quand même 200 pour éviter les retries infinies — `webhookController.js:29-30`)

Erreurs :

- `401 — { message: "Secret webhook invalide" }`
- `400 — { message: "Payload invalide" }`
- `400 — { message: "Validation échouée", details: "..." }`

---

### 5.8 Erreurs globales

| Code                       | Format                                  | Source             |
| -------------------------- | --------------------------------------- | ------------------ |
| `404` (route inexistante)  | `{ message: "Route non trouvée" }`      | `src/app.js:30-32` |
| `500` (erreur non catchée) | `{ message: "Erreur serveur interne" }` | `src/app.js:34-37` |

---

## 6. Dépendances externes

Ce service **n'appelle aucun autre service backend** via HTTP client. Il n'y a aucun `fetch`, `axios`, ou `http.request` sortant dans le code.

Les seules communications sortantes sont :

- **MongoDB** (via Mongoose) — base de données locale/partagée
- **Scheduler cron** — tâche interne toutes les 15 min (libération options + alertes paiement)

Le service **reçoit** des appels de :

- `service-housekeeping` via `/webhook/room-status` (webhook) et `/api/rooms/:id/housekeeping-status` (appel interne)
- Potentiellement `service-front-office` via `/api/internal/*` (arrivals, departures, transfers, occupancy)

---

## 7. Points d'attention pour le frontend

### Cycle de vie des réservations

Les statuts valides sont (`src/models/Booking.js:5-13`) :

```
status_option → status_confirmed | status_voucher → status_checked_in → status_checked_out
```

Avec `status_no_show` et `status_cancelled` accessibles depuis la plupart des états (sauf après `status_checked_out`).

**Tentative de modification d'une réservation `status_checked_out`** → rejet `403` avec message "Dossier clôturé" (vérifié sur `PATCH /status`, `PUT /:id`, `PATCH /:shift`).

### Auto-génération de la référence

La `reference` (format `R-YYYY-XXX`) est générée automatiquement côté serveur au moment du `save()` (`Booking.js:192-198`). Le frontend ne doit **pas** envoyer de champ `reference`.

### Options expirées

Une option (`status_option`) a une durée de vie de **24h** (`DEFAULT_OPTION_HOURS`). Passé ce délai, le scheduler cron la libère automatiquement (passe en `status_cancelled`). Le frontend peut aussi forcer la libération via `POST /api/bookings/release-expired`.

### Alertes de paiement

Une réservation `status_confirmed` a un `paymentDueDate` de **48h** (`DEFAULT_PAYMENT_DUE_HOURS`). Passé ce délai sans acompte (`deposit.amount <= 0`), une alerte est générée (logging + flag `paymentAlertSent`). Le frontend peut lister ces alertes via `GET /api/bookings/payment-alerts`.

### Room shifting — double authentification

La route `PATCH /api/bookings/:id/shift` peut nécessiter un **override admin/manager** si :

- La nouvelle chambre est d'une catégorie différente, **ou**
- La chambre cible est déjà réservée sur la même période

En cas de refus, la réponse contient `requiresAdminOverride: true` avec la raison détaillée (`categoryMismatch`, `roomConflict`). Le frontend doit afficher cette information et éventuellement demander une confirmation admin.

### Le champ `updateRoom` ignore les champs housekeeping

`PUT /api/rooms/:id` supprime systématiquement `housekeepingStatus`, `motifBlocage`, `status`, `blockReason` du body (`roomController.js:31-32`). Ces champs ne doivent être modifiés que via les canaux inter-services (webhousekeeping).

### Recherche de clients — autocomplétion

`GET /api/customers/search?q=terme` exige au moins **2 caractères**. Retourne max **10 résultats**. Utile pour l'autocomplétion lors de la création de réservation.

### Le body `PATCH /api/internal/bookings/:id` accepte des champs arbitraires

Cette route interne applique `Object.assign(booking, req.body)` sans validation (`internalRoutes.js:104`). Elle est réservée aux appels inter-services, pas au frontend utilisateur direct.

### Calcul automatique du totalAmount

`totalAmount` est recalculé automatiquement à partir de `estimatedTotal` et `discount` lors de :

- La création (`POST /api/bookings`)
- La mise à jour (`PUT /api/bookings/:id`) si `estimatedTotal` ou `discount` change
- Le room shifting si catégorie changée

Le frontend n'a **pas besoin** d'envoyer `totalAmount`.

### Webhook room-status retourne 200 même si chambre inconnue

`POST /webhook/room-status` retourne `200` avec un message d'avertissement si la chambre n'est pas trouvée, pour éviter les retries infinies du service appelant (`webhookController.js:29-30`).
