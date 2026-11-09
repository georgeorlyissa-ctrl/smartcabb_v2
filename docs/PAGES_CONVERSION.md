# Pages de conversion publiques — `/commander` et `/reserver`

> **But** : disposer de deux pages publiques dédiées, optimisées pour la conversion, derrière les deux boutons principaux de la page d'accueil. Même logique que la page « Devenir chauffeur » (`/drivers` → formulaire `/app/driver/signup`).

---

## 1. Cartographie des entrées

| Bouton du site | Ancienne destination | Nouvelle destination | Puis |
|---|---|---|---|
| **COMMANDER UNE COURSE** | `/app/passenger` (app directe) | **`/commander`** | CTA → `/app/passenger?screen=map` |
| **RÉSERVER VOTRE CHAUFFEUR** | `/app/passenger?screen=scheduled-rides` | **`/reserver`** | CTA → `/app/passenger?screen=scheduled-rides` |
| Devenir chauffeur | `/app/driver/signup` | inchangé | formulaire d'inscription |

Liens mis à jour :
- `pages/LandingPage.tsx` — hero principal et CTA « Pourquoi SmartCabb ».
- `pages/ServicesPage.tsx` — `BOOK_URL` pointe désormais vers `/commander`.

---

## 2. Fichiers

| Fichier | Rôle |
|---|---|
| `components/public/LandingKit.tsx` | Styles partagés (`lk-*`), hook `useInViewCustom`, couleurs `SITE_BLUE` / `SITE_NAVY` |
| `pages/OrderRidePage.tsx` | Page `/commander` : hero, 3 étapes, 4 catégories, bénéfices, FAQ, CTA |
| `pages/BookDriverPage.tsx` | Page `/reserver` : hero, cas d'usage, 3 étapes, tarifs, inclus, FAQ, CTA |
| `App.tsx` | Imports lazy + routes `/commander`, `/reserver` + ajout à `VITRINE_ROUTES` (pas de dark mode) |
| `components/SeoHead.tsx` | `title`, `description`, `canonical` propres aux deux pages |
| `public/sitemap.xml` | Ajout des deux URLs |

Les deux pages réutilisent les composants publics existants : `SiteNavigation`, `PageHero`, `ProfessionalFooter`, `ChatWidget`.

---

## 3. Deep links vers l'application passager

Deux paramètres sont acceptés par `pages/PassengerApp.tsx` :

- `?screen=map` → carte de commande immédiate ;
- `?screen=scheduled-rides` → écran de réservation à l'avance.

Comportement :

1. **Utilisateur connecté** : l'écran demandé est appliqué immédiatement, puis la query string est retirée de l'URL (`history.replaceState`) pour éviter qu'un rafraîchissement ne rejoue la redirection.
2. **Utilisateur non connecté** : l'écran est mémorisé dans `localStorage.sc_pending_screen`, puis `components/passenger/LoginScreen.tsx` le consomme après authentification (et le supprime systématiquement).

⚠️ **Correctif routeur** : `lib/simple-router.tsx` ne met plus la query string dans l'état `pathname`. Sans cela, `/app/passenger?screen=map` ne matchait pas `/app/passenger/*` et retombait sur `/app/*` → redirection `/app/landing`, deep link perdu.

---

## 4. Contenu et cohérence commerciale

- Tarifs issus de `lib/pricing-data.ts` (`PRICING_CONFIG`) et de `components/passenger/ScheduledRides.tsx` (`RESERVATION_TARIFFS_USD`).
- Location à la journée : Standard 60 $, Confort 80 $, Familiale 100 $, Business 160 $.
- Transfert aéroport aller simple : 40 / 50 / 65 / 160 $.
- Acompte de réservation : **50 %**, solde réglé à la fin de la prestation.
- Carburant à la charge du client pour la location à la journée ; hors Kinshasa → devis.

---

## 5. Tests recommandés

- [ ] `/commander` s'ouvre sans dark mode, images et CTA visibles.
- [ ] `/reserver` affiche les bons tarifs et le lien `tel:+243960624008`.
- [ ] Clic « Commander maintenant » **connecté** → carte ; **déconnecté** → login puis carte.
- [ ] Clic « Réserver maintenant » **connecté** → réservations ; **déconnecté** → login puis réservations.
- [ ] Le bouton retour du navigateur ramène bien à la page publique.
