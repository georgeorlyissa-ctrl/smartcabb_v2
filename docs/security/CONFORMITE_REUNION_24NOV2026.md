# Conformité — Recommandations de la réunion du 24 novembre 2026

> **Réf.** : SEC-GAP-001 · **Version** : 1.0 · **Date** : 28 novembre 2026
> **Propriétaire** : Direction SmartCabb · **Classification** : Interne
> **Périmètre** : `smartcabb.com`, API Supabase, application Android, base de
> données, prestataires SMS/paiement, opérations terrain.

## 1. Objet

Ce document répond à trois questions :

1. **Qu'est-ce qui était déjà fait** avant la réunion du 24 novembre 2026 ?
2. **Qu'est-ce qui manquait** ou n'était que partiel ?
3. **Qu'est-ce qui a été produit** depuis, et **ce qui reste à décider ou à faire** ?

> Le compte rendu mentionne « CIE : niveaux 1 et 2 ». Nous l'interprétons comme
> **CIS Controls** (et CIS Benchmarks). Si « CIE » désigne un référentiel interne
> distinct, la section 4 devra être adaptée.

## 2. Synthèse exécutive

| Constat | État |
|---|---|
| Les **contrôles techniques** de sécurité étaient déjà largement en place (authentification, 2FA admin, RLS, sauvegardes testées, journal d'audit, CI/CD, scans). | ✅ |
| La **formalisation documentaire de gouvernance** (politique, crise, manuel, charte qualité) n'existait pas. | ❌ → corrigé par ce lot |
| Le référentiel **CIS** n'était traité qu'au niveau **IG1** ; les niveaux **IG2** et les Benchmarks L2 restaient partiels. | 🟡 |
| **ISO 27001/27002** n'était pas cartographié ; aucun SMSI formalisé. | ❌ → cadre créé, certification non visée à court terme |
| **ISO 27035** n'existait que sous forme d'une fiche reflexe 1 page. | 🟡 → procédure complète créée |
| La **check-list opérationnelle terrain** n'existait pas (seule une check-list d'audit sécurité existait). | ❌ → créée |
| **ISO 9001 / Charte Qualité** n'existaient pas. | ❌ → charte créée, QMS à structurer |
| Plusieurs actions restent **organisationnelles** : signature des documents, désignation des suppléants, exercice de crise, formation, pentest, DPA fournisseurs. | ⏳ |

## 3. Ce qui était déjà fait avant la réunion

### 3.1 Contrôles techniques et exploitation

| Domaine | Preuve existante | État |
|---|---|---|
| Modèle de sécurité, gardes d'authentification, RLS, CORS, CSP | `docs/SECURITY.md` | ✅ |
| Inventaire des actifs | `docs/security/ASSET_INVENTORY.md` | 🟡 (à maintenir) |
| Revue des accès et comptes | `docs/security/ACCESS_REVIEW.md` | 🟡 (revue trimestrielle à instaurer) |
| Journalisation et revue des logs | `docs/security/LOG_POLICY.md` + `audit_logs` | ✅ |
| Sauvegardes quotidiennes + test de restauration + alerte | `docs/BACKUPS.md` + panneau admin | ✅ |
| Fiche incident 1 page | `docs/security/INCIDENT_CARD.md` | ✅ (fiche, pas procédure complète) |
| CIS Controls v8.1 — niveau IG1 | `docs/security/CIS_IG1_CHECKLIST.md` | 🟡 (7/18 complets, 5 partiels, 4 sans objet, 2 à faire) |
| Durcissement CIS Benchmarks | `docs/security/HARDENING_CHECKLIST.md` | 🟡 (L1 majoritaire, L2 partiel) |
| OWASP ASVS / API / MASVS | `docs/security/OWASP_MAPPING.md` | 🟡 (L1 visé) |
| Sous-traitants | `docs/security/SUBPROCESSORS.md` | 🟡 (DPA à archiver) |
| CI/CD, SAST, DAST, Dependabot | `.github/workflows/*`, `docs/security/CHECKLIST_AUDIT.md` | ✅ |
| SOS passager/chauffeur + SMS | `docs/EMERGENCY_SOS.md` | ✅ |
| 2FA admin applicative + session 12 h | `auth-guard.ts`, `AdminLoginScreen` | ✅ |
| 2FA plateformes (Supabase, Vercel, GitHub, Play Console) | suivi projet | ✅ |
| Rate limiting ciblé, OTP SMS, quotas | Edge Function | ✅ |
| Chiffrement TLS, secrets hors dépôt | Vercel/Supabase | ✅ |

### 3.2 Ce qui manquait réellement

- Une **politique de sécurité signée** avec rôles, principes et sanctions.
- Un **plan de gestion de crise** avec cellule, niveaux de gravité, RTO/RPO,
  scénarios et communication.
- Un **manuel de procédures internes** consolidé (accès, changement, sauvegarde,
  incident, prestataires, données personnelles, terrain).
