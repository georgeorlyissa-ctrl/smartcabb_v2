# Journal technique des modifications — SmartCabb

> **But** : garantir la traçabilité de toute modification apportée à l'application et faciliter les interventions ultérieures (debug, rollback, reprise par un autre développeur).
>
> **Règle** : toute modification de code (frontend, backend Edge Functions, config, base de données) doit être consignée ici **dans le même commit** que la modification.
>
> **Ordre** : entrée la plus récente en premier (juste après le modèle ci-dessous).

---

## Modèle d'entrée (à copier pour chaque modification)

```markdown
## AAAA-MM-JJ — <titre court et explicite>

- **Commit** : `<hash>` (branche `main`, poussé sur `origin`)
- **Auteur** : <nom / agent>
- **Type** : feat | fix | refactor | docs | chore | perf | security
- **Objectif** : <le besoin utilisateur ou le bug à résoudre, en 1–3 phrases>

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `chemin/fichier.ts` | <description en une ligne> |

### Description technique
<Ce qui a été fait concrètement : logique, endpoints, flags, migrations, contrats de données.
Assez de détail pour comprendre le code sans le relire.>

### Impact produit / comportement visible
- <Ce que voit le passager / le chauffeur / l'admin / le système>

### Risques & rollback
- **Risque** : <effet de bord possible>
- **Rollback** : <action précise : revert du commit, flag à repasser à `false`, secret à retirer…>

### Tests / vérifications
- [ ] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [ ] <test manuel ou automatique effectué>
- [ ] Déploiement vérifié (Vercel / Edge Function)
```

---

## 2026-11-07 — Sécurité : recharge manuelle verrouillée + logos des opérateurs Mobile Money

