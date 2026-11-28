# Politique de sécurité de l'information — SmartCabb

> **Réf.** : SEC-POL-001 · **Version** : 1.0 · **Date** : 28 novembre 2026
> **Propriétaire** : Direction SmartCabb · **Classification** : Interne
> **Périmètre** : société SmartCabb, application web et Android, API, base de
> données, prestataires, chauffeurs partenaires et opérations terrain.
> **Revue** : annuelle, ou après tout incident majeur / changement majeur.

## 1. Objet

Cette politique fixe les principes, les responsabilités et les règles minimales
de sécurité de l'information chez SmartCabb. Elle vise à :

- protéger les données des passagers, des chauffeurs et de l'entreprise ;
- garantir la disponibilité du service de transport et des paiements ;
- prévenir les fraudes, les accès non autorisés et les fuites de données ;
- préparer la réponse aux incidents et la continuité d'activité ;
- aligner progressivement SmartCabb sur **ISO/IEC 27001/27002**, les
  **CIS Controls v8.1** et les bonnes pratiques **OWASP**.

## 2. Portée

La politique s'applique à :

- **Actifs** : `smartcabb.com`, application Android `com.smartcabb.app`, Edge
  Function `make-server-2eb02e52`, base Supabase, stockage, comptes admin,
  sauvegardes, clés et secrets.
- **Personnes** : direction, administrateur, support, opérations terrain,
  développeurs/prestataires, chauffeurs partenaires.
- **Tiers** : Supabase, Vercel, EJ SMS, Ejpay, Google (Maps, FCM, Gmail SMTP),
  Google Play.
- **Données** : identité, téléphone, email, position GPS, trajets, paiements,
  soldes, photos, journaux OTP et journal d'audit.

## 3. Définitions

| Terme | Définition |
|---|---|
| **Actif** | Tout élément ayant de la valeur : service, donnée, compte, secret, appareil, document. |
| **Donnée personnelle** | Toute information se rapportant à une personne physique identifiée ou identifiable. |
| **Incident** | Événement réel ou suspecté compromettant la confidentialité, l'intégrité ou la disponibilité. |
| **Secret** | Mot de passe, clé API, jeton, certificat, code de secours. |
| **Moindre privilège** | Chaque personne ne dispose que des accès strictement nécessaires. |
| **Défense en profondeur** | Plusieurs couches de protection plutôt qu'une seule. |

## 4. Principes directeurs

1. **La sécurité est l'affaire de tous** : chaque intervenant signale une anomalie.
2. **Moindre privilège** : aucun accès permanent au-delà du nécessaire.
3. **Défense en profondeur** : authentification, autorisation, RLS, validation,
   journalisation, sauvegardes.
4. **Sécurité dès la conception** : la sécurité est intégrée aux évolutions,
   pas ajoutée après coup.
5. **Minimisation des données** : ne collecter et ne conserver que le nécessaire.
6. **Traçabilité** : les actions sensibles sont journalisées et attribuables.
7. **Continuité** : le service critique doit pouvoir redémarrer ou fonctionner
   en mode dégradé.
8. **Amélioration continue** : chaque incident et chaque audit produit une action.

## 5. Rôles et responsabilités

