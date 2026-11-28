# Inventaire des actifs — SmartCabb

> Répond au contrôle **CIS 1** (inventaire des actifs) et sert de base à
> l'inventaire des sous-traitants (`SUBPROCESSORS.md`).
> Dernière mise à jour : 26 novembre 2026.

## 1. Actifs applicatifs

| Actif | Identifiant | Hébergement | Criticité |
|---|---|---|---|
| Application web (site + PWA) | `smartcabb.com`, `www.smartcabb.com` | Vercel — projet `smartcabb-v2` | 🔴 critique |
| API métier (Edge Function) | `make-server-2eb02e52` | Supabase — projet `zaerjqchzqmcxqblkfkg` | 🔴 critique |
| Base de données + KV métier | `kv_store_2eb02e52`, `profiles`, `rides`, `scheduled_rides`, `transactions`, `audit_logs` | Supabase (PostgreSQL) | 🔴 critique |
| Authentification | Supabase Auth (JWT, OTP SMS) | Supabase | 🔴 critique |
| Stockage fichiers | buckets `avatars` (privé), `backups` (privé), `apk` (public) | Supabase Storage | 🟠 élevée |
| Application Android | `com.smartcabb.app`, versionCode 12 / 1.9 | Play Console (AAB) | 🟠 élevée |
| Panneau admin | `/admin` (même application web) | Vercel | 🔴 critique |

## 2. Comptes et accès

| Accès | Détenteur | MFA | Notes |
|---|---|---|---|
| Compte admin SmartCabb | `georgeorlyissa@gmail.com` | ✅ 2FA email + session 12 h | **unique** administrateur |
| Organisation Supabase | propriétaire du projet | ✅ 2FA activée | — |
| Équipe Vercel | propriétaire du projet | ✅ 2FA activée | — |
| Play Console | propriétaire du compte développeur | ✅ 2FA activée | — |
| Dépôt GitHub | `georgeorlyissa-ctrl/smartcabb_v2` | ✅ 2FA activée | — |

## 3. Prestataires techniques

| Prestataire | Usage | Données transmises |
|---|---|---|
| Supabase | base, auth, stockage, fonctions | toutes les données applicatives |
| Vercel | hébergement web, CDN | logs de requêtes, contenu public |
| EJ SMS (EJSARL) | envoi des SMS et OTP | numéros de téléphone, texte des messages |
| Ejpay | paiements Mobile Money | montants, numéros, références de transaction |
| Google (Gmail SMTP, Maps, FCM) | emails transactionnels, cartes, notifications | emails, coordonnées de carte, jetons push |

Détail et localisation : `SUBPROCESSORS.md`.

## 4. Données sensibles (rappel)

- identité et téléphone des passagers et chauffeurs ;
- positions GPS et historique de trajets ;
- montants, soldes et références de paiement ;
- photos de profil et de véhicule ;
- journaux OTP (`sms_logs`) et journal d'audit.

## 5. Règles de mise à jour

Mettre à jour ce document dès qu'un des événements suivants survient :
nouveau service, nouvelle base ou bucket, nouveau prestataire, changement de propriétaire
d'un compte, ajout ou retrait d'un administrateur.
