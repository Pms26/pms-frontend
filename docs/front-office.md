# Documentation API — Service Front Office (PMS OASIS)

> Document généré par audit du code source. Toutes les informations ci-dessous sont
> vérifiées directement dans le code (fichiers référencés entre parenthèses).

---

## 1. Informations générales

| Champ                  | Valeur                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Nom du service**     | `front-office-service` (`package.json:2`)                                                                                      |
| **Port**               | `4005` (configurable via `PORT` dans `.env`, fallback `4005`) (`server.js:36`)                                                 |
| **Préfixe des routes** | `/api/rooms`, `/api/checkin`, `/api/checkout`, `/api/folios`, `/api/payments`, `/api/invoices`, `/webhook` (`server.js:14-20`) |
| **Framework**          | Express.js v5 (`package.json:16`)                                                                                              |
| **ORM**                | Drizzle ORM v0.45 (`package.json:14`)                                                                                          |
| **Base de données**    | PostgreSQL via `pg` v8 (`package.json:18`)                                                                                     |
| **Temps réel**         | Socket.IO v4.8 (`package.json:19`, `src/socket.js`)                                                                            |

---

## 2. Endpoints exposés

### 2.1 Route racine & utilitaires

| Méthode | Chemin exact | Rôles autorisés        | Middleware(s) | Description                               |
| ------- | ------------ | ---------------------- | ------------- | ----------------------------------------- |
| GET     | `/`          | Tous (non authentifié) | Aucun         | Health check — retourne statut du service |
| POST    | `/api/seed`  | Tous (non authentifié) | Aucun         | Exécute le seed DB (dev only)             |

> `server.js:22-34`

### 2.2 Chambres (`/api/rooms`)

| Méthode | Chemin exact                       | Rôles autorisés                                               | Middleware(s)            | Description                                     |
| ------- | ---------------------------------- | ------------------------------------------------------------- | ------------------------ | ----------------------------------------------- |
| GET     | `/api/rooms`                       | `admin`, `manager`, `housekeeping_supervisor`, `receptionist` | `auth`, `authorizeRoles` | Liste toutes les chambres actives               |
| GET     | `/api/rooms/status/:status`        | `admin`, `manager`, `housekeeping_supervisor`, `receptionist` | `auth`, `authorizeRoles` | Filtre chambres par statut housekeeping         |
| GET     | `/api/rooms/:roomId`               | `admin`, `manager`, `housekeeping_supervisor`, `receptionist` | `auth`, `authorizeRoles` | Détail d'une chambre par ID ou numéro           |
| PATCH   | `/api/rooms/:roomId/status`        | `admin`, `manager`, `housekeeping_supervisor`                 | `auth`, `authorizeRoles` | Met à jour le statut housekeeping d'une chambre |
| PATCH   | `/api/rooms/numero/:numero/status` | `admin`, `manager`, `housekeeping_supervisor`                 | `auth`, `authorizeRoles` | Met à jour le statut housekeeping par numéro    |

> `routes/rooms.js:7-11`

### 2.3 Check-in (`/api/checkin`)

| Méthode | Chemin exact                       | Rôles autorisés                    | Middleware(s)            | Description                                |
| ------- | ---------------------------------- | ---------------------------------- | ------------------------ | ------------------------------------------ |
| GET     | `/api/checkin/:bookingId`          | Tous (authentifié uniquement)      | `auth`                   | Détails de la réservation pour le check-in |
| GET     | `/api/checkin/:bookingId/proforma` | Tous (authentifié uniquement)      | `auth`                   | Génère la facture pro-forma                |
| POST    | `/api/checkin/:bookingId`          | `admin`, `manager`, `receptionist` | `auth`, `authorizeRoles` | Traite le check-in                         |
| DELETE  | `/api/checkin/:bookingId`          | `admin`, `manager`, `receptionist` | `auth`, `authorizeRoles` | Annule un check-in (si pas de prestations) |

> `routes/checkin.js:7-10`

### 2.4 Check-out (`/api/checkout`)

| Méthode | Chemin exact                         | Rôles autorisés                    | Middleware(s)            | Description                                 |
| ------- | ------------------------------------ | ---------------------------------- | ------------------------ | ------------------------------------------- |
| GET     | `/api/checkout/:bookingId/statement` | Tous (authentifié uniquement)      | `auth`                   | Extrait de compte (Folio A + B + paiements) |
| POST    | `/api/checkout/:bookingId`           | `admin`, `manager`, `receptionist` | `auth`, `authorizeRoles` | Traite le check-out avec encaissement       |

> `routes/checkout.js:7-8`

### 2.5 Folios (`/api/folios`)

