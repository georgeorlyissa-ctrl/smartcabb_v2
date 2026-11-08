# Intégration EJ SMS (EJSARL) — SmartCabb

> **Fournisseur** : EJ SMS v1.0 (EJSARL) — <https://api.ejsarl.cd>
> **Authentification** : OAuth 2.0 `client_credentials`, realm `ej-sms`
> **Remplace** : Africa's Talking (SMS + WhatsApp) et Twilio
> **Dernière mise à jour** : 2026-11-07

---

## 1. Vue d'ensemble

EJ SMS est le **fournisseur SMS unique** de SmartCabb :

| Usage | Avant | Après |
|---|---|---|
| OTP (inscription, reset, login) | WhatsApp AT puis fallback SMS AT | **SMS EJ SMS** |
| Confirmation de réservation | WhatsApp AT puis fallback SMS AT | **SMS EJ SMS** |
| Notifications / SMS admin | Africa's Talking | **EJ SMS** |
| Canal WhatsApp | Africa's Talking WhatsApp API | **Supprimé** du code |

Le module serveur est `supabase/functions/make-server-2eb02e52/ej-sms-core.ts`.
Il est autonome (dépend seulement de `kv-wrapper.ts`) et ne contient aucun secret.

---

## 2. Secrets Supabase (Edge Functions → Secrets)

Aucune valeur ne doit être commitée. Seuls ces noms sont lus par le code :

| Secret | Obligatoire | Description |
|---|---|---|
| `EJSMS_CLIENT_ID` | ✅ | Client ID du panel EJ SMS (`ejsms-<entrepriseId>`) |
| `EJSMS_CLIENT_SECRET` | ✅ | Client Secret (affiché une seule fois) |
| `EJSMS_SENDER` | ✅ | Sender ID validé — `SMARTCABB` |
| `EJSMS_WEBHOOK_SECRET` | ✅ (DLR) | Secret de signature des callbacks (`whsec_…`) |
| `EJSMS_SCOPE` | ❌ | Défaut : `sms:send sms:read` |
| `EJSMS_TOKEN_URL` | ❌ | Défaut : `https://auth.ejsarl.cd/realms/ej-sms/protocol/openid-connect/token` |
| `EJSMS_API_BASE` | ❌ | Défaut : `https://api.ejsarl.cd` |
| `EJSMS_CALLBACK_URL` | ❌ | Défaut : `<SUPABASE_URL>/functions/v1/make-server-2eb02e52/sms/dlr` |

> Les anciens secrets `AFRICAS_TALKING_*` ne sont plus utilisés : ils peuvent être supprimés du projet Supabase.

---

## 3. Authentification OAuth 2.0

```
POST https://auth.ejsarl.cd/realms/ej-sms/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=<EJSMS_CLIENT_ID>
&client_secret=<EJSMS_CLIENT_SECRET>
&scope=sms:send sms:read
```

- Le jeton vit **300 s** ; il est renouvelé à **90 %** de sa durée.
- Cache **mémoire** puis **KV** (`ejsms_token_cache`) pour partager entre isolates.
- Un `401` déclenche **un seul** retry avec un jeton neuf.
- Aucun log ne contient le secret ni le jeton complet.

---

## 4. Envoi d'un SMS

```
POST https://api.ejsarl.cd/sms/send
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "sender": "SMARTCABB",
  "message": "SmartCabb : votre code est 123456",
  "msisdn": "2438XXXXXXXX",
  "callbackUrl": "https://<projet>.supabase.co/functions/v1/make-server-2eb02e52/sms/dlr"
}
```

Réponse : `{ "reference": "…", "statut": "PENDING", "message": "…" }`

**Format du numéro** : EJ SMS attend `243XXXXXXXXX` **sans `+`**.

- Format interne SmartCabb (base, UI, API) : `+243XXXXXXXXX`.
- Conversion centralisée dans `toMsisdn()` (`ej-sms-core.ts`) :
  - `+243XXXXXXXXX` → `243XXXXXXXXX`
  - `243XXXXXXXXX` → inchangé
  - `00243XXXXXXXXX` → `243XXXXXXXXX`
  - `0XXXXXXXXX` → `243XXXXXXXXX`
  - `XXXXXXXXX` (9 chiffres) → `243XXXXXXXXX`

