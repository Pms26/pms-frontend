# auth-service — Documentation API

Microservice d'authentification du PMS OASIS.

---

## 1. Informations générales

| Propriété              | Valeur                               |
| ---------------------- | ------------------------------------ |
| **Nom du service**     | `auth-service`                       |
| **Port**               | `4001` (configurable via `PORT`)     |
| **Préfixe des routes** | `/api/auth`                          |
| **Health check**       | `GET /api/health`                    |
| **Framework**          | Express.js v5.2.1                    |
| **ORM**                | Mongoose v9.7.4                      |
| **Base de données**    | MongoDB (Atlas) — base `pms_auth`    |
| **Langage**            | JavaScript (ESM, `"type": "module"`) |
| **Point d'entrée**     | `src/server.js` (`src/server.js:22`) |

---

## 2. Endpoints exposés

| Méthode  | Chemin exact                   | Rôles autorisés         | Middleware(s) appliqué(s)                 | Description                                              |
| -------- | ------------------------------ | ----------------------- | ----------------------------------------- | -------------------------------------------------------- |
| `GET`    | `/api/health`                  | Aucun                   | Aucun                                     | Vérification de santé du service                         |
| `POST`   | `/api/auth/register`           | `admin`                 | `authenticate`, `authorizeRoles('admin')` | Créer un nouvel utilisateur                              |
| `POST`   | `/api/auth/login`              | Aucun                   | `loginLimiter`                            | Connexion utilisateur (retourne access + refresh tokens) |
| `POST`   | `/api/auth/refresh`            | Aucun                   | Aucun                                     | Renouveler l'access token via le cookie httpOnly         |
| `POST`   | `/api/auth/logout`             | Aucun                   | Aucun                                     | Déconnexion (supprime le refresh token en BDD + cookie)  |
| `POST`   | `/api/auth/forgot-password`    | Aucun                   | `loginLimiter`                            | Demander un e-mail de réinitialisation de mot de passe   |
| `POST`   | `/api/auth/reset-password`     | Aucun                   | Aucun                                     | Réinitialiser le mot de passe avec un token              |
| `GET`    | `/api/auth/me`                 | Tous (tout rôle valide) | `authenticate`                            | Récupérer le profil de l'utilisateur connecté            |
| `GET`    | `/api/auth/users`              | `admin`                 | `authenticate`, `authorizeRoles('admin')` | Lister tous les utilisateurs                             |
| `PATCH`  | `/api/auth/users/:userId/role` | `admin`                 | `authenticate`, `authorizeRoles('admin')` | Modifier le rôle d'un utilisateur                        |
| `DELETE` | `/api/auth/users/:userId`      | `admin`                 | `authenticate`, `authorizeRoles('admin')` | Supprimer un utilisateur                                 |

**Sources :**

- Routes : `src/routes/authRoutes.js:26-59`
- Health check : `src/server.js:36-42`
- Route catch-all 404 : `src/server.js:44-49`

### Rate limiting

| Limiter        | Fenêtre    | Max requêtes | Appliqué sur                                   | Source                                                                           |
| -------------- | ---------- | ------------ | ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `apiLimiter`   | 15 minutes | 100          | Toutes les routes `/api`                       | `src/server.js:33`, `src/middlewares/rateLimitMiddleware.js:3-12`                |
| `loginLimiter` | 1 minute   | 100          | `/api/auth/login`, `/api/auth/forgot-password` | `src/routes/authRoutes.js:32,35`, `src/middlewares/rateLimitMiddleware.js:14-23` |

**Note CORS :** Les méthodes autorisées par CORS sont `GET`, `POST`, `PATCH` — la méthode `DELETE` n'est pas explicitement dans la liste CORS (`src/config/corsOptions.js:4`), ce qui pourrait poser problème pour `DELETE /api/auth/users/:userId` si appelé depuis un navigateur cross-origin.

---

## 3. Authentification

### Mécanisme

JWT Bearer token passé dans le header `Authorization`.

```
Authorization: Bearer <token>
```

**Source :** `src/middlewares/authMiddleware.js:3-39`

### Vérification du token

- **Clé de signature :** variable d'env `JWT_SECRET`
- **Algorithme :** `HS256` (par défaut de la librairie `jsonwebtoken`)
- **Issuer attendu :** valeur de `JWT_ISSUER` ou défaut `"auth-service"` (`src/services/tokenService.js:13`)
- **Audience attendue :** valeur de `JWT_AUDIENCE` ou défaut `"pms-microservices"` (`src/services/tokenService.js:14`)
- **Expiration :** valeur de `JWT_EXPIRES_IN` ou défaut `"15m"` (`src/services/tokenService.js:12`)

