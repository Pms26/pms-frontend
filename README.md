# OASIS PMS — Frontend

Application frontend React + TypeScript pour OASIS PMS, système de gestion hôtelière pour AMH Hospitality — planning, réservations, front office, housekeeping, tarification, night audit et analytics.

## Stack technique

- **React** + **TypeScript**
- **Tailwind CSS** + design system custom (`globals.css`)
- **Axios** pour les appels HTTP
- **@tanstack/react-query** pour la gestion du cache et des états loading/error
- **Zustand** pour l'état global (utilisateur, rôle, token)
- **Chart.js** pour les graphiques (dashboard, analytics)

## Structure du projet
frontend/
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── front-office/
│   │   ├── check-in/
│   │   └── check-out/
│   ├── housekeeping/
│   ├── night-audit/
│   │   └── history/
│   ├── tarification/
│   ├── reservations/          # inclut aussi la vue Planning (?view=list)
│   ├── analytics/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # composants réutilisables
│   ├── layout/                 # sidebar, header, modales globales
│   ├── charts/                 # composants Chart.js
│   ├── context/                # ModalToastContext (modales + toasts globaux)
│   ├── front-office/
│   ├── planning/
│   └── reservations/
├── lib/
│   ├── api/                    # un fichier par domaine métier (mocké pour l'instant)
│   └── auth/                   # AuthContext
├── middleware.ts               # protection des routes par authentification/rôle
├── types/
└── package.json

## Authentification

Les routes sont protégées via `middleware.ts` : toute page nécessite un token valide, sinon redirection vers `/login`. Le contrôle d'accès par rôle est géré dans `lib/auth/AuthContext.tsx`.

## Données

Les appels API sont actuellement mockés dans `lib/api/*.ts`, en attendant la mise à disposition du backend. La structure des données mockées respecte le contrat attendu des futures réponses API, pour permettre un branchement transparent.

## Lancer le projet

```bash
cd frontend
npm install
npm run dev
```

Puis ouvrez http://localhost:3000

Identifiants de test : `admin` / `1234`

## Notes de développement

- Les modales globales (réservation, chambre, toast) sont gérées via `ModalToastContext` et rendues dans `AppShell`.
- La grille Planning est un composant React (`components/planning/PlanningGrid.tsx`), pas de manipulation DOM directe.
- Chaque graphique (`components/charts/`) initialise Chart.js via `useEffect`/`useRef` et nettoie l'instance au démontage.