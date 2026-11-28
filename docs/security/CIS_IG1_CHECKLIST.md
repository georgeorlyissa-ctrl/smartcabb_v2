# CIS Controls v8.1 — état des lieux IG1 (SmartCabb)

> Périmètre : application web `www.smartcabb.com`, API Edge Functions Supabase,
> application Android (WebView Capacitor), base Supabase, prestataires SMS/paiement.
> Niveau visé : **IG1** (hygiène de base, adapté à une petite structure).
> Dernière revue : 26 novembre 2026.
>
> **Complément** : `CIS_NIVEAUX_1_2.md` couvre le niveau **IG2** et les
> **CIS Benchmarks L1/L2** (PostgreSQL, Android, HTTP, comptes).

Légende : ✅ fait · 🟡 partiel · ❌ à faire · ➖ sans objet

| # | Contrôle (IG1) | État | Détail / action |
|---|---|---|---|
| 1 | Inventaire des actifs | 🟡 | `ASSET_INVENTORY.md` créé ; à relire à chaque nouveau service |
| 2 | Inventaire des logiciels | 🟡 | dépendances gérées par `package-lock.json` ; pas d'inventaire ponctuel daté |
| 3 | Protection des données | ✅ | RLS sur toutes les tables sensibles, PII masquées, bucket privé, TLS |
| 4 | Configuration sécurisée | ✅ | secrets hors dépôt (`.env` ignoré, Supabase Secrets), pas de compte par défaut |
| 5 | Gestion des comptes | 🟡 | 1 seul admin, comptes obsolètes supprimés ; revue formelle trimestrielle à instaurer (`ACCESS_REVIEW.md`) |
| 6 | Gestion des accès | ✅ | moindre privilège, 2FA admin, sessions 12 h, clé anon refusée sur routes sensibles |
| 7 | Gestion des vulnérabilités | 🟡 | `npm audit` exécuté, 0 critique ; pas de scan planifié ni de pentest |
| 8 | **Gestion des journaux** | ✅ (nouveau) | journal d'audit serveur (`audit_logs`), 5 actions sensibles tracées, purge 90 j, revue mensuelle (`LOG_POLICY.md`) |
| 9 | Protection email / navigateur | ➖ | pas de messagerie hébergée par SmartCabb (SMTP Gmail sortant uniquement) |
| 10 | Défenses anti-malware | ➖ | pas de poste de travail géré par l'entreprise |
| 11 | Récupération des données | ✅ | backup quotidien, **test de restauration réel** (8 contrôles), alerte en cas d'échec |
| 12 | Gestion de l'infrastructure réseau | ➖ | pas d'infrastructure réseau propre (PaaS) |
| 13 | Surveillance réseau | ➖ | idem |
| 14 | Sensibilisation | ❌ | aucune formation formelle ; dépend d'une seule personne |
| 15 | Gestion des prestataires | 🟡 | `SUBPROCESSORS.md` créé ; clauses/DPA à récupérer auprès de chaque fournisseur |
| 16 | Sécurité applicative | ✅ | gardes d'authentification centralisées, validation d'entrée, erreurs génériques, rate limits |
| 17 | Réponse aux incidents | ✅ | `INCIDENT_CARD.md` + procédure complète `PROCEDURE_INCIDENTS_ISO_27035.md` + alertes email automatiques |
| 18 | Tests d'intrusion | ❌ | aucun test externe à ce jour |

## Points ouverts (par ordre de valeur)

1. **Revue d'accès trimestrielle** — 10 min, à consigner dans `ACCESS_REVIEW.md`.
2. **DPA / clauses de sécurité** des fournisseurs (Supabase, Vercel, EJ SMS, Ejpay) — à archiver.
3. **Sensibilisation** — une session courte annuelle pour toute personne ayant un accès admin.
4. **Pentest externe** — à budgéter avant une ouverture B2B ; pas bloquant pour le grand public.
5. **Scan de vulnérabilités planifié** — `npm audit` mensuel (déjà dans la routine de revue).

## Ce que ce document n'est pas

Ce n'est **pas** une certification. C'est une photo honnête de l'hygiène de sécurité,
utilisable comme support de discussion avec un client, un partenaire ou un auditeur.
