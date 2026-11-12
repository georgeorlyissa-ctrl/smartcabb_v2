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

## 2026-11-12 — Réseaux sociaux : liens officiels centralisés (Facebook, Instagram, TikTok)

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : le métier a fourni les vraies adresses de ses comptes. Les pieds de page pointaient vers des comptes inexistants (`facebook.com/smartcabb`, `twitter.com/smartcabb`, `youtube.com/@smartcabb`, `linkedin.com/company/smartcabb`) et le chatbot citait d'anciens noms de comptes.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/social-links.ts` | **Nouveau** : source unique `SOCIAL_LINKS` / `SOCIAL_PROFILES` / `SOCIAL_SAME_AS` |
| `components/SocialFooter.tsx` | Liens et icônes générés depuis `SOCIAL_PROFILES` (FB, Instagram, TikTok) |
| `components/ProfessionalFooter.tsx` | Idem, en conservant le style « pastille grise → couleur de marque au survol » |
| `index.html` | `sameAs` JSON-LD mis à jour ; balises `twitter:site` / `twitter:creator` retirées (aucun compte X) |
| `components/ChatWidget.tsx` | Réponse « contact » : Facebook, Instagram (smartcabb7), TikTok |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Centralisation** : `lib/social-links.ts` exporte désormais trois objets. `SOCIAL_LINKS` contient les URL, `SOCIAL_PROFILES` la description d'affichage (id, libellé, URL, classes de couleur, tracé SVG 24×24 de l'icône) et `SOCIAL_SAME_AS` la liste dérivée pour Schema.org. Ajouter ou retirer un réseau = une seule édition, les deux pieds de page suivent.
- **URL retenues** : Facebook `profile.php?id=61596235596840` (page sans nom d'utilisateur), Instagram `instagram.com/smartcabb7` (paramètre de suivi `igsh`/`rpxt` supprimé), TikTok `vm.tiktok.com/ZS9fmufQFyFVM-vbxMq/` (lien de partage court fourni tel quel).
- **X / YouTube / LinkedIn retirés** : ces comptes n'ont jamais été confirmés, les liens renvoyaient vers des pages inexistantes. Les balises `twitter:site` et `twitter:creator` sont supprimées en conséquence ; `twitter:card` et les balises `og:*` restent (aperçus de partage).
- **Accessibilité** : `aria-label={profile.label}` et `aria-hidden="true"` sur les SVG. Les liens s'ouvrent toujours avec `target="_blank"` + `rel="noopener noreferrer"`.
- **Non touché** : les boutons de `components/passenger/ShareRide.tsx` utilisent les *intentions de partage* de Facebook et X (`sharer.php`, `intent/tweet`) pour envoyer un lien de course : ce ne sont pas des liens de compte, ils restent valides.

### Impact produit / comportement visible
- Les pieds de page (public et application) n'affichent plus que trois icônes : Facebook, Instagram, TikTok, toutes fonctionnelles.
- Les données structurées Google déclarent les mêmes trois profils (`sameAs`).
- Le chatbot renvoie vers les bons comptes.
- Aucune nouvelle APK nécessaire : l'app charge le site en direct (`capacitor.config.ts` → `https://www.smartcabb.com/app/passenger?platform=apk`), donc le correctif est actif dès le déploiement Vercel.

### Risques & rollback
- **Risque** : le lien TikTok est un lien de partage court (`vm.tiktok.com`) qui peut expirer. Le compte est `@smartcabb7` ; remplacer par l'URL de profil si le lien casse.
- **Risque** : si un compte X / YouTube / LinkedIn officiel est ouvert plus tard, il faudra l'ajouter dans `SOCIAL_PROFILES` (et `sameAs` en découle).
- **Rollback** : `git revert <hash>` ou rétablir les anciennes URL dans `lib/social-links.ts`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] Bundle `dist` : présence de `61596235596840`, `instagram.com/smartcabb7`, `vm.tiktok.com/ZS9fmufQFyFVM-vbxMq` ; absence de `facebook.com/smartcabb`, `twitter.com/smartcabb`, `youtube.com/@smartcabb`, `linkedin.com/company/smartcabb`, `SmartCabbRDC`
- [ ] Test manuel : cliquer les trois icônes des deux pieds de page → ouvrent les bons comptes

---

## 2026-11-12 — Profil : enregistrement email/adresse réparé, boutons d'action, retour inscription, Smart Rewards désactivé

