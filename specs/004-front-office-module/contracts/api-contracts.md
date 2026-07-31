# Contracts API — Module Front Office

**Source**: `docs/front-office.md` §2/§5 (backend front-office 4005) + `docs/api-gateway.md` §2/§3.6.
**Convention**: tous les appels passent par `apiClient` (lib/api/client.ts) avec le préfixe gateway `/api/front-office`, réécrit par le gateway en `/api` vers le port 4005. Corps d'erreur normalisé par le backend : `{ "error": "<message>" }`.
**Normalisation d'erreur (frontend)** : 502 → « Service temporairement indisponible » ; sinon `error` exact du body ; réseau/hors réponse → « Service temporairement indisponible ».

---

## 1. Chambres

### GET `/api/front-office/rooms` — Liste des chambres actives
Rôles (backend) : admin, manager, housekeeping_supervisor, receptionist.
Réponse 200 :
```json
{ "count": 8, "rooms": [ { "id": "uuid", "roomNumber": "101", "category": "standard", "floor": 1, "bedType": "double", "maxOccupancy": 2, "housekeepingStatus": "controlee", "blockReason": null } ] }
```

### GET `/api/front-office/rooms/status/:status` — Filtrer par statut
Statuts valides : `sale`, `nettoyage_en_cours`, `propre`, `controlee`, `bloquee`.
Réponse 200 : `{ "status": "propre", "count": 2, "rooms": [ { id, roomNumber, category, floor, blockReason } ] }`
Erreurs : 400 `{ "error": "Statut invalide" }`.

### GET `/api/front-office/rooms/:roomId` — Détail (UUID ou numéro)
Réponse 200 : objet room complet (cf. §1 liste).
Erreurs : 404 `{ "error": "Chambre introuvable" }`.

### PATCH `/api/front-office/rooms/:roomId/status` — Mettre à jour le statut
Rôles : admin, manager, housekeeping_supervisor.
Body : `{ "housekeepingStatus": "<statut>", "blockReason": "<motif optionnel, requis si bloquee>" }`
Réponse 200 : `{ "message": "Statut mis à jour", "room": { id, roomNumber, housekeepingStatus, blockReason } }`
Erreurs : 400 `{ "error": "Identifiant de chambre invalide" }` ; 404 `{ "error": "Chambre introuvable" }` ; 502 `{ "error": "<message service housekeeping>" }`.

## 2. Check-in

### GET `/api/front-office/checkin/:bookingId` — Détails réservation
Rôles : tout utilisateur authentifié (backend) — restriction UI front-office.md §4 appliquée par le frontend.
Réponse 200 : voir `Booking` dans data-model.md.
Erreurs : 500 `{ "error": "<message>" }`.

### GET `/api/front-office/checkin/:bookingId/proforma` — Facture pro-forma
Précondition : statut ∈ {status_option, status_confirmed, status_voucher}.
Réponse 200 : voir `Proforma` dans data-model.md (`pricing.balanceDue = estimatedRoomAmount − deposit`).
Erreurs : 400 `{ "error": "Pro-forma indisponible. Statut actuel: <status>" }` — affiché textuellement (FR-009).

### POST `/api/front-office/checkin/:bookingId` — Effectuer le check-in
Rôles : admin, manager, receptionist. Body : `{}`.
Réponse 200 : `{ "message": "Check-in effectué avec succès", "booking": { id, status: "status_checked_in", actualCheckIn, room }, "folios": { folioA: { id, type: "A" }, folioB: { id, type: "B" } } }`
Erreurs (affichées textuellement, FR-011) :
| Code | Body |
|---|---|
| 400 | `{ "error": "Check-in impossible. Dossier verrouillé après check-out." }` |
| 400 | `{ "error": "Check-in impossible. Statut actuel: <status>" }` |
| 400 | `{ "error": "Chambre non prête. Statut: <statut>" }` |
| 404 | `{ "error": "Chambre introuvable dans la réservation" }` |
| 503 | `{ "error": "Impossible de vérifier le statut..." }` (service housekeeping indisponible) |

### DELETE `/api/front-office/checkin/:bookingId` — Annuler le check-in
Rôles : admin, manager, receptionist. Préconditions : statut `status_checked_in` + aucun item sur les folios.
Réponse 200 : `{ "message": "Check-in annulé avec succès", "booking": { id, status: "status_confirmed" } }`
Erreurs :
| Code | Body |
|---|---|
| 400 | `{ "error": "Annulation impossible. Statut actuel: <status>" }` |
| 400 | `{ "error": "Impossible d'annuler. Des prestations ont été enregistrées sur le folio." }` |
| 404 | `{ "error": "Chambre introuvable" }` |

## 3. Check-out

### GET `/api/front-office/checkout/:bookingId/statement` — Extrait de compte
Rôles : tout utilisateur authentifié (backend). Précondition : statut `status_checked_in` ou `status_checked_out`.
Réponse 200 : voir `Statement` dans data-model.md.
Erreurs : 400 `{ "error": "Extrait disponible uniquement pour les séjours en cours ou terminés" }`.

