<!--
Sync Impact Report
==================
Version change: (uninitialized) → 1.0.0 (MAJOR — initial ratification)
Modified principles: N/A (first version)
Added sections:
  - Core Principles (5 principles)
  - Technical Stack (locked versions)
  - Architecture Conventions
  - Non-Negotiable Constraints
  - Explicitly Absent (exclusions)
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes needed
  - .specify/templates/spec-template.md ✅ no changes needed
  - .specify/templates/tasks-template.md ✅ no changes needed
Follow-up TODOs: none
-->

# OASIS PMS Frontend Constitution

## Core Principles

### I. Gateway-First Communication

All API communication MUST route exclusively through the api-gateway at port
4000 (`NEXT_PUBLIC_API_URL`). The frontend MUST NEVER establish direct
connections to any backend microservice (auth:4001, housekeeping:4002,
reservations:4003, tarification:4004, front-office:4005, analytics:4006,
night-audit:4007). Every new API function in `lib/api/` MUST use the shared
`apiClient` from `lib/api/client.ts`. The gateway rewrites paths — the frontend
MUST use gateway prefixes (`/api/auth/...`, `/api/housekeeping/...`, etc.) and
NEVER guess internal service paths. Endpoint contracts (paths, roles, permissions)
MUST be verified against `docs/<service>.md` before any implementation.

### II. Authenticated Route Protection

Every non-public route MUST be protected by the middleware
(`middleware.ts`) and the Zustand auth store (`lib/auth/AuthContext.tsx`).
The middleware handles JWT validation, expiration checks, and role-based access
control via `ROLE_RESTRICTIONS`. The auth store manages client-side session
state (`user`, `token`, `isAuthenticated`, `isHydrating`). Public paths are
limited to: `/login`, `/forgot-password`, `/reset-password`. Any new route
requiring authentication MUST be added to `ROLE_RESTRICTIONS` in `middleware.ts`
with its allowed roles. Role verification in UI components MUST read from
`useAuthStore` — never from raw JWT decoding in client code.

### III. Service-Per-File API Layer

Each backend domain maps to exactly one file in `lib/api/`:
`auth.ts`, `housekeeping.ts`, `reservations.ts`, `tarification.ts`,
`frontOffice.ts`, `nightAudit.ts`, `analytics.ts`. Each file exports
async functions that wrap `apiClient` calls and map backend responses to
frontend types (`types/index.ts`). Every API function MUST check `USE_MOCKS`
first and return mock data with `mockDelay()` when enabled. Backend-to-frontend
data mapping (field name translation, enum remapping) MUST happen inside the
API file, not in components. New backend services require a new file in
`lib/api/` following this exact pattern.

### IV. Component-Level Data Fetching with React Query

Data fetching MUST use `@tanstack/react-query` (`useQuery`, `useMutation`)
directly in page or component files — NOT in custom hooks or centralized
stores. The `queryKey` MUST include the entity and filter parameters. The
`queryFn` calls the corresponding function from `lib/api/<service>.ts`.
The QueryClient is configured globally in `components/layout/Providers.tsx`
with 5-minute staleTime, 2 retries, and no refetch on window focus. Global
state (auth, modals) is managed via Zustand or React Context — NOT via
React Query. React Query is exclusively for server state.

### V. Custom Design System Without External UI Libraries

The UI layer is built exclusively on Tailwind CSS 3.4.x with a custom
design system defined in `tailwind.config.ts` (OASIS PMS Design System).
Reusable primitives live in `components/ui/` (Badge, Button, Card, KPICard,
Modal, Table). Layout components live in `components/layout/` (AppShell,
Header, Sidebar, Providers, GlobalModals). No external UI kit (shadcn,
MUI, Bootstrap, Ant Design) is used or permitted. Animations use CSS
keyframes defined in Tailwind config — not framer-motion. Icons use
Bootstrap Icons (`bi bi-*` classes). Forms use controlled `useState`
patterns — not react-hook-form. All new UI MUST use the existing design
tokens (colors: accent, surface, border; fonts: Inter, Space Grotesk;
shadows: glow, card, card-hover; animations: slide-in, fade-in).

## Technical Stack

| Layer          | Technology            | Version   | Constraint                          |
|----------------|-----------------------|-----------|-------------------------------------|
| Framework      | Next.js (App Router)  | 14.2.35   | `reactStrictMode: false`            |
| Language       | TypeScript            | 5.5       | `strict: true` in tsconfig.json     |
| Styling        | Tailwind CSS          | 3.4.19    | Custom design tokens only           |
| State (global) | Zustand               | 5.0.14    | Auth store only; no other Zustand   |
| Server state   | @tanstack/react-query | 5.101.2   | `useQuery` in components directly   |
| HTTP client    | Axios                 | 1.18.1    | Shared `apiClient`, interceptors    |
| Charts         | Chart.js + react-chartjs-2 | 4.4.3 / 5.3.1 | `useEffect`/`useRef` init pattern |
| React          | React                 | ^18       |                                     |
| PostCSS        | postcss + autoprefixer| 8.5 / 10.5 |                                   |

## Architecture Conventions

### Folder Structure

