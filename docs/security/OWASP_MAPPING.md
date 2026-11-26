# Correspondance OWASP — SmartCabb

> Référence : **ASVS 4.0.3** (chapitres V1-V14), **OWASP API Security Top 10 (2023)**,
> **MASVS 2023** (application Android). Niveau visé : **ASVS L1** (puis L2 progressivement).
> Dernière mise à jour : 26 novembre 2026.

## 1. OWASP ASVS

| Chapitre | Sujet | État | Constat |
|---|---|---|---|
| V1 | Architecture, menace | 🟡 | modèle décrit dans `SECURITY.md` ; pas de diagramme de flux |
| V2 | Authentification | ✅ | mot de passe 8+ (maj/min/chiffre), 2FA admin, OTP SMS, anti-bruteforce |
| V3 | Session | ✅ | JWT 1 h, refresh rotation, session 2FA serveur 12 h, inactivité 30 min |
| V4 | Contrôle d'accès | ✅ | gardes centralisées (`auth-guard.ts`), RLS, propriétaire de ressource |
| V5 | Validation des entrées | 🟡 | validation des formats clés + quotas ; schémas non systématiques sur chaque route |
| V6 | Cryptographie | ✅ | TLS, AES-GCM pour les backups (optionnel), aucun algorithme maison |
| V7 | Erreurs et logs | ✅ | erreurs génériques + `requestId`, journal d'audit, purge 90 j |
| V8 | Protection des données | 🟡 | PII minimisées, profils publics assainis ; durées de conservation à formaliser |
| V9 | Communication | ✅ | HTTPS partout, HSTS, pas de trafic en clair (Android 1.9+) |
| V10 | Code malveillant | ✅ | dépendances auditées, pas de script tiers, CSP sans CDN |
| V11 | Logique métier | 🟡 | commissions et flux vérifiés côté serveur ; limites par utilisateur à généraliser |
| V12 | Fichiers et ressources | ✅ | types MIME, taille (2 Mo) et signature binaire des photos |
| V13 | API et services web | ✅ | CORS restreint, auth par route, quotas, webhooks signés |
| V14 | Configuration | ✅ | secrets hors dépôt, en-têtes de sécurité, CSP, CI de vérification |

## 2. OWASP API Security Top 10 (2023)

| Risque | État | Mitigation |
|---|---|---|
| API1 — Broken Object Level Authorization | ✅ | vérification de propriétaire sur chaque ressource (`requireOwnerOrAdmin`) |
| API2 — Broken Authentication | ✅ | JWT Supabase, clé anon refusée, 2FA admin |
| API3 — Broken Object Property Level Authorization | ✅ | profils publics minimaux, champs privilégiés supprimés côté serveur |
| API4 — Unrestricted Resource Consumption | 🟡 | quotas SMS/OTP/SOS/course ; limites globales par IP perfectibles |
| API5 — Broken Function Level Authorization | ✅ | `requireAdmin` sur toutes les routes d'administration |
| API6 — Unrestricted Access to Sensitive Business Flows | 🟡 | création de course limitée (10/15 min) ; réservations à instrumenter |
| API7 — Server Side Request Forgery | ✅ | aucune URL fournie par l'utilisateur n'est appelée côté serveur (sauf fournisseurs fixés) |
| API8 — Security Misconfiguration | ✅ | CORS restreint, erreurs génériques, secrets externalisés, RLS par défaut refus |
| API9 — Improper Inventory Management | 🟡 | routes documentées dans le code ; inventaire formel à tenir (`ASSET_INVENTORY.md`) |
| API10 — Unsafe Consumption of APIs | ✅ | webhooks signés (Ejpay, SMS), montants vérifiés |

## 3. OWASP MASVS (Android)

| Catégorie | État | Détail |
|---|---|---|
| MASVS-STORAGE | ✅ | `allowBackup=false` (1.9+), pas de fichier sensible en clair, jeton en `localStorage` WebView |
| MASVS-CRYPTO | ✅ | primitives de la plateforme (TLS, Keystore via WebView) |
| MASVS-AUTH | ✅ | authentification déléguée au serveur, 2FA admin |
| MASVS-NETWORK | ✅ | `cleartext=false`, HTTPS obligatoire ; pinning non implémenté |
| MASVS-PLATFORM | ✅ | activité non exportée hors launcher, permissions minimales |
| MASVS-CODE | 🟡 | build release minifié, pas de code natif maison ; analyse statique via CodeQL |
| MASVS-RESILIENCE | 🟡 | signature release, R8 ; pas d'anti-tamper dédié |
| MASVS-PRIVACY | 🟡 | minimisation, permissions justifiées ; durées de conservation à documenter |

## 4. Comment utiliser ce document

- Pour un **client entreprise** : c'est la preuve qu'un référentiel reconnu a été
  parcouru, avec les écarts assumés et leur justification.
- Pour un **auditeur** : chaque ligne renvoie à un document ou un fichier de code.
- Pour **nous** : à relire à chaque évolution majeure (nouvelle route, nouveau service,
  changement de fournisseur). Les cases 🟡 sont les prochains chantiers.
