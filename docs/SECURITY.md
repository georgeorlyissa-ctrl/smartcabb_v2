# Sécurité — SmartCabb

> Dernière revue : 25 novembre 2026.
> Périmètre : application web (`www.smartcabb.com`), Edge Function
> `make-server-2eb02e52`, base Supabase (PostgreSQL + Storage), application
> Android (WebView Capacitor).

## 1. Modèle de sécurité

- L'Edge Function est déployée avec `verify_jwt = false` : **le gateway Supabase
  ne vérifie aucun jeton**. Chaque route sensible doit donc contrôler
  elle-même l'appelant.
- La clé `anon` est publique (elle est dans le bundle web) : elle ne prouve
  **rien**. Toutes les routes sensibles la refusent explicitement.
- L'authentification des personnes passe par Supabase Auth (JWT). Le rôle
  applicatif (`passenger`, `driver`, `admin`) est porté par
  `user_metadata.role`.
- Les données métier vivent dans la table KV (`kv_store_2eb02e52`), accessible
  **uniquement** avec la clé `service_role` côté serveur.

### Gardes centralisées

`supabase/functions/make-server-2eb02e52/auth-guard.ts`

| Fonction | Usage |
|---|---|
| `requireUser` | session réelle, clé `anon` refusée |
| `requireAdmin` | session + rôle admin + session 2FA serveur (`x-admin-2fa`, 12 h) |
| `requireOwnerOrAdmin` | ressource appartenant à l'appelant |
| `requireAnyOwnerOrAdmin` | plusieurs propriétaires possibles (course : passager/chauffeur) |
| `optionalUser` | identité facultative (profil public assaini) |

Côté client, `lib/api-auth-interceptor.ts` remplace la clé `anon` par le JWT
de session et ajoute `x-admin-2fa` pour les routes `/admin/*`.

## 2. Contrôles en place

### Authentification & comptes
- Inscription passager : **OTP SMS obligatoire** avant création du compte
  (jeton à usage unique, 10 min, 5 tentatives).
- Connexion : rate limit 10 tentatives / 15 min (IP + identifiant).
- Suppression de compte par téléphone : jeton OTP obligatoire.
- Suppression par email (`/purge`, `/fix-emails`) : admin uniquement.
- Mot de passe admin : plus aucune valeur en dur ; réinitialisation via le
  secret `ADMIN_RESET_PASSWORD` uniquement.

### Administration
- Toutes les routes `/admin/*` exigent un JWT admin **et** une session 2FA
  serveur, sauf `/admin/2fa/send`, `/admin/2fa/verify` et
  `/admin/reset-admin-account` (secret propriétaire).
- La 2FA email est vérifiée côté serveur ; le jeton local n'est plus suffisant.

### Argent & courses
- Création, acceptation, démarrage, clôture, annulation, notation et transfert
  de course : participant concerné ou admin.
- `POST /drivers/:id/balance` : admin uniquement.
- Débit du portefeuille passager : propriétaire ou admin.
- Création de course : passager propriétaire, quota 10 / 15 min.
- Une course inexistante ne peut plus être « créée » implicitement à la clôture.
- Commission : 15 % course instantanée, 20 % réservation (voir journal).

### SMS / OTP / SOS
- `/sms/send` : session obligatoire, **destinataire = numéro du compte**
  (sauf admin), quotas 20/jour/utilisateur et 8/jour/destinataire.
- `/otp/send` : quotas distribués (KV) 5/h et 10/jour par numéro, 20/h par IP,
  + cooldown 60 s.
