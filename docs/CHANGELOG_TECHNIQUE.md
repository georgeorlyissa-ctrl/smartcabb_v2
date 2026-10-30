# Journal technique des modifications — SmartCabb

> **But** : garantir la traçabilité de toute modification apportée à l'application et faciliter les interventions ultérieures (debug, rollback, reprise par un autre développeur).
>
> **Règle** : toute modification de code (frontend, backend Edge Functions, config, base de données) doit être consignée ici **dans le même commit** que la modification.
>
> **Ordre** : entrée la plus récente en premier (juste après le modèle ci-dessous).

---

## Modèle d'entrée (à copier pour chaque modification)

```markdown
## AAAA-MM-JJ — <titre court et explicite>

- **Commit** : `<hash>` (branche `main`, poussé sur `origin`)
- **Auteur** : <nom / agent>
- **Type** : feat | fix | refactor | docs | chore | perf | security
- **Objectif** : <le besoin utilisateur ou le bug à résoudre, en 1–3 phrases>

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `chemin/fichier.ts` | <description en une ligne> |

### Description technique
<Ce qui a été fait concrètement : logique, endpoints, flags, migrations, contrats de données.
Assez de détail pour comprendre le code sans le relire.>

### Impact produit / comportement visible
- <Ce que voit le passager / le chauffeur / l'admin / le système>

### Risques & rollback
- **Risque** : <effet de bord possible>
- **Rollback** : <action précise : revert du commit, flag à repasser à `false`, secret à retirer…>

### Tests / vérifications
- [ ] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [ ] <test manuel ou automatique effectué>
- [ ] Déploiement vérifié (Vercel / Edge Function)
```

---

## 2026-10-30 — Interdiction d'annuler une course déjà commencée

- **Commit** : `590bae3` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : feat (règle métier) + fix (contournement possible)
- **Objectif** : une course démarrée (passager à bord) ne doit plus pouvoir être annulée, ni par le passager ni par le chauffeur. Seule la clôture (« Terminer la course ») ou le support peut mettre fin au trajet.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/RideInProgressScreen.tsx` | Suppression du bouton rouge **X**, de `handleCancelRide` et de l'appel `POST /rides/cancel` (−63 lignes) |
| `components/driver/NavigationScreen.tsx` | Bouton « ← Retour » masqué quand `phase === 'in_progress'` (placeholder `w-16` pour garder l'alignement du header) |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `POST /rides/cancel` : refus global si `status === 'in_progress'` **ou** `startedAt` présent, quel que soit `cancelledBy` |

### Description technique
- **Front passager** : l'écran « Course en cours » ne contient plus aucune action d'annulation. Restent : partage WhatsApp, appel/message chauffeur, signalement d'incident.
- **Front chauffeur** : pendant la phase `in_progress` de `NavigationScreen`, le header n'affiche plus le bouton retour ; le chauffeur reste sur l'écran jusqu'à l'étape 4 « Clôturer la course ». Les écrans `ActiveRideNavigationScreen` / `ActiveRideScreen*` n'avaient déjà aucun bouton d'annulation.
- **Backend (garantie réelle)** : l'ancien garde-fou ne bloquait que `cancelledBy === 'passenger'` et seulement sur `status === 'in_progress'`. Il est remplacé par :
  ```ts
  const started = ride.status === 'in_progress' || !!ride.startedAt;
  if (started) return c.json({ success: false,
    error: "Impossible d'annuler une course déjà commencée. Terminez la course ou contactez le support." }, 400);
  ```
  Couvre donc aussi les anciens APK qui affichent encore le bouton, et le cas d'une course annulée après démarrage mais dont le statut aurait été modifié.

### Impact produit / comportement visible
- **Passager** : plus de bouton d'annulation une fois la course lancée (pas de facturation surprise ni de trajet interrompu).
- **Chauffeur** : impossible de quitter/abandonner une course en cours depuis l'interface ; il doit la terminer.
- **Annulation toujours possible** avant démarrage : recherche de chauffeur, chauffeur en route / en approche.
- ⚠️ L'APK Android doit être reconstruit pour voir la disparition des boutons ; la protection serveur est active immédiatement pour toutes les versions.

### Risques & rollback
- **Risque** : en cas d'incident réel (accident, panne), le chauffeur ne peut plus sortir de l'écran ; le support doit clôturer/annuler côté admin.
- **Rollback** : `git revert 590bae3` (restaure bouton + ancienne condition backend).

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`)
- [x] Recherche globale : plus aucun appel `handleCancelRide` / bouton annulation dans les écrans de course
- [x] Déploiement automatique Vercel + Edge Function depuis `main`