| Méthode | Chemin exact                            | Rôles autorisés                                 | Middleware(s)            | Description                                  |
| ------- | --------------------------------------- | ----------------------------------------------- | ------------------------ | -------------------------------------------- |
| GET     | `/api/folios/:folioId`                  | `admin`, `manager`, `receptionist`, `comptable` | `auth`, `authorizeRoles` | Détail complet du folio (toutes prestations) |
| POST    | `/api/folios/:folioId/items`            | `admin`, `manager`, `receptionist`              | `auth`, `authorizeRoles` | Ajoute une prestation au folio               |
| PATCH   | `/api/folios/:folioId/items/visibility` | `admin`, `manager`, `receptionist`              | `auth`, `authorizeRoles` | Masquage groupé de prestations (impression)  |
| PATCH   | `/api/folios/items/:itemId/visibility`  | `admin`, `manager`, `receptionist`              | `auth`, `authorizeRoles` | Masquage individuel d'une prestation         |
| DELETE  | `/api/folios/items/:itemId`             | `admin`, `manager`                              | `auth`, `authorizeRoles` | Supprime une prestation du folio             |

> `routes/folios.js:7-11`

### 2.6 Paiements (`/api/payments`)

| Méthode | Chemin exact    | Rôles autorisés               | Middleware(s) | Description                                 |
| ------- | --------------- | ----------------------------- | ------------- | ------------------------------------------- |
| GET     | `/api/payments` | Tous (authentifié uniquement) | `auth`        | Paiements du jour (paramètre `date` requis) |

> `routes/payments.js:6`

### 2.7 Factures (`/api/invoices`)

| Méthode | Chemin exact    | Rôles autorisés               | Middleware(s) | Description                                       |
| ------- | --------------- | ----------------------------- | ------------- | ------------------------------------------------- |
| GET     | `/api/invoices` | Tous (authentifié uniquement) | `auth`        | Folios clôturés du jour (paramètre `date` requis) |

> `routes/invoices.js:6`

### 2.8 Webhooks (`/webhook`)

| Méthode | Chemin exact           | Rôles autorisés        | Middleware(s)                                    | Description                                                       |
| ------- | ---------------------- | ---------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| POST    | `/webhook/room-status` | Aucun (secret partagé) | Validation `X-Webhook-Secret` dans le contrôleur | Reçoit les mises à jour de statut chambre du service housekeeping |

> `src/routes/webhooks.js:5`, `src/controllers/webhookController.js:8-11`

---

## 3. Authentification

### Mécanisme de vérification du token

| Champ                 | Valeur                                                                                |
| --------------------- | ------------------------------------------------------------------------------------- |
| **Header**            | `Authorization: Bearer <token>`                                                       |
| **Extraction**        | `req.header('Authorization')?.replace('Bearer ', '')` (`middleware/auth.js:4`)        |
| **Vérification**      | `jwt.verify(token, JWT_SECRET, { issuer, audience })` (`middleware/auth.js:11-13`)    |
| **Algorithme**        | Déterminé par la signature du token (JWT library gère automatiquement)                |
| **Clé secrète**       | `JWT_SECRET` (env) — 128 hex chars (`auth.js:11`)                                     |
| **Issuer attendu**    | `auth-service` (env `JWT_ISSUER`, fallback `auth-service`) (`auth.js:12`)             |
| **Audience attendue** | `pms-microservices` (env `JWT_AUDIENCE`, fallback `pms-microservices`) (`auth.js:13`) |
| **Expiration**        | Validée par `jsonwebtoken` via le champ `exp` du token (comportement par défaut)      |

### Champ du rôle dans le payload JWT

Le rôle est lu depuis `req.user.role` (`middleware/roles.js:7`).
Le champ exact dans le payload JWT décodé est **`role`** (string unique, pas un tableau).

### Erreurs d'authentification

| Code | Format de body                                 | Cas                              |
| ---- | ---------------------------------------------- | -------------------------------- |
| 401  | `{ "error": "Accès refusé. Token manquant." }` | Token absent                     |
| 401  | `{ "error": "Token invalide ou expiré" }`      | Token invalide ou expiré         |
| 403  | `{ "error": "Rôle non défini" }`               | Payload sans champ `role`        |
| 403  | `{ "error": "Accès refusé pour ce rôle" }`     | Rôle non dans la liste autorisée |

> `middleware/auth.js:6-8`, `middleware/auth.js:17-18`, `middleware/roles.js:7-13`

---

## 4. Rôles et permissions

### Liste exhaustive des rôles

| Rôle                      | Routes/actions accessibles                                                            |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `admin`                   | Toutes les routes protégées par `auth` + `authorizeRoles`                             |
| `manager`                 | Toutes les routes protégées par `auth` + `authorizeRoles`                             |
| `receptionist`            | Rooms (GET), Check-in (GET/POST/DELETE), Checkout (GET/POST), Folios (GET/POST/PATCH) |
| `housekeeping_supervisor` | Rooms (GET, PATCH statut)                                                             |
| `comptable`               | Folios (GET uniquement — lecture seule)                                               |

> Les rôles sont des **strings exactes**, sensibles à la casse (`middleware/roles.js`)

### Permissions spécifiques `ROLE_PERMISSIONS`

