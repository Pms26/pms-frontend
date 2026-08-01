# Research — Module Tarification

**Feature**: `/specs/005-tarification-frontend/spec.md`
**Date**: 2026-07-31
**Sources**: `docs/service-tarification.md` (§2/§4/§5/§7), `docs/api-gateway.md` (§2.2/§3.6/§4.5/§7.3), constitution, patterns livrés (004-front-office-module, 003-analytics-frontend).

## R1 — Préfixes gateway des endpoints tarification

**Décision** : Tous les appels frontend utilisent le préfixe `/api/tarification/...` via `apiClient`. Le gateway **retire** le préfixe `/tarification` et ajoute `/api` avant de proxier vers le service-tarification (port 4004) — `docs/api-gateway.md` §2.2 (ligne 38) : « **Réécrit** — le `/tarification` est supprimé ». Exemples :

| Fonction frontend | Appel API frontend (gateway) | Chemin backend (service-tarification.md §2) |
|---|---|---|
| `getSeasons` / `createSeason` / `updateSeasonDates` | `GET|POST /api/tarification/seasons` / `PUT /api/tarification/seasons/:category` | `GET|POST /api/seasons` / `PUT /api/seasons/:category` |
| `getRatePlans` / `createRatePlan` / `updateRatePlan` / `updateCategoryRates` | `GET /api/tarification/rateplans` / `POST /api/tarification/rateplans` / `PATCH /api/tarification/rateplans/:id` / `PUT /api/tarification/rateplans/category/:categorie` | `GET /api/rateplans` / `POST /api/rateplans` / `PATCH /api/rateplans/:id` / `PUT /api/rateplans/category/:categorie` |
| `getRegimes` / `createRegime` / `updateRegime` | `GET|POST /api/tarification/regimes` / `PATCH /api/tarification/regimes/:id` | `GET|POST /api/regimes` / `PATCH /api/regimes/:id` |
| `getTaxes` / `createTax` / `updateTax` / `calculateTaxes` | `GET|POST /api/tarification/taxes` / `PATCH /api/tarification/taxes/:id` / `GET /api/tarification/taxes/calculate` | `GET|POST /api/taxes` / `PATCH /api/taxes/:id` / `GET /api/taxes/calculate` |
| `getPartners` / `createPartner` / `updatePartner` | `GET|POST /api/tarification/partners` / `PATCH /api/tarification/partners/:id` | `GET|POST /api/partners` / `PATCH /api/partners/:id` |
| `getPartnerRates` / `createPartnerRate` | `GET /api/tarification/partners/:partnerId/rates` / `POST /api/tarification/partner-rates` | `GET /api/partners/:partnerId/rates` / `POST /api/partner-rates` |
| `getExtraCategories` / `createExtraCategory` / `createExtraItem` / `updateExtraItem` | `GET|POST /api/tarification/extra-categories` / `POST /api/tarification/extra-items` / `PATCH /api/tarification/extra-items/:id` | `GET|POST /api/extra-categories` / `POST /api/extra-items` / `PATCH /api/extra-items/:id` |
| `getDiscounts` / `createDiscount` / `applyDiscount` | `GET|POST /api/tarification/discounts` / `POST /api/tarification/discounts/apply` | `GET|POST /api/discounts` / `POST /api/discounts/apply` |
| `getPackages` / `createPackage` | `GET|POST /api/tarification/packages` | `GET|POST /api/packages` |
| *(réservé Réservations)* `calculateRate` | `GET /api/tarification/rates/calculate` | `GET /api/rates/calculate` (écrit des FolioItems — FR-002) |

**Rationale** : `docs/api-gateway.md` §2.2 est sans ambiguïté sur la réécriture ; c'est le pattern déjà utilisé par `lib/api/tarification.ts` actuel, `lib/api/frontOffice.ts` et `lib/api/analytics.ts`. Le RBAC du gateway couvre `/api/tarification/*` (écritures → admin/manager) et ouvre `POST /api/tarification/discounts/apply` à tout utilisateur authentifié (§3.6, lignes 158-159).

