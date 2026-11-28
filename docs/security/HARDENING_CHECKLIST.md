# Durcissement (CIS Benchmarks) — SmartCabb

> **CIS Hardening** = appliquer les **CIS Benchmarks** : des guides de configuration
> sécurisée, technologie par technologie (PostgreSQL, Android, Linux, navigateurs…),
> avec deux niveaux (L1 = base, L2 = durci).
>
> Contrairement aux CIS *Controls* (une liste de bonnes pratiques), les *Benchmarks*
> sont des réglages précis, vérifiables et automatisables.
>
> Dernière revue : 26 novembre 2026.
>
> **Synthèse et feuille de route** : `CIS_NIVEAUX_1_2.md` (IG1/IG2 + Benchmarks
> L1/L2). Ce document détaille les réglages appliqués ou restants.

## 1. Ce qui s'applique — et ce qui ne s'applique pas

SmartCabb utilise des services managés (Supabase, Vercel) : **la majorité des
benchmarks système (noyau, SSH, sudo, pare-feu, système de fichiers) ne nous
appartiennent pas**. Ce qui reste sous notre contrôle :

| Domaine | Benchmark concerné | Applicable |
|---|---|---|
| PostgreSQL (Supabase) | CIS PostgreSQL Benchmark | ✅ partiellement (rôles, privilèges, extensions) |
| Application Android | CIS Android / Google Play hardening | ✅ oui |
| HTTP / navigateur | recommandations OWASP + TLS | ✅ oui (Vercel) |
| Comptes et accès | CIS Controls 5-6 | ✅ oui |
| OS serveur, SSH, noyau | CIS Linux / Ubuntu | ➖ géré par Supabase |
| Réseau, pare-feu | CIS Network | ➖ géré par Vercel/Supabase |

## 2. État des lieux

### 2.1 PostgreSQL / Supabase

| Mesure | État | Détail |
|---|---|---|
| Aucune fonction exécutable par `anon` | ✅ **corrigé le 26/11** | `revoke execute … from public, anon` sur toutes les fonctions du schéma `public` ; seules 3 RPC sont ouvertes aux comptes connectés (`mark_notification_as_read`, `approve_postpaid_request`, `reject_postpaid_request`) |
| `create_postpaid_request` / `record_postpaid_payment` réservés au serveur | ✅ **corrigé** | `revoke … from authenticated` (test : `401 permission denied` en anon) |
| RLS activée sur les tables sensibles | ✅ | cf. `docs/SECURITY.md` |
| Privilèges `service_role` limités au serveur | ✅ | clé jamais exposée au client |
| SSL obligatoire sur les connexions | ✅ | imposé par Supabase |
| Extensions non utilisées | 🟡 | à vérifier dans `Database → Extensions` (retirer celles qui ne servent pas) |
| Rôle `postgres` non utilisé par l'app | ✅ | l'app passe par PostgREST / Edge Functions |
| Journaux d'audit | ✅ | `audit_logs` + purge 90 j (cf. `LOG_POLICY.md`) |

### 2.2 Application Android

| Mesure | État | Détail |
|---|---|---|
| `android:allowBackup="false"` | ✅ **corrigé (source)** | empêche l'extraction des données WebView (jeton Supabase dans `localStorage`) via ADB/Smart Switch — **effectif à la prochaine AAB** |
| `usesCleartextTraffic="false"` / `cleartext: false` | ✅ **corrigé (source)** | aucun HTTP en clair autorisé — **effectif à la prochaine AAB** |
| `debuggable` désactivé en release | ✅ | comportement Gradle par défaut |
| Activité exportée limitée au launcher | ✅ | `MainActivity` exportée uniquement via `MAIN/LAUNCHER` |
| Permissions minimales | 🟡 | `READ_CONTACTS` conservée pour « Réserver pour quelqu'un » ; à justifier dans la fiche Play |
| `WRITE_CONTACTS` retirée | ✅ | `tools:node="remove"` |
| Signature d'application | ✅ | keystore hors dépôt, `signReleaseBundle` |
| WebView : débogage distant | ✅ | désactivé hors build debug (Capacitor) |
| Épinglage de certificat (pinning) | ❌ | non implémenté — risque faible, à envisager si vol de données sensible |

### 2.3 Web / HTTP (Vercel)

| Mesure | État | Détail |
|---|---|---|
| HTTPS forcé + HSTS | ✅ | `vercel.json` |
| CSP stricte sans CDN tiers | ✅ | `script-src 'self' …`, plus de `cdn.jsdelivr.net` |
| `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` | ✅ | `vercel.json` |
| `Permissions-Policy` (géoloc/caméra/micro restreints) | ✅ | `vercel.json` |
| Cookies / sessions | ✅ | JWT Supabase, pas de cookie de session maison |
| En-têtes d'erreur sans détail interne | ✅ | `onError` générique + `requestId` |

### 2.4 Comptes

| Mesure | État |
|---|---|
| 2FA sur le compte admin applicatif | ✅ |
| 2FA Supabase | ⬜ **à activer** |
| 2FA Vercel | ✅ |
| 2FA GitHub | ✅ |
| 2FA Play Console | ✅ |
| Comptes nominatifs, aucun compte partagé | ✅ |
| Revue d'accès trimestrielle | 🟡 procédure prête (`ACCESS_REVIEW.md`) |
| Gestionnaire de mots de passe | ⬜ à mettre en place |

## 3. Actions restantes

1. **Activer la 2FA Supabase** (Vercel, GitHub et Play Console sont déjà protégés).
2. **Publier une nouvelle AAB** pour embarquer `allowBackup=false` et l'interdiction du trafic en clair.
3. Passer en revue les **extensions PostgreSQL** et retirer celles qui ne sont pas utilisées.
4. Décider du **certificate pinning** (optionnel, à faire si un audit l'exige).
5. Justifier `READ_CONTACTS` dans la fiche Play Store (déclaration des permissions).

## 4. Ce que le durcissement ne remplace pas

- Il ne remplace pas une **revue de code** régulière.
- Il ne remplace pas un **test d'intrusion** (contrôle CIS 18).
- Il ne protège pas contre une **erreur de configuration applicative** (route sans garde) :
  c'est le rôle des tests et des gardes d'authentification déjà en place.
