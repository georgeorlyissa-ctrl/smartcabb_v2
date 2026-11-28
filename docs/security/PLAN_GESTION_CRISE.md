# Plan de gestion de crise — SmartCabb

> **Réf.** : SEC-CRI-001 · **Version** : 1.0 · **Date** : 28 novembre 2026
> **Propriétaire** : Direction SmartCabb · **Classification** : Interne
> **Revue** : annuelle + exercice semestriel
> **Documents liés** : `PROCEDURE_INCIDENTS_ISO_27035.md`, `INCIDENT_CARD.md`,
> `BACKUPS.md`, `EMERGENCY_SOS.md`.

## 1. Objet

Ce plan décrit comment SmartCabb organise la réponse à une crise : qui décide,
qui fait quoi, comment communiquer, comment rétablir le service et comment
tirer les leçons. Il complète la procédure incident (ISO 27035) par une
organisation de **direction de crise** et de **continuité d'activité**.

Une crise est un événement qui :

- menace gravement la sécurité des personnes, des données ou des paiements ;
- empêche durablement l'activité (application, matching, paiement, SOS) ;
- peut avoir un impact réputationnel, juridique ou financier majeur ;
- nécessite une coordination au-delà du support habituel.

## 2. Périmètre et scénarios

| Famille | Exemples |
|---|---|
| **Cyber** | compromission d'un compte admin, fuite de données, rançongiciel, injection, attaque par déni de service. |
| **Indisponibilité** | panne Vercel, panne Supabase, panne Edge Function, panne DNS, expiration de certificat. |
| **Paiements** | panne Ejpay, webhook compromis, fraudes, soldes incohérents, retraits bloqués. |
| **SMS / OTP** | panne EJ SMS, OTP non reçus, blocage des inscriptions/connexions. |
| **Cartes / notifications** | panne Google Maps, FCM, géolocalisation, suivi de course. |
| **Données** | perte, corruption, suppression accidentelle, restauration impossible. |
| **Terrain** | accident grave, agression, enlèvement, décès, incident SOS majeur. |
| **Interne** | départ conflictuel, fraude interne, abus de privilège, perte d'appareil. |
| **Réputation / juridique** | bad buzz, plainte médiatique, mise en cause, contrôle administratif. |

## 3. Cellule de crise

La cellule est activée par le directeur de crise (ou son suppléant) dès qu'un
incident est classé **S1** ou que deux incidents S2 sont simultanés.

| Fonction | Mission | Titulaire | Suppléant | Téléphone |
|---|---|---|---|---|
| **Directeur de crise** | Décide, arbitre, autorise les actions majeures, parle au nom de SmartCabb. | Direction | Admin technique | |
| **Responsable technique** | Diagnostic, containment, correction, restauration, coordination Supabase/Vercel. | Admin technique | Prestataire/dev | |
| **Responsable sécurité** | Qualifie l'incident, préserve les preuves, suit la procédure ISO 27035. | Admin/Sécurité | Direction | |
| **Opérations / Support** | Informe les chauffeurs, gère les courses en cours, remonte le terrain. | Support | Opérations | |
| **Communication** | Rédige et diffuse les messages internes/externes, surveille les réseaux. | Direction/Support | Community manager | |
| **Juridique / données personnelles** | Évalue les obligations légales, la notification, les contrats. | Conseil externe | Direction | |
| **Logistique** | Salle/visio, moyens de secours, carburant, cash, documents. | Opérations | Support | |

> **Règle** : une seule personne parle au nom de SmartCabb. Les autres
> intervenants redirigent les demandes vers la communication.

## 4. Niveaux de gravité

| Niveau | Nom | Critères | Délai de réaction | Exemples |
|---|---|---|---|---|
| **S1** | Critique | Service totalement indisponible > 30 min, fuite de données, paiement compromis, danger de mort, perte de données majeure. | Immédiat (< 15 min) | Base inaccessible, admin compromis, accident grave. |
| **S2** | Majeur | Fonction clé dégradée (paiement, SOS, OTP, matching), impact limité mais significatif. | < 30 min | SMS HS, Ejpay HS, carte HS. |
| **S3** | Mineur | Fonction secondaire dégradée, contournement possible, impact faible. | < 2 h | Notification push en retard, export CSV en erreur. |
| **S4** | Information | Anomalie sans impact utilisateur, à surveiller. | < 24 h | Alerte de dépendance, erreur isolée. |

La gravité peut évoluer à la hausse ou à la baisse. Toute hausse est validée par
le directeur de crise.

## 5. Déclenchement et escalade

1. **Détection** : alerte automatique, signalement utilisateur/chauffeur, support,
   fournisseur, audit, réseaux sociaux.
2. **Alerte** : appel + message au responsable sécurité et à l'admin technique.
3. **Qualification** (< 15 min) : nature, périmètre, données concernées, personnes
   en danger, service impacté.
