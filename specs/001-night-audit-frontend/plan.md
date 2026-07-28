# Implementation Plan: Night Audit Frontend — Connexion au Backend

**Branch**: `001-night-audit-frontend` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-night-audit-frontend/spec.md`

## Summary

Connect the Night Audit frontend module to the real backend `service-night-audit`
(port 4007 via api-gateway at port 4000). Replace all mock data with real API calls,
extend TypeScript types to match backend response shapes, add missing API functions
for history detail and report download, fix the closure confirmation modal to use
GlobalModals pattern, implement check-balance prerequisite gating the close button,
and add role-based UI hiding for the comptable role. The rollover feature is explicitly
out of scope (C1).

## Technical Context

**Language/Version**: TypeScript 5.5, React 18, Next.js 14.2.35 (App Router)

**Primary Dependencies**:
- `@tanstack/react-query` 5.101.2 (server state: useQuery/useMutation)
- `axios` 1.18.1 (shared `apiClient` from `lib/api/client.ts`)
- `zustand` 5.0.14 (auth store only)
- `tailwindcss` 3.4.19 (styling, custom design tokens)
- Bootstrap Icons (icon classes `bi bi-*`)

**Storage**: N/A (frontend-only, no local persistence beyond auth token in localStorage/cookie)

**Testing**: No test framework configured in the project. Manual validation via quickstart guide.

**Target Platform**: Web browser (SPA), desktop-first hotel PMS dashboard

**Project Type**: web-application (frontend only — backend is separate microservice)

**Performance Goals**:
- SC-001: Status load < 3s
- SC-002: Check-balance results < 5s
- SC-003: Closure completion < 15s (incl. PDF generation)

**Constraints**:
- All API calls via api-gateway only (port 4000, `NEXT_PUBLIC_API_URL`)
- No direct connections to backend services
- French-only UI, no i18n
- Custom design system only (no external UI kits)
- `strict: true` TypeScript, no `any` in new code
- Preserve `USE_MOCKS` pattern with `mockDelay()` fallback

**Scale/Scope**: Single hotel PMS, ~4-6 concurrent users (admin, manager, comptable, receptionist), low-volume CRUD + financial reporting module

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Gateway-First Communication | ✅ PASS | All API functions use `apiClient` pointing to port 4000. No direct backend calls planned. |
| II. Authenticated Route Protection | ✅ PASS | `/night-audit` open to all authenticated; `/night-audit/history` restricted via ROLE_RESTRICTIONS. Role checks via `useAuthStore`. |
| III. Service-Per-File API Layer | ✅ PASS | All night-audit API functions live in `lib/api/nightAudit.ts`. New functions (history detail, report download) added to same file. |
| IV. Component-Level Data Fetching | ✅ PASS | `useQuery`/`useMutation` used directly in page components. No custom hooks or centralized stores for server state. |
| V. Custom Design System | ✅ PASS | All UI uses Tailwind + existing design tokens. GlobalModals pattern reused for closure detail modal. No external UI libs. |

**Non-Negotiable Constraints Check**:
- ✅ Gateway-only: `apiClient` from `lib/api/client.ts` used exclusively
- ✅ Contract verification: `docs/night-audit.md` consulted for all endpoints
- ✅ Shared `apiClient`: No separate Axios instances
- ✅ TypeScript strict: No `any` in new code
- ✅ French-only: All user-facing strings in French
- ✅ No external UI: Tailwind + GlobalModals + `components/ui/` only
- ✅ Existing loading/error pattern: react-query `isLoading` inline in components

**Gate Result**: ✅ PASS — No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-night-audit-frontend/
├── spec.md              # Feature specification (/speckit.clarify output)
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
│   └── night-audit-api.md
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
lib/api/
├── client.ts                 # Shared apiClient (NO changes needed)
└── nightAudit.ts             # MODIFY: replace mocks, add new functions

types/
└── index.ts                  # MODIFY: extend NightAuditStatus, Closure, NightAuditReport types

app/night-audit/
├── page.tsx                  # MODIFY: add check-balance prerequisite, fix modal, wire real API
└── history/
    └── page.tsx              # MODIFY: wire real API, add click handler for detail modal

components/layout/
├── GlobalModals.tsx          # MODIFY: add ClosureDetailModal
└── ...                       # (existing modals unchanged)

components/context/
└── ModalToastContext.tsx     # MODIFY: add closure detail modal state

middleware.ts                 # NO changes (ROLE_RESTRICTIONS already correct)
lib/api/client.ts             # NO changes (USE_MOCKS pattern preserved as-is)
```

**Structure Decision**: Single Next.js project. Feature modifies existing files in
`lib/api/`, `types/`, `app/night-audit/`, and `components/layout/`. No new directories
or files required beyond documentation artifacts.

## Complexity Tracking

> No Constitution violations — section not needed.