**Alternatives considérées** : appeler `/api/seasons` directement → rejeté (casse le routage gateway, hors convention constitution I) ; appeler le port 4004 en direct → rejeté (violation Gateway-only).

## R2 — Stratégie d'erreur (pattern Analytics/Front Office, sans fallback mock)

**Décision** : Aucune fonction de `lib/api/tarification.ts` ne vérifie `USE_MOCKS` ; aucun `catch` ne retourne de données mockées ; `MOCK_TARIFS`, `MOCK_EXTRAS`, `MOCK_FISCALITE` et le repli `return MOCK_TARIFS` de `getTarifs` (lignes 34-68) sont supprimés (FR-064). Normalisation des erreurs dans la couche API via un helper privé :

```typescript
// Dérogation Q6 (FR-044) — exception explicite et UNIQUE au principe verbatim :
// le backend renvoie « Catégorie introuvable » avec un caractère corrompu
// (service-tarification.md §5.7). Match TOLÉRANT volontaire : on teste le squelette
// « atégorie introuvable » pour ne dépendre ni du caractère cassé exact, ni de son
// encodage (non documenté). Tout autre message backend reste affiché verbatim.
function normalizeBackendMessage(msg: string): string {
  if (msg.includes('atégorie introuvable')) return 'Catégorie introuvable';
  return msg;
}

function toApiError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 502) return new Error('Service temporairement indisponible');
    const body = err.response?.data as { message?: string; error?: string } | undefined;
    const msg = body?.message ?? body?.error;
    if (msg) return new Error(normalizeBackendMessage(msg));
  }
  return new Error('Service temporairement indisponible');
}
```

Chaque fonction enveloppe son appel : `try { ... } catch (err) { throw toApiError(err); }`. Les composants affichent `error.message` (React Query expose l'erreur rejetée).

> **Note — capture du message corrompu (implémentation)** : la chaîne corrompue **exacte** n'est documentée nulle part dans `service-tarification.md` (§5.7 ne montre qu'un rendu `Cat�gorie`). Elle doit être **capturée** pendant l'implémentation en déclenchant un vrai 404 sur `POST /api/tarification/extra-items` avec un `categoryId` invalide, afin d'écrire un match fiable au lieu de deviner l'encodage. La valeur capturée sert à **valider** (et si besoin affiner) le match tolérant `atégorie introuvable` ci-dessus — elle ne remplace jamais le match tolérant par une correspondance stricte fragile.

**Rationale** : Le backend retourne les messages métier exacts dans `{ "message": "..." }` (service-tarification.md §5) — la spec exige ces messages textuellement (FR-013/044/050, SC-007), « pas de message générique ». Le 502 gateway (service down, api-gateway.md §4.1) → « Service temporairement indisponible » (Edge Cases). Dérogation Q6 : seul le message « Catégorie introuvable » reçu du backend (caractère corrompu `Cat�gorie`, §5.7) est normalisé en « Catégorie introuvable » propre côté client (FR-044) ; tous les autres restent verbatim.

**Alternatives considérées** : (a) pattern housekeeping — `return []` silencieux → rejeté (masque les pannes, viole SC-003/009) ; (b) propager l'erreur axios brute → insuffisant pour « messages exacts » sans extraction répétée ; (c) le helper centralise la règle.

## R3 — Vérification préflight CORS/PUT (Q3) et repli documenté

**Décision** : Le plan place une **Étape 0 — Gate CORS/PUT** en tout début d'implémentation, **avant** les stories 4 (saisons) et 5 (grille tarifaire). Vérification explicite du préflight pour les deux endpoints PUT du module :
- `PUT /api/tarification/seasons/:category`
- `PUT /api/tarification/rateplans/category/:categorie`

