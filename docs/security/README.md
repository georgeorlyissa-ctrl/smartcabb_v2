# Sécurité & qualité — index des documents

> Dernière mise à jour : 28 novembre 2026.
> Ce dossier regroupe les documents de gouvernance, les preuves de conformité
> et les procédures opérationnelles de SmartCabb.
>
> **Important** : SmartCabb n'est pas certifié ISO 27001 ni ISO 9001 à ce jour.
> Les documents « ISO » décrivent une démarche **alignée** sur les normes,
> destinée à préparer une certification ultérieure.

## 1. Gouvernance et politique

| Réf. | Document | Objet | État |
|---|---|---|---|
| SEC-POL-001 | [POLITIQUE_SECURITE.md](./POLITIQUE_SECURITE.md) | Politique de sécurité de l'information, rôles, règles | Projet à approuver |
| SEC-CRI-001 | [PLAN_GESTION_CRISE.md](./PLAN_GESTION_CRISE.md) | Organisation et procédures de crise, continuité | Projet à approuver |
| SEC-MPI-001 | [MANUEL_PROCEDURES_INTERNES.md](./MANUEL_PROCEDURES_INTERNES.md) | Procédures internes et RACI | Projet à approuver |

## 2. Référentiels et conformité

| Réf. | Document | Objet | État |
|---|---|---|---|
| SEC-CIS-001 | [CIS_NIVEAUX_1_2.md](./CIS_NIVEAUX_1_2.md) | CIS Controls IG1/IG2 + CIS Benchmarks L1/L2 | État des lieux + feuille de route |
| SEC-ISO-001 | [CADRE_ISO_27001_27002.md](./CADRE_ISO_27001_27002.md) | Cadre SMSI aligné ISO 27001/27002 | Cadre + analyse d'écart |
| SEC-INC-001 | [PROCEDURE_INCIDENTS_ISO_27035.md](./PROCEDURE_INCIDENTS_ISO_27035.md) | Gestion des incidents de sécurité | Procédure complète |
| SEC-OPS-001 | [CHECKLIST_OPERATIONNELLE.md](./CHECKLIST_OPERATIONNELLE.md) | Check-list avant / pendant / après terrain | Prête à l'emploi |
| QUA-CHQ-001 | [../quality/CHARTE_QUALITE_SERVICE.md](../quality/CHARTE_QUALITE_SERVICE.md) | Charte Qualité de Service alignée ISO 9001 | Projet à approuver |
| SEC-GAP-001 | [CONFORMITE_REUNION_24NOV2026.md](./CONFORMITE_REUNION_24NOV2026.md) | Synthèse « déjà fait / reste à faire » | Tableau de bord |
| SEC-REG-001 | [REGISTRE_APPROBATIONS.md](./REGISTRE_APPROBATIONS.md) | Suivi des approbations et versions | Registre |

## 3. Preuves et documents d'appui déjà en place

| Document | Contenu |
|---|---|
| [../SECURITY.md](../SECURITY.md) | Modèle de sécurité technique, contrôles, risques résiduels |
| [ASSET_INVENTORY.md](./ASSET_INVENTORY.md) | Inventaire des actifs (CIS 1) |
| [ACCESS_REVIEW.md](./ACCESS_REVIEW.md) | Revue des accès (CIS 5-6) |
| [LOG_POLICY.md](./LOG_POLICY.md) | Journalisation et revue des logs (CIS 8) |
| [SUBPROCESSORS.md](./SUBPROCESSORS.md) | Fournisseurs et sous-traitants (CIS 15) |
| [CIS_IG1_CHECKLIST.md](./CIS_IG1_CHECKLIST.md) | État des 18 contrôles CIS v8.1 au niveau IG1 |
| [HARDENING_CHECKLIST.md](./HARDENING_CHECKLIST.md) | Durcissement CIS Benchmarks (PostgreSQL, Android, HTTP) |
| [CHECKLIST_AUDIT.md](./CHECKLIST_AUDIT.md) | Audit de la check-list sécurité (OWASP, CI/CD, etc.) |
| [OWASP_MAPPING.md](./OWASP_MAPPING.md) | Correspondance OWASP ASVS / API / MASVS |
| [INCIDENT_CARD.md](./INCIDENT_CARD.md) | Fiche reflexe 1 page en cas d'incident |
| [../BACKUPS.md](../BACKUPS.md) | Sauvegardes, restauration, RTO/RPO |
| [../EMERGENCY_SOS.md](../EMERGENCY_SOS.md) | Dispositif SOS passager/chauffeur |

## 4. Règles de tenue documentaire

- Chaque document a un **propriétaire**, une **version** et une **date de revue**.
- Toute modification de procédure doit être reportée dans
  `docs/CHANGELOG_TECHNIQUE.md`.
- Les documents approuvés sont conservés hors dépôt (PDF signé) **et** dans le
  dépôt (source Markdown).
- Ne jamais écrire de secret, mot de passe, clé API ou donnée personnelle dans
  ces documents.
- Revue annuelle minimale ; revue immédiate après un incident majeur, un
  changement de prestataire ou une évolution réglementaire.