- **Commit** : `fa97943` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : trois retours utilisateur. (1) Impossible d'enregistrer un email dans « Mon Profil ». (2) L'écran d'inscription n'avait pas de flèche retour dans l'APK. (3) La rubrique Smart Rewards devait être désactivée temporairement.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `hooks/useAppState.tsx` | Nouveau `mergeCurrentUser(patch)` : mise à jour **partielle** de l'utilisateur courant |
| `components/passenger/ProfileScreen.tsx` | Validation + normalisation avant sauvegarde, boutons « Annuler / Enregistrer » sous les champs, rafraîchissement du solde sans écrasement, `inputMode`/`enterKeyHint` |
| `components/passenger/RegisterScreen.tsx` | Flèche retour rétablie (classe `hide-in-apk` retirée) |
| `lib/feature-flags.ts` | **Nouveau** : `SMART_REWARDS_ENABLED = false` |
| `components/passenger/EstimateScreen.tsx` | Bloc remise fidélité masqué, aucun appel `/loyalty/*`, garde sur la remise |
| `pages/PassengerApp.tsx` | Route `loyalty` → renvoie vers le profil quand le drapeau est off |
| `components/ChatWidget.tsx` | Réponse « fidélité » réécrite (fonctionnalité en pause), raccourci « Fidélité / Rewards » retiré |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Cause du bug d'enregistrement (la vraie)** : l'effet de rafraîchissement du solde (`setInterval` 10 s) appelait `setCurrentUser({ ...state.currentUser, walletBalance })`. La closure figeait `state.currentUser` **au montage** : toutes les 10 secondes, l'ancien objet (ancien email, ancien nom, ancienne adresse) était réécrit dans le state et donc dans `localStorage`. L'enregistrement fonctionnait puis était silencieusement annulé. → remplacé par `mergeCurrentUser({ walletBalance })`, qui fusionne avec l'état courant (`setState(prev => …)`). Même correction pour le changement de moyen de paiement.
- **Validation côté écran** : `name` obligatoire ; si un email est saisi il doit respecter `^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$` (le cas observé `hmapela8` est refusé avec un message explicite « ajoutez le @ et le domaine »). Les valeurs sont `trim()` avant envoi et avant écriture dans le state.
- **Ergonomie** : boutons **Annuler / Enregistrer** ajoutés juste sous les champs (le bouton du haut sortait de l'écran dès qu'on faisait défiler, clavier ouvert) ; la touche « Terminé » du champ Adresse déclenche l'enregistrement ; en cas d'échec réseau, le formulaire reste ouvert (avant, il se refermait).
- **SMS de confirmation** : envoyé uniquement si le **numéro a changé** (avant : à chaque modification, même d'email) → économie de crédits EJ SMS.
- **Occupation conservée** : l'écriture serveur continue sur `POST /passengers/update/:id`, qui alimente `passenger:{id}` **et** `profile:{id}` ; c'est `profile:{id}` que renvoie `/auth/login`, donc l'email tient après reconnexion.
- **Retour inscription** : `hide-in-apk` masquait le bouton dans l'app native (`client-init.js` injecte `.hide-in-apk { display:none }`). Classe retirée du bouton et de l'espaceur (l'espaceur masqué décalait le titre).
- **Smart Rewards en pause** : drapeau unique dans `lib/feature-flags.ts`. Conséquences : rubrique retirée du profil, bloc de remise retiré de « Prix estimé » (tree-shaké du bundle), écran `/loyalty` qui renvoie le profil, aucun appel réseau. Les points restent en base, réactivation = repasser le drapeau à `true`.

### Impact produit / comportement visible
- Le passager peut modifier nom, email, adresse et enregistrer depuis le bas du formulaire ; la valeur reste après rafraîchissement et après reconnexion.
- Email incomplet → message clair au lieu d'un enregistrement silencieux d'une valeur inutilisable.
- Flèche retour visible sur l'écran « Inscription » (APK inclus).
- Plus aucune mention de points/récompenses dans l'app (profil, réservation, chatbot).

### Risques & rollback
- **Risque** : les comptes qui avaient déjà un email invalide en base (ex. `hmapela8`) le conservent jusqu'à correction manuelle ; ils devront ressaisir un email valide.
- **Risque** : réactivation des récompenses oubliée ; le flag est commenté et documenté.
- **Rollback** : `git revert fa97943`. Réactiver les récompenses : `SMART_REWARDS_ENABLED = true` dans `lib/feature-flags.ts`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK — bundle sans « Smart Rewards », présence de « Enregistrer » et « Email incomplet »
- [ ] Test manuel : Profil → Modifier → email `nom@gmail.com` → Enregistrer → recharger l'app → email conservé
- [ ] Test manuel : inscription depuis l'APK → flèche retour visible
- [ ] Test manuel : aucune rubrique Smart Rewards dans le profil ni sur « Prix estimé »

---

## 2026-11-12 — « Réserver pour quelqu'un d'autre » : import du numéro depuis le répertoire

- **Commit** : `2cb7811` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : dans le formulaire « Réserver pour quelqu'un d'autre » (écran « Prix estimé »), le numéro du bénéficiaire devait être tapé à la main. L'utilisateur devait pouvoir choisir directement un contact dans le répertoire de son téléphone.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/contact-picker.ts` | **Nouveau** : `pickPhoneContact()` (plugin natif → Contact Picker API navigateur → `unsupported`), `normalizeRdcPhone()`, détection de disponibilité, traduction des erreurs natives |
| `components/passenger/BookForSomeoneElse.tsx` | Bouton « 📇 Contacts » à côté du libellé « Téléphone * », `handlePickContact()` (ferme le clavier, remplit numéro + nom si vide), messages d'erreur explicites, `inputMode="tel"` + `autoComplete="tel"` |
| `lib/icons.tsx` | Nouvelle icône `ContactBook` (carnet d'adresses) |
| `package.json` / `package-lock.json` | Ajout de `@capacitor/contacts@^1.0.1` (plugin officiel, compatible Capacitor 8) |
| `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle` | Enregistrement du plugin dans le projet Android (`npx cap sync android`) |
| `android/app/src/main/AndroidManifest.xml` | `READ_CONTACTS` explicite ; `WRITE_CONTACTS` du plugin supprimée (`tools:node="remove"`) car l'app n'écrit jamais dans le répertoire |
| `android/app/build.gradle` | `versionCode 6 → 7`, `versionName 1.3 → 1.4` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Stratégie à trois niveaux** dans `pickPhoneContact()` :
  1. **Plugin natif** `@capacitor/contacts` si `Capacitor.isNativePlatform()` et `Capacitor.isPluginAvailable('Contacts')` : `Contacts.pickContact()` ouvre le vrai sélecteur système. C'est le chemin utilisé dans l'APK. Import dynamique (`await import('@capacitor/contacts')`) pour ne pas alourdir le bundle web.
  2. **Contact Picker API** (`navigator.contacts.select(['name','tel'], { multiple: false })`) : Chrome Android. Aucune permission persistante, le système demande le contact à chaque fois.
  3. Sinon `unsupported` → toast « Sélection dans les contacts indisponible sur ce téléphone : saisissez le numéro ».
- **Normalisation** : `normalizeRdcPhone()` accepte `+243 99 99 99 999`, `00243999999999`, `0999999999`, `999999999`, avec espaces/tirets/parenthèses, et renvoie `+243XXXXXXXXX`. Si le contact a plusieurs numéros, le premier numéro RDC valide est retenu.
- **Nom** : si le champ « Nom complet » est vide, il est prérempli avec le nom du contact (`displayName` / `name[1]`).
- **Erreurs** : code natif `OS-PLUG-CONT-0006` = annulation (aucun message), `OS-PLUG-CONT-0020` = permission refusée (toast invitant à autoriser), `AbortError`/`SecurityError` côté web, `Unable to open a contact selector` (WebView sans sélecteur) → `unsupported`.
- **APK** : le plugin est natif, il n'est donc actif qu'après reconstruction de l'APK. L'APK **1.4 (versionCode 7)** a été construit localement (`android/app/build/outputs/apk/release/app-release.apk`, 12,6 Mo, signé avec `smartcabb-release.keystore`). Le web déployé sur Vercel embarque déjà le bouton et la logique.

### Impact produit / comportement visible
- Un passager qui réserve pour quelqu'un d'autre touche « Contacts », choisit une personne dans son répertoire : le numéro (et le nom si vide) est rempli automatiquement.
- Si le téléphone ne propose pas de sélecteur (ancien APK, navigateur de bureau), un message clair invite à saisir le numéro ; la saisie manuelle reste inchangée.
- À l'installation de l'APK 1.4, Android demande l'autorisation « accès aux contacts » au premier usage ; aucune permission d'écriture n'est demandée.

### Risques & rollback
- **Risque** : demande `READ_CONTACTS` — Google Play restreint cette permission ; sans impact pour une distribution directe (APK). Si un jour publication Play Store, prévoir une déclaration d'usage ou retirer la fonctionnalité.
- **Risque** : `versionCode 7` doit être répercuté dans la config de mise à jour (`apkUrl` + version servie par `ApkUpdatePrompt`) pour que les utilisateurs reçoivent la nouvelle APK.
- **Rollback** : `git revert 2cb7811` puis rebuild APK (le plugin peut rester installé sans effet si le bouton est retiré).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] `npx cap sync android` : « Found 4 Capacitor plugins » dont `@capacitor/contacts@1.0.1`
- [x] `gradlew assembleRelease` : **BUILD SUCCESSFUL**, manifeste fusionné avec `READ_CONTACTS` et sans `WRITE_CONTACTS`, `versionCode="7"`, `versionName="1.4"`
- [ ] Test manuel Android : réserver pour quelqu'un d'autre → « Contacts » → sélection → numéro rempli

---

## 2026-11-12 — Réserve de zone sûre basse réduite de 48 px à 32 px (APK Android)

- **Commit** : `abfb7a4` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : la réserve forcée de 48 px, qui empêche le bas des pages de passer sous la barre système Android, créait ~24 px de vide visible sur les téléphones en navigation gestuelle (barre fine). Réduire la réserve tout en gardant les barres d'action entièrement visibles.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `styles/globals.css` | `html.cap-apk { --app-safe-bottom: 32px }` (au lieu de 48px) + commentaire mis à jour |

### Description technique
- Valeur **32 px** choisie pour couvrir la barre gestuelle Android (~24 dp) avec une marge de sécurité, sans laisser de vide important.
- Les utilitaires conservent leur marge propre, donc les zones sensibles restent protégées :
  - `.pb-safe` = `max(0.75rem, 32px)` → **32 px**
  - `.pb-safe-bar` = `32px + 0.75rem` → **44 px** (footers sticky : « Commander », « Suivant » de la recharge, compteur de course)
  - `.pb-safe-page` = `32px + 1.5rem` → **56 px** (dernier bloc des pages défilantes)
  - `.pb-safe-dialog` = `max(1.5rem, 32px)` → **32 px**
- Sur web/desktop, `--app-safe-bottom` reste `env(safe-area-inset-bottom, 0px)` : aucun impact.
- Le CSS seul change : aucun rebuild APK nécessaire, l'APK charge le site distant.

### Impact produit / comportement visible
- Le vide sous les barres d'action en mode APK passe de ~48 px à ~32 px (44 px pour les footers sticky).
- Les boutons du bas (« Commander », « Suivant » de la recharge, compteur de course, boutons flottants du portefeuille) restent au-dessus de la barre système.

### Risques & rollback
- **Risque** : sur les téléphones à **navigation 3 boutons** (barre d'environ 48 dp), il reste ~16 px sous un footer à 32 px — les footers sticky (44 px) restent corrects, mais un écran qui n'utilise que `.pb-safe` peut être très légèrement affleurant. Si un utilisateur remonte un bouton encore coupé, repasser à 40 px ou 48 px.
- **Rollback** : `git revert abfb7a4` (ou remettre `48px` dans `html.cap-apk`).

### Tests / vérifications
- [x] `npx vite build` OK — `html.cap-apk{--app-safe-bottom:32px}` présent dans `dist/assets/index-*.css`
- [ ] Test manuel Android (APK) : écran « Prix estimé » et modal « Montant de recharge » sur téléphone en navigation gestuelle **et** en navigation 3 boutons
- [ ] Déploiement Vercel vérifié

---

## 2026-11-11 — Responsivité : le bas des pages n'est plus coupé par la barre système Android

- **Commit** : `21b4579` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : sur plusieurs téléphones Android, le bas des écrans était inaccessible : le bouton « Réserver / Commander » de l'écran « Prix estimé » et le bouton « Suivant » de la fenêtre « Montant de recharge » se retrouvaient sous la barre de navigation système. Les barres d'action basses et les derniers blocs des pages devaient rester entièrement visibles.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `styles/globals.css` | **Entrée CSS réellement bundlée** : variable `--app-safe-bottom`, `html.cap-apk { --app-safe-bottom: 48px }`, utilitaires `.pb-safe`, `.pb-safe-bar`, `.pb-safe-page`, `.pb-safe-dialog`, `.pt-safe`, filet `.min-h-screen:not(.pb-safe-page) > *:last-child`, `.h-app` / `.min-h-app`, `.cap-apk .hide-in-apk` |
| `public/client-init.js` | Détection APK avant le premier rendu React (`?platform=apk`, `Capacitor.isNativePlatform()`, `localStorage.sc_is_apk`) + pose de `html.cap-apk` |
| `App.tsx` | `isNativeApp` élargi au bridge Capacitor (et plus seulement `?platform=apk`) |
| `components/passenger/EstimateScreen.tsx` | Footer sticky prix + « Commander » : `pb-safe-bar` |
| `components/passenger/RechargeModal.tsx` | Sheet `max-h-[92dvh]`, barre « Retour / Suivant » rendue `sticky bottom-0` avec `pb-safe-bar` |
| `components/ui/dialog.tsx` | `DialogContent` : `max-h-[92dvh] overflow-y-auto pb-safe-dialog` (toutes les modales) |
| `components/passenger/MapScreen.tsx` | Carte basse : `pb-[env(safe-area-inset-bottom)]` → `pb-safe` |
| `components/passenger/SearchingDriversScreen.tsx` | Barre basse de recherche : `pb-safe` |
| `components/passenger/RideInProgressScreen.tsx` | Compteur de course bas : `pb-safe-bar` |
| `components/passenger/RideTrackingScreen.tsx` | Carte de suivi basse : `pb-safe-bar` |
| `components/passenger/WalletScreen.tsx` | Boutons flottants (diagnostic / actualiser) remontés via `bottom-[calc(1.5rem+var(--app-safe-bottom))]` |
| `components/driver/DriverDashboardNew.tsx` | Barre de navigation fixe : `pb-safe` |
| `pages/TrackRidePage.tsx` | Carte basse publique : `pb-safe` |
| `components/passenger/DriverFoundScreen.tsx` | Boutons d'action bas : `pb-safe-page` |
| `components/driver/DriverRegistrationScreen.tsx` | Pied de formulaire : `pb-safe-page` |
| `components/passenger/PaymentScreen.tsx`, `PaymentMethodScreen.tsx`, `PaymentReceiptScreen.tsx`, `RatingScreen.tsx`, `RideCompletedScreen.tsx`, `ProfileScreen.tsx`, `RideScreen.tsx`, `LoginScreen.tsx`, `RegisterScreen.tsx`, `SupportScreen.tsx`, `RideHistoryScreen.tsx`, `PromoCodeScreen.tsx`, `LoyaltyScreen.tsx`, `ScheduledRides.tsx`, `components/AppNotificationsScreen.tsx`, `SettingsScreen.tsx`, `PrivacySettingsScreen.tsx`, `PaymentSettingsScreen.tsx` | Racine d'écran : `pb-safe-page` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Cause racine** : l'app native est une WebView Capacitor configurée sur `https://www.smartcabb.com/app/passenger?platform=apk` (`capacitor.config.ts`). La WebView dessine en *edge-to-edge* sous la barre de navigation système (≈48 dp), alors que `env(safe-area-inset-bottom)` y vaut **0** : tout `fixed`/`sticky bottom-0` et tout dernier bloc de page passait sous la barre.
- **Variable unique** : `:root { --app-safe-bottom: env(safe-area-inset-bottom, 0px) }` (0 sur desktop, valeur réelle sur iOS) puis `html.cap-apk { --app-safe-bottom: 48px }` pour Android/APK.
- **Détection précoce** : `public/client-init.js` (chargé en `<script>` dans `index.html`, avant `main.tsx`) pose `cap-apk` dès que `?platform=apk`, `window.Capacitor.isNativePlatform()` ou `localStorage.sc_is_apk === '1'`. Le flag est mémorisé pour survivre à une navigation qui perd la query string. `App.tsx` conserve la même détection pour le reste de l'init native.
- **Utilitaires** (avec `!important` pour primer sur les `p-4`/`pb-*` de Tailwind) : `.pb-safe` = `max(0.75rem, --app-safe-bottom)`, `.pb-safe-bar` = `--app-safe-bottom + 0.75rem`, `.pb-safe-page` = `--app-safe-bottom + 1.5rem`, `.pb-safe-dialog` = `max(1.5rem, --app-safe-bottom)`.
- **⚠️ Fichier CSS important** : le seul CSS bundlé est `styles/globals.css` (importé par `main.tsx`, Tailwind v4). `index.css` à la racine **n'est importé par personne** : les règles y sont inertes, elles ont donc été écrites uniquement dans `globals.css` (vérifié : `app-safe-bottom`, `pb-safe-bar`, `pb-safe-page`, `pb-safe-dialog` présents dans `dist/assets/index-*.css`).
- **Filet de sécurité** : `.min-h-screen:not(.pb-safe-page) > *:last-child { margin-bottom: max(0px, var(--app-safe-bottom)) }` — les pages non encore traitées remontent quand même leur dernier bloc. Les pages déjà passées en `pb-safe-page` sont exclues pour éviter un double espacement.
- **Modales** : `max-h-[92dvh]` (au lieu de `90vh`) + `pb-safe-dialog` sur la base `DialogContent`, donc toutes les modales de l'app gagnent la marge ; la fenêtre de recharge rend sa barre de navigation `sticky bottom-0` pour que « Suivant » reste atteignable même sur un sheet plein écran.
- **Correctif déployable sans rebuild APK** : l'APK charge le site distant ; un déploiement Vercel suffit.

### Impact produit / comportement visible
- Écran « Prix estimé » : le bloc prix + bouton « Commander » et la ligne « Réserver » restent entièrement visibles au-dessus de la barre système.
- Portefeuille → « Recharger » : les montants suggérés défilent, la barre « Retour / Suivant » reste collée en bas et ne passe plus sous la barre Android.
- Toutes les pages défilantes (profil, historique, paiement, réglages, support, notifications, inscription chauffeur…) terminent leur contenu au-dessus de la barre système.
- Sur navigateur desktop/web : aucun changement visuel (variable = 0).

### Risques & rollback
- **Risque** : en mode `cap-apk`, la réserve forcée de 48px ajoute ~24px de vide sur les téléphones en navigation gestuelle (barre fine). Sur les écrans à fond coloré, ce vide laisse apparaître le fond de page sous le footer.
- **Risque** : le filet `.min-h-screen > *:last-child` peut ajouter 48px sous un footer déjà traité ailleurs ; les pages principales sont exclues via `:not(.pb-safe-page)`.
- **Rollback** : `git revert 21b4579`. Pour désactiver la réserve sans redéployer de code, retirer la classe `cap-apk` (Client Init) ou passer `--app-safe-bottom` à `env(safe-area-inset-bottom, 0px)` dans `html.cap-apk`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK et utilitaires présents dans `dist/assets/index-*.css` (`app-safe-bottom` ×9, `pb-safe-bar`, `pb-safe-page`, `pb-safe-dialog`, `cap-apk`)
- [ ] Test manuel Android (APK) : écran « Prix estimé » (bouton « Commander » visible) et modal recharge (« Suivant » entièrement visible)
- [ ] Déploiement Vercel vérifié

---

## 2026-11-11 — Photo du véhicule obligatoire à l'inscription chauffeur

- **Commit** : `307c007` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : la photo du véhicule était présentée comme « optionnelle » et, surtout, n'était jamais envoyée au serveur : elle restait dans le navigateur. Or la photo du véhicule est une condition pour devenir chauffeur SmartCabb. Elle devient obligatoire dans le formulaire, transmise à l'inscription et visible par l'admin lors de la validation du dossier.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/driver/DriverRegistrationScreen.tsx` | Libellé `Photo du véhicule *`, encart bordé ambre tant qu'aucune photo, texte « obligatoire », validation bloquante dans `handleSubmit`, envoi de `vehiclePhoto` |
| `lib/auth-service-driver-signup.ts` | Nouveau champ `vehiclePhoto` (Base64) + `signupVersion: 2` dans le corps POST `/drivers/signup` |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | Lecture de `vehiclePhoto`, rejet `400` pour les clients v2 sans photo, persistance `vehicle.photo` et `vehicle_photo` |
| `components/admin/DriverDetailModal.tsx` | Onglet « Véhicule » : affichage de la photo ou alerte « dossier incomplet, ne pas valider » |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Contrôles côté client** : `vehiclePhoto` (fichier `File`) est distinct de `formData`. La validation s'exécute après les informations véhicule et avant la photo de profil / les CGU / l'OTP : `if (!vehiclePhoto) { toast.error('Veuillez ajouter la photo du véhicule (obligatoire pour devenir chauffeur)'); return; }`. Le fichier est converti en Base64 par `FileReader` (`vehiclePhotoPreview`), comme la photo de profil. Contraintes inchangées : JPG/JPEG, max 1 Mo.
- **Transport** : `signUpDriver()` accepte `vehiclePhoto?: string`, l'ajoute au JSON de `/drivers/signup` et envoie `signupVersion: 2`.
- **Rétro-compatibilité serveur** : le champ n'est **exigé** que si `Number(body.signupVersion || 0) >= 2`. Un ancien APK (qui n'envoie pas `signupVersion`) continue de s'inscrire : l'Edge Function journalise simplement `⚠️ Inscription sans photo de véhicule (client ancien)`. Cela évite de bloquer les chauffeurs sur une version non mise à jour pendant la propagation du déploiement.
- **Persistance** : `vehicle.photo` (objet véhicule imbriqué, format lu par l'admin) et `vehicle_photo` (champ à plat, compatibilité). Aucune migration : le profil conducteur est stocké dans le KV (`profile:{id}` / `driver:{id}`).
- **Validation admin** : l'onglet « Véhicule » de `DriverDetailModal` lit `driver.vehicle?.photo || driver.vehicle_photo`. Si absent → encart ambre « Photo du véhicule manquante — dossier incomplet, ne pas valider le chauffeur ».

### Impact produit / comportement visible
- Le chauffeur ne peut plus soumettre son inscription sans photo de son véhicule.
- La photo est réellement enregistrée avec le dossier, donc vérifiable par l'équipe avant approbation.
- L'admin voit la photo (ou l'alerte) dans le dossier, onglet « Véhicule ».

### Risques & rollback
- **Risque** : taille du profil KV (+ jusqu'à ~1,4 Mo de Base64 par dossier) — même mécanisme que la photo de profil déjà en place.
- **Risque** : un ancien APK contourne encore l'obligation (choix assumé pour éviter un blocage de service) ; l'alerte admin permet de refuser le dossier.
- **Rollback** : retirer le bloc `if (!vehiclePhoto)` et le champ `vehiclePhoto` de `signUpDriver`, et le contrôle `signupVersion` dans `driver-routes.ts`. Les profils déjà créés conservent leur photo (champ optionnel à la lecture).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build`
- [ ] Inscription complète avec photo : validation manuelle (formulaire `/app/driver/signup`)
- [ ] Inscription sans photo : message d'erreur et blocage
- [ ] Dossier admin : photo visible dans l'onglet « Véhicule » après inscription

---

## 2026-11-11 — Pages de conversion dédiées `/commander` et `/reserver`

- **Commit** : `cdbd981` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : les deux boutons principaux de la page d'accueil (« Commander une course », « Réserver votre chauffeur ») envoyaient directement dans l'application, sans argumentaire ni continuité visuelle. On aligne leur parcours sur celui de « Devenir chauffeur » : une page publique dédiée qui vend le service, puis l'application avec le bon écran.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/public/LandingKit.tsx` | **Nouveau** : styles partagés `lk-*`, hook `useInViewCustom`, couleurs `SITE_BLUE` / `SITE_NAVY` |
| `pages/OrderRidePage.tsx` | **Nouveau** : page `/commander` (hero, 3 étapes, 4 catégories, bénéfices, FAQ, CTA final) |
| `pages/BookDriverPage.tsx` | **Nouveau** : page `/reserver` (hero, cas d'usage, 3 étapes, tarifs journée/aéroport, inclus, FAQ, CTA) |
| `App.tsx` | Imports lazy `OrderRidePage` / `BookDriverPage`, routes `/commander` et `/reserver`, ajout à `VITRINE_ROUTES` |
| `pages/LandingPage.tsx` | Hero : « Commander » → `/commander`, « Réserver » → `/reserver` ; CTA « Pourquoi » → `/commander` |
| `pages/ServicesPage.tsx` | `BOOK_URL` → `/commander` |
| `pages/PassengerApp.tsx` | Deep links `?screen=map` **et** `?screen=scheduled-rides` (connecté = direct, sinon mémorisation + nettoyage de l'URL) |
| `components/passenger/LoginScreen.tsx` | Consomme n'importe quel `sc_pending_screen` (`map` / `scheduled-rides`) puis le supprime |
| `lib/simple-router.tsx` | `navigate()` ne stocke plus la query string ni le hash dans `pathname` |
| `components/SeoHead.tsx` | Entrées SEO `/commander` et `/reserver` (title, description, canonical) |
| `public/sitemap.xml` | Ajout des deux URLs, priorité 0.9 |
| `docs/PAGES_CONVERSION.md` | **Nouveau** : parcours, deep links, tarifs, tests |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Pages** : composants autonomes réutilisant `SiteNavigation`, `PageHero`, `ProfessionalFooter`, `ChatWidget`. Aucune requête réseau, aucun état global, donc aucun risque de régression métier. Les styles `lk-*` sont injectés via `LandingKitStyles` (classes préfixées pour éviter toute collision avec Tailwind ou les styles du landing).
- **Contenu commercial** : tarifs repris de `PRICING_CONFIG` et de `RESERVATION_TARIFFS_USD` — journée 60 / 80 / 100 / 160 $, aéroport 40 / 50 / 65 / 160 $, acompte 50 %, carburant à la charge du client en location journalière, hors Kinshasa sur devis.
- **Liens entrants** : la landing n'a plus aucun CTA « Commander » qui pointe vers `/app/passenger` (les boutons « Connexion » restent inchangés). `ServicesPage` redirige aussi ses CTA « Commander » vers la nouvelle page.
- **Deep links** : `PassengerApp` lit `window.location.search` au montage. Connecté → `setCurrentScreen(<écran>)` + `history.replaceState` pour retirer la query. Déconnecté → `localStorage.sc_pending_screen`, consommé par `LoginScreen` après authentification. Le `removeItem` est désormais systématique pour ne pas rejouer une redirection périmée.
- **Correctif routeur** : `navigate()` faisait `setPathname(path)` avec la query. `<Routes>` compare `pathname` à `/app/passenger/*`, donc `/app/passenger?screen=map` tombait sur `/app/*` → `Navigate` vers `/app/landing`, deep link perdu. Le `pathname` d'état est maintenant `path.split('#')[0].split('?')[0]`, tandis que `history.pushState` conserve l'URL complète (donc `window.location.search` reste lisible).
- **SEO / dark mode** : `SeoHead` gère désormais title/description/canonical des deux routes et le sitemap les liste ; `VITRINE_ROUTES` les inclut pour neutraliser le dark mode.

### Impact produit / comportement visible
- Cliquer « Commander une course » ouvre une page explicative (prix, catégories, garanties, FAQ) au lieu de demander immédiatement une connexion.
- Cliquer « Réserver votre chauffeur » ouvre une page dédiée à la réservation planifiée (cas d'usage, tarifs, acompte 50 %).
- Depuis ces pages, le CTA final ouvre l'application sur le bon écran, y compris après connexion.
- Aucune redirection cassée pour les anciens liens `?screen=scheduled-rides` : ils restent supportés.

### Risques & rollback
- **Risque** : contenu marketing (tarifs) à maintenir en cohérence avec la grille réelle ; si la grille change, mettre à jour `OrderRidePage` / `BookDriverPage` en plus de `pricing-data.ts`.
- **Risque** : le correctif de `simple-router` touche toute la navigation ; il ne modifie que le matching (la query n'a jamais fait partie des routes déclarées), donc pas d'effet attendu sur les routes existantes.
- **Rollback** : retirer les deux `<Route>` et les deux imports d'`App.tsx`, puis remettre les deux liens du hero de `LandingPage` vers `/app/passenger` et `/app/passenger?screen=scheduled-rides`. Les fichiers ajoutés peuvent rester en place sans effet.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` (chunks `OrderRidePage-*.js` et `BookDriverPage-*.js` produits)
- [ ] Parcours connecté / déconnecté sur `/commander` et `/reserver` : validation manuelle en production
- [ ] Contrôle visuel mobile (hero, grilles de cartes, FAQ)

---

## 2026-11-11 — SOS Lot B : écran admin temps réel, veilleur et alarme

- **Commit** : `e350cd7` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : permettre à l'équipe d'exploitation de voir, entendre et traiter les alertes SOS en temps réel sans surveiller la base ni appeler l'API manuellement. Le Lot A enregistrait bien les alertes, mais rien ne prévenait l'admin qu'une alerte venait d'arriver.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/emergency-admin-service.ts` | **Nouveau** : client admin (`/active`, `/alerts`, `ack`, `resolve`), normalisation des alertes, helpers SLA (`secondsBetween`, `formatDuration`) |
| `lib/notification-sound.ts` | Ajout de `playSosAlarm()` : sirène carrée, vibration longue, notification navigateur persistante, annonce vocale |
| `components/admin/EmergencyAlertsScreen.tsx` | **Nouveau** : écran « Urgences SOS » (KPI, filtres, cartes, chrono SLA, appel/itinéraire, acquitter, clôturer, faux positif) |
| `components/admin/EmergencyAlertsWatcher.tsx` | **Nouveau** : veilleur global (bannière rouge, pastille flottante, alarme, ré-alarme 2 min) |
| `pages/AdminApp.tsx` | Écran `admin-emergencies` dans les deux listes valides, rendu lazy, montage du veilleur |
| `components/admin/AdminDashboard.tsx` | Action rapide « Urgences SOS » en tête + compteur d'alertes actives et style urgent |
| `docs/EMERGENCY_SOS.md` | Sections Lot B, fichiers, limites et tests |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Client admin** (`lib/emergency-admin-service.ts`) : toutes les requêtes utilisent le **JWT de session admin** (`supabase.auth.getSession()`), jamais la clé anon (les routes `/alerts`, `/active`, `ack`, `resolve` répondraient 403). Timeout 15 s, messages d'erreur explicites pour 401 (session expirée) et 403 (compte non admin). `normalizeAlert()` tolère les champs manquants et force les enums (`role`, `type`, `status`).
- **Écran** (`EmergencyAlertsScreen`) : chargement `GET /emergency/alerts?limit=200`, filtrage local (en cours / toutes / clôturées). Chrono SLA recalculé chaque seconde ; une alerte `active` de plus de **60 s** passe en rouge « SLA dépassé ». Realtime Supabase (`postgres_changes` sur `emergency_alerts`) + polling de secours toutes les **15 s**. Acquittement (`/ack`) et clôture (`/resolve`) avec note et option `false_alarm`.
- **Veilleur global** (`EmergencyAlertsWatcher`) : monté dans `AdminApp` hors login/register. Polling `GET /emergency/active` toutes les 20 s + Realtime. Sur nouvelle alerte (ou alerte `active` non acquittée depuis > 2 min), joue `playSosAlarm()` et affiche une bannière rouge. Les alertes présentes au premier chargement sont mémorisées **sans** alarme (pas de sirène à chaque actualisation de page). Sourdine automatique quand l'écran Urgences est ouvert pour éviter le double son. Le réglage « alarme active/coupée » est partagé via `localStorage` (`smartcabb_sos_sound`).
- **Dashboard** : compteur `sosCount` rafraîchi toutes les 30 s via `getActiveEmergencies()` ; carte rouge pulsée quand > 0.
- Aucune migration ni modification backend : les routes et la table du Lot A sont réutilisées telles quelles.

### Impact produit / comportement visible
- L'admin voit immédiatement une bannière rouge « N alertes SOS en cours » et entend une sirène, même s'il est sur un autre écran.
- L'écran « Urgences SOS » centralise le traitement : appel direct, itinéraire, acquittement, clôture motivée.
- Les alertes non prises en charge sont ré-alarmées toutes les 2 minutes.
- Aucune notification n'est envoyée au passager ou au conducteur : la règle de sécurité du Lot A reste inchangée.

### Risques & rollback
- **Risque** : sirène répétée si une alerte de test reste `active` ; double son si le veilleur et l'écran sont montés simultanément (mitigé par `currentScreen`). Sirène bloquée par la politique navigateur avant le premier clic (comportement standard, pas une régression).
- **Rollback** : retirer `admin-emergencies` des deux listes de `pages/AdminApp.tsx` et l'action rapide du dashboard ; les fichiers ajoutés peuvent rester sans effet. Aucune donnée n'est modifiée par le Lot B (lecture + `ack`/`resolve` déjà existants).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` (chunk `EmergencyAlertsScreen-*.js` produit)
- [x] `GET /emergency/active`, `POST /:id/ack`, `POST /:id/resolve` avec JWT admin (Lot A, revérifiés)
- [ ] Bannière + sirène + ré-alarme : validation manuelle en production
- [ ] Realtime : validation manuelle (polling de secours actif sinon)

---

## 2026-11-09 — SOS : socle fiable (persistance, position réelle, statut honnête)

- **Commit** : `2ca6adb` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : rendre le bouton SOS réellement fonctionnel. Jusqu'ici, les écrans passager appelaient une route `/emergency/sos` **inexistante** (404) tout en affichant « Alerte SOS envoyée ! Les services d'urgence ont été notifiés ». Aucune alerte n'était enregistrée, et le composant conducteur (`EmergencyAlert`) envoyait le SMS d'urgence **à l'autre partie de la course**.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/migrations/20261108000000_emergency_alerts.sql` | Nouvelle table `emergency_alerts`, index, RLS, publication Realtime |
| `supabase/migrations/20261109000000_cleanup_sos_test_rows.sql` | Suppression des alertes de test techniques |
| `supabase/migrations/20261109000001_cleanup_sos_test_rows.sql` | Seconde passe de nettoyage après vérification manuelle post-déploiement |
| `supabase/migrations/20260611000000_scheduled_rides.sql` | **Supprimé** : doublon de version avec `20260611000000_setup_scheduled_rides.sql`, bloquait `supabase db push` |
| `supabase/functions/make-server-2eb02e52/emergency-routes.ts` | Nouvelles routes `/emergency/*` |
| `supabase/functions/make-server-2eb02e52/index.ts` | Montage du routeur `/emergency` |
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | Clés `emergencyNumbers`, `emergencySmsEnabled` + normalisation `smsProvider` |
| `lib/emergency-service.ts` | Client HTTP SOS, cache de config 5 min, gestion d'erreur explicite |
| `components/emergency/SOSButton.tsx` | Bouton réutilisable passager/conducteur + état « SOS ACTIF » |
| `components/emergency/SOSDialog.tsx` | Dialogue 4 étapes avec position GPS réelle et repli `tel:` |
| `components/passenger/LiveTrackingScreen.tsx` | Suppression du faux SOS, utilisation de `SOSButton` |
| `components/passenger/RideTrackingScreen.tsx` | Idem |
| `components/driver/ActiveRideNavigationScreen.tsx` | Bouton SOS compact dans l'en-tête conducteur |
| `components/admin/GlobalSettingsScreen.tsx` | Carte « Urgences (SOS) » (police, ambulance, support, SMS) |
| `lib/config-sync.ts` | Type et défauts `emergencyNumbers` / `emergencySmsEnabled` |
| `lib/sms-service.ts` | Suppression de `sendEmergencyAlert()` et des templates `emergency_alert_*` |
| `components/EmergencyAlert.tsx` | **Supprimé** (jamais monté, notifiait l'autre partie) |
| `components/driver/SOSEmergencyButton.tsx` | **Supprimé** (jamais utilisé, imports cassés) |
| `docs/EMERGENCY_SOS.md` | Documentation de référence du dispositif |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Table** `emergency_alerts` : `user_id text`, `role`, `ride_id`, `type` (4 valeurs), `status` (5 valeurs), `lat/lng/accuracy`, `address`, `note`, `vehicle_info`, `counterpart_*`, `metadata jsonb`, cycle `created_at → ack_* → resolved_*`. RLS en lecture seule (propriétaire ou admin) ; écritures via service role uniquement. Table ajoutée à `supabase_realtime`.
- **Routes** : `GET /config`, `POST /sos`, `POST /:id/cancel`, `POST /:id/ack`, `POST /:id/resolve`, `GET /alerts`, `GET /active`. `/sos` et `/cancel` acceptent l'anon key ou une session ; `/ack`, `/resolve`, `/alerts`, `/active` exigent un JWT admin (`user_metadata.role` ou `app_metadata.role`).
- **Anti-abus** : 3 alertes / 10 min / utilisateur, 10 / 10 min / IP, anti-doublon 90 s (même alerte renvoyée avec `deduplicated: true`). L'identité d'une session vérifiée prime sur `body.userId`.
- **Position** : `lib/graceful-geolocation` avec `enableHighAccuracy` et timeout 8 s. Si le GPS est indisponible, `lat/lng` restent `NULL` et `metadata.locationSource = 'default'` — **aucune fausse coordonnée** (l'ancien code envoyait la position du départ).
- **UI** : un seul composant pour tous les écrans. Statut « Alerte enregistrée » uniquement après un `201` du backend ; en cas d'échec, message explicite + boutons `tel:` Police / Ambulance / Support, et bouton « Réessayer ». Annulation en deux temps (confirmation) pour éviter les annulations accidentelles.
- **Résilience** : si le jeton de session est refusé (`401`), `sendSos` et `cancelSos` retentent une fois avec la clé publique de l'app — une alerte SOS ne doit pas échouer sur un jeton périmé.
- **Notification** : par défaut aucune. Si `emergencySmsEnabled` est actif **et** `emergencyNumbers.support` renseigné, un SMS court part via EJ SMS. L'échec SMS n'empêche pas l'enregistrement de l'alerte.
- **Config** : ajout de `emergencyNumbers { police, ambulance, support }` et `emergencySmsEnabled` dans `DEFAULT_CONFIG` backend et front. `smsProvider` est normalisé en `ejsms` (sauf `disabled`) à la lecture, car le KV contenait encore `africas_talking`.
- **Migrations** : `20261012000000_add_rls_policies.sql` était présent en local mais absent de l'historique distant ; il a été appliqué. Le fichier `20260611000000_scheduled_rides.sql` (même version que `setup_scheduled_rides.sql`, contenu inclus dans ce dernier) a été supprimé pour débloquer `db push`.

### Impact produit / comportement visible
- Le bouton SOS **fonctionne** : l'alerte est enregistrée avec la vraie position et un identifiant de référence.
- Plus de faux message « services d'urgence notifiés ».
- Le conducteur dispose aussi d'un SOS (auparavant aucun bouton fonctionnel).
- Le dialogue affiche les numéros Police / Ambulance / Support, modifiables par l'admin sans redéploiement.
- L'autre partie de la course n'est jamais prévenue.

### Risques & rollback
- **Risque** : si `emergencyNumbers.support` est renseigné et `emergencySmsEnabled = true`, chaque alerte consomme 1 crédit EJ SMS. Valeur par défaut : `false`.
- **Risque** : les numéros `112` / `115` restent à valider auprès des autorités ; modifiables dans Paramètres globaux.
- **Risque** : la suppression de `20260611000000_scheduled_rides.sql` ne change rien en base (contenu déjà appliqué via `setup_scheduled_rides.sql`).
- **Rollback** : `git revert` du commit ; `emergencySmsEnabled = false` ; la table peut rester en place sans effet de bord.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors `_headers`)
- [x] `npx vite build`
- [x] `GET /emergency/config` sans jeton → `401` ; avec anon key → `200`
- [x] `POST /emergency/sos` sans jeton → `401` ; sans `userId` → `400`
- [x] `POST /emergency/sos` avec anon key → `201` + alerte persistée
- [x] Second envoi < 90 s → `deduplicated: true`
- [x] `POST /:id/cancel` par l'auteur → `cancelled` ; par un autre → `403`
- [x] `GET /emergency/alerts` / `/active` avec anon key → `401`
- [x] `GET /rest/v1/emergency_alerts` avec anon key → `[]` (RLS active)
- [x] Migration `20261108000000` appliquée (`supabase db push`)
- [x] Edge Function déployée
- [ ] Test utilisateur dans l'application (passager + conducteur)

---

## 2026-11-08 — Landing : témoignage congolais, CTA « Réserver votre chauffeur » et retrait de la photo au taxi jaune

- **Commit** : `f53232a` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : ajuster le contenu marketing de la page d'accueil — reformuler le témoignage de Marie Tshimanga, aligner le libellé du bouton de réservation sur les standards du secteur, et retirer du carrousel d'arrière-plan la photo où l'on voit un taxi jaune.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `contexts/LanguageContext.tsx` | Témoignage `client2.text` FR/EN remplacé |
| `pages/LandingPage.tsx` | CTA hero « Réserver votre chauffeur » ; `Images_2.jpeg` retiré du carrousel de fond |
| `pages/ServicesPage.tsx` | CTA services « Réserver votre chauffeur » |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Témoignage** : `testimonials.client2.text` devient « Enfin, une application proche de nos réalités congolaises. » (EN : « Finally, an app close to our Congolese realities. »).
- **CTA** : dans le hero, le libellé passe de « Réserver une course » à « Réserver votre chauffeur » (EN : « Book your driver »). Même changement sur le bouton des cartes services. Le lien reste `/app/passenger?screen=scheduled-rides`.
- **Arrière-plan** : `backgrounds` ne contient plus que `hero-driver.jpg`, `photo2_smartcabb.jpeg` et `fille_smartcabb.jpg`. Le fondu enchaîné s'adapte automatiquement (modulo sur la nouvelle longueur). Le fichier `public/Images_2.jpeg` est conservé car il sert encore de `fallbackImage` sur `ContactPage`.

### Impact produit / comportement visible
- Le carrousel du hero ne montre plus la photo de la chaussée avec les taxis jaunes.
- Le bouton de réservation affiche « Réserver votre chauffeur » sur l'accueil et la page Services.

### Risques & rollback
- **Risque** : faible, contenu marketing uniquement.
- **Rollback** : `git revert f53232a`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors `_headers`)
- [x] `npx vite build`
- [ ] Vérification visuelle après déploiement Vercel

---

## 2026-11-07 — SMS/OTP : sécurisation des routes et anti-abus des crédits

- **Commit** : `aeb6205` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security
- **Objectif** : empêcher que les routes SMS publiques (Edge Function en `verify_jwt = false`) soient utilisées pour épuiser les crédits EJ SMS ou lire les numéros de téléphone, alors que 30 crédits de test vont être accordés.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/sms-routes.ts` | Garde `requireAdmin` / `requireAppOrUser`, diagnostic réservé admin, limites de débit, plafond de message |
| `supabase/functions/make-server-2eb02e52/otp-routes.ts` | Jeton obligatoire sur `/otp/send` et `/otp/verify`, limite 10 demandes/10 min par IP |
| `supabase/functions/make-server-2eb02e52/reservation-routes.ts` | Jeton obligatoire sur `/:id/notify-accept` |
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | `hasValidAdminJwt()` sur `/admin/sms/balance` |
| `components/admin/SMSBalanceCard.tsx` | Envoie le jeton de session admin au lieu de l'anon key |
| `docs/EJSMS_INTEGRATION.md` | Tableau des accès par route |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **`/sms/logs`, `/sms/test`, `/sms/balance`, `/admin/sms/balance`** : JWT de session obligatoire, rôle `admin` lu dans `user_metadata.role` **ou** `app_metadata.role`. Retour `401` sans jeton, `403` si non-admin.
- **`/sms/config`** : anon key ou utilisateur accepté ; le bloc `diagnostics` n'est renvoyé qu'à un admin.
- **`/sms/send`** : anon key ou utilisateur connecté (l'inscription envoie des SMS avant connexion) ; message limité à 480 caractères ; limite **30 envois / 10 min / IP** et **3 / 10 min / destinataire** (map en mémoire d'isolate).
- **`/otp/send` / `/otp/verify`** : jeton obligatoire (anon key ou session) ; limite **10 demandes / 10 min / IP**, en plus du cooldown existant de 60 s par numéro.
- **`/reservations/:id/notify-accept`** : jeton obligatoire avant tout envoi push/SMS.
- Comparaisons de clés en **temps constant** (`safeEqual`) pour l'anon key.

### Impact produit / comportement visible
- Aucun changement pour l'utilisateur légitime : l'app envoie déjà l'anon key ou le jeton de session.
- Un appel anonyme à `/sms/logs` ou `/sms/test` renvoie désormais `401` au lieu d'exécuter l'action.
- Les rafales d'OTP ou de SMS sont freinées (`429`).

### Risques & rollback
- **Risque** : un client ancien appelant `/sms/send` sans en-tête `Authorization` recevrait `401`. Tous les appels du repo envoient déjà l'anon key.
- **Risque** : si le rôle admin est stocké ailleurs que dans `user_metadata`/`app_metadata`, les écrans admin SMS renverront `403`.
- **Rollback** : revert du commit ; les routes redeviennent publiques (non recommandé).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors `_headers`)
- [x] `npx vite build`
- [ ] `GET /sms/logs` sans jeton → `401`
- [ ] `GET /sms/logs` avec anon key → `403`
- [ ] `GET /sms/config` avec anon key → `200` sans `diagnostics`

---

## 2026-11-07 — EJ SMS : diagnostic de configuration et vérification du compte

- **Commit** : `9c7074c` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : chore
- **Objectif** : diagnostiquer le refus `Invalid client or Invalid client credentials` puis le `404 Aucun solde SMS` rencontrés à la mise en service d'EJ SMS, sans jamais exposer les secrets.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ej-sms-core.ts` | Ajout de `ejSmsDiagnostics()` (présence, longueurs, format, espaces parasites, sender, scope, URLs) |
| `supabase/functions/make-server-2eb02e52/sms-routes.ts` | `GET /sms/config` renvoie `diagnostics` |
| `docs/EJSMS_INTEGRATION.md` | Diagnostic documenté, cas `Aucun solde SMS` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- `ejSmsDiagnostics()` ne lit que des métadonnées : `clientIdPresent`, `clientIdLength`, `clientIdFormatValid` (`^ejsms-[\w-]+$`), `clientIdHasOuterWhitespace`, `clientSecretPresent`, `clientSecretLength`, `clientSecretHasOuterWhitespace`, `sender`, `scope`, `tokenUrl`, `callbackUrl`, `apiBase`. Aucune valeur, aucun préfixe de secret.
- `GET /sms/config` (public, `verify_jwt = false`) inclut ce bloc ; il reste sans risque car aucune donnée exploitable n'y figure.
- Cause racine identifiée en production : `EJSMS_CLIENT_ID` stocké en majuscules (`EJSM…`) alors que Keycloak est sensible à la casse → `Invalid client`. Après correction en `ejsms-…`, le token OAuth est délivré.
- Second constat : `GET /sms/credits/balance` renvoie `404 Aucun solde SMS` et `GET /sms/credits/movements` renvoie `[]` → **aucun pack de crédits acheté** sur le compte.

### Impact produit / comportement visible
- Aucun changement fonctionnel : seul l'endpoint de diagnostic est enrichi.
- Tant qu'aucun crédit n'est acheté, les envois OTP/SMS échouent côté fournisseur (échec gracieux côté app).

### Risques & rollback
- **Risque** : information de configuration (présence des secrets) visible sur un endpoint public.
- **Rollback** : retirer le champ `diagnostics` de `/sms/config` et redéployer.

### Tests / vérifications
- [x] Token OAuth obtenu (`access_token` ~1054 caractères) avec le Client ID corrigé
- [x] `GET /sms/credits/movements` → `[]` (aucun achat)
- [x] `GET /sms/credits/balance` → `404 Aucun solde SMS`
- [ ] Achat de crédits puis `GET /sms/balance` attendu en `200`

---

## 2026-11-07 — SMS : remplacement d'Africa's Talking par EJ SMS (EJSARL)

- **Commit** : `b1f596e` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : basculer l'ensemble des SMS transactionnels (codes OTP, confirmation de réservation, notifications) sur **EJ SMS (EJSARL)**, retirer Africa's Talking et Twilio, et sécuriser les accusés de réception par une signature HMAC-SHA512.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ej-sms-core.ts` | **Nouveau** : client EJ SMS (token OAuth caché, `toMsisdn`, envoi, solde, vérification de signature) |
| `supabase/functions/make-server-2eb02e52/sms-routes.ts` | **Réécrit** : `/config`, `/send`, `/balance`, `/logs`, `/test`, webhook `/dlr` signé |
| `supabase/functions/make-server-2eb02e52/otp-core.ts` | WhatsApp supprimé, `sendOTPViaSMS()` passe par EJ SMS |
| `supabase/functions/make-server-2eb02e52/otp-routes.ts` | Canal unique SMS, plus de fallback WhatsApp |
| `supabase/functions/make-server-2eb02e52/reservation-routes.ts` | `sendSMS()` via EJ SMS, canal `channels.sms` uniquement |
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | `/sms/balance` en crédits EJ SMS + statistiques, `smsProvider: "ejsms"` |
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | `smsProvider: "ejsms"` par défaut |
| `supabase/functions/make-server-2eb02e52/phone-utils.ts` | Commentaires : format canonique `+243`, conversion EJ SMS déléguée |
| `components/admin/SMSSettingsScreen.tsx` | Fournisseur `ejsms` unique + instructions EJ SMS |
| `components/admin/SMSInsufficientBalanceBanner.tsx` | Textes et lien vers le panel EJ SMS |
| `components/admin/TestSMSConfigScreen.tsx` | Diagnostic basé sur `/sms/config` |
| `components/admin/GlobalSettingsScreen.tsx`, `components/admin/AdminDashboard.tsx` | Libellés/menu EJ SMS |
| `components/driver/DriverScheduledRides.tsx` | Toast sans WhatsApp |
| `lib/sms-service.ts`, `lib/otp-service.ts`, `lib/config-sync.ts`, `hooks/useSettings.ts` | Type/provider `ejsms`, canal SMS unique |
| `docs/EJSMS_INTEGRATION.md` | **Nouveau** : documentation complète de l'intégration |
| `AGENTS.md` | Nouveaux secrets `EJSMS_*`, retrait d'`AFRICAS_TALKING_*` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Authentification** : OAuth 2.0 `client_credentials` sur `auth.ejsarl.cd/realms/ej-sms`, scope `sms:send sms:read`. Jeton de 300 s renouvelé à 90 %, cache mémoire puis KV (`ejsms_token_cache`), un seul retry sur `401`.
- **Envoi** : `POST /sms/send` avec `{ sender, message, msisdn, callbackUrl }`. Conversion systématique `+243XXXXXXXXX` → `243XXXXXXXXX` par `toMsisdn()` ; l'app conserve le format `+243`.
- **Solde** : `GET /sms/credits/balance` → `{ entrepriseId, solde, statut, dateUpdate }`, exposé en crédits (1 crédit = 1 SMS).
- **OTP** : un seul canal, SMS. `sendOTPViaWhatsApp()` supprimé ; le contrat de réponse devient `channel: "sms"`.
- **Réservations** : `channels.whatsapp` supprimé ; seul `channels.sms` est renvoyé (échec gracieux, la réservation reste valide).
- **DLR** : `POST /sms/dlr` lit le corps **brut**, vérifie `X-EJSms-Signature` (HMAC-SHA512 hex, comparaison temps constant), met à jour `sms_log:<reference>` ou écrit `sms_dlr:<reference>` pour audit, répond 200 en moins de 10 s.
- **Logs** : chaque envoi écrit `sms_log:<id|reference>` avec `status` normalisé (`PENDING`, `SENT`, `DELIVERED`, `FAILED`, `CANCELLED`, `SCHEDULED`) et `provider: "ejsms"`.

### Impact produit / comportement visible
- Les codes OTP et les confirmations de réservation arrivent désormais **par SMS uniquement** (plus de WhatsApp).
- L'admin voit le solde en **crédits EJ SMS** et l'historique des envois dans « Paramètres SMS ».
- L'écran de paramètres ne propose plus que EJ SMS ; la bannière de solde insuffisant renvoie vers `sms.ejsarl.cd`.

### Risques & rollback
- **Risque** : aucune livraison tant que les secrets `EJSMS_*` ne sont pas créés et que le compte EJ SMS n'a pas de crédits.
- **Risque** : DLR rejetés en `401` si `EJSMS_WEBHOOK_SECRET` diffère du secret du panel.
- **Rollback** : `git revert b1f596e` puis redéployer l'Edge Function ; recréer les secrets `AFRICAS_TALKING_*` si l'ancien fournisseur doit être réactivé.
- **Secrets à créer** : `EJSMS_CLIENT_ID`, `EJSMS_CLIENT_SECRET`, `EJSMS_SENDER=SMARTCABB`, `EJSMS_WEBHOOK_SECRET`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` (succès)
- [ ] Test réel OTP/SMS après création des secrets et achat de crédits
- [ ] Test DLR signé depuis le panel EJ SMS

---

## 2026-11-07 — Portefeuille chauffeur simplifié : recharge libre ≥ 5 000 CDF, éligibilité par solde

- **Commit** : `9fcec83` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : supprimer les forfaits (Starter / Standard / Pro) au profit d'une recharge simple à montant libre, avec un **minimum de 5 000 CDF**, et s'appuyer sur la logique d'éligibilité existante (solde minimum par catégorie + mise hors ligne automatique après course).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/driver/DriverWalletScreen.tsx` | **Réécrit** : plus de forfaits ni de durée ; montant libre (presets 5 000 / 10 000 / 20 000 / 50 000), solde + badge Éligible/Non éligible + manque à gagner, paiement Ejpay sans `days`, relecture du solde serveur |
| `components/driver/DriverDashboardNew.tsx` | Modale Portefeuille : « Forfait actif jusqu'au » remplacé par le seuil d'éligibilité et le manque à gagner, CTA « Recharger mon compte » |
| `components/driver/DriverDashboard.tsx` | Idem sur l'ancien tableau de bord |
| `docs/EJPAY_INTEGRATION.md` | Section recharge chauffeur : suppression de `metadata.days`, éligibilité par solde |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Suppression des forfaits** : la constante `WALLET_PACKAGES` (Starter / Standard / Pro), le sélecteur de forfait et toute notion de durée/expiration disparaissent de l'écran chauffeur.
- **Montant libre** : champ numérique + 4 montants rapides, bornes `5 000 ≤ montant ≤ 1 000 000` CDF, aperçu « Nouveau solde après recharge » et mention de l'éligibilité si le seuil est franchi.
- **Éligibilité** : `getMinimumCreditForCategory(catégorie)` (15 % du tarif de base, source `lib/pricing-data.ts`) pilote le badge **Éligible / Non éligible** et le manque à gagner. Aucune logique d'éligibilité n'a été réécrite : `handleToggleOnline` et la mise hors ligne automatique du backend restent la référence.
- **Paiement** : `useEjpayCheckout().pay()` avec `metadata.type = 'driver_wallet_recharge'` (résolu en `kind = driver_wallet_topup` côté provider) et `metadata` **sans `days`**. Après `SUCCESS`, le client relit `GET /drivers/:id` (3 tentatives espacées de 1,5 s) pour afficher le solde réel ; aucun crédit côté navigateur.
- **Backend inchangé** : `creditDriverWallet()` ne prolonge `wallet_expiry_date` que si `order.metadata.days > 0`. Sans `days`, seul le solde est crédité (+ `creditBalance`, `wallet_tx`, push). L'idempotence reste garantie par `settledAt`.
- **Modales Portefeuille** : affichage du solde, seuil applicable à la catégorie du véhicule et montant manquant ; le bouton mène à l'écran de recharge.

### Impact produit / comportement visible
- Chauffeur : un seul écran, « Recharger mon compte », montant libre à partir de 5 000 CDF, opérateur + numéro + logos officiels. Le badge indique immédiatement si le compte peut recevoir des courses et combien il manque.
- Les anciens forfaits et dates d'expiration ne bloquent plus rien : l'éligibilité dépend **uniquement** du solde.
- Après une course, si le solde repasse sous le seuil, le chauffeur est toujours mis hors ligne automatiquement par le backend ; il recharge pour redevenir éligible.

### Risques & rollback
- **Risque** : un ancien `wallet_expiry_date` reste stocké côté serveur mais n'est plus utilisé pour l'éligibilité (aucun effet fonctionnel).
- **Rollback** : `git revert` du commit. Les ordres Ejpay déjà réglés ne sont jamais rejoués (`settledAt`), donc aucun double crédit possible.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] Aperçu navigateur (`vite preview`) : écran de recharge affiché, solde, manque à gagner, presets, logos opérateurs
- [ ] Recharge réelle chauffeur ≥ 5 000 CDF (à valider par l'utilisateur sur téléphone)
- [ ] Déploiement vérifié (Vercel / Edge Function)

---

## 2026-11-07 — « Bon retour » : écran d'accueil personnalisé à la reconnexion

- **Commit** : `cb35c02` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : afficher un écran de bienvenue personnalisé (nom + photo) quand un utilisateur retrouve sa session ou se reconnecte, comme dans les applications mobiles grand public.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/WelcomeBackGate.tsx` | **Nouveau** : détecte la session restaurée / la connexion et affiche l'écran une fois par session |
| `components/WelcomeBackScreen.tsx` | Modes `welcome` / `reconnect` (« Bienvenue » / « Bon retour »), durée configurable, bouton « Ce n'est pas moi ? », mise en page compacte sans chevauchement |
| `App.tsx` | Montage de `<WelcomeBackGate />` dans l'`AppProvider` |
| `pages/PassengerApp.tsx` | Correction de la cible de l'écran `welcome-back` (allait vers `login`, va vers `map`) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Déclencheurs** : le portail observe `state.currentUser` / `state.currentDriver` / `state.currentView`. Il s'active sur les routes `/app…` et `/driver…` uniquement (jamais sur le site vitrine ni dans l'admin). Aucun changement de routage : il s'affiche en surcouche `fixed inset-0 z-[999]`, ce qui évite tous les conflits avec la logique de navigation existante.
- **Une fois par session** : marqueur `sessionStorage` `smartcabb_welcome_back_seen:<role>` contenant l'id du compte. Un rechargement dans le même onglet ne réaffiche pas l'écran ; fermer l'onglet/APK le réinitialise. Le marqueur est purgé dès que les deux slots de session sont vides (déconnexion passager ou `sessionStorage.clear()` du chauffeur).
- **Première connexion vs retour** : marqueur persistant `smartcabb_known_user:<role>:<id>` en `localStorage`. Première fois → « Bienvenue » ; ensuite → « Bon retour » avec « Content de vous revoir… ».
- **Chauffeur non approuvé** : aucun écran si `status`/`applicationStatus` vaut `pending`, `rejected` ou `suspended`.
- **Compte différent** : bouton « Ce n'est pas moi ? » qui ferme l'écran, vide le slot concerné (`setCurrentUser(null)` ou `setCurrentDriver(null)`) et renvoie vers `login` / `driver-welcome`.
- **Mise en page** : le bloc « Continuer » est passé du positionnement absolu au flux normal, espacements réduits et flèche décorative redondante retirée, pour tenir sur un viewport de 768 px sans chevauchement. L'écran reste scrollable sur les très petits écrans.

### Impact produit / comportement visible
- Passager : après connexion, ou en rouvrant l'app avec une session active, un écran vert affiche « Bon retour, <Prénom> 👋 » (ou « Bienvenue » la première fois), la photo/avatar, une barre de progression et un bouton « Continuer ». Redirection automatique après 2,8 s.
- Chauffeur : même écran en bleu avec l'icône véhicule et « Prêt pour de nouvelles courses ? ».
- Aucun impact sur les flux de paiement, la navigation ou les sessions existantes.

### Risques & rollback
- **Risque** : un utilisateur ayant les deux slots remplis (passager + chauffeur) et `currentView` absent ne verra pas l'écran (choix volontaire pour ne jamais afficher la mauvaise identité).
- **Rollback** : `git revert` (aucune donnée serveur, uniquement du stockage local préfixé `smartcabb_welcome_back_seen` / `smartcabb_known_user`).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] Passager (`/app`) : « Bon retour, Michel » affiché, disparition automatique vérifiée
- [x] Rechargement dans le même onglet : plus d'affichage (marqueur `sessionStorage` = id du compte)
- [x] Chauffeur (`/driver`) : « Bon retour, Patrick », thème bleu, sous-titre courses
- [x] Première connexion (marqueur `localStorage` absent) : « Bienvenue » au lieu de « Bon retour »
- [ ] Vérification visuelle en production (Vercel) et sur APK

---

## 2026-11-07 — Sécurité : recharge manuelle verrouillée + logos des opérateurs Mobile Money

- **Commit** : `d5b7586` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security | feat
- **Objectif** : fermer la faille d'auto-crédit gratuit (`POST /wallet/recharge` public, utilisé par la modale « Portefeuille » chauffeur) et remplacer les libellés texte des opérateurs par leurs logos officiels.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | Helper `hasValidAdminSecret()` + garde `403` sur `POST /:driverId/wallet/recharge` |
| `supabase/functions/make-server-2eb02e52/passenger-routes.ts` | Idem sur `POST /:id/wallet/recharge` |
| `components/driver/DriverDashboard.tsx` | Modale Portefeuille → CTA vers `driver-wallet` (plus de crédit local) |
| `components/driver/DriverDashboardNew.tsx` | Idem |
| `components/driver/DriverWalletManager.tsx` | **Supprimé** (UI d'auto-recharge) |
| `components/shared/OperatorLogo.tsx` | **Nouveau** : résolution clé/id Ejpay → logo dans `public/logos/` |
| `components/mobile-money-logos.tsx` | Les 4 composants de logo rendent désormais les images réelles |
| `components/passenger/RechargeModal.tsx` | Grille opérateurs en logos + nom sous le logo |
| `components/passenger/ScheduledRides.tsx` | Aperçu logo à côté du sélecteur d'opérateur |
| `components/driver/DriverWalletScreen.tsx` | Aperçu logo à côté du sélecteur d'opérateur |
| `docs/EJPAY_INTEGRATION.md`, `docs/CHANGELOG_TECHNIQUE.md` | Sécurité, fichiers, cette entrée |

### Description technique
- **Verrouillage** : `driver-routes.ts` et `passenger-routes.ts` exposent maintenant `hasValidAdminSecret(c)` (même logique que `ejpay-routes.ts` : `EJPAY_ADMIN_SECRET`, à défaut `ADMIN_CREATION_SECRET`, en-tête `x-admin-secret`, comparaison stricte). La garde est évaluée **avant** la lecture du corps ; réponse `403 { code: "MANUAL_RECHARGE_DISABLED" }` sinon. Aucun appelant légitime ne subsiste : `DriverWalletManager.tsx` est supprimé et la route passager n'avait aucun appelant.
- **Modale Portefeuille** : les deux dashboards chauffeur affichent le solde + la date d'expiration (lecture seule) et un bouton « Voir les forfaits et recharger » qui ferme la modale et navigue vers `driver-wallet` (encaissement Ejpay `driver_wallet_topup`).
- **Logos** : `OperatorLogo` normalise la clé (`orange_money`, `M-Pesa`, `17`…) vers un fichier de `public/logos/`, avec `onError` → repli silencieux sur le texte. `RechargeModal` affiche logo + nom dans une grille 2 colonnes ; les `<select>` natifs (ScheduledRides, DriverWalletScreen) affichent l'aperçu du logo sélectionné à côté, les `<option>` restant en texte (contrainte HTML).

### Impact produit / comportement visible
- Un chauffeur ne peut plus créditer son portefeuille sans payer : la modale mène au paiement Mobile Money.
- Toute tentative d'appel direct de l'endpoint sans secret renvoie `403`.
- Les sélecteurs d'opérateurs (recharge passager, course, acompte réservation, forfait chauffeur) affichent les logos officiels avec le nom conservé.

### Risques & rollback
- **Risque** : une intégration admin externe qui appelait `/wallet/recharge` sans `x-admin-secret` recevrait `403`. Aucune dans le dépôt.
- **Risque** : si `ADMIN_CREATION_SECRET` et `EJPAY_ADMIN_SECRET` sont absents, la route reste fermée (comportement voulu, fail-safe).
- **Rollback** : `git revert` ; les logos sont de simples assets statiques, aucun impact données.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK (bundle chauffeur −9 kB après suppression de `DriverWalletManager`)
- [x] Edge Function redéployée
- [x] `POST .../drivers/TEST_DRIVER/wallet/recharge` → `403 MANUAL_RECHARGE_DISABLED`
- [x] `POST .../passengers/TEST_PASSENGER/wallet/recharge` → `403 MANUAL_RECHARGE_DISABLED`
- [ ] Vérification visuelle des logos en production (Vercel)

---

## 2026-11-07 — Mobile Money : recharge chauffeur créditée côté serveur + écran admin « Transactions »

- **Commit** : `c963565` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat | security
- **Objectif** : permettre le test réel côté chauffeur (le crédit n'était pas appliqué au bon portefeuille) et donner à l'admin une visibilité sur les encaissements Ejpay, sans exposer de secret dans le navigateur.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ejpay-core.ts` | Nouveau `kind` `driver_wallet_topup` |
| `supabase/functions/make-server-2eb02e52/ejpay-routes.ts` | `collect` accepte `driver_wallet_topup` + `driverId`/`days` ; `creditDriverWallet()` ; `reconcileOrder()` extrait et réutilisé par `/status` |
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | Proxys admin : `GET /admin/ejpay/orders`, `GET /admin/ejpay/wallets`, `POST /admin/ejpay/orders/:orderId/refresh` |
| `lib/ejpay-service.ts` | `EjpayKind` + champs `driverId` / `days` transmis à `/collect` |
| `lib/payment-providers/ejpay-provider-pure.ts` | `driver_wallet_recharge` → `driver_wallet_topup`, `driverId`/`days` transmis |
| `components/driver/DriverWalletScreen.tsx` | Plus de crédit manuel après paiement : relecture de `GET /drivers/:id` (solde + expiration serveur) |
| `components/passenger/WalletScreen.tsx` | Bouton 🐞 de diagnostic masqué en production (`import.meta.env.DEV`) |
| `components/admin/EjpayTransactionsScreen.tsx` | **Nouveau** écran admin (totaux, filtres, tableau, réconciliation, soldes marchand) |
| `components/admin/AdminDashboard.tsx`, `pages/AdminApp.tsx` | Action « Transactions Mobile Money » + route `admin-ejpay` |
| `docs/EJPAY_INTEGRATION.md`, `docs/CHANGELOG_TECHNIQUE.md` | Routes admin, flux chauffeur, cette entrée |

### Description technique
- **Bug corrigé (chauffeur)** : l'ancien flux envoyait `passengerId = driverId` avec `kind = other` ; au règlement, rien n'était crédité côté serveur, le crédit venait d'un appel client à `POST /drivers/:id/wallet/recharge`. Désormais `kind = driver_wallet_topup` et `order.driverId` est renseigné ; `settleOrder` appelle `creditDriverWallet()` (solde `balance` + `creditBalance`, `wallet_expiry_date += days`, `wallet_tx`, push FCM). Le client ne fait plus que relire la fiche conducteur → plus de double crédit possible.
- **Idempotence** : inchangée, `settledAt` protège le crédit (webhook + polling).
- **Réconciliation** : logique extraite dans `reconcileOrder(orderId)` (utilisée par `GET /status/:orderId` et par l'admin). Gère `SUCCESS`, `FAILED` et l'écart de montant (`REVIEW`).
- **Admin** : les proxys `/admin/ejpay/*` réutilisent `listOrders`, `ejpayWallets` et `reconcileOrder` ; `EJPAY_ADMIN_SECRET` reste exclusivement côté serveur. L'écran affiche les totaux (encaissé, en attente, échoués, à vérifier), filtre par statut, permet un refresh par ligne et affiche les soldes marchand (`solde`/`devise` du format Ejpay).

### Impact produit / comportement visible
- Chauffeur : la recharge du forfait est créditée immédiatement après confirmation Ejpay, avec la bonne date d'expiration ; message de succès et SMS inchangés.
- Admin : nouvelle entrée **« Transactions Mobile Money »** dans le tableau de bord, avec toutes les transactions (passager, chauffeur, course, acompte), leurs statuts et un bouton de réconciliation.
- Passager : le bouton 🐞 de diagnostic n'apparaît plus en production (disponible en local/dev).

### Risques & rollback
- **Risque** : les anciens ordres `other` (forfaits chauffeur payés avant ce commit) ne sont pas re-crédités ; ils restent visibles dans l'admin.
- **Risque connu (pré-existant, non traité ici)** : `POST /drivers/:id/wallet/recharge` n'exige pas d'authentification ; un chauffeur pourrait s'auto-créditer. À protéger dans un prochain lot (impacte `DriverWalletManager` admin).
- **Rollback** : `git revert` ; aucun changement de schéma KV ni migration.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] Edge Function redéployée
- [x] `GET /admin/ejpay/orders` → 1 transaction `SUCCESS` 1 000 CDF (test passager réel), totaux `successAmount: 1000`
- [x] `GET /admin/ejpay/wallets` → Orange Money, `solde: 970 CDF` (1 000 − 30 de commission)
- [ ] Recharge chauffeur réelle (5 000 CDF) et vérification du crédit + expiration

---

## 2026-11-07 — Suppression des derniers restes Flutterwave (modale de debug, routes et provider morts)

- **Commit** : `db366bc` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : refactor
- **Objectif** : l'écran Portefeuille affichait encore une modale « Debug Paiement Flutterwave » (bouton 🐞), qui appelait des routes supprimées et parlait de `FLUTTERWAVE_SECRET_KEY`. Supprimer tous les restes de Flutterwave du code.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/EjpayDiagnosticModal.tsx` | **Nouveau** : diagnostic Mobile Money (activé / identifiants / OAuth / callback), sans créer de paiement |
| `components/DebugPaymentModal.tsx` | **Supprimé** (modale Flutterwave) |
| `components/passenger/WalletScreen.tsx` | Utilise `EjpayDiagnosticModal`, bouton renommé « Diagnostic Mobile Money » |
| `components/passenger/RechargeModal.tsx` | Import et état `showDebug` morts retirés |
| `lib/payment-providers/flutterwave-provider.ts` | **Supprimé** (jamais importé) |
| `lib/payment-providers/flutterwave-provider-pure.ts` | **Supprimé** (jamais importé) |
| `supabase/functions/make-server-2eb02e52/payment-routes.ts` | **Supprimé** (routes `/payments/flutterwave/*`) |
| `supabase/functions/make-server-2eb02e52/index.ts` | Montage `/payments` retiré, import `paymentRoutes` supprimé |
| `supabase/functions/make-server-2eb02e52/ejpay-routes.ts` | Nouvelle route `GET /ejpay/health` |
| `hooks/useAdminConfig.ts`, `hooks/useSettings.ts`, `lib/config-sync.ts` | Flag mort `flutterwaveEnabled` retiré (types + défauts) |
| `supabase/functions/make-server-2eb02e52/config-routes.ts`, `admin-routes.ts` | Flag mort `flutterwaveEnabled` retiré des configurations par défaut |
| `types/index.ts` | `PaymentOption.id` : `'flutterwave'` → `'mobile_money'` |
| `lib/payment-providers/base-provider.ts`, `ejpay-provider-pure.ts` | Commentaires Flutterwave nettoyés |
| `docs/EJPAY_INTEGRATION.md`, `docs/CHANGELOG_TECHNIQUE.md` | Route `/health`, diagnostic in-app, cette entrée |

### Description technique
- **Diagnostic** : `EjpayDiagnosticModal` appelle `GET /ejpay/health` à l'ouverture (et via « Relancer »). La route est publique, ne fait aucun mouvement d'argent et renvoie `enabled`, `configured`, `oauthOk`/`oauthError` (via `getAccessToken()`, donc test réel du Client Secret), `callbackConfigured` + URL, opérateurs et minimums. Le rapport est copiable pour le support.
- **Nettoyage** : `payment-service.ts` n'importait déjà que `cash` et `ejpay` ; les fichiers `flutterwave-provider*` et les routes `/payments/flutterwave/*` étaient donc du code mort. Les retirer évite qu'un ancien écran ou un lien oublié rappelle Flutterwave.
- `flutterwaveEnabled` n'était lu par aucun écran (seulement des types/défauts) : suppression sans impact fonctionnel. Les configurations déjà stockées en KV peuvent conserver la clé, elle est simplement ignorée.

### Impact produit / comportement visible
- Le bouton 🐞 du portefeuille ouvre désormais **« Diagnostic Mobile Money (Ejpay) »** : 4 contrôles verts/rouges, opérateurs, minimums, URL de callback, rapport copiable.
- Plus aucune mention de Flutterwave dans l'application.
- Aucun changement dans les parcours de paiement.

### Risques & rollback
- **Risque** : un client externe appellerait encore `/payments/flutterwave/init` → `404`. Aucun appel interne ne le faisait (vérifié par grep).
- **Rollback** : `git revert` du commit (les fichiers supprimés reviennent ; le flag `flutterwaveEnabled` n'est pas nécessaire au fonctionnement).

### Tests / vérifications
- [x] `grep` : plus aucune référence `flutterwave` dans le code (hors documentation historique)
- [x] `npx tsc --noEmit` (seules les erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] `GET /ejpay/health` en production → `enabled: true`, `configured: true`, `oauthOk: true`, `callbackConfigured: true`
- [x] Edge Function redéployée

---

## 2026-11-07 — Recharge passager : saisie en CDF par défaut (USD en option)

- **Commit** : `41f899a` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : la modale de recharge n'acceptait que des montants en USD (20 / 50 / 100 / 200 $), ce qui rendait impossible un test à 100 CDF et obligeait à convertir mentalement. Le Mobile Money et le portefeuille sont libellés en CDF : la saisie doit l'être aussi.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/RechargeModal.tsx` | Sélecteur de devise CDF/USD, montants suggérés en CDF, minimum 100 CDF, conversions et libellés CDF |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- Nouvel état `inputCurrency` (`'CDF' | 'USD'`), **CDF par défaut**, montant initial `1000`.
- `amountCDF` (dérivé) = montant saisi si CDF, sinon `convertUSDtoCDF(rechargeAmount)` ; c'est **toujours** cette valeur qui part vers Ejpay (`currency: 'CDF'`) et le backend espèces. `amountUSD` sert uniquement à l'affichage et au seuil de réduction.
- Montants suggérés : CDF `1000 / 5000 / 10000 / 20000`, USD `20 / 50 / 100 / 200` (le parcours USD reste disponible à l'identique).
- Minimums : `100` CDF (aligné sur `minAmount` Ejpay) et `1` USD ; message d'erreur explicite.
- Le seuil de réduction 5 % reste basé sur 20 USD équivalents (`amountUSD >= 20`).
- `switchCurrency()` convertit la valeur en cours à la bascule (CDF → USD arrondi au cent, USD → CDF arrondi à l'unité).
- Descriptions et métadonnées Ejpay : `description` en CDF, `metadata.amountUSD` + `metadata.inputCurrency` conservés pour l'audit.
- `metadata.type: 'wallet_recharge'` inchangé → `resolveKind()` du provider mappe toujours vers `wallet_topup`, et `passengerId` est pris dans `metadata.userId` : le crédit serveur (`creditPassengerWallet`) fonctionne comme avant.

### Impact produit / comportement visible
- Le passager choisit la devise, voit l'équivalent dans l'autre devise, et peut recharger **100 CDF minimum** (test réel possible).
- Réduction 5 % et solde affiché inchangés (le portefeuille reste stocké en CDF).

### Risques & rollback
- **Risque** : un opérateur peut imposer un minimum supérieur à 100 CDF (refus `FAILED` ou `PENDING` non validé). Fallback : tester 500 ou 1000 CDF.
- **Rollback** : `git revert` du commit ; aucun changement backend, aucune migration.

### Tests / vérifications
- [x] `npx tsc --noEmit` (seules les erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [ ] Recharge réelle 100 CDF dans l'app (validation sur le téléphone du client)
- [ ] Vérifier le crédit du portefeuille et `ejpay_event:*` avec `signatureOk: true`

---

## 2026-11-07 — Ejpay : rotation du Client Secret en production

- **Commit** : `aa49536` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security
- **Objectif** : remplacer le Client Secret Ejpay (identique depuis la mise en service) par une valeur régénérée depuis le dashboard, sans interruption de service.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `docs/EJPAY_INTEGRATION.md` | Nouvelle procédure « Rotation du Client Secret » (commandes, test OAuth, effet immédiat) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- `Regenerate secret` exécuté côté dashboard Ejpay → nouvelle valeur `EJPAY_CLIENT_SECRET` (32 caractères).
- Secret posé via `supabase secrets set EJPAY_CLIENT_SECRET=… --project-ref zaerjqchzqmcxqblkfkg`, puis `supabase functions deploy make-server-2eb02e52`.
- Aucun changement de code : `ejpay-core.ts` lit le secret via `Deno.env.get("EJPAY_CLIENT_SECRET")`.

### Impact produit / comportement visible
- Aucun impact visible (passager, chauffeur, admin).
- Les tokens déjà émis restent valides jusqu'à expiration (~5 min), puis le nouveau secret est utilisé.

### Risques & rollback
- **Risque** : secret erroné → `401` sur l'OAuth, donc `collect`/`payout` en échec (`502`/`503` côté API). Les ordres existants restent consultables.
- **Rollback** : l'ancien secret est définitivement révoqué côté Ejpay ; en cas d'erreur, régénérer à nouveau dans le dashboard et reposer la valeur.

### Tests / vérifications
- [x] OAuth avec le **nouveau** secret → `200`, `token_type=Bearer`, `expires_in=300`, scopes `payment:bulk payment:write payment:read`
- [x] OAuth avec l'**ancien** secret → `401` (révoqué)
- [x] `GET /ejpay/config` → `configured: true`, `enabled: true`, `callbackConfigured: true`
- [x] `GET /ejpay/wallets` sans `X-Admin-Secret` → `401` (protection active)
- [x] Edge Function redéployée

---

## 2026-11-07 — Ejpay : clarification du callback (aucun webhook à déclarer dans le dashboard)

- **Commit** : `e229262` (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : docs
- **Objectif** : lever la confusion sur la « déclaration du webhook » dans le dashboard Ejpay. Le guide API 3.6.7 ne prévoit aucun champ d'URL de callback : l'URL est envoyée dans le corps de chaque requête métier.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `docs/EJPAY_INTEGRATION.md` | Section 4 réécrite : `callbackUrl` par requête, rôle réel du dashboard (secrets uniquement), point de vérification `callbackConfigured` |
| `supabase/functions/make-server-2eb02e52/ejpay-core.ts` | `ejpayCallbackUrl()` accepte la surcharge `EJPAY_CALLBACK_URL` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Constat (guide Ejpay v3.6.7, sections 6.5 / 7.5 / 8.5)** : `callbackUrl` est un champ du corps JSON de `POST /payment/c2b`, `POST /payment/b2c` et du bulk. Le dashboard `https://pay.ejsarl.cd` (section **API Credentials**) ne sert qu'à lire/régénérer `Client Secret` et `Webhook Secret` (`whsec_…`). Il n'existe pas d'écran « Webhook URL ».
- Notre Edge Function renseignait déjà `callbackUrl: ejpayCallbackUrl()` sur `collect` (l. 440) et `payout` (l. 732) ; `GET /ejpay/config` expose `callbackConfigured: true`.
- Ajout d'une surcharge optionnelle : si `EJPAY_CALLBACK_URL` est défini, il est utilisé tel quel (utile pour un domaine personnalisé ou une préproduction), sinon l'URL est dérivée de `SUPABASE_URL`.

### Impact produit / comportement visible
- Aucun changement visible pour le passager ou le chauffeur.
- L'exploitant n'a plus à chercher un réglage inexistant dans le dashboard : la seule action côté Ejpay est de conserver les secrets et de vérifier que l'entreprise est activée.

### Risques & rollback
- **Risque** : si `EJPAY_CALLBACK_URL` est défini avec une URL erronée, les callbacks ne parviennent plus (les paiements resteraient réglés par polling). La variable n'est pas définie en production actuellement.
- **Rollback** : supprimer la variable `EJPAY_CALLBACK_URL` ou `git revert` du commit ; le comportement par défaut (`SUPABASE_URL` + route `/ejpay/webhook`) est inchangé.

### Tests / vérifications
- [ ] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `GET /ejpay/config` → `configured: true`, `enabled: true`, `callbackConfigured: true`
- [x] Webhook testé avec HMAC-SHA512 valide → `200 {"success":true,"ignored":true}` ; signature invalide → `401`
- [ ] Redéploiement de l'Edge Function après ce changement

---

## 2026-11-07 — Ejpay : mise en service (secrets, déploiement, vérifications serveur)

- **Commit** : à pousser (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : chore (exploitation) + docs
- **Objectif** : rendre l'intégration Ejpay réellement opérationnelle : secrets saisis, Edge Function redéployée, authentification et contrat vérifiés, URLs corrigées.

### Ce qui a été fait (hors dépôt)
| Action | Détail |
|---|---|
| Secrets Supabase | `EJPAY_CLIENT_ID`, `EJPAY_CLIENT_SECRET`, `EJPAY_WEBHOOK_SECRET`, `EJPAY_ADMIN_SECRET` posés sur le projet `zaerjqchzqmcxqblkfkg` (valeurs **jamais** commitées) |
| Déploiement | `supabase functions deploy make-server-2eb02e52` — les routes `/ejpay/*` n'étaient pas déployées (404 avant l'opération) |
| Vérification 1 | `GET /ejpay/config` → `configured: true`, `enabled: false`, opérateurs 9/10/17/19, minimums 100 CDF / 1 USD |
| Vérification 2 | OAuth `client_credentials` sur `auth.ejsarl.cd` → jeton obtenu (`expires_in: 300`) : identifiants valides |
| Vérification 3 | `GET /ejpay/wallets` (X-Admin-Secret) → `200 success: true`, tableau vide (aucun solde marchand encore alimenté) |

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `docs/EJPAY_INTEGRATION.md` | Référence de projet corrigée : `wmrksqludchpvitakyci` (inexistant) → **`zaerjqchzqmcxqblkfkg`** (URLs de webhook, `config/update`, `config`, `supabase link`) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- Le projet Supabase réel de l'application est `zaerjqchzqmcxqblkfkg` (`utils/supabase/info.ts`, `supabase projects list`). La référence `wmrksqludchpvitakyci` utilisée dans la première version de la doc ne résout pas en DNS : elle est remplacée partout.
- URL de webhook à déclarer chez Ejpay :
  `https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/ejpay/webhook`
- `verify_jwt = false` est bien présent pour `make-server-2eb02e52` (`supabase/config.toml`), donc Ejpay peut appeler le webhook sans jeton Supabase (la sécurité repose sur la signature HMAC).
- Aucun changement de code applicatif dans cette étape : uniquement configuration et documentation.

### Impact produit
- Les paquets de paiement sont désormais **déployés** et **configurés** ; seul le drapeau `ejpayEnabled` reste à `false` jusqu'à la recette.
- Aucun comportement visible pour les utilisateurs tant que le drapeau n'est pas activé.

### Risques & rollback
- **Risque** : les secrets ont transité par un canal de discussion → recommandation de **régénérer** `EJPAY_CLIENT_SECRET` et `EJPAY_WEBHOOK_SECRET` dans le dashboard Ejpay une fois la recette terminée, puis de les remettre à jour dans Supabase.
- **Rollback** : `POST /config/update` `{"config":{"ejpayEnabled":false}}` ; suppression des secrets `EJPAY_*` ; `git revert` pour la doc.

### Tests / vérifications
- [x] `GET /ejpay/config` → `configured: true, enabled: false`
- [x] OAuth Ejpay → jeton 300 s obtenu
- [x] `GET /ejpay/wallets` → 200 (aucun solde configuré côté marchand)
- [ ] Recette réelle à 100 CDF (en attente d'un numéro de test)
- [ ] Webhook déclaré dans le dashboard Ejpay

---

## 2026-11-07 — Fin du remplacement de Flutterwave : libellés, types et réparation du wallet chauffeur

- **Commit** : à pousser (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : fix + refactor
- **Objectif** : supprimer les dernières traces visibles de Flutterwave, aligner les types sur Mobile Money, et réparer `DriverWalletScreen` qui ne pouvait ni lire ni créditer le portefeuille (appels `supabase.from` inexistants + constantes manquantes).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/PaymentMethodScreen.tsx` | Méthode « Flutterwave / carte » remplacée par « Mobile Money » (M-Pesa, Orange, Airtel, Afrimoney) ; id `flutterwave` → `mobile_money` ; solde lu via `walletBalance` ; import `Building2`/`CreditCard` retiré |
| `components/passenger/RechargeModal.tsx` | Texte d'attente : « validez sur votre téléphone » (plus de « fenêtre Flutterwave ») |
| `components/passenger/WalletScreen.tsx` | Libellé de transaction « Mobile Money (Flutterwave) » → « Mobile Money » ; bouton debug renommé |
| `components/driver/DriverWalletScreen.tsx` | **Réparation** : `WALLET_PACKAGES`, type `WalletPackage`, imports manquants (`motion`, `Card`, `Button`, `Badge`, `useEffect`, `Loader2`, `Smartphone`, `Gift`, `FileText`) ; lecture du solde via `GET /drivers/:id` ; crédit via `POST /drivers/:id/wallet/recharge` ; `currentDriver` lu depuis `state` |
| `components/admin/BudgetDashboard.tsx` | Comparatif et fiche prestataire : Ejpay (pay.ejsarl.cd / api.ejsarl.cd) au lieu de Flutterwave |
| `types/index.ts` | `Ride.paymentMethod` et `User.favoritePaymentMethod` : `mobile_money` / `wallet` remplacent `flutterwave` |

### Description technique
- `DriverWalletScreen` utilisait `supabase.from('drivers' | 'wallet_transactions' | 'admin_notifications')` alors que `lib/supabase.ts` n'expose que `auth` (client volontairement minimal) : chaque appel levait `Property 'from' does not exist`. Les écritures ont été remplacées par les routes serveur existantes :
  - lecture : `GET /make-server-2eb02e52/drivers/:driverId` → `balance` / `creditBalance` ;
  - crédit après paiement confirmé : `POST /make-server-2eb02e52/drivers/:driverId/wallet/recharge` `{ amount }`.
- La date d'expiration du forfait reste calculée côté client (`wallet_expiry_date`) : le serveur ne stocke que le solde. L'historique affiché est celui de la session (aucune route publique ne liste les mouvements d'un chauffeur).
- `WALLET_PACKAGES` (Starter 7 j / 5 000 CDF, Standard 14 j / 9 000 CDF, Pro 30 j / 15 000 CDF) est défini localement : la constante n'existait nulle part, ce qui provoquait un `ReferenceError` à l'ouverture de l'écran.
- Aucun changement de schéma, aucune migration.

### Impact produit
- Le chauffeur peut de nouveau ouvrir « Mon wallet » sans plantage, voir son solde réel et activer un forfait après un paiement Mobile Money confirmé.
- Plus aucune mention de Flutterwave dans les écrans passager, chauffeur ou admin.

### Risques & rollback
- **Risque** : l'historique des mouvements n'est plus persistant à l'écran (recharges de la session uniquement).
- **Rollback** : `git revert <commit>` (l'ancien code reste dans l'historique).

### Tests / vérifications
- [x] `npx vite build` OK (14,53 s)
- [x] Typage ciblé (`tsconfig` sans `_headers`) : plus aucune erreur `supabase.from`, `WALLET_PACKAGES`, `WalletPackage`, `FileText` ; restent les erreurs pré-existantes de variantes `Button`/`Badge`
- [ ] Recette : ouverture du wallet chauffeur, paiement d'un forfait à 100 CDF, solde crédité une seule fois

---

## 2026-11-06 — Ejpay (Mobile Money) — phase 2 : Flutterwave remplacé dans toute l'application

- **Commit** : `803b1d3` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : feat (frontend) + refactor + security
- **Objectif** : brancher l'interface sur la passerelle Ejpay livrée en phase 1 (`fdeae1a`) et **remplacer Flutterwave partout** (décision produit), sans jamais exposer de secret et sans fenêtre de redirection. Ejpay ne traite pas les cartes : l'option carte est retirée des parcours de paiement.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/ejpay-service.ts` | **Nouveau** — client HTTP : config (cache 60 s), `collect`, `status`, `waitForEjpayOrder`, helpers admin (`listEjpayOrders`, `getEjpayWallets`, `refreshEjpayOrder`), table des opérateurs et normalisation des identifiants réseau |
| `lib/payment-providers/ejpay-provider-pure.ts` | **Nouveau** — provider au contrat `paymentService` : `initPayment` (C2B), `verifyPayment` (statut), `refundPayment` refusé côté client |
| `hooks/useEjpayCheckout.ts` | **Nouveau** — orchestration `collect` → attente du résultat (3 s, 3 min max) avec chronomètre, annulation (`AbortController`) et verdict normalisé |
| `components/passenger/EjpayWaitingModal.tsx` | **Nouveau** — écran « Validez sur votre téléphone » (montant, opérateur, numéro, temps écoulé, annuler) |
| `lib/payment-service.ts` | `mobile_money` et `card` routés vers `ejpayProvider` (plus de repli silencieux sur le cash) |
| `components/passenger/PaymentScreen.tsx` | Course et paiement mixte : popup + polling manuel remplacés par `useEjpayCheckout` + `EjpayWaitingModal` ; carte retirée des méthodes |
| `components/passenger/RechargeModal.tsx` | Recharge portefeuille sur Ejpay ; **sélecteur d'opérateur ajouté** ; corrige au passage un test `result.redirectUrl` jamais rempli par le provider |
| `components/passenger/ScheduledRides.tsx` | Acompte 50 % sur Ejpay ; option « Carte bancaire » supprimée ; grille 3 colonnes |
| `components/driver/DriverWalletScreen.tsx` | Forfait chauffeur sur Ejpay ; sélecteur d'opérateur + numéro ; suppression de l'activation « après 15 s » non conditionnée au paiement ; corrige un `usePayment` non importé |
| `components/admin/GlobalSettingsScreen.tsx` + `lib/config-sync.ts` | « Flutterwave activé » remplacé par **« Ejpay activé (Mobile Money) »** (flag `ejpayEnabled`, défaut `false`) |
| `components/passenger/RideScreen.tsx`, `components/passenger/ProfileScreen.tsx` | Option « Carte bancaire » retirée des sélecteurs |
| `components/MixedPaymentSelector.tsx`, `components/shared/TermsOfService.tsx`, `website/cgu.html` | Textes : « Flutterwave » → « Mobile Money » ; carte signalée indisponible dans les CGU |
| `docs/EJPAY_INTEGRATION.md` | Nouvelle section 12 « Phase 2 — interface branchée sur Ejpay » |

### Description technique
- **Un seul point de bascule** : tous les écrans passaient déjà par `paymentService.initPayment()` / `verifyPayment()`. Le provider Ejpay implémente le même contrat, donc le remplacement de Flutterwave tient en un import et une branche de `getProvider()`.
- **Pas de redirection** : `initPayment` renvoie `status: 'pending'` + `transactionId = orderId` (pas de `paymentUrl`). Le hook interroge `GET /ejpay/status/:orderId` toutes les 3 s ; le backend interroge lui-même Ejpay au-delà de 8 s, donc l'app ne stresse pas le fournisseur.
- **Kind déduit du contexte** : `metadata.type` `ride_payment*` → `ride_payment`, `wallet_recharge` → `wallet_topup`, `reservation_deposit` → `deposit`, `driver_wallet_recharge` → `other` (l'activation du forfait reste locale, déclenchée par le succès du paiement).
- **Order id** : `reference` de l'écran nettoyée (`[A-Za-z0-9_-]`, 64 car.) et utilisée comme clé d'idempotence ; les références contiennent déjà `Date.now()`, donc chaque tentative est unique.
- **Opérateurs** : les écrans utilisent `mpesa` / `orange_money` / `airtel_money` / `afrimoney` ; `toOperatorId()` les ramène vers 9 / 10 / 17 / 19.
- **Fin d'attente** : `SUCCESS` → écran de succès ; `FAILED` → message d'erreur ; `REVIEW` → message « vérification manuelle » ; `TIMEOUT` → overlay fermé + message d'information (le webhook créditera plus tard) ; `CANCELLED` → retour au formulaire.
- **Sécurité** : aucun secret Ejpay côté navigateur (uniquement la clé anon Supabase) ; le montant d'une course est contrôlé côté serveur ; le remboursement exige un admin (`refundPayment` refuse côté client).
- **Admin** : le drapeau `ejpayEnabled` reste **faux par défaut**, donc le déploiement de cette phase ne modifie aucun comportement tant que le service n'est pas activé.

### Impact produit / comportement visible
- Paiement Mobile Money : plus de popup ; le client valide sur son téléphone et voit « Validez sur votre téléphone » avec un chronomètre.
- Recharge et acompte de réservation demandent désormais explicitement l'opérateur (M-Pesa, Orange, Airtel, Afrimoney).
- La carte bancaire n'est plus proposée (elle n'était de toute façon pas fonctionnelle : `flutterwaveEnabled` n'était pas exploité par les écrans).
- Admin → Réglages globaux : interrupteur « Ejpay activé (Mobile Money) ».

### Risques & rollback
- **Risque** : si le service est activé sans recette, les paiements Mobile Money échouent avec un message explicite (`503 EJPAY_DISABLED`, `502` fournisseur).
- **Risque** : un paiement validé après la fenêtre de 3 min n'est plus suivi par l'écran (il est réglé par le webhook) → message d'information, pas de double débit.
- **Risque** : la carte n'étant plus disponible, les clients qui l'utilisaient doivent passer par Mobile Money, le portefeuille ou les espèces.
- **Rollback immédiat** : Admin → Réglages globaux → désactiver « Ejpay activé » (ou `POST /config/update` `{"config":{"ejpayEnabled":false}}`).
- **Rollback code** : `git revert 803b1d3` puis push sur `main`.
- **Rollback fournisseur** : restaurer `flutterwaveProvider` dans `lib/payment-service.ts` (l'ancien provider est toujours présent).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] Typage ciblé des nouveaux fichiers (`tsc -p tsconfig.check.json`, dossier `_headers` exclu) : 0 erreur sur `lib/ejpay-service.ts`, `ejpay-provider-pure.ts`, `useEjpayCheckout.ts`, `EjpayWaitingModal.tsx`
- [x] `npx vite build` OK (12,98 s)
- [ ] Recette réelle : parcours course + recharge + acompte avec un numéro de test et le drapeau activé
- [ ] Vérification visuelle de la modale d'attente sur mobile

---

## 2026-11-06 — Intégration Ejpay (Mobile Money RDC) — phase 1 : backend désactivé par défaut

- **Commit** : `fdeae1a` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : feat (backend) + security
- **Objectif** : encaisser et décaisser via **EJ PAY v3.6.7** (EJSARL) — Vodacom M-Pesa, Orange Money, Airtel Money, Africell Afrimoney — en CDF et USD, sans jamais exposer de secret côté client, sans double débit possible, et sans activer le service tant que la recette n'est pas faite.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ejpay-core.ts` | **Nouveau** — client OAuth 2.0, appels C2B/B2C/bulk/statut/wallets, vérification HMAC-SHA512, normalisation MSISDN, modèle `EjpayOrder` + stockage KV |
| `supabase/functions/make-server-2eb02e52/ejpay-routes.ts` | **Nouveau** — routes `/ejpay/*`, règlement métier (wallet, course, acompte, retrait), `X-Admin-Secret` |
| `supabase/functions/make-server-2eb02e52/index.ts` | Montage `app.route("/make-server-2eb02e52/ejpay", ejpayRoutes)` + import |
| `docs/EJPAY_INTEGRATION.md` | **Nouveau** — secrets, activation, contrat d'API, cycle de paiement, plan de test, rollback, dépannage |

### Description technique
- **Authentification** : OAuth 2.0 `client_credentials` sur le Keycloak d'EJ PAY (`auth.ejsarl.cd/realms/ej-payment`), scope `payment:write payment:read`. Le jeton vit 300 s ; il est renouvelé à **90 %** de sa durée, mis en cache en mémoire puis dans le KV (`ejpay_token_cache`) pour être partagé entre isolates. Un `401` déclenche **un seul** retry avec un jeton neuf.
- **Routes exposées** (préfixe `/make-server-2eb02e52/ejpay`) : `GET /config` (état, opérateurs, minimums), `POST /collect` (C2B), `GET /status/:orderId` (`?refresh=1` force la vérification), `POST /webhook`, `POST /payout` (B2C), `GET /orders`, `GET /wallets`, `POST /orders/:orderId/refresh`.
- **Asynchrone assumé** : `POST /payment/c2b` renvoie toujours `PENDING` (statutCode 1). Seul le callback signé, ou le polling de `GET /payment/{reference}`, donne le résultat. `GET /status` rafraîchit automatiquement un ordre `PENDING` de plus de 8 s.
- **Signature** : `X-EJPay-Signature` = HMAC-SHA512 hex du **corps brut**, comparé en temps constant (`crypto.subtle` + XOR accumulateur). La route lit `c.req.text()` avant tout `JSON.parse`, journalise chaque callback (`ejpay_event:<orderId>:<ts>`) et répond 200 en moins de 10 s ; elle ne renvoie 500 qu'en cas d'exception interne pour déclencher un nouvel essai (traitement idempotent).
- **Idempotence** : `orderId` est la clé (`ejpay_order:<orderId>`). Un ordre `PENDING` réutilisé → `200 duplicate` **sans nouvel appel Ejpay** ; un ordre `SUCCESS`/`FAILED` réutilisé → `409`. Le règlement métier est gardé par `settledAt`, donc un callback rejoué ne crédite jamais deux fois.
- **Règlement métier** : `wallet_topup` → crédit `walletBalance`/`balance` (`passenger:<id>` + `profile:<id>`) + `wallet_tx:<orderId>` ; `ride_payment` → course en `paymentStatus: paid`, `paymentMethod: ejpay`, `paymentReference`, `paidAt`, `amountPaid` ; `deposit` → `scheduled_rides.deposit_received = true` + méthode + date ; `payout` → `wallet_tx` en `completed` + push FCM au chauffeur.
- **Retrait chauffeur** : le bonus est **réservé (débité) avant** l'appel Ejpay ; refus immédiat ou callback `FAILED` → recrédit automatique (`wallet_tx` de type `withdraw_refund`, garde `refundedAt`).
- **Contrôles de montant** : sur `kind = "ride_payment"`, le montant est refusé s'il dépasse le prix de la course (+1 de tolérance) ; sur callback/polling, un montant reçu différent du montant attendu bascule l'ordre en `REVIEW` **sans crédit automatique**.
- **Sécurité** : `payout`, `orders`, `wallets`, `refresh` exigent `X-Admin-Secret` (`EJPAY_ADMIN_SECRET`, repli `ADMIN_CREATION_SECRET`), comparaison en temps constant. Aucun identifiant Ejpay côté client. Rate-limit global de l'Edge Function conservé.
- **Activation** : drapeau `ejpayEnabled` dans `smartcabb_global_config` (`POST /config/update`), **faux par défaut** ; `collect`/`payout` répondent `503 EJPAY_DISABLED` tant qu'il est inactif. `ejpayEnabled()` exige aussi `EJPAY_CLIENT_ID`/`EJPAY_CLIENT_SECRET`.
- **Numéros** : normalisation en `243XXXXXXXXX` (accepte `+243…`, `00243…`, `243…`, `0XXXXXXXXX`, `XXXXXXXXX`) — format exigé par le guide.
- **Aucune migration SQL** : tout vit dans le KV existant (`kv_store_2eb02e52`).

### Impact produit / comportement visible
- **Aucun changement visible pour l'instant** : le service est déployé inactif et aucune interface ne l'appelle encore.
- Une fois activé : le passager pourra payer/recharger via Mobile Money (validation sur son téléphone), le chauffeur pourra être payé sur son wallet, l'admin disposera de la liste des transactions et des soldes marchand.
- Les événements `ejpay_payment` / `ejpay_payment_failed` apparaîtront dans le fil d'activité admin.

### Risques & rollback
- **Risque** : un callback sans signature valide est ignoré (401) — vérifier `EJPAY_WEBHOOK_SECRET` avant la mise en production.
- **Risque** : un ordre peut rester `PENDING` si le client ne valide pas et que l'app est fermée avant le dernier polling → bouton `POST /orders/:orderId/refresh` côté admin.
- **Risque** : `EJPAY_ADMIN_SECRET` non défini → repli sur `ADMIN_CREATION_SECRET` (rotation liée).
- **Rollback immédiat** : `POST /config/update` `{"config":{"ejpayEnabled":false}}` — aucun redéploiement nécessaire.
- **Rollback total** : `git revert fdeae1a` puis push sur `main` ; suppression des secrets `EJPAY_*` ; nettoyage optionnel des clés KV `ejpay_order:*` / `ejpay_event:*`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK (18,95 s)
- [ ] Recette sandbox/production : `POST /collect` sur petit montant avec un vrai numéro, vérification du prompt, du passage à `SUCCESS` et du crédit unique (procédure détaillée dans `docs/EJPAY_INTEGRATION.md` § 9)
- [ ] Déploiement Edge Function vérifié (`GET /ejpay/config` → `configured: true`)

---

## 2026-11-04 — « Choisir un véhicule » : SmartCabb Standard à la même taille que les autres catégories

- **Commit** : `bc3933e` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : fix (UI) 
- **Objectif** : sur l'écran « Choisir un véhicule », la carte **SmartCabb Standard** occupait toute la largeur (`col-span-2`) et devenait plus haute que les autres une fois sélectionnée. Le client demande qu'elle soit « au même pied » que Confort, Familiale et Business.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/EstimateScreen.tsx` | Suppression de `isStandardVariant` / `fullWidth` (`col-span-2`) ; grille `auto-rows-fr` ; pied de carte (badge ✓ + bouton) à espace réservé |

### Description technique
- **Largeur** : la classe conditionnelle `${fullWidth ? 'col-span-2' : ''}` a été retirée de `renderVehicleCard`, ainsi que le helper `isStandardVariant`. Les 4 cartes (Standard, Confort, Familiale, Business) occupent donc une seule colonne de la grille `grid-cols-2`.
- **Hauteur identique** : la grille passe de `grid grid-cols-2 gap-1.5` à `grid grid-cols-2 auto-rows-fr gap-1.5`. `grid-auto-rows: minmax(0, 1fr)` force les deux rangées à la même hauteur (celle du plus grand contenu), donc les 4 cartes ont exactement la même hauteur même si Business n'affiche qu'une seule ligne tarifaire.
- **Sélection sans changement de taille** : le pied de carte (badge « ✓ Succès » + bouton « Confirmer la commande », ~52 px) n'est plus rendu conditionnellement. Il est toujours présent en DOM et simplement masqué par `invisible` (`visibility: hidden`, l'espace reste occupé) quand le véhicule n'est pas sélectionné ; `aria-hidden` et `tabIndex={-1}` évitent qu'il soit lu ou focusé. La carte sélectionnée n'est donc pas plus haute que les autres.
- **Alignement** : la carte devient `flex flex-col` + `h-full`, le contenu interne `p-1.5 flex flex-col flex-1 gap-1`, et le pied est poussé en bas par `mt-auto` → bouton toujours aligné en bas de carte, quelle que soit la longueur du bloc tarifaire.

### Impact produit / comportement visible
- Les 4 catégories ont la même largeur et la même hauteur, alignées en 2 × 2.
- Sélectionner un véhicule ne fait plus « sauter » la hauteur de la grille : seul le pied de la carte devient visible.
- Le bouton de commande reste dans la carte sélectionnée, aligné en bas.

### Risques & rollback
- **Risque** : chaque carte réserve ~52 px de pied vide quand elle n'est pas sélectionnée (choix assumé pour garantir une hauteur constante).
- **Risque** : sur écran très étroit, les libellés du bloc tarifaire restent en 9 px (comportement inchangé).
- **Rollback** : `git revert f9e0c11`, ou remettre manuellement `col-span-2` pour `smart_standard` et l'affichage conditionnel du pied de carte.

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`, pré-existantes)
- [x] `npx vite build` — OK
- [x] Mesures DOM (reproduction de la grille, viewport 390 px) : 4 cartes à **176 × 234 px**, Standard sélectionnée incluse
- [x] Mesures DOM (1440 px) : 4 cartes à **701 × 234 px**, aucun débordement horizontal
- [ ] Contrôle visuel sur appareil réel après déploiement Vercel

---

## 2026-11-04 — Chargement : un seul écran (le splash validé) au lieu de 2-3 écrans successifs

- **Commit** : `9f14db1` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : fix (perf perçue) + feat (identité du loader)
- **Objectif** : en passant d'une page à l'autre, l'application affichait parfois **deux ou trois écrans de chargement à la suite** (splash natif Android → preloader web → splash React → fallback Suspense), ce qui donnait une impression de lourdeur. Le seul écran de chargement doit être celui validé par le client (capture : fond bleu nuit, tuile logo, SMARTCABB, barre jaune, « Ride Smart, Live Smart », Kinshasa · RDC).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/BrandLoader.tsx` | Reproduit le splash validé (grille, itinéraire pointillé, tuile logo, filigrane, pied de page) ; une seule animation |
| `index.html` | Bloc `<style id="boot-loader-css">` et markup `#preloader` réécrits à l'identique ; mêmes classes `.sc-boot*` |
| `styles/globals.css` | Règles `.sc-boot*` alignées sur le nouveau visuel (`.sc-boot-grid`, `.sc-boot-route`, `.sc-boot-vignette`, `.sc-boot-footer`, `.sc-boot-tagline`, `.sc-boot-place`) |
| `components/DeferredLoading.tsx` | **Nouveau** : fallback `Suspense` qui n'affiche le loader qu'après 400 ms |
| `components/SplashScreen.tsx` | Précharge la route courante (`warmRouteModule`) et borne l'affichage (0,8 s → 2,6 s) ; plus de retour anticipé |
| `components/AppRouter.tsx` | Le splash n'est affiché qu'une fois par session (`sc-splash-seen` lu à l'initialisation) ; fallback = `DeferredLoading` |
| `App.tsx` | Fallback global = `DeferredLoading` (import `LoadingScreen` remplacé) |
| `android/app/src/main/res/drawable/splash_bg.xml` | Splash natif : fond blanc + icône Capacitor → fond bleu nuit `#0D3145` + tuile logo centrée |
| `android/app/src/main/res/drawable-*/splash_logo.png` | **Nouveaux** : tuile logo (mdpi 132 px → xxxhdpi 528 px), fond du JPEG détouré pour se fondre dans la tuile |

### Description technique
- **Cause des écrans multiples** : quatre rendus de chargement différents se succédaient. (1) le splash natif Android était encore celui de Capacitor (fond **blanc** + icône bleue) ; (2) le preloader d'`index.html` et (3) le `SplashScreen` React s'affichaient tous les deux ; (4) le module de la route étant chargé en `lazy`, le fallback `Suspense` réapparaissait juste après le splash. En navigation avec rechargement complet (`window.location`), toute la chaîne repartait.
- **Un seul visuel** : `index.html` (CSS critique + markup) et `BrandLoader` partagent exactement les mêmes classes, donc le preloader natif est remplacé par le splash React sans rupture. Le splash natif Android reprend la même couleur de fond (`#0D3145`) et la même tuile logo.
- **Plus qu'un splash par session** : `AppRouter` initialise `showSplash` à partir de `sessionStorage['sc-splash-seen']`. À la première ouverture, le splash s'affiche et précharge la route (`warmRouteModule` : `PassengerApp`, `DriverApp`, `AdminApp`, `LandingScreen` ou `LandingPage`) entre 0,8 s et 2,6 s. Aux rechargements suivants, **aucun splash** : le preloader a déjà couvert le démarrage.
- **Fallback différé** : `DeferredLoading` ne monte le loader qu'après 400 ms. Chunk en cache (cas normal) → rien ne s'affiche ; chunk lent → le même écran (jamais un autre spinner).
- **Android** : `splash_bg.xml` utilise une `<shape>` bleu nuit + `@drawable/splash_logo` centré. Les PNG sont générés avec une tuile blanche arrondie (rayon 23 %) et le logo détouré (pixels neutres clairs passés en alpha 0), donc aucun rectangle gris visible. **L'APK doit être reconstruit** pour bénéficier de ce changement.

### Impact produit / comportement visible
- Ouverture de l'app : **un seul** écran SmartCabb, du splash natif jusqu'à l'écran d'accueil (plus de flash blanc, plus d'icône Capacitor).
- Navigation entre les pages : **aucun écran de chargement** dans le cas normal ; si un module tarde (> 400 ms), c'est toujours le même écran SmartCabb qui apparaît, jamais un spinner différent.
- Le splash n'est plus rejoué à chaque rechargement complet : une seule fois par session.

### Risques & rollback
- **Risque** : si un module met plus de 400 ms à charger sur un réseau très lent, un écran de chargement apparaît en cours de navigation — c'est volontaire et identique au splash.
- **Risque** : un splash natif mal rendu sur certains Android 12+ (le système peut imposer sa propre animation d'icône) ; le fond reste bleu nuit.
- **Rollback global** : `git revert 9f14db1`.
- **Rollback partiel** : remettre `const SuspenseFallback = () => <LoadingScreen />;` dans `App.tsx` (loader immédiat) et `useState(true)` dans `AppRouter` (splash à chaque ouverture).
- **Rollback Android** : restaurer l'ancien `splash_bg.xml` (fond blanc + `@mipmap/ic_launcher_foreground`) ; les PNG `splash_logo.png` peuvent rester (inutilisés).

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`, pré-existantes)
- [x] `npx vite build` — OK
- [x] Premier chargement d'une session : splash React affiché (`sessionStorage['sc-splash-seen'] = '1'`), preloader déjà retiré
- [x] Rechargement dans la même session : `document.querySelector('.sc-boot') === null` et contenu applicatif rendu → **un seul écran**
- [x] Mesures du loader (viewport 527 px) : tuile 112 px centrée, marque 23 px, barre 96 × 3 px, pied de page à 81 % / 87 % de la hauteur, aucun débordement horizontal
- [x] Aucune erreur console
- [ ] Rendu visuel sur appareil Android réel après reconstruction de l'APK (splash natif → WebView)

---

## 2026-11-04 — Vitrine : CTA « Réserver une course », photo chauffeur en fond de hero, App Store « très bientôt » et animations au défilement

- **Commit** : `fefa519` (`main` → `origin/main`)
- **Auteur** : Équipe SmartCabb
- **Type** : feat (vitrine) + fix (animations / ancres)
- **Objectif** : compléter le hero refait la veille (CTA « Réserver une course », photo du chauffeur, suppression du badge « Taxi & VTC · Kinshasa »), annoncer l'arrivée de l'app iPhone, et faire en sorte que **toutes** les sections s'animent réellement au défilement ou au clic sur les liens du menu.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `pages/LandingPage.tsx` | Hero : badge « Taxi & VTC · Kinshasa » supprimé, 3ᵉ CTA « Réserver une course », rangée de badges Google Play + App Store, tableau `backgrounds` `{ src, position }` avec la photo du chauffeur en 1ʳᵉ position ; nouveau composant `AppStoreBadge` ; `PlayStoreBadge` refactoré sur `.sc-store-badge` ; `useInViewCustom` fiabilisé ; `scroll-margin-top` des ancres ; fermeture du menu mobile au clic |
| `styles/globals.css` | `scroll-behavior: smooth` ajouté aussi sur `body` (conteneur de défilement réel des pages longues) |
| `public/hero-driver.jpg` | Nouvelle image de fond du hero (chauffeur SmartCabb souriant), 1518 × 1152, qualité 90 |

### Description technique
- **Hero** : suppression de l'eyebrow « Taxi & VTC · Kinshasa » (jugé non essentiel). Les CTA sont désormais : `Commander une course` (`/app/passenger`), `Réserver une course` (`/app/passenger?screen=scheduled-rides`, bouton clair `.sc-hero-btn-soft`) et `Devenir Chauffeur`. Les badges de téléchargement sont sortis de la rangée de boutons et regroupés dans `.sc-hero-stores` (Google Play cliquable + App Store « très bientôt »).
- **Photos de fond** : `backgrounds` passe de `string[]` à `{ src: string; position: string }[]` pour pouvoir cadrer chaque image indépendamment. `public/hero-driver.jpg` est en première position avec `background-position: center 32%`. Le fondu enchaîné (4 s, opacité 1,6 s) est inchangé.
- **`AppStoreBadge`** : composant non cliquable (`role="note"`, `aria-label` explicite), logo Apple, mention « Très bientôt » / « App Store » et pastille `iOS`. Utilisé à la fois dans le hero et dans le bandeau « Télécharger l'app » (remplace l'ancien bloc iOS inline, dont le balisage était dupliqué).
- **`PlayStoreBadge`** : styles inline remplacés par la classe `.sc-store-badge` (hauteur 52 px desktop / 48 px mobile, fond `#222`, hover CSS). Le prop `pulse` réactive l'animation d'attention `ctaAttention` uniquement dans le bandeau de téléchargement — le hero reste calme (une seule animation d'entrée).
- **Animations au défilement** : `useInViewCustom` vérifie d'abord si l'élément est déjà dans le viewport au montage (affichage immédiat, pas de section qui « saute »), sinon utilise `IntersectionObserver` avec `rootMargin: '0px 0px -6% 0px'`, replie sur `setInView(true)` si l'API est absente, et embarque un filet de sécurité : si l'observateur ne rappelle jamais (rendu suspendu, WebView), la section est affichée au bout de 2,5 s. Une section ne peut donc plus rester invisible.
- **Ancres** : `section[id] { scroll-margin-top: 118px }` (90 px sous 900 px) pour que « Comment ça marche », « Pourquoi nous », « Témoignages » s'arrêtent **sous** le header fixe (barre d'infos 36 px + nav 74 px). Le menu mobile se referme au clic sur un lien (`setIsMenuOpen(false)`).
- **Défilement réel** : sur les pages longues, `html, body { height: 100% }` fait de `<body>` le conteneur de défilement. `scroll-behavior: smooth` a donc été ajouté sur `body` (il n'était que sur `html`), et l'écouteur du scroll-spy passe en phase de capture (`{ capture: true }`) pour recevoir les événements émis par `<body>`.

### Impact produit / comportement visible
- Le hero propose à nouveau « Réserver une course » (réservation planifiée) à côté de « Commander une course ».
- La photo du chauffeur souriant ouvre le diaporama de fond du hero.
- « Très bientôt sur l'App Store » est visible pour les iPhone, dans le hero **et** dans le bandeau de téléchargement, sans lien mort.
- Chaque section apparaît en fondu + translation (droite/gauche pour « Pourquoi nous » et « Afrique ») au défilement, et les liens d'ancre amènent la section sous le header sans la masquer.
- Menu mobile : un clic sur un lien ferme le panneau et laisse voir la section ciblée.

### Risques & rollback
- **Risque** : `public/hero-driver.jpg` est un recadrage (1518 × 1152) de la photo fournie, pas l'original haute définition — léger flou possible sur écran 4K. Remplacer le fichier par l'original **sans changer le code** (même nom, même chemin).
- **Risque** : `scroll-behavior: smooth` sur `body` s'applique à toute l'application (désactivé automatiquement par la règle `prefers-reduced-motion` déjà présente).
- **Rollback global** : `git revert fefa519`.
- **Rollback animations** : retirer `rootMargin` / filet de sécurité dans `useInViewCustom` (les sections redeviennent dépendantes du seul `IntersectionObserver`).
- **Rollback hero** : remettre `backgrounds` en `string[]` et retirer la section `.sc-hero-stores` du JSX.

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`, pré-existantes)
- [x] `npx vite build` — build OK (seul avertissement : chunk `PassengerApp` > 500 kB, pré-existant)
- [x] Mesures DOM via iframes 1440 / 1280 / 390 px : `scrollWidth === clientWidth` (aucun débordement horizontal), hero 900 px (desktop) / 828 px (mobile), titre 76 px → 35 px, `scroll-margin-top` 118 px / 90 px, badges 52 px / 48 px, 3 CTA présents
- [x] Barre d'informations masquée sous 900 px, `.sc-hero-eyebrow` absent du DOM
- [ ] Vérification visuelle du fondu au défilement (non instrumentable ici : le panneau navigateur de test suspend le rendu, `IntersectionObserver` et `requestAnimationFrame` ne rappellent pas) — à confirmer sur `https://smartcabb.vercel.app` après déploiement

---

## 2026-11-04 — Vitrine plein écran (hero full-bleed) + correction du conteneur racine compressé

- **Commit** : `0527c23` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : fix (mise en page) + feat (design vitrine)
- **Objectif** : le site public paraissait « bizarre » et comprimé au centre de l'écran. Il doit occuper toute la largeur, avec un rendu professionnel de type site institutionnel : barre d'informations, header large, hero photo plein écran et titre centré.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `styles/globals.css` | `.app-container` repassé en pleine largeur (`max-width: none`) ; nouveau `.content-narrow` (42 rem) pour les blocs de texte qui doivent rester lisibles |
| `pages/LandingPage.tsx` | Refonte complète du hero (full-bleed photo + voile sombre + titre centré + bandeau de chiffres) ; barre d'informations et header élargis à 1600 px ; suppression du hero 2 colonnes, du carrousel d'images et des badges flottants ; polices Inter déplacées vers `index.html` |
| `lib/simple-router.tsx` | `Link` transmet désormais **toutes** les props natives de `<a>` (dont `style`, `title`, `aria-*`) — avant, seul `className` était transmis |
| `index.html` | Famille Inter ajoutée au `<link>` Google Fonts (suppression de l'`@import` CSS bloquant de la vitrine) |

### Description technique
- **Cause racine du site « comprimé »** : le lot design précédent avait défini `.app-container { max-width: 42rem }`. Or `App.tsx` utilise `.app-container` comme **conteneur racine de toute l'application** : le site entier était donc limité à 672 px et centré. Correction : `.app-container { width: 100%; max-width: none; margin-inline: 0 }`. L'utilitaire de largeur de lecture est renommé `.content-narrow` (opt-in, 42 rem).
- **Hero full-bleed** : section `min-height: 100dvh`, photo de fond en `background-size: cover` (3 photos en fondu enchaîné toutes les 4 s), voile dégradé bleu nuit pour la lisibilité, contenu centré : badge « Taxi & VTC · Kinshasa », titre `clamp(36px, 6vw, 76px)`, sous-titre 660 px max, 3 CTA (Commander, Devenir chauffeur, Google Play) et bandeau de 3 chiffres clés en verre dépoli. Plus de grille 2 colonnes, plus de badges flottants ni de particules.
- **En-tête** : barre d'informations sombre (36 px, desktop uniquement) — Kinshasa, 24h/24, téléphone `+243 960 624 008`, moyens de paiement, chauffeurs vérifiés — puis navigation blanche collante de 74 px. Les deux blocs sont contenus dans 1600 px (au lieu de 1280 px), ce qui donne l'effet pleine largeur sur grand écran. En dessous de 900 px, la barre d'informations est masquée et le hero passe à 92 dvh avec des paddings réduits.
- **`Link` du routeur maison** : la signature est étendue à `Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>` et `{...rest}` est appliqué à l'ancre. Conséquence immédiate : le logo du header n'est plus empilé (son `display:flex` inline était perdu) et les liens stylés en boutons (ex. « Login ») retrouvent leur padding et leur taille de police. Correction transverse, bénéfique à toutes les pages.
- **Polices** : `@import url(fonts.googleapis…)` retiré du `<style>` de la vitrine (bloquant) ; Inter est chargée via le `<link>` de `index.html` avec `preconnect`.

### Impact produit / comportement visible
- Le site public occupe désormais 100 % de la largeur : plus de colonne étroite au centre de l'écran.
- Page d'accueil : hero photo plein écran avec titre centré, comme une vitrine institutionnelle ; header avec coordonnées et moyens de paiement.
- Les pages `/services`, `/about`, `/contact`, `/terms`, `/legal` occupent aussi toute la largeur (contenu à 1280 px, fond pleine largeur).
- Header corrigé sur toutes les pages : logo horizontal, boutons de navigation à la bonne hauteur.

### Risques & rollback
- **Risque** : le hero plein écran est plus sombre que l'ancien hero clair ; les photos de fond doivent rester lisibles (voile réglable dans `.sc-hero-overlay`).
- **Rollback mise en page** : remettre `max-width: 42rem; margin-inline: auto` sur `.app-container` (déconseillé : reproduit le bug).
- **Rollback hero** : `git revert` du commit ; l'ancien hero 2 colonnes est dans l'historique Git (`pages/LandingPage.tsx`).
- **Rollback `Link`** : retirer `{...rest}` et l'extension de `LinkProps` — mais le logo du header redeviendra empilé.

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`)
- [x] `npx vite build` — OK
- [x] Mesures réelles en iframe 1440 / 1280 / 390 px sur `/` : `scrollWidth === clientWidth` partout ; hero 900 px (1440), 828 px (390) ; titre 76 px / 61 px / 35 px ; barre d'infos visible ≥ 900 px uniquement ; boutons 52 px (desktop) / 48 px (mobile)
- [x] `/services`, `/about`, `/contact`, `/terms`, `/legal`, `/app/landing` en 1440 px : aucune page ne dépasse la largeur, contenu 1280 px
- [x] Logo du header mesuré `display: flex`, 176 × 40 px (alignement horizontal rétabli)

---

## 2026-11-03 — Design system : échelle typographique Uber, chargement unique, responsivité globale

- **Commit** : `94c9ca7` (`main` → `origin/main`)
- **Auteur** : équipe SmartCabb
- **Type** : feat (design system) + perf (chargement)
- **Objectif** : harmoniser la typographie sur une échelle dense type Uber (textes plus petits, hiérarchie plus nette), ne garder qu'**une seule animation** pendant le chargement de page, et durcir la responsivité sur toute l'application (hauteurs dynamiques, encoches, débordements, tailles tactiles).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `styles/globals.css` | Nouvelle échelle `@theme` (`--text-xs` → `--text-9xl`), typographie de base 14 px, correctifs responsives globaux, styles du loader unique, `prefers-reduced-motion` |
| `index.html` | Polices en `<link>` + `preconnect` (retirées du CSS), styles critiques du loader inline, preloader natif au nouveau markup |
| `components/BrandLoader.tsx` | **Nouveau** — écran de chargement unique (1 seule animation : la barre) |
| `components/LoadingScreen.tsx` | Réutilise `BrandLoader` (avant : spinner + point pulsé + barre = 3 animations) |
| `components/SplashScreen.tsx` | Réécrit : plus de phases halo/rivets/itinéraire/slogan, délais réduits (1,2 s / 0,5 s) |
| `components/AppRouter.tsx`, `App.tsx` | Fallback Suspense simplifié (plus de wrapper dégradé autour du loader) |
| `main.tsx` | Le preloader natif n'est retiré qu'après le premier rendu React (double `requestAnimationFrame`) |
| `public/preloader.js` | Retrait instantané du preloader (plus de fondu de 300 ms qui superposait deux barres) |
| `components/ui/button.tsx` | Hauteurs type Uber : 44 px (défaut), 36 px (`sm`), 48 px (`lg`), libellé 15 px |
| `components/ui/input.tsx` | Champs 44 px, texte 15 px |

### Description technique
- **Typographie** : les variables `--text-*` de Tailwind sont redéfinies dans un bloc `@theme`. Toutes les classes `text-*` — y compris les variantes responsives `md:text-*` — suivent donc la nouvelle échelle : `xs` 11 px, `sm` 13 px, `base` 14 px, `lg` 16 px, `xl` 18 px, `2xl` 20 px, `3xl` 24 px, `4xl` 28 px, `5xl` 32 px, `6xl` 40 px. Le corps de texte passe à 14 px (référence Uber), les titres ont un interligne resserré et un `letter-spacing` de −0,01 em.
- **Chargement unique** : `BrandLoader` est le seul écran de démarrage. Il est rendu à l'identique par le preloader natif (`index.html`), le `SplashScreen` et tous les fallbacks `LoadingScreen`/`Suspense`. Une seule animation : `.sc-boot-bar` (`sc-boot-bar-slide`, barre jaune en boucle). Le CSS critique est inline dans `index.html` pour un affichage avant même le bundle.
- **Pas de flash** : `main.tsx` attend deux frames avant de retirer le preloader ; `preloader.js` le supprime instantanément (le rendu React est identique). Les anciennes 7 animations du splash (halo, 6 rivets orbitaux, tracé, point, marque, barre) sont supprimées.
- **Responsivité** : `.h-screen`/`.min-h-screen` passent en `100dvh` (barre d'adresse mobile), `overflow-x` verrouillé sur `html/body/#root`, utilitaires `.safe-top/.safe-bottom/.safe-x` (encoches), `.app-container` / `.page-container` (largeurs de lecture), `.table-responsive`, `.break-anywhere`. En mode PWA/APK plein écran, les barres `sticky top-0` / `fixed top-0` reçoivent `env(safe-area-inset-top)`.
- **Accessibilité** : `prefers-reduced-motion` neutralise la barre et les transitions ; `text-wrap: balance/pretty` sur les titres et paragraphes.
- **Perf** : les polices Google ne sont plus importées depuis le CSS (bloquant) mais chargées via `preconnect` + `link` dans `index.html`.

### Impact produit / comportement visible
- Tous les écrans (vitrine, passager, chauffeur, admin) paraissent plus denses et plus pro : textes secondaires à 11–13 px, corps à 14 px, titres à 20–28 px.
- Démarrage : un seul écran bleu acier, un seul logo, une seule barre qui progresse — plus de spinner concurrent ni de splash de 3 s.
- Les anciens titres trop grands sur mobile (`text-6xl` = 60 px) passent à 40 px : plus de débordement.
- Boutons et champs à 44 px minimum : cibles tactiles conformes.

### Risques & rollback
- **Risque** : certaines pages très denses peuvent sembler plus compactes qu'avant ; les écrans qui misaient sur des tailles énormes perdent en emphase.
- **Rollback typographie** : supprimer le bloc `@theme` des tailles dans `styles/globals.css` (retour à l'échelle Tailwind d'origine) — le reste (loader, dvh) est indépendant.
- **Rollback chargement** : `git revert` du commit ; `SplashScreen` et `LoadingScreen` restent néanmoins compatibles avec l'ancien markup.

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune nouvelle erreur (hors `_headers/Code-component-*.tsx`)
- [x] `npx vite build` — build OK, échelle CSS compilée vérifiée (`--text-6xl: 2.5rem`, `100dvh`, `sc-boot-bar-slide`)
- [x] Rendu vérifié en 390 px sur `/`, `/app/landing`, `/app/passenger`, `/app/driver`, `/services`, `/terms`, `/about`, `/contact` : `scrollWidth === clientWidth` partout (aucun débordement horizontal)
- [x] Corps de texte mesuré à 14 px, boutons à 44–48 px
- [x] Loader vérifié : une seule animation (`sc-boot-bar-slide`), fond dégradé et médaillon conformes

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