```
app/                          # Next.js App Router — one folder per business module
  <module>/page.tsx           # Each module is a single page.tsx (no loading.tsx/error.tsx)
  layout.tsx                  # Root layout (Providers → AppShell)
  globals.css                 # Global styles + design tokens
  not-found.tsx               # Global 404
  global-error.tsx            # Global error boundary
components/
  ui/                         # Reusable primitives (Badge, Button, Card, KPICard, Modal, Table)
  layout/                     # App shell (AppShell, Header, Sidebar, Providers, GlobalModals)
  context/                    # Global React contexts (ModalToastContext)
  charts/                     # Chart.js wrappers
  <module>/                   # Module-specific components (front-office, planning, reservations)
lib/
  api/                        # One file per backend service + client.ts
    client.ts                 # Axios instance, interceptors, USE_MOCKS flag
    <service>.ts              # API functions for each domain
  auth/
    AuthContext.tsx            # Zustand auth store
types/
  index.ts                    # All shared TypeScript types and enums
middleware.ts                 # Route protection + role-based access
```

### Authentication & Route Protection Pattern

1. `middleware.ts`: Checks JWT in cookies → validates expiration → checks
   role against `ROLE_RESTRICTIONS` → redirects to `/login` or `/dashboard`.
2. `lib/auth/AuthContext.tsx`: Zustand store with `login()`, `logout()`,
   `hydrate()`, `setAuth()`. Persists token in localStorage (`pms-token`)
   and cookie (`token`).
3. `components/layout/Providers.tsx`: Calls `hydrate()` on mount to restore
   session from localStorage.
4. `lib/api/client.ts`: Request interceptor attaches `Authorization: Bearer`
   header. Response interceptor handles 401 → refresh token → retry or
   redirect to `/login`.

### Role-Based UI Pattern

Roles are checked at three levels:
- **Middleware** (`middleware.ts`): `ROLE_RESTRICTIONS` map — blocks
  navigation to unauthorized routes entirely.
- **Sidebar** (`components/layout/Sidebar.tsx`): Filters visible nav items
  based on `useAuthStore((s) => s.user)?.role`.
- **Components**: When role-based visibility is needed inside a page,
  read `useAuthStore((s) => s.user)` and conditionally render. No
  dedicated `useRole()` hook exists.

### Mock/API Pattern

The `USE_MOCKS` flag (`NEXT_PUBLIC_USE_MOCKS` env var) controls data source.
Every API function in `lib/api/*.ts` MUST follow this pattern:

```typescript
export async function getSomething(): Promise<Something[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return MOCK_DATA;
  }
  const res = await apiClient.get('/api/<service>/<resource>');
  return mapBackendToFrontend(res.data);
}
```

This pattern MUST be preserved in all existing and new API functions. The
mock fallback ensures frontend development is unblocked when backends are
down. Error handling uses try/catch with fallback to mock data or empty
arrays — never raw error propagation to the UI without a user-friendly
message.

## Non-Negotiable Constraints

1. **Gateway-only communication**: No direct calls to backend services.
   `NEXT_PUBLIC_API_URL` points to port 4000. No exceptions.
2. **Contract verification**: Before implementing any new API integration,
   the relevant `docs/<service>.md` file MUST be consulted for endpoints,
   required roles, and response formats. Never assume endpoint shapes.
3. **Shared apiClient**: All HTTP calls MUST use `apiClient` from
   `lib/api/client.ts`. Never instantiate a separate Axios instance.
4. **TypeScript strict mode**: `strict: true` is enforced. No `any` types
   in new code (existing `any` in mapping functions is acknowledged
   technical debt).
5. **French-only interface**: All user-facing text is in French. No i18n
   framework. Locale is hardcoded as `lang="fr"` in the root layout.
6. **No external UI dependencies**: No shadcn, MUI, Bootstrap JS, or
   similar. Tailwind + custom design tokens + `components/ui/` only.
7. **Existing loading/error pattern**: Modules currently manage loading
   states via react-query's `isLoading` inline in components. There are
   no `loading.tsx` or `error.tsx` files per route. This is the established
   pattern. New modules SHOULD follow the same approach unless a deliberate
   decision is made to introduce per-route loading/error boundaries (which
   would require a constitution amendment).

## Explicitly Absent (Exclusions)

The following are **not present** in the codebase and MUST NOT be introduced
without a constitution amendment:

| Absence              | Status         | Rationale                                              |
|----------------------|----------------|--------------------------------------------------------|
| External UI kit      | Intentional    | Custom design system is mature and comprehensive       |
| react-hook-form      | Intentional    | Simple controlled forms with useState are sufficient   |
| date-fns / dayjs     | Intentional    | Dates handled as ISO strings; no complex date math     |
| i18n framework       | Intentional    | Single-language (French) application                   |
| framer-motion        | Intentional    | CSS animations via Tailwind keyframes are sufficient   |
| Zustand (beyond auth)| Intentional    | Server state via React Query; global UI state via Context |
| Custom React hooks   | Intentional    | Data fetching inline in components; no shared hook layer|
| loading.tsx/error.tsx| Assumed choice | Managed via react-query inline; see Non-Negotiable #7  |

## Governance

This constitution reflects the actual state of the OASIS PMS frontend
codebase as of 2026-07-27. It is the authoritative reference for all
new development on this repository.

**Amendment process**: Any change to a principle, constraint, or excluded
technology MUST be proposed as a constitution amendment with:
1. Justification grounded in concrete technical need
2. Impact assessment on existing modules
3. Migration plan if the change affects existing code

**Compliance review**: All new feature specifications and implementation
plans MUST verify compliance with this constitution during the
`/speckit.plan` phase (Constitution Check gate).

**Versioning policy**: This constitution follows semantic versioning:
- MAJOR: Principle removal or redefinition that breaks existing conventions
- MINOR: New principle or section added
- PATCH: Clarifications, wording fixes, non-semantic refinements

**Supremacy**: This constitution supersedes any conflicting information
in README.md, inline code comments, or external documentation when
governing frontend development practices.

**Version**: 1.0.0 | **Ratified**: 2026-07-27 | **Last Amended**: 2026-07-27
