# Specification Quality Checklist: Night Audit Frontend

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-27
**Updated**: 2026-07-27 (post-clarification)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Clarification Decisions (2026-07-27)

Three ambiguities were identified and resolved during the `/speckit.clarify` process:

### 1. Rollover Scope → **Out of Scope**
- **Decision**: Le rollover (POST `/api/night-audit/rollover`) n'est pas implémenté dans ce cycle.
- **Impact**: FR-009, User Story 4, SC-005 mis à jour pour ne mentionner que le masquage de la clôture pour le comptable.
- **Rationale**: Le rollover est une action complémentaire distincte de la clôture. L'UI actuelle n'a pas de bouton rollover. L'ajouter demanderait une User Story supplémentaire, un bouton dédié, et la gestion de la 409 BUSINESS_DAY_NOT_CLOSED.

### 2. History Detail → **Modal (GlobalModals pattern)**
- **Decision**: Le détail d'une clôture s'affiche dans un modal, pas dans une nouvelle route.
- **Impact**: User Story 6 mise à jour avec le pattern d'interaction "modal" et référence au composant GlobalModals existant.
- **Rationale**: Cohérent avec le pattern GlobalModals du projet et l'hypothèse de spec (pas de nouvelle page).

### 3. Check-Balance Prerequisite → **Mandatory**
- **Decision**: La vérification d'équilibre doit être exécutée au moins une fois avant que le bouton "Clôturer" ne devienne actif.
- **Impact**: User Story 3 mise à jour avec le prérequis. FR-006 mise à jour avec la condition. Nouvel edge case ajouté.
- **Rationale**: Cohérent avec User Story 2 qui décrit déjà le check-balance comme un prérequis fonctionnel avant toute clôture.

## Notes

- **1 [NEEDS CLARIFICATION] marker was resolved**: The comptable download
  question was resolved as Option A — download from history view only (where
  the backend endpoint authorizes it), not from the /close response (where
  download_url is only provided for admins). Updated in FR-020, FR-021, and
  User Story 7 acceptance scenario 3.
- Content Quality item "No implementation details" is marked PASS because the spec
  focuses on WHAT (user-visible behavior, error messages, role visibility) rather
  than HOW (file changes, library usage, code structure). Technical terms like
  "USE_MOCKS" appear only in the context of describing existing system behavior,
  not prescribing implementation approach.
- All other items pass validation.