```js
// middleware/roles.js:1-3
ROLE_PERMISSIONS = {
  comptable: [
    "read_invoices",
    "read_payments",
    "read_financial_reports",
    "export_data",
  ],
};
```

> **Note :** Ces permissions ne sont pas actuellement consommées par un middleware dédié.
> Elles sont définies mais non appliquées dans le code actuel. Le middleware `authorizeRoles`
> se base uniquement sur la liste des rôles autorisés par route.

### Matrice détaillée

| Route                                                | admin | manager | receptionist | housekeeping_supervisor | comptable |
| ---------------------------------------------------- | :---: | :-----: | :----------: | :---------------------: | :-------: |
| `GET /api/rooms`                                     |  ✅   |   ✅    |      ✅      |           ✅            |    ❌     |
| `GET /api/rooms/status/:status`                      |  ✅   |   ✅    |      ✅      |           ✅            |    ❌     |
| `GET /api/rooms/:roomId`                             |  ✅   |   ✅    |      ✅      |           ✅            |    ❌     |
| `PATCH /api/rooms/:roomId/status`                    |  ✅   |   ✅    |      ❌      |           ✅            |    ❌     |
| `PATCH /api/rooms/numero/:numero/status`             |  ✅   |   ✅    |      ❌      |           ✅            |    ❌     |
| `GET /api/checkin/:bookingId`                        |  ✅   |   ✅    |      ✅      |           ❌            |    ❌     |
| `GET /api/checkin/:bookingId/proforma`               |  ✅   |   ✅    |      ✅      |           ❌            |    ❌     |
| `POST /api/checkin/:bookingId`                       |  ✅   |   ✅    |      ✅      |           ❌            |    ❌     |
| `DELETE /api/checkin/:bookingId`                     |  ✅   |   ✅    |      ✅      |           ❌            |    ❌     |
| `GET /api/checkout/:bookingId/statement`             |  ✅   |   ✅    |      ✅      |           ❌            |    ❌     |
| `POST /api/checkout/:bookingId`                      |  ✅   |   ✅    |      ✅      |           ❌            |    ❌     |
| `GET /api/folios/:folioId`                           |  ✅   |   ✅    |      ✅      |           ❌            |    ✅     |
| `POST /api/folios/:folioId/items`                    |  ✅   |   ✅    |      ✅      |           ❌            |    ❌     |
| `PATCH /api/folios/:folioId/items/visibility`        |  ✅   |   ✅    |      ✅      |           ❌            |    ❌     |
| `PATCH /api/folios/items/:itemId/visibility`         |  ✅   |   ✅    |      ✅      |           ❌            |    ❌     |
| `DELETE /api/folios/items/:itemId`                   |  ✅   |   ✅    |      ❌      |           ❌            |    ❌     |
| `GET /api/payments`                                  |  ✅   |   ✅    |      ✅      |           ✅            |    ✅     |
| `GET /api/invoices`                                  |  ✅   |   ✅    |      ✅      |           ✅            |    ✅     |
| `GET /api/checkin/:bookingId` (sans role)            |  ✅   |   ✅    |      ✅      |           ✅            |    ✅     |
| `GET /api/checkin/:bookingId/proforma` (sans role)   |  ✅   |   ✅    |      ✅      |           ✅            |    ✅     |
| `GET /api/checkout/:bookingId/statement` (sans role) |  ✅   |   ✅    |      ✅      |           ✅            |    ✅     |

> Les routes GET checkin, checkin/proforma et checkout/statement n'ont **pas** de `authorizeRoles`,
> donc tout utilisateur authentifié peut y accéder.

---

## 5. Contrats de requête et réponse

### 5.1 GET `/api/rooms`

**Réponse 200 :**

```json
{
  "count": 8,
  "rooms": [
    {
      "id": "uuid",
      "roomNumber": "101",
      "category": "standard",
      "floor": 1,
      "bedType": "double",
      "maxOccupancy": 2,
      "housekeepingStatus": "controlee",
      "blockReason": null
    }
  ]
}
```

> `controllers/roomController.js:15-27`

### 5.2 GET `/api/rooms/status/:status`

**Paramètre :** `:status` — valeurs valides : `sale`, `nettoyage_en_cours`, `propre`, `controlee`, `bloquee`

> `controllers/roomController.js:147`

**Réponse 200 :**

```json
{
  "status": "propre",
  "count": 2,
  "rooms": [
    {
      "id": "uuid",
      "roomNumber": "102",
      "category": "standard",
      "floor": 1,
      "blockReason": null
    }
  ]
}
```

> `controllers/roomController.js:158-168`

**Réponse 400 :** `{ "error": "Statut invalide" }`

> `controllers/roomController.js:149-151`

### 5.3 GET `/api/rooms/:roomId`

Le paramètre `:roomId` accepte un UUID ou un numéro de chambre (via `resolveRoomLookup`) (`utils/roomIdentifier.js:1-13`).

**Réponse 200 :**

