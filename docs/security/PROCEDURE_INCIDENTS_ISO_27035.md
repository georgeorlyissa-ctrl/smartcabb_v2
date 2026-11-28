# Procédure de gestion des incidents de sécurité — ISO/IEC 27035

> **Réf.** : SEC-INC-001 · **Version** : 1.0 · **Date** : 28 novembre 2026
> **Propriétaire** : Responsable sécurité · **Classification** : Interne
> **Périmètre** : tous les actifs SmartCabb (web, Android, API, base, comptes,
> sauvegardes, fournisseurs, opérations terrain).
> **Revue** : annuelle + après chaque incident S1/S2.

> **Fiche reflexe** : en situation d'urgence, utiliser d'abord
> `INCIDENT_CARD.md` (1 page). Cette procédure est le cadre complet.

## 1. Objet

Définir un dispositif de **détection, signalement, qualification, traitement,
communication et suivi** des incidents de sécurité de l'information, aligné sur
les phases d'ISO/IEC 27035 :

1. Préparer.
2. Détecter et signaler.
3. Évaluer et décider.
4. Répondre.
5. Apprendre.

## 2. Définitions

| Terme | Définition |
|---|---|
| **Événement** | Fait observable sans impact avéré (ex. tentative de connexion échouée). |
| **Incident** | Événement compromettant ou susceptible de compromettre la confidentialité, l'intégrité ou la disponibilité. |
| **Violation de données** | Incident entraînant une fuite, une perte ou un accès non autorisé à des données personnelles. |
| **Incident majeur (S1/S2)** | Incident nécessitant la cellule de crise. |
| **Preuve** | Élément permettant de reconstituer les faits (log, capture, horodatage, témoignage). |

## 3. Rôles

| Rôle | Responsabilités |
|---|---|
| **Détecteur** (tout utilisateur) | Signale sans délai, ne supprime rien, note l'heure et les faits. |
| **Responsable sécurité** | Qualifie, coordonne, tient le registre, préserve les preuves. |
| **Incident manager** | Dirige la réponse opérationnelle (peut être l'admin technique). |
| **Admin technique** | Diagnostic, containment, correction, restauration. |
| **Support / Opérations** | Informe les utilisateurs/chauffeurs, gère les courses en cours. |
| **Communication** | Messages internes/externes, veille médias. |
| **Direction** | Décide, arbitre, autorise les actions majeures, parle au nom de SmartCabb. |
| **Juridique / DPO** | Évalue les obligations légales et la notification. |

## 4. Niveaux de gravité

| Niveau | Critères | Délai d'accusé | Délai de qualification | Cellule de crise |
|---|---|---|---|---|
| **S1 — Critique** | Service indisponible > 30 min, fuite de données, compromission admin, danger de mort, perte de données majeure. | 15 min | 1 h | Oui, immédiate |
| **S2 — Majeur** | Fonction clé dégradée (paiement, SOS, OTP, matching), impact significatif. | 30 min | 2 h | Oui, si > 2 h |
| **S3 — Mineur** | Fonction secondaire dégradée, contournement possible. | 2 h | 8 h | Non |
| **S4 — Information** | Anomalie sans impact, à surveiller. | 24 h | 48 h | Non |

Exemples S1 : base inaccessible, admin compromis, fuite de numéros/trajets,
paiement détourné, accident grave.
Exemples S2 : SMS HS, Ejpay HS, carte HS, OTP non délivrés.
Exemples S3 : notification push en retard, export CSV en erreur.
Exemples S4 : alerte de dépendance, erreur isolée.

## 5. Détection et signalement

### 5.1 Sources de détection

- alertes automatiques (backup, 5xx, restauration, santé système) ;
- signalement d'un passager, chauffeur, partenaire ;
- support (téléphone, WhatsApp, email) ;
- surveillance des réseaux sociaux et avis Play Store ;
- revue des logs (`audit_logs`, Supabase, Vercel) ;
- audit, scan de vulnérabilités, exercice ;
- notification d'un fournisseur.

### 5.2 Canaux de signalement

| Canal | Usage | Responsable |
|---|---|---|
| Téléphone support `+243 960 624 008` | Urgence immédiate | Support |
| `admin@smartcabb.com` | Signalement écrit | Admin |
| Panneau admin → Santé système | Alerte technique | Admin |
| Appel direct direction/admin | S1/S2 | Tous |

**Règle d'or** : en cas de doute, signaler. Un faux positif est moins coûteux
qu'un incident ignoré.

### 5.3 Informations à recueillir

- date et heure (fuseau Kinshasa) ;
- qui signale et comment être rappelé ;
- ce qui ne fonctionne pas (message exact, capture) ;
- services et personnes impactés ;
- données personnelles ou argent potentiellement concernés ;
- actions déjà effectuées.

## 6. Évaluation et décision

### 6.1 Questions de triage

1. **Quoi** ? Nature de l'incident (disponibilité, intégrité, confidentialité,
   fraude, sécurité physique).
