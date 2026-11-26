# Assets Play Store — SmartCabb

> Générés le 26/11/2026 depuis `public/logo-smartcabb.jpeg` et la charte
> (marine `#001B3D`, bleu `#007AFF`, jaune `#FFCC00`).
>
> Régénération : `node scripts/generate-play-assets.cjs`

## Fichiers prêts à uploader

| Fichier | Dimensions | Poids | Usage Play Console |
|---|---|---|---|
| `icon-512.png` | 512 × 512 | ~185 Ko | **Icône de l'application** |
| `feature-graphic-1024x500.png` | 1024 × 500 | ~205 Ko | **Bannière (feature graphic)** |

Contraintes respectées : PNG opaque, ≤ 1 Mo (icône) et ≤ 15 Mo (bannière),
icône 32 bits sans transparence.

## Captures d'écran (à faire sur téléphone)

Format : **JPEG/PNG portrait**, **1080 × 1920** conseillé, **8 maximum**.
Les deux premières sont les plus visibles dans les résultats de recherche.

| # | Écran | Où | Notes |
|---|---|---|---|
| 1 | Connexion passager | `/app/passenger` | nouvelle identité visuelle |
| 2 | Carte + commande | onglet Carte | recherche d'adresse |
| 3 | Choix véhicule + prix | après départ/destination | prix affiché |
| 4 | Chauffeur en route | suivi après acceptation | photo, plaque, ETA |
| 5 | Course en cours + SOS | écran de course | sécurité |
| 6 | Portefeuille | Profil → Portefeuille | recharge Mobile Money |
| 7 | Réservation T-15 | onglet Réserver | date/heure |
| 8 | Profil / historique | Profil → historique | usage réel |

### Règles à respecter

- Compte de **test** (nom neutre, numéro fictif, adresse publique).
- Aucune donnée personnelle réelle, aucun écran de chargement/erreur.
- Même thème (clair) sur toute la série, clavier fermé, notifications coupées.
- Vérifier que les prix correspondent à la grille en vigueur.

## Textes suggérés

**Titre** (30 car.) : `SmartCabb — Chauffeur à Kinshasa`

**Description courte** (80 car.) :
> Votre chauffeur privé à Kinshasa. Prix affiché à l'avance, suivi en direct.

**Description complète** : reprendre `docs/CHANGELOG_TECHNIQUE.md` non — utiliser
le texte marketing du site (`website/`) ou la description existante de la fiche.