```json
{
  "id": "uuid",
  "roomNumber": "101",
  "category": "standard",
  "floor": 1,
  "bedType": "double",
  "maxOccupancy": 2,
  "housekeepingStatus": "controlee",
  "blockReason": null
}
```

> `controllers/roomController.js:45-54`

**Réponse 404 :** `{ "error": "Chambre introuvable" }`

> `controllers/roomController.js:42-43`

### 5.4 PATCH `/api/rooms/:roomId/status`

**Body :**

```json
{
  "housekeepingStatus": "string (requis)",
  "blockReason": "string (optionnel, requis si status = 'bloquee')"
}
```

> `controllers/roomController.js:63`

**Réponse 200 :**

```json
{
  "message": "Statut mis à jour",
  "room": {
    "id": "uuid",
    "roomNumber": "101",
    "housekeepingStatus": "propre",
    "blockReason": null
  }
}
```

> `controllers/roomController.js:91-98`

**Réponse 400 :** `{ "error": "Identifiant de chambre invalide" }`
**Réponse 404 :** `{ "error": "Chambre introuvable" }`
**Réponse 502 :** `{ "error": "<message du service housekeeping>" }`

### 5.5 PATCH `/api/rooms/numero/:numero/status`

Même contrat que 5.4, mais l'identification se fait par le numéro de chambre dans l'URL.

> `controllers/roomController.js:106-141`

### 5.6 GET `/api/checkin/:bookingId`

**Réponse 200 :**

```json
{
  "booking": {
    "id": "string",
    "ref": "string",
    "status": "string",
    "customer": { "firstName": "...", "lastName": "...", "email": "...", ... } | null,
    "guest": { "firstName": "...", "lastName": "..." } | null,
    "room": {
      "roomNumber": "101",
      "category": "standard"
    },
    "checkInDate": "YYYY-MM-DD",
    "checkOutDate": "YYYY-MM-DD",
    "pax": "number",
    "regime": "string",
    "roomRate": "number",
    "estimatedTotal": "number",
    "deposit": "object | number",
    "comments": "string",
    "marketSegment": "string | null",
    "billToPartnerId": "string | null",
    "billToLabel": "string | null"
  }
}
```

> `controllers/checkinController.js:139-162`

**Réponse 500 :** `{ "error": "<message>" }`

### 5.7 GET `/api/checkin/:bookingId/proforma`

**Conditions :** Le statut de la réservation doit être `status_option`, `status_confirmed` ou `status_voucher`.

**Réponse 200 :**

```json
{
  "bookingId": "string",
  "bookingRef": "string",
  "status": "string",
  "customer": { ... } | null,
  "guest": { "firstName": "string", "lastName": "string" },
  "room": { "roomNumber": "string", "category": "string" },
  "stay": {
    "checkInDate": "YYYY-MM-DD",
    "checkOutDate": "YYYY-MM-DD",
    "nights": "number",
    "pax": "number",
    "regime": "string"
  },
  "pricing": {
    "roomRate": "number",
    "estimatedRoomAmount": "number (roomRate × nights)",
    "deposit": "number",
    "balanceDue": "number (estimatedRoomAmount - deposit)"
  },
  "notes": { "mode": "dynamic", "source": "service-reservations" }
}
```

> `controllers/checkinController.js:191-221`

**Réponse 400 :** `{ "error": "Pro-forma indisponible. Statut actuel: <status>" }`

> `controllers/checkinController.js:175-177`

### 5.8 POST `/api/checkin/:bookingId`

**Body :** `{}` (vide — aucun champ requis dans le body)

> `postman_collection.json:73`

**Préconditions vérifiées par le serveur :**

1. `booking.locked` doit être `false` (`controllers/checkinController.js:16`)
2. `booking.status` doit être `status_confirmed` ou `status_voucher` (`controllers/checkinController.js:20-23`)
3. `booking.room.number` doit exister (`controllers/checkinController.js:25-28`)
4. Le statut housekeeping de la chambre doit être `controlee` ou `propre` (`controllers/checkinController.js:39`)
5. Si `booking.billToPartnerId` existe, le tarif partenaire est recalculé via le service tarification (`controllers/checkinController.js:43-72`)

**Réponse 200 :**

```json
{
  "message": "Check-in effectué avec succès",
  "booking": {
    "id": "string",
    "status": "status_checked_in",
    "actualCheckIn": "YYYY-MM-DD",
    "room": "101"
  },
  "folios": {
    "folioA": { "id": "uuid", "type": "A" },
    "folioB": { "id": "uuid", "type": "B" }
  }
}
```

> `controllers/checkinController.js:111-123`

