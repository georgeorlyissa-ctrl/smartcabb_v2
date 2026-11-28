# Manuel des procédures internes — SmartCabb

> **Réf.** : SEC-MPI-001 · **Version** : 1.0 · **Date** : 28 novembre 2026
> **Propriétaire** : Direction SmartCabb · **Classification** : Interne
> **Revue** : annuelle, ou après un changement majeur.

## 1. Objet et portée

Ce manuel rassemble les procédures internes minimales pour exploiter SmartCabb
de façon fiable, sécurisée et reproductible. Il s'applique à l'administrateur,
au support, aux opérations terrain, aux développeurs/prestataires et aux
chauffeurs partenaires.

Il ne remplace pas les documents techniques détaillés (`SECURITY.md`,
`BACKUPS.md`, `EMERGENCY_SOS.md`) mais précise **qui fait quoi, quand, et avec
quelle preuve**.

## 2. Cartographie des processus

| Processus | Objectif | Procédures |
|---|---|---|
| Gouvernance | Décider, suivre, améliorer | MP-13, MP-14 |
| Produit / développement | Livrer sans régression | MP-03, MP-06 |
| Exploitation | Maintenir le service | MP-04, MP-10 |
| Support / terrain | Servir le passager et le chauffeur | MP-11, MP-12 |
| Finance | Encaisser et rapprocher | MP-04, MP-12 |
| Sécurité | Protéger les actifs | MP-01, MP-02, MP-05, MP-07, MP-09 |
| Données personnelles | Respecter les droits | MP-08 |
| Ressources humaines | Compétence et discipline | MP-01, MP-13 |

## 3. Matrice RACI (simplifiée)

R = réalise · A = approuve · C = consulté · I = informé

| Activité | Direction | Admin tech. | Support/Ops | Sécurité | Prestataire |
|---|---|---|---|---|---|
| Politique et documents | A | R | I | C | I |
| Accès et comptes | A | R | I | C | I |
| Secrets et clés | A | R | I | C | I |
| Déploiement | I | R/A | I | C | C |
| Sauvegarde / restauration | I | R/A | I | C | C |
| Incident S1 | A | R | R | R | C |
| Incident S2/S3 | I | R | R | C | C |
| Prestataires | A | R | I | C | C |
| Demande de données personnelles | A | R | I | C | I |
| Opérations terrain | I | I | R/A | C | I |
| Qualité et réclamations | A | I | R | I | I |
| Audit interne | A | R | C | R | I |

## 4. Procédures

### MP-01 — Gestion des accès et des comptes

**Objectif** : garantir que seules les personnes autorisées accèdent aux
ressources, avec le minimum de privilèges.

**Déclencheurs** : arrivée, changement de fonction, départ, incident, revue
trimestrielle.

**Étapes**
1. La direction valide le besoin et le niveau d'accès.
2. Créer un compte **nominatif** (jamais partagé).
3. Activer la 2FA avant le premier usage.
4. Attribuer le rôle minimal (`passenger`, `driver`, `admin`).
5. Consigner l'accès dans `ACCESS_REVIEW.md` (qui, quoi, pourquoi, date).
6. Au départ : révoquer les sessions, supprimer le compte, retirer les accès
   Supabase/Vercel/GitHub/Play/Gmail, changer les secrets partagés.
7. Revue trimestrielle : vérifier les comptes, les rôles, les accès plateformes.

**Preuves** : tableau d'accès à jour, capture de révocation, compte rendu de revue.

**Délai** : accès créé sous 1 jour ouvré ; retrait le jour du départ.

### MP-02 — Gestion des secrets et des clés

**Objectif** : empêcher la fuite et permettre la rotation rapide.

**Règles**
- Stockage uniquement dans Supabase Secrets / `.env` local ignoré.
- Aucun secret dans Git, ticket, email, WhatsApp, capture ou document.
- Le scan CI et `npm audit` ne doivent pas remonter de secret.
- Accès aux secrets limité à l'admin et à la direction.

**Rotation** : après départ, incident, fuite suspectée, changement de fournisseur
ou au moins une fois par an pour les secrets critiques.

**Procédure d'urgence**
1. Identifier les secrets exposés.
2. Créer les nouveaux dans Supabase Secrets.
3. Redéployer l'Edge Function.
4. Révoquer les anciens.
5. Vérifier les services (auth, SMS, paiement, emails).
6. Consigner dans le journal technique.

**Preuves** : liste des secrets (sans valeur) et date de dernière rotation.

### MP-03 — Changement et déploiement

**Objectif** : livrer sans casser la production.

**Étapes**
1. Créer une branche dédiée.
2. Développer et tester localement (`tsc`, build).
3. Ouvrir une pull request ; la CI doit passer (types, build, audit, secrets,
   CodeQL).
