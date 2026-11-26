# Data safety — réponses à saisir dans Play Console

> Formulaire **Sécurité des données** (Play Console → *App content* → *Data safety*).
> À remplir en cohérence avec l'application **et** la politique de confidentialité
> (`https://www.smartcabb.com/privacy`). Dernière mise à jour : 26/11/2026.

## 1. Vue d'ensemble

| Question | Réponse |
|---|---|
| URL de la politique de confidentialité | `https://www.smartcabb.com/privacy` |
| L'app collecte-t-elle ou partage-t-elle des données ? | **Oui** |
| Toutes les données sont-elles chiffrées en transit ? | **Oui** (HTTPS partout) |
| Proposez-vous une suppression des données ? | **Oui** |
| URL de demande de suppression | `https://www.smartcabb.com/account-deletion` |
| Suppression aussi depuis l'app ? | **Oui** (page accessible depuis le profil) |
| Revue de sécurité indépendante ? | **Non** |

## 2. Données collectées

| Catégorie Play | Type | Collecté | Partagé | Obligatoire | Finalités |
|---|---|---|---|---|---|
| Informations personnelles | Nom | ✅ | ❌ | Oui | Fonctionnement de l'app, gestion du compte |
| Informations personnelles | Adresse e-mail | ✅ | ❌ | Oui | Fonctionnement de l'app, gestion du compte |
| Informations personnelles | Numéro de téléphone | ✅ | ❌ | Oui | Fonctionnement de l'app, gestion du compte, communications |
| Informations personnelles | Adresse | ✅ | ❌ | Non | Fonctionnement de l'app (départ/arrivée, favoris) |
| Informations financières | Historique d'achats | ✅ | ❌ | Oui | Fonctionnement de l'app, gestion du compte |
| Informations financières | Informations de paiement | ❌ | ❌ | — | Paiement Mobile Money traité par Ejpay (aucune donnée bancaire stockée) |
| Localisation | Localisation approximative | ✅ | ❌ | Oui | Fonctionnement de l'app (matching, suivi) |
| Localisation | Localisation précise | ✅ | ❌ | Oui | Fonctionnement de l'app (matching, suivi) |
| Messages | Messages in-app | ✅ | ❌ | Non | Fonctionnement de l'app (chat support) |
| Photos et vidéos | Photos | ✅ | ❌ | Oui (chauffeurs) | Fonctionnement de l'app (profil, véhicule) |
| Activité dans l'app | Interactions dans l'app | ✅ | ❌ | Non | Analyse d'usage |
| Identifiants d'appareil | Identifiants d'appareil ou autres | ✅ | ❌ | Oui | Fonctionnement de l'app (notifications push), analyse |

### Non collecté (à répondre « Non »)

Contacts · Calendrier · Audio (le son est restitué, jamais enregistré) · Fichiers et documents ·
Santé et forme physique · Informations démographiques · Navigation web · Historique de recherche in-app ·
SMS ou journaux d'appels.

> **Localisation en arrière-plan** : non — l'app ne détient que `ACCESS_FINE_LOCATION` /
> `ACCESS_COARSE_LOCATION`, sans `ACCESS_BACKGROUND_LOCATION`.

> **Contacts** : l'app ouvre le sélecteur système pour choisir **un** contact lors d'une
> réservation pour un tiers. Le répertoire n'est jamais lu ni envoyé ; seul le numéro choisi
> est transmis (déclaré en « Numéro de téléphone »).

## 3. Points de vigilance (rejet fréquent)

- Ne **jamais** répondre « non » à la collecte de localisation : le matching et le suivi en dépendent.
- Si Firebase Analytics est actif (c'est le cas), « Interactions dans l'app » et
  « Identifiants d'appareil » doivent être déclarés.
- L'URL de suppression doit **réellement** fonctionner (page publique + procédure).
- Toute incohérence avec la politique de confidentialité peut entraîner un rejet.

## 4. Après validation

- Le formulaire est **indépendant de la version** : pas besoin d'une nouvelle AAB pour le mettre à jour.
- En cas de changement de collecte (nouveau service, nouvelle permission), **repasser** par ce formulaire.
