# API Gateway - Documentation de Routage PMS OASIS

> **Fichier généré par audit du code source.** Aucun fichier existant n'a été modifié.
> Fichiers audités : `server.js` (230 lignes), `config/services.js` (55 lignes), `.env`, `package.json`.

---

## 1. Informations générales

| Propriété                | Valeur                                                                           |
| ------------------------ | -------------------------------------------------------------------------------- |
| **Port d'écoute**        | `4000` (configurable via variable `PORT`)                                        |
| **Framework HTTP**       | Express **v5.2.1** (attention : Express 5, pas 4)                                |
| **Proxy**                | `http-proxy-middleware` **v3.0.3** — proxy inverse standard, pas de proxy maison |
| **Authentification JWT** | `jsonwebtoken` **v9.0.3**                                                        |
| **CORS**                 | Package `cors` **v2.8.5**                                                        |
| **Point d'entrée**       | `server.js` (unique fichier applicatif)                                          |
| **Config des services**  | `config/services.js` (unique fichier de config)                                  |
| **Démarrage**            | `npm start` (`node server.js`) ou `npm run dev` (`nodemon server.js`)            |

**Architecture** : Fichier unique `server.js` + 1 fichier de config. Pas de `src/`, pas de TypeScript, pas de Dockerfile, pas de docker-compose, pas de tests, pas de README.

---

## 2. Table de routage vers les services

### 2.1 Principe de fonctionnement du proxy

Le gateway utilise `app.use(svc.prefix, createProxyMiddleware({...}))` pour chaque service. Express **retire le préfixe** du chemin avant de le transmettre au middleware proxy (comportement standard de `app.use(path, fn)`). La fonction `pathRewrite` reçoit donc le chemin **sans le préfixe** et le reconstruit pour le service cible.

### 2.2 Table de routage détaillée

| Préfixe côté gateway (appel frontend) | Service cible | URL cible (défaut)      | Chemin transmis au service              | Réécriture appliquée                                          |
| ------------------------------------- | ------------- | ----------------------- | --------------------------------------- | ------------------------------------------------------------- |
| `/api/auth`                           | auth          | `http://localhost:4001` | `/api/auth{chemin_sans_prefixe}`        | **Préservé** — le `/api/auth` est conservé                    |
| `/api/housekeeping`                   | housekeeping  | `http://localhost:4002` | `/api{chemin_sans_prefixe}`             | **Réécrit** — le `/housekeeping` est supprimé                 |
| `/api/reservations`                   | reservations  | `http://localhost:4003` | `/api{chemin_sans_prefixe}`             | **Réécrit** — le `/reservations` est supprimé (hors webhooks) |
| `/api/tarification`                   | tarification  | `http://localhost:4004` | `/api{chemin_sans_prefixe}`             | **Réécrit** — le `/tarification` est supprimé                 |
| `/api/front-office`                   | frontOffice   | `http://localhost:4005` | `/api{chemin_sans_prefixe}`             | **Réécrit** — le `/front-office` est supprimé (hors webhooks) |
| `/api/analytics`                      | analytics     | `http://localhost:4006` | `/api{chemin_sans_prefixe}`             | **Réécrit** — le `/analytics` est supprimé                    |
| `/api/night-audit`                    | nightAudit    | `http://localhost:4007` | `/api/night-audit{chemin_sans_prefixe}` | **Préservé** — le `/api/night-audit` est conservé             |

### 2.3 Exemples concrets de chemins