**Réponses d'erreur :**
| Code | Body | Condition |
| ---- | ------------------------------------------------------------ | ---------------------------------------------- |
| 400 | `{ "error": "Check-in impossible. Dossier verrouillé après check-out." }` | `booking.locked === true` |
| 400 | `{ "error": "Check-in impossible. Statut actuel: <status>" }` | Statut non autorisé |
| 400 | `{ "error": "Chambre non prête. Statut: <statut>" }` | Housekeeping ≠ `controlee` ou `propre` |
| 404 | `{ "error": "Chambre introuvable dans la réservation" }` | `booking.room.number` absent |
| 503 | `{ "error": "Impossible de vérifier le statut..." }` | Service housekeeping indisponible |
| 500 | `{ "error": "<message>" }` | Erreur inattendue |

### 5.9 DELETE `/api/checkin/:bookingId`

**Préconditions :**

1. `booking.status` doit être `status_checked_in` (`controllers/checkinController.js:233`)
2. Aucune prestation (folio_item) ne doit exister sur les folios de cette réservation (`controllers/checkinController.js:244-252`)

**Réponse 200 :**

```json
{
  "message": "Check-in annulé avec succès",
  "booking": { "id": "string", "status": "status_confirmed" }
}
```

> `controllers/checkinController.js:267`

**Réponses d'erreur :**
| Code | Body | Condition |
| ---- | ---------------------------------------------------------------------- | ----------------------------- |
| 400 | `{ "error": "Annulation impossible. Statut actuel: <status>" }` | Statut ≠ `status_checked_in` |
| 400 | `{ "error": "Impossible d'annuler. Des prestations ont été enregistrées sur le folio." }` | Prestations existantes |
| 404 | `{ "error": "Chambre introuvable" }` | `booking.room.number` absent |

### 5.10 GET `/api/checkout/:bookingId/statement`

**Précondition :** `booking.status` doit être `status_checked_in` ou `status_checked_out`.

**Réponse 200 :**

```json
{
  "booking": {
    "ref": "string",
    "customer": "Prénom Nom",
    "room": "101",
    "checkIn": "YYYY-MM-DD",
    "checkOut": "YYYY-MM-DD | null",
    "nights": "number"
  },
  "folios": [
    {
      "id": "uuid",
      "type": "A",
      "label": "string",
      "status": "open",
      "items": [
        {
          "id": "uuid",
          "description": "string",
          "category": "string",
          "quantity": "number",
          "unitPrice": "string",
          "totalAmount": "string",
          "taxRate": "string",
          "isVisibleOnPrint": "boolean",
          "date": "timestamp"
        }
      ],
      "totalAmount": "number"
    }
  ],
  "payments": [
    {
      "amount": "number",
      "method": "string",
      "date": "timestamp"
    }
  ],
  "totalCharges": "number",
  "totalPaid": "number"
}
```

> `controllers/checkoutController.js:175-192`

**Réponse 400 :** `{ "error": "Extrait disponible uniquement pour les séjours en cours ou terminés" }`

> `controllers/checkoutController.js:129-131`

### 5.11 POST `/api/checkout/:bookingId`

**Body :**

```json
{
  "payments": [
    {
      "paymentMethod": "cb | esp | chq | virement | debiteur (requis)",
      "amount": "number (requis)",
      "folioType": "A | B (optionnel, défaut 'A')",
      "cardType": "string (optionnel, ex: 'visa')",
      "reference": "string (optionnel)"
    }
  ]
}
```

> `controllers/checkoutController.js:13`, `controllers/checkoutController.js:49`

**Préconditions vérifiées :**

1. `booking.status` doit être `status_checked_in` (`controllers/checkoutController.js:17`)
2. Si `balanceDue !== 0`, au moins un paiement est requis (`controllers/checkoutController.js:45-47`)
3. Le total des paiements doit correspondre exactement au `balanceDue` (tolérance centimes) (`controllers/checkoutController.js:58-59`)
4. Chaque `paymentMethod` doit être dans `['cb', 'esp', 'chq', 'virement', 'debiteur']` (`controllers/checkoutController.js:49`)

**Réponse 200 :**

```json
{
  "message": "Check-out effectué avec succès",
  "booking": {
    "id": "string",
    "status": "status_checked_out",
    "actualCheckOut": "YYYY-MM-DD",
    "room": "101"
  },
  "summary": {
    "totalCharges": "number",
    "deposit": "number",
    "totalPaid": "number",
    "remainingBalance": "number"
  }
}
```

> `controllers/checkoutController.js:103-117`

**Effets secondaires :**

- Statut houseking de la chambre mis à `sale` via le service housekeeping (`controllers/checkoutController.js:82`)
- Réservation passée en `status_checked_out` + `locked: true` (`controllers/checkoutController.js:87-91`)
- Tous les folios de la réservation passés en `closed` (`controllers/checkoutController.js:93-98`)

**Réponses d'erreur :**
| Code | Body | Condition |
| ---- | ----------------------------------------------------------------- | ------------------------------------------- |
| 400 | `{ "error": "Check-out impossible. Statut actuel: <status>" }` | Statut ≠ `status_checked_in` |
| 400 | `{ "error": "Aucun mode de paiement sélectionné" }` | Balance ≠ 0 et aucun paiement |
| 400 | `{ "error": "Mode de paiement invalide: <method>" }` | Méthode non dans la liste |
| 400 | `{ "error": "Le montant des paiements ne correspond pas au solde dû." }` | Montant total ≠ balanceDue |
| 400 | `{ "error": "Folio <type> introuvable" }` | Folio demandé inexistant |
| 502 | `{ "error": "Impossible de synchroniser le statut..." }` | Service houseking indisponible |