### Payload du token d'accès

| Champ  | Contenu                              | Source                            |
| ------ | ------------------------------------ | --------------------------------- |
| `sub`  | ID MongoDB de l'utilisateur (string) | `src/services/tokenService.js:11` |
| `role` | Rôle de l'utilisateur (string)       | `src/services/tokenService.js:7`  |

### Champ rôle dans le payload décodé

Le champ exact est **`role`** (pas `roles`, pas `roleName`). C'est un tableau de propriétés du payload qui est directement la valeur string du rôle.

**Source :** `src/services/tokenService.js:7`, `src/middlewares/authMiddleware.js:23`

### Stockage côté frontend attendu

- **Access token :** en mémoire JavaScript (variable, pas de cookie, pas de localStorage)
- **Refresh token :** cookie httpOnly, secure en production, sameSite lax, path `/api/auth`, durée maximale 7 jours (`src/services/tokenService.js:57-64`)

### Messages d'erreur d'authentification

| Condition                                        | Code HTTP | Message                                              | Source                                    |
| ------------------------------------------------ | --------- | ---------------------------------------------------- | ----------------------------------------- |
| Header manquant ou ne commence pas par `Bearer ` | 401       | `"Token d'authentification manquant."`               | `src/middlewares/authMiddleware.js:7-10`  |
| Token expiré                                     | 401       | `"Votre token a expiré. Veuillez vous reconnecter."` | `src/middlewares/authMiddleware.js:29-32` |
| Token invalide (signature, issuer, audience)     | 401       | `"Token d'authentification invalide."`               | `src/middlewares/authMiddleware.js:35-38` |

---

## 4. Rôles et permissions

### Liste exhaustive des rôles

| Rôle (string exacte)      | Source                  |
| ------------------------- | ----------------------- |
| `admin`                   | `src/config/roles.js:2` |
| `manager`                 | `src/config/roles.js:3` |
| `receptionist`            | `src/config/roles.js:4` |
| `housekeeping_supervisor` | `src/config/roles.js:5` |
| `comptable`               | `src/config/roles.js:6` |

**Rôle par défaut** lors de la création d'un utilisateur : `receptionist` (`src/models/User.js:41`)

### Permissions par rôle

| Rôle                      | Routes accessibles                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `admin`                   | Toutes les routes authentifiées : `GET /me`, `POST /register`, `GET /users`, `PATCH /users/:userId/role`, `DELETE /users/:userId` |
| `manager`                 | `GET /me` uniquement                                                                                                              |
| `receptionist`            | `GET /me` uniquement                                                                                                              |
| `housekeeping_supervisor` | `GET /me` uniquement                                                                                                              |
| `comptable`               | `GET /me` uniquement                                                                                                              |

**Notes :**

- La route `GET /me` utilise le middleware `authenticate` seul (pas `authorizeRoles`) — donc tout utilisateur avec un token valide peut l'appeler (`src/routes/authRoutes.js:38`).
- Les routes `POST /register`, `GET /users`, `PATCH /users/:userId/role`, `DELETE /users/:userId` sont restreintes au seul rôle `admin` via `authorizeRoles('admin')`.
- Les routes `POST /login`, `POST /refresh`, `POST /logout`, `POST /forgot-password`, `POST /reset-password` n'exigent aucune authentification.

---

## 5. Contrats de requête et réponse

### POST /api/auth/register

> **Middlewares :** `authenticate` + `authorizeRoles('admin')` — nécessite un token admin valide

#### Request body

```json
{
  "fullName": "string — obligatoire, min 2 caractères (trim)",
  "email": "string — obligatoire, format email valide, sera normalisé en lowercase",
  "password": "string — obligatoire, min 4 caractères"
}
```

**Sources :** `src/controllers/authController.js:27-62`, `src/models/User.js:7-25`

#### Réponses