**Procédure** (exécutée une fois, résultat consigné dans ce fichier et dans les contrats) :
1. `curl -i -X OPTIONS http://localhost:4000/api/tarification/seasons/basse -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: PUT" -H "Access-Control-Request-Headers: authorization,content-type"`
2. `curl -i -X OPTIONS http://localhost:4000/api/tarification/rateplans/category/standard` (mêmes headers)
3. Lire `Access-Control-Allow-Methods` dans la réponse du gateway.

**Raison du risque** : les méthodes CORS du gateway sont `GET, POST, PATCH, DELETE, OPTIONS` — `PUT` **n'est pas dans la liste** (api-gateway.md §4.5 ligne 234 ; alerte §7.3 ligne 357 : « Si le frontend utilise PUT, il risque un blocage CORS »). Le code existant (`apiClient.put` dans `updateTarif`, ligne 115) n'a jamais été validé contre le gateway : son existence ne prouve pas que le préflight passe.

**Branche A — PUT autorisé** : conserver `apiClient.put` pour `updateSeasonDates` et `updateCategoryRates` (conforme à la doc backend).

**Branche B — PUT bloqué** :
- **B1 (correctif définitif, dépendance externe)** : ajouter `PUT` aux `methods` CORS du gateway (api-gateway.md §4.5). Hors périmètre du module — enregistrée comme dépendance infra, vérifiée avant release.
- **B2 (repli frontend immédiat)** : sélecteur `TARIFICATION_WRITE_VERB` (constante module, défaut `'PUT'`) dans `lib/api/tarification.ts`, consommé par `updateSeasonDates`/`updateCategoryRates`. Si PUT est bloqué → **`PATCH` avec body équivalent** (`{dateDebut?, dateFin?}` / `{nomSaison: prix}`). ⚠️ Prérequis externe à valider : le backend service-tarification doit exposer `PATCH` sur ces deux chemins (ou le gateway doit réécrire PATCH→PUT), sinon le backend renvoie 404. B2 est un **relais d'implémentation** pour ne pas bloquer les stories 4/5, pas un choix de contrat final ; la cible finale reste `PUT` via B1.

**Alternatives considérées** : (a) ignorer le risque et hardcoder PUT → rejeté (découverte du blocage en plein développement, sans solution — exactement le scénario que Q3 veut éviter) ; (b) réécrire dès maintenant en PATCH → rejeté (déviation de contrat inutile si le préflight passe, et PATCH non documenté côté backend) ; (c) le gate à l'Étape 0 tranche avant d'écrire le code, le repli B2 est prêt.

### R3 — Résultat du Gate CORS/PUT (Étape 0, exécuté 2026-08-01)

**Procédure exécutée** : deux préflights OPTIONS émis vers le gateway `http://localhost:4000` (headers `Origin: http://localhost:3000`, `Access-Control-Request-Method: PUT`, `Access-Control-Request-Headers: authorization,content-type`) :
- `OPTIONS /api/tarification/seasons/basse`
- `OPTIONS /api/tarification/rateplans/category/standard`

**Constats** :
1. Le gateway n'était **pas joignable** au moment de l'exécution (aucune réponse, connexion refusée) — les préflights ne peuvent donc pas fournir de réponse CORS en direct.
2. Le contrat documenté est sans ambiguïté : `docs/api-gateway.md` §4.5 (ligne 234) liste les méthodes CORS du gateway comme `GET, POST, PATCH, DELETE, OPTIONS` — **`PUT` n'en fait pas partie** ; l'alerte §7.3 (ligne 357) confirme « Si le frontend utilise PUT, il risque un blocage CORS ». La règle RBAC du gateway autorise pourtant `PUT` sur `/api/tarification/*` (ligne 158) et le backend documente `PUT /api/seasons/:category` et `PUT /api/rateplans/category/:categorie` (service-tarification.md §2).

