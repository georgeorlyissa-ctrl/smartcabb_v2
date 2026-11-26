# Politique de journalisation — SmartCabb

> **But** : répondre au contrôle **CIS 8 (Audit Log Management)**, safeguard **8.1**
> — définir ce qui est journalisé, où, combien de temps, qui peut lire, et à
> quelle fréquence on relit.
>
> Dernière révision : 26 novembre 2026 · Responsable : administrateur SmartCabb.

## 1. Ce qui est journalisé

| Source | Contenu | Où | Qui peut lire |
|---|---|---|---|
| **Journal d'audit applicatif** (`audit_logs`) | actions sensibles côté serveur : sauvegarde, test de restauration, modification de config, modification de solde chauffeur, test d'alerte | table Supabase `audit_logs` | admins uniquement (RLS + rôle JWT) |
| **Logs Edge Functions** | requêtes, erreurs 5xx, erreurs métier, messages techniques | Supabase → Functions → Logs | membres du projet Supabase |
| **Logs Vercel** | builds, erreurs de déploiement, requêtes edge | Vercel → Deployments / Logs | membres de l'équipe Vercel |
| **Logs d'authentification** | connexions, OTP, erreurs de mot de passe | Supabase → Authentication → Logs | membres du projet Supabase |
| **Alertes email** | échec backup, 5xx, restauration ratée | boîte `ADMIN_ALERT_EMAIL` (sinon compte admin) | administrateur |

## 2. Ce qui ne doit JAMAIS être journalisé

- mots de passe, jetons d'accès, codes OTP, clés API ;
- numéros de carte, identifiants Mobile Money complets ;
- contenu intégral d'une conversation ou d'une photo ;
- données de localisation précises d'un utilisateur dans `details`.

Règle : `details` d'une entrée d'audit = **identifiants, quantités, résultats**, jamais de PII brute.

## 3. Conservation

| Donnée | Durée | Mécanisme |
|---|---|---|
| `audit_logs` | **90 jours** | purge automatique à chaque sauvegarde quotidienne (`AUDIT_LOG_RETENTION_DAYS`, défaut 90) |
| Sauvegardes (bucket `backups`) | 30 jours | `BACKUP_RETENTION_DAYS` |
| Logs Edge Functions / Vercel | selon l'offre (souvent 1 à 7 jours) | à vérifier dans les dashboards ; exporter si un incident doit être instruit |
| Événements de configuration (`event:*` dans le KV) | inclus dans les sauvegardes | — |

> Si un incident nécessite une conservation plus longue : **exporter** les logs concernés
> (Vercel / Supabase → téléchargement) et les joindre au dossier d'incident avant la purge.

## 4. Revue mensuelle (15 minutes)

À faire le **1er de chaque mois** (ou après tout incident). Étapes :

1. Panneau admin → **Journal d'audit** : vérifier que les actions récentes sont bien présentes
   (sauvegardes, tests de restauration, changements de config).
2. Panneau admin → **Sauvegardes → Santé du système** : statut 🟢, dernier backup < 26 h,
   dernier test de restauration réussi (< 30 j).
3. Supabase → Functions → Logs : filtrer sur `error` / `401` / `403` / `429`, repérer les pics anormaux.
4. Vercel → Deployments : aucun build en échec non expliqué.
5. Supabase → Authentication : tentatives de connexion échouées inhabituelles, comptes inattendus.
6. Noter la revue dans le tableau ci-dessous **et** dans `docs/CHANGELOG_TECHNIQUE.md`
   si une anomalie a été corrigée.

### Journal des revues

| Date | Revu par | Anomalies constatées | Action |
|---|---|---|---|
| 2026-11-26 | agent OpenCode (mise en place) | Aucun journal d'audit écrit auparavant : table vide | Journalisation serveur ajoutée + purge 90 j |
|  |  |  |  |

## 5. Que faire si un log manque

- Vérifier que l'action passe bien par l'Edge Function (les actions purement côté client ne sont pas tracées).
- Vérifier `audit_logs` (insertion) et les logs Supabase pour l'erreur `[AUDIT]`.
- Ne jamais « compenser » en écrivant une entrée manuelle non vérifiée.

## 6. Références

- CIS Critical Security Controls v8.1 — contrôle **8** (8.1, 8.2, 8.10, 8.11, 8.12).
- `docs/security/INCIDENT_CARD.md` — que faire en cas d'incident.
- `docs/security/CIS_IG1_CHECKLIST.md` — état des contrôles IG1.