---

## 2026-10-30 — Admin : bouton « Traiter » conditionné à l'acceptation du conducteur

- **Commit** : `4935328` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : fix (cohérence métier) + security (garde API)
- **Objectif** : dans **Réservations** (admin), une réservation ne peut être classée « Traitée » qu'après confirmation/acceptation explicite du conducteur. Avant, l'admin pouvait clôturer une réservation simplement proposée.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/admin/AdminScheduledRidesScreen.tsx` | `driverAccepted = ride.driver_status === 'accepted'` ; bouton `disabled={!driverAccepted}` + message d'attente sous le bouton ; garde dans `handleManualProcess` ; libellé de confirmation revu |
| `supabase/functions/make-server-2eb02e52/reservation-routes.ts` | `POST /:id/admin-status` : lecture de `id, driver_id, driver_status`, retour **409** si `status === 'completed'` et `driver_status !== 'accepted'` |

### Description technique
- **UI** : `Button` reçoit `disabled={!driverAccepted}` (le style désactivé vient de `disabled:opacity-50 disabled:pointer-events-none` de `components/ui/button.tsx`). Sous le bouton, un texte contextuel s'affiche :
  - `⏳ En attente d'acceptation du conducteur` si `driver_id` existe,
  - `⏳ Aucun conducteur assigné` sinon.
- **Double sécurité front** : `handleManualProcess` re-vérifie `ride.driver_status !== 'accepted'` et affiche un toast d'erreur (protège contre un état périmé dans la liste).
- **API** : la route charge la réservation via `sbAdmin()`, renvoie `404` si introuvable, puis `409` avec `driverStatus` dans le corps si la clôture est prématurée. L'**annulation** (`status: 'cancelled'`) reste totalement libre.
- Boutons déjà conditionnés et inchangés : « ▶ Créer maintenant » n'apparaît que si le conducteur a accepté ; « Attribuer / Ré-attribuer » crée une proposition à accepter côté chauffeur.

### Impact produit / comportement visible
- L'admin voit immédiatement si une réservation est bloquée en attente (bouton grisé + libellé).
- Le flux devient : attribution → notification chauffeur → acceptation → « Traiter » actif → réservation dans l'onglet **Traitées**.
- Un ancien client admin (cache) ne peut pas contourner la règle : le serveur refuse (409).

### Risques & rollback
- **Risque** : une réservation dont le conducteur n'accepte jamais reste non clôturable — volontaire ; l'admin peut toujours **annuler** ou ré-attribuer.
- **Rollback** : `git revert 4935328`.

### Tests / vérifications
- [x] `npx tsc --noEmit` — propre (hors `_headers`)
- [x] `grep` de contrôle : un seul point d'appel `admin-status` (écran admin) et un seul handler serveur
- [x] Vérifié : réservation « Proposée … en attente » ⇒ **Traiter** grisé ; après acceptation chauffeur ⇒ actif

---

## 2026-10-30 — Mise en pause de « SmartCabb Standard sans clim »