| Code  | Body                                                                                                                                      | Cas                                                                         |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `201` | `{ "success": true, "message": "Utilisateur créé avec succès.", "user": { "id", "fullName", "email", "role", "isActive", "createdAt" } }` | Succès (`authController.js:79-90`)                                          |
| `400` | `{ "success": false, "message": "Le nom complet, l'e-mail et le mot de passe sont obligatoires." }`                                       | Champs manquants ou type incorrect (`authController.js:34-37`)              |
| `400` | `{ "success": false, "message": "Le nom complet doit contenir au moins 2 caractères." }`                                                  | `fullName` trop court (`authController.js:44-47`)                           |
| `400` | `{ "success": false, "message": "Veuillez fournir un e-mail valide." }`                                                                   | Email invalide (`authController.js:50-54`)                                  |
| `400` | `{ "success": false, "message": "Le mot de passe doit contenir au moins 4 caractères." }`                                                 | Mot de passe trop court (`authController.js:57-61`)                         |
| `409` | `{ "success": false, "message": "Un utilisateur utilise déjà cet e-mail." }`                                                              | Email déjà utilisé (`authController.js:67-70` ou `authController.js:92-96`) |
| `401` | `{ "success": false, "message": "Token d'authentification manquant." }`                                                                   | Pas de token admin (`authMiddleware.js:7-10`)                               |
| `403` | `{ "success": false, "message": "Vous ne disposez pas des permissions nécessaires." }`                                                    | Rôle non-admin (`authMiddleware.js:45-48`)                                  |
| `500` | `{ "success": false, "message": "Une erreur est survenue lors de la création du compte." }`                                               | Erreur serveur (`authController.js:99-102`)                                 |

**Note :** Le rôle n'est pas spécifiable à la création — il sera toujours `receptionist` (default du modèle). Pour changer le rôle, utiliser ensuite `PATCH /users/:userId/role`.

---

### POST /api/auth/login

> **Middlewares :** `loginLimiter` (100 req/min)

#### Request body

```json
{
  "email": "string — obligatoire, recherché dans les champs email ET fullName (case-insensitive via trim+lowercase)",
  "password": "string — obligatoire"
}
```

**Source :** `src/controllers/authController.js:108-121`
**Note :** La recherche se fait sur `email` OU `fullName` grâce à l'opérateur `$or` (`authController.js:119-120`). L'utilisateur peut donc se connecter avec son nom complet.

#### Réponses

| Code  | Body                                                                                                                                                                                           | Cas                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `200` | `{ "success": true, "message": "Connexion réussie.", "accessToken": "...", "tokenType": "Bearer", "expiresIn": "15m", "user": { "id", "fullName", "email", "role" } }` + cookie `refreshToken` | Succès (`authController.js:142-157`)                                                                                 |
| `400` | `{ "success": false, "message": "L'e-mail et le mot de passe sont obligatoires." }`                                                                                                            | Types incorrects (`authController.js:111-114`)                                                                       |
| `401` | `{ "success": false, "message": "E-mail ou mot de passe incorrect." }`                                                                                                                         | Utilisateur introuvable, inactif, ou mauvais mot de passe (`authController.js:124-127`, `authController.js:133-136`) |
| `500` | `{ "success": false, "message": "Une erreur est survenue lors de la connexion." }`                                                                                                             | Erreur serveur (`authController.js:160-163`)                                                                         |

**Détails du cookie `refreshToken` (réponse) :**

- `httpOnly: true`
- `secure: true` en production uniquement
- `sameSite: 'lax'`
- `path: '/api/auth'`
- `maxAge: 604800000` ms (7 jours, configurable via `JWT_REFRESH_COOKIE_MAX_AGE`)

**Source :** `src/services/tokenService.js:57-64`

---

### POST /api/auth/refresh

> **Middlewares :** aucun

#### Request body

Aucun body JSON. Le refresh token est lu depuis le cookie httpOnly `refreshToken`.

**Source :** `src/controllers/authController.js:168`

#### Réponses

| Code  | Body                                                                                                                                                          | Cas                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `200` | `{ "success": true, "message": "Token d'accès renouvelé.", "accessToken": "...", "tokenType": "Bearer", "expiresIn": "15m" }` + nouveau cookie `refreshToken` | Succès — rotation du refresh token (`authController.js:200-209`)                                           |
| `401` | `{ "success": false, "message": "Session absente ou expirée." }`                                                                                              | Cookie absent (`authController.js:171-174`)                                                                |
| `401` | `{ "success": false, "message": "Session invalide." }`                                                                                                        | Session introuvable, utilisateur inactif, ou sub ne correspond pas (`authController.js:189-192`)           |
| `401` | `{ "success": false, "message": "Session invalide ou expirée." }`                                                                                             | Token JWT invalide ou expiré — l'ancien refresh token est supprimé de la BDD (`authController.js:215-218`) |