2. **Qui** ? Utilisateurs, chauffeurs, admins, fournisseurs concernés.
3. **Combien** ? Nombre de personnes, de courses, de transactions.
4. **Où** ? Web, Android, API, base, SMS, paiement, terrain.
5. **Quand** ? Début, détection, dernière action connue.
6. **Gravité** ? S1–S4 selon la matrice.
7. **Urgence** ? Danger pour les personnes, perte imminente, propagation.
8. **Preuves** ? Logs, captures, transactions, témoignages.

### 6.2 Décision

- **S1/S2** : déclarer l'incident, activer la cellule de crise
  (`PLAN_GESTION_CRISE.md`), ouvrir un journal de crise.
- **S3/S4** : traiter dans le flux normal, avec registre et suivi.
- **Doute** : retenir la gravité la plus élevée jusqu'à preuve du contraire.

## 7. Réponse

### 7.1 Phases

1. **Contenir** : limiter la propagation (révoquer, désactiver, isoler, bloquer).
2. **Préserver** : exporter les logs, captures, horodatage, ne rien supprimer.
3. **Éradiquer** : corriger la cause (patch, rotation, suppression de compte).
4. **Rétablir** : restaurer le service, vérifier les données, surveiller.
5. **Communiquer** : selon le plan de crise.
6. **Apprendre** : post-mortem et actions.

### 7.2 Playbooks synthétiques

#### Compte compromis

1. Révoquer les sessions et changer le mot de passe.
2. Révoquer la 2FA serveur et reconnecter.
3. Vérifier les actions récentes (`audit_logs`, logs Edge).
4. Faire tourner les secrets exposés.
5. Geler les opérations sensibles.

#### Fuite de données

1. Couper la source (route, bucket, clé, compte).
2. Identifier les données et les personnes concernées.
3. Préserver les preuves.
4. Évaluer la notification avec le juridique.
5. Informer les personnes si nécessaire.
6. Corriger la cause et renforcer le contrôle.

#### Perte / corruption de données

1. Arrêter les écritures.
2. Tester le backup sans écraser.
3. Restaurer (`BACKUPS.md`).
4. Vérifier les données et les comptes.
5. Documenter.

#### Fraude paiement

1. Suspendre les retraits/credits suspects.
2. Rapprocher les transactions.
3. Contacter Ejpay.
4. Geler les comptes concernés.
5. Corriger la validation.

#### Panne fournisseur (SMS, paiement, carte)

1. Vérifier le statut fournisseur.
2. Activer le mode dégradé.
3. Informer les utilisateurs.
4. Rejouer les opérations après rétablissement.

#### Accident / SOS

1. Secours immédiats.
2. Appeler chauffeur/passager.
3. Prévenir la direction.
4. Conserver les preuves.
5. Accompagner les familles/autorités.

## 8. Preuves et chaîne de conservation

- Exporter les logs **avant** purge ou redéploiement.
- Noter l'heure, la source, l'outil et la personne qui a exporté.
- Stocker les preuves dans un dossier dédié, accès limité.
- Ne pas modifier les fichiers originaux ; travailler sur copie.
- Calculer une empreinte (SHA-256) pour les fichiers critiques si nécessaire.
- Conserver jusqu'à clôture + délai légal (minimum 3 ans pour les incidents
  majeurs).