4. Vérifier sur preview si disponible.
5. Fusionner sur `main` ; Vercel et Supabase déploient automatiquement.
6. Vérifier le déploiement (santé, pages clés, logs).
7. Documenter dans `docs/CHANGELOG_TECHNIQUE.md` avec plan de rollback.
8. En cas d'échec : `git revert` du commit fautif, redéployer, vérifier.

**Interdits** : déployer un vendredi soir sans surveillance, modifier la
production manuellement sans trace, pousser un secret.

**Preuves** : PR, statut CI, journal technique, capture du déploiement vert.

### MP-04 — Sauvegarde et restauration

**Objectif** : pouvoir restaurer les données dans les délais annoncés.

**Sauvegarde** : automatique quotidienne à 02:00 (Kinshasa), bucket privé,
rétention 30 jours. Voir `BACKUPS.md`.

**Test mensuel**
1. Panneau admin → Sauvegardes → Tester la restauration.
2. Vérifier les 8 contrôles.
3. Noter la date, le résultat et l'alerte éventuelle.
4. Télécharger une copie hors site au moins une fois par semaine.

**Restauration réelle**
1. Arrêter les écritures.
2. Tester le backup sans écraser.
3. Restaurer (`scripts/restore-backup.mjs` ou support Supabase).
4. Vérifier les données (utilisateurs, courses, réservations, SOS).
5. Recréer les comptes auth si nécessaire (mots de passe non sauvegardés).
6. Documenter et informer.

**Preuves** : rapport de test, fichier de backup, journal de restauration.

### MP-05 — Gestion des incidents

**Objectif** : détecter, qualifier, contenir, corriger et apprendre.

La procédure complète est `PROCEDURE_INCIDENTS_ISO_27035.md`. En résumé :

1. Signaler immédiatement (téléphone + message).
2. Qualifier la gravité (S1–S4) sous 15 min.
3. Activer la cellule de crise si S1/S2.
4. Contenir, préserver les preuves, corriger.
5. Communiquer selon le plan de crise.
6. Post-mortem sous 72 h + actions.

**Preuves** : registre d'incident, journal de crise, post-mortem.

### MP-06 — Gestion des vulnérabilités et dépendances

**Objectif** : réduire la surface d'attaque.

**Routine**
- `npm audit` à chaque CI et mensuellement.
- Dependabot pour les mises à jour.
- CodeQL à chaque push et hebdomadaire.
- ZAP baseline hebdomadaire.
- Veille sur Supabase/Vercel/Android/Play.

**Délais de correction**
| Sévérité | Délai cible |
|---|---|
| Critique | 72 h |
| Haute | 7 jours |
| Moyenne | 30 jours |
| Basse | 90 jours |

**Exception** : une vulnérabilité non corrigeable doit être documentée avec
mesure compensatoire et date de réévaluation.

**Preuves** : rapport CI, ticket de correction, note d'exception.

### MP-07 — Gestion des prestataires

**Objectif** : maîtriser les risques liés aux tiers.

**Étapes**
1. Inventorier le fournisseur dans `SUBPROCESSORS.md`.
2. Vérifier le contrat, les conditions de sécurité et le DPA.
3. Vérifier la localisation des données et les obligations de notification.
4. Limiter les accès au strict nécessaire.
5. Revue annuelle : pertinence, sécurité, coût, sortie.
6. En fin de contrat : exporter les données, révoquer les accès, supprimer.

**Preuves** : contrat/DPA archivé, fiche fournisseur, compte rendu de revue.

### MP-08 — Demandes des personnes (données personnelles)

**Objectif** : répondre aux demandes d'accès, de rectification, d'opposition et
de suppression.

**Canaux** : `admin@smartcabb.com` ou formulaire de suppression de compte.

**Étapes**
1. Accuser réception sous 48 h.
2. Vérifier l'identité (compte, téléphone, email).
3. Identifier les données concernées.
4. Répondre dans le délai légal applicable (avec avis juridique si nécessaire).
5. Pour une suppression : supprimer le compte auth, le profil, les données KV
   associées et les jetons ; conserver uniquement les obligations légales
   (comptabilité, litiges) avec base légale.
6. Consigner la demande et la réponse (sans données sensibles).

**Preuves** : registre des demandes, réponse envoyée, capture de suppression.

### MP-09 — Administration des comptes admin

**Objectif** : sécuriser le pouvoir d'administration.

**Règles**
- Un seul admin applicatif au 28/11/2026 ; un second admin est recommandé.
- 2FA obligatoire, session 12 h, expiration d'inactivité.
- Jamais de partage de mot de passe ou de code 2FA.
- Toute action sensible (suppression, solde, config) est journalisée.

**Perte d'accès**
1. Utiliser `POST /admin/reset-admin-account` avec `ADMIN_CREATION_SECRET`.
2. Se reconnecter, vérifier la 2FA.
3. Consigner l'événement.

**Départ / suspicion**
1. Révoquer les sessions.
2. Changer le mot de passe et la 2FA.
3. Faire tourner les secrets.
4. Vérifier les journaux et les transactions.

