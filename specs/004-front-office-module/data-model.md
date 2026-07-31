# Data Model — Module Front Office

**Feature**: `/specs/004-front-office-module/spec.md`
**Date**: 2026-07-31
**Source du contrat**: `docs/front-office.md` §5 (réponses 200 et erreurs exactes), `docs/api-gateway.md` §3.6 (RBAC).

Tous les types ci-dessous sont ajoutés/alignés dans `types/index.ts`. La numérotation des montants backend est laissée telle quelle : les items de folio exposent `unitPrice`/`totalAmount`/`taxRate` en chaînes (contrat front-office.md §5.12), les totaux agrégés (`totalAmount`, `totalCharges`, `totalPaid`) en nombres. Le formattage d'affichage (locale fr, « DH ») est fait dans les composants, pas dans les types.

## Entités

### Room (aligné sur front-office.md §5.1)

| Champ | Type | Source backend | Notes |
|---|---|---|---|
| `id` | `string` | `id` | UUID |
| `roomNumber` | `string` | `roomNumber` | Accepté aussi comme identifiant de lookup |
| `category` | `RoomCategory` | `category` | `standard \| superior \| suite \| suite_deluxe \| lodge \| villa` (existant) |
| `floor` | `number` | `floor` | |
| `bedType` | `string` | `bedType` | ex. `double` |
| `maxOccupancy` | `number` | `maxOccupancy` | |
| `housekeepingStatus` | `HousekeepingStatus` | `housekeepingStatus` | `sale \| nettoyage_en_cours \| propre \| controlee \| bloquee` |
| `blockReason` | `string \| null` | `blockReason` | Requis (non-null) si statut `bloquee` |

**Validation** (backend, front-office.md §5.4) : `housekeepingStatus` requis ; `blockReason` requis si statut = `bloquee` (appliqué en UI, FR-005). Filtre `GET /api/rooms/status/:status` : statuts valides `sale`, `nettoyage_en_cours`, `propre`, `controlee`, `bloquee` (400 « Statut invalide » sinon).

### Booking (front-office.md §5.6)

| Champ | Type | Notes |
|---|---|---|
| `id` | `string` | bookingId |
| `ref` | `string` | Référence réservation |
| `status` | `BookingStatus` | `status_option \| status_confirmed \| status_voucher \| status_checked_in \| status_checked_out` |
| `locked` | `boolean` | Verrouillage après check-out (POST check-in : 400 si `true`) |
| `customer` | `{ firstName, lastName, email } \| null` | |
| `guest` | `{ firstName, lastName } \| null` | |
| `room` | `{ roomNumber, category } \| null` | |
| `checkInDate` / `checkOutDate` | `string` (YYYY-MM-DD) | |
| `pax` | `number` | |
| `regime` | `string` | |
| `roomRate` / `estimatedTotal` | `number` | |
| `deposit` | `object \| number` | Contrat polymorphe backend |
| `comments` | `string` | |
| `marketSegment` | `string \| null` | |
| `billToPartnerId` / `billToLabel` | `string \| null` | |

### Proforma (front-office.md §5.7)

`bookingId`, `bookingRef`, `status`, `customer`, `guest`, `room`, `stay { checkInDate, checkOutDate, nights, pax, regime }`, `pricing { roomRate, estimatedRoomAmount, deposit, balanceDue }`, `notes`.
**Précondition** : statut ∈ `{status_option, status_confirmed, status_voucher}` sinon 400 « Pro-forma indisponible. Statut actuel: <status> ».

### Folio & FolioItem (front-office.md §5.12)

- `Folio`: `id`, `type` (`A | B`), `label`, `status` (`open | closed`), `bookingId`, `totalAmount: number` (toutes prestations, y compris masquées).
- `FolioItem`: `id`, `description`, `category`, `quantity`, `unitPrice: string`, `totalAmount: string`, `taxRate: string`, `isVisibleOnPrint: boolean`, `date: string (timestamp)`.
- `FolioDetail`: `folio`, `allItems: FolioItem[]`, `printableItems: Omit<FolioItem, 'isVisibleOnPrint'>[]`, `printableTotal: number`.
- **Règle métier** : `totalAmount` du folio n'est jamais affecté par `isVisibleOnPrint` (FR-016, SC-008).

### Statement (front-office.md §5.10)

`booking { ref, customer, room, checkIn, checkOut|null, nights }`, `folios: StatementFolio[]` (`id, type, label, status, items: FolioItem[], totalAmount`), `payments: { amount, method, date }[]`, `totalCharges: number`, `totalPaid: number`.
**Dérivé frontend** : `balanceDue = totalCharges - totalPaid` (FR-026).
**Précondition backend** : statut `status_checked_in` ou `status_checked_out`, sinon 400 « Extrait disponible uniquement pour les séjours en cours ou terminés ».

### Payment (front-office.md §5.17)