- **Commit** : `d5b7586` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security | feat
- **Objectif** : fermer la faille d'auto-crédit gratuit (`POST /wallet/recharge` public, utilisé par la modale « Portefeuille » chauffeur) et remplacer les libellés texte des opérateurs par leurs logos officiels.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | Helper `hasValidAdminSecret()` + garde `403` sur `POST /:driverId/wallet/recharge` |
| `supabase/functions/make-server-2eb02e52/passenger-routes.ts` | Idem sur `POST /:id/wallet/recharge` |
| `components/driver/DriverDashboard.tsx` | Modale Portefeuille → CTA vers `driver-wallet` (plus de crédit local) |
| `components/driver/DriverDashboardNew.tsx` | Idem |
| `components/driver/DriverWalletManager.tsx` | **Supprimé** (UI d'auto-recharge) |
| `components/shared/OperatorLogo.tsx` | **Nouveau** : résolution clé/id Ejpay → logo dans `public/logos/` |
| `components/mobile-money-logos.tsx` | Les 4 composants de logo rendent désormais les images réelles |
| `components/passenger/RechargeModal.tsx` | Grille opérateurs en logos + nom sous le logo |
| `components/passenger/ScheduledRides.tsx` | Aperçu logo à côté du sélecteur d'opérateur |
| `components/driver/DriverWalletScreen.tsx` | Aperçu logo à côté du sélecteur d'opérateur |
| `docs/EJPAY_INTEGRATION.md`, `docs/CHANGELOG_TECHNIQUE.md` | Sécurité, fichiers, cette entrée |

### Description technique
- **Verrouillage** : `driver-routes.ts` et `passenger-routes.ts` exposent maintenant `hasValidAdminSecret(c)` (même logique que `ejpay-routes.ts` : `EJPAY_ADMIN_SECRET`, à défaut `ADMIN_CREATION_SECRET`, en-tête `x-admin-secret`, comparaison stricte). La garde est évaluée **avant** la lecture du corps ; réponse `403 { code: "MANUAL_RECHARGE_DISABLED" }` sinon. Aucun appelant légitime ne subsiste : `DriverWalletManager.tsx` est supprimé et la route passager n'avait aucun appelant.
- **Modale Portefeuille** : les deux dashboards chauffeur affichent le solde + la date d'expiration (lecture seule) et un bouton « Voir les forfaits et recharger » qui ferme la modale et navigue vers `driver-wallet` (encaissement Ejpay `driver_wallet_topup`).
- **Logos** : `OperatorLogo` normalise la clé (`orange_money`, `M-Pesa`, `17`…) vers un fichier de `public/logos/`, avec `onError` → repli silencieux sur le texte. `RechargeModal` affiche logo + nom dans une grille 2 colonnes ; les `<select>` natifs (ScheduledRides, DriverWalletScreen) affichent l'aperçu du logo sélectionné à côté, les `<option>` restant en texte (contrainte HTML).

### Impact produit / comportement visible
- Un chauffeur ne peut plus créditer son portefeuille sans payer : la modale mène au paiement Mobile Money.
- Toute tentative d'appel direct de l'endpoint sans secret renvoie `403`.
- Les sélecteurs d'opérateurs (recharge passager, course, acompte réservation, forfait chauffeur) affichent les logos officiels avec le nom conservé.

### Risques & rollback
- **Risque** : une intégration admin externe qui appelait `/wallet/recharge` sans `x-admin-secret` recevrait `403`. Aucune dans le dépôt.
- **Risque** : si `ADMIN_CREATION_SECRET` et `EJPAY_ADMIN_SECRET` sont absents, la route reste fermée (comportement voulu, fail-safe).
- **Rollback** : `git revert` ; les logos sont de simples assets statiques, aucun impact données.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK (bundle chauffeur −9 kB après suppression de `DriverWalletManager`)
- [x] Edge Function redéployée
- [x] `POST .../drivers/TEST_DRIVER/wallet/recharge` → `403 MANUAL_RECHARGE_DISABLED`
- [x] `POST .../passengers/TEST_PASSENGER/wallet/recharge` → `403 MANUAL_RECHARGE_DISABLED`
- [ ] Vérification visuelle des logos en production (Vercel)

---

## 2026-11-07 — Mobile Money : recharge chauffeur créditée côté serveur + écran admin « Transactions »

- **Commit** : `c963565` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat | security
- **Objectif** : permettre le test réel côté chauffeur (le crédit n'était pas appliqué au bon portefeuille) et donner à l'admin une visibilité sur les encaissements Ejpay, sans exposer de secret dans le navigateur.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ejpay-core.ts` | Nouveau `kind` `driver_wallet_topup` |
| `supabase/functions/make-server-2eb02e52/ejpay-routes.ts` | `collect` accepte `driver_wallet_topup` + `driverId`/`days` ; `creditDriverWallet()` ; `reconcileOrder()` extrait et réutilisé par `/status` |
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | Proxys admin : `GET /admin/ejpay/orders`, `GET /admin/ejpay/wallets`, `POST /admin/ejpay/orders/:orderId/refresh` |
| `lib/ejpay-service.ts` | `EjpayKind` + champs `driverId` / `days` transmis à `/collect` |
| `lib/payment-providers/ejpay-provider-pure.ts` | `driver_wallet_recharge` → `driver_wallet_topup`, `driverId`/`days` transmis |
| `components/driver/DriverWalletScreen.tsx` | Plus de crédit manuel après paiement : relecture de `GET /drivers/:id` (solde + expiration serveur) |
| `components/passenger/WalletScreen.tsx` | Bouton 🐞 de diagnostic masqué en production (`import.meta.env.DEV`) |
| `components/admin/EjpayTransactionsScreen.tsx` | **Nouveau** écran admin (totaux, filtres, tableau, réconciliation, soldes marchand) |
| `components/admin/AdminDashboard.tsx`, `pages/AdminApp.tsx` | Action « Transactions Mobile Money » + route `admin-ejpay` |
| `docs/EJPAY_INTEGRATION.md`, `docs/CHANGELOG_TECHNIQUE.md` | Routes admin, flux chauffeur, cette entrée |

### Description technique
- **Bug corrigé (chauffeur)** : l'ancien flux envoyait `passengerId = driverId` avec `kind = other` ; au règlement, rien n'était crédité côté serveur, le crédit venait d'un appel client à `POST /drivers/:id/wallet/recharge`. Désormais `kind = driver_wallet_topup` et `order.driverId` est renseigné ; `settleOrder` appelle `creditDriverWallet()` (solde `balance` + `creditBalance`, `wallet_expiry_date += days`, `wallet_tx`, push FCM). Le client ne fait plus que relire la fiche conducteur → plus de double crédit possible.
- **Idempotence** : inchangée, `settledAt` protège le crédit (webhook + polling).
- **Réconciliation** : logique extraite dans `reconcileOrder(orderId)` (utilisée par `GET /status/:orderId` et par l'admin). Gère `SUCCESS`, `FAILED` et l'écart de montant (`REVIEW`).
- **Admin** : les proxys `/admin/ejpay/*` réutilisent `listOrders`, `ejpayWallets` et `reconcileOrder` ; `EJPAY_ADMIN_SECRET` reste exclusivement côté serveur. L'écran affiche les totaux (encaissé, en attente, échoués, à vérifier), filtre par statut, permet un refresh par ligne et affiche les soldes marchand (`solde`/`devise` du format Ejpay).

### Impact produit / comportement visible
- Chauffeur : la recharge du forfait est créditée immédiatement après confirmation Ejpay, avec la bonne date d'expiration ; message de succès et SMS inchangés.
- Admin : nouvelle entrée **« Transactions Mobile Money »** dans le tableau de bord, avec toutes les transactions (passager, chauffeur, course, acompte), leurs statuts et un bouton de réconciliation.
- Passager : le bouton 🐞 de diagnostic n'apparaît plus en production (disponible en local/dev).

### Risques & rollback
- **Risque** : les anciens ordres `other` (forfaits chauffeur payés avant ce commit) ne sont pas re-crédités ; ils restent visibles dans l'admin.
- **Risque connu (pré-existant, non traité ici)** : `POST /drivers/:id/wallet/recharge` n'exige pas d'authentification ; un chauffeur pourrait s'auto-créditer. À protéger dans un prochain lot (impacte `DriverWalletManager` admin).
- **Rollback** : `git revert` ; aucun changement de schéma KV ni migration.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] Edge Function redéployée
- [x] `GET /admin/ejpay/orders` → 1 transaction `SUCCESS` 1 000 CDF (test passager réel), totaux `successAmount: 1000`
- [x] `GET /admin/ejpay/wallets` → Orange Money, `solde: 970 CDF` (1 000 − 30 de commission)
- [ ] Recharge chauffeur réelle (5 000 CDF) et vérification du crédit + expiration

---

## 2026-11-07 — Suppression des derniers restes Flutterwave (modale de debug, routes et provider morts)

- **Commit** : `db366bc` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : refactor
- **Objectif** : l'écran Portefeuille affichait encore une modale « Debug Paiement Flutterwave » (bouton 🐞), qui appelait des routes supprimées et parlait de `FLUTTERWAVE_SECRET_KEY`. Supprimer tous les restes de Flutterwave du code.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/EjpayDiagnosticModal.tsx` | **Nouveau** : diagnostic Mobile Money (activé / identifiants / OAuth / callback), sans créer de paiement |
| `components/DebugPaymentModal.tsx` | **Supprimé** (modale Flutterwave) |
| `components/passenger/WalletScreen.tsx` | Utilise `EjpayDiagnosticModal`, bouton renommé « Diagnostic Mobile Money » |
| `components/passenger/RechargeModal.tsx` | Import et état `showDebug` morts retirés |
| `lib/payment-providers/flutterwave-provider.ts` | **Supprimé** (jamais importé) |
| `lib/payment-providers/flutterwave-provider-pure.ts` | **Supprimé** (jamais importé) |
| `supabase/functions/make-server-2eb02e52/payment-routes.ts` | **Supprimé** (routes `/payments/flutterwave/*`) |
| `supabase/functions/make-server-2eb02e52/index.ts` | Montage `/payments` retiré, import `paymentRoutes` supprimé |
| `supabase/functions/make-server-2eb02e52/ejpay-routes.ts` | Nouvelle route `GET /ejpay/health` |
| `hooks/useAdminConfig.ts`, `hooks/useSettings.ts`, `lib/config-sync.ts` | Flag mort `flutterwaveEnabled` retiré (types + défauts) |
| `supabase/functions/make-server-2eb02e52/config-routes.ts`, `admin-routes.ts` | Flag mort `flutterwaveEnabled` retiré des configurations par défaut |
| `types/index.ts` | `PaymentOption.id` : `'flutterwave'` → `'mobile_money'` |
| `lib/payment-providers/base-provider.ts`, `ejpay-provider-pure.ts` | Commentaires Flutterwave nettoyés |
| `docs/EJPAY_INTEGRATION.md`, `docs/CHANGELOG_TECHNIQUE.md` | Route `/health`, diagnostic in-app, cette entrée |

### Description technique
- **Diagnostic** : `EjpayDiagnosticModal` appelle `GET /ejpay/health` à l'ouverture (et via « Relancer »). La route est publique, ne fait aucun mouvement d'argent et renvoie `enabled`, `configured`, `oauthOk`/`oauthError` (via `getAccessToken()`, donc test réel du Client Secret), `callbackConfigured` + URL, opérateurs et minimums. Le rapport est copiable pour le support.
- **Nettoyage** : `payment-service.ts` n'importait déjà que `cash` et `ejpay` ; les fichiers `flutterwave-provider*` et les routes `/payments/flutterwave/*` étaient donc du code mort. Les retirer évite qu'un ancien écran ou un lien oublié rappelle Flutterwave.
- `flutterwaveEnabled` n'était lu par aucun écran (seulement des types/défauts) : suppression sans impact fonctionnel. Les configurations déjà stockées en KV peuvent conserver la clé, elle est simplement ignorée.

### Impact produit / comportement visible
- Le bouton 🐞 du portefeuille ouvre désormais **« Diagnostic Mobile Money (Ejpay) »** : 4 contrôles verts/rouges, opérateurs, minimums, URL de callback, rapport copiable.
- Plus aucune mention de Flutterwave dans l'application.
- Aucun changement dans les parcours de paiement.

### Risques & rollback
- **Risque** : un client externe appellerait encore `/payments/flutterwave/init` → `404`. Aucun appel interne ne le faisait (vérifié par grep).
- **Rollback** : `git revert` du commit (les fichiers supprimés reviennent ; le flag `flutterwaveEnabled` n'est pas nécessaire au fonctionnement).

### Tests / vérifications
- [x] `grep` : plus aucune référence `flutterwave` dans le code (hors documentation historique)
- [x] `npx tsc --noEmit` (seules les erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] `GET /ejpay/health` en production → `enabled: true`, `configured: true`, `oauthOk: true`, `callbackConfigured: true`
- [x] Edge Function redéployée

---

## 2026-11-07 — Recharge passager : saisie en CDF par défaut (USD en option)

- **Commit** : `41f899a` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : la modale de recharge n'acceptait que des montants en USD (20 / 50 / 100 / 200 $), ce qui rendait impossible un test à 100 CDF et obligeait à convertir mentalement. Le Mobile Money et le portefeuille sont libellés en CDF : la saisie doit l'être aussi.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/RechargeModal.tsx` | Sélecteur de devise CDF/USD, montants suggérés en CDF, minimum 100 CDF, conversions et libellés CDF |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- Nouvel état `inputCurrency` (`'CDF' | 'USD'`), **CDF par défaut**, montant initial `1000`.
- `amountCDF` (dérivé) = montant saisi si CDF, sinon `convertUSDtoCDF(rechargeAmount)` ; c'est **toujours** cette valeur qui part vers Ejpay (`currency: 'CDF'`) et le backend espèces. `amountUSD` sert uniquement à l'affichage et au seuil de réduction.
- Montants suggérés : CDF `1000 / 5000 / 10000 / 20000`, USD `20 / 50 / 100 / 200` (le parcours USD reste disponible à l'identique).
- Minimums : `100` CDF (aligné sur `minAmount` Ejpay) et `1` USD ; message d'erreur explicite.
- Le seuil de réduction 5 % reste basé sur 20 USD équivalents (`amountUSD >= 20`).
- `switchCurrency()` convertit la valeur en cours à la bascule (CDF → USD arrondi au cent, USD → CDF arrondi à l'unité).
- Descriptions et métadonnées Ejpay : `description` en CDF, `metadata.amountUSD` + `metadata.inputCurrency` conservés pour l'audit.
- `metadata.type: 'wallet_recharge'` inchangé → `resolveKind()` du provider mappe toujours vers `wallet_topup`, et `passengerId` est pris dans `metadata.userId` : le crédit serveur (`creditPassengerWallet`) fonctionne comme avant.

### Impact produit / comportement visible
- Le passager choisit la devise, voit l'équivalent dans l'autre devise, et peut recharger **100 CDF minimum** (test réel possible).
- Réduction 5 % et solde affiché inchangés (le portefeuille reste stocké en CDF).

### Risques & rollback
- **Risque** : un opérateur peut imposer un minimum supérieur à 100 CDF (refus `FAILED` ou `PENDING` non validé). Fallback : tester 500 ou 1000 CDF.
- **Rollback** : `git revert` du commit ; aucun changement backend, aucune migration.

### Tests / vérifications
- [x] `npx tsc --noEmit` (seules les erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [ ] Recharge réelle 100 CDF dans l'app (validation sur le téléphone du client)
- [ ] Vérifier le crédit du portefeuille et `ejpay_event:*` avec `signatureOk: true`

---

## 2026-11-07 — Ejpay : rotation du Client Secret en production

- **Commit** : `aa49536` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security
- **Objectif** : remplacer le Client Secret Ejpay (identique depuis la mise en service) par une valeur régénérée depuis le dashboard, sans interruption de service.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `docs/EJPAY_INTEGRATION.md` | Nouvelle procédure « Rotation du Client Secret » (commandes, test OAuth, effet immédiat) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- `Regenerate secret` exécuté côté dashboard Ejpay → nouvelle valeur `EJPAY_CLIENT_SECRET` (32 caractères).
- Secret posé via `supabase secrets set EJPAY_CLIENT_SECRET=… --project-ref zaerjqchzqmcxqblkfkg`, puis `supabase functions deploy make-server-2eb02e52`.
- Aucun changement de code : `ejpay-core.ts` lit le secret via `Deno.env.get("EJPAY_CLIENT_SECRET")`.

### Impact produit / comportement visible
- Aucun impact visible (passager, chauffeur, admin).
- Les tokens déjà émis restent valides jusqu'à expiration (~5 min), puis le nouveau secret est utilisé.

### Risques & rollback
- **Risque** : secret erroné → `401` sur l'OAuth, donc `collect`/`payout` en échec (`502`/`503` côté API). Les ordres existants restent consultables.
- **Rollback** : l'ancien secret est définitivement révoqué côté Ejpay ; en cas d'erreur, régénérer à nouveau dans le dashboard et reposer la valeur.

### Tests / vérifications
- [x] OAuth avec le **nouveau** secret → `200`, `token_type=Bearer`, `expires_in=300`, scopes `payment:bulk payment:write payment:read`
- [x] OAuth avec l'**ancien** secret → `401` (révoqué)
- [x] `GET /ejpay/config` → `configured: true`, `enabled: true`, `callbackConfigured: true`
- [x] `GET /ejpay/wallets` sans `X-Admin-Secret` → `401` (protection active)
- [x] Edge Function redéployée

---

## 2026-11-07 — Ejpay : clarification du callback (aucun webhook à déclarer dans le dashboard)

- **Commit** : `e229262` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : docs
- **Objectif** : lever la confusion sur la « déclaration du webhook » dans le dashboard Ejpay. Le guide API 3.6.7 ne prévoit aucun champ d'URL de callback : l'URL est envoyée dans le corps de chaque requête métier.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `docs/EJPAY_INTEGRATION.md` | Section 4 réécrite : `callbackUrl` par requête, rôle réel du dashboard (secrets uniquement), point de vérification `callbackConfigured` |
| `supabase/functions/make-server-2eb02e52/ejpay-core.ts` | `ejpayCallbackUrl()` accepte la surcharge `EJPAY_CALLBACK_URL` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Constat (guide Ejpay v3.6.7, sections 6.5 / 7.5 / 8.5)** : `callbackUrl` est un champ du corps JSON de `POST /payment/c2b`, `POST /payment/b2c` et du bulk. Le dashboard `https://pay.ejsarl.cd` (section **API Credentials**) ne sert qu'à lire/régénérer `Client Secret` et `Webhook Secret` (`whsec_…`). Il n'existe pas d'écran « Webhook URL ».
- Notre Edge Function renseignait déjà `callbackUrl: ejpayCallbackUrl()` sur `collect` (l. 440) et `payout` (l. 732) ; `GET /ejpay/config` expose `callbackConfigured: true`.
- Ajout d'une surcharge optionnelle : si `EJPAY_CALLBACK_URL` est défini, il est utilisé tel quel (utile pour un domaine personnalisé ou une préproduction), sinon l'URL est dérivée de `SUPABASE_URL`.

### Impact produit / comportement visible
- Aucun changement visible pour le passager ou le chauffeur.
- L'exploitant n'a plus à chercher un réglage inexistant dans le dashboard : la seule action côté Ejpay est de conserver les secrets et de vérifier que l'entreprise est activée.

### Risques & rollback
- **Risque** : si `EJPAY_CALLBACK_URL` est défini avec une URL erronée, les callbacks ne parviennent plus (les paiements resteraient réglés par polling). La variable n'est pas définie en production actuellement.
- **Rollback** : supprimer la variable `EJPAY_CALLBACK_URL` ou `git revert` du commit ; le comportement par défaut (`SUPABASE_URL` + route `/ejpay/webhook`) est inchangé.

### Tests / vérifications
- [ ] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `GET /ejpay/config` → `configured: true`, `enabled: true`, `callbackConfigured: true`
- [x] Webhook testé avec HMAC-SHA512 valide → `200 {"success":true,"ignored":true}` ; signature invalide → `401`
- [ ] Redéploiement de l'Edge Function après ce changement

---

## 2026-11-07 — Ejpay : mise en service (secrets, déploiement, vérifications serveur)

- **Commit** : à pousser (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : chore (exploitation) + docs
- **Objectif** : rendre l'intégration Ejpay réellement opérationnelle : secrets saisis, Edge Function redéployée, authentification et contrat vérifiés, URLs corrigées.

### Ce qui a été fait (hors dépôt)
| Action | Détail |
|---|---|
| Secrets Supabase | `EJPAY_CLIENT_ID`, `EJPAY_CLIENT_SECRET`, `EJPAY_WEBHOOK_SECRET`, `EJPAY_ADMIN_SECRET` posés sur le projet `zaerjqchzqmcxqblkfkg` (valeurs **jamais** commitées) |
| Déploiement | `supabase functions deploy make-server-2eb02e52` — les routes `/ejpay/*` n'étaient pas déployées (404 avant l'opération) |
| Vérification 1 | `GET /ejpay/config` → `configured: true`, `enabled: false`, opérateurs 9/10/17/19, minimums 100 CDF / 1 USD |
| Vérification 2 | OAuth `client_credentials` sur `auth.ejsarl.cd` → jeton obtenu (`expires_in: 300`) : identifiants valides |
| Vérification 3 | `GET /ejpay/wallets` (X-Admin-Secret) → `200 success: true`, tableau vide (aucun solde marchand encore alimenté) |

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `docs/EJPAY_INTEGRATION.md` | Référence de projet corrigée : `wmrksqludchpvitakyci` (inexistant) → **`zaerjqchzqmcxqblkfkg`** (URLs de webhook, `config/update`, `config`, `supabase link`) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- Le projet Supabase réel de l'application est `zaerjqchzqmcxqblkfkg` (`utils/supabase/info.ts`, `supabase projects list`). La référence `wmrksqludchpvitakyci` utilisée dans la première version de la doc ne résout pas en DNS : elle est remplacée partout.
- URL de webhook à déclarer chez Ejpay :
  `https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/ejpay/webhook`
- `verify_jwt = false` est bien présent pour `make-server-2eb02e52` (`supabase/config.toml`), donc Ejpay peut appeler le webhook sans jeton Supabase (la sécurité repose sur la signature HMAC).
- Aucun changement de code applicatif dans cette étape : uniquement configuration et documentation.

### Impact produit
- Les paquets de paiement sont désormais **déployés** et **configurés** ; seul le drapeau `ejpayEnabled` reste à `false` jusqu'à la recette.
- Aucun comportement visible pour les utilisateurs tant que le drapeau n'est pas activé.

### Risques & rollback
- **Risque** : les secrets ont transité par un canal de discussion → recommandation de **régénérer** `EJPAY_CLIENT_SECRET` et `EJPAY_WEBHOOK_SECRET` dans le dashboard Ejpay une fois la recette terminée, puis de les remettre à jour dans Supabase.
- **Rollback** : `POST /config/update` `{"config":{"ejpayEnabled":false}}` ; suppression des secrets `EJPAY_*` ; `git revert` pour la doc.

### Tests / vérifications
- [x] `GET /ejpay/config` → `configured: true, enabled: false`
- [x] OAuth Ejpay → jeton 300 s obtenu
- [x] `GET /ejpay/wallets` → 200 (aucun solde configuré côté marchand)
- [ ] Recette réelle à 100 CDF (en attente d'un numéro de test)
- [ ] Webhook déclaré dans le dashboard Ejpay

---

## 2026-11-07 — Fin du remplacement de Flutterwave : libellés, types et réparation du wallet chauffeur

- **Commit** : à pousser (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : fix + refactor
- **Objectif** : supprimer les dernières traces visibles de Flutterwave, aligner les types sur Mobile Money, et réparer `DriverWalletScreen` qui ne pouvait ni lire ni créditer le portefeuille (appels `supabase.from` inexistants + constantes manquantes).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/PaymentMethodScreen.tsx` | Méthode « Flutterwave / carte » remplacée par « Mobile Money » (M-Pesa, Orange, Airtel, Afrimoney) ; id `flutterwave` → `mobile_money` ; solde lu via `walletBalance` ; import `Building2`/`CreditCard` retiré |
| `components/passenger/RechargeModal.tsx` | Texte d'attente : « validez sur votre téléphone » (plus de « fenêtre Flutterwave ») |
| `components/passenger/WalletScreen.tsx` | Libellé de transaction « Mobile Money (Flutterwave) » → « Mobile Money » ; bouton debug renommé |
| `components/driver/DriverWalletScreen.tsx` | **Réparation** : `WALLET_PACKAGES`, type `WalletPackage`, imports manquants (`motion`, `Card`, `Button`, `Badge`, `useEffect`, `Loader2`, `Smartphone`, `Gift`, `FileText`) ; lecture du solde via `GET /drivers/:id` ; crédit via `POST /drivers/:id/wallet/recharge` ; `currentDriver` lu depuis `state` |
| `components/admin/BudgetDashboard.tsx` | Comparatif et fiche prestataire : Ejpay (pay.ejsarl.cd / api.ejsarl.cd) au lieu de Flutterwave |
| `types/index.ts` | `Ride.paymentMethod` et `User.favoritePaymentMethod` : `mobile_money` / `wallet` remplacent `flutterwave` |

### Description technique
- `DriverWalletScreen` utilisait `supabase.from('drivers' | 'wallet_transactions' | 'admin_notifications')` alors que `lib/supabase.ts` n'expose que `auth` (client volontairement minimal) : chaque appel levait `Property 'from' does not exist`. Les écritures ont été remplacées par les routes serveur existantes :
  - lecture : `GET /make-server-2eb02e52/drivers/:driverId` → `balance` / `creditBalance` ;
  - crédit après paiement confirmé : `POST /make-server-2eb02e52/drivers/:driverId/wallet/recharge` `{ amount }`.
- La date d'expiration du forfait reste calculée côté client (`wallet_expiry_date`) : le serveur ne stocke que le solde. L'historique affiché est celui de la session (aucune route publique ne liste les mouvements d'un chauffeur).
- `WALLET_PACKAGES` (Starter 7 j / 5 000 CDF, Standard 14 j / 9 000 CDF, Pro 30 j / 15 000 CDF) est défini localement : la constante n'existait nulle part, ce qui provoquait un `ReferenceError` à l'ouverture de l'écran.
- Aucun changement de schéma, aucune migration.

### Impact produit
- Le chauffeur peut de nouveau ouvrir « Mon wallet » sans plantage, voir son solde réel et activer un forfait après un paiement Mobile Money confirmé.
- Plus aucune mention de Flutterwave dans les écrans passager, chauffeur ou admin.

### Risques & rollback
- **Risque** : l'historique des mouvements n'est plus persistant à l'écran (recharges de la session uniquement).
- **Rollback** : `git revert <commit>` (l'ancien code reste dans l'historique).

### Tests / vérifications
- [x] `npx vite build` OK (14,53 s)
- [x] Typage ciblé (`tsconfig` sans `_headers`) : plus aucune erreur `supabase.from`, `WALLET_PACKAGES`, `WalletPackage`, `FileText` ; restent les erreurs pré-existantes de variantes `Button`/`Badge`
- [ ] Recette : ouverture du wallet chauffeur, paiement d'un forfait à 100 CDF, solde crédité une seule fois

---

## 2026-11-06 — Ejpay (Mobile Money) — phase 2 : Flutterwave remplacé dans toute l'application

- **Commit** : `803b1d3` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : feat (frontend) + refactor + security
- **Objectif** : brancher l'interface sur la passerelle Ejpay livrée en phase 1 (`fdeae1a`) et **remplacer Flutterwave partout** (décision produit), sans jamais exposer de secret et sans fenêtre de redirection. Ejpay ne traite pas les cartes : l'option carte est retirée des parcours de paiement.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/ejpay-service.ts` | **Nouveau** — client HTTP : config (cache 60 s), `collect`, `status`, `waitForEjpayOrder`, helpers admin (`listEjpayOrders`, `getEjpayWallets`, `refreshEjpayOrder`), table des opérateurs et normalisation des identifiants réseau |
| `lib/payment-providers/ejpay-provider-pure.ts` | **Nouveau** — provider au contrat `paymentService` : `initPayment` (C2B), `verifyPayment` (statut), `refundPayment` refusé côté client |
| `hooks/useEjpayCheckout.ts` | **Nouveau** — orchestration `collect` → attente du résultat (3 s, 3 min max) avec chronomètre, annulation (`AbortController`) et verdict normalisé |
| `components/passenger/EjpayWaitingModal.tsx` | **Nouveau** — écran « Validez sur votre téléphone » (montant, opérateur, numéro, temps écoulé, annuler) |
| `lib/payment-service.ts` | `mobile_money` et `card` routés vers `ejpayProvider` (plus de repli silencieux sur le cash) |
| `components/passenger/PaymentScreen.tsx` | Course et paiement mixte : popup + polling manuel remplacés par `useEjpayCheckout` + `EjpayWaitingModal` ; carte retirée des méthodes |
| `components/passenger/RechargeModal.tsx` | Recharge portefeuille sur Ejpay ; **sélecteur d'opérateur ajouté** ; corrige au passage un test `result.redirectUrl` jamais rempli par le provider |
| `components/passenger/ScheduledRides.tsx` | Acompte 50 % sur Ejpay ; option « Carte bancaire » supprimée ; grille 3 colonnes |
| `components/driver/DriverWalletScreen.tsx` | Forfait chauffeur sur Ejpay ; sélecteur d'opérateur + numéro ; suppression de l'activation « après 15 s » non conditionnée au paiement ; corrige un `usePayment` non importé |
| `components/admin/GlobalSettingsScreen.tsx` + `lib/config-sync.ts` | « Flutterwave activé » remplacé par **« Ejpay activé (Mobile Money) »** (flag `ejpayEnabled`, défaut `false`) |
| `components/passenger/RideScreen.tsx`, `components/passenger/ProfileScreen.tsx` | Option « Carte bancaire » retirée des sélecteurs |
| `components/MixedPaymentSelector.tsx`, `components/shared/TermsOfService.tsx`, `website/cgu.html` | Textes : « Flutterwave » → « Mobile Money » ; carte signalée indisponible dans les CGU |
| `docs/EJPAY_INTEGRATION.md` | Nouvelle section 12 « Phase 2 — interface branchée sur Ejpay » |

### Description technique
- **Un seul point de bascule** : tous les écrans passaient déjà par `paymentService.initPayment()` / `verifyPayment()`. Le provider Ejpay implémente le même contrat, donc le remplacement de Flutterwave tient en un import et une branche de `getProvider()`.
- **Pas de redirection** : `initPayment` renvoie `status: 'pending'` + `transactionId = orderId` (pas de `paymentUrl`). Le hook interroge `GET /ejpay/status/:orderId` toutes les 3 s ; le backend interroge lui-même Ejpay au-delà de 8 s, donc l'app ne stresse pas le fournisseur.
- **Kind déduit du contexte** : `metadata.type` `ride_payment*` → `ride_payment`, `wallet_recharge` → `wallet_topup`, `reservation_deposit` → `deposit`, `driver_wallet_recharge` → `other` (l'activation du forfait reste locale, déclenchée par le succès du paiement).
- **Order id** : `reference` de l'écran nettoyée (`[A-Za-z0-9_-]`, 64 car.) et utilisée comme clé d'idempotence ; les références contiennent déjà `Date.now()`, donc chaque tentative est unique.
- **Opérateurs** : les écrans utilisent `mpesa` / `orange_money` / `airtel_money` / `afrimoney` ; `toOperatorId()` les ramène vers 9 / 10 / 17 / 19.
- **Fin d'attente** : `SUCCESS` → écran de succès ; `FAILED` → message d'erreur ; `REVIEW` → message « vérification manuelle » ; `TIMEOUT` → overlay fermé + message d'information (le webhook créditera plus tard) ; `CANCELLED` → retour au formulaire.
- **Sécurité** : aucun secret Ejpay côté navigateur (uniquement la clé anon Supabase) ; le montant d'une course est contrôlé côté serveur ; le remboursement exige un admin (`refundPayment` refuse côté client).
- **Admin** : le drapeau `ejpayEnabled` reste **faux par défaut**, donc le déploiement de cette phase ne modifie aucun comportement tant que le service n'est pas activé.

### Impact produit / comportement visible
- Paiement Mobile Money : plus de popup ; le client valide sur son téléphone et voit « Validez sur votre téléphone » avec un chronomètre.
- Recharge et acompte de réservation demandent désormais explicitement l'opérateur (M-Pesa, Orange, Airtel, Afrimoney).
- La carte bancaire n'est plus proposée (elle n'était de toute façon pas fonctionnelle : `flutterwaveEnabled` n'était pas exploité par les écrans).
- Admin → Réglages globaux : interrupteur « Ejpay activé (Mobile Money) ».

### Risques & rollback
- **Risque** : si le service est activé sans recette, les paiements Mobile Money échouent avec un message explicite (`503 EJPAY_DISABLED`, `502` fournisseur).
- **Risque** : un paiement validé après la fenêtre de 3 min n'est plus suivi par l'écran (il est réglé par le webhook) → message d'information, pas de double débit.
- **Risque** : la carte n'étant plus disponible, les clients qui l'utilisaient doivent passer par Mobile Money, le portefeuille ou les espèces.
- **Rollback immédiat** : Admin → Réglages globaux → désactiver « Ejpay activé » (ou `POST /config/update` `{"config":{"ejpayEnabled":false}}`).
- **Rollback code** : `git revert 803b1d3` puis push sur `main`.
- **Rollback fournisseur** : restaurer `flutterwaveProvider` dans `lib/payment-service.ts` (l'ancien provider est toujours présent).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] Typage ciblé des nouveaux fichiers (`tsc -p tsconfig.check.json`, dossier `_headers` exclu) : 0 erreur sur `lib/ejpay-service.ts`, `ejpay-provider-pure.ts`, `useEjpayCheckout.ts`, `EjpayWaitingModal.tsx`
- [x] `npx vite build` OK (12,98 s)
- [ ] Recette réelle : parcours course + recharge + acompte avec un numéro de test et le drapeau activé
- [ ] Vérification visuelle de la modale d'attente sur mobile

---

## 2026-11-06 — Intégration Ejpay (Mobile Money RDC) — phase 1 : backend désactivé par défaut

- **Commit** : `fdeae1a` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : feat (backend) + security
- **Objectif** : encaisser et décaisser via **EJ PAY v3.6.7** (EJSARL) — Vodacom M-Pesa, Orange Money, Airtel Money, Africell Afrimoney — en CDF et USD, sans jamais exposer de secret côté client, sans double débit possible, et sans activer le service tant que la recette n'est pas faite.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ejpay-core.ts` | **Nouveau** — client OAuth 2.0, appels C2B/B2C/bulk/statut/wallets, vérification HMAC-SHA512, normalisation MSISDN, modèle `EjpayOrder` + stockage KV |
| `supabase/functions/make-server-2eb02e52/ejpay-routes.ts` | **Nouveau** — routes `/ejpay/*`, règlement métier (wallet, course, acompte, retrait), `X-Admin-Secret` |
| `supabase/functions/make-server-2eb02e52/index.ts` | Montage `app.route("/make-server-2eb02e52/ejpay", ejpayRoutes)` + import |
| `docs/EJPAY_INTEGRATION.md` | **Nouveau** — secrets, activation, contrat d'API, cycle de paiement, plan de test, rollback, dépannage |

### Description technique
- **Authentification** : OAuth 2.0 `client_credentials` sur le Keycloak d'EJ PAY (`auth.ejsarl.cd/realms/ej-payment`), scope `payment:write payment:read`. Le jeton vit 300 s ; il est renouvelé à **90 %** de sa durée, mis en cache en mémoire puis dans le KV (`ejpay_token_cache`) pour être partagé entre isolates. Un `401` déclenche **un seul** retry avec un jeton neuf.
- **Routes exposées** (préfixe `/make-server-2eb02e52/ejpay`) : `GET /config` (état, opérateurs, minimums), `POST /collect` (C2B), `GET /status/:orderId` (`?refresh=1` force la vérification), `POST /webhook`, `POST /payout` (B2C), `GET /orders`, `GET /wallets`, `POST /orders/:orderId/refresh`.
- **Asynchrone assumé** : `POST /payment/c2b` renvoie toujours `PENDING` (statutCode 1). Seul le callback signé, ou le polling de `GET /payment/{reference}`, donne le résultat. `GET /status` rafraîchit automatiquement un ordre `PENDING` de plus de 8 s.
- **Signature** : `X-EJPay-Signature` = HMAC-SHA512 hex du **corps brut**, comparé en temps constant (`crypto.subtle` + XOR accumulateur). La route lit `c.req.text()` avant tout `JSON.parse`, journalise chaque callback (`ejpay_event:<orderId>:<ts>`) et répond 200 en moins de 10 s ; elle ne renvoie 500 qu'en cas d'exception interne pour déclencher un nouvel essai (traitement idempotent).
- **Idempotence** : `orderId` est la clé (`ejpay_order:<orderId>`). Un ordre `PENDING` réutilisé → `200 duplicate` **sans nouvel appel Ejpay** ; un ordre `SUCCESS`/`FAILED` réutilisé → `409`. Le règlement métier est gardé par `settledAt`, donc un callback rejoué ne crédite jamais deux fois.
- **Règlement métier** : `wallet_topup` → crédit `walletBalance`/`balance` (`passenger:<id>` + `profile:<id>`) + `wallet_tx:<orderId>` ; `ride_payment` → course en `paymentStatus: paid`, `paymentMethod: ejpay`, `paymentReference`, `paidAt`, `amountPaid` ; `deposit` → `scheduled_rides.deposit_received = true` + méthode + date ; `payout` → `wallet_tx` en `completed` + push FCM au chauffeur.
- **Retrait chauffeur** : le bonus est **réservé (débité) avant** l'appel Ejpay ; refus immédiat ou callback `FAILED` → recrédit automatique (`wallet_tx` de type `withdraw_refund`, garde `refundedAt`).
- **Contrôles de montant** : sur `kind = "ride_payment"`, le montant est refusé s'il dépasse le prix de la course (+1 de tolérance) ; sur callback/polling, un montant reçu différent du montant attendu bascule l'ordre en `REVIEW` **sans crédit automatique**.
- **Sécurité** : `payout`, `orders`, `wallets`, `refresh` exigent `X-Admin-Secret` (`EJPAY_ADMIN_SECRET`, repli `ADMIN_CREATION_SECRET`), comparaison en temps constant. Aucun identifiant Ejpay côté client. Rate-limit global de l'Edge Function conservé.
- **Activation** : drapeau `ejpayEnabled` dans `smartcabb_global_config` (`POST /config/update`), **faux par défaut** ; `collect`/`payout` répondent `503 EJPAY_DISABLED` tant qu'il est inactif. `ejpayEnabled()` exige aussi `EJPAY_CLIENT_ID`/`EJPAY_CLIENT_SECRET`.
- **Numéros** : normalisation en `243XXXXXXXXX` (accepte `+243…`, `00243…`, `243…`, `0XXXXXXXXX`, `XXXXXXXXX`) — format exigé par le guide.
- **Aucune migration SQL** : tout vit dans le KV existant (`kv_store_2eb02e52`).

### Impact produit / comportement visible
- **Aucun changement visible pour l'instant** : le service est déployé inactif et aucune interface ne l'appelle encore.
- Une fois activé : le passager pourra payer/recharger via Mobile Money (validation sur son téléphone), le chauffeur pourra être payé sur son wallet, l'admin disposera de la liste des transactions et des soldes marchand.
- Les événements `ejpay_payment` / `ejpay_payment_failed` apparaîtront dans le fil d'activité admin.

### Risques & rollback
- **Risque** : un callback sans signature valide est ignoré (401) — vérifier `EJPAY_WEBHOOK_SECRET` avant la mise en production.
- **Risque** : un ordre peut rester `PENDING` si le client ne valide pas et que l'app est fermée avant le dernier polling → bouton `POST /orders/:orderId/refresh` côté admin.
- **Risque** : `EJPAY_ADMIN_SECRET` non défini → repli sur `ADMIN_CREATION_SECRET` (rotation liée).
- **Rollback immédiat** : `POST /config/update` `{"config":{"ejpayEnabled":false}}` — aucun redéploiement nécessaire.
- **Rollback total** : `git revert fdeae1a` puis push sur `main` ; suppression des secrets `EJPAY_*` ; nettoyage optionnel des clés KV `ejpay_order:*` / `ejpay_event:*`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK (18,95 s)
- [ ] Recette sandbox/production : `POST /collect` sur petit montant avec un vrai numéro, vérification du prompt, du passage à `SUCCESS` et du crédit unique (procédure détaillée dans `docs/EJPAY_INTEGRATION.md` § 9)
- [ ] Déploiement Edge Function vérifié (`GET /ejpay/config` → `configured: true`)

---

## 2026-11-04 — « Choisir un véhicule » : SmartCabb Standard à la même taille que les autres catégories

- **Commit** : `bc3933e` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : fix (UI) 
- **Objectif** : sur l'écran « Choisir un véhicule », la carte **SmartCabb Standard** occupait toute la largeur (`col-span-2`) et devenait plus haute que les autres une fois sélectionnée. Le client demande qu'elle soit « au même pied » que Confort, Familiale et Business.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/EstimateScreen.tsx` | Suppression de `isStandardVariant` / `fullWidth` (`col-span-2`) ; grille `auto-rows-fr` ; pied de carte (badge ✓ + bouton) à espace réservé |

### Description technique
- **Largeur** : la classe conditionnelle `${fullWidth ? 'col-span-2' : ''}` a été retirée de `renderVehicleCard`, ainsi que le helper `isStandardVariant`. Les 4 cartes (Standard, Confort, Familiale, Business) occupent donc une seule colonne de la grille `grid-cols-2`.
- **Hauteur identique** : la grille passe de `grid grid-cols-2 gap-1.5` à `grid grid-cols-2 auto-rows-fr gap-1.5`. `grid-auto-rows: minmax(0, 1fr)` force les deux rangées à la même hauteur (celle du plus grand contenu), donc les 4 cartes ont exactement la même hauteur même si Business n'affiche qu'une seule ligne tarifaire.
- **Sélection sans changement de taille** : le pied de carte (badge « ✓ Succès » + bouton « Confirmer la commande », ~52 px) n'est plus rendu conditionnellement. Il est toujours présent en DOM et simplement masqué par `invisible` (`visibility: hidden`, l'espace reste occupé) quand le véhicule n'est pas sélectionné ; `aria-hidden` et `tabIndex={-1}` évitent qu'il soit lu ou focusé. La carte sélectionnée n'est donc pas plus haute que les autres.
- **Alignement** : la carte devient `flex flex-col` + `h-full`, le contenu interne `p-1.5 flex flex-col flex-1 gap-1`, et le pied est poussé en bas par `mt-auto` → bouton toujours aligné en bas de carte, quelle que soit la longueur du bloc tarifaire.

### Impact produit / comportement visible
- Les 4 catégories ont la même largeur et la même hauteur, alignées en 2 × 2.
- Sélectionner un véhicule ne fait plus « sauter » la hauteur de la grille : seul le pied de la carte devient visible.
- Le bouton de commande reste dans la carte sélectionnée, aligné en bas.

### Risques & rollback
- **Risque** : chaque carte réserve ~52 px de pied vide quand elle n'est pas sélectionnée (choix assumé pour garantir une hauteur constante).
- **Risque** : sur écran très étroit, les libellés du bloc tarifaire restent en 9 px (comportement inchangé).
- **Rollback** : `git revert f9e0c11`, ou remettre manuellement `col-span-2` pour `smart_standard` et l'affichage conditionnel du pied de carte.

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`, pré-existantes)
- [x] `npx vite build` — OK
- [x] Mesures DOM (reproduction de la grille, viewport 390 px) : 4 cartes à **176 × 234 px**, Standard sélectionnée incluse
- [x] Mesures DOM (1440 px) : 4 cartes à **701 × 234 px**, aucun débordement horizontal
- [ ] Contrôle visuel sur appareil réel après déploiement Vercel

---

## 2026-11-04 — Chargement : un seul écran (le splash validé) au lieu de 2-3 écrans successifs

- **Commit** : `9f14db1` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : fix (perf perçue) + feat (identité du loader)
- **Objectif** : en passant d'une page à l'autre, l'application affichait parfois **deux ou trois écrans de chargement à la suite** (splash natif Android → preloader web → splash React → fallback Suspense), ce qui donnait une impression de lourdeur. Le seul écran de chargement doit être celui validé par le client (capture : fond bleu nuit, tuile logo, SMARTCABB, barre jaune, « Ride Smart, Live Smart », Kinshasa · RDC).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/BrandLoader.tsx` | Reproduit le splash validé (grille, itinéraire pointillé, tuile logo, filigrane, pied de page) ; une seule animation |
| `index.html` | Bloc `<style id="boot-loader-css">` et markup `#preloader` réécrits à l'identique ; mêmes classes `.sc-boot*` |
| `styles/globals.css` | Règles `.sc-boot*` alignées sur le nouveau visuel (`.sc-boot-grid`, `.sc-boot-route`, `.sc-boot-vignette`, `.sc-boot-footer`, `.sc-boot-tagline`, `.sc-boot-place`) |
| `components/DeferredLoading.tsx` | **Nouveau** : fallback `Suspense` qui n'affiche le loader qu'après 400 ms |
| `components/SplashScreen.tsx` | Précharge la route courante (`warmRouteModule`) et borne l'affichage (0,8 s → 2,6 s) ; plus de retour anticipé |
| `components/AppRouter.tsx` | Le splash n'est affiché qu'une fois par session (`sc-splash-seen` lu à l'initialisation) ; fallback = `DeferredLoading` |
| `App.tsx` | Fallback global = `DeferredLoading` (import `LoadingScreen` remplacé) |
| `android/app/src/main/res/drawable/splash_bg.xml` | Splash natif : fond blanc + icône Capacitor → fond bleu nuit `#0D3145` + tuile logo centrée |
| `android/app/src/main/res/drawable-*/splash_logo.png` | **Nouveaux** : tuile logo (mdpi 132 px → xxxhdpi 528 px), fond du JPEG détouré pour se fondre dans la tuile |

### Description technique
- **Cause des écrans multiples** : quatre rendus de chargement différents se succédaient. (1) le splash natif Android était encore celui de Capacitor (fond **blanc** + icône bleue) ; (2) le preloader d'`index.html` et (3) le `SplashScreen` React s'affichaient tous les deux ; (4) le module de la route étant chargé en `lazy`, le fallback `Suspense` réapparaissait juste après le splash. En navigation avec rechargement complet (`window.location`), toute la chaîne repartait.
- **Un seul visuel** : `index.html` (CSS critique + markup) et `BrandLoader` partagent exactement les mêmes classes, donc le preloader natif est remplacé par le splash React sans rupture. Le splash natif Android reprend la même couleur de fond (`#0D3145`) et la même tuile logo.
- **Plus qu'un splash par session** : `AppRouter` initialise `showSplash` à partir de `sessionStorage['sc-splash-seen']`. À la première ouverture, le splash s'affiche et précharge la route (`warmRouteModule` : `PassengerApp`, `DriverApp`, `AdminApp`, `LandingScreen` ou `LandingPage`) entre 0,8 s et 2,6 s. Aux rechargements suivants, **aucun splash** : le preloader a déjà couvert le démarrage.
- **Fallback différé** : `DeferredLoading` ne monte le loader qu'après 400 ms. Chunk en cache (cas normal) → rien ne s'affiche ; chunk lent → le même écran (jamais un autre spinner).
- **Android** : `splash_bg.xml` utilise une `<shape>` bleu nuit + `@drawable/splash_logo` centré. Les PNG sont générés avec une tuile blanche arrondie (rayon 23 %) et le logo détouré (pixels neutres clairs passés en alpha 0), donc aucun rectangle gris visible. **L'APK doit être reconstruit** pour bénéficier de ce changement.

### Impact produit / comportement visible
- Ouverture de l'app : **un seul** écran SmartCabb, du splash natif jusqu'à l'écran d'accueil (plus de flash blanc, plus d'icône Capacitor).
- Navigation entre les pages : **aucun écran de chargement** dans le cas normal ; si un module tarde (> 400 ms), c'est toujours le même écran SmartCabb qui apparaît, jamais un spinner différent.
- Le splash n'est plus rejoué à chaque rechargement complet : une seule fois par session.

### Risques & rollback
- **Risque** : si un module met plus de 400 ms à charger sur un réseau très lent, un écran de chargement apparaît en cours de navigation — c'est volontaire et identique au splash.
- **Risque** : un splash natif mal rendu sur certains Android 12+ (le système peut imposer sa propre animation d'icône) ; le fond reste bleu nuit.
- **Rollback global** : `git revert 9f14db1`.
- **Rollback partiel** : remettre `const SuspenseFallback = () => <LoadingScreen />;` dans `App.tsx` (loader immédiat) et `useState(true)` dans `AppRouter` (splash à chaque ouverture).
- **Rollback Android** : restaurer l'ancien `splash_bg.xml` (fond blanc + `@mipmap/ic_launcher_foreground`) ; les PNG `splash_logo.png` peuvent rester (inutilisés).

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`, pré-existantes)
- [x] `npx vite build` — OK
- [x] Premier chargement d'une session : splash React affiché (`sessionStorage['sc-splash-seen'] = '1'`), preloader déjà retiré
- [x] Rechargement dans la même session : `document.querySelector('.sc-boot') === null` et contenu applicatif rendu → **un seul écran**
- [x] Mesures du loader (viewport 527 px) : tuile 112 px centrée, marque 23 px, barre 96 × 3 px, pied de page à 81 % / 87 % de la hauteur, aucun débordement horizontal
- [x] Aucune erreur console
- [ ] Rendu visuel sur appareil Android réel après reconstruction de l'APK (splash natif → WebView)

---

## 2026-11-04 — Vitrine : CTA « Réserver une course », photo chauffeur en fond de hero, App Store « très bientôt » et animations au défilement

- **Commit** : `fefa519` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : feat (vitrine) + fix (animations / ancres)
- **Objectif** : compléter le hero refait la veille (CTA « Réserver une course », photo du chauffeur, suppression du badge « Taxi & VTC · Kinshasa »), annoncer l'arrivée de l'app iPhone, et faire en sorte que **toutes** les sections s'animent réellement au défilement ou au clic sur les liens du menu.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `pages/LandingPage.tsx` | Hero : badge « Taxi & VTC · Kinshasa » supprimé, 3ᵉ CTA « Réserver une course », rangée de badges Google Play + App Store, tableau `backgrounds` `{ src, position }` avec la photo du chauffeur en 1ʳᵉ position ; nouveau composant `AppStoreBadge` ; `PlayStoreBadge` refactoré sur `.sc-store-badge` ; `useInViewCustom` fiabilisé ; `scroll-margin-top` des ancres ; fermeture du menu mobile au clic |
| `styles/globals.css` | `scroll-behavior: smooth` ajouté aussi sur `body` (conteneur de défilement réel des pages longues) |
| `public/hero-driver.jpg` | Nouvelle image de fond du hero (chauffeur SmartCabb souriant), 1518 × 1152, qualité 90 |

### Description technique
- **Hero** : suppression de l'eyebrow « Taxi & VTC · Kinshasa » (jugé non essentiel). Les CTA sont désormais : `Commander une course` (`/app/passenger`), `Réserver une course` (`/app/passenger?screen=scheduled-rides`, bouton clair `.sc-hero-btn-soft`) et `Devenir Chauffeur`. Les badges de téléchargement sont sortis de la rangée de boutons et regroupés dans `.sc-hero-stores` (Google Play cliquable + App Store « très bientôt »).
- **Photos de fond** : `backgrounds` passe de `string[]` à `{ src: string; position: string }[]` pour pouvoir cadrer chaque image indépendamment. `public/hero-driver.jpg` est en première position avec `background-position: center 32%`. Le fondu enchaîné (4 s, opacité 1,6 s) est inchangé.
- **`AppStoreBadge`** : composant non cliquable (`role="note"`, `aria-label` explicite), logo Apple, mention « Très bientôt » / « App Store » et pastille `iOS`. Utilisé à la fois dans le hero et dans le bandeau « Télécharger l'app » (remplace l'ancien bloc iOS inline, dont le balisage était dupliqué).
- **`PlayStoreBadge`** : styles inline remplacés par la classe `.sc-store-badge` (hauteur 52 px desktop / 48 px mobile, fond `#222`, hover CSS). Le prop `pulse` réactive l'animation d'attention `ctaAttention` uniquement dans le bandeau de téléchargement — le hero reste calme (une seule animation d'entrée).
- **Animations au défilement** : `useInViewCustom` vérifie d'abord si l'élément est déjà dans le viewport au montage (affichage immédiat, pas de section qui « saute »), sinon utilise `IntersectionObserver` avec `rootMargin: '0px 0px -6% 0px'`, replie sur `setInView(true)` si l'API est absente, et embarque un filet de sécurité : si l'observateur ne rappelle jamais (rendu suspendu, WebView), la section est affichée au bout de 2,5 s. Une section ne peut donc plus rester invisible.
- **Ancres** : `section[id] { scroll-margin-top: 118px }` (90 px sous 900 px) pour que « Comment ça marche », « Pourquoi nous », « Témoignages » s'arrêtent **sous** le header fixe (barre d'infos 36 px + nav 74 px). Le menu mobile se referme au clic sur un lien (`setIsMenuOpen(false)`).
- **Défilement réel** : sur les pages longues, `html, body { height: 100% }` fait de `<body>` le conteneur de défilement. `scroll-behavior: smooth` a donc été ajouté sur `body` (il n'était que sur `html`), et l'écouteur du scroll-spy passe en phase de capture (`{ capture: true }`) pour recevoir les événements émis par `<body>`.

### Impact produit / comportement visible
- Le hero propose à nouveau « Réserver une course » (réservation planifiée) à côté de « Commander une course ».
- La photo du chauffeur souriant ouvre le diaporama de fond du hero.
- « Très bientôt sur l'App Store » est visible pour les iPhone, dans le hero **et** dans le bandeau de téléchargement, sans lien mort.
- Chaque section apparaît en fondu + translation (droite/gauche pour « Pourquoi nous » et « Afrique ») au défilement, et les liens d'ancre amènent la section sous le header sans la masquer.
- Menu mobile : un clic sur un lien ferme le panneau et laisse voir la section ciblée.

### Risques & rollback
- **Risque** : `public/hero-driver.jpg` est un recadrage (1518 × 1152) de la photo fournie, pas l'original haute définition — léger flou possible sur écran 4K. Remplacer le fichier par l'original **sans changer le code** (même nom, même chemin).
- **Risque** : `scroll-behavior: smooth` sur `body` s'applique à toute l'application (désactivé automatiquement par la règle `prefers-reduced-motion` déjà présente).
- **Rollback global** : `git revert fefa519`.
- **Rollback animations** : retirer `rootMargin` / filet de sécurité dans `useInViewCustom` (les sections redeviennent dépendantes du seul `IntersectionObserver`).
- **Rollback hero** : remettre `backgrounds` en `string[]` et retirer la section `.sc-hero-stores` du JSX.

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`, pré-existantes)
- [x] `npx vite build` — build OK (seul avertissement : chunk `PassengerApp` > 500 kB, pré-existant)
- [x] Mesures DOM via iframes 1440 / 1280 / 390 px : `scrollWidth === clientWidth` (aucun débordement horizontal), hero 900 px (desktop) / 828 px (mobile), titre 76 px → 35 px, `scroll-margin-top` 118 px / 90 px, badges 52 px / 48 px, 3 CTA présents
- [x] Barre d'informations masquée sous 900 px, `.sc-hero-eyebrow` absent du DOM
- [ ] Vérification visuelle du fondu au défilement (non instrumentable ici : le panneau navigateur de test suspend le rendu, `IntersectionObserver` et `requestAnimationFrame` ne rappellent pas) — à confirmer sur `https://smartcabb.vercel.app` après déploiement

---

## 2026-11-04 — Vitrine plein écran (hero full-bleed) + correction du conteneur racine compressé

- **Commit** : `0527c23` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : fix (mise en page) + feat (design vitrine)
- **Objectif** : le site public paraissait « bizarre » et comprimé au centre de l'écran. Il doit occuper toute la largeur, avec un rendu professionnel de type site institutionnel : barre d'informations, header large, hero photo plein écran et titre centré.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `styles/globals.css` | `.app-container` repassé en pleine largeur (`max-width: none`) ; nouveau `.content-narrow` (42 rem) pour les blocs de texte qui doivent rester lisibles |
| `pages/LandingPage.tsx` | Refonte complète du hero (full-bleed photo + voile sombre + titre centré + bandeau de chiffres) ; barre d'informations et header élargis à 1600 px ; suppression du hero 2 colonnes, du carrousel d'images et des badges flottants ; polices Inter déplacées vers `index.html` |
| `lib/simple-router.tsx` | `Link` transmet désormais **toutes** les props natives de `<a>` (dont `style`, `title`, `aria-*`) — avant, seul `className` était transmis |
| `index.html` | Famille Inter ajoutée au `<link>` Google Fonts (suppression de l'`@import` CSS bloquant de la vitrine) |

### Description technique
- **Cause racine du site « comprimé »** : le lot design précédent avait défini `.app-container { max-width: 42rem }`. Or `App.tsx` utilise `.app-container` comme **conteneur racine de toute l'application** : le site entier était donc limité à 672 px et centré. Correction : `.app-container { width: 100%; max-width: none; margin-inline: 0 }`. L'utilitaire de largeur de lecture est renommé `.content-narrow` (opt-in, 42 rem).
- **Hero full-bleed** : section `min-height: 100dvh`, photo de fond en `background-size: cover` (3 photos en fondu enchaîné toutes les 4 s), voile dégradé bleu nuit pour la lisibilité, contenu centré : badge « Taxi & VTC · Kinshasa », titre `clamp(36px, 6vw, 76px)`, sous-titre 660 px max, 3 CTA (Commander, Devenir chauffeur, Google Play) et bandeau de 3 chiffres clés en verre dépoli. Plus de grille 2 colonnes, plus de badges flottants ni de particules.
- **En-tête** : barre d'informations sombre (36 px, desktop uniquement) — Kinshasa, 24h/24, téléphone `+243 960 624 008`, moyens de paiement, chauffeurs vérifiés — puis navigation blanche collante de 74 px. Les deux blocs sont contenus dans 1600 px (au lieu de 1280 px), ce qui donne l'effet pleine largeur sur grand écran. En dessous de 900 px, la barre d'informations est masquée et le hero passe à 92 dvh avec des paddings réduits.
- **`Link` du routeur maison** : la signature est étendue à `Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>` et `{...rest}` est appliqué à l'ancre. Conséquence immédiate : le logo du header n'est plus empilé (son `display:flex` inline était perdu) et les liens stylés en boutons (ex. « Login ») retrouvent leur padding et leur taille de police. Correction transverse, bénéfique à toutes les pages.
- **Polices** : `@import url(fonts.googleapis…)` retiré du `<style>` de la vitrine (bloquant) ; Inter est chargée via le `<link>` de `index.html` avec `preconnect`.

### Impact produit / comportement visible
- Le site public occupe désormais 100 % de la largeur : plus de colonne étroite au centre de l'écran.
- Page d'accueil : hero photo plein écran avec titre centré, comme une vitrine institutionnelle ; header avec coordonnées et moyens de paiement.
- Les pages `/services`, `/about`, `/contact`, `/terms`, `/legal` occupent aussi toute la largeur (contenu à 1280 px, fond pleine largeur).
- Header corrigé sur toutes les pages : logo horizontal, boutons de navigation à la bonne hauteur.

### Risques & rollback
- **Risque** : le hero plein écran est plus sombre que l'ancien hero clair ; les photos de fond doivent rester lisibles (voile réglable dans `.sc-hero-overlay`).
- **Rollback mise en page** : remettre `max-width: 42rem; margin-inline: auto` sur `.app-container` (déconseillé : reproduit le bug).
- **Rollback hero** : `git revert` du commit ; l'ancien hero 2 colonnes est dans l'historique Git (`pages/LandingPage.tsx`).
- **Rollback `Link`** : retirer `{...rest}` et l'extension de `LinkProps` — mais le logo du header redeviendra empilé.

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`)
- [x] `npx vite build` — OK
- [x] Mesures réelles en iframe 1440 / 1280 / 390 px sur `/` : `scrollWidth === clientWidth` partout ; hero 900 px (1440), 828 px (390) ; titre 76 px / 61 px / 35 px ; barre d'infos visible ≥ 900 px uniquement ; boutons 52 px (desktop) / 48 px (mobile)
- [x] `/services`, `/about`, `/contact`, `/terms`, `/legal`, `/app/landing` en 1440 px : aucune page ne dépasse la largeur, contenu 1280 px
- [x] Logo du header mesuré `display: flex`, 176 × 40 px (alignement horizontal rétabli)

---

## 2026-11-03 — Design system : échelle typographique Uber, chargement unique, responsivité globale

- **Commit** : `94c9ca7` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : feat (design system) + perf (chargement)
- **Objectif** : harmoniser la typographie sur une échelle dense type Uber (textes plus petits, hiérarchie plus nette), ne garder qu'**une seule animation** pendant le chargement de page, et durcir la responsivité sur toute l'application (hauteurs dynamiques, encoches, débordements, tailles tactiles).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `styles/globals.css` | Nouvelle échelle `@theme` (`--text-xs` → `--text-9xl`), typographie de base 14 px, correctifs responsives globaux, styles du loader unique, `prefers-reduced-motion` |
| `index.html` | Polices en `<link>` + `preconnect` (retirées du CSS), styles critiques du loader inline, preloader natif au nouveau markup |
| `components/BrandLoader.tsx` | **Nouveau** — écran de chargement unique (1 seule animation : la barre) |
| `components/LoadingScreen.tsx` | Réutilise `BrandLoader` (avant : spinner + point pulsé + barre = 3 animations) |
| `components/SplashScreen.tsx` | Réécrit : plus de phases halo/rivets/itinéraire/slogan, délais réduits (1,2 s / 0,5 s) |
| `components/AppRouter.tsx`, `App.tsx` | Fallback Suspense simplifié (plus de wrapper dégradé autour du loader) |
| `main.tsx` | Le preloader natif n'est retiré qu'après le premier rendu React (double `requestAnimationFrame`) |
| `public/preloader.js` | Retrait instantané du preloader (plus de fondu de 300 ms qui superposait deux barres) |
| `components/ui/button.tsx` | Hauteurs type Uber : 44 px (défaut), 36 px (`sm`), 48 px (`lg`), libellé 15 px |
| `components/ui/input.tsx` | Champs 44 px, texte 15 px |

### Description technique
- **Typographie** : les variables `--text-*` de Tailwind sont redéfinies dans un bloc `@theme`. Toutes les classes `text-*` — y compris les variantes responsives `md:text-*` — suivent donc la nouvelle échelle : `xs` 11 px, `sm` 13 px, `base` 14 px, `lg` 16 px, `xl` 18 px, `2xl` 20 px, `3xl` 24 px, `4xl` 28 px, `5xl` 32 px, `6xl` 40 px. Le corps de texte passe à 14 px (référence Uber), les titres ont un interligne resserré et un `letter-spacing` de −0,01 em.
- **Chargement unique** : `BrandLoader` est le seul écran de démarrage. Il est rendu à l'identique par le preloader natif (`index.html`), le `SplashScreen` et tous les fallbacks `LoadingScreen`/`Suspense`. Une seule animation : `.sc-boot-bar` (`sc-boot-bar-slide`, barre jaune en boucle). Le CSS critique est inline dans `index.html` pour un affichage avant même le bundle.
- **Pas de flash** : `main.tsx` attend deux frames avant de retirer le preloader ; `preloader.js` le supprime instantanément (le rendu React est identique). Les anciennes 7 animations du splash (halo, 6 rivets orbitaux, tracé, point, marque, barre) sont supprimées.
- **Responsivité** : `.h-screen`/`.min-h-screen` passent en `100dvh` (barre d'adresse mobile), `overflow-x` verrouillé sur `html/body/#root`, utilitaires `.safe-top/.safe-bottom/.safe-x` (encoches), `.app-container` / `.page-container` (largeurs de lecture), `.table-responsive`, `.break-anywhere`. En mode PWA/APK plein écran, les barres `sticky top-0` / `fixed top-0` reçoivent `env(safe-area-inset-top)`.
- **Accessibilité** : `prefers-reduced-motion` neutralise la barre et les transitions ; `text-wrap: balance/pretty` sur les titres et paragraphes.
- **Perf** : les polices Google ne sont plus importées depuis le CSS (bloquant) mais chargées via `preconnect` + `link` dans `index.html`.

### Impact produit / comportement visible
- Tous les écrans (vitrine, passager, chauffeur, admin) paraissent plus denses et plus pro : textes secondaires à 11–13 px, corps à 14 px, titres à 20–28 px.
- Démarrage : un seul écran bleu acier, un seul logo, une seule barre qui progresse — plus de spinner concurrent ni de splash de 3 s.
- Les anciens titres trop grands sur mobile (`text-6xl` = 60 px) passent à 40 px : plus de débordement.
- Boutons et champs à 44 px minimum : cibles tactiles conformes.

### Risques & rollback
- **Risque** : certaines pages très denses peuvent sembler plus compactes qu'avant ; les écrans qui misaient sur des tailles énormes perdent en emphase.
- **Rollback typographie** : supprimer le bloc `@theme` des tailles dans `styles/globals.css` (retour à l'échelle Tailwind d'origine) — le reste (loader, dvh) est indépendant.
- **Rollback chargement** : `git revert` du commit ; `SplashScreen` et `LoadingScreen` restent néanmoins compatibles avec l'ancien markup.

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`)
- [x] `npx vite build` — build OK, échelle CSS compilée vérifiée (`--text-6xl: 2.5rem`, `100dvh`, `sc-boot-bar-slide`)
- [x] Rendu vérifié en 390 px sur `/`, `/app/landing`, `/app/passenger`, `/app/driver`, `/services`, `/terms`, `/about`, `/contact` : `scrollWidth === clientWidth` partout (aucun débordement horizontal)
- [x] Corps de texte mesuré à 14 px, boutons à 44–48 px
- [x] Loader vérifié : une seule animation (`sc-boot-bar-slide`), fond dégradé et médaillon conformes

---

## 2026-10-30 — Interdiction d'annuler une course déjà commencée

- **Commit** : `590bae3` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : feat (règle métier) + fix (contournement possible)
- **Objectif** : une course démarrée (passager à bord) ne doit plus pouvoir être annulée, ni par le passager ni par le chauffeur. Seule la clôture (« Terminer la course ») ou le support peut mettre fin au trajet.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/RideInProgressScreen.tsx` | Suppression du bouton rouge **X**, de `handleCancelRide` et de l'appel `POST /rides/cancel` (−63 lignes) |
| `components/driver/NavigationScreen.tsx` | Bouton « ← Retour » masqué quand `phase === 'in_progress'` (placeholder `w-16` pour garder l'alignement du header) |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `POST /rides/cancel` : refus global si `status === 'in_progress'` **ou** `startedAt` présent, quel que soit `cancelledBy` |

### Description technique
- **Front passager** : l'écran « Course en cours » ne contient plus aucune action d'annulation. Restent : partage WhatsApp, appel/message chauffeur, signalement d'incident.
- **Front chauffeur** : pendant la phase `in_progress` de `NavigationScreen`, le header n'affiche plus le bouton retour ; le chauffeur reste sur l'écran jusqu'à l'étape 4 « Clôturer la course ». Les écrans `ActiveRideNavigationScreen` / `ActiveRideScreen*` n'avaient déjà aucun bouton d'annulation.
- **Backend (garantie réelle)** : l'ancien garde-fou ne bloquait que `cancelledBy === 'passenger'` et seulement sur `status === 'in_progress'`. Il est remplacé par :
  ```ts
  const started = ride.status === 'in_progress' || !!ride.startedAt;
  if (started) return c.json({ success: false,
    error: "Impossible d'annuler une course déjà commencée. Terminez la course ou contactez le support." }, 400);
  ```
  Couvre donc aussi les anciens APK qui affichent encore le bouton, et le cas d'une course annulée après démarrage mais dont le statut aurait été modifié.

### Impact produit / comportement visible
- **Passager** : plus de bouton d'annulation une fois la course lancée (pas de facturation surprise ni de trajet interrompu).
- **Chauffeur** : impossible de quitter/abandonner une course en cours depuis l'interface ; il doit la terminer.
- **Annulation toujours possible** avant démarrage : recherche de chauffeur, chauffeur en route / en approche.
- ⚠️ L'APK Android doit être reconstruit pour voir la disparition des boutons ; la protection serveur est active immédiatement pour toutes les versions.

### Risques & rollback
- **Risque** : en cas d'incident réel (accident, panne), le chauffeur ne peut plus sortir de l'écran ; le support doit clôturer/annuler côté admin.
- **Rollback** : `git revert 590bae3` (restaure bouton + ancienne condition backend).

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`)
- [x] Recherche globale : plus aucun appel `handleCancelRide` / bouton annulation dans les écrans de course
- [x] Déploiement automatique Vercel + Edge Function depuis `main`

---

## 2026-10-30 — Admin : bouton « Traiter » conditionné à l'acceptation du conducteur

- **Commit** : `4935328` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : fix (cohérence métier) + security (garde API)
- **Objectif** : dans **Réservations** (admin), une réservation ne peut être classée « Traitée » qu'après confirmation/acceptation explicite du conducteur. Avant, l'admin pouvait clôturer une réservation simplement proposée.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/admin/AdminScheduledRidesScreen.tsx` | `driverAccepted = ride.driver_status === 'accepted'` ; bouton `disabled={!driverAccepted}` + message d'attente sous le bouton ; garde dans `handleManualProcess` ; libellé de confirmation revu |
| `supabase/functions/make-server-2eb02e52/reservation-routes.ts` | `POST /:id/admin-status` : lecture de `id, driver_id, driver_status`, retour **409** si `status === 'completed'` et `driver_status !== 'accepted'` |

### Description technique
- **UI** : `Button` reçoit `disabled={!driverAccepted}` (le style désactivé vient de `disabled:opacity-50 disabled:pointer-events-none` de `components/ui/button.tsx`). Sous le bouton, un texte contextuel s'affiche :
  - `⏳ En attente d'acceptation du conducteur` si `driver_id` existe,
  - `⏳ Aucun conducteur assigné` sinon.
- **Double sécurité front** : `handleManualProcess` re-vérifie `ride.driver_status !== 'accepted'` et affiche un toast d'erreur (protège contre un état périmé dans la liste).
- **API** : la route charge la réservation via `sbAdmin()`, renvoie `404` si introuvable, puis `409` avec `driverStatus` dans le corps si la clôture est prématurée. L'**annulation** (`status: 'cancelled'`) reste totalement libre.
- Boutons déjà conditionnés et inchangés : « ▶ Créer maintenant » n'apparaît que si le conducteur a accepté ; « Attribuer / Ré-attribuer » crée une proposition à accepter côté chauffeur.

### Impact produit / comportement visible
- L'admin voit immédiatement si une réservation est bloquée en attente (bouton grisé + libellé).
- Le flux devient : attribution → notification chauffeur → acceptation → « Traiter » actif → réservation dans l'onglet **Traitées**.
- Un ancien client admin (cache) ne peut pas contourner la règle : le serveur refuse (409).

### Risques & rollback
- **Risque** : une réservation dont le conducteur n'accepte jamais reste non clôturable — volontaire ; l'admin peut toujours **annuler** ou ré-attribuer.
- **Rollback** : `git revert 4935328`.

### Tests / vérifications
- [x] `npx tsc --noEmit` — propre (hors `_headers`)
- [x] `grep` de contrôle : un seul point d'appel `admin-status` (écran admin) et un seul handler serveur
- [x] Vérifié : réservation « Proposée … en attente » ⇒ **Traiter** grisé ; après acceptation chauffeur ⇒ actif

---

## 2026-10-30 — Mise en pause de « SmartCabb Standard sans clim »

- **Commit** : `2af5fec` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : feat (simplification catalogue) — **réversible par flag**
- **Objectif** : ne plus exposer deux variantes Standard (avec/sans climatisation) côté passager, chauffeur et admin. Tout est ramené à une seule catégorie **SmartCabb Standard**, sans destruction de données.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/pricing-data.ts` | Ajout de `NO_CLIM_CATEGORY_ENABLED` (défaut `false`), `STANDARD_CATEGORY`, `NO_CLIM_CATEGORY`, `normalizeVehicleCategory()` |
| `components/passenger/EstimateScreen.tsx` | Carte Standard unique ; suppression du groupe dépliable clim / sans clim (−~100 lignes) |
| `components/driver/DriverRegistrationScreen.tsx` | Option « sans clim » retirée, question clim supprimée, une seule catégorie proposée |
| `lib/vehicle-helpers.ts` | Toutes les variantes Standard s'affichent « SmartCabb Standard » |
| `hooks/useSupabaseData.ts` | Catégorie du chauffeur normalisée au chargement |
| `components/admin/AdminRidesScreen.tsx`, `AssignDriverModal.tsx`, `DriverDetailModal.tsx` | Affichage/attribution alignés sur la catégorie unique |
| `components/passenger/AlternativeVehicleDialog.tsx`, `SearchingDriversScreen.tsx` | Libellés et filtres alignés |
| `supabase/functions/.../ride-routes.ts` | `normalizeCategory()` : `smart_standard`, `smart_standard_clim`, `smart_standard_no_clim` → même pool de matching / commission / crédit minimum |
| `supabase/functions/.../loyalty-routes.ts` | `FREE_TIERS.smart_standard` unique + `normalizeStandardVariant()` |

### Description technique
- **Principe** : aucune donnée n'est supprimée ni migrée. La normalisation se fait **à la lecture**, à deux endroits :
  - front : `normalizeVehicleCategory()` + normalisation du chauffeur dans `useSupabaseData` ;
  - back : `normalizeCategory()` (matching, commission, seuil de crédit) et `normalizeStandardVariant()` (fidélité).
- Les chauffeurs enregistrés avec `smart_standard_no_clim` continuent de fonctionner : ils sont traités comme des Standard et reçoivent les courses Standard.
- Le flag `NO_CLIM_CATEGORY_ENABLED = false` coupe l'affichage et l'inscription « sans clim » ; le passer à `true` réactive l'ancien comportement sans autre modification.
- **Conséquence tarifaire assumée** : les ex-« sans clim » facturent désormais au tarif Standard horaire (6 $/h jour, 10 $/h nuit, minimum 1 h ≈ 16 800 CDF) et non plus 505 CFC/km.

### Impact produit / comportement visible
- **Passager** : une seule carte « SmartCabb Standard » à l'estimation, plus de choix clim.
- **Chauffeur** : inscription simplifiée (plus de question clim) ; catégorie affichée « SmartCabb Standard ».
- **Admin** : une seule catégorie dans les filtres et l'attribution manuelle.
- **Backend** : un seul pool de matching Standard, commission et fidélité unifiées.

### Risques & rollback
- **Risque** : baisse de revenu pour les chauffeurs anciennement « sans clim » (passage du kilométrique à l'horaire) ; à surveiller côté support.
- **Rollback** : repasser `NO_CLIM_CATEGORY_ENABLED = true` dans `lib/pricing-data.ts` (les données n'ayant jamais été modifiées, l'ancien catalogue réapparaît). Revert complet possible via `git revert 2af5fec`.

### Tests / vérifications
- [x] `npx tsc --noEmit` — propre (hors `_headers`)
- [x] Vérifié : estimation passager, inscription chauffeur, attribution admin, matching backend
- [x] Chauffeurs existants « sans clim » toujours visibles et éligibles aux courses Standard

---

## 2026-10-28 — Rate limit : global désactivé par défaut, limiteur auth par IP + identifiant

- **Commit** : `2f573f4` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : fix (faux positifs en production)
- **Objectif** : des utilisateurs légitimes étaient bloqués (IP partagées / CGNAT, réseaux mobiles congolais), et le parcours chauffeur n'envoyait pas encore le code de confirmation exigé au démarrage.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/lib/rate-limit.ts` | Limite globale par IP **désactivée par défaut** ; limiteur d'authentification re-clé sur `IP + identifiant` ; seuils pilotés par variables d'environnement, comportement *fail-open* |

### Description technique
- Le compteur global « une IP = N requêtes » est coupé par défaut (n'était plus pertinent derrière du CGNAT : des dizaines d'abonnés partagent la même IP publique).
- Le limiteur d'authentification compte désormais par couple **IP + identifiant** (`email` / téléphone), ce qui protège toujours contre le bruteforce ciblé sans pénaliser les voisins de NAT.
- Les seuils sont lus depuis l'environnement ; en cas d'erreur du limiteur, la requête passe (*fail-open*) pour ne jamais bloquer un utilisateur à cause d'un incident interne.
- En complément, le contrôle du code de confirmation au démarrage est neutralisé par défaut via un flag (`RIDE_CONFIRMATION_CODE_REQUIRED` / `REQUIRE_CONFIRMATION_CODE`), réactivable par secret sans redéploiement.

### Impact produit / comportement visible
- Plus de blocages « trop de requêtes » injustifiés pour les utilisateurs sur réseau mobile partagé.
- La protection anti-bruteforce sur le login reste active, mais ciblée par compte.

### Risques & rollback
- **Risque** : sans limite globale, une attaque volumétrique simple n'est plus filtrée au niveau IP (mitigation à prévoir côté Supabase/edge si nécessaire).
- **Rollback** : réactiver le seuil global via les variables d'environnement de l'Edge Function, ou `git revert 2f573f4`.

### Tests / vérifications
- [x] `npx tsc --noEmit` — propre (hors `_headers`)
- [x] Connexions répétées depuis une même IP avec des comptes différents : plus de blocage
- [x] Tentatives répétées sur un même compte : toujours limitées

---

## 2026-10-28 — Code de confirmation au démarrage neutralisé par défaut

- **Commit** : `79b2d26` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : fix (déblocage du démarrage de course)
- **Objectif** : les chauffeurs ne pouvaient plus démarrer une course car le front n'envoyait pas encore le code de confirmation, alors que le backend l'exigeait.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Exigence du code de confirmation conditionnée à un flag (`RIDE_CONFIRMATION_CODE_REQUIRED`), désactivé par défaut |

### Description technique
- La vérification du `confirmationCode` au moment de passer la course en `in_progress` n'est plus systématique : elle est pilotée par un flag d'environnement dont la valeur par défaut est `false`.
- Le code de vérification reste présent dans le backend : il suffira de définir le secret à `true` lorsque le parcours chauffeur enverra effectivement le code, sans redéploiement.

### Impact produit / comportement visible
- Le chauffeur peut démarrer la course normalement, sans étape de code.
- La fonctionnalité peut être réactivée plus tard sans toucher au code.

### Risques & rollback
- **Risque** : la double validation passager/chauffeur au démarrage est temporairement absente (démarrage non confirmé par le passager).
- **Rollback / activation** : définir `RIDE_CONFIRMATION_CODE_REQUIRED=true` dans les secrets Supabase (Edge Functions) ; ou `git revert 79b2d26`.

### Tests / vérifications
- [x] `npx tsc --noEmit` — propre (hors `_headers`)
- [x] Démarrage de course testé sans code : succès
- [x] Flag à `true` : comportement d'origine restauré (test de non-régression)

---

## Historique antérieur

Les modifications antérieures à cette date ne sont pas encore consignées ici. Elles restent consultables via :

```bash
git log --oneline            # historique complet
git show <hash> --stat       # détail d'un commit
```

Les audits et rapports existants se trouvent dans `docs/` et à la racine du dépôt (`RAPPORT_*.md`, `AUDIT-*.md`, `FIX-*.md`).
