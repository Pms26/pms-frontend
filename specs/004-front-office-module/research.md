# Research — Module Front Office

**Feature**: `/specs/004-front-office-module/spec.md`
**Date**: 2026-07-31

## R1 — Préfixes gateway des endpoints front-office

**Décision** : Tous les appels frontend utilisent le préfixe `/api/front-office/...` via `apiClient` :

| Fonction frontend | Appel API frontend (gateway) | Chemin backend (front-office.md §2) |
|---|---|---|
| `getRooms` | `GET /api/front-office/rooms` | `GET /api/rooms` |
| `getRoomsByStatus` | `GET /api/front-office/rooms/status/:status` | `GET /api/rooms/status/:status` |
| `getRoom` | `GET /api/front-office/rooms/:roomId` | `GET /api/rooms/:roomId` |
| `updateRoomStatus` | `PATCH /api/front-office/rooms/:roomId/status` | `PATCH /api/rooms/:roomId/status` |
| `getBooking` | `GET /api/front-office/checkin/:bookingId` | `GET /api/checkin/:bookingId` |
| `getProforma` | `GET /api/front-office/checkin/:bookingId/proforma` | `GET /api/checkin/:bookingId/proforma` |
| `performCheckIn` | `POST /api/front-office/checkin/:bookingId` | `POST /api/checkin/:bookingId` |
| `cancelCheckIn` | `DELETE /api/front-office/checkin/:bookingId` | `DELETE /api/checkin/:bookingId` |
| `getStatement` | `GET /api/front-office/checkout/:bookingId/statement` | `GET /api/checkout/:bookingId/statement` |
| `performCheckOut` | `POST /api/front-office/checkout/:bookingId` | `POST /api/checkout/:bookingId` |
| `getFolio` | `GET /api/front-office/folios/:folioId` | `GET /api/folios/:folioId` |
| `addFolioItem` | `POST /api/front-office/folios/:folioId/items` | `POST /api/folios/:folioId/items` |
| `setItemVisibility` | `PATCH /api/front-office/folios/items/:itemId/visibility` | `PATCH /api/folios/items/:itemId/visibility` |
| `setItemsVisibility` | `PATCH /api/front-office/folios/:folioId/items/visibility` | `PATCH /api/folios/:folioId/items/visibility` |
| `deleteFolioItem` | `DELETE /api/front-office/folios/items/:itemId` | `DELETE /api/folios/items/:itemId` |
| `getPayments` | `GET /api/front-office/payments?date=YYYY-MM-DD` | `GET /api/payments?date=YYYY-MM-DD` |
| `getInvoices` | `GET /api/front-office/invoices?date=YYYY-MM-DD` | `GET /api/invoices?date=YYYY-MM-DD` |

**Rationale** : `docs/api-gateway.md` §2.2 (ligne 39) : le préfixe `/api/front-office` est **retiré** par le gateway avant proxying vers le service front-office (port 4005) — `GET /api/front-office/rooms` → `GET /api/rooms`. C'est le pattern exact déjà utilisé par `lib/api/frontOffice.ts` actuel et par `lib/api/analytics.ts` (`/api/analytics/...`). La formulation de la spec « préfixes gateway (`/api/rooms`, `/api/checkin`, ...) » désigne les chemins backend ; les chemins réels d'appel portent le préfixe de service, conformément à la constitution (Gateway-First).

**Alternatives considérées** : appeler directement `/api/rooms` (rejeté : hors convention gateway, romprait le routage), appeler le service directement sur le port 4005 (rejeté : violation de la constitution, Gateway-only).

## R2 — Stratégie d'erreur (pattern Analytics, sans fallback mock)

**Décision** : Aucune fonction de `lib/api/frontOffice.ts` ne vérifie `USE_MOCKS` ; aucun `catch` ne retourne de données mockées. Les erreurs sont **normalisées dans la couche API** via un helper privé :

```typescript
function toApiError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 502) return new Error('Service temporairement indisponible');
    const body = err.response?.data as { error?: string } | undefined;
    if (body?.error) return new Error(body.error);
  }
  return new Error('Service temporairement indisponible');
}
```