**Décision (Branche B appliquée, conformément au plan)** :
- **B1 — dépendance externe enregistrée** : ajouter `PUT` aux `methods` CORS du gateway (api-gateway.md §4.5). À planifier côté infra et à vérifier avant release. Hors périmètre du module Tarification.
- **B2 — repli frontend prêt** : la constante `TARIFICATION_WRITE_VERB` (défaut `'PUT'`, voir T007) centralise le verbe des stories 4/5 ; si le préflight bloque réellement en exploitation, basculer sur `PATCH` avec body équivalent (`{dateDebut?, dateFin?}` / `{nomSaison: prix}`). ⚠️ Prérequis externe documenté : le backend doit accepter `PATCH` sur ces deux chemins (ou le gateway doit réécrire PATCH→PUT), à valider avant toute release. B2 est un relais, pas un choix de contrat final.
- **Re-vérification** : relancer les deux préflights dans quickstart S0 quand le gateway est opérationnel et confirmer la présence de `PUT` dans `Access-Control-Allow-Methods` (Branche A) avant la mise en production.

## R4 — Frontière API vs UI pour `applyDiscount` (FR-049/FR-063)

**Décision** : Deux niveaux distincts, documentés au plan pour éviter toute régression :

1. **Niveau API — `lib/api/tarification.ts`** : `applyDiscount(discountId, prixInitial)` appelle `POST /api/tarification/discounts/apply` et ne contient **aucun** conditionnement par rôle : pas d'import `useAuthStore`, pas de lecture de `role`, pas de garde `if (role === ...)`. Elle reste **appelable par tout rôle authentifié** — y compris `receptionist` depuis le module Réservations (aperçu de remise dans l'écran de configuration, hors scope de ce module, Q7). Justifications contractuelles : le gateway n'impose **aucune restriction** sur `POST /api/tarification/discounts/apply` (api-gateway.md §3.6 ligne 159 : `**Aucune restriction** (null)`) et le backend n'a pas de `checkRole` sur cette route (service-tarification.md §2 ligne 60, §4/§7.2). C'est une route de calcul, pas d'écriture.
2. **Niveau UI — module Tarification** : le bouton de prévisualisation dans l'onglet Remises est rendu **uniquement pour les rôles Q2** (`admin`, `manager`, `comptable`). Garde-fou au niveau composant via `useAuthStore` (FR-059/060/061). En pratique `/tarification` est déjà restreint par le middleware, mais le rendu conditionnel reste requis pour la cohérence du pattern « Role-Based UI » et la lecture seule du comptable.