**Comportement important :** Ce endpoint fait une **rotation du refresh token** — l'ancien refresh token est supprimé et un nouveau est créé (`authController.js:195-197`). C'est un mécanisme de sécurité (refresh token rotation).

---

### POST /api/auth/logout

> **Middlewares :** aucun

#### Request body

Aucun body JSON. Le refresh token est lu depuis le cookie httpOnly `refreshToken`.

#### Réponses

| Code  | Body                                                                                  | Cas                                  |
| ----- | ------------------------------------------------------------------------------------- | ------------------------------------ |
| `200` | `{ "success": true, "message": "Déconnexion réussie." }` + cookie `refreshToken` vidé | Succès (`authController.js:231-237`) |

**Comportement :** Même si aucun cookie n'est présent, la route retourne 200 (`authController.js:225-228` — supprime simplement si existe).

---

### POST /api/auth/forgot-password

> **Middlewares :** `loginLimiter` (100 req/min)

#### Request body

```json
{
  "email": "string — obligatoire, sera normalisé en lowercase"
}
```

**Source :** `src/controllers/passwordController.js:14-23`

#### Réponses

| Code  | Body                                                                                                               | Cas                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `200` | `{ "success": true, "message": "Si un compte existe avec cet e-mail, un lien de réinitialisation a été envoyé." }` | Toujours 200 si l'email est valide (que l'utilisateur existe ou non) — message identique pour éviter l'énumération d'utilisateurs (`passwordController.js:28-32`, `passwordController.js:52-62`) |
| `200` | _(idem + champ `resetToken`)_                                                                                      | **Uniquement en mode `development`** — le token brut est retourné pour faciliter les tests (`passwordController.js:58-60`)                                                                       |
| `400` | `{ "success": false, "message": "L'e-mail est obligatoire." }`                                                     | Type incorrect (`passwordController.js:17-20`)                                                                                                                                                   |
| `500` | `{ "success": false, "message": "Impossible de traiter la demande de réinitialisation." }`                         | Erreur serveur (`passwordController.js:64-67`)                                                                                                                                                   |

**Détails du lien envoyé :** `{CLIENT_URL}/reset-password?token={resetToken}` (`passwordController.js:44-45`)
**Durée de validité du token :** 15 minutes (`passwordController.js:6`)

---

### POST /api/auth/reset-password

> **Middlewares :** aucun

#### Request body

```json
{
  "token": "string — obligatoire, le token brut reçu par e-mail",
  "newPassword": "string — obligatoire, min 8 caractères"
}
```

**Source :** `src/controllers/passwordController.js:73-87`

#### Réponses

| Code  | Body                                                                                                  | Cas                                                         |
| ----- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `200` | `{ "success": true, "message": "Mot de passe réinitialisé avec succès. Veuillez vous reconnecter." }` | Succès (`passwordController.js:113-117`)                    |
| `400` | `{ "success": false, "message": "Le token et le nouveau mot de passe sont obligatoires." }`           | Types incorrects (`passwordController.js:76-79`)            |
| `400` | `{ "success": false, "message": "Le mot de passe doit contenir au moins 8 caractères." }`             | Mot de passe trop court (`passwordController.js:82-86`)     |
| `400` | `{ "success": false, "message": "Le lien de réinitialisation est invalide ou expiré." }`              | Token inexistant ou expiré (`passwordController.js:97-100`) |
| `500` | `{ "success": false, "message": "Impossible de réinitialiser le mot de passe." }`                     | Erreur serveur (`passwordController.js:119-122`)            |

**Comportement :** Après réinitialisation, **tous les refresh tokens de l'utilisateur sont supprimés** (`passwordController.js:109-111`), ce qui force une reconnexion complète.

---

### GET /api/auth/me

> **Middlewares :** `authenticate` (tout rôle valide)

#### Réponses

| Code  | Body                                                                                          | Cas                                                                           |
| ----- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `200` | `{ "success": true, "user": { "id", "fullName", "email", "role", "isActive", "createdAt" } }` | Succès (`authController.js:251-261`)                                          |
| `401` | `{ "success": false, "message": "Utilisateur non autorisé." }`                                | Utilisateur introuvable ou `isActive === false` (`authController.js:245-248`) |
| `500` | `{ "success": false, "message": "Impossible de récupérer le profil utilisateur." }`           | Erreur serveur (`authController.js:263-266`)                                  |

---

### GET /api/auth/users

> **Middlewares :** `authenticate` + `authorizeRoles('admin')`

#### Réponses