| Appel frontend                               | Chemin transmis au service backend       | Service cible     |
| -------------------------------------------- | ---------------------------------------- | ----------------- |
| `GET /api/auth/login`                        | `/api/auth/login`                        | auth:4001         |
| `GET /api/auth/users`                        | `/api/auth/users`                        | auth:4001         |
| `GET /api/housekeeping/rooms`                | `/api/rooms`                             | housekeeping:4002 |
| `GET /api/housekeeping/rooms/123/status`     | `/api/rooms/123/status`                  | housekeeping:4002 |
| `GET /api/reservations/rooms`                | `/api/rooms`                             | reservations:4003 |
| `GET /api/reservations/bookings`             | `/api/bookings`                          | reservations:4003 |
| `GET /api/reservations/customers`            | `/api/customers`                         | reservations:4003 |
| `GET /api/tarification/seasons`              | `/api/seasons`                           | tarification:4004 |
| `GET /api/tarification/rates`                | `/api/rates`                             | tarification:4004 |
| `GET /api/front-office/rooms`                | `/api/rooms`                             | frontOffice:4005  |
| `GET /api/front-office/checkin/123`          | `/api/checkin/123`                       | frontOffice:4005  |
| `GET /api/front-office/checkout/123`         | `/api/checkout/123`                      | frontOffice:4005  |
| `GET /api/front-office/folios`               | `/api/folios`                            | frontOffice:4005  |
| `GET /api/analytics/dashboard`               | `/api/analytics/dashboard`               | analytics:4006    |
| `GET /api/night-audit/status`                | `/api/night-audit/status`                | nightAudit:4007   |
| `GET /api/night-audit/current-business-date` | `/api/night-audit/current-business-date` | nightAudit:4007   |

### 2.4 Détail des fonctions de réécriture (code source)

```javascript
// auth — préfixe préservé
rewrite: (path) => `/api/auth${path}`;

// housekeeping — préfixe /housekeeping retiré, /api ajouté
rewrite: (path) => `/api${path}`;

// reservations — /reservations retiré, sauf webhooks (passthrough)
rewrite: (path) => {
  if (path.includes("/webhook")) return path; // passthrough sans /api
  return `/api${path}`;
};

// tarification — préfixe /tarification retiré, /api ajouté
rewrite: (path) => `/api${path}`;

// frontOffice — /front-office retiré, sauf webhooks
rewrite: (path) =>
  path.includes("/webhook")
    ? path.replace("/api/front-office", "")
    : `/api${path}`;

// analytics — préfixe /analytics retiré, /api ajouté
rewrite: (path) => `/api${path}`;

// nightAudit — préfixe préservé
rewrite: (path) => `/api/night-audit${path}`;
```

### 2.5 Routes internes du gateway (pas de proxy)

| Route             | Méthode | Description                                            |
| ----------------- | ------- | ------------------------------------------------------ |
| `GET /`           | GET     | Retourne les infos du gateway et la liste des services |
| `GET /api/health` | GET     | Vérifie la santé de tous les services backend          |

---

## 3. Authentification au niveau du gateway

### 3.1 Vérification JWT par le gateway

**Oui, le gateway vérifie lui-même le token JWT** avant de router. Le middleware `gatewaySecurity` (appliqué via `app.use(gatewaySecurity)` **avant** les proxies) effectue la vérification.

Ordre de traitement dans `gatewaySecurity` (`server.js:112-159`) :