**Règle de non-régression (checklist d'implémentation)** : `grep -n "role\|useAuthStore" lib/api/tarification.ts` ne doit retourner **aucune** occurrence dans ou autour de `applyDiscount` (et aucune dans tout le fichier, la couche API étant sans rôle par conception — le contrôle vit dans middleware + composants). Seule l'UI de l'onglet Remises lit le rôle. Si le module Réservations consomme `applyDiscount`, aucune modification de `lib/api/tarification.ts` ne doit casser ce chemin.

**Alternatives considérées** : (a) limiter `applyDiscount` aux rôles du module → rejeté (casserait le module Réservations et contredirait FR-049/063 et le contrat backend/gateway) ; (b) conditionner dans le composant Remises uniquement → retenu, c'est la frontière exacte demandée.

## R5 — Alignement des types sur le contrat backend (FR-067)

**Décision** : Les types mock `TarifCategory` (`{cat, basse, moyenne, haute, pics}`), `ExtraItem` (`{name, price}`), `ExtraCategory` (`{cat, color, icon, items}`) et `FiscaliteItem` (`{label, description, amount}`) sont **supprimés** de `types/index.ts` et remplacés par des types alignés sur les réponses service-tarification.md §5 : `Season`, `RatePlan`, `RegimeSupplement`, `LocalTax`, `Partner`, `PartnerRate`, `ExtraCategory`, `ExtraItem`, `Discount`, `DiscountApplyResult`, `PackageOffer`, `PackageBreakdown`. Le mapping backend→frontend (traduction de champs, parsing DECIMAL, remapping ENUM) vit **dans `lib/api/tarification.ts`**, pas dans les composants (constitution §III). `EXTRA_COLORS`/`EXTRA_ICONS` sont conservés comme mapping de présentation uniquement (assumption spec) — ils ne contiennent ni nom ni prix métier.

**Rationale** : Les composants consomment la nouvelle forme typée (montants en chaînes à parser pour l'affichage, ENUM exacts). Le typecheck strict (`npx tsc --noEmit`) garantit la migration complète. Les montants backend (`prixTTC`, `supplementDH`, `montantTS/TPT`, `prixNetDH`, `prixDH`, `valeur`, `prixGlobalDH`, `montantDH`) sont des chaînes DECIMAL (`"900.00"`) — l'UI parse/arrondit à l'affichage, les payloads de création/modification envoient des nombres (Edge Cases spec).

**Alternatives considérées** : conserver les types mock et mapper dans les composants → rejeté (double source de vérité, mapping en dehors de la couche API, contraire à la constitution et FR-068).

## R6 — Contrôle d'accès middleware + Sidebar (Q2, FR-058/059/061/062)

**Décision** :
- `middleware.ts` : `ROLE_RESTRICTIONS['/tarification']` passe de `['admin', 'manager', 'receptionist', 'comptable']` à **`['admin', 'manager', 'comptable']`** (retrait de `receptionist`, Q2). `housekeeping_supervisor` reste exclu (aucune entrée). Le matcher `pathMatches` existant (frontière de segment, ajouté en 004) est conservé tel quel — `pathMatches('/tarification', '/tarification')` suffit, il n'existe pas de sous-route.
- `components/layout/Sidebar.tsx` : le filtre `filteredGestionItems` masque le lien « Tarifs & Extras » (`/tarification`) pour `receptionist` et `housekeeping_supervisor` (FR-062 — correction de l'incohérence actuelle où le lien est visible mais l'accès bloqué). Le comptable conserve le lien (lecture seule).
- UI : toutes les actions de création/modification sont rendues uniquement pour `admin`/`manager` ; `comptable` voit tout en lecture seule (FR-059/061). Rôle lu via `useAuthStore`, jamais par décodage JWT brut (FR-060, constitution §II).

**Alternatives considérées** : garder `receptionist` dans le middleware et masquer seulement la Sidebar → rejeté (Q2 retire le réceptionniste du module au niveau accès ; l'incohérence lien visible/accès bloqué serait conservée).

## R7 — Structure de page : onglets, aperçu « Estimation », frontière rates/calculate

**Décision** :
- Page unique `/tarification` avec **7 onglets** `fo-tabs`/`fo-tab` : Grille tarifaire, Régimes, Taxes locales, Partenaires, Extras & POS, Remises, Packages. L'onglet « Fiscalité » actuel est renommé « Taxes locales » (assumption spec). La vue « Régimes » (US1 SC3, US6) reçoit un onglet dédié — l'assumption spec listait 6 onglets en omettant cette vue pourtant requise.
- Aperçu de prix : ce module **documente** les contraintes (FR-001..004) et **expose** les fonctions de lecture (`getRatePlans`, `getRegimes`, `applyDiscount`, `calculateTaxes`, `getExtraCategories`) ; l'**assemblage** de l'aperçu « Estimation » dans l'écran de réservation appartient au module Réservations (Q7). Aucun chemin d'aperçu dans ce module n'appelle `GET /api/tarification/rates/calculate` (FR-002) — la fonction de calcul final n'est pas implémentée ici (frontière contractuelle FR-005..008).
- Étiquetage : tout total assemblé à partir des sources sans effet de bord est étiqueté « Estimation » (FR-004).

**Alternatives considérées** : sous-vue « Régimes » intégrée à l'onglet Grille → rejeté (mélange de deux matrices différentes, navigation moins claire) ; intégrer le calcul final dans ce module → rejeté (Q7 : relève de Réservations).
