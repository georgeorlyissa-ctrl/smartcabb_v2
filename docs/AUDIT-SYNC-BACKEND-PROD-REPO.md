# Audit de synchronisation backend — production ↔ repo `main`

**Date** : 27 octobre 2026
**Fonction concernée** : `make-server-2eb02e52` (Supabase Edge Function, version déployée : 108)
**Référence repo** : `main` @ `a8d6ff9`

---

## 1. Méthode

1. Source réellement en production récupérée avec `supabase functions download make-server-2eb02e52`
   → 24 fichiers, dossier `%TEMP%\opencode\prod-fn\`.
2. Comparaison fichier par fichier (SHA-256) avec `supabase/functions/make-server-2eb02e52/`.
3. Extraction automatique de toutes les routes (`app.get/post/put/delete/patch` + `app.route`) dans les deux versions.
4. Vérification côté base (accès `profiles` / `scheduled_rides` avec la clé publique) pour confirmer que les migrations sont bien appliquées.

---

## 2. Résultat global

| Constat | Valeur |
|---|---|
| Fichiers identiques prod ↔ repo | **20** |
| Fichiers différents | **3** (`index.ts`, `auth-routes.ts`, `ride-routes.ts`) |
| Fichiers présents seulement dans le repo | **5** (dont 4 morts) |
| Endpoints (routes montées dans `index.ts`) | **20 = 20** (aucun ajout, aucun retrait) |
| Routes `/auth` | 6 = 6 |
| Routes `/rides` | 31 = 31 |

**Conclusion importante : il n'y a aucun endpoint manquant en production.** La « synchro de 100 commits » se résume en réalité à **3 fichiers, 3 modifications**, détaillées ci-dessous.

Fichiers présents uniquement dans le repo :

| Fichier | Utilisé ? |
|---|---|
| `lib/rate-limit.ts` | ✅ oui (`index.ts`, `auth-routes.ts`) |
| `kv_store.ts` | ❌ non (importé seulement par `kv-wrapper.ts`, lui-même mort) |
| `kv-wrapper.ts` | ❌ non |
| `uuid-validator.ts` | ❌ non |
| `email-validation.ts` | ❌ non |

Les 4 fichiers « morts » peuvent être supprimés, aucun impact.

---

## 3. Les 3 changements en attente

### 3.1 `index.ts` — 4 lignes ajoutées

```diff
+import { rateLimit } from "../lib/rate-limit.ts";
+// ✅ RATE LIMITING GLOBAL — 100 requêtes par 15 min par IP
+app.use('*', rateLimit());
```

- **Effet** : limiteur de débit global par IP sur **toutes** les routes.
- **Risque** : ⚠️ **moyen**. Les réseaux mobiles congolais partagent la même IP publique (CGNAT) : avec 100 requêtes / 15 min par IP, des utilisateurs légitimes seraient bloqués (l'app interroge l'API en continu).
- **Version du repo** : seuil porté à **600 / 15 min**, réglable par secret `RATE_LIMIT_GLOBAL_MAX` (0 = désactivé), sans redéploiement. Le limiteur est **fail-open** (si le KV tombe, les requêtes passent).

### 3.2 `auth-routes.ts` — 3 lignes ajoutées, 2 modifiées

```diff
+import { rateLimiter } from "../lib/rate-limit.ts";
-app.post("/signup", async (c) => {
+app.post("/signup", rateLimiter(), async (c) => {
-app.post("/login", async (c) => {
+app.post("/login", rateLimiter(), async (c) => {
```

- **Effet** : 10 tentatives / 15 min par IP sur l'inscription et la connexion (protection force brute), compteur séparé du global.
- **Risque** : ⚠️ **faible à moyen** (même sujet CGNAT, seuil réglable par `RATE_LIMIT_AUTH_MAX`).
- Le frontend gère déjà le 429 avec un message clair (`lib/auth-service.ts`).

### 3.3 `ride-routes.ts` — 13 lignes ajoutées, 4 supprimées 🚨

```diff
-    const { rideId, driverId } = await c.req.json();
+    const { rideId, driverId, confirmationCode } = await c.req.json();
-    // ✅ PAS DE CODE DE CONFIRMATION - Démarrage direct
+    if (!confirmationCode) {
+      return c.json({ success: false, error: "Code de confirmation requis pour démarrer la course" }, 400);
+    }
+    ride.confirmationCodeVerified = true;
```

- **Effet** : `POST /rides/start` refuse désormais toute course sans code de confirmation.
- **Risque** : 🔴 **BLOQUANT** — voir section 4.

---

## 4. 🚨 Le blocage à traiter AVANT toute synchronisation

Le backend exigerait un `confirmationCode`, mais **le chauffeur, dans le parcours réellement en production, ne l'envoie pas**.

| Fichier | Rôle | Envoie le code ? |
|---|---|---|
| `components/driver/NavigationScreen.tsx:206-219` | **écran réellement utilisé** pour démarrer la course (monté par `pages/DriverApp.tsx:160`) | ❌ non : `{ rideId, driverId }` |
| `components/driver/ConfirmationCodeScreen.tsx:99-104` | seul écran qui envoie `confirmationCode` | ✅ oui… mais **jamais rendu** (importé nulle part) |
| `components/driver/DriverDashboardNew.tsx:1489` | prépare `confirmationCode: rideData.confirmationCode ?? ''` | ⚠️ chaîne vide si absent → refusé |

**Conséquence si on déploie maintenant** : chaque chauffeur qui appuie sur « Démarrer la course » reçoit
`400 Code de confirmation requis pour démarrer la course` → **plus aucune course ne peut démarrer**.

### Ce qu'il faut faire

1. **Frontend** : brancher la saisie du code dans le parcours réel. Deux options :
   - réutiliser `ConfirmationCodeScreen` (déjà écrit, il vérifie le code et appelle `/rides/start` correctement) en l'insérant dans `DriverApp`/`NavigationScreen` avant le démarrage ;
   - ou ajouter un champ « code à 4 chiffres » dans `NavigationScreen.handleStartRide`.
2. **Vérifier** que le passager reçoit bien ce code (SMS/WhatsApp à l'acceptation) et que `ride.confirmationCode` est présent côté chauffeur (`ActiveRidesList.tsx:124` l'affiche déjà).
3. **Ensuite seulement** déployer le backend.

> Variante temporaire si tu veux déployer le backend tout de suite : désactiver le contrôle (`if (false && !confirmationCode)`) et le réactiver quand le front est prêt. Non recommandé : on garderait le défaut de sécurité.

---

## 5. Ce qui n'est PAS concerné par la synchro

- **Frontend** : déjà déployé depuis `main` en continu (Vercel) → rien à faire.
- **Migrations SQL** : appliquées. Vérifié en production avec la clé publique :
  - `GET /rest/v1/profiles?select=id&limit=1` → `200`
  - `GET /rest/v1/scheduled_rides?select=id&limit=1` → `200`
  (les GRANT/RLS du commit `5297915` sont donc bien en place)
- **`/app/version`** : déjà corrigé en production par un déploiement ciblé (secret en variable d'environnement + liste blanche `apkUrl`). L'ancienne clé exposée renvoie `401`.

---

## 6. Risques résiduels / points d'attention

| Point | Détail |
|---|---|
| Rate limit & CGNAT | Seuils par défaut 600/15 min (global) et 10/15 min (auth). À surveiller après mise en prod ; ajustables via secrets. |
| Charge KV | Le limiteur écrit dans `kv_store_2eb02e52` à chaque requête (1 lecture + 1 écriture). Le global génère 2 requêtes SQL par appel API — à surveiller si le trafic monte. |
| Fichiers morts | `kv_store.ts`, `kv-wrapper.ts`, `uuid-validator.ts`, `email-validation.ts` : supprimables. |
| Secret historique | `SmartCabbApk2026!` reste dans l'historique Git : inoffensif maintenant (rotation faite), mais ne jamais le réutiliser. |

---

## 7. Plan recommandé

| Étape | Action | Risque |
|---|---|---|
| 1 | Corriger le frontend : saisie + envoi du `confirmationCode` sur le vrai parcours chauffeur | faible |
| 2 | Déployer le backend `main` (3 fichiers) | faible une fois l'étape 1 faite |
| 3 | Tests : connexion, inscription, commande de course, acceptation, démarrage avec code, arrêt, paiement | — |
| 4 | Supprimer les 4 fichiers morts du repo | nul |

---

## 8. Mise en œuvre — 28 octobre 2026

Décision retenue : **déployer le backend tout de suite**, en neutralisant le contrôle du code de confirmation jusqu'à ce que le frontend l'envoie.

**Backend `main` déployé** : version **110**, le 28/10/2026 à 18:51 UTC.

### Neutralisation du contrôle du code

`supabase/functions/make-server-2eb02e52/ride-routes.ts` :

```ts
const CONFIRMATION_CODE_REQUIRED =
  (Deno.env.get("RIDE_CONFIRMATION_CODE_REQUIRED") ?? "").trim().toLowerCase() === "true";

if (CONFIRMATION_CODE_REQUIRED && !confirmationCode) { /* 400 */ }
ride.confirmationCodeVerified = !!confirmationCode;
```

- Par défaut : **désactivé** → le démarrage de course fonctionne comme avant.
- Réactivation **sans redéploiement** : secret Supabase `RIDE_CONFIRMATION_CODE_REQUIRED=true`, à ne faire qu'une fois le frontend capable d'envoyer le code.

### Rate limiting effectif

| Limiteur | Par défaut | Réglage sans redéploiement |
|---|---|---|
| Global (`app.use('*')`) | **désactivé** | `RATE_LIMIT_GLOBAL_MAX=<n>` (0 = off) |
| Authentification (`/signup`, `/login`) | **10 / 15 min**, compté par IP **+ identifiant** | `RATE_LIMIT_AUTH_MAX=<n>` |

Raison du comptage par identifiant : au Congo, des dizaines d'utilisateurs partagent la même IP publique (CGNAT) ; un compteur par IP seule aurait bloqué des connexions légitimes.

### Vérifications faites en production

| Vérification | Résultat |
|---|---|
| `GET /health` | `200` — `{"status":"ok","version":"2.0.2"}` |
| `GET /app/version` | `200` — lit bien le KV |
| `POST /rides/start` **sans** `confirmationCode` | `404 Course non trouvée` → **le contrôle du code ne bloque plus** (avant : `400 Code de confirmation requis`) |
| `POST /auth/login` (identifiants faux) | `401 Email ou mot de passe incorrect` + en-têtes `ratelimit-limit: 10`, `ratelimit-remaining: 9` |
| En-têtes sur route non-auth | aucun `ratelimit-*` → limiteur global bien inactif |
| `POST /app/version` avec l'ancienne clé exposée | `401 Accès refusé` |

### Points de suivi

| Sujet | Détail |
|---|---|
| Latence de `/auth/login` | Le limiteur ajoute 2 allers-retours SQL (lecture + écriture KV) : ~+3 s mesurées depuis l'extérieur. Optimisable en une seule requête via une fonction SQL `rate_limit_hit()` (1 migration à appliquer). |
| Code de confirmation | À implémenter côté frontend (voir section 4), puis activer le secret `RIDE_CONFIRMATION_CODE_REQUIRED`. |
| Fichiers morts | `kv_store.ts`, `kv-wrapper.ts`, `uuid-validator.ts`, `email-validation.ts` toujours présents, supprimables. |