- Une **procédure complète ISO 27035** (au-delà de la fiche reflexe).
- Une **check-list opérationnelle terrain** avant / pendant / après.
- Une **charte qualité de service** et un début de SMQ ISO 9001.
- Un **cadre ISO 27001/27002** avec analyse d'écart et déclaration d'applicabilité.
- Le passage **CIS IG2** et **Benchmarks L2** (au-delà de l'hygiène de base).

## 4. Livrables produits le 28 novembre 2026

| # | Recommandation | Livrable | Fichier | Statut |
|---|---|---|---|---|
| 1 | Politique de sécurité | SEC-POL-001 | `docs/security/POLITIQUE_SECURITE.md` | ✅ Projet complet, à approuver |
| 2 | Plan de gestion de crise | SEC-CRI-001 | `docs/security/PLAN_GESTION_CRISE.md` | ✅ Projet complet, à approuver |
| 4 | Manuel des procédures internes | SEC-MPI-001 | `docs/security/MANUEL_PROCEDURES_INTERNES.md` | ✅ Projet complet, à approuver |
| 5 | CIS niveaux 1 et 2 | SEC-CIS-001 | `docs/security/CIS_NIVEAUX_1_2.md` | ✅ État des lieux + feuille de route |
| 6 | Cadre ISO 27001/27002 | SEC-ISO-001 | `docs/security/CADRE_ISO_27001_27002.md` | ✅ Cadre + SoA simplifiée |
| 7 | Procédure incidents ISO 27035 | SEC-INC-001 | `docs/security/PROCEDURE_INCIDENTS_ISO_27035.md` | ✅ Procédure complète |
| 8 | Check-list opérationnelle | SEC-OPS-001 | `docs/security/CHECKLIST_OPERATIONNELLE.md` | ✅ Prête à l'emploi |
| 9 | Charte Qualité ISO 9001 | QUA-CHQ-001 | `docs/quality/CHARTE_QUALITE_SERVICE.md` | ✅ Projet complet, à approuver |

> Le compte rendu ne comporte pas de point 3 ni de livrable 3. Le numéro 4
> (manuel des procédures) est conservé pour rester aligné sur la synthèse.

## 5. Ce qui reste à faire (actions de direction)

### 5.1 Bloquant avant la descente sur le terrain

| Action | Responsable | Échéance proposée | Preuve attendue |
|---|---|---|---|
| Approuver et signer la politique, le plan de crise, le manuel et la charte | Direction | 5 jours | PDF signé + version « approuvée » |
| Désigner la cellule de crise et ses suppléants (noms + téléphones) | Direction | 5 jours | Annexe contacts remplie |
| Former les intervenants terrain à la check-list et aux réflexes incidents | Opérations | 7 jours | Feuille de présence + quiz |
| Vérifier les documents chauffeurs/véhicules sur un échantillon | Opérations | 7 jours | Check-lists complétées |
| Tester le scénario « téléphone admin perdu » (révocation + secours) | Admin/Sécurité | 7 jours | Compte rendu d'exercice |
| Confirmer la restriction de la clé Google Maps | Admin | 7 jours | Capture/justificatif |

### 5.2 À faire sous 30 jours

- Exercice de crise « tabletop » de 90 minutes (fuite de données ou panne Supabase).
- Revue trimestrielle des accès (première revue formelle).
- Archiver les DPA/conditions de Supabase, Vercel, EJ SMS, Ejpay, Google.
- Mettre à jour l'inventaire des actifs (version AAB, comptes, fournisseurs).
- Former l'admin aux procédures de restauration et de rotation des secrets.
- Mettre en place le tableau de bord qualité (KPI de la charte).
- Corriger les écarts CIS IG2 prioritaires (inventaire automatisé, scan planifié,
  centralisation des logs, sensibilisation).

### 5.3 À faire sous 90 jours

- Audit interne blanc ISO 27001 (documentation + échantillon de preuves).
- Test d'intrusion externe ou, à défaut, scan authentifié + revue de code ciblée.
- Revue de direction annuelle (politique, risques, incidents, qualité).
- Décision sur PITR Supabase, WAF et gestionnaire de mots de passe.
- Mise à jour de la charte qualité après les premiers KPI mesurés.

## 6. Indicateurs de suivi

| Indicateur | Cible | Fréquence | Source |
|---|---|---|---|
| Documents de gouvernance approuvés | 4/4 | Mensuelle | Registre documentaire |
| Personnel formé sécurité/qualité | 100 % | Annuelle | Feuilles de présence |
| Exercices de crise réalisés | 2/an | Semestrielle | Compte rendu |
| Tests de restauration réussis | 1/mois | Mensuelle | Panneau admin |
| Incidents S1 avec post-mortem < 72 h | 100 % | Par incident | Registre incidents |
| Actions correctives clôturées < 30 j | ≥ 90 % | Mensuelle | Registre actions |
| Écarts CIS IG2 prioritaires traités | 100 % | Trimestrielle | `CIS_NIVEAUX_1_2.md` |
| Réclamations clients traitées < 72 h | ≥ 90 % | Mensuelle | Charte qualité |
| Fournisseurs avec DPA archivé | 100 % | Annuelle | `SUBPROCESSORS.md` |

## 7. Limites et précautions

- Ces documents sont des **projets de gouvernance**. Ils ne valent pas
  certification ISO et ne remplacent pas un avis juridique.
- Les cibles de délai (RTO/RPO, SLA) sont des **objectifs internes** à valider
  par la direction ; elles ne doivent pas être publiées comme engagements
  contractuels sans validation.
- Les noms, téléphones et signatures doivent être complétés par la direction ;
  aucun secret ne doit figurer dans ces fichiers.
- La conformité au **Code du numérique (RDC)** et aux obligations de notification
  de violation de données doit être confirmée avec un conseil juridique local.

## 8. Références

- `docs/security/README.md` — index des documents.
- `docs/SECURITY.md` — modèle de sécurité technique.
- `docs/BACKUPS.md` — sauvegardes et restauration.
- `docs/security/INCIDENT_CARD.md` — fiche reflexe terrain.
- `docs/security/CIS_IG1_CHECKLIST.md` — état IG1.
- `docs/security/HARDENING_CHECKLIST.md` — état des Benchmarks.
- `docs/security/CHECKLIST_AUDIT.md` — audit sécurité.
