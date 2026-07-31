# Contracts Composants — Module Front Office

**Source**: spec 004 (FR-001 à FR-038), `docs/front-office.md`, `components/ui/` + `components/context/ModalToastContext.tsx`.
**Pattern d'état** : React Query (`isLoading`, `isError`) géré inline dans les composants — pas de `loading.tsx`/`error.tsx` (constitution, Non-Negotiable #7). Erreurs affichées : `error.message` (normalisé dans `lib/api/frontOffice.ts`).

## FrontOfficeTabs (modifié)

Trois onglets : **Check-in** (`/front-office/check-in`, `bi-box-arrow-in-right`), **Check-out** (`/front-office/check-out`, `bi-box-arrow-right`), **Paiements** (`/front-office/payments`, `bi-cash-stack`). Onglets filtrés par rôle (lecture via `useAuthStore`, FR-035) :

| Rôle | Onglets visibles |
|---|---|
| admin, manager, receptionist | Check-in, Check-out, Paiements |
| housekeeping_supervisor | Check-in, Paiements |
| comptable | Paiements uniquement |

État actif : `usePathname().startsWith('/front-office/<onglet>')`.

## Page Check-in `/front-office/check-in` (modifiée)

Middleware : admin, manager, receptionist, housekeeping_supervisor.

### Zone Chambres (tous rôles de la page ; seule zone visible pour housekeeping_supervisor)

- **Liste + filtre** : `getRooms()` (queryKey `['fo-rooms']`), filtre `getRoomsByStatus(status)` (queryKey `['fo-rooms', status]`). États : loading (skeleton) ; error → message ; empty → « Aucune chambre ».
- **Détail chambre** : sélection → `getRoom(roomId)` (queryKey `['fo-room', roomId]`) ; affiche numéro, catégorie, étage, type de lit, capacité, statut housekeeping (FR-003).
- **Modification statut** (admin, manager, housekeeping_supervisor uniquement) : `updateRoomStatus(roomId, housekeepingStatus, blockReason?)` (mutation). Champ `blockReason` obligatoire si `bloquee` (FR-005). Non rendu pour receptionist (FR-006, FR-034).

### Zone Check-in (admin, manager, receptionist — masquée pour housekeeping_supervisor)

- **Recherche** : input bookingId → `getBooking(bookingId)` (queryKey `['fo-booking', bookingId]`, `enabled: !!bookingId`). Affiche client/guest, chambre, dates, pax, régime, taux, dépôt, segment (FR-007). Erreur : message exact du backend.
- **Pro-forma** : bouton « Générer la pro-forma » (ou auto) → `getProforma(bookingId)` (queryKey `['fo-proforma', bookingId]`). Si statut hors {option, confirmed, voucher} → message exact « Pro-forma indisponible. Statut actuel: <status> » (FR-009). Affichage : séjour (nuits), tarif, dépôt, solde dû (FR-008).
- **Check-in** : `performCheckIn(bookingId)` (mutation). Erreurs métier exactes affichées dans la zone (FR-011) : dossier verrouillé, statut non autorisé, chambre non prête, chambre introuvable, service housekeeping indisponible. Succès → recharger la réservation + charger les folios.
- **Folios après check-in** : à partir du résultat (`folios.folioA.id`, `folios.folioB.id`) → `getFolio(folioId)` pour A et B (queryKey `['fo-folio', id]`). Remplace `FOLIO_A_LINES` (FR-012). Onglets Folio A / Folio B ; affichage de `allItems` (distinction allItems vs printableItems, FR-015) et `totalAmount` (FR-016).
- **Gestion prestations** (admin, manager, receptionist) : ajout `addFolioItem(folioId, item)` (FR-017), masquage `setItemVisibility` (FR-019), suppression `deleteFolioItem` **rendue uniquement pour admin/manager** (FR-020/021). Désactivé si folio `closed` (FR-018/022). 
- **Annulation de check-in** : `cancelCheckIn(bookingId)` (mutation) ; bouton désactivé si folios contiennent des items, message « Impossible d'annuler : des prestations ont été enregistrées sur le folio. » (FR-013/014).
- **Irréversibilité** : si statut `status_checked_out` / `locked` → aucune action de modification (FR-036).

## Page Check-out `/front-office/check-out` (modifiée)