`id`, `bookingId`, `folioId`, `amount: number`, `paymentMethod: PaymentMethod`, `reference: string|null`, `processedAt: string (timestamp)`.
`PaymentMethod = 'cb' | 'esp' | 'chq' | 'virement' | 'debiteur'` (front-office.md §5.11/§7.7, minuscules exactes).

### Invoice (front-office.md §5.18)

`folioId`, `bookingId`, `bookingRef|null`, `billToPartnerId|null`, `billToLabel|null`, `folioType: 'A'|'B'`, `label`, `closedAt: string`, `totalAmount: number`, `items: InvoiceItem[]` (`id, description, category, quantity, unitPrice, totalAmount, taxRate`).

### Réponses agrégées

- `PaymentsResponse`: `{ date, count, totalAmount, payments: Payment[] }`
- `InvoicesResponse`: `{ date, count, totalAmount, invoices: Invoice[] }`
- `CheckInResult` (POST check-in) : `{ message, booking: { id, status, actualCheckIn, room }, folios: { folioA: { id, type }, folioB: { id, type } } }` → fournit les folioIds à charger ensuite.
- `CheckOutPayment`: `{ paymentMethod: PaymentMethod, amount: number, folioType?: 'A'|'B', cardType?: string, reference?: string }`
- `CheckOutResult`: `{ message, booking: { id, status, actualCheckOut, room }, summary: { totalCharges, deposit, totalPaid, remainingBalance } }`

## Transitions d'état

### Cycle de vie d'une réservation (UI front-office)

```
status_option ─┐
status_voucher ┼─→ status_checked_in ──(POST /checkout)──→ status_checked_out (locked=true, folios closed)
status_confirmed┘         │
                          └──(DELETE /checkin, folio vide)──→ status_confirmed
```

- **Check-in** (`POST /api/checkin/:bookingId`) : préconditions backend — `locked=false` (400 « Check-in impossible. Dossier verrouillé après check-out. »), statut ∈ `{status_confirmed, status_voucher}` (400 « Check-in impossible. Statut actuel: <status> »), chambre prête (`controlee`/`propre`, 400 « Chambre non prête. Statut: <statut> »). Effets : folios A+B créés, statut `status_checked_in`.
- **Annulation de check-in** (`DELETE /api/checkin/:bookingId`) : uniquement si statut `status_checked_in` ET aucun item sur les folios (400 « Impossible d'annuler. Des prestations ont été enregistrées sur le folio. »). Bouton désactivé en UI si le folio chargé contient des items (FR-014).
- **Check-out** (`POST /api/checkout/:bookingId`) : uniquement si statut `status_checked_in`. Effets irréversibles : `status_checked_out`, `locked=true`, folios `closed`, chambre `sale` (FR-029, FR-036).
- **Folio** : `open → closed` (au check-out). Actions de modification (ajout/masquage/suppression) désactivées si `closed` (FR-018/022).

## Règles de validation (frontend, avant envoi API)

1. **Check-out — montant exact** (FR-028, front-office.md §7.3) : `|Σ montants saisis − balanceDue| < 0.01`, sinon blocage sans envoi API + message « Le montant total des paiements doit correspondre au solde dû ». Si `balanceDue = 0`, aucun paiement requis.
2. **Check-out — modes de paiement** : seuls `cb, esp, chq, virement, debiteur` sont sélectionnables (FR-027).
3. **Room — statut `bloquee`** : champ `blockReason` obligatoire (FR-005).
4. **Check-in — chambre prête** : le frontend peut pré-afficher « Chambre non prête » depuis la liste des chambres, mais la validation finale et le message exact proviennent du backend (FR-011).
5. **Folio item — champs requis** : `description`, `category`, `quantity` (défaut 1), `unitPrice`, `taxRate` (optionnel, défaut 0) (FR-017).

## Correspondance d'identifiants

- Les endpoints `GET /api/rooms/:roomId` acceptent UUID **ou** numéro de chambre (front-office.md §7.1).
- Le lookup folio par bookingId passe par l'extrait de compte (`GET /api/checkout/:bookingId/statement`) — aucun endpoint backend « folios par booking » n'existe ; ne pas en inventer (constitution : contrats vérifiés uniquement).
- Dates `payment.date` et `item.date` : timestamps backend ; affichées via `.slice(0,10)` / format local fr.

## Types supprimés

`FolioEntry`, `CheckOutSummary`, `PaymentMode` (remplacés par les types ci-dessus, FR-012/FR-024). `RoomStatus` (fusionné dans `HousekeepingStatus`).

## Types conservés (inchangés)

`UserRole`, `User`, `AuthState`, `LoginResponse`, `RoomCategory`, `Reservation`, `ReservationStatus`, `STATUS_LABELS/COLORS`, `SEGMENT_LABELS/COLORS`, types Night Audit / Analytics / Tarification, `Client`.