1. **Bypass** pour : requêtes `OPTIONS`, chemin `/`, chemin `/api/health`
2. **Bypass** si le chemin ne correspond à aucun préfixe de service connu
3. **Webhooks** : authentification par header `X-Webhook-Secret` (pas de JWT)
4. **Routes internes** : authentification par header `X-Internal-Secret` (pas de JWT)
5. **JWT** : extraction du Bearer token, vérification avec `jwt.verify()` via `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
6. **Contrôle d'accès basé sur les rôles** (RBAC) via `roleForRoute()`

### 3.2 Routes publiques (pas de JWT requis)

| Méthode | Chemin                      |
| ------- | --------------------------- |
| `POST`  | `/api/auth/login`           |
| `POST`  | `/api/auth/forgot-password` |
| `POST`  | `/api/auth/reset-password`  |

### 3.3 Routes webhook (authentification par secret partagé)

Tout chemin contenant `webhook` (insensible à la casse) est authentifié via le header `X-Webhook-Secret` au lieu du JWT. Ce mécanisme concerne les appels entrants de systèmes externes (ex: front-office vers réservations).

### 3.4 Route interne service-à-service

`PATCH /api/reservations/rooms/:id/housekeeping-status` est authentifié via le header `X-Internal-Secret` au lieu du JWT. Cet appel est fait par le service housekeeping vers le service réservations.

### 3.5 Transmission du header Authorization vers le service cible

**Oui, le header `Authorization` est transmis intact** vers le service cible. Le proxy http-proxy-middleware forward par défaut tous les headers de la requête originale vers le target. Le gateway ne supprime ni ne modifie le header Authorization. Le seul header modifié est `Host` (via `changeOrigin: true`), qui est remplacé par le host:port du service cible.

Conséquence : les services backend **reçoivent aussi le JWT** et peuvent effectuer leur propre vérification si nécessaire.

### 3.6 Contrôle d'accès basé sur les rôles (RBAC)

Le JWT doit contenir un champ `role`. Les rôles reconnus : `admin`, `manager`, `receptionist`, `housekeeping_supervisor`, `comptable`.

#### Règles RBAC complètes

| Préfixe de chemin                          | Méthode(s)               | Rôles autorisés                                                            |
| ------------------------------------------ | ------------------------ | -------------------------------------------------------------------------- |
| `POST /api/auth/register`                  | POST                     | `admin`                                                                    |
| `/api/auth/users*`                         | TOUTES                   | `admin`                                                                    |
| `/api/reservations/rooms*`                 | POST, PUT, PATCH, DELETE | `admin`, `manager`                                                         |
| `/api/reservations/bookings*`              | POST, PUT, PATCH, DELETE | `admin`, `manager`, `receptionist`                                         |
| `/api/reservations/customers*`             | POST, PUT, PATCH, DELETE | `admin`, `manager`, `receptionist`                                         |
| `/api/housekeeping/rooms*`                 | GET                      | `admin`, `manager`, `housekeeping_supervisor`, `receptionist`, `comptable` |
| `/api/housekeeping/rooms*/night-audit`     | POST                     | `admin`                                                                    |
| `/api/housekeeping/rooms*/checkout`        | PATCH                    | `admin`, `receptionist`, `comptable`                                       |
| `/api/housekeeping/rooms*/status`          | PATCH                    | `admin`, `housekeeping_supervisor`                                         |
| `/api/tarification/*`                      | POST, PUT, PATCH, DELETE | `admin`, `manager`                                                         |
| `/api/tarification/discounts/apply`        | POST                     | **Aucune restriction** (null)                                              |
| `/api/front-office/rooms*`                 | POST, PUT, PATCH, DELETE | `admin`, `manager`, `housekeeping_supervisor`                              |
| `/api/front-office/checkin*`               | POST, PUT, PATCH, DELETE | `admin`, `manager`, `receptionist`                                         |
| `/api/front-office/checkout*`              | GET                      | `admin`, `manager`, `receptionist`, `comptable`                            |
| `/api/front-office/checkout*`              | POST, PUT, PATCH, DELETE | `admin`, `manager`, `receptionist`                                         |
| `/api/front-office/folios*`                | GET                      | `admin`, `manager`, `receptionist`, `comptable`                            |
| `/api/front-office/folios*`                | DELETE                   | `admin`, `manager`                                                         |
| `/api/front-office/folios*`                | POST, PUT, PATCH         | `admin`, `manager`, `receptionist`                                         |
| `/api/night-audit/*/current-business-date` | TOUTES                   | `admin`, `manager`, `comptable`                                            |
| `/api/night-audit/*/check-balance`         | TOUTES                   | `admin`, `manager`, `comptable`                                            |
| `/api/night-audit/*/close`                 | TOUTES                   | `admin`, `manager`                                                         |
| `/api/night-audit/*/history*`              | TOUTES                   | `admin`, `comptable`                                                       |
| `/api/night-audit/*/status`                | TOUTES                   | `admin`, `manager`, `receptionist`, `comptable`                            |
| `POST /api/analytics/seed`                 | POST                     | `admin`                                                                    |
| `POST /api/front-office/seed`              | POST                     | `admin`                                                                    |

**Toute route non listée ci-dessus** (y compris la majorité des opérations GET) renvoie `null`, c'est-à-dire **aucune restriction de rôle** — tout utilisateur authentifié (ayant un JWT valide) peut y accéder.

---

## 4. Gestion des erreurs et timeouts

### 4.1 Service cible indisponible (down / timeout)

| Situation                           | Code HTTP retourné   | Format de la réponse                                                          |
| ----------------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| Service cible down ou timeout proxy | **502** Bad Gateway  | `{ "error": "Service {name} indisponible", "service": "{name}" }`             |
| Token manquant                      | 401                  | `{ "error": "Token manquant" }`                                               |
| Token invalide ou expiré            | 401                  | `{ "error": "Token invalide ou expiré" }`                                     |
| Rôle insuffisant                    | 403                  | `{ "error": "Accès refusé — rôle insuffisant" }`                              |
| Secret webhook invalide             | 401                  | `{ "error": "Secret webhook invalide" }`                                      |
| Secret webhook non configuré        | 500                  | `{ "error": "Secret webhook non configuré au gateway" }`                      |
| Secret interne invalide             | 401                  | `{ "error": "Secret interne invalide" }`                                      |
| Secret interne non configuré        | 500                  | `{ "error": "Secret interne non configuré au gateway" }`                      |
| Route inconnue (404 gateway)        | 404                  | `{ "error": "Route non trouvée", "path": "...", "availablePrefixes": [...] }` |
| Tous les services down (health)     | 503                  | `{ "status": "partial", "services": { ... } }`                                |
| CORS refusé                         | Erreur Express (500) | Message d'erreur standard Express                                             |

### 4.2 Retry

**Non implémenté.** Aucune configuration de retry ni de backoff dans le code du gateway. Si un service est down, le gateway renvoie immédiatement un 502.

### 4.3 Limite de taille de payload

**Non implémentée** pour les requêtes proxy. Le middleware `express.json()` est placé **après** les proxies dans le code (`server.js:214`), il ne concerne donc que les routes propres du gateway (non les requêtes transmises). Les requêtes proxied sont transmises tel quelles sans limite de taille côté gateway.

### 4.4 Rate-limiting

**Non implémenté.** Aucun middleware de rate-limiting n'est présent dans le code.

### 4.5 Configuration CORS

**Origines autorisées** (chaîne de caractères, configurable via `CLIENT_ORIGINS`) :

| Origine explicite (valeur par défaut de `CLIENT_ORIGINS`) | Statut                                           |
| --------------------------------------------------------- | ------------------------------------------------ |
| `http://localhost:3000`                                   | Autorisé (valeur actuelle de `.env`)             |
| `http://localhost:3001`                                   | Autorisé (défaut si `CLIENT_ORIGINS` non défini) |
| `http://localhost:3002`                                   | Autorisé (défaut)                                |
| `http://localhost:3003`                                   | Autorisé (défaut)                                |
| `http://127.0.0.1:3000`                                   | Autorisé (défaut)                                |
| `http://127.0.0.1:3001`                                   | Autorisé (défaut)                                |
| `http://127.0.0.1:3002`                                   | Autorisé (défaut)                                |
| `http://127.0.0.1:3003`                                   | Autorisé (défaut)                                |