- **Commit** : `2af5fec` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : feat (simplification catalogue) — **réversible par flag**
- **Objectif** : ne plus exposer deux variantes Standard (avec/sans climatisation) côté passager, chauffeur et admin. Tout est ramené à une seule catégorie **SmartCabb Standard**, sans destruction de données.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/pricing-data.ts` | Ajout de `NO_CLIM_CATEGORY_ENABLED` (défaut `false`), `STANDARD_CATEGORY`, `NO_CLIM_CATEGORY`, `normalizeVehicleCategory()` |
| `components/passenger/EstimateScreen.tsx` | Carte Standard unique ; suppression du groupe dépliable clim / sans clim (−~100 lignes) |
| `components/driver/DriverRegistrationScreen.tsx` | Option « sans clim » retirée, question clim supprimée, une seule catégorie proposée |
| `lib/vehicle-helpers.ts` | Toutes les variantes Standard s'affichent « SmartCabb Standard » |
| `hooks/useSupabaseData.ts` | Catégorie du chauffeur normalisée au chargement |
| `components/admin/AdminRidesScreen.tsx`, `AssignDriverModal.tsx`, `DriverDetailModal.tsx` | Affichage/attribution alignés sur la catégorie unique |
| `components/passenger/AlternativeVehicleDialog.tsx`, `SearchingDriversScreen.tsx` | Libellés et filtres alignés |
| `supabase/functions/.../ride-routes.ts` | `normalizeCategory()` : `smart_standard`, `smart_standard_clim`, `smart_standard_no_clim` → même pool de matching / commission / crédit minimum |
| `supabase/functions/.../loyalty-routes.ts` | `FREE_TIERS.smart_standard` unique + `normalizeStandardVariant()` |

### Description technique
- **Principe** : aucune donnée n'est supprimée ni migrée. La normalisation se fait **à la lecture**, à deux endroits :
  - front : `normalizeVehicleCategory()` + normalisation du chauffeur dans `useSupabaseData` ;
  - back : `normalizeCategory()` (matching, commission, seuil de crédit) et `normalizeStandardVariant()` (fidélité).
- Les chauffeurs enregistrés avec `smart_standard_no_clim` continuent de fonctionner : ils sont traités comme des Standard et reçoivent les courses Standard.
- Le flag `NO_CLIM_CATEGORY_ENABLED = false` coupe l'affichage et l'inscription « sans clim » ; le passer à `true` réactive l'ancien comportement sans autre modification.
- **Conséquence tarifaire assumée** : les ex-« sans clim » facturent désormais au tarif Standard horaire (6 $/h jour, 10 $/h nuit, minimum 1 h ≈ 16 800 CDF) et non plus 505 CFC/km.

### Impact produit / comportement visible
- **Passager** : une seule carte « SmartCabb Standard » à l'estimation, plus de choix clim.
- **Chauffeur** : inscription simplifiée (plus de question clim) ; catégorie affichée « SmartCabb Standard ».
- **Admin** : une seule catégorie dans les filtres et l'attribution manuelle.
- **Backend** : un seul pool de matching Standard, commission et fidélité unifiées.

### Risques & rollback
- **Risque** : baisse de revenu pour les chauffeurs anciennement « sans clim » (passage du kilométrique à l'horaire) ; à surveiller côté support.
- **Rollback** : repasser `NO_CLIM_CATEGORY_ENABLED = true` dans `lib/pricing-data.ts` (les données n'ayant jamais été modifiées, l'ancien catalogue réapparaît). Revert complet possible via `git revert 2af5fec`.

### Tests / vérifications
- [x] `npx tsc --noEmit` — propre (hors `_headers`)
- [x] Vérifié : estimation passager, inscription chauffeur, attribution admin, matching backend
- [x] Chauffeurs existants « sans clim » toujours visibles et éligibles aux courses Standard

---

## 2026-10-28 — Rate limit : global désactivé par défaut, limiteur auth par IP + identifiant

- **Commit** : `2f573f4` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : fix (faux positifs en production)
- **Objectif** : des utilisateurs légitimes étaient bloqués (IP partagées / CGNAT, réseaux mobiles congolais), et le parcours chauffeur n'envoyait pas encore le code de confirmation exigé au démarrage.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/lib/rate-limit.ts` | Limite globale par IP **désactivée par défaut** ; limiteur d'authentification re-clé sur `IP + identifiant` ; seuils pilotés par variables d'environnement, comportement *fail-open* |