4. **Décision** : S1/S2 → activation de la cellule ; S3/S4 → traitement normal.
5. **Notification** : direction, support, partenaires concernés, autorités si
   nécessaire.
6. **Main courante** : chaque décision, heure et action est notée dans le journal
   de crise.

### Matrice d'escalade

| Situation | Qui alerte | Qui décide | Qui informe |
|---|---|---|---|
| Fuite de données suspectée | Admin/Sécurité | Direction | Juridique + utilisateurs concernés |
| Application inaccessible | Support | Admin technique | Direction + communication |
| Paiement suspect | Admin/Finance | Direction | Ejpay + utilisateurs concernés |
| Accident/SOS grave | Support/Chauffeur | Direction | Forces de l'ordre + familles |
| Bad buzz | Communication | Direction | Réseaux + partenaires |

## 6. Salle de crise et outils

- **Lieu** : bureau SmartCabb ou visioconférence (lien envoyé par la direction).
- **Canal alternatif** : appel téléphonique/SMS si l'application ou l'email est
  indisponible.
- **Dossier de crise** : un dossier partagé (hors application) contenant :
  - journal de crise ;
  - liste des contacts ;
  - captures et logs exportés ;
  - décisions et messages.
- **Source de vérité** : le journal de crise. Les messages publics s'appuient
  uniquement sur des faits vérifiés.

## 7. Playbooks par scénario

### 7.1 Compromission d'un compte admin

1. Révoquer les sessions Supabase et changer le mot de passe admin.
2. Révoquer la session 2FA serveur (`admin_2fa_session:*`) et reconnecter.
3. Vérifier `audit_logs`, logs Edge Functions, connexions Supabase.
4. Faire tourner `ADMIN_CREATION_SECRET`, `CRON_SECRET`, `ADMIN_RESET_PASSWORD`,
   `SMTP_PASSWORD`, clés EJ SMS/Ejpay si exposées.
5. Geler les opérations sensibles (soldes, suppressions) jusqu'à clarification.
6. Documenter et informer la direction.

### 7.2 Fuite de données personnelles

1. Confirmer la nature des données et le nombre de personnes concernées.
2. Couper la source (route, bucket, clé, compte).
3. Préserver les preuves (logs, captures, horodatage).
4. Évaluer l'obligation de notification (juridique).
5. Informer les personnes concernées si nécessaire, avec des faits vérifiés.
6. Renforcer le contrôle à l'origine de la fuite.

### 7.3 Indisponibilité Vercel / Supabase

1. Vérifier les statuts publics et les dashboards.
2. Identifier si le dernier déploiement est en cause ; rollback si oui.
3. Redéployer l'Edge Function si nécessaire.
4. Basculer en mode dégradé : support téléphonique, prise de commande manuelle,
   paiement espèces, journal papier.
5. Communiquer un message factuel et une heure de prochaine mise à jour.

### 7.4 Panne de paiement (Ejpay)

1. Suspendre les nouvelles demandes de paiement Mobile Money si nécessaire.
2. Proposer les modes alternatifs (espèces, portefeuille SmartCabb).
3. Rapprocher les transactions en cours ; ne jamais recréditer sans preuve.
4. Contacter Ejpay et documenter les références concernées.
5. Informer les utilisateurs impactés.

### 7.5 Panne SMS / OTP

1. Vérifier EJ SMS (statut, crédits, webhook).
2. Proposer une procédure de secours (vérification manuelle encadrée) sans
   affaiblir durablement la sécurité.
3. Limiter les inscriptions si nécessaire et communiquer.
4. Rejouer les OTP non délivrés après rétablissement.

### 7.6 Accident grave / SOS

1. Priorité absolue : secours (SAMU/police/pompiers) et mise en sécurité.
2. Appeler le chauffeur et le passager ; recueillir position et état.
3. Prévenir la direction et le support ; activer la cellule si nécessaire.
4. Conserver les preuves (course, position, messages, témoignages).
5. Accompagner les familles et les autorités ; éviter toute communication
   prématurée.

### 7.7 Perte ou corruption de données

1. **Arrêter les écritures** et ne rien supprimer.
2. Tester le dernier backup (sans écraser les données).
3. Restaurer selon `BACKUPS.md` ; vérifier les données restaurées.
4. Identifier la cause racine et corriger.
5. Informer les utilisateurs si des données personnelles sont concernées.

### 7.8 Crise réputationnelle / médias

1. Ne pas répondre à chaud ; recueillir les faits.
2. Publier un message court : reconnaissance, enquête en cours, prochaine mise à jour.
3. Désigner un porte-parole unique.
4. Ne jamais divulguer de données personnelles ni spéculer.
5. Faire un bilan et corriger la cause.

## 8. Communication de crise

### 8.1 Principes

