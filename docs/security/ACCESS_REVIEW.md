# Revue des accès — SmartCabb

> Répond aux contrôles **CIS 5 et 6** (gestion des comptes et des accès).
> À refaire **tous les 3 mois** (ou immédiatement après un départ / incident).

## 1. Comptes applicatifs (Supabase Auth)

| Compte | Rôle | MFA | Dernière connexion | Décision |
|---|---|---|---|---|
| `georgeorlyissa@gmail.com` | admin | ✅ 2FA email | à vérifier dans Supabase → Authentication | conserver |
| — | — | — | — | — |

> Au 26/11/2026 : **un seul administrateur**. Un second compte admin obsolète
> (`hmapela8@gmail.com`) a été supprimé. Risque assumé : si l'unique compte est
> perdu, utiliser `POST /admin/reset-admin-account` avec `ADMIN_RESET_PASSWORD`.

## 2. Accès aux plateformes

| Plateforme | Personnes ayant accès | MFA | À vérifier |
|---|---|---|---|
| Supabase (projet `zaerjqchzqmcxqblkfkg`) | propriétaire du projet | ⬜ à activer | membres de l'organisation, clés API |
| Vercel (projet `smartcabb-v2`) | propriétaire du projet | ✅ | membres de l'équipe, tokens |
| GitHub (`smartcabb_v2`) | propriétaire du dépôt | ✅ | collaborateurs, clés de déploiement |
| Google Play Console | propriétaire du compte | ✅ | utilisateurs, clés d'upload |
| Gmail (SMTP) | propriétaire de la boîte | ⬜ à vérifier | mots de passe d'application actifs |

## 3. Procédure d'ajout d'un accès

1. Créer un compte **nominatif** (jamais un compte partagé).
2. Attribuer le **rôle minimal** nécessaire.
3. Activer la **2FA** avant le premier usage.
4. Noter l'ajout dans ce tableau (date, qui, pourquoi).
5. Si l'accès donne la main sur l'administration : créer un second facteur et informer l'administrateur.

## 4. Procédure de retrait

1. Désactiver la session (Supabase → *Revoke sessions*), puis supprimer le compte.
2. Retirer l'accès aux plateformes (Supabase, Vercel, GitHub, Play, Gmail).
3. Faire tourner les secrets partagés si la personne les a connus
   (`ADMIN_CREATION_SECRET`, `CRON_SECRET`, `ADMIN_RESET_PASSWORD`, `SMTP_PASSWORD`).
4. Consigner le retrait dans ce tableau et dans le journal technique.

## 5. Historique des revues

| Date | Revu par | Comptes admin | Anomalies | Action |
|---|---|---|---|---|
| 2026-11-26 | agent OpenCode | 1 (`georgeorlyissa@gmail.com`) | compte `hmapela8@gmail.com` obsolète | supprimé |
|  |  |  |  |  |

## 6. Points de vigilance

- **Un seul admin** = disponibilité menacée : prévoir la procédure de secours (documentée).
- Les comptes Supabase/Vercel/Play **doivent** avoir la 2FA : à activer manuellement.
- Aucun mot de passe ne doit être stocké dans le dépôt ni dans un fichier partagé
  (utiliser un gestionnaire de mots de passe).