### 5.12 GET `/api/folios/:folioId`

**Réponse 200 :**

```json
{
  "folio": {
    "id": "uuid",
    "type": "A",
    "label": "string",
    "status": "open",
    "bookingId": "string",
    "totalAmount": "number (toutes prestations, y compris cachées)"
  },
  "allItems": [
    {
      "id": "uuid",
      "description": "string",
      "category": "string",
      "quantity": "number",
      "unitPrice": "string",
      "totalAmount": "string",
      "taxRate": "string",
      "isVisibleOnPrint": "boolean",
      "date": "timestamp"
    }
  ],
  "printableItems": [
    {
      "id": "uuid",
      "description": "string",
      "category": "string",
      "quantity": "number",
      "unitPrice": "string",
      "totalAmount": "string",
      "taxRate": "string",
      "date": "timestamp"
    }
  ],
  "printableTotal": "number (total des prestations visibles uniquement)"
}
```

> `controllers/folioController.js:28-58`

**Réponse 404 :** `{ "error": "Folio introuvable" }`

### 5.13 POST `/api/folios/:folioId/items`

**Body :**

```json
{
  "description": "string (requis)",
  "category": "string (requis)",
  "quantity": "number (requis, défaut 1)",
  "unitPrice": "number (requis)",
  "taxRate": "number (optionnel, défaut 0)"
}
```

> `controllers/folioController.js:68`

**Réponse 201 :**

```json
{
  "message": "Prestation ajoutée avec succès",
  "item": {
    "id": "uuid",
    "description": "string",
    "category": "string",
    "quantity": "number",
    "unitPrice": "string",
    "totalAmount": "string"
  },
  "folioTotal": "number (nouveau total du folio)"
}
```

> `controllers/folioController.js:106-117`

**Réponses d'erreur :**
| Code | Body | Condition |
| ---- | ------------------------------------------------------------------ | ------------------------- |
| 404 | `{ "error": "Folio introuvable" }` | Folio inexistant |
| 400 | `{ "error": "Folio clôturé. Impossible d'ajouter des prestations." }` | Folio `status === 'closed'` |

### 5.14 PATCH `/api/folios/items/:itemId/visibility`

**Body :**

```json
{
  "isVisible": "boolean (requis)"
}
```

> `controllers/folioController.js:126`

**Réponse 200 :**

```json
{
  "message": "Visibilité mise à jour",
  "item": {
    "id": "uuid",
    "description": "string",
    "isVisibleOnPrint": "boolean"
  }
}
```

> `controllers/folioController.js:144-151`

**Réponse 404 :** `{ "error": "Prestation introuvable" }`

### 5.15 PATCH `/api/folios/:folioId/items/visibility`

**Body :**

```json
{
  "itemIds": ["uuid1", "uuid2"],
  "isVisible": "boolean (requis)"
}
```

> `controllers/folioController.js:159-160`

**Réponse 200 :**

```json
{
  "message": "Visibilité mise à jour pour les prestations sélectionnées"
}
```

> `controllers/folioController.js:180`

**Réponse 404 :** `{ "error": "Folio introuvable" }`

### 5.16 DELETE `/api/folios/items/:itemId`

**Préconditions :**

- Le folio parent ne doit pas être `closed` (`controllers/folioController.js:206-208`)

**Réponse 200 :**

```json
{
  "message": "Prestation supprimée",
  "folioTotal": "number (nouveau total du folio)"
}
```

> `controllers/folioController.js:218-221`

**Réponses d'erreur :**
| Code | Body | Condition |
| ---- | ------------------------------------------------------------ | ---------------------------- |
| 404 | `{ "error": "Prestation introuvable" }` | Item inexistant |
| 400 | `{ "error": "Folio clôturé. Impossible de supprimer." }` | Folio `status === 'closed'` |

### 5.17 GET `/api/payments?date=YYYY-MM-DD`

**Paramètre query :** `date` (requis, format `YYYY-MM-DD`)

**Réponse 200 :**

```json
{
  "date": "2026-07-27",
  "count": 3,
  "totalAmount": 4500.0,
  "payments": [
    {
      "id": "uuid",
      "bookingId": "string",
      "folioId": "uuid",
      "amount": 1500.0,
      "paymentMethod": "cb",
      "reference": "string | null",
      "processedAt": "timestamp"
    }
  ]
}
```

> `controllers/paymentController.js:27-40`

**Réponses d'erreur :**
| Code | Body | Condition |
| ---- | ------------------------------------------------------------------------- | ----------------------------- |
| 400 | `{ "error": "Le paramètre date est requis (format YYYY-MM-DD)" }` | Paramètre `date` absent |
| 400 | `{ "error": "Format de date invalide (attendu YYYY-MM-DD)" }` | Format de date invalide |

