# Audit de la check-list sécurité — SmartCabb

> Revue cas par cas de la liste fournie (OWASP, authentification, données, exploitation).
> Dernière mise à jour : 26 novembre 2026.
>
> Légende : ✅ en place · 🟡 partiel · ❌ absent · ➖ géré par la plateforme (PaaS)

| # | Élément | État | Preuve / détail | Reste à faire |
|---|---|---|---|---|
| 1 | **OWASP ASVS** | 🟡 | Correspondance chapitre par chapitre dans `OWASP_MAPPING.md` (niveau L1 visé) | Viser L2 sur V2/V4/V8 |
| 2 | **OWASP API Top 10** | 🟡 | API1 (BOLA) couvert par RLS + gardes de propriétaire ; API2 (auth) par JWT + 2FA admin ; API4 (ressources) par quotas | API6 « flux métier » à instrumenter (limites par utilisateur sur les réservations) |
| 3 | **OWASP MASVS** | 🟡 | `allowBackup=false`, `cleartext=false`, activité non exportée, signature release | Épinglage de certificat (optionnel) |
| 4 | **Authentification** | ✅ | Supabase Auth, mot de passe 8+ (maj/min/chiffre), 2FA admin, OTP passager | — |
| 5 | **OTP** | ✅ | 6 chiffres, 10 min, 5 tentatives, quotas 5/h + 10/j par numéro, 20/h par IP | — |
| 6 | **JWT** | ✅ | JWT Supabase (1 h), rotation des refresh tokens, clé `anon` refusée sur les routes sensibles | — |
| 7 | **RBAC** | ✅ | `roleOf()` + `requireAdmin` / `requireOwnerOrAdmin` / `requireAnyOwnerOrAdmin` | — |
| 8 | **RLS** | ✅ | Policies sur `profiles`, `settings`, `transactions`, `sms_logs`, `audit_logs`, `vehicles` ; `kv_store` sans policy (refus par défaut) | — |
| 9 | **Rate limiting** | 🟡 | Limiteurs ciblés (SMS, OTP, SOS, création de course, connexion) ; limiteur global désactivé (CGNAT) | Activer `RATE_LIMIT_GLOBAL_MAX` avec seuil élevé si abus constaté |
| 10 | **WAF** | ➖ | Aucun WAF applicatif sur Vercel (offre actuelle) | Envisager Cloudflare / Vercel WAF en cas d'attaques |
| 11 | **DDoS** | ➖ | Absorption réseau Vercel/Supabase (anycast) | — |
| 12 | **Chiffrement** | ✅ | TLS partout ; chiffrement au repos par les plateformes ; **chiffrement applicatif des backups disponible** (`BACKUP_ENCRYPTION_KEY`, désactivé par défaut) | Décider de l'activation + conserver la clé hors Supabase |
| 13 | **Secrets management** | ✅ | Secrets Supabase (`SMTP_*`, `EJSMS_*`, `CRON_SECRET`…), `.env` ignoré, aucun secret dans le dépôt (scan CI) | — |
| 14 | **Webhook security** | ✅ | Ejpay : HMAC-SHA512 + contrôle du montant ; SMS DLR : signature EJ SMS | — |
| 15 | **Payment security** | ✅ | Paiement rattaché au propriétaire, montant vérifié, statut côté serveur | — |
| 16 | **GPS privacy** | 🟡 | Positions réservées aux participants ; `GET /rides/:id` public minimal ; `/drivers/location/:id` protégé | Définir la durée de conservation des positions |
| 17 | **Admin security** | ✅ | 2FA serveur, session 12 h, inactivité 30 min, audit des actions sensibles | — |
| 18 | **CI/CD security** | ✅ **nouveau** | `.github/workflows/ci.yml` : types, build, audit dépendances, scan de secrets, `.env` non suivi | — |
| 19 | **Dependency scanning** | ✅ **nouveau** | `npm audit` en CI (échec sur critique) + audit complet en rapport | Activer les alertes Dependabot (workflow fourni) |
| 20 | **SAST** | ✅ **nouveau** | `.github/workflows/codeql.yml` (JavaScript/TypeScript, `security-and-quality`) | Corriger les alertes remontées |
| 21 | **DAST** | ✅ **nouveau** | `.github/workflows/dast.yml` : OWASP ZAP baseline hebdomadaire sur `www.smartcabb.com` (passif) | — |
| 22 | **Penetration testing** | ❌ | Aucun test externe | Budgetiser avant ouverture B2B |
| 23 | **Backup** | ✅ | Quotidien 02:00, rétention 30 j, **test de restauration** réel, alerte en cas d'échec | — |
| 24 | **Disaster recovery** | 🟡 | `INCIDENT_CARD.md` + sauvegardes ; RTO/RPO non formalisés | Écrire RTO (4 h) / RPO (24 h) et tester un scénario complet |
| 25 | **SIEM** | ❌ | Pas de SIEM (coût) ; remplacé par journal d'audit + alertes email | Envisager un collecteur (Loki/Grafana Cloud) si volumétrie |
| 26 | **Incident response** | ✅ | Fiche incident 1 page + procédure ISO 27035 + alertes automatiques (backup, 5xx, restauration) | Faire un exercice à blanc |

## Nouveautés de cette revue

- **CI/CD** : workflow complet à chaque push (types, build, audit, secrets).
- **SAST** : analyse CodeQL automatique + hebdomadaire.
- **DAST** : scan ZAP passif hebdomadaire.
- **Dépendances** : Dependabot (mises à jour npm + actions).
- **Validation des photos** : taille (2 Mo), type (JPEG/PNG/WebP) et signature binaire contrôlés côté serveur.
- **Chiffrement des backups** : capacité ajoutée (AES-256-GCM), activation sur décision.

## Écarts assumés

| Écart | Raison | Déclencheur pour agir |
|---|---|---|
| WAF / SIEM / pentest | coût et taille de l'équipe | contrat B2B, incident, financement |
| Rate limit global | risque de bloquer les utilisateurs derrière un CGNAT | abus avéré |
| Pinning certificat | contrainte de rotation | exigence d'audit |