| Code  | Body                                                                                                           | Cas                                                                    |
| ----- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `200` | `{ "success": true, "users": [{ "fullName", "email", "role", "isActive", "createdAt", "updatedAt", "_id" }] }` | Succès — triés par `createdAt` décroissant (`adminController.js:7-13`) |
| `500` | `{ "success": false, "message": "Impossible de récupérer les utilisateurs." }`                                 | Erreur serveur (`adminController.js:16-19`)                            |

**Note :** Chaque objet utilisateur dans le tableau contient aussi le champ `_id` (non explicitement sélectionné mais retourné car présent par défaut dans Mongoose). Les champs sélectionnés explicitement sont : `fullName email role isActive createdAt updatedAt` (`adminController.js:8`).

---

### PATCH /api/auth/users/:userId/role

> **Middlewares :** `authenticate` + `authorizeRoles('admin')`

#### Request body

```json
{
  "role": "string — obligatoire, doit être une valeur valide parmi : admin, manager, receptionist, housekeeping_supervisor, comptable"
}
```

**Source :** `src/controllers/adminController.js:26-33`

#### Réponses

| Code  | Body                                                                                                                        | Cas                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `200` | `{ "success": true, "message": "Rôle utilisateur mis à jour.", "user": { "id", "fullName", "email", "role", "isActive" } }` | Succès — tous les refresh tokens de l'utilisateur sont supprimés (`adminController.js:54-56`)      |
| `400` | `{ "success": false, "message": "Le rôle fourni est invalide." }`                                                           | Rôle non reconnu (`adminController.js:29-32`)                                                      |
| `400` | `{ "success": false, "message": "Un administrateur ne peut pas retirer son propre rôle admin." }`                           | L'admin tente de changer son propre rôle pour autre chose que `admin` (`adminController.js:35-39`) |
| `404` | `{ "success": false, "message": "Utilisateur introuvable." }`                                                               | userId inexistant (`adminController.js:44-47`)                                                     |
| `500` | `{ "success": false, "message": "Impossible de mettre à jour le rôle." }`                                                   | Erreur serveur (`adminController.js:69-72`)                                                        |

**Comportement :** Après changement de rôle, **tous les refresh tokens de l'utilisateur cible sont supprimés** (`adminController.js:54-56`), ce qui force une reconnexion.

---

### DELETE /api/auth/users/:userId

> **Middlewares :** `authenticate` + `authorizeRoles('admin')`

#### Réponses

| Code  | Body                                                                                   | Cas                                                                                       |
| ----- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `200` | `{ "success": true, "message": "Utilisateur supprimé avec succès." }`                  | Succès — refresh tokens supprimés puis utilisateur supprimé (`adminController.js:97-105`) |
| `400` | `{ "success": false, "message": "Vous ne pouvez pas supprimer votre propre compte." }` | L'admin tente de se supprimer lui-même (`adminController.js:81-85`)                       |
| `404` | `{ "success": false, "message": "Utilisateur introuvable." }`                          | userId inexistant (`adminController.js:90-93`)                                            |
| `500` | `{ "success": false, "message": "Impossible de supprimer cet utilisateur." }`          | Erreur serveur (`adminController.js:108-111`)                                             |

---

### GET /api/health

#### Réponses

| Code  | Body                                                                                            |
| ----- | ----------------------------------------------------------------------------------------------- |
| `200` | `{ "success": true, "message": "Le microservice Auth fonctionne.", "service": "auth-service" }` |

---

### Erreur 404 globale

Toute route non reconnue retourne (`src/server.js:44-49`) :

```json
{ "success": false, "message": "Route introuvable." }
```

### Erreur 500 globale

Toute erreur non interceptée dans un controller retourne (`src/server.js:51-58`) :

```json
{ "success": false, "message": "Une erreur interne est survenue." }
```

### Rate limit dépassé

```json
{
  "success": false,
  "message": "Trop de requêtes. Réessayez dans quelques minutes."
}
```

ou (login/forgot-password) :

```json
{ "success": false, "message": "Trop de tentatives. Réessayez plus tard." }
```

**Source :** `src/middlewares/rateLimitMiddleware.js:8-11,19-22`

---

## 6. Dépendances externes

### Appels sortants

| Destination               | Protocole | Détails                                                           | Token transmis | Source                               |
| ------------------------- | --------- | ----------------------------------------------------------------- | -------------- | ------------------------------------ |
| Serveur SMTP (Nodemailer) | SMTP      | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | N/A            | `src/services/emailService.js:17-25` |

