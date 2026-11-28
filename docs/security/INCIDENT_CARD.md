# Fiche incident — SmartCabb

> **1 page, à imprimer ou garder ouverte sur le téléphone.** En cas d'incident, on lit ça et on exécute, on n'improvise pas.
> Dernière mise à jour : 26 novembre 2026.
>
> **Procédure complète** : `PROCEDURE_INCIDENTS_ISO_27035.md` (qualification,
> rôles, preuves, notification, post-mortem). Cette fiche reste le réflexe
> terrain des 15 premières minutes.

## 1. Réflexes des 15 premières minutes

1. **Respirer.** Ne rien supprimer, ne rien « réparer » avant d'avoir noté l'heure et ce qui est constaté.
2. **Noter** : heure, ce qui ne marche pas, qui est impacté (passagers / chauffeurs / paiement / admin), message d'erreur exact.
3. **Vérifier l'ampleur** :
   - `https://www.smartcabb.com/` répond ?
   - `Panneau admin → Sauvegardes → Santé du système` (statut, dernier backup, alertes).
   - Supabase Dashboard → Logs → Edge Functions (erreurs 5xx).
4. **Prévenir** : `ADMIN_ALERT_EMAIL` (sinon l'email admin) reçoit déjà les alertes automatiques. Si l'incident dure > 15 min, prévenir le chauffeur/partenaire concerné par téléphone.

## 2. Site ou application inaccessible

| Étape | Action |
|---|---|
| 1 | Vercel Dashboard → Deployments : le dernier déploiement est-il en **Error** ? |
| 2 | Si oui : onglet *Building* → lire l'erreur. Correctif rapide = `git revert <commit>` + push. |
| 3 | Si le dernier déploiement est vert : Supabase Dashboard → Edge Functions → logs. |
| 4 | Redéployer l'API : `npx supabase functions deploy make-server-2eb02e52 --project-ref zaerjqchzqmcxqblkfkg` |
| 5 | Vérifier : `GET /make-server-2eb02e52/config/get` doit répondre `200`. |

## 3. Perte ou corruption de données

| Étape | Action |
|---|---|
| 1 | **Ne rien écrire** dans la base tant que le backup n'est pas vérifié. |
| 2 | Panneau admin → Sauvegardes → **Tester la restauration** (vérifie le dernier backup sans toucher aux données). |
| 3 | Si le test échoue : essayer le backup précédent (bouton *Télécharger*). |
| 4 | Restauration réelle : contacter Supabase (support) **ou** réinjecter le JSON du backup via le service role, table par table (`kv_store_2eb02e52`, `scheduled_rides`, `emergency_alerts`). |
| 5 | Prévenir les utilisateurs impactés (SMS/notification in-app) et noter ce qui a été restauré. |

> Les mots de passe ne sont **jamais** dans les backups : si les comptes auth sont perdus, les utilisateurs devront réinitialiser.

## 4. Suspicion de piratage / fuite

| Étape | Action |
|---|---|
| 1 | **Couper l'accès admin** : Supabase → Authentication → Users → compte admin → *Reset password* ; puis se reconnecter (2FA). |
| 2 | Révoquer les sessions : Supabase → Authentication → *Revoke all sessions* (ou supprimer/recréer l'utilisateur admin). |
| 3 | Vérifier `Audit Logs` (Supabase) + logs Edge Functions : quelles routes, à quelle heure, depuis quelle IP. |
| 4 | Faire tourner les secrets : `ADMIN_CREATION_SECRET`, `CRON_SECRET`, `ADMIN_RESET_PASSWORD`, `SMTP_PASSWORD`, clés EJ SMS / Ejpay. |
| 5 | Vérifier les soldes / transactions suspects, geler les retraits si nécessaire. |
| 6 | Si des données personnelles ont fuité : prévenir les personnes concernées et documenter (obligation de transparence). |

## 5. Ce qu'il ne faut jamais faire

- Supprimer un backup « pour faire de la place » avant d'avoir vérifié le suivant.
- Modifier la base à la main pendant un incident sans avoir noté l'état initial.
- Partager un mot de passe, un code 2FA ou le contenu d'un backup par WhatsApp.
- Redémarrer/redéployer en boucle sans lire les logs (on perd la cause).

## 6. Après l'incident (sous 72 h)

1. Écrire un **post-mortem court** : chronologie, cause racine, impact, ce qui a été fait.
2. Ajouter une **entrée au journal technique** (`docs/CHANGELOG_TECHNIQUE.md`).
3. Créer **au moins une action concrète** pour que ça ne se reproduise pas (test, alerte, garde-fou).
4. Vérifier que l'alerte email a bien été reçue ; sinon, corriger `SMTP_*` / `ADMIN_ALERT_EMAIL`.

## 7. Contacts et accès

| Ressource | Où |
|---|---|
| Panneau admin | `https://www.smartcabb.com/admin` (mot de passe + code email) |
| Supabase | `https://supabase.com/dashboard/project/zaerjqchzqmcxqblkfkg` |
| Vercel | `https://vercel.com/george-orly-issas-projects/smartcabb-v2` |
| Play Console | `https://play.google.com/console` |
| Support SmartCabb | `+243 960 624 008` · `admin@smartcabb.com` |
| Adresse officielle | 63, Avenue Colonel MONDJIBA, C/ Ngaliema, Kinshasa |

> Les secrets ne sont **jamais** écrits dans ce document. Ils vivent dans Supabase → Edge Functions → Secrets.