- `POST /emergency/sos` : session obligatoire, identité issue du JWT (plus
  d'usurpation par le corps), 3 alertes/10 min/utilisateur et 10/10 min/IP.

### Données personnelles
- `GET /drivers/:id` : profil minimal en public ; téléphone uniquement pendant
  une course active ; soldes/email/FCM réservés au propriétaire et aux admins.
- `GET /rides/:id` (lien de suivi public) : trajet/statut/position uniquement,
  sans téléphone ni paiement.
- `GET /rides/status/:id`, `/rides/pending/:driverId`, historiques et gains :
  participants ou admins.
- Journaux applicatifs : plus de payload complet (téléphone/adresses/photos).

### Base de données (RLS)
- `kv_store_2eb02e52` : RLS activé, **aucune policy** → refus par défaut
  (seul le service role serveur passe).
- `profiles` : lecture limitée à son propre profil ou aux admins.
- `settings` / `settings_2eb02e52` : lecture admin uniquement.
- `sms_logs` / `sms_logs_2eb02e52` : admin uniquement.
- `transactions` : propriétaire (ou admin en lecture).
- `vehicles` : aucune lecture publique.
- Storage : `avatars` et `backups` privés (URLs signées), `apk` public (aucun
  secret).

### Réseau
- CORS restreint aux origines de l'application (`smartcabb.com`, `*.cd`,
  localhost de développement, `capacitor://localhost`, previews Vercel).
- Erreurs serveur génériques avec `requestId` (pas de détail interne).
- En-têtes Vercel : HSTS, CSP, `X-Frame-Options: DENY`, `nosniff`,
  Permissions-Policy. `cdn.jsdelivr.net` retiré de la CSP.
- Webhooks Ejpay : signature HMAC-SHA512 + contrôle du montant.
- Webhook SMS (DLR) : signature EJ SMS vérifiée.

### Dépendances
- `npm audit` après correctifs : **0 critique**, 4 « high » résiduelles
  provenant de `@grpc/grpc-js` transitif de Firebase (utilisé côté Node/build,
  pas dans le bundle navigateur). Aucun correctif disponible sans attendre
  Firebase ; à surveiller.
- Firebase JS mis à niveau en 13.x (messaging/analytics à re-tester sur un
  appareil réel).

## 3. Risques résiduels connus

| Risque | Niveau | Mitigation / suite |
|---|---|---|
| Rate limit global par IP désactivé par défaut (CGNAT) | Moyen | Quotas ciblés par route ; activable via `RATE_LIMIT_GLOBAL_MAX` |
| Jeton 2FA admin stocké dans `localStorage` (XSS) | Moyen | CSP stricte, session serveur 12 h, expiration d'inactivité ; migration vers cookie `HttpOnly` à envisager |
| Dépendances Firebase/grpc | Faible | Node uniquement ; surveiller les versions |
| Vérification Google Maps API key | À vérifier | Restreindre la clé navigateur aux referrers `smartcabb.com` |
| Bucket `apk` public | Faible | Contient d'anciens APK (aucun secret) ; peut être rendu privé |
| Sauvegardes / PITR | — | PITR Supabase payant, à activer |

## 4. Procédures

### Rotation du mot de passe admin
1. Supabase Dashboard → Authentication → Users → compte admin → *Reset password*.
2. Se reconnecter au panneau admin (mot de passe + code 2FA).
3. Vérifier que les écrans admin chargent (stats, utilisateurs, paiements).

### Urgence : réinitialiser le compte admin
1. Définir le secret `ADMIN_RESET_PASSWORD` (≥ 12 caractères) dans
   Supabase → Edge Functions → Secrets.
2. `POST /make-server-2eb02e52/admin/reset-admin-account` avec l'en-tête
   `x-admin-secret: <ADMIN_CREATION_SECRET>`.
3. La réponse ne contient plus aucun identifiant.

### Vérifier les policies RLS
```sql
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

### Vérifier qu'aucune donnée n'est lisible avec la clé anon
```bash
curl -s "https://<project>.supabase.co/rest/v1/profiles?select=email,phone&limit=1" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
# doit renvoyer []
```

## 5. Checklist avant mise en production

- [ ] Mot de passe admin changé (jamais commité).
- [ ] `ADMIN_CREATION_SECRET` et `CRON_SECRET` définis et à jour.
- [ ] Secrets SMS/Ejpay/SMTP uniquement dans Supabase Secrets.
- [ ] `npm audit` relu après chaque mise à jour.
- [ ] Test réel : inscription OTP, course, réservation, paiement, SOS, admin.
- [ ] Clé Google Maps restreinte par referrer.
- [ ] Sauvegarde récente vérifiée.