| Rôle | Responsabilités principales |
|---|---|
| **Direction** | Approuve la politique, alloue les moyens, arbitre les risques, préside la revue annuelle. |
| **Responsable sécurité** (peut être cumulé avec l'admin) | Maintient la politique, coordonne les incidents, suit les écarts, organise les revues. |
| **Administrateur technique** | Gère les comptes, secrets, sauvegardes, déploiements, accès Supabase/Vercel. |
| **Support / Opérations** | Applique les procédures, remonte les incidents, vérifie les chauffeurs et les véhicules. |
| **Développeurs / prestataires** | Respectent les règles de développement sécurisé et ne diffusent aucun secret. |
| **Chauffeurs partenaires** | Protègent les données de course, appliquent le code de conduite, signalent tout incident. |
| **Tout utilisateur** | Protège ses identifiants, signale toute anomalie, n'installe pas d'outil non autorisé. |

> Au 28/11/2026, SmartCabb fonctionne avec **un seul administrateur**. Ce risque
> de disponibilité est assumé et documenté ; une procédure de secours
> (`ADMIN_RESET_PASSWORD`) et un second administrateur sont recommandés.

## 6. Règles d'accès

- Les comptes sont **nominatifs** ; aucun compte partagé.
- La **2FA** est obligatoire pour les comptes d'administration :
  - applicatif SmartCabb : 2FA email + session serveur 12 h ;
  - Supabase, Vercel, GitHub, Play Console : 2FA activée.
- Les mots de passe font au moins **12 caractères** pour les comptes admin et
  sont uniques.
- Les accès sont revus **chaque trimestre** (`ACCESS_REVIEW.md`) et à chaque
  départ.
- Un accès est retiré le jour même du départ ou du changement de fonction.
- Les sessions admin sont révoquées en cas de doute (perte d'appareil, suspicion).

## 7. Gestion des secrets

- Les secrets vivent **uniquement** dans les secrets Supabase et, pour le local,
  dans un fichier `.env` ignoré par Git.
- **Interdit** : secret dans le code, dans un ticket, dans WhatsApp, dans un
  document partagé ou dans une capture d'écran.
- Le dépôt est scanné en CI pour détecter les secrets.
- Rotation obligatoire : après un départ, un incident, une fuite suspectée ou
  une compromission de fournisseur.
- Les secrets concernés : `ADMIN_CREATION_SECRET`, `ADMIN_RESET_PASSWORD`,
  `CRON_SECRET`, `SMTP_PASSWORD`, `EJSMS_*`, `EJPAY_*`, `SUPABASE_SERVICE_ROLE_KEY`.

## 8. Protection des données personnelles

- Collecte limitée au strict nécessaire (identité, téléphone, position pendant
  la course, paiement).
- TLS obligatoire pour tous les échanges ; aucune donnée sensible en clair.
- RLS activée sur les tables sensibles ; la clé `service_role` reste serveur.
- Les positions GPS et historiques ne sont visibles que des participants et des
  admins, selon les règles documentées dans `SECURITY.md`.
- Les journaux ne contiennent **jamais** de mot de passe, OTP, numéro de carte
  ou identifiant Mobile Money complet.
- Les demandes d'accès, de rectification et de suppression suivent la procédure
  `MANUEL_PROCEDURES_INTERNES.md` (MP-08) et les délais légaux applicables.
- Les sauvegardes sont chiffrées lorsque `BACKUP_ENCRYPTION_KEY` est activé ; la
  clé est conservée hors Supabase.
- Toute violation de données est traitée comme un incident (SEC-INC-001) et
  notifiée selon les obligations légales, après avis juridique.

## 9. Sécurité des développements et des changements

- Toute évolution passe par une branche, une revue et la CI
  (`tsc`, build, audit dépendances, scan de secrets, CodeQL).
- Aucun déploiement direct en production sans build réussi.
- Les routes sensibles sont protégées côté **serveur** ; la sécurité côté client
  n'est jamais suffisante.
- Les entrées sont validées ; les erreurs renvoyées sont génériques.
- Les dépendances sont suivies (Dependabot, `npm audit`) ; une vulnérabilité
  critique est traitée sous **72 h**, une haute sous **7 jours**.
- Un changement majeur est documenté dans `docs/CHANGELOG_TECHNIQUE.md` avec un
  plan de rollback.

## 10. Postes de travail et mobiles

- Verrouillage automatique, mises à jour système, chiffrement du disque si
  disponible.
- Aucun accès admin depuis un appareil non maîtrisé ou un réseau public non
  sécurisé.
- Les téléphones utilisés pour l'administration doivent avoir un code de
  déverrouillage et la 2FA.
- En cas de perte ou de vol : révoquer les sessions, changer les mots de passe,
  signaler l'incident.

## 11. Sécurité physique et opérations terrain

- Les documents chauffeurs (permis, carte grise, assurance) sont vérifiés avant
  mise en service.
- Les véhicules sont contrôlés selon la check-list opérationnelle.
- L'argent liquide est compté, reçu et rapproché ; aucun encaissement sans
  justificatif.
- Les données de course ne sont ni photographiées ni partagées sur les réseaux
  sociaux.
- En cas d'accident, d'agression ou de danger : priorité à la sécurité des
  personnes, puis SOS et forces de l'ordre si nécessaire.

## 12. Gestion des tiers

- Chaque fournisseur critique est inventorié (`SUBPROCESSORS.md`).
- Un DPA ou des clauses de sécurité sont archivés pour Supabase, Vercel, EJ SMS,
  Ejpay et Google.
- Les accès fournisseurs sont limités et révoqués en fin de contrat.
- Une revue annuelle vérifie la pertinence, la localisation des données et les
  obligations de notification.

## 13. Gestion des incidents

- Tout incident est signalé **immédiatement** (au plus tard 30 minutes) au
  responsable sécurité ou à l'administrateur.
- La procédure complète est `PROCEDURE_INCIDENTS_ISO_27035.md` ; la fiche
  reflexe terrain est `INCIDENT_CARD.md`.
- Les incidents S1 (critiques) déclenchent la cellule de crise
  (`PLAN_GESTION_CRISE.md`).
- Aucun incident ne doit être « étouffé » : un incident mal géré coûte toujours
  plus cher qu'un incident signalé.

## 14. Sensibilisation et formation

- Chaque nouvel arrivant reçoit cette politique et les consignes de sécurité.
- Une sensibilisation annuelle couvre : mots de passe/2FA, phishing, protection
  des données, signalement d'incident, sécurité terrain.
- Les exercices de crise et de restauration sont l'occasion de former les équipes.
- Les manquements répétés peuvent entraîner un rappel, un retrait d'accès ou des
  mesures contractuelles/disciplinaires.

## 15. Continuité et sauvegardes

- Sauvegarde automatique quotidienne à 02:00 (Kinshasa), rétention 30 jours.
- Test de restauration au moins **une fois par mois**.
- Copie hors site hebdomadaire recommandée.
- Objectifs : **RTO 4 heures**, **RPO 24 heures** pour les données critiques.
- Le plan de crise détaille les scénarios et les modes dégradés.

## 16. Conformité, audit et amélioration

- Revue annuelle de la politique et des procédures.
- Audit interne annuel (documentation + échantillon de preuves).
- Suivi des écarts CIS/ISO dans `CIS_NIVEAUX_1_2.md` et
  `CADRE_ISO_27001_27002.md`.
- Les indicateurs sont revus en revue de direction.
- Toute exception à la politique doit être **écrite, justifiée, limitée dans le
  temps et approuvée** par la direction.

## 17. Sanctions

Le non-respect de cette politique peut entraîner, selon la gravité :

- un rappel oral ou écrit ;
- une formation obligatoire ;
- un retrait temporaire ou définitif des accès ;
- des mesures disciplinaires prévues par le contrat de travail ;
- la résiliation du contrat du prestataire ou du chauffeur partenaire ;
- des poursuites civiles ou pénales en cas d'infraction.

## 18. Approbation et révision

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Rédigé par | Responsable sécurité / admin | 28/11/2026 | |
| Vérifié par | Direction | | |
| Approuvé par | Direction | | |

**Prochaine revue** : novembre 2027, ou immédiatement après un incident majeur,
un changement de prestataire critique ou une évolution réglementaire.

## 19. Documents associés

- `docs/security/PLAN_GESTION_CRISE.md`
- `docs/security/MANUEL_PROCEDURES_INTERNES.md`
- `docs/security/PROCEDURE_INCIDENTS_ISO_27035.md`
- `docs/security/CHECKLIST_OPERATIONNELLE.md`
- `docs/quality/CHARTE_QUALITE_SERVICE.md`
- `docs/SECURITY.md`
- `docs/BACKUPS.md`
- `docs/security/INCIDENT_CARD.md`
- `docs/security/ACCESS_REVIEW.md`
- `docs/security/LOG_POLICY.md`
- `docs/security/SUBPROCESSORS.md`