- **Une seule voix** : la communication officielle vient de la direction.
- **Faits vérifiés** : pas de spéculation, pas de promesse non tenue.
- **Rapidité** : première prise de parole < 60 min pour un S1, même courte.
- **Empathie** : reconnaître l'impact pour les personnes.
- **Régularité** : mise à jour toutes les 60–120 min tant que la crise dure.

### 8.2 Canaux

| Public | Canal | Responsable |
|---|---|---|
| Équipe interne | Appel/SMS + email | Direction |
| Chauffeurs | Notification app + SMS + appel | Opérations |
| Passagers impactés | Notification app + SMS + réseaux | Communication |
| Partenaires (Ejpay, EJ SMS, Supabase) | Email/téléphone dédié | Admin technique |
| Autorités | Canal officiel + courrier | Direction/Juridique |
| Médias/réseaux | Message public + réponses | Communication |

### 8.3 Modèle de message initial

> **Objet** : Incident en cours chez SmartCabb — information
>
> Nous rencontrons actuellement un incident affectant [service]. Nos équipes sont
> mobilisées pour rétablir la situation au plus vite. Nous vous communiquerons
> une nouvelle information à [heure]. Pour toute urgence, contactez le
> [+243 960 624 008]. Nous vous remercions de votre compréhension.

### 8.4 Modèle de clôture

> **Objet** : Retour à la normale — [service]
>
> Le service [service] est rétabli depuis [heure]. Nous avons identifié la cause
> [cause factuelle] et mis en place [mesure]. Un suivi est en cours. Nous
> remercions les personnes impactées et restons disponibles au [numéro].

## 9. Continuité d'activité et modes dégradés

### 9.1 Objectifs

| Processus critique | RTO | RPO | Mode dégradé |
|---|---|---|---|
| Création/suivi de course | 4 h | 24 h | Prise de commande téléphonique + journal papier |
| Matching chauffeur | 4 h | 24 h | Attribution manuelle par le support |
| Paiement Mobile Money | 24 h | 24 h | Espèces / portefeuille / encaissement manuel avec reçu |
| SOS | 15 min | Temps réel | Appel direct + procédure téléphonique |
| Admin / gestion | 8 h | 24 h | Accès direct Supabase encadré par l'admin |
| Sauvegardes | 24 h | 24 h | Backup précédent + copie hors site |

> RTO = délai cible de rétablissement ; RPO = perte de données maximale acceptée.
> Ces valeurs sont des objectifs internes à valider par la direction.

### 9.2 Moyens de secours

- Téléphones de secours et batteries externes.
- Liste de contacts imprimée (direction, support, chauffeurs clés, fournisseurs).
- Numéros directs Supabase/Vercel/EJ SMS/Ejpay.
- Fonds de caisse et reçus manuels.
- Accès hors ligne aux documents essentiels (procédures, check-lists).

## 10. Fin de crise

La crise est déclarée terminée lorsque :

- le service est rétabli et stable depuis au moins 1 heure ;
- les données sont vérifiées ;
- les personnes impactées ont été informées ;
- les risques résiduels sont sous contrôle.

Puis :

1. Désactiver la cellule de crise.
2. Consigner la chronologie et les décisions.
3. Rédiger un **post-mortem** sous 72 h (cause racine, impact, actions).
4. Créer des actions correctives avec responsable et échéance.
5. Mettre à jour les procédures et le journal technique.

## 11. Exercices et tests

| Exercice | Fréquence | Responsable | Preuve |
|---|---|---|---|
| Test de restauration | Mensuel | Admin | Rapport du panneau admin |
| Exercice tabletop (scénario) | Semestriel | Responsable sécurité | Compte rendu + actions |
| Test de révocation admin | Annuel | Admin | Compte rendu |
| Simulation de panne fournisseur | Annuel | Admin/Support | Compte rendu |
| Revue du plan | Annuel | Direction | Version approuvée |

## 12. Annexes

### 12.1 Contacts

| Ressource | Contact |
|---|---|
| Support SmartCabb | +243 960 624 008 · `admin@smartcabb.com` |
| Direction | à compléter |
| Admin technique | à compléter |
| Supabase | dashboard + support |
| Vercel | dashboard + support |
| EJ SMS | contrat / contact commercial |
| Ejpay | contrat / contact commercial |
| Police / SAMU / pompiers (RDC) | numéros locaux à afficher au bureau |

### 12.2 Journal de crise (modèle)

| Heure | Source | Fait constaté | Décision | Responsable | Statut |
|---|---|---|---|---|---|
| | | | | | |

### 12.3 Décisions (modèle)

| Heure | Décision | Justification | Validée par |
|---|---|---|---|
| | | | |

## 13. Approbation

| Rôle | Nom | Date | Signature |
|---|---|---|---|
| Rédigé par | Responsable sécurité / admin | 28/11/2026 | |
| Vérifié par | Direction | | |
| Approuvé par | Direction | | |

**Prochaine revue** : novembre 2027, ou après un exercice / incident majeur.
