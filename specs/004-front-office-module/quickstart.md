# Quickstart: Module Front Office — Gestion Complète du Séjour

**Date**: 2026-07-31 | **Branch**: `004-front-office-module`

## Prerequisites

1. Node modules installés : `npm install`
2. Backend front-office (port 4005) + gateway (port 4000) opérationnels ; données seedées côté backend (le seed se fait côté serveur, jamais via l'UI — FR-038)
3. `NEXT_PUBLIC_USE_MOCKS` non actif (le module front-office ne lit jamais ce flag)
4. Comptes de test avec les rôles `admin` / `manager` / `receptionist` / `housekeeping_supervisor` / `comptable`

## Setup

```bash
npm run dev          # frontend Next.js
npm run lint         # eslint
npx tsc --noEmit     # typecheck strict (pas de script dédié dans package.json)
```

## Scénarios de validation

### S1 — Liste des chambres et filtre (US1, FR-001/002/003)

1. Connecter `receptionist`, naviguer vers `/front-office/check-in`
2. **Attendu** : liste des chambres actives (numéro, catégorie, étage, type de lit, capacité, statut housekeeping) chargée depuis l'API — aucun montant/chambre codé en dur
3. Filtrer par statut (sale, nettoyage_en_cours, propre, controlee, bloquee) → la liste se restreint
4. Cliquer une chambre → détail (GET /api/rooms/:roomId)
5. **Attendu réceptionist** : aucun contrôle de modification de statut affiché (FR-006)

### S2 — Modification du statut housekeeping (FR-004/005)

1. Connecter `housekeeping_supervisor`, ouvrir une chambre dans `/front-office/check-in`
2. Changer le statut en `bloquee` sans motif → champ « Motif de blocage » exigé (blocage frontend, FR-005)
3. Saisir un motif → PATCH réussi, statut mis à jour dans la liste
4. **Attendu** : seule la zone chambres est visible pour ce rôle — aucune action check-in/folio/check-out (US7-1)

### S3 — Check-in complet avec pro-forma (US2, FR-007/008/010/012)

1. Connecter `receptionist` (ou admin/manager), dans `/front-office/check-in`
2. Saisir un bookingId valide (statut `status_confirmed` ou `status_voucher`) → détails affichés (client, chambre, dates, pax, régime, taux, dépôt, segment)
3. « Générer la pro-forma » → pro-forma affichée (séjour, tarif, dépôt, solde dû)
4. « Check-in » → succès ; les folios A et B s'affichent **depuis l'API** (`GET /api/folios/:folioId`) — `FOLIO_A_LINES` a disparu (FR-012)
5. Vérifier : `totalAmount` du folio cohérent avec les items affichés

### S4 — Erreurs métier exactes du check-in (FR-009/011)

1. Booking en statut non autorisé → « Pro-forma indisponible. Statut actuel: <status> » (pas de message générique)
2. Chambre non prête → « Chambre non prête. Statut: <statut> »
3. Dossier verrouillé (après check-out) → « Check-in impossible. Dossier verrouillé après check-out. »
4. Service housekeeping arrêté → message exact 503 du backend (ou « Service temporairement indisponible » si 502 gateway)

### S5 — Gestion des prestations du folio (US4, FR-015..022)

1. Sur une réservation checkée in, ouvrir le folio → liste `allItems` avec indicateur de visibilité à l'impression, total réel (FR-015/016)
2. Ajouter une prestation (description, catégorie, quantité, prix) → item visible, total mis à jour
3. Masquer un item à l'impression → `totalAmount` **inchangé** (FR-016, SC-008)
4. Connecter `receptionist` → bouton « Supprimer » absent (FR-021) ; connecter `admin`/`manager` → bouton présent
5. Folio clôturé → ajout/suppression désactivés avec message explicite (FR-018/022)
6. Sur un folio non vide → « Annuler le check-in » désactivé avec message (FR-014) ; folio vide → annulation possible (FR-013)

### S6 — Check-out avec encaissement exact (US5, FR-023..029)

1. Connecter `receptionist`, dans `/front-office/check-out`, saisir un bookingId `status_checked_in`
2. **Attendu** : extrait de compte complet depuis l'API (folios A+B, paiements existants, totalCharges, totalPaid) — le résumé codé en dur « 3 000 DH / 450 DH / 3 540 DH » a disparu (FR-024)
3. `balanceDue = totalCharges − totalPaid` affiché comme montant à encaisser (FR-026)
4. Répartir le paiement sur plusieurs modes (`cb`, `esp`, `chq`, `virement`, `debiteur`) avec montants ; total ≠ balanceDue → **blocage frontend** sans envoi API + « Le montant total des paiements doit correspondre au solde dû » (FR-028, SC-009)
5. Total = balanceDue (± 1 centime) → « Valider le Check-out » → succès + notification d'irréversibilité (dossier verrouillé, statut `status_checked_out`, folios clôturés) (FR-029, SC-010)
6. Recharger l'extrait du même booking → visible en lecture seule, aucune action de modification (US5-6, FR-036)

### S7 — Paiements et factures du jour (US6, FR-030/031/032)

1. Connecter n'importe quel rôle (y compris `comptable` et `housekeeping_supervisor`), naviguer vers `/front-office/payments`
2. **Attendu** : sous-section paiements du jour (montant, mode, référence, date) + factures du jour (folio, bookingRef, total, prestations), date du jour par défaut
3. Choisir une date sans données → « Aucune donnée pour cette date » (pas d'erreur) (FR-032)

### S8 — Consultation de folio du comptable (US6-5/6/7/8, FR-037, SC-003)

1. Connecter `comptable`, naviguer vers `/front-office/payments`
2. Vérifier que la sidebar pointe bien le comptable sur `/front-office/payments` et que seuls les onglets accessibles sont affichés
3. Rechercher par folioId → détail du folio en lecture seule (allItems + totalAmount), **aucun** bouton de modification (FR-037)
4. Rechercher par bookingId → extrait de compte en lecture seule (folios A+B, paiements, totalCharges, totalPaid)
5. Rechercher un folio/booking inexistant → « Folio introuvable » / message exact du backend, sans crash (US6-8)
6. Connecter `housekeeping_supervisor` → la sous-section « Consultation de folio » n'est **pas** affichée (US6-7)
7. Connecter `comptable` et tenter `/front-office/check-out` → redirigé par le middleware (accès refusé)

### S9 — Contrôle d'accès middleware (FR-033, US7-2/3)

| Rôle | Route index `/front-office` | `/front-office/check-in` | `/front-office/check-out` | `/front-office/payments` |
|---|---|---|---|---|
| admin / manager | → `/front-office/check-in` | ✅ | ✅ | ✅ |
| receptionist | → `/front-office/check-in` | ✅ | ✅ | ✅ |
| housekeeping_supervisor | → `/front-office/check-in` | ✅ (zone chambres) | ❌ redirigé | ✅ |
| comptable | → `/front-office/payments` | ❌ redirigé | ❌ redirigé | ✅ |

La route index `/front-office` ne doit **jamais** produire de boucle de redirection : sa cible est pilotée par le rôle (lu depuis `useAuthStore`, FR-035) et pointe toujours vers une route que le middleware autorise pour ce rôle (ERR_TOO_MANY_REDIRECTS interdit).

### S10 — Aucun fallback mock (SC-004/005)

1. Arrêter le backend front-office
2. Recharger `/front-office/check-in`, `/front-office/check-out`, `/front-office/payments`
3. **Attendu** : messages d'erreur (« Service temporairement indisponible » ou message exact 400/404/503), **jamais** de données mockées ou de tableau vide silencieux
4. Vérifier par grep : `lib/api/frontOffice.ts` ne contient plus `USE_MOCKS`, `MOCK_CHECKINS`, `MOCK_CHECKOUTS`, `MOCK_FOLIO_A/B`, `FOLIO_A_LINES` ; aucune donnée « 3 000 DH » codée en dur dans les pages

### S11 — Endpoint seed jamais exposé (FR-038, SC-011)

1. `grep -rn "seed" app/ components/ --include="*.tsx" --include="*.ts"` → aucune référence de bouton/lien/formulaire vers `POST /api/front-office/seed` (la seule occurrence attendue est éventuellement un commentaire/document)
2. `grep -n "seed" lib/api/frontOffice.ts` → aucune fonction seed
3. Vérifier manuellement : aucun élément UI déclenchant un re-seed des données

### S12 — Redirection de la route index `/front-office` par rôle (FR-033, anti boucle)

1. Connecter `comptable`, puis saisir directement l'URL `/front-office` (URL tapée, favori ou lien externe — **sans passer par la Sidebar**)
2. **Attendu** : atterrissage sur `/front-office/payments` en une seule redirection, sans boucle ni erreur navigateur (`ERR_TOO_MANY_REDIRECTS` interdit — l'ancien enchaînement `/front-office` → `/front-office/check-in` → blocage middleware est supprimé)
3. Répéter avec `admin`, `manager`, `receptionist`, `housekeeping_supervisor` → atterrissage sur `/front-office/check-in`
4. Vérifier : la cible est déterminée par le rôle lu depuis `useAuthStore` (FR-035), jamais par décodage JWT brut ; la redirection n'est déclenchée qu'une fois le store hydraté (`isHydrating === false`)
5. Vérifier : session expirée / déconnecté → `/front-office` redirigé vers `/login` sans erreur

## Références

- [Spec](../spec.md)
- [API Contracts](./contracts/api-contracts.md)
- [Component Contracts](./contracts/component-contracts.md)
- [Data Model](./data-model.md)
- [Research](./research.md)