### 5.18 GET `/api/invoices?date=YYYY-MM-DD`

**Paramètre query :** `date` (requis, format `YYYY-MM-DD`)

**Réponse 200 :**

```json
{
  "date": "2026-07-27",
  "count": 2,
  "totalAmount": 3200.0,
  "invoices": [
    {
      "folioId": "uuid",
      "bookingId": "string",
      "bookingRef": "string | null",
      "billToPartnerId": "string | null",
      "billToLabel": "string | null",
      "folioType": "A",
      "label": "string",
      "closedAt": "timestamp",
      "totalAmount": 1600.0,
      "items": [
        {
          "id": "uuid",
          "description": "string",
          "category": "string",
          "quantity": "number",
          "unitPrice": "string",
          "totalAmount": "string",
          "taxRate": "string"
        }
      ]
    }
  ]
}
```

> `controllers/invoiceController.js:60-65`

**Réponses d'erreur :** Même contrat que 5.17.

### 5.19 POST `/webhook/room-status`

**Headers requis :**

```
X-Webhook-Secret: <WEBHOOK_SHARED_SECRET>
```

> `src/controllers/webhookController.js:8-11`

**Body :**

```json
{
  "numero": "string (requis)",
  "statut": "string (requis)",
  "motifBlocage": "string (optionnel)"
}
```

> `src/controllers/webhookController.js:13`

**Réponse 200 :**

```json
{
  "message": "Statut de chambre mis à jour"
}
```

> `src/controllers/webhookController.js:44`

**Effet secondaire :** Émet un événement Socket.IO `room:status-updated` avec le payload `{ numero, statut, motifBlocage }` (`src/controllers/webhookController.js:38-42`)

**Réponses d'erreur :**
| Code | Body | Condition |
| ---- | ------------------------------------------------- | ---------------------------- |
| 401 | `{ "error": "Secret webhook invalide" }` | Secret manquant ou invalide |
| 400 | `{ "error": "Payload invalide" }` | `numero` ou `statut` manquant |

---

## 6. Dépendances externes

Ce service appelle **3 autres services** en interne :

### 6.1 Service Housekeeping (`HOUSEKEEPING_SERVICE_URL` → `http://localhost:4002`)

| Fonction                   | Méthode | Endpoint                           | Auth transmise                       | Timeout | Fichier                                     |
| -------------------------- | ------- | ---------------------------------- | ------------------------------------ | ------- | ------------------------------------------- |
| `getRoomStatusByNumero`    | GET     | `/api/rooms/numero/:numero/status` | `Authorization` + `X-Webhook-Secret` | 3s      | `src/services/housekeepingClient.js:20-77`  |
| `updateRoomStatusByNumero` | PATCH   | `/api/rooms/numero/:numero/status` | `Authorization` + `X-Webhook-Secret` | —       | `src/services/housekeepingClient.js:80-121` |

**Headers envoyés :** `Content-Type: application/json`, `X-Service-Name: pms-front-office`, `X-Webhook-Secret`, `Authorization`

> `src/services/housekeepingClient.js:3-17`

### 6.2 Service Réservations (`RESERVATIONS_SERVICE_URL` → `http://localhost:4003`)

| Fonction              | Méthode | Endpoint                                   | Auth transmise      | Timeout | Fichier                                      |
| --------------------- | ------- | ------------------------------------------ | ------------------- | ------- | -------------------------------------------- |
| `getBookingById`      | GET     | `/api/internal/bookings/:bookingId`        | `X-Internal-Secret` | 5s      | `src/services/reservationsClient.js:12-66`   |
| `updateBookingStatus` | PATCH   | `/api/internal/bookings/:bookingId/status` | `X-Internal-Secret` | —       | `src/services/reservationsClient.js:68-109`  |
| `updateBookingFields` | PATCH   | `/api/internal/bookings/:bookingId`        | `X-Internal-Secret` | —       | `src/services/reservationsClient.js:111-152` |

**Headers envoyés :** `Content-Type: application/json`, `X-Internal-Secret: <INTERNAL_SERVICE_SECRET>`

> `src/services/reservationsClient.js:3-9`

> **Note :** Ce service n'utilise **PAS** le token utilisateur mais un secret inter-service (`INTERNAL_SERVICE_SECRET`).

### 6.3 Service Tarification (`TARIFICATION_SERVICE_URL` → `http://localhost:4004`)

| Fonction          | Méthode | Endpoint                                                               | Auth transmise                       | Timeout | Fichier                                     |
| ----------------- | ------- | ---------------------------------------------------------------------- | ------------------------------------ | ------- | ------------------------------------------- |
| `resolveSeasonId` | GET     | `/api/seasons`                                                         | `Authorization` + `X-Webhook-Secret` | 3s      | `src/services/tarificationClient.js:20-82`  |
| `calculateRate`   | GET     | `/api/rates/calculate?categorie=&seasonId=&regime=&nights=&partnerId=` | `Authorization` + `X-Webhook-Secret` | 3s      | `src/services/tarificationClient.js:84-144` |