Le crédit n'est consommé qu'à l'envoi effectif. `sendEjSms()` renvoie
`{ ok, reference, statut, error }` et ne lève jamais d'exception.

---

## 5. Solde de crédits

```
GET https://api.ejsarl.cd/sms/credits/balance
Authorization: Bearer <access_token>
```

Réponse : `{ entrepriseId, solde, statut, dateUpdate }`

- `getEjSmsBalance()` normalise en `{ ok, credits, statut, dateUpdate }`.
- **1 crédit = 1 segment SMS** (160 caractères GSM-7).
- Le solde est visible dans le panel EJ SMS **et** via `GET /sms/balance` / `GET /admin/sms/balance`.

---

## 6. Accusés de réception (DLR) signés

EJ SMS appelle l'URL `callbackUrl` avec :

| En-tête | Contenu |
|---|---|
| `X-EJSms-Signature` | HMAC-SHA512 **hexadécimal du corps brut** |
| `X-EJSms-Event` | `sms.delivered`, `sms.failed`, … |

Traitement dans `POST /sms/dlr` (`sms-routes.ts`) :

1. Lecture du **corps brut** (`c.req.text()`) — jamais du JSON re-sérialisé.
2. `verifyEjSmsSignature(rawBody, header)` : Web Crypto HMAC-SHA512 + comparaison en temps constant.
3. Signature invalide ou secret absent → **401**, aucun traitement.
4. Signature valide :
   - mise à jour de `sms_log:<reference>` (`status`, `delivered_at`, `dlr`) en conservant les autres champs ;
   - si aucun log local : écriture d'audit `sms_dlr:<reference>`.
5. Réponse **200 en moins de 10 s** (sinon EJ SMS réessaie).

Statuts internes normalisés : `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `CANCELLED`, `SCHEDULED`.

---

## 7. Endpoints SmartCabb

Montés sous `/functions/v1/make-server-2eb02e52` :

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/sms/config` | `{ provider: "ejsms", enabled, configured, diagnostics }` — `configured` indique seulement la présence des identifiants ; `diagnostics` expose des booléens/longueurs (jamais les valeurs) pour détecter un ID mal collé |
| `POST` | `/sms/send` | Envoi unitaire `{ to \| phoneNumber, message, type }` |
| `GET` | `/sms/balance` | Solde de crédits EJ SMS |
| `GET` | `/sms/logs` | 100 derniers logs `sms_log:*` (admin) |
| `POST` | `/sms/test` | SMS de test admin `{ phoneNumber, message? }` |
| `POST` | `/sms/dlr` | Webhook DLR signé |
| `GET` | `/admin/sms/balance` | Solde + statistiques d'usage (dashboard admin, **JWT admin**) |

### Sécurité des routes

L'Edge Function est déployée avec `verify_jwt = false`, donc chaque route vérifie elle-même l'appelant :

| Route | Accès |
|---|---|
| `GET /sms/config` | anon key **ou** utilisateur connecté ; `diagnostics` réservé à l'admin |
| `POST /sms/send` | anon key **ou** utilisateur connecté + limite 30 envois/10 min par IP et 3/10 min par destinataire, message ≤ 480 caractères |
| `GET /sms/balance`, `GET /sms/logs`, `POST /sms/test` | **JWT de session admin** (`user_metadata.role` ou `app_metadata.role = "admin"`) |
| `GET /admin/sms/balance` | **JWT de session admin** |
| `POST /sms/dlr` | signature HMAC-SHA512 obligatoire (`X-EJSms-Signature`) |
| `POST /otp/send`, `POST /otp/verify` | anon key **ou** utilisateur connecté + limite 10 demandes/10 min par IP |
| `POST /reservations/:id/notify-accept` | anon key **ou** utilisateur connecté |

> Les limites de débit sont stockées en mémoire d'isolate : elles bloquent les rafales et les scripts, sans constituer un quota distribué parfait.

### SMS d'urgence (SOS)

`POST /emergency/sos` peut notifier l'équipe sécurité par SMS, uniquement si
`emergencySmsEnabled = true` **et** `emergencyNumbers.support` est renseigné
(Admin → Paramètres globaux → Urgences). L'alerte est enregistrée en base dans
tous les cas ; un échec SMS (crédits épuisés, numéro invalide) n'empêche pas
la création de l'alerte. Détail du dispositif : `docs/EMERGENCY_SOS.md`.

Chaque envoi écrit `sms_log:<id ou reference>` :