**Preuves** : journal d'audit, capture de révocation, note d'incident.

### MP-10 — Journalisation et revue des logs

**Objectif** : détecter les anomalies et disposer de preuves.

**Routine mensuelle (15 min)**
1. Panneau admin → Journal d'audit : vérifier les actions récentes.
2. Santé système : backup < 26 h, test de restauration < 30 j.
3. Logs Supabase : filtrer `error`, `401`, `403`, `429`.
4. Vercel : builds en échec.
5. Auth : connexions échouées inhabituelles.
6. Noter la revue dans `LOG_POLICY.md`.

**Conservation** : `audit_logs` 90 jours ; logs plateformes selon l'offre ;
exporter avant purge en cas d'incident.

**Preuves** : tableau de revue rempli, captures des anomalies.

### MP-11 — Opérations terrain

**Objectif** : garantir une descente sur le terrain sûre, professionnelle et
traçable.

Utiliser `CHECKLIST_OPERATIONNELLE.md` avant, pendant et après chaque opération.
Points clés :

- vérifier l'identité et les documents du chauffeur/véhicule ;
- vérifier l'application, le GPS, les notifications et le SOS ;
- brief sécurité et contacts d'urgence ;
- protéger les données (pas de photo sans consentement) ;
- compter et rapprocher l'argent liquide ;
- consigner tout incident et revenir vers le support sous 24 h.

**Preuves** : check-list signée, photos autorisées, reçus, rapport d'opération.

### MP-12 — Réclamations et qualité

**Objectif** : traiter les réclamations et améliorer le service.

**Étapes**
1. Enregistrer la réclamation (canal, date, personne, course).
2. Accuser réception sous 24 h.
3. Qualifier : sécurité, paiement, retard, comportement, application.
4. Enquêter (logs, chauffeur, passager, preuves).
5. Répondre et proposer une solution (geste commercial selon barème).
6. Si non-conformité : action corrective (5 Pourquoi).
7. Clôturer sous 72 h ou informer du délai.
8. Analyser les tendances mensuellement.

**Preuves** : registre de réclamations, réponse, action corrective.

### MP-13 — Sensibilisation et onboarding

**Objectif** : rendre chacun capable d'appliquer les règles.

**Contenu minimal**
- politique de sécurité et charte qualité ;
- mots de passe/2FA et phishing ;
- protection des données et secret professionnel ;
- signalement d'incident et réflexes SOS ;
- check-list terrain ;
- gestes commerciaux et conduite professionnelle.

**Fréquence** : à l'arrivée, puis annuelle ; exercice de crise semestriel.

**Preuves** : feuille de présence, quiz, attestation.

### MP-14 — Audit interne et revue de direction

**Objectif** : vérifier que le système fonctionne et s'améliore.

**Audit interne annuel**
1. Définir le périmètre et l'échantillon.
2. Vérifier les preuves (accès, backups, incidents, fournisseurs, qualité).
3. Relever les écarts et les forces.
4. Rédiger un rapport et un plan d'action.

**Revue de direction annuelle**
- revue des incidents et des indicateurs ;
- revue des risques et des écarts CIS/ISO ;
- décisions de moyens ;
- mise à jour de la politique et des objectifs.

**Preuves** : rapport d'audit, compte rendu de revue, plan d'action.

## 5. Calendrier de conformité

| Fréquence | Activité | Responsable | Preuve |
|---|---|---|---|
| Quotidien | Vérifier santé système, backups, SOS, paiements | Admin/Support | Capture / journal |
| Hebdomadaire | Copie backup hors site, revue des alertes | Admin | Fichier + note |
| Mensuel | Revue logs, test de restauration, KPI qualité | Admin/Qualité | Rapports |
| Trimestriel | Revue des accès, revue des risques | Direction/Admin | `ACCESS_REVIEW.md` |
| Semestriel | Exercice de crise | Sécurité | Compte rendu |
| Annuel | Revue de direction, audit interne, revue fournisseurs, formation | Direction | Rapport |

## 6. Registres obligatoires

| Registre | Où | Conservation |
|---|---|---|
| Registre des accès | `ACCESS_REVIEW.md` | 3 ans |
| Registre des incidents | Gabarit SEC-INC-001 | 3 ans |
| Registre des réclamations | Support | 3 ans |
| Registre des demandes de données | Support | 3 ans |
| Registre des sauvegardes/restaurations | Panneau admin + `BACKUPS.md` | 1 an |
| Registre des fournisseurs | `SUBPROCESSORS.md` | durée du contrat + 3 ans |
| Journal technique | `CHANGELOG_TECHNIQUE.md` | permanent |

## 7. Approbation

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Rédigé par | Responsable sécurité / admin | 28/11/2026 | |
| Vérifié par | Direction | | |
| Approuvé par | Direction | | |

**Prochaine revue** : novembre 2027.
