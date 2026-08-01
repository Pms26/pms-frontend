# OASIS PMS — Frontend

Application frontend Next.js 14 (App Router) pour OASIS PMS, système de gestion hôtelière pour AMH Hospitality. Elle communique exclusivement avec le backend via le **api-gateway** (port 4000) — aucun appel direct aux microservices.

## Stack technique

Dépendances réelles (`package.json`) :

- **Next.js** `14.2.35` (App Router) + **React** `^18` / **react-dom** `^18`
- **@tanstack/react-query** `^5.101.2` — cache et états loading/error
- **Axios** `^1.18.1` — client HTTP (`lib/api/client.ts`)
- **Chart.js** `^4.4.3` + **react-chartjs-2** `^5.3.1` — graphiques
- **Zustand** `^5.0.14` — état global (auth)
- **Tailwind CSS** `^3.4.19` + design system custom (`globals.css`)
- **TypeScript** `5.5`

## Modules livrés

Chaque module correspond à un dossier réel dans `app/` :

| Module                          | Route principale                                                              |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Auth                            | `/login`, `/register`, `/forgot-password`, `/reset-password`                  |
| Dashboard                       | `/dashboard`                                                                  |
| Réservations (Planning + liste) | `/reservations` (planning), `/reservations?view=list` (liste)                 |
| Front Office                    | `/front-office/check-in`, `/front-office/check-out`, `/front-office/payments` |
| Housekeeping                    | `/housekeeping`                                                               |
| Night Audit                     | `/night-audit`, `/night-audit/history`                                        |
| Analytics                       | `/analytics`                                                                  |
| Tarification                    | `/tarification`                                                               |
| Users                           | `/users`                                                                      |

## Rôles gérés

5 rôles (`types/index.ts`, `UserRole`), contrôlés par `middleware.ts` (`ROLE_RESTRICTIONS`). Les routes non listées ci-dessous renvoient l'utilisateur vers sa page d'accueil (`ROLE_HOME_PAGES`).

- **admin** — accès complet : toutes les routes, y compris `/users`, `/register` (admin uniquement).
- **manager** — `/dashboard`, `/night-audit` (+`/history`), `/front-office` (check-in, check-out, payments), `/tarification`, `/analytics`, `/planning`, `/reservations`, `/housekeeping`. Restreint : `/users`, `/register`.
- **comptable** — `/dashboard`, `/night-audit` (+`/history`), `/front-office` (page + `/payments`, consultation de folio en lecture seule), `/tarification`, `/analytics`. Restreint : check-in, check-out, `/planning`, `/reservations`, `/housekeeping`, `/users`, `/register`.
- **receptionist** — `/front-office` (check-in, check-out, payments), `/planning`, `/reservations`, `/housekeeping`. Restreint : `/dashboard`, `/night-audit`, `/tarification`, `/analytics`, `/users`, `/register`.
- **housekeeping_supervisor** — `/front-office` (page + check-in + payments), `/housekeeping`. Restreint : check-out, `/planning`, `/reservations`, `/dashboard`, `/night-audit`, `/tarification`, `/analytics`, `/users`, `/register`.

Page d'accueil par rôle : `admin`/`manager`/`comptable` → `/dashboard`, `receptionist` → `/front-office`, `housekeeping_supervisor` → `/housekeeping`.

Les routes `/login`, `/forgot-password`, `/reset-password` sont publiques.

## Setup

```bash
npm install
```

Variables d'environnement requises (voir `.env.example`) :

```bash
# URL du api-gateway (ne jamais pointer vers les services individuels)
NEXT_PUBLIC_API_URL=http://localhost:4000

# Active les mocks au lieu des vrais appels API (true | false)
NEXT_PUBLIC_USE_MOCKS=false
```

Commandes :

```bash
npm run dev        # serveur de développement (http://localhost:3000)
npm run lint       # lint
npx tsc --noEmit   # typecheck
```

## Architecture

- **Gateway-only** : tous les appels passent par `apiClient` (Axios), dont le `baseURL` est `NEXT_PUBLIC_API_URL` (défaut `http://localhost:4000`). Aucune URL de microservice direct (4001-4009) dans `lib/`.
- **Couche API par module** : `lib/api/<module>.ts` (auth, analytics, frontOffice, housekeeping, nightAudit, reservations, tarification) ; le client partagé et le flag `USE_MOCKS` vivent dans `lib/api/client.ts`.
- **Mapping backend→frontend dans la couche API uniquement** : les types métier (`types/index.ts`) et les mappings (`mapBackendUser`, `mapBackendStatus`, etc.) sont confinés à `lib/api/*.ts` ; les pages ne manipulent que des types frontend.
- **Pas de `loading.tsx` / `error.tsx`** : aucun dans `app/`. Les états sont gérés en ligne via TanStack Query (`useQuery`/`useMutation`) directement dans les pages.
- **Auth** : token JWT dans cookie `token` + localStorage (`pms-token`), interceptor de refresh 401 → `/api/auth/refresh`, contexte dans `lib/auth/AuthContext.tsx`.