### Base de données

| Destination   | Protocole     | Base       | Source                                       |
| ------------- | ------------- | ---------- | -------------------------------------------- |
| MongoDB Atlas | MongoDB (SRV) | `pms_auth` | `src/config/database.js:5`, `.env.example:3` |

### Autres services backend

**Aucun.** Ce service n'appelle aucun autre microservice. Il est isolé et autonome.

---

## 7. Points d'attention pour le frontend

### Authentification

1. **Le refresh token est dans un cookie httpOnly** — le frontend ne peut ni le lire ni le modifier. Il est automatiquement envoyé par le navigateur pour les requêtes sur le path `/api/auth` (`src/services/tokenService.js:63`).

2. **Le access token n'est PAS dans un cookie.** Le frontend doit le stocker en mémoire JavaScript (variable) et l'envoyer manuellement dans le header `Authorization: Bearer <token>`.

3. **Rotation du refresh token :** Chaque appel à `POST /api/auth/refresh` invalide l'ancien refresh token et en crée un nouveau. Le frontend n'a rien de spécial à faire — le nouveau cookie est défini automatiquement par le Set-Cookie de la réponse.

4. **Le champ `role` dans le JWT** est une string simple (ex: `"admin"`), pas un tableau.

5. **La durée de vie de l'access token est de 15 minutes** par défaut (`JWT_EXPIRES_IN`). Le frontend doit gérer le rafraîchissement proactif ou réagir aux erreurs 401 avec le message `"Votre token a expiré. Veuillez vous reconnecter."`.

### Login

6. **Recherche par nom complet OU email :** L'endpoint `POST /api/auth/login` recherche sur les champs `email` OU `fullName` (`src/controllers/authController.js:119-120`). L'utilisateur peut se connecter avec son nom complet.

7. **Le champ `user` retourné par login ne contient pas `isActive` ni `createdAt`** — seulement `id`, `fullName`, `email`, `role`. Pour obtenir `isActive`, appeler `GET /api/auth/me`.

### Création d'utilisateur

8. **Le rôle ne peut PAS être défini à la création** — il sera toujours `receptionist` (default du modèle, `src/models/User.js:41`). Pour assigner un autre rôle, appeler ensuite `PATCH /api/auth/users/:userId/role`.

9. **Minimum 4 caractères pour le mot de passe** à la création (`src/controllers/authController.js:57`), mais **8 caractères minimum pour la réinitialisation** (`src/controllers/passwordController.js:82`). Il y a donc une différence de validation entre les deux flux.

### Gestion des erreurs

10. **Le format d'erreur est toujours `{ "success": false, "message": "..." }`** — pas de tableau d'erreurs, pas de code d'erreur métier. Le frontend peut se baser uniquement sur le champ `message` pour afficher un toast/notification.

11. **Les erreurs 401 pour un token invalide/expiré et les erreurs d'authentification partagent le même code 401.** Le frontend doit vérifier le message pour distinguer un token expiré d'un token malformé.

### Comportements spécifiques

12. **Changement de rôle = déconnexion forcée :** `PATCH /api/auth/users/:userId/role` supprime tous les refresh tokens de l'utilisateur cible (`adminController.js:54-56`). Si un admin modifie le rôle d'un utilisateur connecté, cet utilisateur sera déconnecté à son prochain appel de refresh.

13. **Reset password = déconnexion forcée :** `POST /api/auth/reset-password` supprime tous les refresh tokens de l'utilisateur (`passwordController.js:109-111`).

14. **Un admin ne peut pas se supprimer** ni **retirer son propre rôle admin** (`adminController.js:35,81`).

15. **Le token de reset password expire en 15 minutes** (`passwordController.js:6`). En mode développement, le token brut est retourné dans la réponse pour faciliter les tests (`passwordController.js:58-60`) — ne pas compter sur cetteBehaviour en production.

16. **CORS :** La méthode HTTP `DELETE` n'est pas dans la liste des méthodes CORS autorisées (`src/config/corsOptions.js:4`). Les appels `DELETE /api/auth/users/:userId` depuis un frontend sur un autre origin seront bloqués par le navigateur sauf si le CORS est corrigé.

17. **Utilisateur inactif (`isActive: false`) :** Un utilisateur inactif ne peut pas se connecter (login retourne 401, `authController.js:123`) et son profil `/me` retourne 401 (`authController.js:244`). Cependant, son compte existe toujours en BDD et peut être réactivé.