## 9. Communication et notification

### 9.1 Interne

- Direction et cellule de crise : immédiat.
- Support/opérations : dès que l'impact est connu.
- Tous : message factuel, sans spéculation.

### 9.2 Externe

| Public | Quand | Canal | Responsable |
|---|---|---|---|
| Utilisateurs impactés | Dès que l'impact est confirmé | App/SMS/email/réseaux | Communication |
| Chauffeurs | Si l'activité est impactée | SMS/appel | Opérations |
| Fournisseurs | Si leur service est en cause | Email/téléphone dédié | Admin |
| Autorités | Si obligation légale | Canal officiel | Direction/Juridique |
| Médias | Si crise publique | Message unique | Direction |

### 9.3 Violation de données personnelles

1. Qualifier : nature, volume, sensibilité, conséquences.
2. Consulter le juridique sur l'obligation et le délai de notification.
3. Notifier les personnes concernées si nécessaire, avec des faits vérifiés.
4. Documenter la décision et les mesures.
5. Conserver les preuves.

> Les obligations exactes (autorité, délai, contenu) doivent être confirmées
> avec un conseil juridique au regard du Code du numérique (RDC) et des textes
> applicables.

## 10. Clôture et apprentissage

Un incident est clos lorsque :

- le service est rétabli et stable ;
- les données sont vérifiées ;
- les personnes concernées ont été informées ;
- les preuves sont archivées ;
- les actions correctives sont créées.

**Post-mortem sous 72 h** (S1/S2) :

1. Chronologie.
2. Cause racine (5 Pourquoi).
3. Impact (personnes, données, argent, réputation).
4. Ce qui a bien fonctionné / ce qui a manqué.
5. Actions correctives (responsable, échéance).
6. Mise à jour des procédures et du journal technique.

## 11. Registre des incidents (modèle)

| Champ | Contenu |
|---|---|
| ID | INC-AAAA-MM-JJ-XX |
| Date/heure de détection | |
| Détecté par | |
| Description | |
| Gravité | S1/S2/S3/S4 |
| Services impactés | |
| Données/personnes concernées | |
| Actions immédiates | |
| Cellule activée | Oui/Non |
| Communication | |
| Cause racine | |
| Actions correctives | |
| Date de clôture | |
| Post-mortem | Lien |

## 12. Indicateurs

| Indicateur | Cible |
|---|---|
| Temps moyen de détection (MTTD) | < 30 min (S1) |
| Temps moyen d'accusé (MTTA) | < 15 min (S1) |
| Temps moyen de rétablissement (MTTR) | < 4 h (S1) |
| Incidents S1 avec post-mortem < 72 h | 100 % |
| Actions correctives clôturées < 30 j | ≥ 90 % |
| Incidents récurrents | 0 |
| Exercices de crise réalisés | 2/an |

## 13. Tests et formation

- **Tabletop** semestriel : scenario de fuite, panne, fraude ou accident.
- **Test de restauration** mensuel.
- **Simulation de phishing** annuelle (si messagerie).
- **Formation** annuelle et à l'arrivée.
- **Revue** de la procédure après chaque exercice ou incident majeur.

## 14. Documents associés

- `INCIDENT_CARD.md` — fiche reflexe 1 page.
- `PLAN_GESTION_CRISE.md` — cellule, communication, continuité.
- `POLITIQUE_SECURITE.md` — principes et rôles.
- `MANUEL_PROCEDURES_INTERNES.md` — MP-05.
- `BACKUPS.md` — restauration.
- `LOG_POLICY.md` — journalisation.
- `EMERGENCY_SOS.md` — dispositif SOS.

## 15. Approbation

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Rédigé par | Responsable sécurité / admin | 28/11/2026 | |
| Vérifié par | Direction | | |
| Approuvé par | Direction | | |

**Prochaine revue** : novembre 2027, ou après un incident S1/S2.