Chaque fonction enveloppe son appel : `try { ... } catch (err) { throw toApiError(err); }`. Les composants affichent `error.message` (React Query expose l'erreur rejetée).

**Rationale** : Le backend retourne les messages métier exacts dans `{ "error": "..." }` (front-office.md §5, ex. « Chambre non prête. Statut: <statut> », « Pro-forma indisponible. Statut actuel: <status> », « Le montant des paiements ne correspond pas au solde dû. »). La spec exige ces messages textuellement (FR-009, FR-011, SC-005) — « pas de message générique ». Le 502 signale un service interne indisponible (front-office.md §7.13) → message générique « Service temporairement indisponible » (Edge Cases). Les erreurs réseau (hors réponse) tombent aussi sur ce message. Le helper centralise la règle pour éviter toute duplication.

**Alternatives considérées** : (a) pattern housekeeping existant — try/catch retournant des données vides (`return []`) → rejeté car masque les pannes (SC-004/005) ; (b) pattern analytics — propager l'erreur axios brute sans normalisation → insuffisant pour « messages exacts du backend » sans extraction répétée dans chaque composant ; (c) le helper garantit l'uniformité.

## R3 — Alignement du type partagé `Room` (impact module housekeeping)

**Décision** : Le type `Room` de `types/index.ts` est redéfini selon le contrat `GET /api/rooms` (front-office.md §5.1) : `id`, `roomNumber`, `category`, `floor`, `bedType`, `maxOccupancy`, `housekeepingStatus`, `blockReason`. Un nouveau type `HousekeepingStatus = 'sale' | 'nettoyage_en_cours' | 'propre' | 'controlee' | 'bloquee'` est ajouté. Le module housekeeping (déjà livré) est aligné mécaniquement :

- `lib/api/housekeeping.ts` : le mapping `getRooms`/`updateRoomStatus` produit la nouvelle forme (les champs backend `categorie/category`, `etage/floor`, `statut/housekeepingStatus/status`, `motifBlocage/blockReason`, `numero/roomNumber` sont déjà tolérés) ; les maps FE↔BE passent de `RoomStatus` à `HousekeepingStatus` (suppression des valeurs factices `encours`, `inhouse`).
- `app/housekeeping/page.tsx` : lectures `room.status` → `room.housekeepingStatus`, `room.reason` → `room.blockReason` ; `HK_STATUS`/`ROOM_ICON` indexés par `HousekeepingStatus`.
- `components/layout/GlobalModals.tsx` et `components/context/ModalToastContext.tsx` : `RoomStatus` → `HousekeepingStatus` (même union de valeurs).
- Le type `RoomStatus` existant est supprimé (plus aucun consommateur après alignement).

**Rationale** : Le backend `GET /api/rooms` (service réservations, relayé par housekeeping et front-office) a une forme unique. Garder deux types « chambre » divergents (`Room` housekeeping + un pseudo-`Room` front-office) créerait une source de vérité dupliquée. L'alignement est mécanique et couvert par `npm run typecheck` + quickstart. Complexité justifiée en Complexity Tracking du plan.

**Alternatives considérées** : (a) garder `Room`/`RoomStatus` et ajouter `FrontOfficeRoom` → rejeté (deux types sur le même contrat, confusion, aucun gain) ; (b) modifier le type `RoomStatus` sans toucher housekeeping → rejeté (casserait le typecheck du module livré).

## R4 — Matcher middleware à frontière de chemin

**Décision** : La boucle de `middleware.ts` utilise un matcher à frontière de segment au lieu de `startsWith` brut :

```typescript
const pathMatches = (restrictedPath: string, pathname: string) =>
  pathname === restrictedPath || pathname.startsWith(restrictedPath + '/');
```

`ROLE_RESTRICTIONS` reçoit les entrées spécifiques :
- `/front-office/check-in` → `['admin', 'manager', 'receptionist', 'housekeeping_supervisor']`
- `/front-office/check-out` → `['admin', 'manager', 'receptionist']`
- `/front-office/payments` → `['admin', 'manager', 'receptionist', 'housekeeping_supervisor', 'comptable']`
- `/front-office` → `['admin', 'manager', 'receptionist', 'housekeeping_supervisor', 'comptable']` (redirection → check-in, page racine) — le matcher à frontière empêche cette entrée de neutraliser les restrictions des sous-routes.

**Rationale** : Avec `startsWith` brut, `/front-office` matcherait `/front-office/check-out` et laisserait le comptable/la gouvernante y accéder (le check de la première entrée trouvée dans `Object.entries` autoriserait). Le matcher à frontière restreint chaque entrée à son arborescence exacte. La matrice résultante est vérifiée contre front-office.md §4 : check-in visible pour la gouvernante (zone chambres), check-out interdit à la gouvernante et au comptable, payments ouvert à tous les rôles authentifiés.

**Alternatives considérées** : (a) retirer l'entrée `/front-office` et gérer la page racine par redirection dans le `page.tsx` serveur via les cookies → rejeté (complexité cookie/token dans un composant serveur, matcher à frontière est plus simple) ; (b) ordonner les entrées par spécificité → fragile, `startsWith` laisse subsister le contournement pour les chemins plus profonds.

## R5 — Absence d'endpoint « arrivées/départs du jour » : recherche par bookingId

**Décision** : Les pages check-in et check-out n'affichent plus de liste « réservations à faire entrer / départs du jour » fabriquée à partir de `/api/rooms`. Elles proposent un **champ de recherche par bookingId** :

- Check-in : saisie d'un bookingId → `GET /api/checkin/:bookingId` (détail) puis `GET /api/checkin/:bookingId/proforma` ; action Check-in (`POST`), annulation (`DELETE`) quand pertinent, folios affichés après check-in (`GET /api/folios/:folioId` pour folioA et folioB).
- Check-out : saisie d'un bookingId → `GET /api/checkout/:bookingId/statement` (extrait) ; encaissement puis `POST /api/checkout/:bookingId`.
- La colonne gauche du check-in conserve la **liste des chambres** (FR-001/002/003) issue de `GET /api/rooms` et `GET /api/rooms/status/:status`.

**Rationale** : `docs/front-office.md` §2 n'expose aucun endpoint de listing des réservations à checker in/out — uniquement des endpoints paramétrés par `:bookingId`. La spec US2 (Independent Test) décrit explicitement « L'utilisateur saisit un numéro de réservation ». Fabricquer la liste à partir des chambres (comportement actuel) est incorrect et serait du « mock-like » interdit par SC-004.

**Alternatives considérées** : conserver la liste « arrivées » dérivée de `/api/rooms/status/sale` → rejeté (données fausses, doublon avec le module housekeeping) ; interroger le service réservations (`/api/reservations/bookings`) → rejeté (hors périmètre des contrats front-office validés et de la matrice de la spec).

## R6 — Consultation de folio du comptable (correction spec, FR-037)

**Décision** : Une sous-section « Consultation de folio » est ajoutée sur la page `/front-office/payments`, rendue pour les rôles `admin`, `manager`, `receptionist`, `comptable` (masquée pour `housekeeping_supervisor`). Deux modes de recherche :

- **Par folioId** → `GET /api/front-office/folios/:folioId` (détail complet : `allItems`, `printableItems`, `totalAmount`).
- **Par bookingId** → `GET /api/front-office/checkout/:bookingId/statement` (extrait : folios A+B, items, paiements, totalCharges, totalPaid).

Aucun bouton de modification dans cette sous-section (lecture seule stricte). Les messages d'erreur exacts du backend sont affichés (ex. « Folio introuvable »).

**Rationale** : Sans cette sous-section, le droit GET folios du comptable (FR-033, matrice front-office.md §4) n'était exerçable dans aucune UI : check-in et check-out lui sont bloqués par le middleware. Le gateway RBAC autorise le comptable sur `GET /api/front-office/folios*` et `GET /api/front-office/checkout*` (`docs/api-gateway.md` §3.6, lignes 162-164). La recherche par bookingId réutilise l'extrait de compte (endpoint existant, aucun endpoint « folios par booking » n'existe dans le contrat — constitution : ne jamais supposer une forme d'endpoint).

**Alternatives considérées** : (a) autoriser le comptable sur la page check-out → rejeté (contredit la restriction UI volontaire US7/FR-033, la spec a été corrigée pour ajouter le moyen d'accès dédié et non pour élargir les pages) ; (b) créer un endpoint de listing des folios → rejeté (pas de modification backend, hors périmètre frontend).

## R7 — Modes de paiement (valeurs backend exactes)

**Décision** : Le type `PaymentMode` existant (`'cb' | 'esp' | 'chq' | 'vir' | 'deb'`) est remplacé par `PaymentMethod = 'cb' | 'esp' | 'chq' | 'virement' | 'debiteur'` (valeurs exactes du contrat `POST /api/checkout/:bookingId`, front-office.md §5.11 et §7.7 — sensibles à la casse, minuscules). La page check-out et `performCheckOut` utilisent `PaymentMethod`. La validation frontend du total des paiements (FR-028) compare `Σ montants saisis` à `balanceDue` avec tolérance 1 centime : `Math.abs(Σ - balanceDue) < 0.01` (même règle que `Math.round(x * 100)` du backend, front-office.md §7.3).

**Rationale** : `vir`/`deb` n'existent pas côté backend — `virement`/`debiteur` oui. Envoyer `vir`/`deb` provoquerait « Mode de paiement invalide: <method> » (400). Le typage exact évite l'erreur à la source.

**Alternatives considérées** : conserver `PaymentMode` et mapper `vir → virement` dans l'API → rejeté (double représentation de la même notion ; le type doit refléter le contrat).

## R8 — Navigation : Sidebar et FrontOfficeTabs par rôle

**Décision** :
- `components/layout/Sidebar.tsx` : le filtre `exploitationItems` du comptable pointe « Front Office » vers `/front-office/payments` (au lieu de `/front-office/check-in`) ; les autres rôles autorisés restent sur `/front-office/check-in` ; la gouvernante conserve `/front-office/check-in` (zone chambres).
- `components/front-office/FrontOfficeTabs.tsx` : ajout de l'onglet « Paiements » (`/front-office/payments`, icône `bi-cash-stack`). Filtrage des onglets par rôle lu via `useAuthStore` :
  - `comptable` → onglet « Paiements » uniquement.
  - `housekeeping_supervisor` → « Check-in » et « Paiements ».
  - `admin`/`manager`/`receptionist` → les trois onglets.

**Rationale** : FR-034 impose le rendu conditionnel au niveau composant avec le rôle lu depuis `useAuthStore` (FR-035, jamais de décodage JWT brut). Afficher un onglet vers une route bloquée par le middleware serait trompeur ; le filtrage par rôle est cohérent avec le pattern « Role-Based UI » de la constitution.

**Alternatives considérées** : afficher tous les onglets et laisser le middleware rediriger → rejeté (mauvaise UX, cache la politique d'accès).

## R9 — Endpoint de seed : jamais exposé (FR-038)

**Décision** : Aucun élément UI (bouton, lien, formulaire) ne référence ni ne déclenche le seed. Le chemin complet documenté dans les contrats est `POST /api/front-office/seed` (gateway) → `POST /api/seed` (backend front-office, **non authentifié** et destructif, front-office.md §2.1). `lib/api/frontOffice.ts` ne contient aucune fonction de seed. Vérification par grep en phase d'implémentation : `grep -rn "seed" app/ components/ lib/api/frontOffice.ts` ne doit retourner aucune référence de déclenchement UI.

**Rationale** : Cohérent avec DASH-FR-029 (spec 002-analytics-dashboard) et FR-015/SC-007 (spec 003-analytics-frontend). Même si le gateway RBAC restreint `POST /api/front-office/seed` au rôle admin (api-gateway.md §3.6), le backend ne vérifie aucune authentification (front-office.md §2.1) : l'exposition d'un tel élément serait une vulnérabilité de destruction de données.

**Alternatives considérées** : exposer un bouton « Seed » réservé admin → rejeté (violerait FR-038 et le précédent des modules analytics livrés).