**Règle regex** (appliquée en complément de la liste explicite, quel que soit `CLIENT_ORIGINS`) :

- `^http://localhost(:\d+)?$` → toute URL `http://localhost` avec ou sans port
- `^http://127\.0\.0\.1(:\d+)?$` → toute URL `http://127.0.0.1` avec ou sans port

> **Avertissement** : la regex autorise **tout port** sur `localhost` et `127.0.0.1`, même si `CLIENT_ORIGINS` est configuré pour une URL de production. En production, cette regex devrait être retirée ou restreinte.

| Propriété CORS     | Valeur                                                |
| ------------------ | ----------------------------------------------------- |
| `credentials`      | `true` (cookies/Authorization transmis)               |
| `methods`          | `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`           |
| `allowedHeaders`   | `Content-Type`, `Authorization`, `X-Requested-With`   |
| `origin`           | Dynamique (liste + regex)                             |
| Protocole autorisé | **HTTP uniquement** — HTTPS non supporté par la regex |

---

## 5. Routes NON routées / à vérifier

### 5.1 Services mentionnés dans le code mais absents du proxy

Aucun. Tous les 7 services configurés dans `config/services.js` ont une route de proxy active.

### 5.2 Préfixes/rôles mentionnés dans `roleForRoute()` mais à vérifier côté backend

Le middleware RBAC référence des chemins spécifiques qui **doivent exister** dans chaque service backend. Si un service ne les implémente pas, les requêtes seront routées mais renverront une erreur 404 du backend :

