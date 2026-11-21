# Sauvegardes SmartCabb

> Dernière mise à jour : 2026-11-21

## 1. Ce qui est sauvegardé

Chaque backup est un fichier **JSON compressé (`.json.gz`)** contenant :

| Donnée | Détail |
|---|---|
| `kv_store_2eb02e52` | profils, chauffeurs, courses, configuration, notifications, soldes, etc. |
| `scheduled_rides` | réservations programmées |
| `emergency_alerts` | alertes SOS |
| `auth_users` | comptes (id, email, téléphone, métadonnées) — **sans mots de passe** |
| `avatars` | photos du bucket `avatars`, encodées en base64 (plafond `BACKUP_MAX_AVATAR_MB`, 20 Mo par défaut) |

Les mots de passe et jetons d'authentification ne sont **jamais** exportés.

## 2. Sauvegarde automatique

- **Quand** : tous les jours à **02:00 heure de Kinshasa** (01:00 UTC).
- **Où** : bucket Storage privé `backups`.
- **Nom** : `smartcabb-backup-AAAA-MM-JJTHH-MM-SS-mmmZ.json.gz`.
- **Rétention** : 30 jours par défaut (`BACKUP_RETENTION_DAYS`).
- **Déclencheur** : pg_cron → `POST /backups/run` avec l'en-tête `x-cron-secret`.

### Installation du cron (une seule fois)

Exécuter `supabase/setup-backups-cron.sql` dans **Supabase → SQL Editor**.
Vérifier ensuite :

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job WHERE jobname = 'smartcabb-daily-backup';
```

## 3. Sauvegarde manuelle

Admin → **Sauvegardes** → **Créer un backup maintenant**.

Ou en ligne de commande :

```powershell
$api = "https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52"
Invoke-RestMethod -Method Post -Uri "$api/backups/run" `
  -Headers @{ "x-cron-secret" = "smartcabb-cron-2026" } `
  -ContentType "application/json" -Body "{}"
```

## 4. Copie hors site (recommandée)

Un backup stocké dans Supabase ne protège pas contre la perte totale du projet.
Télécharger régulièrement le dernier fichier sur le PC / OneDrive :

```powershell
powershell -ExecutionPolicy Bypass -File scripts\download-latest-backup.ps1
```

Planifier ce script une fois par semaine via le **Planificateur de tâches Windows**
(ou le lancer manuellement chaque vendredi). Le fichier arrive dans
`%USERPROFILE%\OneDrive\SmartCabb-Backups`.

## 5. Restauration

### 5.1 Restaurer les tables et les photos

```powershell
$env:SUPABASE_URL="https://zaerjqchzqmcxqblkfkg.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<clé service_role>"

# Simulation (aucune écriture)
node scripts\restore-backup.mjs "C:\chemin\smartcabb-backup-....json.gz"

# Application réelle
node scripts\restore-backup.mjs "C:\chemin\smartcabb-backup-....json.gz" --apply
```

Le script :
- remet à jour `kv_store_2eb02e52` (clé `key`),
- remet à jour `scheduled_rides` et `emergency_alerts` (clé `id`),
- recharge les photos dans le bucket `avatars`.

### 5.2 Restaurer les comptes (`auth.users`)

Les mots de passe ne sont pas sauvegardés. Deux options :

1. **Supabase Dashboard → Authentication → Users** : recréer les comptes manquants,
   puis demander aux utilisateurs de réinitialiser leur mot de passe.
2. Utiliser l'API Admin (`supabase.auth.admin.createUser`) avec
   `email_confirm: true` et un mot de passe aléatoire, puis envoyer un lien de
   réinitialisation.

Le fichier de backup contient la liste complète des comptes (id, email, téléphone)
pour savoir qui recréer.

### 5.3 Vérifier après restauration

- Admin → Sauvegardes : le backup est listé et téléchargeable.
- Admin → Utilisateurs / Conducteurs / Réservations : les données sont présentes.
- Une course de test peut être créée.

## 6. Supabase Pro (protection complémentaire)

Pour une vraie restauration « disaster recovery » (erreur humaine, corruption,
suppression accidentelle), activer le plan **Pro** :

1. Dashboard Supabase → **Settings → Billing** → passer au plan Pro.
2. **Database → Backups** : sauvegardes quotidiennes conservées 7 jours.
3. Option **Point-in-Time Recovery (PITR)** : restauration à la minute.

Les backups Pro couvrent la base complète (toutes les tables, y compris `auth`).
Ils ne remplacent pas la copie hors site : un backup dans le même compte ne
survit pas à la perte du compte.

## 7. Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `BACKUP_RETENTION_DAYS` | `30` | Nombre de jours de conservation |
| `BACKUP_MAX_AVATAR_MB` | `20` | Taille maximale des photos incluses (base64) |
| `CRON_SECRET` | `smartcabb-cron-2026` | Secret du cron (en-tête `x-cron-secret`) |

À configurer dans **Supabase → Settings → Edge Functions → Secrets**.

## 8. Sécurité

- Le bucket `backups` est **privé** ; l'accès se fait par URL signée (10 minutes).
- `POST /backups/run`, `GET /backups/list`, `GET /backups/latest` et
  `GET /backups/download/:name` acceptent le secret cron **ou** un jeton de
  session dont le rôle est `admin`.
- `DELETE /backups/:name` exige une session **admin**.
- Le secret cron historique est présent dans le dépôt : le faire tourner
  (nouveau `CRON_SECRET`) avant une mise en production publique, puis mettre à
  jour le SQL du cron et le script hors site.

## 9. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Non autorisé` | secret cron absent/faux, ou session non admin | vérifier `x-cron-secret` / se reconnecter en admin |
| `Bucket backups: ...` | droits service_role indisponibles | vérifier les secrets de l'Edge Function |
| Backup vide | tables réellement vides | vérifier `kv_store_2eb02e52` |
| Cron inactif | SQL non exécuté | relancer `setup-backups-cron.sql` |
| Fichier trop gros | photos nombreuses | réduire `BACKUP_MAX_AVATAR_MB` ou archiver les anciennes photos |
