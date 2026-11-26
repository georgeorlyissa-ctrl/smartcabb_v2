# Sous-traitants et fournisseurs — SmartCabb

> Répond au contrôle **CIS 15** (gestion des prestataires) et prépare le volet
> « sous-traitants » d'ISO 27701.
> Dernière mise à jour : 26 novembre 2026.

## Tableau des sous-traitants

| Fournisseur | Rôle | Données traitées | Localisation | Contrat / sécurité |
|---|---|---|---|---|
| **Supabase** | base PostgreSQL, auth, stockage, Edge Functions | toutes les données métier (comptes, courses, paiements, photos, logs) | selon la région du projet (à confirmer : `Settings → Infrastructure`) | DPA Supabase — à télécharger et archiver |
| **Vercel** | hébergement web, CDN, déploiements | requêtes HTTP, logs techniques, build | réseau edge mondial (nœuds UE/US) | DPA Vercel — à télécharger et archiver |
| **EJ SMS (EJSARL)** | envoi de SMS et codes OTP | numéro de téléphone, contenu du message | RDC | contrat commercial — à vérifier (conservation, sécurité) |
| **Ejpay** | encaissement Mobile Money | montant, numéro, référence de paiement | RDC / Afrique | contrat marchand — signature HMAC vérifiée côté webhook |
| **Google — Gmail SMTP** | emails transactionnels (OTP admin, alertes) | adresse email destinataire, contenu | international | conditions Google Workspace |
| **Google — Maps / FCM** | cartes, géocodage, notifications push | coordonnées, jetons d'appareil | international | conditions Google APIs |
| **Google Play** | distribution Android | métadonnées de l'app, rapports de crash | international | accord développeur |

## Ce que SmartCabb doit pouvoir prouver

Pour chaque fournisseur, garder (dans un dossier, pas dans le dépôt) :

1. le **contrat** ou les conditions d'utilisation acceptées, avec date ;
2. le **DPA** (accord de traitement des données) quand il existe ;
3. la **localisation** des données (région) ;
4. la **procédure de fin de contrat** : export des données puis suppression ;
5. le **canal de contact sécurité** (en cas de fuite chez le fournisseur).

## Responsabilités (modèle de responsabilité partagée)

| Sujet | Supabase | SmartCabb |
|---|---|---|
| Disponibilité de la base | ✅ | surveille (alertes, santé système) |
| Chiffrement au repos / en transit | ✅ | utilise TLS, ne stocke pas de secrets en clair |
| RLS et règles d'accès | fournit l'outil | ✅ définit les policies |
| Sauvegardes | option payante (PITR) | ✅ backup applicatif quotidien + test de restauration |
| Comptes admin | fournit l'auth | ✅ 2FA, comptes nominatifs |
| Fuite de données chez le fournisseur | notifie | informe les utilisateurs si nécessaire |

## Revue annuelle

Une fois par an (ou à chaque changement majeur) :

- vérifier que chaque fournisseur est toujours utilisé ;
- vérifier la région d'hébergement et les éventuels transferts hors RDC ;
- relire les conditions de sécurité et l'existence d'un DPA ;
- supprimer les accès des prestataires qui ne sont plus nécessaires.
