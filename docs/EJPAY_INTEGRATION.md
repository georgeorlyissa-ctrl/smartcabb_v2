# Intégration Ejpay — Mobile Money (RDC)

> **État** : phase 1 (backend) livrée et **désactivée par défaut**.
> **Fournisseur** : EJ PAY v3.6.7 (EJSARL) — <https://api.ejsarl.cd>
> **Guide de référence** : *EJ PAY API User Guide v3.6.7*, janvier 2026 (16 pages).
> **Code** : `supabase/functions/make-server-2eb02e52/ejpay-core.ts` (client API) et `ejpay-routes.ts` (routes HTTP).

---

## 1. Ce que fait l'intégration

| Fonction | Sens | Utilisation SmartCabb |
|---|---|---|
| `POST /payment/c2b` | Client → Marchand | Recharge portefeuille, paiement d'une course, acompte de réservation |
| `POST /payment/b2c` | Marchand → Client | Retrait du chauffeur (bonus) vers son Mobile Money |
| `POST /payment/b2c/bulk` | Marchand → Clients | Paiement en lot (non utilisé pour l'instant) |
| `GET /payment/{reference}` | — | Vérification du statut final (réconciliation) |
| `GET /payment/wallets` | — | Soldes du compte marchand par opérateur / devise |

Opérateurs pris en charge (section XI du guide) :

| `operatorId` | Clé interne | Opérateur |
|---|---|---|
| `9` | `mpesa` | Vodacom M-Pesa |
| `10` | `orange` | Orange Money |
| `17` | `airtel` | Airtel Money |
| `19` | `afrimoney` | Africell Afrimoney |

Devises : `CDF` et `USD`.

> ⚠️ **Le paiement est asynchrone.** L'appel `c2b` renvoie **toujours** `PENDING` : le client doit valider sur son téléphone (USSD / prompt opérateur). Le résultat définitif arrive **uniquement** par le callback signé, ou par interrogation du statut.

---

## 2. Architecture des fichiers

| Fichier | Rôle |
|---|---|
| `supabase/functions/make-server-2eb02e52/ejpay-core.ts` | Client OAuth 2.0, appels API, vérification HMAC-SHA512, normalisation des numéros, modèle d'ordre, stockage KV |
| `supabase/functions/make-server-2eb02e52/ejpay-routes.ts` | Routes HTTP `/ejpay/*` + règlement métier (wallet passager, course, acompte, retrait chauffeur) |
| `supabase/functions/make-server-2eb02e52/index.ts` | Montage : `app.route("/make-server-2eb02e52/ejpay", ejpayRoutes)` |

Stockage (KV `kv_store_2eb02e52`, aucune migration SQL nécessaire) :

- `ejpay_order:<orderId>` → objet `EjpayOrder` (source de vérité, idempotence) ;
- `ejpay_event:<orderId>:<timestamp>:<random>` → journal de chaque callback reçu (audit) ;
- `ejpay_token_cache` → jeton OAuth partagé entre isolates (durée 300 s, renouvelé à 90 %) ;
- `wallet_tx:<orderId>` → mouvement de portefeuille associé (recharge, retrait, remboursement) ;
- `event:<date>:<id>` → événement visible dans le fil d'activité admin (`ejpay_payment`, `ejpay_payment_failed`).

---

## 3. Secrets à configurer

**Aucun secret n'est présent dans le dépôt.** Tout se configure dans
**Supabase Dashboard → Project Settings → Edge Functions → Secrets** (ou `supabase secrets set`).

| Secret | Obligatoire | Où le trouver |
|---|---|---|
| `EJPAY_CLIENT_ID` | ✅ | Dashboard Ejpay (<https://pay.ejsarl.cd>) → *API Credentials* |
| `EJPAY_CLIENT_SECRET` | ✅ | Idem — affiché **une seule fois** à la création des identifiants |
| `EJPAY_WEBHOOK_SECRET` | ✅ | Idem — clé de signature préfixée `whsec_…` |
| `EJPAY_ADMIN_SECRET` | recommandé | Valeur inventée par vous (≥ 32 caractères aléatoires), protège les opérations sortantes |
| `EJPAY_SCOPE` | optionnel | Défaut : `payment:write payment:read` |
| `EJPAY_TOKEN_URL` | optionnel | Défaut : `https://auth.ejsarl.cd/realms/ej-payment/protocol/openid-connect/token` |
| `EJPAY_API_BASE` | optionnel | Défaut : `https://api.ejsarl.cd` |
| `EJPAY_MIN_CDF` | optionnel | Défaut : `100` (montant minimum encaissé en CDF) |
| `EJPAY_MIN_USD` | optionnel | Défaut : `1` |

> Si `EJPAY_ADMIN_SECRET` n'est pas défini, la valeur de `ADMIN_CREATION_SECRET` est utilisée comme repli.

### En ligne de commande

```bash
supabase login
supabase link --project-ref zaerjqchzqmcxqblkfkg
supabase secrets set \
  EJPAY_CLIENT_ID="..." \
  EJPAY_CLIENT_SECRET="..." \
  EJPAY_WEBHOOK_SECRET="whsec_..." \
  EJPAY_ADMIN_SECRET="$(openssl rand -hex 32)"
```

### Rotation du Client Secret

1. Dashboard Ejpay → **API Credentials** → **Regenerate secret** → noter la valeur (affichée une seule fois).
2. La poser dans Supabase et redéployer :

```bash
supabase secrets set EJPAY_CLIENT_SECRET="<nouvelle valeur>" --project-ref zaerjqchzqmcxqblkfkg
supabase functions deploy make-server-2eb02e52 --project-ref zaerjqchzqmcxqblkfkg
```

3. Vérifier l'OAuth (doit répondre `200` avec un `access_token`, `expires_in: 300`) :

```bash
curl -s -X POST https://auth.ejsarl.cd/realms/ej-payment/protocol/openid-connect/token \
  -d grant_type=client_credentials \
  -d client_id="$EJPAY_CLIENT_ID" \
  -d client_secret="$EJPAY_CLIENT_SECRET" \
  -d "scope=payment:write payment:read"
```

> L'ancien secret est invalidé **immédiatement** par Ejpay. Un token déjà émis reste valable jusqu'à son expiration (~5 min), ce qui explique qu'une opération puisse encore réussir juste après la rotation. Aucune donnée métier n'est affectée.
>
> **Rotation effectuée le 2026-11-07** : nouveau Client Secret posé, ancien confirmé révoqué (`401`), Edge Function redéployée.

### Dans le Dashboard

1. **Settings → Edge Functions → Secrets → Add new secret** ;
2. Répétez pour chaque ligne du tableau ci-dessus ;
3. **Edge Functions → `make-server-2eb02e52` → Redeploy** (le redéploiement est automatique à chaque push sur `main`, mais un redéploiement manuel applique immédiatement les nouveaux secrets).

---

## 4. URL de callback (webhook) — rien à déclarer dans le dashboard

```
https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/ejpay/webhook
```

> Remplacez `zaerjqchzqmcxqblkfkg` par la référence réelle du projet si elle change.

**Point important (guide API 3.6.7, sections 6.5 / 7.5 / 8.5)** : Ejpay **n'a pas de champ « Webhook URL » dans le dashboard**. L'URL de callback est un **paramètre du corps de chaque requête** (`callbackUrl`), aussi bien pour `POST /payment/c2b`, `POST /payment/b2c` que pour le bulk. Notre Edge Function la renseigne **automatiquement** à chaque appel via `ejpayCallbackUrl()` (valeur dérivée de `SUPABASE_URL`, surchargeable par la variable d'environnement `EJPAY_CALLBACK_URL` si un jour l'URL change).

Conséquence pratique : **il n'y a aucune URL à coller quelque part sur `https://pay.ejsarl.cd`**. Le dashboard ne sert qu'à :

| Élément | Où | Usage |
|---|---|---|
| `Client ID` / `Client Secret` | API Credentials | OAuth `client_credentials` (déjà posés dans les secrets Supabase) |
| `Webhook Secret` (`whsec_…`) | API Credentials | clé HMAC-SHA512 qui signe les callbacks (déjà posée : `EJPAY_WEBHOOK_SECRET`) |
| `Regenerate secret` | API Credentials | rotation immédiate (invalide l'ancien secret) |
| Entreprise activée | tableau de bord | sinon les credentials ne sont pas émis |

Vérification côté SmartCabb : `GET /ejpay/config` doit renvoyer `"callbackConfigured": true` (c'est le cas en production), et après un vrai paiement le KV doit contenir `ejpay_event:<orderId>:…` avec `signatureOk: true`.

Contraintes imposées par le guide :

- réponse **HTTP 200 en moins de 10 s** ;
- Ejpay effectue **3 tentatives** en cas d'échec ;
- la signature est `X-EJPay-Signature` = **HMAC-SHA512 hex** du **corps brut** avec `EJPAY_WEBHOOK_SECRET`.

Notre route respecte ces trois points : elle lit le corps brut (`c.req.text()`), vérifie la signature en temps constant, puis répond 200 ; elle renvoie **500 uniquement** en cas d'exception interne, ce qui déclenche un nouvel essai (le traitement est idempotent).

---

## 5. Activer / désactiver

Le code est déployé **inactif**. Deux conditions sont nécessaires pour qu'un paiement soit accepté :

1. `EJPAY_CLIENT_ID` et `EJPAY_CLIENT_SECRET` sont définis (sinon `ejpayConfigured()` est faux) ;
2. le drapeau `ejpayEnabled` vaut `true` dans `smartcabb_global_config`.

### Activer

```bash
curl -X POST "https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/config/update" \
  -H "Content-Type: application/json" \
  -d '{"config":{"ejpayEnabled":true}}'
```

(`POST /config/update` fusionne l'objet envoyé avec la configuration existante ; les autres réglages ne sont pas écrasés.)

### Vérifier

```bash
curl "https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/ejpay/config"
```

Réponse attendue :

```json
{
  "success": true,
  "enabled": true,
  "configured": true,
  "provider": "ejpay",
  "version": "3.6.7",
  "currencies": ["CDF", "USD"],
  "operators": [{ "id": 9, "key": "mpesa", "name": "Vodacom M-Pesa" }, ...],
  "minAmount": { "CDF": 100, "USD": 1 },
  "callbackConfigured": true
}
```

### Désactiver (immédiat, sans redéploiement)

```bash
curl -X POST ".../config/update" -H "Content-Type: application/json" \
  -d '{"config":{"ejpayEnabled":false}}'
```

Toutes les routes `collect` et `payout` répondent alors `503 EJPAY_DISABLED`. Les ordres déjà créés restent consultables et le webhook continue de les régler (aucun paiement en cours n'est perdu).

---

## 6. Contrat d'API

Base : `https://<projet>.supabase.co/functions/v1/make-server-2eb02e52/ejpay`

| Méthode | Chemin | Auth | Description |
|---|---|---|---|
| `GET` | `/config` | publique | État (`enabled`, `configured`), opérateurs, devises, minimums |
| `GET` | `/health` | publique | Diagnostic complet : OAuth réellement testé, callback, opérateurs (aucun paiement créé) |
| `POST` | `/collect` | publique (rate-limit global) | Initie un encaissement C2B |
| `GET` | `/status/:orderId` | publique | Statut local ; `?refresh=1` force une interrogation Ejpay |
| `POST` | `/webhook` | signature HMAC | Callback Ejpay (corps brut) |
| `POST` | `/payout` | `X-Admin-Secret` | Décaissement B2C (retrait chauffeur) |
| `GET` | `/orders` | `X-Admin-Secret` | Liste des transactions (`?status=`, `?limit=`) |
| `GET` | `/wallets` | `X-Admin-Secret` | Soldes marchand chez Ejpay |
| `POST` | `/orders/:orderId/refresh` | `X-Admin-Secret` | Réconciliation manuelle d'un ordre |

> **Interface admin (sans secret côté navigateur).** Le panel admin utilise des proxys sous
> `.../make-server-2eb02e52/admin` : `GET /admin/ejpay/orders` (liste + totaux),
> `GET /admin/ejpay/wallets` (soldes marchand) et `POST /admin/ejpay/orders/:orderId/refresh`.
> Ils n'exigent pas `X-Admin-Secret` (même modèle que les autres routes admin, protégées par la
> session admin côté application) et évitent d'exposer `EJPAY_ADMIN_SECRET` dans le bundle.

### `GET /health` — diagnostic support

Réponse (champs principaux) :

```json
{
  "success": true,
  "enabled": true,
  "configured": true,
  "oauthOk": true,
  "oauthError": null,
  "callbackConfigured": true,
  "callbackUrl": "https://<projet>.supabase.co/functions/v1/make-server-2eb02e52/ejpay/webhook",
  "operators": [{ "id": 9, "key": "mpesa", "name": "Vodacom M-Pesa" }],
  "minAmount": { "CDF": 100, "USD": 1 },
  "checkedAt": "2026-11-07T00:41:36.276Z"
}
```

`oauthOk` prouve que le Client Secret **actuellement déployé** est accepté par Ejpay (le jeton est mis en cache ~5 min, donc pas d'appel à chaque requête). Aucun paiement n'est créé, aucun montant n'est débité.

Côté application, le bouton orange 🐞 de l'écran Portefeuille ouvre **« Diagnostic Mobile Money (Ejpay) »** (`components/EjpayDiagnosticModal.tsx`), qui appelle cette route et affiche les 4 contrôles (activé / identifiants / OAuth / callback) avec un rapport copiable.

### `POST /collect`

```json
{
  "amount": 5000,
  "currency": "CDF",
  "msisdn": "+243812345678",
  "operatorId": 9,
  "kind": "wallet_topup",
  "passengerId": "user_123",
  "orderId": "SC-TOPUP-20261106120000-A1B2",
  "rideId": null,
  "label": "Recharge portefeuille",
  "source": "app"
}
```

- `kind` : `wallet_topup` | `ride_payment` | `deposit` | `other` (défaut `wallet_topup`) ;
- `msisdn` accepté sous les formes `+243…`, `00243…`, `243…`, `0XXXXXXXXX`, `XXXXXXXXX` puis normalisé en `243XXXXXXXXX` (format exigé par Ejpay) ;
- `operatorId` accepte aussi la clé texte (`mpesa`, `orange`, `airtel`, `afrimoney`) via `network` ;
- `orderId` est facultatif : s'il est fourni, il sert de clé d'idempotence ; sinon un identifiant `SC-TOPUP-…` est généré ;
- pour `kind = "ride_payment"`, le montant est refusé s'il dépasse le prix de la course stockée (`finalPrice` / `totalPrice` / `estimatedPrice`).

Réponse `200` :

```json
{
  "success": true,
  "orderId": "SC-TOPUP-20261106120000-A1B2",
  "reference": "REF-8f2c...",
  "status": "PENDING",
  "message": "Demande envoyée — le client doit valider sur son téléphone",
  "operator": { "id": 9, "name": "Vodacom M-Pesa" },
  "msisdn": "243812345678",
  "amount": 5000,
  "currency": "CDF"
}
```

Cas particuliers :

- ordre `PENDING` existant → `200` avec `"duplicate": true` (aucun nouvel appel Ejpay, aucun double débit) ;
- ordre `SUCCESS` ou `FAILED` existant → `409` ;
- `ejpayEnabled = false` → `503` `EJPAY_DISABLED` ;
- montant < minimum, opérateur ou numéro invalide → `400`.

### `GET /status/:orderId`

Renvoie `PENDING` / `SUCCESS` / `FAILED` / `REVIEW`. Un ordre `PENDING` de plus de 8 secondes est automatiquement rafraîchi auprès d'Ejpay. **C'est ce qu'il faut interroger toutes les 3 secondes depuis l'écran de paiement** (l'appui sur `?refresh=1` est réservé aux cas bloqués).

### `POST /payout` (retrait chauffeur)

```json
{
  "driverId": "driver_42",
  "amount": 15000,
  "currency": "CDF",
  "msisdn": "+243812345678",
  "operatorId": 10,
  "label": "Retrait bonus",
  "adminId": "admin_1",
  "adminName": "Serge"
}
```

Le solde bonus est **réservé (débité) avant** l'appel Ejpay ; en cas de refus immédiat ou de callback `FAILED`, il est **automatiquement recrédité** (`wallet_tx` de type `withdraw_refund`).

### `GET /orders` et `GET /wallets`

Requièrent `X-Admin-Secret` :

```bash
curl ".../ejpay/orders?limit=50&status=PENDING" -H "X-Admin-Secret: $EJPAY_ADMIN_SECRET"
curl ".../ejpay/wallets" -H "X-Admin-Secret: $EJPAY_ADMIN_SECRET"
```

---

## 7. Cycle de vie d'un paiement

```
App / Admin
   │  POST /ejpay/collect  (orderId = clé d'idempotence)
   ▼
Backend  ──► POST /payment/c2b  (Ejpay)  ──►  PENDING + reference
   │                                              │
   │  ordre PENDING stocké (ejpay_order:<orderId>)│
   ▼                                              ▼
Le client valide sur son téléphone (USSD / prompt)
   │
   ├─► Ejpay appelle  POST /ejpay/webhook  (signé)
   │        statutCode 2 → SUCCESS → règlement métier (une seule fois)
   │        statutCode 3 → FAILED  → remboursement éventuel
   │
   └─► ou l'app interroge  GET /ejpay/status/:orderId
            statutCode 2 → SUCCESS   (règlement identique, idempotent)
            statutCode 3 → FAILED
```

**Règlement métier (`settleOrder`)** — chaque branche n'écrit qu'une fois, garde `settledAt` :

| `kind` | Effet |
|---|---|
| `wallet_topup` | Crédite `walletBalance` + `balance` du passager (clés `passenger:<id>` et `profile:<id>`) et crée `wallet_tx:<orderId>` |
| `ride_payment` | Passe la course en `paymentStatus: "paid"`, `paymentMethod: "ejpay"`, enregistre `paymentReference`, `paidAt`, `amountPaid` |
| `deposit` | Met à jour `scheduled_rides` : `deposit_received = true`, `deposit_method`, `deposit_received_at` |
| `payout` (B2C) | Marque `wallet_tx` en `completed` et envoie un push au chauffeur |

Codes de statut Ejpay : `1` = PENDING, `2` = SUCCESS, `3` = FAILED (le guide contient une coquille `stautCode` sur un exemple : `readStatutCode()` accepte les deux orthographes).

---

## 8. Garanties de sécurité

- **Aucun secret côté client** : l'app n'appelle que les routes Supabase ; les identifiants Ejpay ne quittent jamais le serveur.
- **Signature vérifiée** sur chaque callback, comparaison en temps constant, corps brut.
- **Idempotence** par `orderId` : rejouer une requête ne double jamais un débit ; un ordre réglé ne peut pas être recrédité (`settledAt`).
- **Contrôle de montant** : un callback dont le montant diffère de plus de 1 unité du montant attendu passe en `REVIEW` (aucun crédit automatique) et reste visible pour l'admin.
- **Anti-surfacturation** sur les courses (`kind = "ride_payment"`).
- **Opérations sortantes** (`payout`, `orders`, `wallets`, `refresh`) protégées par `X-Admin-Secret`.
- **Recharge manuelle verrouillée** : `POST /drivers/:id/wallet/recharge` et `POST /passengers/:id/wallet/recharge` renvoient
  `403 MANUAL_RECHARGE_DISABLED` sans en-tête `x-admin-secret` (valeur `EJPAY_ADMIN_SECRET`, à défaut
  `ADMIN_CREATION_SECRET`). Ces routes ne servent plus qu'aux opérations d'administration ; les utilisateurs passent
  exclusivement par Ejpay. Le bouton « Portefeuille » côté chauffeur redirige désormais vers l'écran de recharge
  (`driver-wallet`, montant libre ≥ 5 000 CDF) au lieu de proposer un crédit local.
- **Rate limiting global** de l'Edge Function (100 req / 15 min / IP) déjà en place.

> Limite connue : si Ejpay encaisse mais qu'aucun callback n'arrive **et** que l'app est fermée avant le dernier polling, l'ordre reste `PENDING` jusqu'à la prochaine interrogation. Le bouton « Rafraîchir » de l'écran admin (`POST /orders/:orderId/refresh`) sert exactement à ce cas.

---

## 9. Plan de test (avant activation en production)

1. `GET /ejpay/config` → `configured: true`, `enabled: false`.
2. Activer le drapeau puis vérifier `enabled: true`.
3. **Montant minimum** avec un vrai numéro de test : `POST /collect` `{ "amount": 100, "currency": "CDF", "msisdn": "<votre numéro>", "operatorId": <votre opérateur>, "kind": "wallet_topup", "passengerId": "<compte de test>" }`.
4. Valider sur le téléphone → vérifier :
   - le prompt USSD arrive bien ;
   - `GET /status/:orderId` passe à `SUCCESS` ;
   - le portefeuille du compte de test est crédité **une seule fois** ;
   - `event:<date>:…` contient un `ejpay_payment`, et `ejpay_event:…` un callback avec `signatureOk: true`.
5. **Idempotence** : rejouer le même `POST /collect` avec le même `orderId` → `duplicate: true`, aucun nouveau débit.
6. **Refus** : annuler le prompt sur le téléphone → `GET /status` doit finir en `FAILED`, sans crédit.
7. **Webhook** : si vous testez sans passer par l'app, signez le corps avec `EJPAY_WEBHOOK_SECRET` (HMAC-SHA512 hex) et envoyez-le sur `/ejpay/webhook` ; une signature invalide doit répondre `401`.
8. **Retrait** : `POST /payout` avec `X-Admin-Secret` sur un petit montant ; vérifier le débit immédiat du bonus puis le passage en `completed`, et le recrédit automatique si vous simulez un échec.
9. `GET /ejpay/wallets` → les soldes doivent refléter les mouvements.

Journal des vérifications à cocher dans `docs/CHANGELOG_TECHNIQUE.md`.

---

## 10. Rollback

| Niveau | Action |
|---|---|
| Désactiver les paiements (immédiat, sans redéploiement) | `POST /config/update` `{"config":{"ejpayEnabled":false}}` |
| Revenir au code précédent | `git revert <commit>` puis push sur `main` (redéploiement Vercel + Edge Functions) |
| Neutraliser les identifiants | Supprimer `EJPAY_CLIENT_ID` / `EJPAY_CLIENT_SECRET` dans les secrets Supabase → `configured: false`, plus aucun appel sortant possible |
| Effacer les données de test | Supprimer les clés KV `ejpay_order:*`, `ejpay_event:*`, `wallet_tx:*` correspondantes dans le dashboard Supabase (table `kv_store_2eb02e52`) |

Aucune migration SQL n'accompagne cette intégration : le rollback ne touche pas au schéma.

---

## 11. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `503 EJPAY_DISABLED` | `ejpayEnabled` à `false` ou secrets absents | Activer le drapeau, vérifier `configured: true` |
| `401` sur `/webhook` | Signature absente ou secret `whsec_…` erroné | Recopier `EJPAY_WEBHOOK_SECRET`, vérifier qu'on signe le **corps brut** |
| `502` sur `/collect` | Ejpay injoignable / identifiants refusés | Vérifier `EJPAY_CLIENT_ID` / `EJPAY_CLIENT_SECRET`, logs de l'Edge Function (`[EJPAY/TOKEN]`) |
| `401` sur `/payout`, `/orders`, `/wallets` | `X-Admin-Secret` manquant | Envoyer l'en-tête avec la valeur exacte de `EJPAY_ADMIN_SECRET` |
| Statut bloqué en `PENDING` | Client n'a pas validé, ou callback perdu | `GET /status/:orderId?refresh=1`, puis `POST /orders/:orderId/refresh` |
| Statut `REVIEW` | Montant reçu ≠ montant attendu | Vérifier dans le dashboard Ejpay, puis régler manuellement |
| Numéro refusé | Format non reconnu | Utiliser `+243XXXXXXXXX` ou `0XXXXXXXXX` |

---

## 12. Phase 2 — interface branchée sur Ejpay

**Décision produit** : Ejpay **remplace Flutterwave partout** dans l'application. La carte bancaire, non traitée par Ejpay, est retirée des écrans de paiement.

### Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `lib/ejpay-service.ts` | Client HTTP (config, collecte, statut, polling, helpers admin). Aucun secret côté navigateur. |
| `lib/payment-providers/ejpay-provider-pure.ts` | Provider branché dans `paymentService` (même contrat que les autres providers). |
| `hooks/useEjpayCheckout.ts` | Orchestration : `collect` → attente du résultat (`PENDING` → `SUCCESS`/`FAILED`) avec chronomètre et annulation. |
| `components/passenger/EjpayWaitingModal.tsx` | Écran « Validez sur votre téléphone » (montant, opérateur, temps écoulé, annuler). |
| `components/shared/OperatorLogo.tsx` | Logos réels des opérateurs (`/logos/mpesa.png`, `orange-money.png`, `airtel-money.jpg`, `logo-afrimoney.png`), résolution par clé (`mpesa`, `orange_money`, …) ou par id Ejpay (9, 10, 17, 19). Repli silencieux sur le nom texte si l'image manque. |

### Écrans branchés

| Écran | Flux | `kind` Ejpay |
|---|---|---|
| `components/passenger/PaymentScreen.tsx` | Paiement de course + paiement mixte | `ride_payment` |
| `components/passenger/RechargeModal.tsx` | Recharge du portefeuille (sélecteur d'opérateur ajouté) | `wallet_topup` |
| `components/passenger/ScheduledRides.tsx` | Acompte 50 % d'une réservation | `deposit` |
| `components/driver/DriverWalletScreen.tsx` | Recharge chauffeur (montant libre ≥ 5 000 CDF, sélecteur d'opérateur + numéro) | `driver_wallet_topup` |

Changements transverses :

- `lib/payment-service.ts` : `mobile_money` et `card` routés vers `ejpayProvider` ; la carte renvoie un refus explicite (`CARD_NOT_SUPPORTED`).
- `components/admin/GlobalSettingsScreen.tsx` + `lib/config-sync.ts` : le commutateur « Flutterwave activé » devient **« Ejpay activé (Mobile Money) »**, adossé au drapeau `ejpayEnabled` (faux par défaut).
- Carte bancaire retirée des écrans de paiement (`PaymentScreen`, `ScheduledRides`, `RideScreen`, `ProfileScreen`) et des textes (CGU, paiement mixte).
- Plus aucune popup de paiement : la validation se fait sur le téléphone du client.
- **Logos opérateurs** : `components/mobile-money-logos.tsx` (utilisé par `PaymentScreen`) et `components/shared/OperatorLogo.tsx`
  (utilisé par `RechargeModal`, `ScheduledRides`, `DriverWalletScreen`) affichent les logos officiels servis depuis
  `public/logos/`. Le nom de l'opérateur reste affiché en texte (accessibilité et repli).

### Ce qui reste optionnel

1. ~~Écran admin « Transactions Mobile Money »~~ → **livré** : `components/admin/EjpayTransactionsScreen.tsx` (menu admin « Transactions Mobile Money », route `admin-ejpay`), adossé aux proxys `/admin/ejpay/*`.
2. Retrait chauffeur automatique vers Mobile Money : `POST /ejpay/payout` doit être déclenché par un admin (secret serveur), pas depuis le client.
3. Push FCM « paiement reçu » côté passager (le push chauffeur existe déjà pour les retraits).

### Recharge chauffeur — règlement côté serveur

- **Recharge simple, sans forfait ni durée** : montant libre saisi par le chauffeur, minimum **5 000 CDF** (plafond 1 000 000 CDF).
- `kind = driver_wallet_topup`, `order.driverId` porté par l'ordre, **`metadata.days` absent**.
- Au règlement (`settleOrder`) : `creditDriverWallet()` crédite `driver:<id>.balance` **et** `creditBalance`, écrit `wallet_tx:<orderId>` et envoie un push. Sans `days`, `wallet_expiry_date` n'est **jamais** prolongé : l'éligibilité du chauffeur repose uniquement sur son solde.
- **Éligibilité** : le chauffeur ne peut se mettre en ligne (et ne peut recevoir une course) que si `balance ≥ getMinimumCreditForCategory(catégorie)` — 15 % du tarif de base : 2 520 CDF (standard), 4 200 CDF (confort), 5 040 CDF (plus), 67 200 CDF (business). Après une course, s'il repasse sous ce seuil, le backend le remet automatiquement hors ligne.
- L'application **ne crédite plus** le portefeuille elle-même : elle relit `GET /drivers/:id` pour afficher le solde réel (source de vérité serveur).
- Idempotence : `settledAt` empêche tout double crédit, y compris si le webhook et le polling arrivent ensemble.

---

## 13. Variables & flags — récapitulatif

```
Flag applicatif   : smartcabb_global_config.ejpayEnabled   (défaut : absent = false)
Secrets serveur   : EJPAY_CLIENT_ID, EJPAY_CLIENT_SECRET, EJPAY_WEBHOOK_SECRET
                    EJPAY_ADMIN_SECRET (repli : ADMIN_CREATION_SECRET)
Optionnels        : EJPAY_SCOPE, EJPAY_TOKEN_URL, EJPAY_API_BASE, EJPAY_MIN_CDF, EJPAY_MIN_USD
Webhook           : https://<ref>.supabase.co/functions/v1/make-server-2eb02e52/ejpay/webhook
Table KV          : kv_store_2eb02e52 (préfixes ejpay_order:, ejpay_event:, wallet_tx:)
Migration SQL     : aucune
```