```json
{
  "id": "…", "phone_number": "+243…", "to": "+243…",
  "message": "…", "type": "otp|reservation|test|generic",
  "status": "PENDING|SENT|DELIVERED|FAILED",
  "success": true, "reference": "…", "sent_at": "…",
  "provider": "ejsms"
}
```

---

## 8. Fichiers concernés

| Fichier | Rôle |
|---|---|
| `supabase/functions/make-server-2eb02e52/ej-sms-core.ts` | Client EJ SMS (token, envoi, solde, signature, `toMsisdn`) |
| `supabase/functions/make-server-2eb02e52/sms-routes.ts` | Routes `/sms/*` + webhook DLR |
| `supabase/functions/make-server-2eb02e52/otp-core.ts` / `otp-routes.ts` | OTP par SMS uniquement |
| `supabase/functions/make-server-2eb02e52/reservation-routes.ts` | Confirmation de réservation par SMS |
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | `/sms/balance` (crédits + usage), `smsProvider: "ejsms"` |
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | `smsProvider: "ejsms"` par défaut |
| `supabase/functions/make-server-2eb02e52/phone-utils.ts` | Format canonique `+243…` (conversion EJ SMS dans le core) |
| `components/admin/SMSSettingsScreen.tsx` | Paramètres SMS + instructions EJ SMS |
| `components/admin/SMSInsufficientBalanceBanner.tsx` | Alerte solde (lien panel EJ SMS) |
| `components/admin/TestSMSConfigScreen.tsx` | Diagnostic `/sms/config` |
| `lib/sms-service.ts`, `lib/config-sync.ts`, `hooks/useSettings.ts` | Type/provider `ejsms` côté client |

---

## 9. Paramétrage du webhook

1. Panel EJ SMS → section API / Webhooks.
2. URL : `https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/sms/dlr`
3. Copier le **Webhook Secret** dans `EJSMS_WEBHOOK_SECRET` (Supabase).
4. L'Edge Function est déployée avec `verify_jwt = false` : le webhook est joignable sans JWT, mais protégé par la signature HMAC.

> La même URL peut être passée par requête via `callbackUrl` ; `EJSMS_CALLBACK_URL` permet de la surcharger sans redéployer.

---

## 10. Déploiement

```powershell
supabase functions deploy make-server-2eb02e52 --project-ref zaerjqchzqmcxqblkfkg
```

Puis vérifier :

```powershell
# Configuration (identifiants présents ?)
curl "https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/sms/config"

# SMS de test administrateur
curl -X POST "https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/sms/test" `
  -H "Content-Type: application/json" `
  -d '{"phoneNumber":"+243XXXXXXXXX"}'
```

---

## 11. Diagnostic

| Symptôme | Cause probable | Action |
|---|---|---|
| `SMS non configuré côté serveur (EJ SMS)` | Secrets absents | Créer `EJSMS_CLIENT_ID` / `EJSMS_CLIENT_SECRET` |
| `401` au token | Identifiants invalides ou realm incorrect | Vérifier les API Credentials EJ SMS |
| `Numéro invalide (attendu 243XXXXXXXXX)` | Numéro non RDC / mal formé | Utiliser `+243…` dans l'app |
| `Solde EJ SMS indisponible` | Token OK mais API KO ou scope manquant | Vérifier `sms:read` |
| `Aucun solde SMS` (HTTP 404) | **Aucun pack de crédits acheté** sur le compte | Acheter des crédits dans le panel EJ SMS ; vérifier avec `GET /sms/credits/movements` (doit renvoyer une liste non vide) |
| DLR toujours `PENDING` | `callbackUrl` non atteignable | Vérifier l'URL publique et `verify_jwt = false` |
| Webhook `401 Signature invalide` | `EJSMS_WEBHOOK_SECRET` absent/incorrect | Recopier le secret du panel EJ SMS |
| SMS non reçus malgré `PENDING` | Sender non validé ou absence de crédits | Vérifier `SMARTCABB` et le solde |

---

## 12. Limites connues

- Pas de fallback multi-fournisseur : EJ SMS est l'unique canal (décision produit).
- Pas d'envoi programmé ni de bulk utilisé par SmartCabb (l'API le permet).
- La longueur du message n'est pas tronquée automatiquement : au-delà de 160 caractères GSM-7, le SMS est facturé en plusieurs crédits.