Middleware : admin, manager, receptionist.

- **Recherche** : input bookingId → `getStatement(bookingId)` (queryKey `['fo-statement', bookingId]`, `enabled: !!bookingId`). Affiche extrait : folios A+B avec items, paiements existants, totalCharges, totalPaid (FR-023). Remplace le résumé codé en dur « 3 000 DH / 450 DH / 90 DH » (FR-024).
- **Solde dû** : `balanceDue = totalCharges − totalPaid` calculé côté client (FR-026).
- **Encaissement réparti** : liste des modes `cb, esp, chq, virement, debiteur` avec saisie de montant par mode (FR-027). 
- **Validation montant exact** (FR-028) : `|Σ montants − balanceDue| < 0.01` sinon blocage **sans envoi API** + « Le montant total des paiements doit correspondre au solde dû ». Si `balanceDue = 0`, aucun paiement requis.
- **Check-out** : `performCheckOut(bookingId, payments)` (mutation). Erreurs exactes : statut actuel, aucun mode, mode invalide, montant ≠ solde, folio introuvable, synchronisation statut (502 → « Service temporairement indisponible »).
- **Confirmation irréversibilité** : après succès, notification explicite : dossier verrouillé, `status_checked_out`, folios clôturés, chambre « sale » (FR-029). Si statut déjà `status_checked_out`, l'extrait reste consultable mais aucune action (US5-6).

## Page Payments `/front-office/payments` (nouvelle)

Middleware : tous les rôles authentifiés. Date du jour par défaut (`new Date().toISOString().slice(0,10)`), sélecteur de date.

1. **Sous-section Paiements du jour** — `getPayments(date)` (queryKey `['fo-payments', date]`). Table : montant, mode, référence, date de traitement, bookingId. Empty : « Aucune donnée pour cette date » (FR-032).
2. **Sous-section Factures du jour** — `getInvoices(date)` (queryKey `['fo-invoices', date]`). Table : folio, bookingRef, type, label, total, prestations. Empty : « Aucune donnée pour cette date » (FR-032).
3. **Sous-section Consultation de folio** — **rendue uniquement pour admin, manager, receptionist, comptable** (FR-037) :
   - Recherche par folioId → `getFolio(folioId)` (queryKey `['fo-folio-consult', folioId]`).
   - Recherche par bookingId → `getStatement(bookingId)` (queryKey `['fo-statement-consult', bookingId]`).
   - Affichage en **lecture seule** : allItems, totalAmount (folio) ou folios A+B + paiements + totaux (statement). **Aucun** bouton d'ajout/masquage/suppression pour tous rôles.
   - Erreurs exactes : « Folio introuvable », « Extrait disponible uniquement pour les séjours en cours ou terminés ».

## Sidebar (modifié)

- Comptable : item « Front Office » → href `/front-office/payments` (match `pathname.startsWith('/front-office')` inchangé).
- admin/manager/receptionist/housekeeping_supervisor : href `/front-office/check-in` inchangé.

## Query Keys (récapitulatif)

| Key | Fonction | Invalidation |
|---|---|---|
| `['fo-rooms']` / `['fo-rooms', status]` | getRooms / getRoomsByStatus | après updateRoomStatus |
| `['fo-room', roomId]` | getRoom | — |
| `['fo-booking', bookingId]` | getBooking | après check-in/annulation |
| `['fo-proforma', bookingId]` | getProforma | — |
| `['fo-folio', folioId]` | getFolio (check-in) | après addItem/setVisibility/deleteItem |
| `['fo-statement', bookingId]` | getStatement (check-out) | après check-out |
| `['fo-payments', date]` | getPayments | — |
| `['fo-invoices', date]` | getInvoices | — |
| `['fo-folio-consult', folioId]` / `['fo-statement-consult', bookingId]` | Consultation folio | — |

## Design system

Composants réutilisés : `Card`, `Table`, `Button`, `Badge`, `Modal`, `KPICard` (si pertinent) ; toasts via `useModalToast` pour les confirmations/erreurs de mutation. Icônes Bootstrap Icons. Textes en français. Classes Tailwind/design tokens existantes (`pms-section`, `glass-card`, `btn-pms`, `checkin-item`, etc. déjà présentes dans le CSS).