### POST `/api/front-office/checkout/:bookingId` — Check-out + encaissement
Rôles : admin, manager, receptionist.
Body : `{ "payments": [ { "paymentMethod": "cb|esp|chq|virement|debiteur", "amount": <number>, "folioType": "A|B", "cardType": "visa"?, "reference": "string"? } ] }`
Préconditions backend : statut `status_checked_in` ; si `balanceDue ≠ 0`, ≥ 1 paiement ; `Σ payments = balanceDue` (tolérance centimes) ; `paymentMethod` valide.
Réponse 200 : `{ "message": "Check-out effectué avec succès", "booking": { id, status: "status_checked_out", actualCheckOut, room }, "summary": { totalCharges, deposit, totalPaid, remainingBalance } }`
Erreurs :
| Code | Body |
|---|---|
| 400 | `{ "error": "Check-out impossible. Statut actuel: <status>" }` |
| 400 | `{ "error": "Aucun mode de paiement sélectionné" }` |
| 400 | `{ "error": "Mode de paiement invalide: <method>" }` |
| 400 | `{ "error": "Le montant des paiements ne correspond pas au solde dû." }` |
| 400 | `{ "error": "Folio <type> introuvable" }` |
| 502 | `{ "error": "Impossible de synchroniser le statut..." }` |

## 4. Folios

### GET `/api/front-office/folios/:folioId` — Détail complet du folio
Rôles : admin, manager, receptionist, **comptable** (lecture seule). Endpoint utilisé par la sous-section « Consultation de folio » (FR-037).
Réponse 200 : `{ "folio": { id, type, label, status, bookingId, totalAmount }, "allItems": [ { id, description, category, quantity, unitPrice, totalAmount, taxRate, isVisibleOnPrint, date } ], "printableItems": [ ...sans isVisibleOnPrint ], "printableTotal": <number> }`
Erreurs : 404 `{ "error": "Folio introuvable" }`.

### POST `/api/front-office/folios/:folioId/items` — Ajouter une prestation
Rôles : admin, manager, receptionist.
Body : `{ "description": "string", "category": "string", "quantity": 1, "unitPrice": <number>, "taxRate": 0 }`
Réponse 201 : `{ "message": "Prestation ajoutée avec succès", "item": { id, description, category, quantity, unitPrice, totalAmount }, "folioTotal": <number> }`
Erreurs : 404 `{ "error": "Folio introuvable" }` ; 400 `{ "error": "Folio clôturé. Impossible d'ajouter des prestations." }`.

### PATCH `/api/front-office/folios/items/:itemId/visibility` — Masquage individuel
Rôles : admin, manager, receptionist. Body : `{ "isVisible": <boolean> }`
Réponse 200 : `{ "message": "Visibilité mise à jour", "item": { id, description, isVisibleOnPrint } }`
Erreurs : 404 `{ "error": "Prestation introuvable" }`.

### PATCH `/api/front-office/folios/:folioId/items/visibility` — Masquage groupé
Rôles : admin, manager, receptionist. Body : `{ "itemIds": ["uuid1"], "isVisible": <boolean> }`
Réponse 200 : `{ "message": "Visibilité mise à jour pour les prestations sélectionnées" }`
Erreurs : 404 `{ "error": "Folio introuvable" }`.

### DELETE `/api/front-office/folios/items/:itemId` — Supprimer une prestation
Rôles : admin, manager **uniquement** (jamais affiché pour receptionist, FR-021).
Réponse 200 : `{ "message": "Prestation supprimée", "folioTotal": <number> }`
Erreurs : 404 `{ "error": "Prestation introuvable" }` ; 400 `{ "error": "Folio clôturé. Impossible de supprimer." }`.

## 5. Paiements et factures du jour

### GET `/api/front-office/payments?date=YYYY-MM-DD` — Paiements du jour
Rôles : tout utilisateur authentifié. Paramètre `date` requis.
Réponse 200 : `{ "date", "count", "totalAmount", "payments": [ { id, bookingId, folioId, amount, paymentMethod, reference|null, processedAt } ] }`
Erreurs : 400 `{ "error": "Le paramètre date est requis (format YYYY-MM-DD)" }` ; 400 `{ "error": "Format de date invalide (attendu YYYY-MM-DD)" }`.

### GET `/api/front-office/invoices?date=YYYY-MM-DD` — Folios clôturés du jour
Rôles : tout utilisateur authentifié. Paramètre `date` requis.
Réponse 200 : `{ "date", "count", "totalAmount", "invoices": [ { folioId, bookingId, bookingRef|null, billToPartnerId|null, billToLabel|null, folioType, label, closedAt, totalAmount, items: [ { id, description, category, quantity, unitPrice, totalAmount, taxRate } ] } ] }`
Erreurs : mêmes que payments.

## 6. Seed — interdit côté UI (FR-038)

`POST /api/front-office/seed` (gateway) → `POST /api/seed` (backend, **non authentifié**, destructif, front-office.md §2.1). **Aucun élément UI ne doit le déclencher.** Aucune fonction dans `lib/api/frontOffice.ts`. Vérification : `grep -rn "seed" app/ components/ --include="*.tsx" --include="*.ts"` doit ne retourner aucune référence de déclenchement UI.