| Chemin RBAC dans le gateway               | Service backend     | Ressource attendue         |
| ----------------------------------------- | ------------------- | -------------------------- |
| `/api/auth/register`                      | auth (4001)         | Route d'inscription        |
| `/api/auth/users*`                        | auth (4001)         | Gestion des utilisateurs   |
| `/api/reservations/rooms*`                | reservations (4003) | Chambres                   |
| `/api/reservations/bookings*`             | reservations (4003) | Réservations               |
| `/api/reservations/customers*`            | reservations (4003) | Clients                    |
| `/api/housekeeping/rooms*`                | housekeeping (4002) | Chambres (housekeeping)    |
| `/api/housekeeping/rooms/:id/night-audit` | housekeeping (4002) | Audit nocturne par chambre |
| `/api/housekeeping/rooms/:id/checkout`    | housekeeping (4002) | Checkout par chambre       |
| `/api/housekeeping/rooms/:id/status`      | housekeeping (4002) | Statut chambre             |
| `/api/tarification/*`                     | tarification (4004) | Tarification               |
| `/api/tarification/discounts/apply`       | tarification (4004) | Application de remise      |
| `/api/front-office/rooms*`                | frontOffice (4005)  | Chambres (front-office)    |
| `/api/front-office/checkin*`              | frontOffice (4005)  | Check-in                   |
| `/api/front-office/checkout*`             | frontOffice (4005)  | Check-out                  |
| `/api/front-office/folios*`               | frontOffice (4005)  | Folios                     |
| `/api/front-office/seed`                  | frontOffice (4005)  | Seed données               |
| `/api/night-audit/*`                      | nightAudit (4007)   | Audit nocturne             |
| `/api/analytics/seed`                     | analytics (4006)    | Seed données analytics     |

### 5.3 Routes internes (hors frontend)

La route `PATCH /api/reservations/rooms/:id/housekeeping-status` est spécifiquement conçue pour l'appel interne housekeeping → réservations. Elle utilise `X-Internal-Secret` au lieu du JWT. **Le frontend ne doit PAS appeler cette route.**

### 5.4 Absence de `.env.example`

Aucun fichier `.env.example` ou `.env.sample` n'existe. La liste des variables d'environnement requises est documentée en section 6.

---

## 6. Variables d'environnement pertinentes

### 6.1 Variables de configuration des services

| Variable                   | Valeur dans `.env`      | Port par défaut | Correspondance           |
| -------------------------- | ----------------------- | --------------- | ------------------------ |
| `PORT`                     | `4000`                  | 4000            | Port d'écoute du gateway |
| `AUTH_SERVICE_URL`         | `http://localhost:4001` | 4001            | Service authentification |
| `HOUSEKEEPING_SERVICE_URL` | `http://localhost:4002` | 4002            | Service housekeeping     |
| `RESERVATIONS_SERVICE_URL` | `http://localhost:4003` | 4003            | Service réservations     |
| `TARIFICATION_SERVICE_URL` | `http://localhost:4004` | 4004            | Service tarification     |
| `FRONT_OFFICE_SERVICE_URL` | `http://localhost:4005` | 4005            | Service front-office     |
| `ANALYTICS_SERVICE_URL`    | `http://localhost:4006` | 4006            | Service analytics        |
| `NIGHT_AUDIT_SERVICE_URL`  | `http://localhost:4007` | 4007            | Service audit nocturne   |

**Confirmation** : les ports 4001-4007 correspondent aux ports configurés dans `.env`. Chaque variable a un fallback dans `config/services.js` qui utilise les mêmes ports par défaut.

### 6.2 Variables de sécurité

| Variable                  | Valeur dans `.env`                          | Utilisation                       |
| ------------------------- | ------------------------------------------- | --------------------------------- |
| `JWT_SECRET`              | `ecb6d4918...` (64 hex chars)               | Clé HMAC pour vérification JWT    |
| `JWT_ISSUER`              | `auth-service`                              | Claim `iss` attendu dans le JWT   |
| `JWT_AUDIENCE`            | `pms-microservices`                         | Claim `aud` attendu dans le JWT   |
| `WEBHOOK_SHARED_SECRET`   | `front-office-webhook-secret`               | Secret partagé pour auth webhook  |
| `INTERNAL_SERVICE_SECRET` | `service-reservations-internal-secret-2026` | Secret pour appels inter-services |

### 6.3 Variables CORS