**Headers envoyés :** `Content-Type: application/json`, `X-Service-Name: pms-front-office`, `X-Webhook-Secret`, `Authorization`

> `src/services/tarificationClient.js:3-17`

---

## 7. Points d'attention pour le frontend

### 7.1 Identifiant de chambre dual (UUID ou numéro)

L'endpoint `GET /api/rooms/:roomId` accepte **soit un UUID, soit un numéro de chambre** (ex: `101`). La logique de résolution est dans `utils/roomIdentifier.js:1-13`. Le frontend peut donc utiliser l'identifiant le plus pratique.

### 7.2 Check-in : pas de body requis

Le `POST /api/checkin/:bookingId` n'attend **aucun body**. Le serveur récupère toutes les informations depuis le service réservations. Le frontend n'a qu'à fournir le `bookingId` dans l'URL.

### 7.3 Check-out : correspondance exacte du montant

Le total des paiements envoyés dans le body du check-out doit correspondre **exactement** au `balanceDue` (total charges − paiements déjà enregistrés). Une tolérance d'1 centime est appliquée via `Math.round(x * 100)` (`controllers/checkoutController.js:58`). Le frontend doit calculer le montant exact à envoyer.

### 7.4 Check-out : les folios clôturés sont irréversibles

Après check-out :

- Le dossier est `locked: true` (`controllers/checkoutController.js:90`)
- Le statut passe à `status_checked_out`
- Le check-in ne peut plus être réactivé (`controllers/checkinController.js:16-17`, `controllers/checkoutController.js:87-91`)

> **Conforme au PRD :** « Le check-out validé bloque définitivement le dossier — aucune réactivation du check-in n'est permise » (`docs/PRD/front-office.md:44,64`)

### 7.5 Folios : visibilité ≠ montant total

`allItems` contient **toutes** les prestations (y compris masquées).
`printableItems` contient uniquement celles avec `isVisibleOnPrint: true`.
Le champ `folio.folioTotal` (ou `summary.totalCharges`) reflète le **montant total réel**, jamais affecté par le masquage.

> **Conforme au PRD :** « Le montant total final réel ne peut en aucun cas être modifié ou altéré » (`docs/PRD/front-office.md:29,61`)

### 7.6 Folios : ajout/suppression impossible sur folio clôturé

Si le folio a le statut `closed`, les opérations `POST /items` et `DELETE /items/:itemId` sont rejetées (400). Le frontend doit désactiver ces actions.

### 7.7 Modes de paiement autorisés

La liste exacte des modes de paiement valides est : `cb`, `esp`, `chq`, `virement`, `debiteur`.

> `controllers/checkoutController.js:49` — **sensibles à la casse** (minuscules)

### 7.8 Pro-forma : statuts autorisés

La pro-forma n'est disponible que pour les réservations ayant le statut `status_option`, `status_confirmed` ou `status_voucher`.

> `controllers/checkinController.js:174`

### 7.9 Annulation de check-in

L'annulation de check-in (`DELETE`) n'est possible que si :

1. Le statut est `status_checked_in`
2. **Aucune prestation** n'a été enregistrée sur les folios

Si des prestations existent, le check-in est **bloqué** même si le statut est correct.

> `controllers/checkinController.js:233,244-252`

### 7.10 Statuts housekeeping valides

Pour le filtrage (`GET /api/rooms/status/:status`), les seuls statuts acceptés sont :
`sale`, `nettoyage_en_cours`, `propre`, `controlee`, `bloquee`

> `controllers/roomController.js:147`

### 7.11 Webhook : Socket.IO pour les mises à jour temps réel

Le frontend peut se connecter en WebSocket (Socket.IO) à la racine du service pour écouter l'événement `room:status-updated`. Ce payload contient `{ numero, statut, motifBlocage }`.

> `src/controllers/webhookController.js:38-42`, `src/socket.js:1-22`

### 7.12 Ecart PRD vs Code : calcul tarifaire partenaire

Le PRD (`docs/PRD/front-office.md:69`) indique que les montants du folio proviennent de la grille tarifaire. Dans le code réel, le service tarification n'est appelé que **lors du check-in** et uniquement si la réservation a un `billToPartnerId`. Le tarif est recalculé et mis à jour sur la réservation uniquement si la source est `tarif_partenaire` (`controllers/checkinController.js:59-67`). Les prestations ajoutées manuellement via `POST /api/folios/:folioId/items` utilisent le `unitPrice` fourni par l'utilisateur, sans validation tarifaire.

### 7.13 Erreurs 502 = service interne indisponible

Les erreurs 502 proviennent de l'indisponibilité des services housekeeping, réservations ou tarification. Le frontend peut afficher un message du type « Service temporairement indisponible » pour ces cas.