### Description technique
- Le compteur global « une IP = N requêtes » est coupé par défaut (n'était plus pertinent derrière du CGNAT : des dizaines d'abonnés partagent la même IP publique).
- Le limiteur d'authentification compte désormais par couple **IP + identifiant** (`email` / téléphone), ce qui protège toujours contre le bruteforce ciblé sans pénaliser les voisins de NAT.
- Les seuils sont lus depuis l'environnement ; en cas d'erreur du limiteur, la requête passe (*fail-open*) pour ne jamais bloquer un utilisateur à cause d'un incident interne.
- En complément, le contrôle du code de confirmation au démarrage est neutralisé par défaut via un flag (`RIDE_CONFIRMATION_CODE_REQUIRED` / `REQUIRE_CONFIRMATION_CODE`), réactivable par secret sans redéploiement.

### Impact produit / comportement visible
- Plus de blocages « trop de requêtes » injustifiés pour les utilisateurs sur réseau mobile partagé.
- La protection anti-bruteforce sur le login reste active, mais ciblée par compte.

### Risques & rollback
- **Risque** : sans limite globale, une attaque volumétrique simple n'est plus filtrée au niveau IP (mitigation à prévoir côté Supabase/edge si nécessaire).
- **Rollback** : réactiver le seuil global via les variables d'environnement de l'Edge Function, ou `git revert 2f573f4`.

### Tests / vérifications
- [x] `npx tsc --noEmit` — propre (hors `_headers`)
- [x] Connexions répétées depuis une même IP avec des comptes différents : plus de blocage
- [x] Tentatives répétées sur un même compte : toujours limitées

---

## 2026-10-28 — Code de confirmation au démarrage neutralisé par défaut

- **Commit** : `79b2d26` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : fix (déblocage du démarrage de course)
- **Objectif** : les chauffeurs ne pouvaient plus démarrer une course car le front n'envoyait pas encore le code de confirmation, alors que le backend l'exigeait.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Exigence du code de confirmation conditionnée à un flag (`RIDE_CONFIRMATION_CODE_REQUIRED`), désactivé par défaut |

### Description technique
- La vérification du `confirmationCode` au moment de passer la course en `in_progress` n'est plus systématique : elle est pilotée par un flag d'environnement dont la valeur par défaut est `false`.
- Le code de vérification reste présent dans le backend : il suffira de définir le secret à `true` lorsque le parcours chauffeur enverra effectivement le code, sans redéploiement.

### Impact produit / comportement visible
- Le chauffeur peut démarrer la course normalement, sans étape de code.
- La fonctionnalité peut être réactivée plus tard sans toucher au code.

### Risques & rollback
- **Risque** : la double validation passager/chauffeur au démarrage est temporairement absente (démarrage non confirmé par le passager).
- **Rollback / activation** : définir `RIDE_CONFIRMATION_CODE_REQUIRED=true` dans les secrets Supabase (Edge Functions) ; ou `git revert 79b2d26`.

### Tests / vérifications
- [x] `npx tsc --noEmit` — propre (hors `_headers`)
- [x] Démarrage de course testé sans code : succès
- [x] Flag à `true` : comportement d'origine restauré (test de non-régression)

---

## Historique antérieur

Les modifications antérieures à cette date ne sont pas encore consignées ici. Elles restent consultables via :

```bash
git log --oneline            # historique complet
git show <hash> --stat       # détail d'un commit
```

Les audits et rapports existants se trouvent dans `docs/` et à la racine du dépôt (`RAPPORT_*.md`, `AUDIT-*.md`, `FIX-*.md`).