| Variable         | Valeur dans `.env`      | Effet                            |
| ---------------- | ----------------------- | -------------------------------- |
| `CLIENT_ORIGINS` | `http://localhost:3000` | Origine CORS explicite autorisée |

> **Note** : seul `http://localhost:3000` est autorisé explicitement dans `.env`. Les autres origines listées en défaut (localhost:3001-3003, 127.0.0.1:_) ne s'appliquent que si `CLIENT_ORIGINS` n'est pas défini. La regex de fallback autorise quand même tout `http://localhost:_`.

---

## 7. Points d'attention pour le frontend

### 7.1 Réécriture des chemins — CRITIQUE

Le gateway **réécrit les chemins** pour la plupart des services. Le frontend ne doit **JAMAIS** deviner le chemin interne du service backend. Il doit toujours utiliser le préfixe du gateway.

**Règle simple pour le frontend** : appeler toujours `/api/{service}/{ressource}` en utilisant le préfixe exact du tableau ci-dessous. Le gateway gère la réécriture.

| Service          | Préfixe frontend (à utiliser) |
| ---------------- | ----------------------------- |
| Authentification | `/api/auth/...`               |
| Housekeeping     | `/api/housekeeping/...`       |
| Réservations     | `/api/reservations/...`       |
| Tarification     | `/api/tarification/...`       |
| Front-office     | `/api/front-office/...`       |
| Analytics        | `/api/analytics/...`          |
| Audit nocturne   | `/api/night-audit/...`        |

### 7.2 Le header Authorization est transmis au backend

Le gateway ne consomme pas le token — il le vérifie puis le forward. Les services backend reçoivent le header `Authorization: Bearer <token>` intact. Si un service backend fait sa propre vérification JWT, **le frontend n'a rien de spécial à faire** : un seul header `Authorization` suffit.

### 7.3 Headers autorisés côté CORS

Le frontend doit s'assurer d'envoyer uniquement ces headers (ou d'utiliser la liste CORS) :

- `Content-Type`
- `Authorization`
- `X-Requested-With`

Tout autre header personnalisé risque d'être bloqué par le CORS si le préflight OPTIONS ne l'inclut pas.

### 7.4 Protocole : HTTP uniquement

La regex CORS n'autorise que `http://localhost` et `http://127.0.0.1`. Le frontend doit être servi en **HTTP**, pas en HTTPS, pour que les requêtes CORS passent. En production, il faudra mettre à jour `CLIENT_ORIGINS` avec l'URL HTTPS du frontend.

### 7.5 Méthodes HTTP autorisées

CORS n'autorise que : `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`. La méthode `PUT` **n'est pas dans la liste CORS** mais est utilisée dans les règles RBAC (`roleForRoute`). Si le frontend utilise `PUT`, il risque un blocage CORS (le préflight OPTIONS refusera PUT). **Vérifier** si les services utilisent réellement `PUT` ou si `PATCH` suffit.

### 7.6 Gestion des erreurs 502

Le gateway renvoie un `502` avec `{ "error": "Service {name} indisponible", "service": "{name}" }` quand un service backend est down. Le frontend doit intercepter le code 502 et afficher un message approprié (ex: "Service temporairement indisponible").

### 7.7 Routes publiques

Seules 3 routes sont publiques (pas de JWT requis) :

- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

**Toute autre requête** nécessite un header `Authorization: Bearer <token>`.

### 7.8 Endpoints de seed (données de test)

Deux routes de seed existent, réservées au rôle `admin` :

- `POST /api/analytics/seed`
- `POST /api/front-office/seed`

### 7.9 Endpoints de santé

| Endpoint          | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `GET /`           | Informations sur le gateway (non protégé)               |
| `GET /api/health` | État de tous les services backend (retourne 200 ou 503) |

### 7.10 Format standard des erreurs

Toutes les erreurs du gateway sont au format JSON :

```json
{ "error": "Message d'erreur" }
```

Les erreurs de proxy ajoutent le champ `service` :

```json
{ "error": "Service {name} indisponible", "service": "{name}" }
```

La 404 inclut les préfixes disponibles :

```json
{ "error": "Route non trouvée", "path": "/api/inconnu", "availablePrefixes": ["/api/auth", ...] }
```
