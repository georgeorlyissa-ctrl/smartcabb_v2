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

## 2026-11-26 (55) — CIS 8.1 : journal d'audit réellement alimenté + état des lieux IG1

- **Commit** : `9ecd95d` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat (sécurité / exploitation)
- **Objectif** : la table `audit_logs` existait mais **aucune action n'y était écrite** (0 ligne) ; l'écran « Journal d'audit » était donc vide. Ajout d'une journalisation serveur des actions sensibles, d'une purge à 90 jours et d'un état des lieux CIS IG1.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/audit-log.ts` | **Nouveau** : `writeAuditLog()` + `purgeAuditLogs()` (rétention 90 j, validation IP, repli si FK) |
| `supabase/functions/make-server-2eb02e52/backup-routes.ts` | Audit de `backup.run`, `backup.restore_test`, `alerts.test` + purge des logs anciens |
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | Audit de `config.update` (clés modifiées, taux, commissions) |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | Audit de `driver.balance` (opération, montant, avant/après) |
| `docs/security/LOG_POLICY.md` | **Nouveau** : politique de journalisation + routine de revue mensuelle |
| `docs/security/CIS_IG1_CHECKLIST.md` | **Nouveau** : état des 18 contrôles CIS v8.1 au niveau IG1 |
| `docs/security/ASSET_INVENTORY.md` | **Nouveau** : actifs, comptes, données sensibles |
| `docs/security/SUBPROCESSORS.md` | **Nouveau** : sous-traitants, données, localisation, responsabilités |
| `docs/security/ACCESS_REVIEW.md` | **Nouveau** : revue trimestrielle des accès + procédures |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Modifications en base (SQL appliqué)

```sql
-- un utilisateur ne peut journaliser que ses propres actions
drop policy "System can insert audit logs" on public.audit_logs;      -- insert sans with_check
create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated with check (user_id = auth.uid());

-- lecture admin basée sur le rôle JWT (les profils admin n'ont pas toujours is_admin)
create policy "audit_logs_admin_select" on public.audit_logs for select to authenticated
  using (jwt role admin OR profiles.is_admin);

-- actions système (cron) sans utilisateur
alter table public.audit_logs alter column user_id drop not null;
```

### Description technique

- `writeAuditLog()` n'échoue jamais côté route : erreurs avalées et journalisées.
  Si l'insertion est refusée par la clé étrangère `audit_logs.user_id → profiles`
  (cas actuel : la table `profiles` est vide), l'entrée est rejouée avec `user_id = null`
  (action système) au lieu d'être perdue.
- `purgeAuditLogs()` supprime les entrées de plus de **90 jours** (`AUDIT_LOG_RETENTION_DAYS`),
  exécutée à chaque sauvegarde quotidienne.
- L'IP est validée (IPv4/IPv6) avant insertion dans la colonne `inet`.
- Aucune PII dans `details` : identifiants, quantités, résultats uniquement.

### Impact produit / comportement visible
- Le panneau admin → **Journal d'audit** affiche désormais les actions réelles
  (sauvegardes, tests de restauration, configuration, soldes chauffeurs, alertes).
- Conservation automatique sur 90 jours, avec une procédure de revue mensuelle documentée.

### Risques & rollback
- **Risque** : la table `profiles` étant vide, les entrées admin sont enregistrées en
  « système » (`user_id` null) — la traçabilité de l'action est conservée, l'auteur est
  dans `details`/logs. À corriger en créant les profils admin si l'on veut l'auteur en base.
- **Rollback** : `git revert <hash>` + redéploiement de la fonction ; les policies peuvent
  être restaurées par SQL.

### Tests / vérifications
- [x] `POST /backups/restore-test` → `passed: true`, **`auditWritten: true`**
- [x] Ligne créée dans `audit_logs` : `action = backup.restore_test`
- [x] Insertion directe avec `user_id = null` → `201`
- [x] Purge branchée sur la sauvegarde quotidienne (rétention 90 j)
- [x] Policies RLS appliquées (insertion limitée à son propre `user_id`)
- [ ] Revue de l'écran Journal d'audit après connexion admin réelle (2FA)

---

## 2026-11-26 (54) — Recherche globale dans le panneau admin (Ctrl+K) + « Sauvegardes » introuvable

- **Commit** : `4bac565` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat (ergonomie admin)
- **Objectif** : l'écran de sauvegarde existait mais n'était pas trouvable dans le panneau (action « Backup & Recovery » noyée dans les actions rapides). Ajout d'une **recherche globale** : on tape « sauvegarde » et on arrive directement sur l'écran.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/admin/AdminCommandPalette.tsx` | **Nouveau** : palette de recherche (registre de 34 écrans, filtrage sans accents, navigation clavier) |
| `pages/AdminApp.tsx` | Montage de la palette + bouton flottant « 🔎 Rechercher » + raccourci **Ctrl/⌘ + K** |
| `components/admin/AdminDashboard.tsx` | Barre de recherche sous l'en-tête + renommage « Backup & Recovery » → **« Sauvegardes »** |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

- **Registre** (`ADMIN_SCREENS`) : 34 écrans avec identifiant, libellé FR, description et mots-clés (synonymes inclus : `sauvegarde`, `backup`, `restauration`, `restore`, `santé`, `chauffeur`, `conducteur`, `paiement`, `mobile money`, `réservation`, `T-15`, `SOS`…).
- **Filtrage** : normalisation NFD (accents ignorés) + score (libellé exact > préfixe > inclusion > mot-clé > description). « sauvegarde » ne renvoie qu'un résultat : **Sauvegardes & restauration**.
- **Navigation clavier** : ↑ ↓, Entrée pour ouvrir, Échap pour fermer ; clic sur le fond pour fermer ; focus automatique sur le champ.
- **Points d'entrée** : barre de recherche visible sur le tableau de bord, bouton flottant en bas à droite sur tous les écrans admin, raccourci `Ctrl+K` / `⌘+K`.
- La palette est masquée sur les écrans de connexion/inscription admin.

### Impact produit / comportement visible
- Taper « sauvegarde » mène en un clic à l'écran **Sauvegardes**, dont la carte **Santé du système** (dernier backup, test de restauration, alertes) est en haut.
- Recherche utilisable pour tous les écrans : chauffeurs, clients, paiements, réservations, SOS, paramètres, audit…
- Renommage de l'action rapide en « Sauvegardes » (terme utilisé par l'exploitant).

### Risques & rollback
- **Risque** : aucun impact sur les données ; composant purement client.
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit` + `npm run build`
- [x] Barre de recherche visible sur le tableau de bord
- [x] Bouton flottant présent sur les écrans admin (masqué sur login/register)
- [x] Ouverture de la palette, saisie « sauvegarde » → **1 résultat** : « Sauvegardes & restauration »
- [x] Clic / Entrée → navigation vers l'écran Sauvegardes, carte « Santé du système » affichée
- [ ] Vérification visuelle après connexion admin réelle (2FA)

---

## 2026-11-26 (53) — Santé système : test de restauration, alertes email et fiche incident

- **Commit** : `df6662e` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat (exploitation / sécurité)
- **Objectif** : combler les trois trous restants côté exploitation — sauvegardes jamais testées, pannes silencieuses, aucune procédure d'incident — et les rendre visibles dans le panneau admin.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ops-alerts.ts` | **Nouveau** : envoi d'alertes email (SMTP), anti-spam 15 min, état dans le KV, résolution du destinataire |
| `supabase/functions/make-server-2eb02e52/backup-routes.ts` | `GET /health`, `POST /restore-test`, `POST /alerts/test`, mémorisation du dernier backup, alerte en cas d'échec |
| `supabase/functions/make-server-2eb02e52/index.ts` | `onError` envoie une alerte email (throttle 15 min) en plus de la réponse générique |
| `components/admin/BackupAndRecoveryScreen.tsx` | Carte **« Santé du système »** : dernier backup, test de restauration, alertes, boutons de test |
| `docs/security/INCIDENT_CARD.md` | **Nouveau** : fiche incident d'une page |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

**Alertes (`ops-alerts.ts`)**
- Destinataire : `ADMIN_ALERT_EMAIL`, sinon `ADMIN_2FA_EMAIL`, sinon **le premier compte Supabase au rôle `admin`** (aucun secret obligatoire).
- `sendOpsAlert(kind, subject, lines, { throttleMs, force })` : jamais bloquant (toutes les erreurs sont avalées), anti-spam par type (15 min par défaut), état conservé dans `system_health:alerts` (`lastSentAt`, `lastKind`, `lastError`, `sentCount`).
- Types : `backup_failed`, `server_error`, `restore_failed`, `test`.

**Sauvegardes (`backup-routes.ts`)**
- `POST /run` écrit `system_health:last_backup` (nom, date, taille, compteurs, durée) et envoie une alerte si la sauvegarde échoue.
- `GET /health` (admin) : dernier backup + âge, dernier test de restauration, état des alertes, compteurs en direct (KV, réservations, SOS). Statut `ok` / `warning` / `critical` avec liste des problèmes (backup > 26 h, aucun test, test en échec > 30 j…).
- `POST /restore-test` (admin) : **restauration à blanc** — télécharge le dernier backup, décompresse (gzip), valide le JSON, vérifie la version de format, la présence des données, la cohérence des compteurs et l'écart avec la base en direct. **N'écrit jamais** dans les tables métier ; le rapport est stocké dans `system_health:last_restore_test` et une alerte part en cas d'échec.
- `POST /alerts/test` (admin) : envoie une alerte immédiate (sans anti-spam) pour valider la configuration SMTP.

**Erreurs 5xx (`index.ts`)**
- `app.onError` déclenche `sendOpsAlert('server_error', …)` (route, message, référence de requête) via `executionCtx.waitUntil` pour ne pas retarder la réponse.

**Panneau admin**
- Nouvelle carte en tête de « Sauvegardes » : badge de statut, âge du dernier backup, résultat du dernier test de restauration (avec le détail des contrôles en échec), état des alertes email, boutons « Tester la restauration » et « Envoyer une alerte de test ».

### Impact produit / comportement visible
- L'administrateur voit en un écran si les sauvegardes sont fraîches, si elles sont réellement restaurables et si les alertes partent.
- En cas d'échec de sauvegarde, d'erreur 5xx ou de test raté, un email arrive automatiquement (max 1/15 min par type).
- Aucun changement pour les passagers et chauffeurs.

### Risques & rollback
- **Risque** : emails d'alerte trop fréquents → anti-spam 15 min par type ; le test manuel est marqué `force`.
- **Risque** : `restore-test` télécharge ~8,6 Mo et dure ~0,5 à 2 s (pas d'impact).
- **Rollback** : `git revert <hash>` + redéploiement de la fonction.

### Tests / vérifications
- [x] `npx tsc --noEmit` + `npm run build`
- [x] Fonction déployée
- [x] `GET /backups/health` → `status: "ok"`, backup vieux de 0,9 h, `recipient: g****@gmail.com`, compteurs `2208 KV / 48 réservations / 6 SOS`
- [x] `POST /backups/restore-test` → **passed: true**, 8 contrôles OK, 8,58 Mo, 2 208 lignes, 42 comptes, 440-2 089 ms
- [x] `POST /backups/alerts/test` → **sent: true** vers `georgeorlyissa@gmail.com`
- [x] Test de restauration enregistré : le statut global passe de `warning` à `ok`
- [ ] Carte « Santé du système » vérifiée visuellement après connexion admin (2FA)

### Secret optionnel
`ADMIN_ALERT_EMAIL` (sinon repli automatique sur le compte admin). Rien à configurer pour que ça fonctionne.

---

## 2026-11-26 (52) — Suppression définitive de l'ancien écran d'accueil passager (double connexion)

- **Commit** : `69a5080` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (navigation)
- **Objectif** : l'ancien écran turquoise « Bienvenue ! » (S'inscrire / Connexion) pouvait encore s'afficher sur `/app/passenger?screen=map` selon l'état mémorisé (`currentScreen = 'landing'` ou valeur inconnue). Il est maintenant **impossible à rendre** : tout état résiduel aboutit à la nouvelle connexion.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `pages/PassengerApp.tsx` | `case 'landing'` **et** `default` renvoient `LoginScreen` ; import de `LandingScreen` supprimé |
| `components/AppRouter.tsx` | Import lazy de `LandingScreen` supprimé (route déjà redirigée) |
| `components/SplashScreen.tsx` | Préchargement de `/app` → `PassengerApp` (au lieu de `LandingScreen`) |
| `components/passenger/LoginScreen.tsx` | « Retour à l'accueil » ne passe plus par l'écran `landing` interne, il quitte vers `/` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- `screenToShow` vaut `'landing'` quand `currentScreen` est vide : ce cas rend désormais `<LoginScreen />` (dans un `ErrorBoundary`), au lieu de l'ancien écran.
- Toute valeur d'écran non reconnue tombe dans `default` → `<LoginScreen />`. Un état hérité (`landing`, `passenger-home`, écran supprimé…) ne peut donc plus afficher autre chose que la connexion.
- `LandingScreen` n'est plus importé nulle part (`grep` : 0 référence hors de son propre fichier) — le composant reste dans le dépôt mais est inerte.
- Le préchargement au démarrage suit la nouvelle route (`PassengerApp`).

### Impact produit / comportement visible
- Un seul écran de connexion côté passager, quel que soit le lien d'entrée (`/app/passenger`, `?screen=map`, `/login`, `/app`, `/app/landing`).
- Le bouton « Retour à l'accueil » ramène au site public.

### Risques & rollback
- **Risque** : un parcours s'appuyant encore sur `setCurrentScreen('landing')` affichera la connexion au lieu de l'ancien accueil — comportement souhaité.
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `/app/passenger` avec `currentScreen = 'landing'` → connexion, **aucun** « Bienvenue ! »
- [x] `/app/passenger?screen=map` avec `currentScreen = 'passenger-home'` → connexion (URL nettoyée)
- [x] `/app` → `/app/passenger` → connexion
- [x] Production vérifiée après déploiement : `?screen=map` → connexion

---

## 2026-11-26 (51) — « Devenir chauffeur » pointe vers `/app/driver` (connexion), plus vers `/signup`

- **Commit** : `ca77189` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (navigation)
- **Objectif** : le CTA « Devenir chauffeur » (et « Devenir partenaire ») ouvrait directement le formulaire d'inscription. Il doit désormais ouvrir la page d'entrée chauffeur `https://www.smartcabb.com/app/driver`, d'où le bouton « Déposer ma candidature » mène à l'inscription.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `pages/LandingPage.tsx` | 2 CTA chauffeur : `/app/driver/signup` → `/app/driver` |
| `pages/DriversLandingPage.tsx` | 4 CTA : `/app/driver/signup` → `/app/driver` ; liens redondants « Déjà chauffeur ? Se connecter » retirés |
| `components/LandingScreen.tsx` | Lien chauffeur aligné (écran conservé, plus affiché) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- Les liens de la page d'accueil (« Devenir chauffeur », « Devenir partenaire ») et des CTA de `/drivers` ciblent maintenant `/app/driver`.
- `DriverApp` affiche la **connexion chauffeur** sur ce chemin (voir entrée 50) ; le bouton « Déposer ma candidature » ouvre le formulaire et met l'URL à jour vers `/app/driver/signup`.
- Le lien de navigation « Conducteurs » (`nav.drivers`) continue de pointer vers la page marketing `/drivers` — il reste utile pour le référencement.
- Aucun autre lien `/app/driver/signup` ne subsiste côté site (vérifié : `driver/signup` n'apparaît plus que dans le bouton interne de candidature et un écran de diagnostic).

### Impact produit / comportement visible
- Un clic sur « Devenir chauffeur » depuis le site arrive sur la connexion chauffeur (numéro + mot de passe), avec l'accès visible à la candidature.
- Plus de formulaire d'inscription imposé à l'arrivée.

### Risques & rollback
- **Risque** : un utilisateur qui voulait s'inscrire doit désormais cliquer sur « Déposer ma candidature » (un clic de plus, volontaire).
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `/drivers` : 4 liens chauffeur, tous vers `/app/driver`
- [x] `/` : « Become a Driver » et « Become a Partner » → `/app/driver`
- [x] Aucun lien `/app/driver/signup` restant côté site

---

## 2026-11-26 (50) — Accès direct à la connexion chauffeur (site + `/driver/login`)

- **Commit** : `5e2bff9` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (navigation)
- **Objectif** : la connexion chauffeur n'était accessible par aucun lien depuis le site, et un écran `driver-registration` mémorisé dans `localStorage` restait affiché indéfiniment — d'où l'impression que « ça passe toujours par le formulaire d'inscription ».

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `pages/DriverApp.tsx` | `useRef` + `bootCheckedRef` : conversion « inscription mémorisée → connexion » une seule fois au chargement ; URL `/login` force la connexion |
| `components/driver/DriverLoginScreen.tsx` | Le bouton « Déposer ma candidature » met l'URL à jour (`/app/driver/signup`, `replaceState`) |
| `pages/DriversLandingPage.tsx` | Liens **« Déjà chauffeur ? Se connecter »** dans le hero et sous le bloc « étapes » |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

- **URL explicite** : `DriverApp` lit `location.pathname` ; si le chemin contient `/login`, l'écran `driver-login` est forcé. La page est donc accessible via :
  - `https://www.smartcabb.com/driver` (entrée par défaut)
  - `https://www.smartcabb.com/app/driver`
  - `https://www.smartcabb.com/app/driver/login` (lien explicite)
  - et l'URL historique `https://www.smartcabb.com/driver/login`
- **Fin du blocage** : auparavant, si `currentScreen === 'driver-registration'` était mémorisé, l'effet `if (currentScreen.startsWith('driver-')) return;` conservait cet écran pour toujours. Désormais, au **premier passage** de l'effet (`bootCheckedRef`), un `/driver` sans `/signup` et sans chauffeur connecté bascule sur `driver-login`. Le garde `useRef` évite de casser le bouton « Déposer ma candidature » (qui, lui, doit ouvrir le formulaire dans la même session).
- Le bouton de candidature écrit `/app/driver/signup` dans l'historique : un rechargement de page rouvre bien l'inscription, et l'URL peut être partagée.
- Le formulaire reste accessible par les CTA « S'inscrire » du site (`/app/driver/signup`), inchangés.

### Impact produit / comportement visible
- Un chauffeur déjà inscrit trouve un accès direct à la connexion depuis la page « Devenir chauffeur » (deux liens) et peut utiliser `/driver` sans repasser par l'inscription.
- Un nouveau chauffeur garde le parcours d'inscription via les boutons « S'inscrire » ou « Déposer ma candidature ».

### Risques & rollback
- **Risque** : un chauffeur en cours d'inscription qui recharge `/driver` (sans `/signup`) revient à la connexion — mais l'URL est mise à jour au clic, donc le cas est couvert.
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `/driver` avec `currentScreen = 'driver-registration'` mémorisé → **Connexion chauffeur**
- [x] `/app/driver/login` avec le même stockage → **Connexion chauffeur**
- [x] `/app/driver/signup` → formulaire d'inscription (« Vos informations »)
- [x] Clic « Déposer ma candidature » → formulaire affiché et URL `/app/driver/signup`
- [x] `/drivers` : 6 liens chauffeur dont **2 vers `/app/driver/login`**

---

## 2026-11-26 (49) — Navigation : fin de l'ancien écran d'accueil, cadrage des écrans d'auth, connexion chauffeur simplifiée

- **Commit** : `c0c719a` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (navigation + UI)
- **Objectif** : trois corrections signalées en production :
  1. après déconnexion (et depuis les boutons « Commander » du site), le passager retombait sur l'ancien écran d'accueil turquoise au lieu de la nouvelle connexion ;
  2. le cadrage des écrans d'authentification chauffeur était cassé (carte coupée à droite) ;
  3. la connexion chauffeur demandait « téléphone ou email » et le lien vers le formulaire de candidature était peu visible.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `pages/PassengerApp.tsx` | Écran par défaut = `login` ; `landing` d'un visiteur non connecté → `login` ; largeur pleine pour les écrans d'auth |
| `pages/DriverApp.tsx` | Entrée par défaut = `driver-login` ; largeur pleine pour connexion / candidature |
| `components/AppRouter.tsx` | `/app`, `/app/landing` et `/app/*` → `/app/passenger` (l'ancien écran n'est plus servi) |
| `components/passenger/ProfileScreen.tsx` | Déconnexion → écran `login` |
| `components/passenger/SettingsScreen.tsx` | Déconnexion → écran `login` |
| `components/driver/DriverSettingsScreen.tsx` | Déconnexion → `driver-login` |
| `components/driver/DriverDashboardNew.tsx` | Déconnexion → `driver-login` |
| `components/driver/DriverLoginScreen.tsx` | Champ téléphone seul (`PhoneInput`), bouton « Déposer ma candidature » visible, retour au site |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

**Cause du cadrage cassé.** `DriverApp` enveloppait tous ses écrans dans `<div className="min-h-screen max-w-2xl mx-auto">` (672 px) et `PassengerApp` dans `max-w-2xl md:max-w-4xl` (672/896 px). Le kit d'authentification est conçu pour occuper la largeur (panneau de marque 46 % + carte 460 px + gouttière 64 px ≈ 1 050 px) : dans un conteneur de 672 px, la carte débordait et `overflow-hidden` de la coquille la coupait à droite. Les deux conteneurs passent maintenant en `max-w-none` **uniquement** pour les écrans d'authentification (`login`, `register`, `forgot-password`, `driver-login`, `driver-registration`) ; les autres écrans conservent leur largeur.

**Ancien écran d'accueil.** `LandingScreen` (fond turquoise/vert, boutons « S'inscrire » / « Connexion ») n'est plus atteignable :
- `PassengerApp` initialise sur `login` quand `currentScreen` est vide, et convertit `landing` en `login` si aucun passager n'est connecté ;
- les deux boutons de déconnexion passager pointent vers `login` ;
- `AppRouter` redirige `/app`, `/app/landing` et `/app/*` vers `/app/passenger`.

Ainsi, un clic sur « Commander une course / Commander maintenant » depuis le site (qui pointe vers `/app/passenger`, éventuellement avec `?screen=map`) affiche la connexion ; `sc_pending_screen` est conservé et la course reprend après connexion.

**Connexion chauffeur.** Le champ libre « téléphone ou email » est remplacé par `PhoneInput variant="auth"` (numéro congolais, compteur 0/10). L'encart « Pas encore chauffeur ? » devient un vrai bouton **« Déposer ma candidature »** qui ouvre `driver-registration`. Le retour quitte l'application vers le site public (`/`). `DriverApp` démarre désormais sur `driver-login` (au lieu de `driver-welcome`), et les deux déconnexions chauffeur y ramènent aussi.

### Impact produit / comportement visible
- Plus d'écran turquoise « Bienvenue ! » : déconnexion et liens « Commander » aboutissent sur la nouvelle connexion.
- Écrans chauffeur correctement centrés, carte entièrement visible sur ordinateur.
- Deux champs seulement côté chauffeur, et un accès évident au formulaire d'inscription.

### Risques & rollback
- **Risque** : `DriverWelcomeScreen` et `LandingScreen` ne sont plus affichés (fichiers conservés, aucune suppression). Si un parcours métier en dépendait encore, il faut rétablir la redirection.
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `/app` → `/app/passenger` → « Content de vous revoir » (login)
- [x] `/driver` (session vide) → « Connexion chauffeur », 2 champs (`+243…`, mot de passe), bouton « Déposer ma candidature »
- [x] Carte d'auth à 1 280 px : bord droit 1 113 px (plus de découpe), `scrollWidth = 1 280`
- [x] Candidature chauffeur : même cadrage, aucun débordement horizontal
- [ ] Déconnexion réelle passager/chauffeur sur appareil (nécessite un compte)

---

## 2026-11-26 (48) — Kit d'authentification étendu : mot de passe oublié, OTP et administration

- **Commit** : `c5b2458` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat (UI/UX) + fix
- **Objectif** : appliquer le kit `AuthKit` (créé à l'entrée 47) aux écrans restants — mot de passe oublié passager/chauffeur, page publique `/auth/forgot-password`, étape OTP par SMS, connexion administrateur (avec 2FA) et mot de passe oublié administrateur.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/auth/AuthKit.tsx` | Audience `admin` (accents marine/glacier) et variante de bouton `admin` (`#003D7A`) |
| `components/PhoneVerificationStep.tsx` | Refonte complète (icône, alerte, champ OTP 56 px, bouton du kit, renvoi) + prop `variant` |
| `components/ForgotPasswordScreen.tsx` | Refonte (passager / chauffeur / admin) ; CTA jaune pour les chauffeurs |
| `components/auth/ForgotPasswordPage.tsx` | Refonte de la route publique `/auth/forgot-password` |
| `components/admin/AdminLoginScreen.tsx` | Refonte de la connexion admin **et** de l'étape 2FA (thème marine) |
| `components/admin/AdminForgotPasswordScreen.tsx` | Refonte (email + écran de confirmation) |
| `components/passenger/RegisterScreen.tsx`, `components/driver/DriverRegistrationScreen.tsx` | Passage à `variant` pour l'étape OTP (suppression de `accentClass`) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

- **AuthKit** : `AuthAudience` accepte désormais `'admin'`. Le panneau de marque, l'eyebrow, le badge et le halo s'adaptent (accent glacier `#7CC4FF`, eyebrow marine). `AuthButton` gagne `variant="admin"` (fond `#003D7A`, hover `#00294F`).
- **PhoneVerificationStep** : même logique (envoi auto au montage, cooldown 60 s, 6 chiffres, `onVerified(token)`), nouvelle présentation. `accentClass` est remplacé par `variant: 'primary' | 'driver' | 'admin'` ; les deux appelants ont été mis à jour.
- **ForgotPasswordScreen** : logique intacte (détection téléphone/email, `check-phone-exists`, `sendOTPCode` puis écran OTP selon `userType`, `resetPassword` par email). Interface unifiée ; le bouton principal prend la couleur de l'espace (bleu / jaune / marine).
- **ForgotPasswordPage** : conserve la redirection `#access_token&type=recovery` vers `/auth/reset-password` et l'appel `supabase.auth.resetPasswordForEmail` (avec `redirectTo`).
- **AdminLoginScreen** : mêmes appels (`authService.signIn`, `fetchGlobalConfig`, `sendAdmin2FA`, `verifyAdmin2FA`, `completeAdminLogin`). Les deux écrans (mot de passe puis code email) sont rendus dans la coquille admin.
- **Correctif** : le bouton « Renvoyer le code » de la 2FA appelait `handleSend2FA` directement ; l'événement React était alors interprété comme le jeton (`token || accessToken`). Il est maintenant appelé via `() => handleSend2FA()`.
- Les `onKeyDown` « Entrée » redondants ont été retirés là où le formulaire gère déjà la soumission (admin, admin forgot).

### Impact produit / comportement visible
- Parcours de récupération et de vérification cohérents avec la connexion/inscription : même fond, même carte, logo en filigrane.
- Espace administrateur visuellement distinct (marine + glacier), sans introduire de nouvelle couleur hors charte.
- Champ OTP plus lisible (56 px, chiffres espacés), erreurs affichées dans une alerte dédiée.
- Aucun changement d'API ni de règle de sécurité (2FA serveur 12 h, OTP 6 chiffres, rate limits inchangés).

### Risques & rollback
- **Risque** : régression visuelle sur un écran non vérifié (ex. `ResetPasswordOTPScreen`, hors périmètre).
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `/admin` : CTA `rgb(0, 61, 122)`, champs 48 px, carte 26 px, filigrane présent, console sans erreur
- [x] `/admin/forgot-password` : formulaire + retour, CTA marine
- [x] Mot de passe oublié passager : CTA bleu, lien retour, encart SMS
- [x] Mot de passe oublié chauffeur : CTA `rgb(255, 204, 0)` (jaune), badge « CHAUFFEUR »
- [x] `/auth/forgot-password` : formulaire email, CTA bleu, console sans erreur
- [x] Étape OTP : champ `#otp-code` rendu à 56 px (test avec numéro invalide, aucun SMS réel envoyé)
- [ ] Vérification visuelle sur appareil réel (clavier numérique, safe-area)

---

## 2026-11-26 (47) — Refonte premium des écrans de connexion et d'inscription (passager & chauffeur)

- **Commit** : `ceee7c0` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat (UI/UX)
- **Objectif** : moderniser les 4 écrans d'entrée de l'application — connexion passager, inscription passager, connexion chauffeur, candidature chauffeur — en respectant la charte SmartCabb (bleu `#007AFF`, jaune `#FFCC00`, marine `#003D7A`) et en utilisant le logo en **filigrane**. Aucun changement de logique métier.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/auth/AuthKit.tsx` | **Nouveau** : coquille d'authentification (fond dégradé + halos + trame + filigrane logo), carte, en-têtes, champs, boutons, alertes, indicateur de mot de passe, case à cocher |
| `components/passenger/LoginScreen.tsx` | Nouvelle interface (panneau de marque + carte), mêmes handlers |
| `components/passenger/RegisterScreen.tsx` | Nouvelle interface, force du mot de passe, confirmation en direct, panneau légal |
| `components/driver/DriverLoginScreen.tsx` | Nouvelle interface « espace chauffeur » (CTA jaune), champ téléphone **ou** email |
| `components/driver/DriverRegistrationScreen.tsx` | Nouvelle interface en **2 étapes** (Identité → Véhicule), mêmes champs et mêmes appels |
| `components/PhoneInput.tsx` | Prop `variant="auth"` (champ premium) + compteur de chiffres hors préfixe `+243` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

**AuthKit** (`components/auth/AuthKit.tsx`)
- `AuthShell` : fond `linear-gradient(168deg, #000E1F → #001B3D → #00305E → #004A8F)`, deux halos radiaux (bleu / jaune), trame 64 px, logo en filigrane (`grayscale + invert`, opacité 4–9 %) en deux positions. Sur `lg` : panneau de marque à gauche (logo, accroche, 3 arguments) + carte à droite ; sur mobile : en-tête compact dans la carte.
- `AuthCard` : rayon 26 px, ombre profonde, liseré dégradé bleu→jaune.
- `AuthField`, `AuthInput`, `AuthPasswordInput` (œil), `AuthButton` (`primary` bleu / `driver` jaune), `AuthAlert`, `AuthFootnote`, `AuthTextLink`, `AuthBackButton`, `AuthCheckbox`, `PasswordStrength` (4 barres + libellé).
- Les boutons n'exposent pas la classe `min-height` globale mobile : `minHeight` est forcé en style inline là où 44 px casserait la mise en page (case à cocher, lien « mot de passe oublié », bouton œil, liens légaux).

**Écrans**
- Connexion passager : « Content de vous revoir », champ téléphone `variant="auth"`, mot de passe + lien de récupération sur la même ligne, bandeau « connexion sécurisée », lien d'inscription, retour à l'accueil masqué en APK (`hide-in-apk`).
- Inscription passager : nom / téléphone / mot de passe (+ jauge) / confirmation (+ message de correspondance), panneau des conditions avec `AuthCheckbox`, rappel OTP SMS, CTA désactivé tant que les conditions ne sont pas acceptées. L'étape OTP réutilise `PhoneVerificationStep` dans la même carte.
- Connexion chauffeur : accroche « Roulez avec SmartCabb. », arguments (courses proches, gains, support), CTA **jaune**, encart « Déposez votre candidature ».
- Candidature chauffeur : assistant en 2 étapes avec barre de progression ; l'étape 1 valide nom/téléphone/mot de passe/photo avant d'autoriser le passage ; l'étape 2 reprend véhicule, photos, documents physiques, adresse officielle, conditions et envoi. `handleSubmit` et `handleOtpVerified` sont inchangés.

**Corrections induites**
- Double soumission supprimée : les formulaires passent par `onSubmit` ; les `onKeyDown`/`onKeyPress` « Entrée » redondants ont été retirés (connexion passager et chauffeur).
- Compteur du champ téléphone : `0/10` au lieu de `3/10` (le préfixe `+243` n'est plus compté).

### Impact produit / comportement visible
- Identité visuelle cohérente sur les 4 écrans, logo en filigrane, hiérarchie typographique nette, champs plus lisibles, CTA jaune réservé aux chauffeurs.
- Inscription chauffeur guidée en 2 étapes : moins de champs visibles à la fois, validation immédiate des informations personnelles.
- Jauge de robustesse du mot de passe et contrôle de correspondance en temps réel côté inscription.
- Aucun changement d'API, de contrat de données ni de règle métier (OTP, validation admin, commissions inchangés).

### Risques & rollback
- **Risque** : régression purement visuelle sur d'autres écrans utilisant `PhoneInput` — le variant par défaut est conservé à l'identique.
- **Rollback** : `git revert <hash>` (les anciens écrans sont restaurés tels quels).

### Tests / vérifications
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] Connexion passager (mobile) : rendu, compteur `0/10`, œil, alerte, CTA
- [x] Inscription passager : jauge de mot de passe, correspondance, case à cocher 18×18, CTA activé après acceptation
- [x] Connexion chauffeur : CTA jaune, encart candidature
- [x] Candidature chauffeur : étape 1 → étape 2 (validation + photo), documents, conditions
- [x] Mise en page bureau (`lg`) vérifiée via un iframe 1280 px : panneau de marque + carte
- [ ] Test sur appareil réel Android (clavier, safe-area)

---

## 2026-11-25 (46) — Après réinitialisation du mot de passe : redirection vers la bonne page de connexion

- **Commit** : `a6148e2` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (authentification)
- **Objectif** : après un changement de mot de passe réussi, l'utilisateur était renvoyé vers `/login`, une route **inexistante** (page blanche). Il doit désormais atterrir sur **`/admin`** (écran de connexion administrateur) s'il est admin, sinon sur `/app`.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/auth/ResetPasswordPage.tsx` | Rôle lu avant déconnexion ; `signOut()` puis redirection `/admin` (admin) ou `/app` |
| `App.tsx` | Route `/login` → redirection vers `/app` (filet de sécurité pour les anciens liens) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- `ResetPasswordPage` : après `supabase.auth.updateUser({ password })`
  1. `getUser()` pour lire `user_metadata.role` / `app_metadata.role` ;
  2. `signOut()` — sans cela, `/admin` ouvrirait directement le tableau de bord avec la session héritée, au lieu de la page de connexion ;
  3. `window.location.href = isAdmin ? '/admin' : '/app'` après 2,5 s (rechargement complet, état propre).
- `App.tsx` : `<Route path="/login" element={<Navigate to="/app" replace />} />`. Les écrans `ForgotPasswordPage`, `ResetPasswordByPhonePage` et `CreateAuthFromProfilePage` utilisaient tous `/login` ; ils ne produisent plus de page blanche.
- `/admin/*` reste géré par `pages/AdminApp.tsx` : tout écran inconnu ou non authentifié retombe sur `admin-login`.

### Impact produit / comportement visible
- Admin : « Mot de passe réinitialisé » → redirection automatique vers l'écran de connexion admin, session précédente fermée.
- Passager / chauffeur : redirection vers `/app`.
- Anciens liens `/login` : plus de page blanche, redirection vers l'application.

### Risques & rollback
- **Risque** : l'utilisateur doit se reconnecter avec le nouveau mot de passe (comportement voulu).
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `/admin` sans session → écran de connexion administrateur (vérifié dans le navigateur)
- [x] `/login` → redirection vers `/app` (plus de page blanche)

---

## 2026-11-25 (45) — Lien « Réinitialiser le mot de passe » : fin de la redirection vers Figma

- **Commit** : `c9e9e63` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (authentification)
- **Objectif** : le lien reçu par email (Supabase Auth, type `recovery`) renvoyait vers `https://chief-mess-97839970.figma.site` au lieu de SmartCabb. Cause : la **Site URL** du projet Supabase pointait encore sur une maquette Figma et la liste des URLs de redirection autorisées ne contenait que `smartcabb.com` **sans `www`**, alors que l'application tourne sur `https://www.smartcabb.com`. Supabase remplaçait donc le `redirect_to` demandé par la Site URL.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/auth/ResetPasswordPage.tsx` | Détection robuste de la session de récupération (hash, session déjà établie, événement `PASSWORD_RECOVERY`, erreur explicite du lien) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Configuration Supabase (management API, hors dépôt)

```json
{
  "site_url": "https://www.smartcabb.com",
  "uri_allow_list": "https://smartcabb.com,https://smartcabb.com/**,https://www.smartcabb.com,https://www.smartcabb.com/**,http://localhost:5173/**,http://localhost:3000/**,http://localhost:4173/**,capacitor://localhost,ionic://localhost"
}
```

Avant : `site_url = https://chief-mess-97839970.figma.site`, `uri_allow_list = https://smartcabb.com,https://smartcabb.com/**,https://smartcabb.com/auth/reset-password`.

### Description technique
- `redirectTo` envoyé par `lib/auth-service.ts` : `${window.location.origin}/auth/reset-password` → désormais accepté (www et apex).
- `ResetPasswordPage` :
  1. affiche un message clair si le hash contient `error_code=otp_expired` (lien déjà utilisé/expiré) ;
  2. établit la session depuis `access_token`/`refresh_token` du hash (`setSession`) ;
  3. sinon écoute `onAuthStateChange` (`PASSWORD_RECOVERY`, `SIGNED_IN`) — nécessaire car `detectSessionInUrl` de supabase-js consomme le hash avant le rendu du composant ;
  4. sinon retombe sur `getSession()` (immédiat puis après 1,5 s) avant d'afficher « lien invalide ».
- Aucun changement du flux d'envoi : `POST /auth/v1/recover` reste appelé par `resetPassword()`.

### Impact produit / comportement visible
- Le lien de l'email ouvre bien `https://www.smartcabb.com/auth/reset-password` avec le formulaire actif.
- Une URL de redirection inconnue retombe sur la page d'accueil SmartCabb (plus jamais sur Figma).
- Les liens expirés affichent un message explicite au lieu d'un formulaire bloqué.

### Risques & rollback
- **Risque** : la Site URL sert aussi de base aux autres emails Auth (confirmation, magic link) → ils pointent désormais vers SmartCabb, ce qui est le comportement attendu.
- **Rollback** : reconfigurer `site_url`/`uri_allow_list` via l'API de management ; `git revert <hash>` pour le composant.

### Tests / vérifications
- [x] Sonde `GET /auth/v1/verify` avec `redirect_to=https://www.smartcabb.com/auth/reset-password` → `303` vers la page SmartCabb (avant : Figma)
- [x] Même test sur l'apex `https://smartcabb.com/auth/reset-password` → OK
- [x] `redirect_to=https://evil.example/x` → retombe sur `https://www.smartcabb.com` (pas de redirection ouverte)
- [x] `npx tsc --noEmit`
- [x] Parcours réel sur lien généré (`admin/generate_link`) : redirection vers `https://www.smartcabb.com/auth/reset-password`, session établie, formulaire actif, aucun message d'erreur
- [x] Lien expiré (`error_code=otp_expired`) : message « Lien de réinitialisation refusé… » + champs désactivés + lien « Demander un nouveau lien »

---

## 2026-11-25 (44) — Correctif déploiement Vercel : `vercel.json` corrompu par un BOM UTF-8

- **Commit** : `<hash>` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (déploiement)
- **Objectif** : tous les déploiements Vercel depuis `55bf7c7` échouaient avec `Error: Couldn't parse JSON file vercel.json`. La production restait figée sur le build de `daf463f` (21 h). Cause : `vercel.json` avait été réécrit via `Set-Content -Encoding UTF8` (Windows PowerShell 5.1) qui ajoute un **BOM** (`EF BB BF`) ; le parseur JSON de Vercel refuse un fichier commençant par un BOM, alors que `ConvertFrom-Json` de PowerShell le tolère — d'où l'absence de détection locale.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `vercel.json` | BOM retiré (premiers octets `EF BB BF` → `7B`) ; contenu et CSP inchangés |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée + BOM retiré |

### Description technique
- Réécriture du fichier en **UTF-8 sans BOM** (`UTF8Encoding($false)`), puis validation stricte :
  `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` → OK.
- Contrôle de tous les fichiers suivis (`.json`, `.ts`, `.tsx`, `.js`, `.html`, `.css`, `.md`) : aucun autre BOM.
- `npm run build` local : succès (13,93 s), donc l'échec venait bien du chargement de la configuration Vercel et non du build.

### Impact produit / comportement visible
- Les déploiements repassent au vert et la production reçoit enfin les changements des commits `24c0051` → `609206d` (dépendances, CSP sans `cdn.jsdelivr.net`, docs).
- Aucune modification fonctionnelle : la CSP et les en-têtes de sécurité restent identiques.

### Risques & rollback
- **Risque** : nul côté runtime (fichier de configuration uniquement).
- **Rollback** : `git revert <hash>` — mais réintroduirait le BOM et rebloquerait les déploiements ; à éviter.

### Tests / vérifications
- [x] `node -e "JSON.parse(...)"` sur `vercel.json` → OK
- [x] `npx tsc --noEmit` (hors `_headers/Code-component-*.tsx`)
- [x] `npm run build` → succès
- [ ] Déploiement Vercel de production vert (à confirmer après le push)

---

## 2026-11-25 (43) — Suppression du compte administrateur obsolète `hmapela8@gmail.com`

- **Commit** : `04407bc` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security (opération base de données)
- **Objectif** : réduire la surface d'attaque du panneau d'administration. Un second compte `admin` (`hmapela8@gmail.com`, créé le 09/10/2026, dernière connexion le 23/10/2026) restait actif sans usage. `admin@smartcabb.com`, demandé par l'exploitant, **n'existait pas** dans `auth.users` (c'est uniquement l'adresse de contact publique).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée (aucun fichier de code modifié) |

### Description technique

Opération exécutée sur la base de production (`zaerjqchzqmcxqblkfkg`), en transaction :

```sql
begin;
delete from public.kv_store_2eb02e52
 where key in ('admin:54937b5e-…', 'profile:54937b5e-…');
delete from auth.identities where user_id = '54937b5e-367e-4a65-8911-1f30966b3371';
delete from auth.users
 where id = '54937b5e-367e-4a65-8911-1f30966b3371'
   and email = 'hmapela8@gmail.com';
commit;
```

- Contrôle d'impact préalable : **0 ligne** dans `profiles`, `rides` (passager et chauffeur), `scheduled_rides`, `transactions`, `notifications`, `push_subscriptions`, `emergency_alerts`, `vehicles` et `ride_requests` pour cet identifiant.
- Aucune contrainte `FOREIGN KEY` ne pointe vers `auth.users` dans ce schéma : le nettoyage des deux clés KV a donc été fait explicitement.
- Les sessions/refresh tokens Supabase liés au compte sont invalidés par la suppression de `auth.users`.

### Impact produit / comportement visible
- `hmapela8@gmail.com` ne peut plus se connecter ni accéder au panneau admin.
- **Un seul administrateur reste actif** : `georgeorlyissa@gmail.com`.
- Aucune donnée métier (courses, réservations, paiements, profils) n'a été supprimée.

### Risques & rollback
- **Risque** : perte d'accès admin si l'unique compte restant est bloqué → utiliser `POST /admin/reset-admin-account` avec `ADMIN_RESET_PASSWORD`.
- **Rollback** : recréer le compte via Supabase Dashboard → Authentication → Add user, puis passer `user_metadata.role = 'admin'`. Les éventuelles données métier devraient être restaurées depuis une sauvegarde (aucune n'était concernée).

### Tests / vérifications
- [x] Comptage d'impact avant suppression : 0 ligne sur 12 tables
- [x] `auth.users` : `hmapela8@gmail.com` absent, `georgeorlyissa@gmail.com` présent
- [x] `select count(*) ... where raw_user_meta_data->>'role' = 'admin'` → **1**
- [x] `kv_store_2eb02e52` : 0 clé restante pour cet identifiant
- [x] `npx tsc --noEmit` (aucun code modifié)

---

## 2026-11-25 (42) — Release Android 1.8 (versionCode 11) — correctif natif Capacitor

- **Commit** : `0de41d9` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : chore + security (release)
- **Objectif** : reconstruire et signer l'AAB avec **Capacitor Android 8.6.2**, qui corrige la vulnérabilité native critique « remote content loaded at the app origin via the internal HTTP proxy path ». L'AAB 1.7 publiée embarque encore la bibliothèque vulnérable.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `android/app/build.gradle` | `versionCode` 10 → **11**, `versionName` 1.7 → **1.8** |
| `android/` (assets générés) | `npx cap sync android` : assets web + `capacitor.config.json` + plugins à jour (non suivis par git) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Build

```bash
npx cap sync android
cd android
./gradlew.bat bundleRelease
```

- **Artefact** : `android/app/build/outputs/bundle/release/app-release.aab`
- **Taille** : 13,58 MB
- **SHA-256** : `8F099D45A71727EBC023DE45408CD242EA051BF8D4393675AE39D7124C3F2D4D`
- **Signature** : `android/keystore.properties` (hors dépôt), `signReleaseBundle` OK.

### Impact produit
- Aucun changement fonctionnel côté web : l'app charge toujours `https://www.smartcabb.com/app/passenger?platform=apk`.
- Le correctif est **natif** : contenu distant confiné correctement, conformément au correctif Capacitor.
- Les correctifs de sécurité backend/web (entrées 39 à 41) sont déjà actifs sans AAB.

### Risques & rollback
- **Risque** : régression native (push, GPS, TTS) après montée Capacitor. À valider sur appareil réel via le canal Internal testing avant promotion.
- **Rollback** : revenir à l'AAB 1.7 sur le canal de test ; Play Console n'autorise pas un `versionCode` inférieur, il faudrait publier un `versionCode` supérieur.

### Tests / vérifications
- [x] `npx cap sync android` — 5 plugins détectés, sync OK
- [x] `./gradlew.bat bundleRelease` — **BUILD SUCCESSFUL**
- [x] AAB signé généré (13,58 MB)
- [ ] Installation depuis Internal testing sur appareil réel
- [ ] Push notification (web + natif), GPS, TTS, ouverture app
- [ ] Promotion Production + vérification Play Console (trader status / DSA)

---

## 2026-11-25 (41) — Sécurité P1/P2 : SMS/SOS/OTP, CORS, RLS et dépendances

- **Commit** : `24c0051` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security + fix + docs
- **Objectif** : fermer les abus restants (SMS, SOS, OTP, paiements), verrouiller la base contre la lecture publique de données personnelles/secrets, restreindre le CORS, durcir les erreurs et réduire les vulnérabilités de dépendances.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/lib/rate-limit.ts` | Nouveau quota distribué `consumeRateLimit()` (KV) réutilisable par route |
| `supabase/functions/make-server-2eb02e52/sms-routes.ts` | `/sms/send` : session obligatoire, destinataire = numéro du compte, quotas 20/jour/utilisateur et 8/jour/destinataire |
| `supabase/functions/make-server-2eb02e52/otp-routes.ts` | Quotas KV : 5/h et 10/jour par numéro, 20/h par IP |
| `supabase/functions/make-server-2eb02e52/emergency-routes.ts` | SOS : session réelle obligatoire, identité JWT, quotas KV 3/10 min/utilisateur et 10/10 min/IP |
| `supabase/functions/make-server-2eb02e52/ejpay-routes.ts` | `/collect` et `/status/:orderId` : session + propriétaire de la commande (ou admin) |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Quota 10 créations / 15 min / passager ; logs sans payload complet |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | Logs de mise à jour sans données sensibles |
| `supabase/functions/make-server-2eb02e52/index.ts` | CORS restreint aux origines SmartCabb, erreurs génériques avec `requestId` |
| `vercel.json` | `cdn.jsdelivr.net` retiré de la CSP |
| `package.json` / `package-lock.json` | `npm audit fix` + Firebase 13.x (0 critique) |
| `docs/SECURITY.md` | **Nouveau** : modèle de sécurité, contrôles, risques résiduels, procédures |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Modifications en base (RLS)

| Table | Avant | Après |
|---|---|---|
| `profiles` | lecture publique (`true`) — emails/téléphones exposés | son profil ou admin |
| `settings`, `settings_2eb02e52` | lecture publique (colonnes `sms_api_key`, `twilio_auth_token`) | admin uniquement |
| `sms_logs`, `sms_logs_2eb02e52` | `ALL` public | admin uniquement |
| `transactions` | `ALL` public | propriétaire ; admin en lecture |
| `vehicles` | `ALL` public | aucune policy (service role uniquement) |
| `kv_store_2eb02e52` | RLS + 0 policy | inchangé (refus par défaut) |

`apk` reste public (aucun secret) ; `avatars` et `backups` sont privés (URLs signées).

### Description technique

1. **SMS** : la clé anon ne peut plus envoyer de SMS. L'utilisateur ne peut écrire qu'à son propre numéro (déduit du JWT), avec double quota KV. Les SMS de bienvenue/recharge/profil continuent de fonctionner car ils sont auto-adressés.
2. **OTP** : les limiteurs en mémoire sont complétés par des quotas KV qui survivent aux redémarrages d'instance.
3. **SOS** : plus d'alerte anonyme ni d'`userId` fourni dans le corps ; l'identité et le rôle viennent de la session.
4. **Ejpay** : impossible de créer un paiement pour un autre compte ou de consulter le statut d'une transaction qui n'est pas la sienne.
5. **CORS** : seules `smartcabb.com`, `*.cd`, localhost de dev, `capacitor://localhost` et les previews Vercel reçoivent `Access-Control-Allow-Origin`. Vérifié : `evil.example` ne reçoit aucun en-tête.
6. **Erreurs** : le handler global renvoie « Erreur interne du serveur » + `requestId` (détail uniquement dans les logs).
7. **RLS** : les policies `USING (true)` sur les profils, paramètres, journaux SMS, transactions et véhicules ont été supprimées/remplacées. Vérifié avec la clé anon : `[]` sur toutes ces tables.
8. **Dépendances** : `npm audit fix` + Firebase 13.4 → 0 critique ; restent 4 alertes « high » transitives `@grpc/grpc-js` (Node/build, pas le bundle navigateur).
9. **CSP** : plus aucun CDN tiers pour les scripts/styles/polices.

### Impact produit / comportement visible
- Aucun changement pour l'utilisateur normal : les SMS auto-adressés et les SOS connectés fonctionnent comme avant.
- Les écrans admin qui lisent directement `settings_2eb02e52` / `sms_logs` / `profiles` nécessitent une session admin (JWT rôle admin) — déjà le cas après connexion.
- Une requête anonyme ne peut plus lire l'annuaire des utilisateurs ni les secrets de paramètres.

### Risques & rollback
- **Risque** : un client très ancien qui envoie un SMS à un tiers via l'API sera refusé (attendu).
- **Risque** : Firebase 13 doit être validé sur appareil réel (push web/natif).
- **Rollback code** : `git revert 24c0051` + redéploiement Edge Function + Vercel.
- **Rollback RLS** : recréer les anciennes policies n'est **pas recommandé** (fuite de données). En cas de blocage admin, utiliser le JWT admin ou le service role.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors `_headers/Code-component-*.tsx`)
- [x] `npm run build`
- [x] Edge Function déployée
- [x] `POST /sms/send` avec clé anon → **401**
- [x] `POST /emergency/sos` avec clé anon → **401**
- [x] `GET /ejpay/status/:id` avec clé anon → **401**
- [x] `POST /otp/send` avec numéro invalide → **400** (puis quotas sur numéros valides)
- [x] CORS : `Origin: https://evil.example` → aucun `Access-Control-Allow-Origin` ; `https://www.smartcabb.com` → autorisé
- [x] REST anon : `profiles`, `settings_2eb02e52`, `transactions`, `sms_logs_2eb02e52`, `kv_store_2eb02e52`, `vehicles` → **`[]`**
- [x] `npm audit` : 0 critique (contre 3 avant)
- [ ] Test réel : SMS auto-adressé, SOS connecté, paiement Ejpay, push Firebase 13

---

## 2026-11-25 (40) — Sécurité P0 : authentification des routes admin, argent et comptes

- **Commit** : `c401d2d` + `d06defa` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security + fix
- **Objectif** : fermer les accès non authentifiés aux fonctions d'administration, aux opérations d'argent, à la suppression de comptes et aux données personnelles, et supprimer le mot de passe admin en dur.

### Diagnostic (avant correctif)

| Faille | Impact |
|---|---|
| 39 routes `/admin/*` sur 40 sans contrôle | Prise de contrôle totale : lecture de tous les utilisateurs, suppression de masse, validation/rejet de chauffeurs, réglages financiers |
| Mot de passe admin `SmartCabb2024!` en dur + renvoyé par `/admin/reset-admin-account` | Accès admin permanent pour quiconque lit le dépôt |
| `/config/update` ouvert | Modification du taux de change, des commissions, de la maintenance |
| `POST /drivers/:id/balance` ouvert | Création illimitée de solde chauffeur |
| `POST /passengers/:id/wallet/debit` ouvert | Vidage du portefeuille d'un passager |
| `/purge/purge-user-by-email`, `/fix-emails/fix-all` ouverts | Suppression / recréation de n'importe quel compte |
| `GET /rides/pending/:driverId`, `GET /drivers` ouverts | Fuite de noms, téléphones, soldes, tokens FCM |
| 2FA admin non vérifiée côté serveur | 2FA contournable avec le seul mot de passe |

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/auth-guard.ts` | **Nouveau** : `requireUser`, `requireAdmin` (rôle + session 2FA serveur), `requireOwnerOrAdmin`, `optionalUser`, sessions 2FA 12 h, cache court des JWT |
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | Middleware admin global (allowlist 2FA/reset), session 2FA serveur, mot de passe en dur supprimé, plus d'identifiants dans la réponse |
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | `POST /config/update` réservé aux admins |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | Soldes, retraits, mise à jour, statut, position, listes et maintenance protégés ; fiche publique assainie |
| `supabase/functions/make-server-2eb02e52/passenger-routes.ts` | Profil, soldes, favoris, débit et liste protégés ; champs sensibles non modifiables par le client |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Création, acceptation, refus, arrivée, démarrage, annulation, clôture, notation, historique, gains, transferts et outils admin protégés ; fin de la création de course fantôme à la clôture |
| `supabase/functions/make-server-2eb02e52/purge-user-route.ts`, `fix-emails-routes.ts` | Admin uniquement |
| `lib/api-auth-interceptor.ts` | **Nouveau** : chaque appel API porte le JWT Supabase de la session + `x-admin-2fa` pour `/admin/*` |
| `main.tsx` | Installation de l'intercepteur au démarrage |
| `.gitignore` | `.env` ignoré |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

1. **`auth-guard.ts`** : la clé `anon` est explicitement refusée pour les routes sensibles (`AUTH_REQUIRED`). `requireAdmin` exige un JWT Supabase valide, `role=admin`, **et** un jeton de session 2FA serveur (`x-admin-2fa`) valide 12 h, stocké dans `admin_2fa_session:<userId>`. Lecture de config en fail-closed (2FA exigée si la config est illisible).
2. **Middleware admin** : toutes les routes `/admin/*` passent par `requireAdmin`, sauf `/admin/2fa/send`, `/admin/2fa/verify` (connexion) et `/admin/reset-admin-account` (secret propriétaire).
3. **2FA** : `/admin/2fa/verify` crée désormais une session serveur et renvoie son jeton ; l'ancien jeton OTP à usage unique n'autorise plus rien.
4. **Argent** : `POST /drivers/:id/balance` réservé aux admins ; débit passager et retrait chauffeur réservés au propriétaire/admin ; clôture d'une course impossible si elle n'existe pas (fin de la création de course fantôme).
5. **Comptes** : purge par email et `fix-all` admin-only ; suppression par téléphone déjà protégée par OTP (entrée 39).
6. **PII** : `GET /drivers/:id` renvoie un profil minimal au public (nom, photo, véhicule, note) ; le téléphone n'est inclus qu'en cas de course active avec ce chauffeur ; soldes/emails/tokens réservés au propriétaire et aux admins. `GET /drivers`, `/drivers/pending`, `/rides/pending/:driverId`, historiques et gains sont protégés. Le lien public de suivi (`GET /rides/:id`) ne renvoie que trajet/statut/position ; `GET /rides/status/:id` exige un participant ou un admin.
7. **Client** : intercepteur global qui remplace `Authorization: Bearer <anon>` par le JWT de session et ajoute `x-admin-2fa` sur les routes admin. Les visiteurs non connectés conservent la clé anon (routes publiques uniquement).
8. **Mot de passe admin** : plus aucune valeur en dur. `/admin/reset-admin-account` exige le secret `ADMIN_RESET_PASSWORD` (≥ 12 caractères) et ne renvoie plus d'identifiants.

### Impact produit / comportement visible
- Les routes publiques (config, carte, profil public minimal, suivi de course par lien) continuent de fonctionner.
- Toute action sensible exige une session réelle : plus de création de solde, de débit, de suppression de compte ou de réglage financier anonyme.
- **Panneau admin** : une reconnexion est nécessaire après ce déploiement (nouvelle session 2FA serveur). Les sessions admin antérieures sont refusées (`ADMIN_2FA_REQUIRED`).

### Actions opérateur (importantes)
1. **Changer le mot de passe admin** (il était dans le dépôt) : Supabase Dashboard → Authentication → utilisateur admin → *Reset password*.
2. Optionnel : définir le secret `ADMIN_RESET_PASSWORD` pour pouvoir utiliser la route de réinitialisation d'urgence.
3. Se reconnecter au panneau admin (mot de passe + code 2FA) pour créer la nouvelle session.

### Risques & rollback
- **Risque** : une session expirée/non 2FA renvoie 401 sur les écrans admin ; une course créée par un client très ancien sans session est refusée.
- **Rollback** : `git revert d06defa c401d2d` + redéploiement Edge Function + Vercel.
- **Aucune migration de données** : uniquement des contrôles d'accès.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors `_headers/Code-component-*.tsx`)
- [x] `npm run build`
- [x] Edge Function déployée
- [x] `GET /admin/stats` avec clé anon → **401** `AUTH_REQUIRED`
- [x] `POST /config/update` avec clé anon → **401**
- [x] `POST /drivers/:id/balance` avec clé anon → **401**
- [x] `POST /passengers/:id/wallet/debit` avec clé anon → **401**
- [x] `POST /purge/purge-user-by-email` et `POST /fix-emails/fix-all` avec clé anon → **401**
- [x] `GET /rides/pending/:driverId` avec clé anon → **401**
- [x] `GET /drivers`, `/drivers/pending`, `/drivers/location/:id` avec clé anon → **401**
- [x] `POST /rides/create` avec clé anon → **401**
- [x] `GET /config/get` public → **200**
- [x] `GET /drivers/:id` public → **200** sans solde/email/téléphone/token
- [x] `GET /rides/:id` public (lien de suivi) → **200** avec trajet/statut uniquement, sans téléphone ni paiement
- [x] `GET /rides/status/:id` avec clé anon → **401**
- [x] `/admin/2fa/send` reste joignable (réponse « Session invalide » avec un faux jeton)
- [ ] Reconnexion admin réelle + parcours complet du panneau (à faire après rotation du mot de passe)

---

## 2026-11-25 (39) — Inscription passager : OTP SMS obligatoire avant confirmation du numéro

- **Commit** : `f1f8f44` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat + security
- **Objectif** : à l'inscription d'un client passager, un code OTP doit **toujours** être envoyé par SMS et vérifié avant que le numéro soit considéré comme confirmé (et avant la création du compte). Le contournement « OTP désactivé en config » est supprimé.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/auth-routes.ts` | `/signup` exige un jeton OTP valide pour tout compte **passager** ; profil enrichi `phoneVerified` / `phoneVerifiedAt` ; `/delete-user-by-phone` protégé par un jeton OTP |
| `supabase/functions/make-server-2eb02e52/otp-core.ts` | Nouvelle fonction `peekOTPToken()` (valide sans consommer le jeton) |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | `/drivers/delete-user-by-phone` protégé par un jeton OTP |
| `components/passenger/RegisterScreen.tsx` | Suppression du contournement `otpRequired` : l'écran OTP s'affiche systématiquement ; suppression du nettoyage préalable redondant |
| `components/PhoneVerificationStep.tsx` | Texte « envoyé par SMS » (plus de mention WhatsApp), canal unique EJ SMS |
| `components/driver/DriverRegistrationScreen.tsx` | Nettoyage préalable redondant supprimé |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

1. **Backend** : dans `/auth/signup`, `otpMandatory = (role || "passenger") === "passenger"`. Si un numéro est fourni pour un passager, `verifyOTPToken(phone, "registration", body.otpToken)` est **toujours** exécuté. Sans jeton valide → `400 { error, code: "OTP_REQUIRED" }`, aucune création de compte.
2. **Jeton** : émis par `/otp/verify` après saisie du code, lié au numéro + `purpose = registration`, valable 10 minutes, **usage unique** (consommé par `/signup`).
3. **Profil** : `phoneVerified = true` et `phoneVerifiedAt` sont enregistrés dans `profile:<id>`, `passenger:<id>` et `user_metadata.phone_verified`.
4. **SMS** : envoi via EJ SMS (EJSARL) uniquement (`sendOTPViaSMS`), cooldown 60 s, 5 tentatives max, code à 6 chiffres valable 10 min.
5. **Sécurité** : les endpoints `delete-user-by-phone` (auth + drivers) ne suppriment plus un compte sur simple numéro : ils exigent un jeton OTP « registration » encore valide (`peekOTPToken`, non consommé). Le nettoyage préalable côté client a été supprimé car `/signup` et `/drivers/signup` gèrent déjà un ancien compte.
6. **Conducteurs** : comportement inchangé (OTP piloté par `otpRequired`), pour ne pas bloquer les clients conducteurs déjà déployés.

### Impact produit / comportement visible
- Le passager remplit le formulaire → reçoit un **SMS** avec un code à 6 chiffres → saisit le code → le compte est créé et le numéro est marqué vérifié.
- Impossible de créer un compte passager sans prouver la possession du numéro, même si `otpRequired = false` dans la config admin.
- Les anciennes versions en cache qui n'envoient pas `otpToken` reçoivent « Vérification du numéro requise (code OTP) » ; un simple rechargement de l'app charge le nouveau parcours.

### Risques & rollback
- **Risque** : dépendance au crédit EJ SMS. Si le fournisseur tombe, aucune inscription passager n'aboutit (message d'erreur explicite).
- **Rollback** : `git revert f1f8f44` + redéploiement Edge Function + Vercel.
- **Aucune migration** : uniquement des champs de profil supplémentaires.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors `_headers/Code-component-*.tsx`)
- [x] `npm run build`
- [x] Edge Function déployée
- [x] `POST /auth/signup` (rôle passager, sans `otpToken`) → **400** `{"code":"OTP_REQUIRED","error":"Vérification du numéro requise (code OTP)."}` (aucun compte créé)
- [x] `POST /otp/send` avec numéro invalide → **400** « Numéro de téléphone invalide »
- [ ] Test réel avec un numéro de téléphone valide (réception SMS + inscription) — à faire avec accord

---

## 2026-11-24 (38) — Commission différenciée : 20 % réservation / 15 % course instantanée

- **Commit** : `0f2c0bf` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : appliquer **20 % de commission sur les réservations** et **15 % sur les courses instantanées**, partout (déduction réelle du solde, gains chauffeur, historique, rapports admin), et rendre les deux taux modifiables sans redéploiement.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `getCommissionSettings()` renvoie `rate` (15) + `reservationRate` (20) ; helpers `isReservationRide()` / `commissionRateForRide()` ; application du bon taux à l'acceptation (provision), à la clôture (`/complete`, `/:id/complete`), à l'auto-clôture anti-fraude et aux stats de gains |
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | Config par défaut (`commissionRate: 15`, `reservationCommissionRate: 20`), sauvegarde des deux taux, rapports financiers calculés **course par course** |
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | Valeurs par défaut + fusion sécurisée de `reservationCommissionRate` |
| `lib/pricing.ts` | `getReservationCommissionRate()`, `getCommissionRateForRide(isReservation)`, `isReservationRide()` ; défaut course instantanée ramené à 15 % |
| `components/driver/NavigationScreen.tsx` | Aperçu gains/commission avec le bon taux (20 % réservation), base = prix total |
| `components/driver/DriverDashboardNew.tsx` | Historique des courses : gains nets recalculés avec le taux adapté |
| `components/passenger/PaymentScreen.tsx` | `driverEarnings` transmis avec le taux adapté |
| `components/admin/SettingsScreen.tsx`, `components/admin/GlobalSettingsScreen.tsx`, `components/CommissionSettings.tsx` | Deux champs : commission course instantanée / réservation |
| `components/admin/FinancialReportsScreen.tsx` | Rapports et CSV : affichage des deux taux |
| `lib/config-sync.ts`, `hooks/useAdminConfig.ts`, `hooks/useSettings.ts`, `types/index.ts` | Types + valeurs par défaut (15 / 20) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

1. **Configuration** : `smartcabb_global_config` contient désormais `commissionRate = 15` (course instantanée) et `reservationCommissionRate = 20` (réservation). Défauts alignés dans tous les fichiers (`15` / `20`), bornés et fusionnés sans jamais réécrire la config si la base est illisible.
2. **Détection d'une réservation** : `isReservationRide()` → `isScheduled`, `scheduledRideId`, `reservationId`, `scheduledTotalPrice > 0` ou `serviceType = reservation`. Les courses créées par `/process-scheduled` et par la validation admin d'une réservation portent ces champs.
3. **Calcul** : `commissionRateForRide(cs, ride)` retourne 20 % pour une réservation, 15 % sinon. Appliqué à :
   - la **provision** prélevée à l'acceptation (`estimatedPrice`, soit le reste à payer) ;
   - la **clôture** (`/complete` et `/:id/complete`) sur la base du prix total (acompte inclus) ;
   - l'**auto-clôture anti-fraude** (`/sweep-fraud`) ;
   - les **statistiques** `/driver/:id/earnings` et `/driver/:id/rides` (somme des nets course par course) ;
   - les **rapports admin** `/admin/reports/generate` et `/admin/reports/summary`.
4. **Correction associée** : `/:id/complete` déduit maintenant la provision déjà prélevée (`commission - commissionHold`) comme `/complete`, au lieu de refacturer la commission entière.
5. **Notification chauffeur** : le payload `new_ride_request` transporte `isScheduled`, `scheduledTotalPrice` et `scheduledDepositPaid` pour que l'aperçu des gains soit juste avant l'ouverture de la navigation.
6. **Config live** : `commissionRate` passé de 20 à **15**, ajout de `reservationCommissionRate = 20`, `configVersion = 5` (taux de change inchangé à 2 250).

### Impact produit / comportement visible
- Une course instantanée est commissionnée à **15 %** ; une réservation (course programmée, transfert aéroport, location à la journée réservée) à **20 %**.
- Le chauffeur voit le bon taux et le bon gain net avant et après la course.
- Les gains chauffeur et les rapports admin reflètent la somme réelle des commissions, plus un taux unique.

### Risques & rollback
- **Risque** : une course ancienne sans marqueur de réservation est commissionnée à 15 % (comportement par défaut).
- **Réglage sans redéploiement** : `commissionRate` et `reservationCommissionRate` dans `smartcabb_global_config` (ou écrans admin → Paramètres / Commission).
- **Rollback** : `git revert 0f2c0bf` + redéploiement Edge Function ; remettre `commissionRate = 20` et supprimer `reservationCommissionRate` si retour à l'ancien régime.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors `_headers/Code-component-*.tsx`)
- [x] `npm run build`
- [x] Edge Function déployée
- [x] `GET /config/get` → `commissionRate=15`, `reservationCommissionRate=20`, `configVersion=5`, `exchangeRate=2250`
- [x] `GET /rides/driver/<Ruth>/earnings?period=week` → commission 45 675 CDF sur 259 500 CDF (6 courses), soit 6 750 CDF de plus qu'un taux unique de 15 % = 5 % supplémentaires sur la réservation de 135 000 CDF ✔️
- [x] `GET /rides/driver/<Ruth>/rides` → stats cohérentes (net 213 825 CDF)

---

## 2026-11-24 (37) — Matching limité aux chauffeurs proches (5 km) + nouvelle adresse et SEO local

- **Commit** : `1920d50` + `c03c509` + `59dd436` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat + fix + docs
- **Objectif** : une course ne doit être proposée **qu'aux chauffeurs de la même catégorie réellement proches du point de départ** (une demande à Gombe ne doit jamais apparaître chez un chauffeur resté à Ngaba, Matete ou Ndjili) ; appliquer partout la nouvelle adresse officielle **« 63, Avenue Colonel MONDJIBA, C/NGALIEMA - KINSHASA, RDC »** et renforcer le référencement Google (NAP, données structurées, sitemap).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Matching géographique strict + catégorie stricte ; helpers rayon/fraîcheur GPS ; `/pending/:driverId` revalide la proximité ; `/check-drivers-availability`, `/check-availability/:id` et `/accept` filtrent par rayon ; `/debug-drivers` expose distance/rayon |
| `components/passenger/SearchingDriversScreen.tsx` | Message dédié « aucun chauffeur à proximité » (avec rayon) ; prise en compte des motifs `no_driver_nearby` / `missing_pickup_coordinates` |
| `components/passenger/DriverAvailabilityCheck.tsx` | Bloc « Aucun conducteur à proximité » ; normalisation `alternatives` (`count` → `driversCount`) et `categoryName` (libellé vide corrigé) |
| `pages/LegalPage.tsx` | Siège social FR/EN : nouvelle adresse + téléphone réel `+243 960 624 008` |
| `pages/ContactPage.tsx` | Adresse affichée : 63, Avenue Colonel MONDJIBA, C/ Ngaliema |
| `components/shared/PrivacyPolicy.tsx` | Adresse du siège social mise à jour |
| `components/shared/TermsOfService.tsx` | Adresse de contact complète |
| `components/driver/DriverRegistrationScreen.tsx` | Adresse du bureau d'inscription conducteur |
| `components/ProfessionalFooter.tsx` | Bloc NAP (SmartCabb SARL, adresse, téléphone, lien Google Play) |
| `components/SeoHead.tsx` | Title/description `/contact` avec adresse + téléphone |
| `website/contact-new-design.html` | Texte d'adresse + popup carte et centrage carte sur le siège (Ngaliema) |
| `website/mentions-legales.html` | Siège social + adresse de contact |
| `website/cgu.html` | Adresse de contact |
| `website/js/translations.js` | `footer.address` FR/EN |
| `components/ChatWidget.tsx` | Adresse du siège dans la réponse « contact » ; application Android annoncée comme disponible sur Google Play |
| `index.html` | Géo `-4.3214/15.2750`, téléphone réel, JSON-LD `LocalBusiness` + `TaxiService`, `ReserveAction`, `MobileApplication` Play Store, FAQ enrichie |
| `vite.config.ts` | Prerender SEO : section siège + NAP ; sitemap : hreflang `/en/` supprimé, `/commander` et `/reserver` ajoutés |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

1. **Rayon de matching** : `DEFAULT_MATCH_RADIUS_KM = 5`, borné `2–8 km`, surchargeable sans redéploiement via `smartcabb_global_config.rideMatchRadiusKm` (`resolveMatchRadiusKm()`). Aucun élargissement géographique : la 2e vague notifie d'autres chauffeurs **dans le même rayon** (8 + 8, 18 s d'écart).
2. **Pré-requis GPS** : `readDriverPositionAge()` lit la position et son horodatage (`currentLocation.updatedAt`, `locationUpdatedAt`…). Position absente **ou** vieille de plus de 10 min (`MATCH_POSITION_MAX_AGE_MS`) → chauffeur **non notifié**. Plus de coordonnées par défaut (Gombe) comme avant.
3. **Catégorie** : `categoriesCompatible()` (normalisation Standard) reste strict : aucun mélange Standard/Confort/Familiale/Business.
4. **`findAndNotifyNearbyDrivers()`** : sans coordonnées de départ → course clôturée `no_driver_found` (`missing_pickup_coordinates`). Si aucun chauffeur dans le rayon → clôture immédiate (`no_driver_nearby`) avec `matchingRadiusKm`, `driversOutsideRadius`, `driversOnline` (la course ne reste plus `searching` à vie). Le payload de notification porte `matchingRadiusKm` et `distanceToPickup`.
5. **`/pending/:driverId`** : à l'affichage, la position du chauffeur est relue (`readDriverLiveLite`, lecture ciblée : pas de fiche complète toutes les 8 s) ; s'il est hors rayon ou si son GPS est périmé, la notification est supprimée et `ride: null` est renvoyé → il ne voit pas la course.
6. **`/check-drivers-availability`** et **`/check-availability/:id`** : filtrent avec le même rayon et la même règle de fraîcheur ; renvoient `radiusKm`, `nearbyOnly`, `noDriversNearby`.
7. **`/accept`** (défense en profondeur) : refuse `HORS_ZONE` si un chauffeur dont la position est **fraîche** est à plus de `rayon + 1 km` ; ne bloque pas si la position est inconnue/périmée.
8. **`/debug-drivers`** : `?lat=&lng=` (ou `?rideId=`) → `distanceKm`, `positionAgeSeconds`, `positionFresh`, `inRadius`, `matchable`, `reference.radiusKm` pour diagnostiquer un rayon.
9. **Adresse** : nouvelle adresse appliquée aux pages légales, contact, CGU, confidentialité, inscription conducteur, footer et site statique `website/`. Coordonnées géocodées : **-4.3214, 15.2750** (63, Avenue Colonel Mondjiba, Basoko/Ngaliema — Silikin Village / Kadea).
10. **SEO** : JSON-LD `LocalBusiness` + `TaxiService` (téléphone `+243960624008`, adresse complète, géo, `hasMap`, `ReserveAction`), `MobileApplication` pointant vers `https://play.google.com/store/apps/details?id=com.smartcabb.app`, 3 FAQ supplémentaires (siège, réservation à l'avance, communes desservies). Sitemap régénéré au build avec `/commander` et `/reserver`, hreflang `/en/` inexistant retiré.
11. **Réservations programmées** : le motif `no_drivers_available` (personne de disponible) est désormais distingué de `no_driver_nearby` (chauffeurs en ligne mais hors rayon), et le passager est informé honnêtement (« Aucun chauffeur à proximité — contactez le support ») au lieu de « un chauffeur arrive bientôt » quand le matching échoue. Le chatbot indique la nouvelle adresse et l'app Android sur Google Play.

### Impact produit / comportement visible
- Un chauffeur de Ngaba/Matete/Ndjili **ne voit plus** une demande faite à Gombe ; seuls les chauffeurs de la même catégorie et dans un rayon de 5 km (paramétrable 2–8 km) reçoivent la notification.
- Le passager voit un message explicite : « Aucun chauffeur à proximité » avec le rayon, au lieu d'attendre une course que personne ne peut prendre.
- L'adresse officielle est identique partout (site, app, documents légaux, footer, carte de contact).
- Google dispose du NAP complet, des données structurées TaxiService et des URL de conversion dans le sitemap.

### Risques & rollback
- **Risque** : avec une flotte réduite, un rayon de 5 km peut empêcher toute prise en charge si aucun chauffeur n'est connecté dans la zone. C'est le comportement demandé (pas de chauffeur lointain), mais il faut surveiller le taux de `no_driver_nearby`.
- **Réglage sans redéploiement** : `smartcabb_global_config.rideMatchRadiusKm` (2 à 8). Repasser à une valeur plus large (ex. 8) si nécessaire.
- **Rollback code** : `git revert 59dd436 c03c509 1920d50` puis redéployer l'Edge Function et Vercel.
- **Rollback adresse/SEO** : revert du commit (aucune migration de données).

### Tests / vérifications
- [x] `npx tsc --noEmit` — aucune erreur hors `_headers/Code-component-*.tsx` (pré-existantes)
- [x] `npm run build` — OK ; `dist/sitemap.xml` contient `/commander`, `/reserver`, sans `/en/` ; `dist/index.html` contient l'adresse, `TaxiService` et le téléphone
- [x] Edge Function déployée (`npx supabase functions deploy make-server-2eb02e52 --project-ref zaerjqchzqmcxqblkfkg`)
- [x] `GET /rides/debug-drivers?lat=-4.3214&lng=15.2750` → `radius=5`, 2 chauffeurs en ligne mais **hors rayon** (9,2 km) → `matchable=0`
- [x] `POST /rides/check-drivers-availability` (pickup Gombe) → `available=false`, `noDriversNearby=true`, `radiusKm=5`, aucune alternative
- [ ] Test réel d'une course avec deux comptes situés à moins de 5 km (à faire avec accord)

---

## 2026-11-21 (36) — Sonnerie conducteur en boucle, passager figé, prix « reste à payer » et suivi des paiements admin

- **Commit** : `fc54ba9` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix + feat
- **Objectif** : clore quatre anomalies constatées sur une course issue d'une réservation — sonnerie sans fin côté conducteur, écran passager figé, prix affiché (compteur horaire au lieu du reste à payer), et absence de suivi acompte/solde côté admin.

### Diagnostic

| Anomalie | Cause réelle |
|---|---|
| Sonnerie en boucle | `playRideNotification()` lance une sonnerie `loop = true` qui ne s'arrête qu'à `stopAllNotifications()`. Pour une course **pré-attribuée** (réservation), il n'y a rien à accepter : personne n'appelait l'arrêt, et `NavigationScreen` ne l'arrêtait ni à l'ouverture ni au clic « Démarrer la course ». |
| Passager figé | L'écran de course n'était ouvert que par le push FCM **web**. Dans l'APK (WebView Capacitor), le FCM web n'existe pas et `initNativePush()` n'était jamais appelé côté passager → aucune notification reçue, aucun repli. |
| Prix erroné | `calculateRideMeterCost()` facture à l'heure et ignorait `scheduledTotalPrice` / `scheduledDepositPaid`. La course affichait 13 500 CDF au lieu du reste à payer (67 500 CDF sur un total de 135 000). |
| Suivi admin | Aucune vue ne distinguait l'acompte (50 % encaissés à la réservation) du solde encaissé à la clôture. |

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/notification-sound.ts` | Nouvelle fonction `stopRideRingtone()` (coupe la sonnerie sans tuer la voix) + option `stopRingAfterMs` sur `playRideNotification()` |
| `components/driver/DriverDashboardNew.tsx` | Sonnerie limitée à **8 s** pour les courses pré-attribuées (push `reservation_started` et filet de sécurité `/rides/active`) |
| `components/driver/NavigationScreen.tsx` | `stopAllNotifications()` à l'ouverture de l'écran et au démarrage ; affichage « Reste à payer » + rappel total/acompte ; gains calculés sur le prix total |
| `components/RideCompletionSummaryDialog.tsx` | Nouveau champ optionnel `depositPaid` : ligne « Acompte déjà versé » et « Reste à payer maintenant » |
| `pages/PassengerApp.tsx` | `initNativePush('passenger', …)`, écoute de `fcm-reservation-started`, polling de secours `/rides/passenger/:id/active` toutes les 8 s |
| `lib/native-push.ts` | `reservation_started` / `reservation_driver_enroute` : ne redirige plus un passager vers `/app/driver` |
| `components/passenger/RideInProgressScreen.tsx` | Affiche le reste à payer + total/acompte pour les réservations |
| `components/passenger/PaymentScreen.tsx` | Priorité à `amountDue` (solde) au lieu de `finalPrice` (total) — évite de débiter 135 000 au lieu de 67 500 |
| `components/passenger/PaymentReceiptScreen.tsx` | Reçu : « Reste réglé à la clôture » + total + acompte déduit |
| `components/admin/AdminRidesScreen.tsx` | Carte « Paiements des réservations » (acomptes encaissés/en attente, soldes à encaisser/encaissés) + détail par course et par réservation ; rafraîchissement auto 30 s |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Index `passenger_active_ride:<passengerId>` (création, réservation, admin-process-one) ; endpoint `GET /rides/passenger/:passengerId/active` ; clôture et auto-clôture : `totalPrice` = prix total, `depositPaid`, `amountDue`, `paymentStatus` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

1. **Sonnerie** : `stopRideRingtone()` met `_ringtoneWanted = false`, vide le timer WebAudio et met l'élément `<audio>` en pause sans toucher au TTS. `playRideNotification(details, { stopRingAfterMs })` programme cet arrêt (8 s pour une réservation). `NavigationScreen` appelle `stopAllNotifications()` au montage et dans `handleStartRide`.
2. **Passager** : à la connexion, l'APK enregistre son token natif (`initNativePush('passenger', id)`), la notification `reservation_driver_enroute`/`reservation_started` déclenche `fcm-reservation-started`, et un polling de secours (8 s) interroge l'API. `getByPrefix('ride:')` étant trop coûteux, un index `passenger_active_ride:<id>` est écrit à chaque création/pré-attribution ; l'endpoint purge l'index si la course est terminale.
3. **Prix** : pour une réservation, l'UI conducteur et passager affiche `scheduledTotalPrice − scheduledDepositPaid` ; le récapitulatif et le reçu détaillent total, acompte et solde. Le backend écrit désormais `totalPrice = scheduledTotalPrice (+ pénalité)` et `amountDue = total − acompte` pour la comptabilité.
4. **Admin** : la carte « Paiements des réservations » agrège acomptes (50 % des réservations non annulées) et soldes ; chaque course réservée affiche « Acompte versé » et « Reste à encaisser (à la clôture / ✓) ». Rechargement toutes les 30 s.
5. **Données corrigées** : la course `da634e56-aab7-45a1-b622-f55479c6cc0c` (clôturée avant ce correctif) a été mise à jour en base : total 135 000, acompte 67 500, reste 67 500, `paymentStatus = settled`.

### Impact produit
- Plus de sonnerie interminable : elle s'arrête seule (8 s) puis au démarrage de la course.
- Le passager voit sa course réservée s'ouvrir même si le push est perdu.
- Le chauffeur et le passager voient le montant réellement dû, pas le compteur horaire.
- L'admin suit les encaissements (acompte puis solde) en temps réel, course par course.

### Risques & rollback
- **Risque** : le polling passager ajoute 1 requête / 8 s par passager connecté (lecture KV unique, coût faible).
- **Risque** : les anciennes courses réservées sans index `passenger_active_ride` ne bénéficient pas du repli (le push reste le canal principal).
- **Rollback** : `git revert` du commit ; aucune migration de schéma (uniquement des clés KV).

### Tests / vérifications
- [x] `npx tsc --noEmit` OK
- [x] `npm run build` OK
- [x] Edge Function déployée
- [x] `GET /rides/passenger/<id>/active` → `ride: null` (aucune course active)
- [x] Index temporaire pointant vers une course terminée → endpoint renvoie `null` et supprime l'index
- [x] Course `da634e56…` corrigée en base (135 000 / 67 500 / 67 500)
- [ ] À confirmer sur téléphone : sonnerie qui s'arrête, ouverture auto côté passager, prix « reste à payer »

---

## 2026-11-21 (35) — Réservation déclenchée mais course annulée par le nettoyage admin ; chauffeur invisible sans push

- **Commit** : `f84e2d0` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : une réservation créée automatiquement à T-15 était annulée par le nettoyage du dashboard admin, le chauffeur ne voyait pas la course pré-attribuée si le push manquait, et « Rouvrir » refusait à cause de l'index anti-doublon.

### Diagnostic (données réelles)

Réservation `38a2b252-d4d8-4efe-8477-6c9377ac65fa` — **21/11/2026 11:30**, Carmel ALI / Ruth Shole :

| Fait | Valeur |
|---|---|
| Course créée automatiquement | oui, `ffbb66fc-4e6c-456c-a735-b59db52d75a3`, à **11:15** (T-15), statut `accepted` |
| Annulation | **11:47:36**, `cancelReason = auto_expired` |
| Cause | `GET /admin/stats` annule les courses `searching`/`accepted` de plus de **30 min** (depuis `createdAt`) à chaque chargement du dashboard admin |
| Chauffeur | `driver.activeRideId` restait bloqué sur la course annulée (`is_available=false`) |
| « Rouvrir » | refusé (409) car l'index `scheduled_ride:38a2b252…` existait encore |
| Visibilité chauffeur | le dashboard ne polle que `/rides/pending/:driverId` (courses `searching`) ; une course pré-attribuée `accepted` n'était visible que par le push `reservation_started` |

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | Le nettoyage des courses bloquées **exclut les courses programmées** (`isScheduled`/`scheduledRideId`) et **libère le chauffeur** (`activeRideId`/`currentRideId` remis à null) pour les courses immédiates annulées |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `sweep-fraud` : pour une course programmée, la grâce part de l'**heure prévue** et vaut **120 min** (`SCHEDULED_RIDE_START_GRACE_MINUTES`) au lieu de 15 min depuis la création ; nouvel endpoint `GET /active/:driverId` |
| `supabase/functions/make-server-2eb02e52/reservation-routes.ts` | `POST /:id/reopen` : autorise la réouverture si la course liée est **annulée**, supprime l'index obsolète ; refuse seulement si une course est encore active |
| `components/driver/DriverDashboardNew.tsx` | Polling de secours toutes les 8 s sur `/rides/active/:driverId` : ouvre la navigation même si le push n'est pas arrivé |
| `components/admin/AdminScheduledRidesScreen.tsx` | Texte de confirmation « Rouvrir » adapté (course active vs annulée) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

1. **Nettoyage admin** : `staleRides` ne contient plus les courses `isScheduled` ou liées à une réservation. Pour les courses immédiates, l'annulation libère aussi le chauffeur (objet `driver:` et `profile:`) en remettant `activeRideId`/`currentRideId` à null et la disponibilité selon son état en ligne.
2. **Anti-fraude** : la fenêtre « jamais démarré » est calculée depuis `scheduledDate`/`scheduledTime` (conversion UTC+1) pour les réservations, avec `SCHEDULED_RIDE_START_GRACE_MINUTES` (secret Supabase, **120**). Une réservation de 11:30 peut donc être démarrée jusqu'à 13:30 avant l'annulation automatique.
3. **Filet de sécurité chauffeur** : `GET /rides/active/:driverId` renvoie la course pointée par `activeRideId`/`currentRideId` si son statut est `accepted`, `enroute`, `arrived`, `in_progress` ou `started`. Le dashboard conducteur l'interroge toutes les 8 s et ouvre la navigation une seule fois par course (ref `activeRideFallbackRef`).
4. **Rouvrir** : si l'index existe et que la course liée est `cancelled`, l'index est supprimé et la réservation repasse en `confirmed`/`scheduled` ; le cron recrée une course propre. Si la course liée est active, réponse 409.
5. **Données corrigées** : la réservation `38a2b252…` a été rouverte, l'index supprimé, la conductrice libérée, puis le cron a créé la course `da634e56-aab7-45a1-b622-f55479c6cc0c` (pré-attribuée à Ruth, Carmel passagère) à 12:02.

### Impact produit
- Les réservations ne sont plus annulées par le simple chargement du dashboard admin.
- Le chauffeur voit la course pré-attribuée même si le push FCM est perdu.
- L'admin peut relancer une réservation dont la course a été annulée, sans doublon.
- Les courses immédiates bloquées libèrent correctement le chauffeur.

### Risques & rollback
- **Risque** : une course programmée non démarrée reste active jusqu'à 120 min après l'heure prévue (réglable via `SCHEDULED_RIDE_START_GRACE_MINUTES`).
- **Risque** : le polling `/rides/active` ajoute une requête toutes les 8 s par chauffeur connecté (cache KV, impact faible).
- **Rollback** : `git revert` du commit ; remettre la grâce à 15 min si besoin. Aucune migration de schéma.

### Tests / vérifications
- [x] `npx tsc --noEmit` OK
- [x] `npm run build` OK
- [x] Edge Function déployée
- [x] `POST /rides/process-scheduled` → `processed: 1`, course `da634e56…` créée en `preassigned`
- [x] `GET /rides/active/28501b8f…` → course `da634e56…`, statut `accepted`, Ruth / Carmel
- [x] Index `scheduled_ride:38a2b252…` → `da634e56…`
- [x] Objet chauffeur Ruth → `activeRideId = da634e56…`
- [ ] À confirmer sur téléphone : ouverture automatique de la navigation conducteur et démarrage de la course
- [ ] À confirmer : plus d'annulation `auto_expired` après chargement du dashboard admin

---

## 2026-11-21 (34) — Rotation du secret cron + copie hors site planifiée

- **Commit** : `c36a3b7` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security
- **Objectif** : retirer du dépôt le secret cron historique `smartcabb-cron-2026`, le remplacer par un secret fort, et automatiser la copie hebdomadaire du dernier backup vers OneDrive.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `hasValidCronSecret` n'accepte plus que `CRON_SECRET` ; `/sweep-fraud` accepte le cron **ou** une session admin (`hasValidCronOrAdmin`) |
| `supabase/functions/make-server-2eb02e52/backup-routes.ts` | `hasValidCronSecret` strict (plus de repli sur l'ancien secret) |
| `components/admin/AdminRidesScreen.tsx` | Le balayage anti-fraude utilise le **jeton de session admin** ; plus de secret dans le bundle frontend |
| `scripts/download-latest-backup.ps1` | Le secret est lu dans `SMARTCABB_CRON_SECRET` (variable utilisateur), plus de valeur en dur |
| `supabase/setup-scheduled-rides-cron.sql` | Placeholder `<NOUVEAU_CRON_SECRET>` + `cron.unschedule` idempotent |
| `supabase/setup-backups-cron.sql` | Placeholder `<NOUVEAU_CRON_SECRET>` |
| `supabase/migrations/20260611000000_setup_scheduled_rides.sql` | Placeholder (plus d'ancien secret) |
| `docs/BACKUPS.md` | Procédure de rotation et script hors site mis à jour |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

1. **Nouveau secret** : 32 octets aléatoires (base64url), stocké dans **Supabase → Settings → Edge Functions → Secrets** sous `CRON_SECRET`, et dans la variable utilisateur Windows `SMARTCABB_CRON_SECRET`.
2. **Backend strict** : `hasValidCronSecret` exige `CRON_SECRET` et refuse tout autre valeur (l'ancien secret renvoie **401**). Les deux crons (`process-scheduled-rides`, `smartcabb-daily-backup`) doivent être recréés avec le nouveau secret via les scripts SQL.
3. **Frontend** : `AdminRidesScreen` appelle `/rides/sweep-fraud` avec `Authorization: Bearer <session>` ; le backend accepte un JWT dont le rôle est `admin` (ou le cron). Le secret n'est plus exposé dans le JavaScript public.
4. **Copie hors site** : tâche Windows planifiée **« SmartCabb Backup hors site »**, hebdomadaire le **vendredi à 18:00**, avec `StartWhenAvailable` (rattrapage si le PC était éteint). Elle exécute `scripts/download-latest-backup.ps1`, qui lit le secret dans la variable utilisateur et enregistre le fichier dans `%USERPROFILE%\OneDrive\SmartCabb-Backups`.

### Impact produit
- L'ancien secret du dépôt ne permet plus d'appeler les endpoints cron (vérifié : 401).
- Le panneau admin continue de fonctionner sans secret embarqué.
- Une copie du backup est téléchargée automatiquement chaque semaine sur OneDrive.

### Risques & rollback
- **Risque** : tant que les deux scripts SQL n'ont pas été ré-exécutés avec le nouveau secret, les crons échouent (401). Les réservations ne sont pas traitées automatiquement pendant cette fenêtre.
- **Rollback** : remettre l'ancien secret dans `CRON_SECRET` et redéployer ; recréer les crons avec l'ancienne valeur. Déconseillé.
- **Rotation suivante** : générer un nouveau secret, mettre à jour `CRON_SECRET`, `SMARTCABB_CRON_SECRET`, puis ré-exécuter les deux scripts SQL.

### Tests / vérifications
- [x] `npx tsc --noEmit` OK
- [x] Edge Function redéployée
- [x] `GET /backups/list` avec le nouveau secret → **200**
- [x] `GET /backups/list` avec l'ancien secret → **401**
- [x] `POST /rides/process-scheduled` avec le nouveau secret → **200** (`processed: 0`)
- [x] `POST /rides/process-scheduled` avec l'ancien secret → **401**
- [x] Script hors site exécuté → fichier présent dans OneDrive
- [x] Tâche planifiée créée et testée → `LastTaskResult = 0`, prochaine exécution vendredi 18:00
- [ ] Scripts SQL des deux crons ré-exécutés avec le nouveau secret (action utilisateur)

---

## 2026-11-21 (33) — Sauvegardes automatiques : export quotidien JSON, bucket privé, restauration

- **Commit** : `a93e3b9` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : garantir la conservation des données avant la mise en production (profils, chauffeurs, courses, réservations, SOS, comptes, photos), avec une sauvegarde **automatique quotidienne** et un bouton de sauvegarde manuelle dans l'admin.

### Diagnostic

L'écran admin « Backup & Recovery » existant était une **maquette** : il appelait des routes `/backups/*` inexistantes et proposait des tables qui n'existent pas (`profiles`, `drivers`, `rides`, `settings`…). Aucune sauvegarde réelle n'était produite. Les données vivent dans 3 tables Supabase (`kv_store_2eb02e52`, `scheduled_rides`, `emergency_alerts`), dans `auth.users` et dans le bucket `avatars`.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/backup-routes.ts` | **Nouveau** : `POST /run`, `GET /list`, `GET /latest`, `GET /download/:name`, `DELETE /:name` |
| `supabase/functions/make-server-2eb02e52/index.ts` | Montage de `/make-server-2eb02e52/backups` |
| `components/admin/BackupAndRecoveryScreen.tsx` | Écran réel : état automatique, création manuelle, liste, téléchargement, suppression |
| `supabase/setup-backups-cron.sql` | **Nouveau** : cron pg_cron quotidien 01:00 UTC (02:00 Kinshasa) |
| `scripts/download-latest-backup.ps1` | **Nouveau** : copie hors site du dernier backup vers OneDrive |
| `scripts/restore-backup.mjs` | **Nouveau** : restauration des tables + photos (dry-run par défaut) |
| `docs/BACKUPS.md` | **Nouveau** : procédures, restauration, secrets, dépannage |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

1. **Export** : la fonction pagine les 3 tables (1000 lignes/page, ordre stable), liste les comptes via `auth.admin.listUsers` (champs utiles uniquement, jamais de mot de passe) et parcourt récursivement le bucket `avatars`. Les photos sont incluses en base64 dans la limite de `BACKUP_MAX_AVATAR_MB` (20 Mo par défaut) ; les suivantes sont comptées dans `avatarSkipped`.
2. **Fichier** : JSON `{ meta, data }` compressé en gzip, nommé `smartcabb-backup-<ISO>.json.gz`, uploadé dans le bucket **privé** `backups`.
3. **Rétention** : `BACKUP_RETENTION_DAYS` (30 par défaut) ; les fichiers plus anciens sont supprimés après chaque sauvegarde.
4. **Authentification** : `x-cron-secret` (cron / script hors site) **ou** jeton Supabase d'un utilisateur `admin`. La suppression exige un jeton admin.
5. **Téléchargement** : URL signée de 10 minutes, jamais d'accès public au bucket.
6. **Cron** : `0 1 * * *` → `POST /backups/run` (SQL idempotent, à exécuter une fois dans le SQL Editor).
7. **Hors site** : `scripts/download-latest-backup.ps1` récupère l'URL signée du dernier backup et l'enregistre dans OneDrive ; à planifier une fois par semaine.
8. **Restauration** : `scripts/restore-backup.mjs` (dry-run par défaut, `--apply` pour écrire) restaure le KV, les réservations, les SOS et les photos. Les comptes sont listés mais non recréés (mots de passe non exportés).

### Impact produit
- Plus aucune perte silencieuse : une sauvegarde complète existe chaque nuit.
- L'admin peut créer/télécharger/supprimer un backup en un clic.
- La copie hors site protège contre la perte totale du projet Supabase.
- Les backups Supabase Pro (quotidiens + PITR) restent recommandés en complément.

### Risques & rollback
- **Risque** : un backup volumineux (photos) peut dépasser le temps d'exécution de l'Edge Function. Mitigation : plafond `BACKUP_MAX_AVATAR_MB`, pagination, logs de durée.
- **Risque** : le secret cron historique est présent dans le dépôt. À faire tourner avant une exposition publique (nouveau `CRON_SECRET`, mise à jour du SQL et du script).
- **Rollback** : `git revert` du commit ; supprimer le cron avec `SELECT cron.unschedule('smartcabb-daily-backup');`. Aucune migration de schéma.

### Tests / vérifications
- [x] `npx tsc --noEmit` OK
- [x] `npm run build` OK
- [x] Edge Function déployée (version 160)
- [x] `POST /backups/run` → backup de 8,57 Mo : 2188 KV, 47 réservations, 6 SOS, 43 comptes, 37 photos
- [x] `GET /backups/list` → fichier listé avec taille et date
- [x] Téléchargement via URL signée → JSON.gz valide, aucun mot de passe présent
- [x] Restauration en dry-run sur le backup réel
- [ ] Cron quotidien exécuté (vérifier `cron.job_run_details` après la première nuit)

---

## 2026-11-20 (32) — Réservation 12:00 non déclenchée + overlay « AbortError: Lock broken »

- **Commit** : `7abf2a0` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : (1) supprimer l'écran rouge « Promesse non gérée : AbortError: Lock broken by another request with the 'steal' option » ; (2) faire en sorte qu'une réservation déclenche **automatiquement** sa course **15 min avant** l'heure, sans clic admin.

### Diagnostic (données réelles)

Réservation `f3e37a17-a377-4357-9e1e-222eb72ba143` — **20/11/2026 12:00**, passagère Carmel ALI, conductrice Ruth Shole :

| Fait constaté | Valeur |
|---|---|
| Conducteur accepté | oui (`driver_status = accepted`) |
| Présence confirmée | oui (`presence_confirmed = true`, le 20/11 à 03:15) |
| Rappel H-1 envoyé | oui (`reminder_sent_at = 09:55Z`, soit 10:55 locale) |
| Statut final | `completed` à **10:55:20Z = 11:55 locale** |
| Course créée | **aucune** (aucune course `scheduledRideId = f3e37a17…` chez Ruth ni chez Carmel) |

**Cause n°1 — bouton « Traiter » trompeur.** Le bouton vert « Traiter » de l'écran Admin → Réservations appelait `POST /reservations/:id/admin-status` avec `status = completed`. Ce endpoint ne créait **aucune course** : il marquait seulement la réservation comme traitée. L'admin a cliqué à 11:55 (croyant lancer la course) ; le cron de 11:55 a ensuite vu la réservation déjà `completed` et l'a ignorée. Le passager n'a jamais eu de chauffeur.

**Cause n°2 — déclenchement à T-5, pas T-15.** Le cron lisait la marge dans le secret `SCHEDULED_RIDE_BUFFER_MINUTES`, qui valait **5** (vérifié : empreinte SHA-256 de `5`). La course se créait donc au mieux 5 min avant, alors que l'admin attendait 11:45.

**Cause n°3 — overlay d'erreur.** `@supabase/auth-js` utilise les **Web Locks** (`navigator.locks`) pour synchroniser la session entre onglets. Quand une opération d'auth dure plus de 5 s (réseau lent, plusieurs onglets), un autre onglet « vole » le verrou (`steal: true`) et le précédent reçoit `AbortError: Lock broken by another request with the 'steal' option`. Le filtre de `utils/diagnostics.ts` ne connaissait pas ce message → overlay rouge plein écran, alors que l'erreur est bénigne et auto-réparée.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `utils/diagnostics.ts` | `isAbortLike()` : ignore `AbortError` / `TimeoutError` / « Lock broken by another request » / « lock request is aborted » dans `error` et `unhandledrejection` (`preventDefault`, pas d'overlay) |
| `lib/supabase.ts` | `auth.lockAcquireTimeout: 15000` (au lieu de 5 s) : moins de vols de verrou sur réseau lent |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Marge par défaut **15 min** (`leadMinutes`) ; commentaires ; index KV `scheduled_ride:<id>` → `rideId` écrit dans les 4 chemins de création (cron pré-attribué, cron matching, admin pré-attribué, admin matching) |
| `supabase/functions/make-server-2eb02e52/reservation-routes.ts` | `POST /:id/admin-status` **refuse** `completed` (409) ; nouveau `POST /:id/reopen` (anti-doublon via l'index, refus des dates passées, remet en `scheduled`/`confirmed`) |
| `components/admin/AdminScheduledRidesScreen.tsx` | Bouton « Traiter » **supprimé** ; bouton « ↩️ Rouvrir » pour une réservation clôturée le jour même ; rafraîchissement auto toutes les 60 s ; libellé « Création automatique vers HH:MM (15 min avant) » |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique

1. **Overlay** : `isAbortLike(error)` teste `error.name` (`AbortError`, `TimeoutError`) et les messages du Web Locks. Les deux listeners (`error`, `unhandledrejection`) appellent `event.preventDefault()` et se contentent d'un `console.warn`. Les vraies erreurs continuent d'afficher l'overlay.
2. **Délai 15 min** : `leadMinutes` lit `SCHEDULED_RIDE_BUFFER_MINUTES` (défaut **15**). Le secret Supabase a été mis à **15**. Le cron `process-scheduled-rides` (`*/5 * * * *`) traite donc la réservation entre 10 et 15 min avant l'heure (selon le passage du cron). Le garde manuel `SCHEDULED_RIDE_EARLY_MINUTES` reste à 15 : les deux chemins sont cohérents.
3. **Fin du piège « Traiter »** : le serveur répond **409** à toute demande `completed` via `admin-status`, avec un message qui renvoie vers « Créer maintenant » / « Matching auto ». La clôture légitime reste faite par `process-scheduled` / `admin-process-one`, qui créent la course **avant** de passer le statut à `completed`.
4. **Rouvrir** : chaque création de course de réservation écrit `scheduled_ride:<reservationId> = <rideId>` dans le KV. `POST /reservations/:id/reopen` :
   - refuse une réservation non `completed` (409) ;
   - refuse une date antérieure à aujourd'hui (heure Kinshasa, UTC+1) ;
   - refuse si l'index existe déjà (aucun doublon) ;
   - remet `status = confirmed` (acompte reçu) ou `scheduled`, et `reminder_sent_at = null` ;
   - le cron suivant crée la course (pré-attribuée si conducteur accepté + présence confirmée, sinon matching auto).
5. **Admin** : la liste se rafraîchit toutes les 60 s (silencieusement), affiche l'heure de création automatique, et propose « Rouvrir » pour les réservations clôturées du jour. Le bouton « Créer maintenant » reste disponible pour forcer immédiatement (avec le garde des 15 min côté serveur).

### Impact produit
- Une réservation normale (conducteur accepté + présence confirmée) crée sa course **automatiquement vers T-15**, sans aucune action admin.
- Il n'est plus possible de « griller » une réservation en la marquant traitée sans course.
- Si une réservation a été clôturée par erreur (cas du 20/11 12:00), l'admin peut la rouvrir en un clic ; la course est recréée dans les 5 min.
- L'overlay rouge ne s'affiche plus pour les courses annulées (`AbortController`) ni pour les verrous de session Supabase.

### Risques & rollback
- **Risque** : une réservation rouverte dont une ancienne course existerait **avant le déploiement de l'index** pourrait créer un doublon. Le bouton est limité aux réservations **du jour** ; les nouvelles créations sont protégées par l'index.
- **Risque** : `lockAcquireTimeout` à 15 s retarde légèrement une opération d'auth si un verrou est réellement orphelin (puis vol automatique).
- **Rollback** : `git revert` du commit ; remettre le secret `SCHEDULED_RIDE_BUFFER_MINUTES` à `5` si besoin. Aucune migration de base.

### Tests / vérifications
- [x] `npx tsc --noEmit` OK (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npm run build` OK
- [x] Edge Function déployée ; `POST /rides/process-scheduled` répond `200` avec `x-cron-secret`
- [x] Secret `SCHEDULED_RIDE_BUFFER_MINUTES=15` appliqué
- [x] Diagnostic données : réservation `f3e37a17…` sans course (confirmé par l'historique Ruth et Carmel)
- [ ] À confirmer : réservation de test à venir → course créée vers T-15, push conducteur + passager
- [ ] À confirmer : « Rouvrir » sur la réservation du 20/11 12:00 → course recréée, passager notifié
- [ ] À confirmer : plus d'overlay AbortError après plusieurs onglets / réseau lent

---

## 2026-11-20 (31) — Écran de démarrage Android : splash marine + médaillon, fin de la page blanche

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix / design
- **Objectif** : à l'ouverture de l'APK, le premier écran était une **page blanche avec un petit logo**. Remplacer ce splash par un écran fidèle à la charte (bleu nuit + médaillon CS), aligné sur le préchargeur web, et supprimer le flash blanc entre le natif et la WebView.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `android/app/src/main/res/values/styles.xml` | Splash AndroidX configuré (`windowSplashScreenBackground`, `windowSplashScreenAnimatedIcon`, `postSplashScreenTheme`), fond marine derrière la WebView |
| `android/app/src/main/res/values-v31/styles.xml` | **Nouveau** — attributs natifs Android 12+ (`android:windowSplashScreen*`) |
| `android/app/src/main/res/values/colors.xml` | **Nouveau** — `splash_background` = `#0D3145` |
| `android/app/src/main/res/drawable-*/splash_icon.png` | **Nouveaux** — médaillon circulaire 288 dp (contenu dans le cercle de 192 dp) |
| `android/app/src/main/java/com/smartcabb/app/MainActivity.java` | WebView peinte en `#0D3145` avant le premier rendu |
| `android/app/src/main/res/drawable/splash_bg.xml` + `drawable-*/splash_logo.png` | Supprimés (ancien splash, plus référencé) |
| `android/app/build.gradle` | `versionCode 10`, `versionName "1.7"` |
| `public/splash-medallion.png` | **Nouveau** — même médaillon pour le préchargeur web |
| `index.html` | Préchargement + markup + CSS critique du préchargeur alignés sur le médaillon |
| `styles/globals.css` | Même CSS `.sc-boot-medal` (médaillon circulaire, 176 px / 156 px en petit écran) |
| `components/BrandLoader.tsx` | Même image que le préchargeur natif |

### Description technique
**Cause** : le thème de lancement ne définissait que `android:background` (`splash_bg`). Depuis Android 12, le système **ignore** ce fond et fabrique son propre écran de démarrage avec l'icône de l'application sur le fond par défaut (blanc). D'où le « petit logo sur page blanche ». Aucun attribut `windowSplashScreenBackground` / `windowSplashScreenAnimatedIcon` n'était défini.

**Design retenu** (conforme aux specs Android 12+) :
- fond **bleu nuit `#0D3145`** de la charte ;
- médaillon **circulaire givré** (dégradé blanc → bleu très clair), anneau **bleu clair `#7FB8D4`**, ombre douce ;
- monogramme **CS** teal au centre (extrait du logo existant, fond rendu transparent) ;
- aucun texte dans l'icône native (le système masque le drawable dans un cercle de 192 dp) : le nom `SMARTCABB` et le slogan apparaissent juste après dans le préchargeur web, avec le **même médaillon** et une taille très proche (180 dp natif / 176 px web) → le logo ne « saute » pas au passage au préchargeur.

**Implémentation** :
- Android 12+ : `values-v31/styles.xml` définit `android:windowSplashScreenBackground` et `android:windowSplashScreenAnimatedIcon`. Le drawable fait **288 dp** avec le médaillon de **180 dp** au centre, donc il reste dans le cercle visible de 192 dp.
- Android 24–30 : le thème parent `Theme.SplashScreen` (core-splashscreen 1.2.0) utilise le même fond et la même icône via `windowSplashScreenBackground` / `windowSplashScreenAnimatedIcon` ; le drawable `compat_splash_screen_no_icon_background` applique le masque circulaire.
- `AppTheme.NoActionBar` reçoit `android:windowBackground = @color/splash_background` ; `MainActivity` peint la WebView en `#0D3145`. Plus de flash blanc avant que la page distante n'affiche son préchargeur.
- Le préchargeur web utilise le même asset `public/splash-medallion.png` (512 px, médaillon + ombre), affiché en **176 px** (156 px sous 380 px de large). Le médaillon visible fait donc ~152 px (135 px sur petit écran), très proche des **180 dp** du splash natif : la transition ne provoque qu'un léger décalage vertical (le texte passe sous le logo), pas de rétrécissement brutal.

**Conséquences** : le changement est **natif** (thème + icône) → il nécessite un **nouvel AAB** (1.7, `versionCode` 10). Le préchargeur web, lui, est déployé automatiquement par Vercel. Les installations 1.6 gardent l'ancien splash blanc tant qu'elles ne sont pas mises à jour.

### Impact produit / comportement visible
- Ouverture de l'app : fond bleu nuit + médaillon CS, plus de page blanche.
- Transition continue vers le préchargeur web (même fond, même médaillon), puis vers l'app.
- Aucun changement de parcours ni de données.

### Risques & rollback
- **Risque** : certains OEM Android 12 appliquent leur propre animation de splash ; le rendu peut varier légèrement (taille/masque), mais le fond et l'icône restent les nôtres.
- **Risque** : l'icône 288 dp doit rester dans le cercle de 192 dp ; si elle est remplacée, respecter cette marge sinon les bords seront masqués.
- **Rollback** : `git revert` puis reconstruire l'AAB ; aucune migration ni donnée à restaurer.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`) et `npm run build` OK
- [x] `./gradlew bundleRelease` OK — AAB signé avec le certificat SmartCabb (`CN=SmartCabb`) ; `versionCode 10`, `versionName 1.7`
- [x] Ressources compilées vérifiées : `drawable/splash_icon`, `color/splash_background`, style `AppTheme.NoActionBarLaunch` (base + v31)
- [x] Préchargeur web visualisé (médaillon circulaire, `SMARTCABB`, devise, barre jaune)
- [ ] À confirmer sur appareil Android 12+ : splash bleu nuit + médaillon, puis préchargeur sans flash blanc
- [ ] À confirmer sur Android 11 ou antérieur : même rendu via core-splashscreen

**Artefacts** :
- AAB Play Store : `android/app/build/outputs/bundle/release/app-release.aab`
- APK de test : `android/app/build/outputs/apk/release/app-release.apk`
- Aperçu du rendu (splash natif + préchargeur web) : `docs/apercu-demarrage-1.7.png`

---

## 2026-11-20 (30) — Sonnerie + voix Android : fin du fonctionnement intermittent

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : la sonnerie et l'annonce vocale d'une nouvelle course fonctionnaient « des fois oui, des fois non » sur Android. Identifier chaque cause et rendre la chaîne audio déterministe, sans changer le parcours chauffeur.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/native-tts.ts` | Annulation propre entre annonces (`_speechGeneration`), langues réellement installées, timeouts bornés, cooldown 12 s, pré-chauffage throttlé, plus de langue vide |
| `lib/notification-sound.ts` | Sonnerie non coupée sur Android (volume 0,3), ré-armement au retour au premier plan, watchdog 4 s, `_announcementSeq` / `isCurrent`, annonce raccourcie |
| `components/driver/RideNotification.tsx` | `playedRideIdRef` : sonnerie + voix pour **chaque** nouvelle course, même si la carte n'est pas démontée |
| `components/driver/DriverDashboardNew.tsx` | `pendingRideRequestRef` + `dismissPendingRide(rideId)` : un `ride_taken` d'une ancienne course ne coupe plus la notification de la suivante |

### Description technique
**Causes identifiées (toutes reproduites dans le code)**
1. **Sonnerie coupée trop tôt sur Android** : la sonnerie était mise en pause 0,8 s après le début pour laisser parler le TTS. Si le moteur TTS mettait 2–5 s à démarrer (ou échouait), le chauffeur n'entendait qu'un demi « ding » puis un silence. Sur Android, la sonnerie `<audio>` et le TTS natif utilisent des flux différents : rien n'obligeait à la couper.
2. **Annonce suivante coupée par l'arrêt de la précédente** : `playRideNotification()` appelait `nativeStopSpeak()` (asynchrone) puis, juste après, `nativeSpeak()`. Sur certains moteurs (Samsung), le `stop()` arrivait **après** le début du nouveau `speak()` et le tuait.
3. **État « déjà joué » conservé** : `RideNotification` utilisait un booléen `hasPlayed`. Quand une 2e course remplaçait la 1re sans démonter le composant, la carte s'affichait mais **aucune sonnerie ni voix** n'était déclenchée.
4. **`ride_taken` d'une ancienne course** : le push de fermeture (ou l'événement SW) ne portait pas de filtre par `rideId` ; un `ride_taken` tardif fermait la carte et coupait le son de la course **suivante**.
5. **Timeouts TTS trop courts + 3 langues testées** : jusqu'à 3 × 15 s de silence pendant lesquelles la sonnerie restait baissée ; les langues non installées (`fr-FR` sur un téléphone sans voix française) étaient tentées avant la langue réelle du téléphone.
6. **Pré-chauffage relancé à chaque geste** : `unlockMobileAudio()` appelait `nativeTTSWarmup()` à chaque toucher ; des dizaines d'appels natifs pouvaient saturer le moteur au moment précis où la course arrivait.
7. **WebView en veille** : au retour au premier plan, la WebView pouvait avoir suspendu le média ; la sonnerie ne repartait pas d'elle-même.

**Correctifs**
- **Android** : la sonnerie n'est plus mise en pause ; son volume est **baissé à 0,3** pendant l'annonce (TTS à 1,0), puis restauré à 0,8. Sur iOS web (où un `<audio>` actif rend la voix muette), la pause reste, avec un **watchdog de 4 s** qui remonte la sonnerie si la voix ne démarre pas.
- **Annulations** : `nativeSpeak()` incrémente un jeton de génération ; toute nouvelle annonce invalide la précédente. `stopAllNotifications()` invalide aussi les annonces en cours (plus de voix après acceptation). Côté web, `_announcementSeq` + `isCurrent()` empêchent une annonce périmée de continuer ou d'afficher « voix indisponible ».
- **Langues** : le pré-chauffage mémorise `getSupportedLanguages()` ; on utilise la voix française réellement installée, sinon la langue du téléphone (ou la 1re installée). **Jamais de langue vide** (le plugin la remplaçait par `en-US` et rejetait). 2 tentatives maximum.
- **Timeouts** : `speak()` 12–20 s selon la longueur (annonce bornée à ~38 caractères par adresse), interrogation du moteur 3 s. Sur timeout, le moteur est **stoppé** et on ne teste pas une 2e langue (même silence).
- **Cooldown** : 2 échecs consécutifs → pause de **12 s** seulement (au lieu de 60 s), et seuls les vrais échecs comptent (langue non supportée ou moteur non initialisé ne mettent pas la voix en quarantaine).
- **Ré-armement** : `_ringtoneWanted` mémorise que la sonnerie doit sonner ; sur `visibilitychange` (retour au premier plan), elle repart si la course est toujours en attente.
- **Annonce courte** : « Nouvelle course SmartCabb. Départ : … Destination : … Confirmez vite. » avec adresses tronquées à 38 caractères → reste sous le timeout et réduit le temps où la sonnerie est baissée.
- **Une seule lecture par course, mais pour chaque course** : `RideNotification` mémorise l'**id** de la dernière course annoncée (`playedRideIdRef`), plus un booléen. `DriverDashboardNew` conserve la course affichée dans `pendingRideRequestRef` et ignore un `ride_taken` / `RIDE_DISMISSED` qui concerne un autre `rideId`.

### Impact produit / comportement visible
- La sonnerie démarre dès la réception et **continue** (volume réduit pendant la voix) jusqu'à l'acceptation ou au refus.
- La voix repart pour **chaque** course, y compris la suivante après clôture, sans fermer/rouvrir l'app.
- Un ancien `ride_taken` ne coupe plus la notification de la course en cours.
- Téléphone sans voix française : l'annonce est prononcée avec la voix du système (accent différent) au lieu d'un silence ; le bandeau d'aide reste affiché une seule fois.
- Écran verrouillé / app en arrière-plan : **inchangé** — seule la notification système Android sonne (le JS de la WebView n'est pas exécuté). Une voix en arrière-plan exigerait un service natif (APK ≥ 1.7, `versionCode` 10).

### Risques & rollback
- **Risque** : volume de sonnerie perçu plus faible pendant ~2–4 s (0,3) sur Android ; comportement voulu pour entendre la voix.
- **Risque** : sur un moteur TTS très lent, la sonnerie reste à 0,5 au bout de 4 s (watchdog) au lieu de 0,3 — toujours audible.
- **Rollback** : `git revert` de ce commit ; aucun changement de schéma ni de backend, aucune migration.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`) et `npm run build` OK
- [ ] À confirmer sur appareil : course réelle app ouverte → sonnerie continue + voix ; course suivante → la voix repart ; ancienne course prise entre-temps → la nouvelle sonne quand même
- [ ] À confirmer : écran verrouillé → notification système uniquement (limite connue)

---

## 2026-11-19 (29) — Réservations : reste à payer, gains sur le total, pénalité journalière, bascule passager

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat / fix
- **Objectif** : (1) la course issue d'une réservation doit afficher **seulement la deuxième tranche** (l'acompte de 50 % est déjà réglé) ; (2) le conducteur doit être payé sur le **prix total**, pas sur le reste ; (3) **pénalité de 10 $/heure** au-delà de 21h pour une réservation **journalière** ; (4) le passager doit **basculer automatiquement** sur sa course quand la réservation démarre.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Course créée depuis une réservation : `estimatedPrice` = **total − acompte**, + `scheduledTotalPrice`, `scheduledDepositPaid`, `depositMethod` (3 constructions) ; `/complete` : **pénalité journalière** après 21h et **gains conducteur sur le total** ; `actualCost` mutable |
| `pages/PassengerApp.tsx` | Sur `reservation_driver_enroute` / `reservation_started` / `scheduled_ride_processing` : chargement de la course, `setCurrentRide` + ouverture « course en cours » |

### Description technique
- **Deuxième tranche** : quand une réservation devient une course, le prix affiché/facturé vaut `estimated_price − 50 %` si l'acompte est reçu (`scheduledTotalPrice` conserve le total, `scheduledDepositPaid` l'acompte). Le paiement de la tranche restante se fait normalement à la clôture (portefeuille, espèces ou Mobile Money).
- **Gains conducteur** : `/complete` calcule désormais la commission et les gains sur `scheduledTotalPrice + pénalité` (et non sur le seul reste), sinon l'acompte n'aurait jamais été crédité au chauffeur. Les courses normales sont inchangées (`actualCost`).
- **Pénalité journalière** : si la course est journalière (`serviceType = location_jour` ou catégorie Business) et que la **clôture** a lieu après **21:00 heure de Kinshasa**, ajout de `10 USD × heures entamées`, converti au taux de la config (`exchangeRate`). Traçabilité : `penaltyApplied`, `penaltyHours`, `penaltyCDF` sur la course ; le `finalPrice` inclut la pénalité.
- **Bascule passager** : à la réception du push de démarrage, l'app interroge `/rides/:id`, reconstruit `pickup`/`destination`, définit la course courante et ouvre l'écran « course en cours » (ou « recherche » si la course n'est pas encore attribuée).

### Impact produit / comportement visible
- Une réservation à 10 000 CDF avec 5 000 d'acompte affiche **5 000 CDF** : le passager ne paie que la deuxième tranche.
- Le chauffeur perçoit sa part sur le **prix total** (acompte compris).
- Une location journalière qui dépasse 21h est facturée **10 $/heure entamée** en plus, avec le détail sur la course.
- Le passager voit sa course s'ouvrir automatiquement quand la réservation démarre.

### Risques & rollback
- **Risque** : la pénalité est calculée **à la clôture** côté serveur ; l'écran de paiement peut afficher le reste sans la pénalité avant rafraîchissement (le montant final enregistré la contient).
- **Rollback** : `git revert` ; les champs ajoutés sont optionnels.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`) et `npm run build` OK
- [x] Edge Function redéployée
- [ ] À confirmer : réservation avec acompte → course affichée au reste ; clôture après 21h → pénalité ; push de démarrage → bascule passager

---

## 2026-11-19 (28) — Réservations : heure locale (UTC+1) respectée + fenêtre d'échéance sûre

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : une réservation saisie à **10:30 heure de Kinshasa** était comparée à l'heure **UTC** du serveur : elle était donc traitée à **11:30** (une heure de retard). Corrigé, avec une fenêtre d'échéance bornée pour éviter tout traitement surprise.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `process-scheduled` : conversion **UTC+1 → UTC** (`BUSINESS_UTC_OFFSET_MINUTES`, défaut 60), comparaisons en millisecondes, chargement jusqu'à J+1, fenêtre « pas plus de 24 h de retard » ; `/admin-process-one` : même conversion pour le garde des 15 min |

### Description technique
L'Edge Function tourne en **UTC** ; `scheduled_time` est stocké en `TIME` (sans fuseau). L'ancien code comparait des chaînes (`'10:30' <= '09:35'`) et construisait `new Date('2026-11-19T10:30')` **en UTC**, soit 11:30 à Kinshasa (UTC+1).
Désormais :
- `startTs()` convertit l'heure locale en UTC : `Date.parse(`${date}T${time}Z`) - offset`.
- L'échéance est calculée en **millisecondes** : `start <= now + 5 min` (au lieu d'une comparaison de chaînes).
- Le rappel H-1 utilise la même base temporelle.
- La requête charge jusqu'à **J+1** (une course à 00:05 doit pouvoir être traitée avant minuit) et ignore les réservations de plus de **24 h** (aucun traitement surprise d'anciennes lignes).
- `/admin-process-one` applique la même conversion au garde des 15 minutes.

### Impact produit / comportement visible
- Une réservation à 10:30 est traitée à **10:30 heure de Kinshasa** (création de la course ~5 min avant, par le cron).
- Un test « dans 10 minutes » est donc réellement honoré à l'heure demandée.

### Risques & rollback
- **Risque** : si le fuseau métier change, ajuster `BUSINESS_UTC_OFFSET_MINUTES` (secret Supabase) sans redéploiement.
- **Rollback** : `git revert`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`) et `npm run build` OK
- [x] Edge Function redéployée ; `POST /rides/process-scheduled` répond sans erreur
- [ ] À confirmer : réservation à +10 min → création à l'heure locale

---

## 2026-11-19 (27) — Réservations : plus de traitement anticipé, démarrage à l'heure notifié

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (flux réservation)
- **Objectif** : une réservation du **19/11/2026 à 10:30** n'a rien déclenché à l'heure prévue. Diagnostic en base : la réservation avait été **« traitée » manuellement à 09:26** (une heure trop tôt) et le push de démarrage n'était **traité par aucun écran**.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `POST /rides/admin-process-one` refuse le traitement plus de **15 min** avant l'heure (`409`, message explicite) |
| `lib/native-push.ts` | Gestion de `reservation_started` (push natif) → événement `fcm-reservation-started` + ouverture du tableau de bord |
| `lib/driver-fcm.ts` | Même gestion côté FCM web (navigateur) |
| `components/driver/DriverDashboardNew.tsx` | Sur `fcm-reservation-started` : chargement de la course, **ouverture directe de la navigation** + **sonnerie et annonce vocale** |

### Description technique
**Chronologie constatée** (réservation `7cac687c…`) : créée à 09:21, acompte espèces confirmé à 09:22, **assignée à Ruth Shole à 09:24**, rappel H-1 envoyé à 09:25, acceptée + présence confirmée à 09:27… mais **statut `completed` dès 09:27** et aucune course au moment prévu. Une course `accepted` avait en réalité été créée à **09:26** par `POST /rides/admin-process-one` (bouton « Traiter / créer la course maintenant » du panneau admin) : la réservation était donc consommée **une heure avant** l'heure demandée, et le push `reservation_started` envoyé à ce moment-là n'était géré par **aucun** `case` de l'app conducteur.

**Correctifs.**
1. **Serveur** : `/rides/admin-process-one` refuse désormais tout traitement à plus de 15 min de l'heure prévue (`SCHEDULED_RIDE_EARLY_MINUTES`, 409 avec la date/heure). Le cycle normal (cron toutes les 5 min) crée la course au bon moment.
2. **App conducteur** : `reservation_started` est traité. Sur réception, l'app charge la course (`/rides/:id`), vérifie qu'elle est bien `accepted/enroute/arrived/in_progress`, reconstruit `pickup`/`destination`, **ouvre l'écran de navigation** et joue la **sonnerie + l'annonce vocale** (même mécanisme que la carte de course).
3. Nettoyage : la course créée trop tôt (`d6f236ae…`) a été annulée (`cancelledBy: system`) et le verrou du conducteur libéré (Ruth : `is_available: true`, aucun `activeRideId`).

### Impact produit / comportement visible
- Une réservation ne peut plus être « consommée » avant l'heure : l'admin est averti s'il essaie.
- À l'heure prévue, la course est créée par le cron, le chauffeur reçoit le push **et** l'app s'ouvre sur la navigation avec sonnerie + voix ; le passager reçoit la notification.
- Plus de réservation « terminée » sans course réelle.

### Risques & rollback
- **Risque** : en cas d'urgence, l'admin ne peut plus forcer une course plus de 15 min avant l'heure (il peut ajuster `SCHEDULED_RIDE_EARLY_MINUTES`).
- **Rollback** : `git revert` ; les données existantes ne sont pas migrées.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`) et `npm run build` OK
- [x] Edge Function redéployée ; course trop-tôt annulée, conducteur libéré
- [x] Analyse de la trace réelle (assignation, rappel H-1, acceptation, présence, traitement anticipé)
- [ ] À confirmer en réel : réservation à venir → à l'heure, ouverture de la navigation + sonnerie côté chauffeur

---

## 2026-11-19 (26) — Courses orphelines : plus aucune course acceptée après le départ du passager

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (flux)
- **Objectif** : un passager a commandé alors que **tous les chauffeurs étaient en course**. Sa demande a bien affiché « aucun chauffeur disponible », mais après qu'un chauffeur a **clôturé sa course**, ce chauffeur s'est retrouvé sur « En route vers le client » pour cette course — alors que le passager était **revenu à son écran d'accueil**. Une course morte pouvait donc être acceptée plus tard.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `findAndNotifyNearbyDrivers` clôt la course (`no_driver_found`) quand **personne** n'a été notifié ; `/rides/accept` refuse (410 `RIDE_EXPIRED`) une recherche expirée |
| `components/passenger/SearchingDriversScreen.tsx` | Annulation systématique si l'écran est quitté pendant la création ; `handleCancel` annule dès qu'une course existe ; variante de l'alerte « demande non enregistrée » avec **Réessayer** |

### Description technique
**Cause racine.** À la création, si aucun chauffeur n'était éligible, `findAndNotifyNearbyDrivers` faisait un simple `return` : **aucun `setTimeout` de fin de recherche n'était programmé**. La course restait donc `searching` indéfiniment (les expirations existantes ne s'appliquent qu'à la lecture du statut ou au matching lancé). Elle pouvait ensuite être acceptée par un chauffeur qui venait de se libérer, sans passager en face (course orpheline). Deuxième faille : côté passager, `handleCancel` n'annulait que si `phase === 'notifying'` **et** qu'une course locale existait déjà ; si l'utilisateur quittait pendant l'envoi, la réponse créait la course après le départ → orpheline également.

**Correctifs.**
1. **Serveur** : si `eligibleDrivers.length === 0`, la course passe **immédiatement** en `no_driver_found` (avec `noDriverFoundAt`), le `matching:` est supprimé et la réponse contient `reason: 'no_drivers_available'`. Plus aucune course morte ne traîne.
2. **Serveur** : `/rides/accept` refuse désormais une course `searching` plus vieille que `MATCHING_TIMEOUT_MS + 15 s` (HTTP **410 `RIDE_EXPIRED`**) et la clôture au passage.
3. **Client** : si la réponse de création arrive alors que l'écran a été quitté, la course est **annulée** (`/rides/cancel`, `cancelledBy: passenger`) au lieu d'être laissée active.
4. **Client** : `handleCancel` annule dès qu'une course existe (plus de condition sur la phase).
5. **Client** : quand le serveur répond `no_drivers_available`, on **ne navigue plus** vers l'écran de course : l'alerte affiche « Votre demande n'a pas été enregistrée » avec **Réessayer** / **Retour**.

### Impact produit / comportement visible
- Plus de course fantôme : après le départ du passager, aucun chauffeur ne peut être envoyé « en route vers le client ».
- Quand aucun chauffeur n'est disponible, la réponse est **honnête et immédiate** (aucune course laissée en attente), avec possibilité de réessayer ou de changer de catégorie.
- Les chauffeurs ne voient plus de course expirée : une acceptation tardive est refusée avec un message clair.

### Risques & rollback
- **Risque** : un passager qui commande pile au moment où un chauffeur se connecte peut recevoir « aucun chauffeur » et devoir relancer (auparavant, la course restait ouverte mais sans notification : elle n'aurait pas abouti non plus).
- **Rollback** : `git revert` (aucune migration de données).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`) et `npm run build` OK
- [x] Edge Function redéployée
- [x] Lecture du code : plus aucun chemin où une course reste `searching` sans timeout ni notification
- [ ] À confirmer : commande sans chauffeur → « demande non enregistrée » ; acceptation tardive refusée

---

## 2026-11-19 (25) — Paiement : Ejpay réactivé, solde réel, alerte « aucun chauffeur »

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Autor** : agent OpenCode
- **Type** : fix
- **Objectif** : (1) « Paiement Ejpay désactivé » au moment de payer en Mobile Money / Espèces + Mobile Money ; (2) l'écran de paiement affichait **Solde : 0 CDF** alors que le compte avait **1 000 CDF** ; (3) lorsqu'aucun chauffeur de la catégorie demandée n'est en ligne, prévenir immédiatement le passager et proposer les autres catégories.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/PaymentScreen.tsx` | Solde relu sur le serveur à l'ouverture (et état global resynchronisé) ; méthodes Mobile Money désactivées/affichent « Indisponible » si le fournisseur est inactif ; garde avant saisie |
| `components/passenger/EstimateScreen.tsx` | Pré-sélection de la catégorie suggérée (`smartcabb_preferred_category`) |
| `components/passenger/SearchingDriversScreen.tsx` | Alerte immédiate « aucun chauffeur dans cette catégorie » + liste des catégories disponibles (compteurs) + « Continuer d'attendre » / « Annuler » |
| Configuration Supabase | `ejpayEnabled` repassé à **true** (le fournisseur était déjà configuré et authentifié) |

### Description technique
**1. Ejpay n'était pas en cause.** `/ejpay/health` renvoyait `configured: true`, `oauthOk: true`, `callbackConfigured: true`, mais `enabled: false`. Le message venait donc de **notre drapeau** `ejpayEnabled` de `smartcabb_global_config` (probablement perdu lors de la remise à zéro de la config). Il a été réactivé via `/config/update` (`enabled: true` confirmé par `/ejpay/health`). Par sécurité, l'écran de paiement interroge désormais `/ejpay/config` : si le fournisseur est désactivé, les cartes « Mobile Money » et « Espèces + Mobile Money » affichent **« Indisponible pour le moment »** et la confirmation est bloquée avec un message clair, au lieu d'une erreur serveur après saisie du numéro.
**2. Solde périmé.** L'écran lisait `state.currentUser.balance/walletBalance`, figé à 0 depuis la connexion. Il appelle maintenant `GET /passengers/:id/balance` au montage (serveur : **1 000 CDF**) et met à jour l'état global. La ligne « Solde » et le contrôle « solde insuffisant » utilisent cette valeur fraîche.
**3. Aucun chauffeur pour la catégorie.** Dès la première réponse de `check-drivers-availability` avec `driversCount = 0`, une alerte s'affiche (une seule fois) :
   - si d'autres catégories ont des chauffeurs en ligne (`alternatives`), elles sont listées avec leur nombre de disponibles ; un appui **annule la recherche en cours**, mémorise la catégorie (`smartcabb_preferred_category`) et revient à l'estimation avec **cette catégorie pré-sélectionnée** ;
   - sinon (« aucun chauffeur connecté »), l'utilisateur peut annuler ou continuer d'attendre.
   L'utilisateur garde toujours la possibilité de continuer d'attendre (les chauffeurs peuvent se connecter entre-temps).

### Impact produit / comportement visible
- Le paiement Mobile Money refonctionne (Airtel/Orange/M-Pesa/Afrimoney) et le message « désactivé » ne peut plus apparaître sans explication.
- Le portefeuille affiche le **vrai solde** (1 000 CDF au lieu de 0).
- Le passager est prévenu **tout de suite** si sa catégorie n'a personne en ligne, avec une bascule en un geste vers une catégorie disponible.

### Risques & rollback
- **Risque** : Ejpay est maintenant actif en production ; un incident fournisseur impacte Mobile Money (les paiements Espèces/Portefeuille restent disponibles).
- **Rollback** : `/config/update { ejpayEnabled: false }` pour couper Mobile Money immédiatement (l'UI l'affichera comme indisponible).

### Tests / vérifications
- [x] `/ejpay/health` → `enabled: true`, `configured: true`, `oauthOk: true`
- [x] `/passengers/9aa1654b…/balance` → **1 000 CDF** (3 sources concordantes)
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`) et `npm run build` OK
- [ ] À confirmer : paiement Mobile Money réel, solde affiché, alerte de catégorie sur téléphone

---

## 2026-11-19 (24) — Carte « course en cours » (itinéraire + alternatives), Storage privé

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat / security
- **Objectif** : (1) l'écran passager « Course en cours » affichait une **zone noire** au lieu d'une carte (Google Maps inactif) ; (2) afficher la course **en temps réel**, **tracer l'itinéraire** et proposer des **itinéraires alternatifs** (comme Uber/Yango) ; (3) passer le bucket des photos en **privé** (URLs signées).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/RideInProgressScreen.tsx` | `provider="osm"` (carte intérimaire), itinéraire temps réel + **sélecteur d'itinéraires** (recommandé / alternatives) |
| `hooks/useRoutePlan.ts` | **Nouveau** : OSRM `alternatives=true`, 3 itinéraires max, recalcul débouncé (600 ms) et seulement si le départ bouge de 150 m |
| `components/OpenStreetMapView.tsx` | Prop `routes` : tracé des itinéraires (liseré blanc + bleu pour l'actif, gris pointillé pour les alternatives) + cadrage sur l'itinéraire actif |
| `components/MapView.tsx` | Prop `provider` (`auto`/`osm`/`google`) ; `routes` transmises à OSM ; centre figé si `disableAutoCenter` ; **bascule OSM automatique si Google ne rend rien après 7 s** |
| `supabase/functions/make-server-2eb02e52/photo-storage.ts` | `signPhotoPath()`, `setBucketPrivate()`, `refreshPhotoUrls()` ; `storePhotoDataUrl()` renvoie une URL **signée** |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | `POST /drivers/migrate-photos` : modes `migrate` / `rewrite-urls` / `private` |

### Description technique
**1. Carte intérimaire + itinéraire.** `MapView` accepte `provider="osm"` : l'écran de course affiche directement OpenStreetMap (aucune clé, aucun billing), avec la position du conducteur rafraîchie toutes les 3 s (`GET /rides/:id` → `driverLocation`). `OpenStreetMapView` accepte désormais `routes: [{ id, path, active }]` et dessine un liseré blanc + une ligne bleue (actif) ou grise pointillée (alternatives), puis cadre sur l'itinéraire actif.
**2. Alternatives (Uber/Yango).** `useRoutePlan` interroge OSRM (`router.project-osrm.org`, sans clé) avec `alternatives=true&geometries=geojson&overview=full` → jusqu'à 3 itinéraires (durée + distance). Recalcul **débouncé** (600 ms) et seulement si la destination change ou si le conducteur a bougé de **150 m** (pas d'appel à chaque tick GPS). Pendant l'approche : itinéraire vers le point de prise en charge ; une fois la facturation commencée : itinéraire vers la destination. Des **pastilles** (« Recommandé », « Alternative 1/2 ») avec durée et distance permettent de changer d'itinéraire, comme chez Uber.
**3. Filet anti-carte noire.** Si Google Maps n'a pas produit son conteneur (`.gm-style`) au bout de 7 s, `MapView` bascule automatiquement sur OpenStreetMap — quel que soit l'écran, y compris sur iPhone où l'échec ne lève aucune erreur JS.
**4. Storage privé.** Le bucket `avatars` est passé en **privé**. Les `photo_url` de **37 fiches** ont été réécrites en **URLs signées** (validité 1 an, re-signées à chaque nouvelle photo). Vérifié : URL signée → **200** (`image/jpeg`), ancienne URL publique sans jeton → **400**. Les nouvelles photos (inscription, mise à jour du profil) sont téléversées puis signées directement.

### Impact produit / comportement visible
- L'écran « Course en cours » affiche une **vraie carte**, le **tracé de l'itinéraire** en bleu, et la **position du conducteur en direct**.
- Le passager peut choisir entre l'itinéraire recommandé et des alternatives (durée/distance affichées).
- Les photos ne sont plus accessibles sans URL signée ; les avatars continuent de s'afficher normalement.

### Risques & rollback
- **Risque** : OSRM public (débit limité) ; les itinéraires déjà calculés sont conservés en cas d'échec, et le recalcul est espacé.
- **Risque** : les URLs signées expirent au bout d'un an ; elles sont re-signées lors d'un changement de photo (et peuvent l'être en masse via `mode=rewrite-urls`).
- **Rollback** : `provider="auto"` pour revenir à Google en priorité ; `setBucketPrivate` peut être annulé (`updateBucket public: true`) et `rewrite-urls` rejoué.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`) et `npm run build` OK
- [x] Storage : 37 URLs signées, bucket privé, image **200**, URL publique **400**
- [x] Route de maintenance refermée (**403**) après retrait du jeton
- [x] Fiche conducteur : **4,2 Ko**, `photo_url` en `object/sign`
- [ ] À confirmer visuellement sur téléphone : carte OSM, tracé et sélecteur d'itinéraires

---

## 2026-11-19 (23) — Photos de profil : base64 → Supabase Storage (budget d'E/S disque)

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : perf / chore
- **Objectif** : le projet Supabase affichait « budget d'E/S disque presque épuisé » (au-delà : débit plafonné à 5 Mo/s). Cause principale : les photos de profil étaient stockées **en base64 dans le KV** (jusqu'à 1,3 Mo par fiche ; PostgreSQL les stocke hors ligne et les relit à chaque lecture). Objectif : sortir ces images du JSONB et supprimer l'ancienne fonction Edge inutilisée.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/photo-storage.ts` | **Nouveau** : décodage des data URLs, bucket public `avatars`, migration idempotente (`migrateProfilePhotos`), téléversement à l'écriture (`storePhotoDataUrl`) |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | `POST /migrate-photos` (jeton temporaire `PHOTO_MIGRATION_TOKEN`) ; `POST /signup` et `POST /:driverId/update` téléversent les photos au lieu de stocker du base64 |
| Supabase | Fonction Edge `make-server-fe68ee11` (5 mois, inutilisée) **supprimée** ; bucket `avatars` créé (public) ; secret `PHOTO_MIGRATION_TOKEN` posé puis **retiré** |

### Description technique
- **Migration exécutée en production** : 107 fiches scannées → **37 photos migrées (8,49 Mo)**, `0` restante. Pour chaque fiche : décodage `data:image/…;base64` → téléversement `avatars/<drivers|vehicles|profiles|passengers>/<id>.<ext>` → **vérification** → réécriture de la fiche avec `photo_url` (URL publique + `?v=<timestamp>`), `photo_storage_path`, `photo_migrated_at`, et **suppression** de `profile_photo`/`photo`/`avatar`. En cas d'échec du téléversement, la fiche reste **intacte** (aucune perte de photo). Opération **idempotente**, par lots (`limit`) pour rester sous la limite de temps de la fonction.
- **Pas de régression à l'écriture** : l'inscription et la mise à jour du profil téléversent désormais l'image dans Storage et n'enregistrent que `photo_url` (repli base64 uniquement si le téléversement échoue). Le front lit déjà `photo || photo_url || profile_photo`.
- **Accès** : la route de migration est protégée par `x-migration-token` = secret `PHOTO_MIGRATION_TOKEN`. Le secret a été **retiré** après l'opération : la route répond maintenant **403**.

### Impact produit / comportement visible
- **E/S disque fortement réduites** (les photos ne sont plus relues dans chaque requête).
- `GET /drivers/:id` : **~3 550 Ko → ~2 Ko** (la photo est servie par Storage, avec cache navigateur).
- `GET /drivers` (admin) : **5,15 Mo / 72 s → 0,04 Mo / 1,85 s**.
- `debug-drivers` : ~2,4 s → **0,86 s** ; `online-drivers` : **0,33 s**.
- Les avatars continuent de s'afficher (vérifié : URL Storage HTTP 200, `image/jpeg`).

### Risques & rollback
- **Risque** : bucket `avatars` **public** — les URLs sont non devinables mais accessibles sans authentification (comme l'était l'API avec la clé anon). Si un accès strictement privé devient nécessaire : passer au bucket privé + URLs signées.
- **Risque** : une nouvelle photo envoyée en base64 par un client ancien est téléversée automatiquement ; en cas d'échec Storage, elle reste en base64 (fiche plus lourde, mais rien n'est perdu).
- **Rollback** : le code peut être reverté ; les photos restent dans Storage et les fiches gardent leur `photo_url` (aucune donnée à restaurer).

### Tests / vérifications
- [x] Simulation puis migration réelle : **37/37 photos**, 8,49 Mo libérés, 0 échec final
- [x] `GET /drivers/28501b8f…` → 2 Ko (avant 3 550 Ko) ; `photo_url` téléchargeable (HTTP 200, `image/jpeg`, 887 Ko)
- [x] `GET /drivers` → 0,04 Mo / 1,85 s ; `debug-drivers` 0,86 s ; `online-drivers` 0,33 s
- [x] Route `POST /drivers/migrate-photos` → **403** après retrait du secret
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`) et `npm run build` OK
- [x] Fonction `make-server-fe68ee11` absente de la liste (seule `make-server-2eb02e52` reste)
- [x] Config intacte après déploiement (taux 2250, commission 20, SOS actif)

---

## 2026-11-19 (22) — **Régression critique : la course n'était plus créée** (requête annulée)

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix (régression)
- **Objectif** : après le passage en production du nouvel écran de recherche, **aucune course n'était créée** : le conducteur ne recevait ni notification ni son et ne pouvait évidemment pas accepter.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/SearchingDriversScreen.tsx` | L'effet de création ne dépend plus de `phase` (seulement `pendingRide` + `retryToken`) ; `handleRetry` incrémente `retryToken` |

### Description technique
Régression introduite par l'entrée (20). L'effet qui appelle `POST /rides/create` avait pour dépendances `[phase, pendingRide]` **et** un `AbortController` annulé dans son nettoyage. Au moment où `run()` fait `setPhase('notifying')`, React relance l'effet : le nettoyage **abortait la requête de création en vol**. `run()` sortait alors sur `if (cancelled) return` sans afficher d'erreur : l'écran restait en « envoi de la demande », **aucune course n'existait côté serveur** (confirmé : aucun événement `ride_created` dans le journal).
Correctif : l'effet ne dépend plus de `phase` (le changement de phase ne peut plus l'interrompre) ; le bouton « Continuer » relance via un compteur `retryToken`. Le nettoyage n'abandonne plus que lors d'un **démontage réel** de l'écran.
Pourquoi cela fonctionnait avant : l'ancien code n'avait pas d'`AbortController` (le `fetch` survivait au nettoyage) et `apiCalled` bloquait la relance — d'où le succès de la course de 04:59 et l'échec de toutes les suivantes.

### Impact produit / comportement visible
- Une commande crée **à nouveau** la course : le conducteur reçoit la notification (push + son) et la carte d'acceptation (30 s).
- En cas d'échec réel, le message d'erreur s'affiche (plus de blocage silencieux).

### Risques & rollback
- **Risque** : faible — retour au comportement antérieur (dépendances restreintes).
- **Rollback** : `git revert`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npm run build` OK
- [x] Analyse : `AbortController` + dépendance `phase` = annulation systématique au passage `searching → notifying`
- [x] Côté serveur (déjà validé) : `/rides/create` → `driversNotified=1`, trace `ride_created`, `/rides/pending/:driver` renvoie la course
- [ ] À confirmer : commande réelle passager → notification + son + acceptation conducteur

---

## 2026-11-19 (21) — Voix Android (TTS) fiabilisée, fenêtre d'acceptation alignée

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : sur iPhone (Safari) la voix parle ; sur l'**APK Android** la sonnerie fonctionne mais **la voix ne parle pas** et le diagnostic restait sur « vérification… ». Le conducteur doit aussi pouvoir **accepter la course** sans que la fenêtre se referme trop tôt. Retrait de l'icône de test audio (passage en production).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/native-tts.ts` | `withTimeout()` autour des appels natifs (`stop` 3 s, `speak` 15 s, `getSupportedLanguages` 3 s) ; `nativeTTSCheck()` renvoie une **raison** (`plugin_absent` / `engine_timeout` / `error`) |
| `lib/notification-sound.ts` | Repli sur la voix de la WebView si elle a des voix ; sinon événement `smartcabb:voice-unavailable` (au lieu d'un silence inexpliqué) |
| `components/driver/DriverDashboardNew.tsx` | Retrait du bouton 🔊 ; bandeau d'aide « voix indisponible » (une fois, refermable) ; test du moteur TTS au démarrage ; **carte de course 30 s** ; plus de FCM web sur l'APK |
| `components/driver/FCMDiagnostic.tsx` | Garde-fous natifs (`Notification` absent, actions FCM web sans objet) ; état du moteur TTS avec délai |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `MATCHING_TIMEOUT_MS` 30 s → **35 s** (marge au-dessus des 30 s de la carte) |

### Description technique
**1. Voix Android — cause.** Sur le téléphone testé, l'appel au moteur TTS natif ne rendait **jamais** la main (aucun moteur TTS / aucune voix installée) : la promesse restait en attente, l'écran affichait « vérification… » et l'annonce ne partait pas. Tous les appels natifs sont désormais bornés dans le temps ; l'échec est **explicite** et remonte à l'interface. Si la WebView possède des voix (fréquent sur iOS), on y bascule ; sinon le conducteur voit une consigne unique et refermable : *Paramètres Android → Synthèse vocale → Voix françaises*. Le test est aussi fait au démarrage du tableau de bord (3 s max), donc l'information apparaît même sans course.
**2. Acceptation de la course.** La carte `RideNotification` était configurée à **15 s** (`timeoutSeconds={15}`) alors que le serveur laisse la course ouverte 30 s : au-delà de 15 s le composant appelait `/rides/decline` → le conducteur ne pouvait plus accepter (et il était le seul en ligne). La carte reste maintenant **30 s** et le serveur attend **35 s**, ce qui laisse le temps d'ouvrir l'app, d'écouter l'annonce et d'appuyer sur **Accepter** (→ écran `driver-navigation`).
**3. Bruit FCM sur l'APK.** Le tableau de bord appelait le chemin FCM **web** même dans l'APK, où `Notification` n'existe pas : logs `Notification is not defined`, « Échec du rafraîchissement », et risque d'effacer l'état d'enregistrement local. Sur natif, seul `initNativePush()` (DriverApp) gère le token ; le panneau de diagnostic explique désormais que ces actions sont gérées par le plugin natif.
**4. Production.** L'icône 🔊 (diagnostic) est retirée de l'en-tête conducteur ; le panneau reste dans le code mais n'est plus exposé.

### Impact produit / comportement visible
- Android : la sonnerie continue de fonctionner ; si le téléphone n'a pas de moteur de voix, un message clair indique comment l'installer (au lieu d'un silence).
- iPhone : comportement inchangé (voix du navigateur, vérifiée par le conducteur).
- Le conducteur a **30 s** pour accepter une course ; l'acceptation mène bien à l'écran de navigation.
- Plus d'erreurs FCM trompeuses dans l'app native.

### Risques & rollback
- **Risque** : un moteur TTS lent (> 15 s) verrait son annonce coupée ; les messages sont courts, le seuil est large.
- **Risque** : fenêtre d'acceptation plus longue = passager qui attend jusqu'à 35 s avant `no_driver_found` (auparavant 30 s).
- **Rollback** : `git revert` (aucune donnée migrée).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npm run build` OK ; Edge Function redéployée
- [x] Constat utilisateur intégré : iPhone = voix OK ; Android = sonnerie sans voix + diagnostic bloqué sur « vérification… »
- [ ] À confirmer sur le téléphone Android : bandeau d'aide affiché, puis voix après installation d'une voix française
- [ ] À confirmer : course acceptée dans les 30 s → écran de navigation

---

## 2026-11-19 (20) — Taux de change stable, création de course fiable, diagnostic voix

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix / security / perf
- **Objectif** : trois incidents signalés — (1) le **taux de change changeait tout seul** dans le panneau admin ; (2) après une course terminée, une **deuxième course n'était jamais notifiée** au conducteur ; (3) sur téléphone, la **sonnerie/voix** ne se déclenchait pas alors qu'elle fonctionnait sur ordinateur.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | Lecture stricte de la config (retries), **plus aucune écriture des valeurs par défaut** en cas d'échec, version toujours croissante, garde-fous numériques |
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | `/admin/settings/load` et `/save` alignés (503 + jamais de défauts, `configVersion` incrémentée) |
| `lib/config-sync.ts` | `fetchGlobalConfigStrict()` ; `saveGlobalConfig()` relit la config **serveur** avant d'écrire (plus de base « cache vide / défauts ») |
| `hooks/useGlobalConfig.ts` | Expose `loaded` (config réellement lue sur le serveur) ; cache local uniquement pour l'affichage |
| `components/admin/GlobalSettingsScreen.tsx` | Sauvegarde bloquée tant que `loaded` est faux + bandeau d'alerte explicite |
| `components/admin/SettingsScreen.tsx` | Taux/commission lus sur le serveur au montage, sauvegarde bloquée sans lecture, taux écrit via `/config/update` (chemin unique) |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `/rides/create` : idempotence (`clientRequestId`), écriture KV retentée, trace `ride_created`/`ride_create_failed`, matching non bloquant |
| `components/passenger/SearchingDriversScreen.tsx` | `clientRequestId` stable, timeout 25 s, **3 tentatives** sur erreurs transitoires (réseau/5xx/503), message d'erreur clair |
| `components/passenger/EstimateScreen.tsx` | Filet de sécurité : `isBooking` retombe après 20 s (bouton jamais bloqué) |
| `components/driver/FCMDiagnostic.tsx` | Bouton « 🔊 Test Sonnerie + Voix » + état du moteur TTS (voix française installée ou non) |
| `components/driver/DriverDashboardNew.tsx` | Bouton 🔊 dans l'en-tête : ouvre le panneau de diagnostic (il était inaccessible) |

### Description technique
**1. Taux de change — cause racine.** `GET /config/get` lisait le KV avec un helper qui renvoie `null` aussi bien pour « clé absente » que pour « base momentanément indisponible ». Le handler interprétait ce `null` comme une première utilisation et **réécrivait `smartcabb_global_config` avec `DEFAULT_CONFIG`** (taux `2500`, commission `10`, `configVersion` remis à 1, **numéros SOS effacés et `emergencySmsEnabled` à `false`**). Preuves en production : `configVersion` retombé 4 → 1 le 19/11 à 04:58, taux réel 2250, SOS désactivé.
Correctifs : `kvGetStrict` (3 tentatives) ; sur échec → **503 `CONFIG_UNAVAILABLE`** et **aucune écriture** ; `configVersion = max(version serveur, version reçue) + 1` ; les champs numériques critiques (`exchangeRate`, `commissionRate`) retombent sur la valeur stockée si la valeur reçue est `NaN`/0/absente. Même traitement sur l'ancienne route `/admin/settings/save`.
Côté admin, les deux écrans pouvaient afficher un défaut (`2500`/`2850`) quand le cache local était vide, puis le sauvegarder : ils lisent désormais le serveur (`fetchGlobalConfigStrict`) et **la sauvegarde est impossible tant que la config n'est pas chargée**. `saveGlobalConfig` relit le serveur avant de composer l'écriture : plus de réinitialisation accidentelle.
Numéros SOS restaurés via `/config/update` : `support=0960624008`, `supportTech=0990666661`, `emergencySmsEnabled=true`.

**2. Deuxième course sans notification.** Vérifications en production : FCM opérationnel (`/fcm/test-notification` → message accepté par Google), canal Android `smartcabb_rides` déjà créé par `lib/native-push.ts`, aucun passager bloqué, **et aucune course créée après celle de 04:59** — le problème était donc la **création** elle-même, pas le matching.
`/rides/create` :
- **idempotence** : `clientRequestId` → clé `ride_req:<id>` ; un réessai renvoie la même course (testé : même `rideId`, 1 s) ;
- **écriture retentée** (3 essais, 0/250/800 ms) ; si elle échoue : `503 RIDE_CREATE_UNAVAILABLE` + événement `ride_create_failed` au lieu d'une 500 opaque ;
- **trace** `ride_created` dans le journal admin (catégorie, départ/arrivée, passager) ;
- le matching est enveloppé : une erreur de matching ne peut plus faire échouer une course déjà enregistrée.
Client : identifiant de tentative stable, timeout de 25 s, 3 tentatives sur erreurs transitoires (même identifiant → aucun doublon), message « Service momentanément indisponible » après épuisement. `EstimateScreen` remet `isBooking` à `false` après 20 s pour qu'un bouton ne reste jamais grisé.

**3. Sonnerie / voix sur téléphone.** Diagnostic ajouté dans le panneau « Diagnostic FCM » du tableau de bord conducteur : bouton **Test Sonnerie + Voix** et état du moteur TTS (`nativeTTSCheck`). Sur APK, la voix passe par le plugin natif `@capacitor-community/text-to-speech` (déjà embarqué : `android/app/src/main/assets/capacitor.plugins.json`) ; si le téléphone n'a **aucune voix française installée**, l'écran l'indique explicitement et donne la marche à suivre (Paramètres Android → Synthèse vocale).

### Impact produit / comportement visible
- Le taux de change et la commission ne bougent plus seuls ; le panneau admin refuse de sauvegarder une config qu'il n'a pas pu lire (message clair) au lieu d'écrire des valeurs par défaut.
- Les **numéros SOS et les SMS d'urgence sont rétablis** (ils avaient été effacés par le même bug).
- Une commande ne peut plus « ne rien faire » : soit la course est créée (et notifiée), soit un message explicite propose de réessayer ; aucun doublon possible.
- Le conducteur peut tester sonnerie + voix depuis son tableau de bord et savoir si son téléphone a une voix française.
- Le journal admin affiche les créations de course (`ride_created`) et les échecs d'enregistrement (`ride_create_failed`).

### Risques & rollback
- **Risque** : `/config/get` peut renvoyer 503 si la base est réellement indisponible — les clients basculent alors sur leur cache (comportement prévu) ; l'admin ne peut pas sauvegarder pendant cette fenêtre.
- **Risque** : l'idempotence s'appuie sur `ride_req:<clientRequestId>` (TTL non appliqué) ; volume négligeable (une clé par tentative).
- **Rollback** : `git revert` de ce commit ; les numéros SOS et le taux restent en KV (aucune migration de données à défaire).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npm run build` OK
- [x] `/config/get` → taux 2250, commission 20 ; `/config/update` partiel → **valeur conservée**, version 1 → 2 → 3
- [x] SOS vérifié après restauration : `support=0960624008`, `supportTech=0990666661`, `emergencySmsEnabled=true`
- [x] `/rides/create` réel : `driversNotified=1` (Fabrice), trace `ride_created` ; second appel même `rideId` (idempotence) ; annulation de test nettoyée
- [x] `/fcm/test-notification` → `success: true` (Google accepte le message)
- [ ] À confirmer par le conducteur : notification reçue sur le téléphone (app ouverte **et** fermée) et annonce vocale audible

---

## 2026-11-19 (19) — Fiches conducteur auto-réparées, carte « bonhomme + chauffeurs », recherche rapide

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix / perf / ui
- **Objectif** : la recherche de chauffeur restait sur « Chargement… » alors qu'un conducteur était en ligne ; sur la carte, le passager était affiché avec une **icône de véhicule** au lieu d'un bonhomme et les conducteurs connectés n'apparaissaient pas.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/driver-records.ts` | **Nouveau** : lecture allégée des conducteurs (projection JSON, retries), reconstruction des fiches perdues, lecture ciblée de position, purge des fiches fantômes |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `check-drivers-availability` (503 explicite + positions), `GET /online-drivers`, `toMapDrivers`, lectures allégées, `repairStaleLocksInList` qui ne réécrit plus les objets partiels, `POST /repair-drivers` (secret admin) |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | `loadDriverOrRebuild`, plus de fiche vierge écrasant une vraie fiche, lecture ciblée de la position, invalidation du cache |
| `supabase/functions/make-server-2eb02e52/fcm-routes.ts` | `register-driver-token` : lecture stricte, reconstruction au lieu d'une coquille `pending`, 503 si la base est illisible, 404 sans création |
| `supabase/functions/make-server-2eb02e52/auth-routes.ts` | Connexion : lecture stricte du profil (plus de réécriture d'un profil/conducteur vierge) |
| `components/map/mapMarkers.ts` | **Nouveau** : icônes uniques (bonhomme, voiture chauffeur, épingle destination, véhicule suivi, pastille générique) |
| `components/OpenStreetMapView.tsx` | Marqueurs typés (départ/arrivée/véhicule/chauffeurs/utilisateur), synchronisation par clé, cadrage stable |
| `components/MapView.tsx` | Repli OSM : plus de liste plate (le départ n'est plus une voiture), bandeau discret, `userRole` |
| `components/passenger/SearchingDriversMap.tsx` | Enveloppe autour de `OpenStreetMapView` (une seule implémentation) |
| `components/passenger/SearchingDriversScreen.tsx` | Sondage séquentiel (plus d'empilement), libellés exacts, `driversLoaded`/`driversFailing` |
| `components/RouteMapPreview.tsx`, `components/passenger/MapScreen.tsx` | Conducteurs connectés affichés sur les cartes passager |
| `hooks/useNearbyDrivers.ts` | **Nouveau** : sondage séquentiel des conducteurs en ligne (distance, pause en arrière-plan) |
| `components/driver/GPSNavigationScreen.tsx` | `userRole="driver"` (le conducteur se voit comme une voiture) |
| `components/GoogleMapView.tsx` | Marqueur de départ = bonhomme (au lieu de 🚗) |
| `hooks/useTranslation.ts` | Nouvelles clés FR/EN (chauffeurs disponibles, connexion lente, aucun chauffeur…) |

### Description technique
**Cause racine de la lenteur / « Chargement… »** : chaque fiche `driver:<id>` embarque la photo de profil en **base64** (jusqu'à 1,3 Mo). Lire tous les conducteurs (`like 'driver:%'`) renvoyait **~5,15 Mo** et prenait **~72 s** ; en cas d'échec, le helper renvoyait `[]` en silence → « chargement » infini ou « aucun chauffeur ». Mesure après correctif : `/rides/online-drivers` **0,5–0,9 s**, `check-drivers-availability` **0,6–0,9 s**.
- `loadDriversLite()` : projection PostgREST (`value->champ`) limitée aux champs utiles (statut, catégorie, position, solde, token…), sans photos ; 3 tentatives ; repli « lecture complète sans images » ; **lève une erreur** si la base reste indisponible (le client reçoit 503 et réessaie au lieu d'un faux « 0 chauffeur »). Instantané partagé de 3 s pour les lectures répétées des cartes.
- Fermeture d'un piège de données : `register-driver-token`, `GET /drivers/:id`, `/update-driver-location` et la connexion pouvaient **écraser une vraie fiche** par une coquille (`status: 'pending'`, solde 0) quand la lecture échouait. Ils utilisent désormais une lecture stricte + reconstruction ; plus aucune fiche « à vide » n'est créée.
- `rebuildDriverRecord()` reconstruit depuis `profile:<id>` (nom, téléphone, véhicule, solde réel), Supabase Auth et l'historique (`ride:`, recharges `wallet_tx:`) ; exige un compte Auth existant ; l'approbation n'est reprise que sur preuve (profil approuvé ou courses effectuées).
- Carte : `OpenStreetMapView` accepte `pickup`/`destination`/`vehicle`/`drivers`/`userMarker` ; le passager est un **bonhomme** (halo pulsant), chaque conducteur une **voiture avec son prénom** (grisée s'il est en course), la destination une épingle rouge. Les marqueurs sont synchronisés par clé (pas de clignotement) et le cadrage ne change que lorsque l'ensemble affiché change.
- `GET /rides/online-drivers?lat=&lng=` : conducteurs connectés + position (prénom, distance, disponibilité), rayon 25 km, 50 max, sans téléphone ni photo.

### Impact produit / comportement visible
- Le passager voit immédiatement **combien de chauffeurs sont connectés** (ou un message honnête « aucun chauffeur connecté à proximité » / « connexion lente, nouvelle tentative »), au lieu d'un « Chargement… » sans fin.
- Sur les cartes de repli OSM (tant que la facturation Google Maps n'est pas active), **le passager est un bonhomme et les conducteurs connectés sont visibles** avec leur prénom ; l'écran « Prix estimé » et la carte d'accueil affichent aussi les conducteurs.
- Fiche de Ruth Shole restaurée (approuvée, Toyota Runx, solde réel 104 880 CDF, token push conservé) ; fiche fantôme « Conducteur » créée par erreur supprimée.
- Les écrans de suivi lisent la position par une requête ciblée (au lieu de recharger la fiche complète, ~3,5 Mo, à chaque sondage).

### Risques & rollback
- **Risque** : la projection JSON dépend de PostgREST (`value->champ`) ; un repli automatique sur la lecture complète (sans images) est prévu.
- **Risque** : `POST /rides/repair-drivers` est une opération lourde ; elle exige désormais l'en-tête `x-admin-secret` (`EJPAY_ADMIN_SECRET` ou `ADMIN_CREATION_SECRET`).
- **Rollback** : `git revert` ; les fiches reconstruites restent en KV (elles sont valides et tracées par `recoveredFrom`/`recoveredAt`).

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npm run build` OK ; Edge Function déployée
- [x] Avant/après : `/drivers` ~5,15 Mo / 72 s → lecture allégée 0,5–0,9 s ; `debug-drivers` 24 conducteurs
- [x] Réparation : `POST /rides/repair-drivers` → 1 fiche reconstruite (Ruth), 1 fantôme purgé, 0 coquille restante
- [x] Positions renvoyées : `online-drivers` et `check-drivers-availability` exposent `lat`/`lng`/`distanceKm`
- [x] Rendu des marqueurs vérifié sur une page de test (3 cartes, aucun emoji 🚗, bonhomme/voitures/épingle conformes, tous les marqueurs dans le cadre)
- [x] `POST /rides/repair-drivers` sans secret → **403**

---

## 2026-11-19 (18) — Écran de recherche : variante « vue de dessus » (plan de quartier)

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : ui / design
- **Objectif** : proposer une lecture plus parlante pour le passager qui attend : au lieu d'un gros plan sur un véhicule, montrer **le quartier vu de dessus** avec plusieurs voitures, un repère et l'itinéraire — tout en gardant les animations. Les deux variantes coexistent, la vue de dessus devient celle utilisée par défaut sur l'écran de recherche.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/SearchingDriverIllustration.tsx` | Ajout de la prop `variant: 'map' \| 'car'` (défaut `map`), nouvelle scène `MapScene`, factorisation du calcul du balayage radar (`buildBeams`), nouvelles animations CSS (`sdr-drift-*`, `sdr-glow`, `sdr-sonar`, `sdr-route`) |

### Description technique
- `buildBeams(cx, cy, r, maxOpacity)` génère l'éventail radar (12 parts de 5°, opacité croissante) + le bord d'attaque, **réutilisé par les deux scènes** (centre `(66,69)` pour la carte, `(100,104)` pour le gros plan).
- **Scène `map`** : disque carte (`#F6FBFF → #C9E1F7`), 9 îlots arrondis (`#CFE4F7`), 3 rues blanches avec marquages pointillés, 4 véhicules vus de dessus (1 mis en avant en bleu SmartCabb avec halo + sonar, 3 autres en gris-bleu), repère jaune et **itinéraire pointillé** entre le repère et le véhicule.
- Animations (toutes `transform`/`opacity`, GPU) :
  - balayage radar autour du **véhicule mis en avant** (`transform-origin` inline sur `66px 69px`, `transform-box: view-box`) ;
  - halo qui respire + **onde sonar** qui s'étend depuis ce véhicule ;
  - **trois véhicules qui circulent** lentement le long de leur rue (aller-retour 8 / 9 / 10 s) — chaque `<g>` déplacé est un enfant du groupe portant le `transform` de position/rotation, les deux transforms se composent ;
  - **itinéraire en chenillard** (`stroke-dashoffset` −20, 1,4 s, boucle sans saut : période du motif = 10) ;
  - repère qui saute + halo qui pulse, ondes concentriques externes (inchangées).
- `prefers-reduced-motion: reduce` neutralise l'ensemble (y compris les nouvelles animations).
- `RideScreen` est inchangé : il appelle `<SearchingDriverIllustration size={128} />` sans `variant`, donc la carte s'affiche. Repasser au gros plan = `variant="car"`.

### Impact produit / comportement visible
- L'écran d'attente montre désormais un **plan de quartier animé** : le radar balaie autour du véhicule, les autres voitures roulent, le trajet vers le repère défile en pointillés.
- Même poids (tout est inline, ~8 Ko de JS/HTML, aucune image à télécharger), mêmes performances.
- Correctif **web uniquement** : déploiement Vercel suffit, aucun versionCode.

### Risques & rollback
- **Risque** : lisibilité à 96-128 px — la carte est plus dense que le gros plan ; les contrastes restent volontairement faibles pour ne pas concurrencer le texte.
- **Rollback** : passer `variant="car"` (une ligne dans `RideScreen`), ou `git revert` pour revenir à l'entrée 17.

### Tests / vérifications
- [x] `npm run build` (Vite) OK
- [x] Scène « carte » vérifiée par rendu statique 400×400 : éventail régulier, rues/îlots lisibles, 4 véhicules distincts, itinéraire et repère bien placés
- [x] Aucun fichier image ajouté (tout est inline) : rien à héberger, rien à mettre en cache
- [ ] À vérifier sur téléphone après déploiement : lisibilité de la carte et fluidité des déplacements

---

## 2026-11-19 (17) — Écran de recherche : illustration **animée** (radar, roues, repère)

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : ui / design
- **Objectif** : rendre l'écran d'attente « Recherche en cours... » vivant et impressionnant pour le passager. L'illustration livrée juste avant (entrée 16) était **statique** : les animations `motion` de l'écran ne jouaient pas (voir ci-dessous), et l'image elle-même ne bougeait pas. Remplacer par une illustration totalement animée, en CSS pur.

### ⚠️ Constat important (à connaître pour tout le projet)
`lib/motion.tsx` réexporte `lib/motion-polyfill.tsx`, qui **ignore complètement** les props `initial` / `animate` / `transition` : il rend des éléments HTML nus (`React.createElement(type, { ref, ...htmlProps })`). **Toutes les animations framer-motion du projet sont donc inertes** (anneaux de recherche, transitions d'écrans, etc.) : elles s'affichent dans leur état final. Ce n'est pas propre à cet écran. Corriger le polyfill globalement est un chantier à part (risque de régressions sur tous les écrans) ; pour cette illustration, l'animation a donc été écrite en **CSS natif**, qui fonctionne dans tous les environnements (Chrome/Android WebView, Safari/iOS, PWA, desktop).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/SearchingDriverIllustration.tsx` | **Nouveau** : illustration SVG inline + animations CSS (radar, roues, repère, ondes, ombre), respect de `prefers-reduced-motion` |
| `components/passenger/RideScreen.tsx` | Écran de recherche **et** modal `status === 'searching'` : `<img>` + `motion.div` → `<SearchingDriverIllustration size={128 | 96} />` ; anciens blocs `motion` inutiles supprimés |
| `public/images/recherche-chauffeur.svg` | **Supprimé** (remplacé par le composant, plus aucun fichier statique à maintenir) |

### Description technique
Animations, toutes en `transform` / `opacity` (donc composées par le GPU, aucun repaint) :
- **Balayage radar** : éventail de 12 parts d'angle (5° chacune) dont l'opacité croît de 0,04 à 0,38 (dégradé angulaire impossible en SVG, faute de `conic-gradient` dans les `defs`), plus un **bord d'attaque** clair ; rotation 360° en 3,6 s. L'ensemble est rogné au disque (`clipPath`) et dessiné **derrière** le véhicule.
- **Anneau pointillé** : rotation très lente (26 s), `transform-box: view-box` + `transform-origin: 100px 104px` pour tourner autour du centre réel.
- **Véhicule** : flottement vertical de 3,5 px (2,8 s).
- **Roues** : rotation 360° en 1,1 s ; un moyeu en croix a été ajouté (une roue parfaitement circulaire ne laissait voir aucune rotation).
- **Ombre au sol** : se rétracte (`scaleX .9`) et pâlit quand le véhicule monte — synchronisée sur la même période de 2,8 s.
- **Repère jaune** : petit saut + halo qui pulse (scale 0,55 → 1,7, opacité → 0).
- **Véhicules détectés** : deux points bleus qui clignotent en décalé (3,6 s).
- **Ondes concentriques** : deux `span` en bordure qui s'étendent de 0,96 à 1,85 et s'effacent (2,8 s, décalage 1,4 s) — rendues hors du SVG pour ne pas être rognées.
- `prefers-reduced-motion: reduce` → toutes les animations sont désactivées (accessibilité).
- Le composant est autonome (styles injectés dans un `<style>`, aucune dépendance, aucun fichier à charger) : l'APK 1.6 le reçoit par simple déploiement Vercel.

### Impact produit / comportement visible
- Pendant l'attente, l'écran « vit » : le radar balaie, la voiture flotte et ses roues tournent, le repère pulse, des ondes sortent du disque.
- Aucun impact sur les performances mesurable (animations `transform`/`opacity`, un seul SVG de ~4 Ko inline).
- Correctif **web uniquement** : déploiement Vercel suffit, pas de nouveau versionCode.

### Risques & rollback
- **Risque** : `transform-box` (view-box / fill-box) requis pour les rotations SVG — supporté par Chrome 64+, Safari 11+, Firefox 55+ ; sur un navigateur très ancien, les rotations seraient simplement absentes (le dessin reste correct).
- **Risque** : batterie sur très vieux téléphones → neutralisé par `prefers-reduced-motion` côté système.
- **Rollback** : `git revert <hash>` (revient à l'image statique ; le fichier SVG est à recréer depuis l'entrée 16).

### Tests / vérifications
- [x] `npm run build` (Vite) OK ; CSS des animations présent dans `dist/assets/PassengerApp-*.js`
- [x] Géométrie de l'éventail radar vérifiée par rendu canvas 400×400 (dégradé régulier, pas de bandes visibles, bord d'attaque net)
- [x] Plus aucune référence à `recherche-chauffeur.svg` dans le bundle
- [ ] À vérifier sur téléphone après déploiement Vercel (Android + iPhone) : fluidité du balayage et rotation des roues
- [ ] À traiter séparément (hors périmètre) : le polyfill `motion` inerte — décider soit de le remplacer par framer-motion réel, soit de convertir les animations utiles en CSS

---

## 2026-11-19 (16) — Écran « Recherche de chauffeur » : illustration dédiée au lieu de l'icône véhicule

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : ui / design
- **Objectif** : sur l'écran plein « Recherche en cours... » (passager), l'illustration centrale était une simple icône de camionnette blanche sur un disque dégradé bleu qui tournait sur elle-même (rotation 360°). Remplacer par une illustration soignée qui évoque la recherche d'un véhicule **disponible à proximité**, et corriger au passage le sous-titre de l'en-tête qui affichait la clé technique `smart_standard`.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `public/images/recherche-chauffeur.svg` | **Nouveau** : illustration vectorielle 200×200 (3,3 Ko) — fond radial bleu clair, onde radar pointillée, repère de localisation jaune, voiture bleue SmartCabb avec ombre portée |
| `components/passenger/RideScreen.tsx` | Écran de recherche : `<Car>` (icône) → `<img src="/images/recherche-chauffeur.svg">` ; rotation supprimée, remplacée par une légère respiration (`scale` 1 → 1,05 + `y` 0 → -3) ; les deux ondes circulaires animées sont conservées ; modal « Recherche en cours » aligné sur la même illustration ; sous-titre `currentRide.vehicleType` → `getVehicleDisplayName()` |

### Description technique
- Illustration **SVG autonome** (aucune dépendance, aucune requête externe, licence interne) : dégradés `#43B2FF → #0055B4` (couleurs `--secondary` / `--primary`), accent jaune `#FFD600` (`--accent`), fond `#F7FBFF → #BEDFFF`.
- L'ancien bloc faisait tourner le disque à 360°/2 s ; une rotation aurait fait pivoter la voiture. Le mouvement est désormais porté par : la respiration de l'image (2,4 s) + les deux ondes concentriques existantes (inchangées).
- Le même visuel est utilisé dans le modal `status === 'searching'` (taille 96 px) pour une expérience homogène entre les deux états de recherche.
- Sous-titre de l'en-tête : `smart_standard` s'affichait tel quel (clé technique). Il passe par `getVehicleDisplayName({ type })` → « SmartCabb Standard » (ou « Confort », « Familiale », « Business », « Luxury »).
- L'image est servie depuis `public/` → `/images/recherche-chauffeur.svg` (mise en cache navigateur et Vercel Edge, 3,3 Ko, mise à l'échelle nette sur tous les écrans).

### Impact produit / comportement visible
- Écran de recherche : illustration premium, cadre radar, repère de localisation — l'attente paraît plus courte et plus « technologique ».
- Le nom de catégorie affiché est maintenant lisible (« SmartCabb Standard ») au lieu de `smart_standard`.
- Correctif **web uniquement** : Vercel suffit (l'APK charge le web distant), aucun nouveau versionCode.

### Risques & rollback
- **Risque** : très faible (asset statique + libellé). Si l'image ne se charge pas, `alt` est affiché.
- **Rollback** : supprimer `public/images/recherche-chauffeur.svg` et restaurer le bloc `<Car className="w-16 h-16 text-white" />` (ou `git revert`).

### Tests / vérifications
- [x] `npm run build` (Vite) OK ; `dist/images/recherche-chauffeur.svg` présent (3 365 octets) et référencé dans `PassengerApp-*.js`
- [x] Rendu vérifié par capture (canvas 400×400) : voiture, onde radar, repère jaune et ombre correctement positionnés
- [ ] À vérifier sur téléphone après déploiement : écran de recherche au lancement d'une course (l'image doit être nette, sans déformation)

---

## 2026-11-18 (15) — Panneau admin : adresses Départ / Arrivée des courses affichées

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : dans le panneau admin, onglet **Courses** de la fiche conducteur (et de la fiche passager), les lignes « Départ » et « Arrivée » apparaissaient **vides**. La cause n'était pas l'affichage mais la conversion des données : `hooks/useSupabaseData.ts` lisait `ride.pickup?.address` / `ride.destination?.address` sur une réponse d'API déjà normalisée en `pickup_address` / `dropoff_address`, donc les deux champs finissaient à `undefined`.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `hooks/useSupabaseData.ts` | `fetchRidesFromKV` : lecture des champs **réellement** renvoyés par `GET /admin/rides` (`pickup_address`, `pickup_lat/lng`, `dropoff_address`, `dropoff_lat/lng`, `duration`, `created_at`) avec les anciennes clés camelCase conservées en repli ; `??` au lieu de `||` pour les nombres (0 reste valide) |
| `components/admin/DriverDetailModal.tsx` | Onglet Courses : `ride.pickup.address` → `ride.pickup_address || ride.pickup?.address || '—'` (idem destination) |
| `components/admin/PassengerDetailModal.tsx` | Onglet Courses : même correction (même bug, fiche passager) |

### Description technique
- L'Edge Function `GET /admin/rides` (`supabase/functions/make-server-2eb02e52/admin-routes.ts`, lignes ~616-632) renvoie **déjà** un objet normalisé : `pickup_address`, `dropoff_address`, `total_amount`, `duration`, `created_at`, `rating`… Aucun objet imbriqué `pickup` / `destination` n'est envoyé.
- `fetchRidesFromKV` appliquait pourtant `ride.pickup?.address || ride.pickupAddress` → `undefined` pour **toutes** les courses. `useSupabaseData` reconstruisait ensuite `pickup.address` à partir de ce champ vide, d'où les libellés vides dans les deux modales.
- Correction : lecture prioritaire des clés snake_case de l'API, avec repli sur les formes camelCase/imbriquées (tolérance si un autre endpoint est branché un jour).
- `duration_minutes` est corrigé au passage (`ride.duration_minutes ?? ride.duration`) : la durée s'affiche aussi dans la carte de course.
- Aucun changement d'API ni de schéma : uniquement la couche de transformation côté client. Les autres écrans qui consomment `rides` (`DriversListScreen` ligne 652 : course en direct, `ClientsListScreen`) bénéficient de la même correction.

### Impact produit / comportement visible
- Onglet **Courses** de la fiche conducteur : chaque carte affiche **Départ**, **Arrivée**, le montant et la durée de la course.
- Onglet **Courses** de la fiche passager : itinéraire affiché (au lieu de deux lignes vides).
- Bloc « Course en direct » de la liste des conducteurs : les adresses remontent aussi quand elles manquaient.
- Correctif **web uniquement** : déploiement Vercel suffit, l'app Android charge le web distant (aucun rebuild AAB, aucun changement de versionCode).

### Risques & rollback
- **Risque** : très faible (lecture de champs déjà présents dans la réponse). Si un champ manque, l'interface affiche `—` au lieu d'un vide.
- **Rollback** : `git revert <hash>` — les deux modales reviennent à `ride.pickup.address` (adresses de nouveau vides).

### Tests / vérifications
- [x] `npm run build` (Vite) OK
- [x] Typecheck ciblé (`tsconfig.check.json` temporaire sur `useSupabaseData.ts` + les 2 modales) : aucune erreur nouvelle ; seules les erreurs pré-existantes du fichier subsistent (`totalPrice`, `variant` de `Badge`, etc.)
- [ ] À vérifier dans l'admin après déploiement Vercel : ouvrir Conducteur → Courses → les adresses doivent apparaître pour les anciennes **et** les nouvelles courses

---

## 2026-11-18 (14) — Signature release : mots de passe du keystore sortis du dépôt

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : security / chore
- **Objectif** : les mots de passe du keystore de signature (`storePassword`, `keyPassword`) étaient écrits **en clair** dans `android/app/build.gradle`, un fichier versionné sur GitHub. Les déplacer dans un fichier local ignoré par git, sans changer la clé ni les mots de passe (sinon le Play Store refuserait les futures mises à jour).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `android/app/build.gradle` | Lecture des identifiants depuis `android/keystore.properties` (classe `Properties`) + avertissement explicite si le fichier est absent ; plus aucun mot de passe en clair |
| `.gitignore` | Ajout de `android/keystore.properties` et `keystore.properties` |
| `android/keystore.properties` | **Fichier local, non versionné** (créé sur la machine) : `storeFile`, `storePassword`, `keyAlias`, `keyPassword` |

### Description technique
- Le bloc `signingConfigs.release` est désormais conditionnel : il n'est renseigné que si `android/keystore.properties` existe. Sinon, Gradle affiche `⚠️ android/keystore.properties absent : signature release impossible` et `bundleRelease` échoue explicitement (au lieu de produire un bundle non signé).
- **Aucune rotation de clé** : même keystore (`android/app/smartcabb-release.keystore`), même alias (`smartcabb`), mêmes mots de passe. Le certificat et donc la continuité des mises à jour Play Store sont préservés.
- Le keystore lui-même n'est **pas** versionné (`*.keystore` dans `.gitignore`) : il n'existe que sur la machine de build (+ OneDrive). Il doit être sauvegardé hors dépôt.
- ⚠️ Le mot de passe reste présent dans **l'historique git** des commits précédents. Le sortir du fichier courant empêche les futures fuites mais ne « nettoie » pas le passé ; une vraie rotation imposerait une nouvelle clé d'upload (réinitialisation via le support Google Play, l'app signing key restant chez Google).

### Impact produit / comportement visible
- Aucun impact sur l'app, le web ou l'API : le binaire produit est identique (même versionCode 9 / versionName 1.6, même certificat).
- **Sur une autre machine / un CI**, il faut recréer `android/keystore.properties` avant de builder, sinon `bundleRelease` échoue avec un message clair.

### Risques & rollback
- **Risque** : oubli du fichier `keystore.properties` sur une nouvelle machine → build release impossible (erreur explicite, pas de bundle non signé).
- **Risque** : perte du keystore local (non versionné) → impossible de signer de nouvelles versions sans réinitialiser la clé d'upload auprès de Google.
- **Rollback** : `git revert <hash>` (les mots de passe reviennent dans `build.gradle`). À éviter.

### Tests / vérifications
- [x] `.\gradlew.bat bundleRelease` OK (tâche `:app:signReleaseBundle` réellement réexécutée après suppression de `intermediary_bundle`)
- [x] `jarsigner -verify -verbose -certs app-release.aab` → **« jar verified »**, certificat `CN=SmartCabb, O=SmartCabb, L=Kinshasa, C=CD`
- [x] AAB identique en taille (13 668 720 octets), `versionCode 9` / `versionName 1.6` inchangés → la version déjà téléversée sur le Play Store reste valable
- [x] `git check-ignore -v android/keystore.properties` → ignoré ; `git status` ne montre que `build.gradle` et `.gitignore`
- [x] `git grep smartcabb2026` : plus aucune occurrence de mot de passe versionnée (seuls des noms d'images `photo_conducteur_smartcabb2026.jpeg`)

---

## 2026-11-18 (13) — Checklist DSA « trader status » (échéance 1er février 2027)

- **Commit** : `73b3db7` (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : docs
- **Objectif** : Google impose à **tous** les comptes développeur de déclarer leur statut « trader » / « non-trader » (DSA) **avant le 1er février 2027**, sous peine de blocage des mises à jour puis de retrait mondial. La déclaration n'est pas encore faite pour SmartCabb ; il fallait laisser une procédure durable dans le dépôt, avec un rappel daté, plutôt qu'une consigne orale.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `docs/DSA_TRADER_STATUS.md` | **Nouveau** : obligation, statut retenu (trader), informations à préparer, procédure compte + app, checklist et rappel au 1er janvier 2027 |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- Aucun code applicatif modifié : documentation seule.
- Statut retenu : **trader (professionnel)** — SmartCabb est une activité commerciale ; déclarer « non-trader » constituerait une fausse déclaration (risque de suspension mondiale du compte).
- Procédure documentée : `Manage account → Account details → About you` (niveau compte) puis `App content → Trader status and Terms of Service` (niveau app), avec l'URL des CGU `https://www.smartcabb.com/terms`.
- À partir du 1er mars 2027, les coordonnées déclarées sont publiques sur la fiche Play Store → utiliser des coordonnées professionnelles (e-mail support, téléphone support, adresse du bureau).

### Impact produit / comportement visible
- Aucun impact sur l'application, le web ou l'API.
- La déclaration conditionne la **pérennité de la distribution** (mises à jour bloquées après le 1er février 2027 si non faite).

### Risques & rollback
- **Risque** : oubli de l'échéance → blocage des mises à jour puis retrait mondial.
- **Rollback** : sans objet (documentation). Le statut reste modifiable dans le Play Console.

### Tests / vérifications
- [x] Procédure recoupée avec l'aide officielle Google (`support.google.com/googleplay/android-developer/answer/17594752`)
- [x] URL des CGU vérifiée (`/terms` répond 200)
- [ ] Faire la déclaration dans le Play Console (action propriétaire du compte)
- [ ] Poser le rappel au 1er janvier 2027 dans l'agenda du propriétaire

---

## 2026-11-18 (12) — Distribution Play Store uniquement : retrait du prompt de mise à jour APK

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : chore / refactor
- **Objectif** : la distribution de l'app Android passe **uniquement** par le Play Store (compte testeur) et le web `smartcabb.com`. La popup « nouvelle version de l'APK à télécharger » (héritée de la distribution par fichier `.apk`) n'a plus de sens et pouvait proposer un APK obsolète (le backend renvoie encore `1.1` / versionCode 4, août 2026).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `App.tsx` | Suppression de l'import et du rendu `<ApkUpdatePrompt />` |
| `components/ApkUpdatePrompt.tsx` | **Fichier supprimé** (composant de mise à jour par téléchargement d'APK) |

### Description technique
- Le composant interrogeait `GET /app/version` puis comparait `version` avec `App.getInfo().version` : si la version distante était supérieure, il affichait une popup avec un lien `window.open(apkUrl, '_system')` vers un APK stocké sur Supabase Storage.
- Il ne s'activait que dans l'app native (`Capacitor.isNativePlatform()`), donc le web n'était pas concerné.
- **Rien d'autre n'utilisait ce composant** (vérifié par recherche globale). La route backend `GET /app/version` (`supabase/functions/make-server-2eb02e52/app-version-routes.ts`) est **conservée** : elle devient inutilisée côté app mais reste disponible (aucune Edge Function à redéployer, aucun risque de régression). Le diagnostic de token push (`lib/native-push.ts`, `App.getInfo()`) est indépendant et inchangé.
- Les mises à jour de l'app Android sont désormais gérées par le **Play Store** (mise à jour automatique par défaut). Les correctifs web (voix, matching, SOS…) continuent d'arriver sans upload, puisque l'app charge `https://www.smartcabb.com/app/passenger?platform=apk` (`server.url` dans `capacitor.config.ts`).

### Impact produit / comportement visible
- Plus de popup « Télécharger la nouvelle version » dans l'app Android.
- Le web et l'app partagent exactement le même code ; aucune fonctionnalité perdue.
- ⚠️ **Version Play Store** : si l'app installée affiche **1.5 (versionCode 8)**, elle ne contient pas le plugin natif `@capacitor-community/text-to-speech` → **aucune voix possible sur Android**. Il faut publier le build **1.6 (versionCode 9)** déjà configuré dans `android/app/build.gradle` :
  1. `npx cap sync android`
  2. `cd android` puis `.\gradlew.bat bundleRelease`
  3. Play Console → Test interne / Production → téléverser `android/app/build/outputs/bundle/release/app-release.aab` (signé avec `android/app/smartcabb-release.keystore`, alias `smartcabb`)
  4. Si Play Console refuse « versionCode 9 déjà utilisé », passer à `versionCode 10` / `versionName "1.6.1"` et reconstruire.

### Risques & rollback
- **Risque** : plus aucun mécanisme de mise à jour forcée côté app. Sans mise à jour Play Store, un appareil peut rester sur une ancienne version native (mais récupère quand même tous les correctifs web).
- **Risque faible** : un utilisateur encore sur un APK installé hors Play Store ne sera plus invité à mettre à jour. À traiter par communication directe.
- **Rollback** : `git revert <hash>` (le composant et son import sont restaurés) + redéploiement Vercel. Aucun changement backend, aucun secret touché.

### Tests / vérifications
- [x] `npm run build` (Vite) OK — bundle d'entrée 291 kB → 279 kB
- [x] `git grep ApkUpdatePrompt` : aucune référence de code restante (seule une mention historique dans ce journal)
- [x] Déploiement Vercel vérifié : bundle d'entrée `index-L4wI1_So.js` sans `ApkUpdatePrompt`, plus aucun appel réseau à `/app/version` ; correctif de voix toujours présent dans `notification-sound-ByHQupKt.js`
- [x] **AAB 1.6 (versionCode 9) construit et vérifié** le 18/11/2026 :
  - `cd android` puis `.\gradlew.bat bundleRelease` (JDK 21 + SDK Android déjà présents sur la machine)
  - Artifact : `android/app/build/outputs/bundle/release/app-release.aab` (13,7 Mo), `package="com.smartcabb.app"`, `versionCode="9"`, `versionName="1.6"`
  - Vérifié dans le bundle : `base/assets/capacitor.config.json` pointe bien sur `https://www.smartcabb.com/app/passenger?platform=apk` (donc tous les correctifs web s'appliquent sans rebuild) et `classes.dex` contient `com.getcapacitor.community.tts.TextToSpeechPlugin` (le plugin natif survit à R8 grâce aux règles `-keep class com.getcapacitor.community.**` de `android/app/proguard-rules.pro`)
  - Piège rencontré : sous OneDrive, `mergeReleaseResources` échoue sur `Unable to delete directory …` → faire `.\gradlew.bat --stop` puis supprimer `android/app/build` avant de relancer
- [ ] Téléversement Play Console + mise à jour de l'app testeur (action propriétaire du compte)

---

## 2026-11-18 (11) — Annonce vocale des courses audible sur téléphone (iOS / Android)

- **Commit** : `5a2c3e1` + _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : sur ordinateur l'annonce vocale d'une nouvelle course est parfaitement audible, mais sur téléphone (Safari iOS, Chrome Android, APK) le chauffeur n'entend qu'un bip/sonnerie — **aucune voix**. Le chauffeur doit entendre « Bonjour, vous avez une nouvelle course SmartCabb… » sur son téléphone.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/notification-sound.ts` | `primeSpeechSynthesis()` (déverrouillage TTS pendant un geste), `_primeTimer` anti-coupure, `speakUtterance()` → `Promise<boolean>` + `onstart`, `retrySpeechOnNextGesture()`, `speakMessage()` (hooks `onStart`/`onEnd`, plus d'attente `loadVoices()`), `playRideNotification()` (sonnerie coupée le temps de la voix sur mobile), `unlockMobileAudio()` (amorçage TTS au 1er geste uniquement) |
| `lib/native-tts.ts` | Échec/erreur TTS native **transitoire** (plus de désactivation définitive), repli de langue si `_preferredLang` échoue, 60 ms entre `stop()` et `speak()` |

### Description technique
- **Cause racine** : sur iOS/Safari (et Chrome) `speechSynthesis.speak()` exige une *activation utilisateur* (sticky). Aucun geste n'était fait sur l'écran chauffeur avant l'arrivée d'une course → `speak()` partait sans droit, la voix ne démarrait jamais et seul le bip de la sonnerie sortait. Sur Android, la WebView de l'APK n'implémente pas `speechSynthesis` (voix native requise), et sur le web mobile la lecture simultanée de l'élément `<audio>` de sonnerie peut rendre la voix muette.
- **Déverrouillage** : `primeSpeechSynthesis()` lance une utterance quasi silencieuse (`' '`, volume 0) **pendant un vrai geste** (`click`/`touchend`) capté par `unlockMobileAudio()`, sur les 3 premiers gestes (un simple clic sur « EN LIGNE » suffit). `unlockMobileAudio()` appelé au montage ne tente plus d'amorce (pas de geste). L'`unlock` est aussi rejoué au retour au premier plan (`visibilitychange`) via `DriverApp`.
- **Anti-coupure** : l'utterance d'amorçage ne s'auto-annule plus au bout de 250 ms (elle pouvait couper le vrai message lancé juste après) ; `_primeTimer` est annulé par `speakMessage()` et `primeSpeechSynthesis()` ne s'exécute pas si une annonce est déjà en cours.
- **Détection d'échec** : `speakUtterance()` résout désormais `true` seulement si l'événement `onstart` a eu lieu. Si aucune phrase n'a démarré, `retrySpeechOnNextGesture()` mémorise le message et le rejoue au **prochain toucher** (annulé si la course a été acceptée/refusée : `_soundAllowed === false`).
- **Latence mobile** : `speakMessage()` ne fait plus `await loadVoices()` (jusqu'à 2,5 s) ; il utilise la voix déjà mise en cache par `preloadVoices()` et sinon se contente de `utt.lang = 'fr-FR'` (le moteur choisit la voix française). L'annonce démarre donc sans délai, même si la liste des voix n'est pas encore chargée.
- **Sonnerie vs voix (mobile)** : dans `playRideNotification()`, sur mobile (`IS_IOS || IS_ANDROID || isNativeApp()`), la sonnerie joue ~0,8 s puis est **mise en pause** le temps de l'annonce, puis reprise (si la course est toujours affichée). Sur ordinateur le comportement (voix + sonnerie en parallèle) est inchangé, puisque c'est ce qui fonctionne.
- **TTS natif (APK)** : `_nativeBroken` n'est plus posé après une erreur — remplacé par un compteur (`2` échecs consécutifs → pause de 60 s) ; un succès remet tout à zéro. Si la langue mémorisée (`_preferredLang`) échoue, on réessaie `fr-FR`, `fr`, puis la langue par défaut au lieu de rester bloqué. Ajout d'un `stop()` + 60 ms avant `speak()` (certains moteurs ignorent un `speak()` collé au `stop()`).
- **APK ancien (plugin TTS absent)** : si le TTS natif n'est pas disponible, on **s'arrête immédiatement** au lieu de tenter la `speechSynthesis` de la WebView (qui ne parle jamais et n'émet aucun `onstart`) : plus d'attente de 14 s pendant laquelle la sonnerie restait coupée.

### Impact produit / comportement visible
- Le chauffeur entend la voix annonçant la course sur **iPhone et Android**, y compris dans l'APK ≥ 1.6 (moteur TTS natif), et plus seulement la sonnerie.
- Un simple clic sur l'écran chauffeur (par ex. « EN LIGNE ») débloque définitivement la voix de la session.
- Si le téléphone refuse malgré tout la synthèse (moteur TTS absent, mode économie d'énergie, appel en cours), la sonnerie continue de sonner et le message est rejoué au geste suivant.
- Sur ordinateur : aucun changement.

### Risques & rollback
- **Risque** : la sonnerie est brièvement interrompue sur mobile (≈ durée de l'annonce). Si le moteur TTS est cassé sur l'appareil, un court silence (~0,3 s) précède la reprise de la sonnerie.
- **Risque** : un APK < 1.6 ne contient pas le plugin TTS natif → pas de voix possible, seuls la sonnerie et le rejeu au geste fonctionnent (mise à jour Play Store requise).
- **Rollback** : `git revert <hash>` + redéploiement Vercel (aucun changement backend, aucune migration, aucun secret).

### Tests / vérifications
- [x] `npm run build` (Vite) OK
- [x] Typecheck ciblé (`tsconfig.check.json` sur `lib/notification-sound.ts` + `lib/native-tts.ts`) : seule l'erreur pré-existante `NotificationOptions.vibrate` subsiste
- [ ] À valider en réel par le chauffeur : **iPhone** (Safari/PWA) — un clic sur l'écran, puis nouvelle course → voix ; **Android** (APK 1.6+) — voix via moteur TTS natif ; Android navigateur — voix via `speechSynthesis`
- [ ] Vérifier que le message est rejoué en touchant l'écran si l'annonce n'a pas démarré (logs `🔁 [TTS] rejeu…`)

---

## 2026-11-17 (10) — Disponibilité passager, acceptation atomique et protection de la config SOS

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : après une course, un verrou résiduel pouvait (a) faire croire au passager qu'**aucun chauffeur** n'était disponible, (b) bloquer l'acceptation d'une nouvelle course, et (c) un client poussant une configuration obsolète effaçait les numéros SOS / coupait les SMS d'urgence.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `readDriverLockState()` (lecture ciblée de la course verrouillée), `repairStaleLocksInList()`, réparation dans `check-drivers-availability`, `check-availability/:id`, `debug-drivers` et le matching ; acceptation : course persistée **avant** le verrouillage du chauffeur et verrou obsolète libéré avant le contrôle « une seule course » |
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | `POST /config/update` : fusion protégée de `emergencyNumbers` (un numéro renseigné n'est jamais effacé) et `emergencySmsEnabled` non désactivable par un payload sans numéro |
| `lib/config-sync.ts` | `saveGlobalConfig()` part de la config **en cache** (serveur) au lieu de `DEFAULT_CONFIG` : une sauvegarde partielle ne réinitialise plus les réglages |

### Description technique
- **Coût maîtrisé** : la validation d'un verrou se fait par une lecture ciblée (`ride:<activeRideId>`), pas par un scan de toutes les courses — le matching et les contrôles de disponibilité restent rapides (mesuré : `/rides/check-drivers-availability` ~0,4–4 s, `/emergency/config` ~0,5 s à chaud).
- **Disponibilité passager** : `POST /rides/check-drivers-availability` et `GET /rides/check-availability/:id` réparent les verrous obsolètes **avant** de filtrer, et corrigent les objets en mémoire. Un chauffeur en ligne n'est plus compté « indisponible » à cause d'une course fantôme.
- **Acceptation atomique** : la course est écrite en `accepted` (avec `driverId`) **avant** la pose du verrou `activeRideId`. Une erreur après ce point ne peut plus laisser un chauffeur bloqué sur une course restée `searching` — cause constatée en production (solde débité, verrou posé, course jamais acceptée).
- **Acceptation d'une nouvelle course** : `releaseStaleDriverLock()` est appelé avant le contrôle `driverHasActiveRide()`, sinon un verrou terminal renvoyait `409 COURSE_EN_COURSE`.
- **Protection SOS** : un client qui envoie `emergencyNumbers: { support: "", supportTech: "" }` (config par défaut/cache obsolète) ne peut plus effacer les numéros existants. `emergencySmsEnabled: false` n'est appliqué que si le payload contient réellement un numéro de support ; sinon l'état serveur est conservé. Pour modifier un numéro, il suffit d'en envoyer un nouveau (non vide).
- **Front** : `saveGlobalConfig()` fusionne `DEFAULT_CONFIG < cache serveur < modifications`, ce qui évite de renvoyer des valeurs par défaut pour les champs non modifiés.

### Impact produit / comportement visible
- Le passager voit un chauffeur disponible dès qu'il est en ligne, même après une course terminée ou annulée.
- Une course acceptée ne peut plus laisser le chauffeur « occupé » à vie.
- Les numéros SOS et l'activation des SMS d'urgence ne peuvent plus être perdus par une sauvegarde de réglages sans rapport.

### Risques & rollback
- **Risque** : un numéro SOS ne peut plus être **effacé** via `POST /config/update` (il faut le remplacer). C'est volontaire — un numéro vide = plus aucune alerte SMS.
- **Rollback** : `git revert <hash>` + redéploiement Edge Function / Vercel.

### Tests / vérifications
- [x] `npm run build` (Vite) OK ; typecheck ciblé : aucune nouvelle erreur (seules les erreurs pré-existantes `Button variant` et `CONFIG_KEY` inutilisé subsistent)
- [x] Edge Function redéployée
- [x] `POST /config/update` avec `support`/`supportTech` → `GET /emergency/config` renvoie les deux numéros + `hasSupport: true`
- [x] Simulation d'un client obsolète (numéros vides + `emergencySmsEnabled: false`) → numéros **conservés** et `emergencySmsEnabled` toujours `true`
- [x] Course réelle `28b8b6e2…` : acceptée (`acceptedAt` 04:03:07) puis `arrived` — la 2ᵉ course est bien notifiée
- [ ] À valider en réel : enchaîner une 3ᵉ course après clôture ; SOS de test (SMS sur les deux numéros)

---

## 2026-11-17 (9) — SMS SOS vers plusieurs destinataires (support + support technique)

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat / config
- **Objectif** : un SOS déclenché depuis l'application n'envoyait aucun SMS car `emergencyNumbers.support` était vide. Le support doit désormais être prévenu automatiquement, sur **deux numéros** : support `0960624008` et support technique `0990666661`.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/sos-sms.ts` | **Nouveau module partagé** : `supportNumbersFrom()`, `readSosSmsConfig()`, `sendSosAlertSms()` (envoi séquentiel, résultat par destinataire) |
| `supabase/functions/make-server-2eb02e52/emergency-routes.ts` | `POST /sos` utilise `sendSosAlertSms()` ; `GET /config` expose `supportNumbers` et calcule `hasSupport` dessus |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Un incident **« urgence »** en course envoie désormais aussi le SMS SOS (mêmes destinataires) |
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | `DEFAULT_CONFIG.emergencyNumbers.supportTech = ""` |
| `lib/config-sync.ts` | Type `emergencyNumbers.supportTech?` + défaut vide (config front synchronisée) |
| `components/admin/GlobalSettingsScreen.tsx` | Nouveau champ « Support technique » + libellés SMS mis à jour (1 crédit par numéro) |
| `docs/EMERGENCY_SOS.md` | Documentation des destinataires multiples, du format des numéros et des valeurs de production |

### Description technique
- `readSosSmsConfig()` fusionne les défauts avec le KV `smartcabb_global_config` et retourne `supportNumbers: string[]`. `supportNumbersFrom()` lit `support`, `supportTech` puis `supportBackup`, sépare sur `,` `;` `/` `|`, dédoublonne et plafonne à **4** destinataires.
- `sendSosAlertSms()` envoie **séquentiellement** (l'API EJSMS gère mal les rafales simultanées) et retourne `{ notified, error, results }`. `notified` vaut `true` dès qu'un envoi réussit, `results` liste `{ to, ok, error }` par numéro, `error` n'est rempli que si **aucun** numéro n'a été joint. Ne lève jamais : une erreur SMS ne bloque pas l'alerte.
- `POST /emergency/sos` renvoie `notified.smsRecipients` (détail par numéro).
- `POST /rides/:id/incident` (kind `urgence`) : après insertion dans `emergency_alerts`, construit le même message (`SOS SMARTCABB … Course … Tel …`) et appelle `sendSosAlertSms()`. Avant ce correctif l'alerte admin existait mais **aucun SMS** n'était envoyé.
- `GET /emergency/config` renvoie `hasSupport: supportNumbers.length > 0` et la liste `supportNumbers` réellement utilisée.
- Format : `sendEjSms()` normalise déjà les numéros locaux (`0XXXXXXXXX` → `243XXXXXXXXX`), les valeurs `0960624008` / `0990666661` sont donc acceptées telles quelles.
- **Configuration appliquée en production** via `POST /config/update` :
  `emergencyNumbers = { police: "112", ambulance: "115", support: "0960624008", supportTech: "0990666661" }`, `emergencySmsEnabled = true`.

### Impact produit / comportement visible
- Chaque alerte SOS — **bouton SOS ou incident « urgence » sur une course active** — envoie un SMS aux deux numéros de support, avec type, position, identifiant de course et téléphone de la personne.
- L'admin peut modifier les deux numéros et désactiver l'envoi depuis **Paramètres globaux → Urgences (SOS)**, sans redéploiement (lecture à chaud du KV `smartcabb_global_config`).
- Coût : 2 crédits EJ SMS par alerte (un par destinataire), 4 au maximum si `supportBackup` est renseigné.

### Risques & rollback
- **Risque** : consommation de crédits SMS doublée ; un numéro mal saisi est simplement ignoré après normalisation (`toMsisdn`) et l'échec est tracé.
- **Rollback** : vider `emergencyNumbers.supportTech` et/ou passer `emergencySmsEnabled = false` depuis l'admin (immédiat, sans redéploiement). Code : `git revert <hash>` + redéploiement Edge Function.

### Tests / vérifications
- [x] `npm run build` (Vite) OK
- [x] Edge Function redéployée (`make-server-2eb02e52`)
- [x] `GET /emergency/config` → `numbers.support = "0960624008"`, `numbers.supportTech = "0990666661"`, `hasSupport: true`, `supportNumbers: ["0960624008","0990666661"]`
- [x] `GET /sms/config` → `{ enabled: true, configured: true }`
- [ ] À valider en réel : un SOS de test → réception du SMS sur les deux numéros

---

## 2026-11-17 (8) — 2ᵉ course sans notification chauffeur + bascule en ligne immédiate

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix / perf
- **Objectif** : après une première course terminée, une nouvelle demande de course ne notifiait plus aucun chauffeur (la course restait en « recherche »). Le bouton « EN LIGNE / HORS LIGNE » demandait plusieurs clics. Objectifs : rendre le matching fiable en continu et la bascule de statut instantanée.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Détection des **verrous de course obsolètes**, matching qui ne bloque plus un chauffeur libre, timeout de matching sécurisé, expiration des recherches abandonnées, endpoint de réparation `POST /rides/heal-stuck-state` |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | `POST /:driverId/status` et `POST /toggle-online-status` libèrent un verrou obsolète avant de calculer la disponibilité |
| `components/driver/DriverDashboardNew.tsx` | Bascule en ligne/hors ligne **optimiste** (retour immédiat), GPS non bloquant (4 s max, position en cache), un seul appel à la fois, garde anti-clignotement |

### Description technique
- **Cause racine constatée en production** : le chauffeur en ligne (`Jack Kalen`) avait `activeRideId = c8c86dba-…-812b6756` alors que cette course était `no_driver_found` depuis ~2 min. Son `is_available` restait donc à `false` **définitivement** : le matching l'excluait, d'où « plus rien ne marche » après la première course. Origine probable : collision entre la validation d'une course et le `setTimeout` de matching (30 s) qui réécrivait la course en `no_driver_found`, ou une écriture interrompue entre le verrouillage du chauffeur et la sauvegarde de la course.
- **Verrou obsolète** : `activeRideId` n'est plus considéré comme bloquant que si la course pointée est réellement dans un état actif (`searching`, `pending`, `accepted`, `enroute`, `arrived`, `waiting`, `in_progress`). `loadActiveRideIdSet()` charge les courses une fois par matching, `releaseStaleDriverLock()` nettoie le chauffeur (et son profil) silencieusement.
- **Timeout de matching** : re-vérifie la course avant d'écrire `no_driver_found`, ne l'écrase jamais si un `driverId` est présent, **restaure la course en `accepted`** si un chauffeur notifié l'a verrouillée pendant la fenêtre, puis libère les verrous résiduels.
- **Recherches fantômes** : `GET /rides/status/:id` bascule en `no_driver_found` une course encore `searching` depuis plus de 45 s (le `setTimeout` ne survit pas à l'arrêt de l'instance Edge) et supprime la clé `matching:`.
- **Réparation immédiate** : `POST /rides/heal-stuck-state` (idempotent, sans secret) libère les verrous obsolètes et expire les recherches bloquées. Utilisé une fois en production : `{ releasedDrivers: 1, expiredRides: 0 }`, le chauffeur est repassé `is_online: true, is_available: true, activeRideId: null` et `eligible: true`.
- **Bascule en ligne** : `handleToggleOnline` applique le nouvel état immédiatement (`setIsOnline`), puis attend la position **au maximum 4 s** (précision approchée, `maximumAge: 120 s`, repli sur la dernière position connue) et envoie un seul `POST /drivers/:id/status`. En cas d'échec, l'état revient à la valeur précédente. `disabled` + indicateur pendant l'appel, `active:scale-95` pour le retour tactile, garde de 4 s pour qu'un rafraîchissement lancé avant le clic n'écrase pas l'état optimiste.

### Impact produit / comportement visible
- Un chauffeur redevient éligible dès que sa course est terminée/annulée, **même si un verrou est resté**, sans intervention admin.
- Une recherche sans chauffeur se termine au bout de 45 s au lieu de tourner indéfiniment.
- Le bouton « EN LIGNE / HORS LIGNE » réagit au premier clic, sans attente GPS visible.
- **SMS** : le solde se lit sur `GET /sms/balance` (admin). Le 404 précédent venait d'un chemin inexistant (`/sms/credits/balance`) ; l'émetteur `SMARTCABB` est approuvé et l'envoi fonctionne (`GET /sms/config` → `enabled: true, configured: true`). Aucun code SMS modifié.

### Risques & rollback
- **Risque** : le healing repose sur la lecture de toutes les courses (`kv.getByPrefix('ride:')`) à chaque matching — coût acceptable mais proportionnel au volume de courses. Un chauffeur suspendu par l'admin (sans verrou de course) n'est **pas** réactivé automatiquement.
- **Rollback** : `git revert <hash>` puis redéploiement Vercel + Edge Function. `POST /rides/heal-stuck-state` est idempotent, aucun effet de bord destructif.

### Tests / vérifications
- [x] `npm run build` (Vite) OK ; typecheck ciblé de `DriverDashboardNew.tsx` : aucune erreur
- [x] Edge Function redéployée (`npx supabase functions deploy make-server-2eb02e52 --project-ref zaerjqchzqmcxqblkfkg`)
- [x] `POST /rides/heal-stuck-state` → `{ success: true, releasedDrivers: 1, expiredRides: 0 }`
- [x] `GET /rides/debug-drivers?category=smart_standard` → `Jack Kalen` : `onlineResolved: true`, `availableResolved: true`, `activeRideId: null`, `eligible: true`
- [x] `POST /rides/check-drivers-availability` → `available: true, driversCount: 1`
- [x] `GET /rides/status/<course bloquée>` → la course n'est plus `searching`
- [ ] À valider en réel : 2ᵉ course acceptée puis terminée → 3ᵉ demande notifiée immédiatement ; bascule en ligne en un seul clic

---

## 2026-11-17 (7) — SOS admin : alertes visibles + détails de course et itinéraire

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : l'écran admin **Urgences SOS** restait vide (« Aucune alerte en cours ») alors qu'un incident (`ride_incident`) apparaissait dans « Activité en direct ». L'admin n'avait aucun moyen d'ouvrir la course concernée pour intervenir (lieu, itinéraire, chauffeur, position).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/supabase.ts` | **Client unique** : client officiel `@supabase/supabase-js` (`persistSession`, `autoRefreshToken`) + helpers `getFreshSession()` / `refreshSession()` ; types DB conservés |
| `lib/supabase.tsx` | **Supprimé** (doublon : l'application utilisait deux clients Supabase différents selon le résolveur) |
| `lib/emergency-admin-service.ts` | `adminToken()` via `getFreshSession()` ; rafraîchissement forcé + **un seul réessai** sur 401 |
| `components/admin/EmergencyAlertsScreen.tsx` | Abonnement realtime inutilisable retiré (polling fiable), polling 15 s → **8 s**, message d'action si session expirée, bloc **détails de la course** dans chaque alerte |
| `components/admin/EmergencyAlertsWatcher.tsx` | Abonnement realtime retiré, polling 20 s → **10 s** |
| `components/admin/SosRideDetails.tsx` | **Nouveau** : lieu de prise en charge, destination, itinéraire Google Maps, passager, chauffeur, véhicule, distance/prix, position chauffeur, incidents de la course |
| `components/admin/SosIncidentFeed.tsx` | **Nouveau** : incidents déclarés en course (panne, crevaison, urgence…) avec ouverture du détail de la course |
| `components/admin/AdminLiveFeed.tsx` | Libellés lisibles pour `ride_incident` (« Incident signalé ») et `emergency_sos` (« Alerte SOS ») |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Une urgence déclarée en course crée aussi une ligne `emergency_alerts` (anti-doublon sur les alertes actives de la course) |
| `supabase/functions/make-server-2eb02e52/emergency-routes.ts` | Un SOS est journalisé dans le fil d'activité admin (`event:<date>:*`, type `emergency_sos`) |

### Description technique
- **Cause n°1 — deux clients Supabase** : `lib/supabase.ts` contenait un client maison (auth REST uniquement, **sans persistance de session**) et `lib/supabase.tsx` le client officiel. `vite.config.ts` résout `.tsx` **avant** `.ts` : le runtime utilisait le client officiel, mais `tsc` typait sur le client maison. Résultat : contrats incohérents (`supabase.channel` « absent » pour le typage, présent à l'exécution), et les écrans dépendant de `supabase.auth.getSession()` pouvaient recevoir `null` (401 sur `/emergency/alerts` et `/emergency/active`). Les deux implémentations sont fusionnées dans `lib/supabase.ts` (client officiel), `lib/supabase.tsx` est supprimé, les appels `.from/.rpc/.channel` sont conservés à l'identique.
- **Cause n°2 — incident ≠ SOS** : le bouton « Signaler un incident » (`components/IncidentModal.tsx`) appelait `POST /rides/:id/incident`, qui journalisait seulement un événement `ride_incident`. Aucune ligne `emergency_alerts` n'était créée : l'écran SOS restait donc vide. Désormais `kind === "urgence"` insère une alerte `type: "security"` (course, position, note, véhicule, autre partie), uniquement s'il n'existe pas déjà une alerte active pour cette course.
- **Détails de course** : `SosRideDetails` lit `GET /rides/:id` (course + `driverLocation`) et `GET /rides/:id/incidents` avec la clé anon (routes publiques), rafraîchit toutes les 30 s, et affiche l'itinéraire `https://www.google.com/maps/dir/?api=1&origin=…&destination=…&travelmode=driving`.
- **Incidents récents** : `SosIncidentFeed` lit `GET /admin/live-feed?limit=100&days=7`, filtre `ride_incident` et propose « Détails & itinéraire » (ouvre `SosRideDetails`).
- **Session admin** : `adminToken()` utilise la session persistée par le client officiel, la rafraîchit 90 s avant expiration et, en cas de 401, force `refreshSession()` puis retente **une** fois. Si aucune session n'existe, l'écran affiche « Reconnectez-vous au tableau de bord admin ».

### Impact produit / comportement visible
- Une urgence déclarée pendant une course apparaît **immédiatement** dans « Urgences SOS » (polling 8 s) **et** dans « Activité en direct ».
- Chaque alerte SOS expose le trajet complet, les contacts, la position du chauffeur et un bouton « Ouvrir l'itinéraire (Google Maps) ».
- Le panneau « Incidents signalés en course » reste visible même sans alerte SOS, avec accès au détail de la course.
- Aucun secret, aucune migration, aucun changement d'API publique.

### Risques & rollback
- **Risque** : la fusion des clients Supabase change l'implémentation utilisée par certains écrans legacy (retours d'API normalisés par le SDK) ; l'insertion d'alerte depuis un incident est encapsulée dans un `try/catch` et ne peut pas bloquer le signalement.
- **Rollback** : `git revert <hash>` puis redéploiement Vercel + Edge Function. Les alertes créées par des incidents peuvent être clôturées depuis l'écran SOS.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] Typecheck ciblé des fichiers modifiés (`tsc -p` sans `_headers`) : aucune erreur
- [x] `npm run build` (Vite) OK
- [x] `POST /emergency/sos` vérifié en production (création + annulation)
- [x] **Edge Function déployée manuellement** : `npx supabase functions deploy make-server-2eb02e52 --project-ref zaerjqchzqmcxqblkfkg` — il n'existe aucun workflow GitHub qui déploie les functions, le déploiement est **manuel** (Vercel, lui, est automatique).
- [x] Après déploiement : un SOS de test crée bien un événement `emergency_sos` dans `GET /admin/live-feed` (alerte ensuite annulée).
- [x] Après déploiement : `GET /admin/live-feed` renvoie l'incident `urgence` réel (course `2f1b518c-…-0a95ab01dd88`) → il apparaît dans le panneau « Incidents signalés en course » avec le détail de la course.
- [ ] À vérifier côté UI admin : ouvrir « Urgences SOS » et déclencher « Urgence / sécurité » depuis une course active.

---



- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : sur l'APK **1.5** (Play Store) qui charge le **web 1.6**, l'utilisateur voyait un écran rouge bloquant : `Promesse non gérée: Error: "TextToSpeech" plugin is not implemented on android`.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/native-tts.ts` | Garde-fou `ttsPluginAvailable()` (`Capacitor.isPluginAvailable`) avant **tout** appel au plugin ; `canUseNativeTTS()` centralise le test ; aucune fonction ne peut plus rejeter |
| `lib/notification-sound.ts` | Appel natif de `speakMessage` encapsulé dans un `try/catch` ; `.catch(() => {})` sur les `void speakMessage(...)` |
| `utils/diagnostics.ts` | Ajout de motifs « bénins » : `plugin is not implemented`, `is not implemented on android/ios/web` → plus d'overlay technique |
| `android/app/src/main/assets/public/**` | Assets web re-synchronisés (`npx cap sync android`) pour l'APK 1.6 |

### Description technique
- **Cause** : le plugin TTS est **natif**. L'APK 1.5 ne le déclare pas dans `capacitor.plugins.json`. Or le bundle web est chargé depuis `www.smartcabb.com` et servait déjà le code 1.6. Capacitor, ne trouvant pas l'implémentation (`d()` de `registerPlugin`), lève `"TextToSpeech" plugin is not implemented on android` ; le rejet remontait jusqu'au listener `unhandledrejection` de `utils/diagnostics.ts` qui affichait l'overlay plein écran « Erreur détectée ».
- **Correctif** : avant tout appel, on interroge `Capacitor.isPluginAvailable('TextToSpeech')` (lecture de la liste des plugins natifs déclarés, sans appel natif) et on mémorise le résultat. Si le plugin est absent : log unique `[TTS NATIF] Plugin absent … (APK < 1.6)`, **voix désactivée**, sonnerie conservée. Les trois points d'entrée (`nativeSpeak`, `nativeStopSpeak`, `nativeTTSWarmup`, `nativeTTSCheck`) passent par `canUseNativeTTS()` et gardent leur `try/catch`, donc aucune promesse ne peut plus être rejetée vers le global.
- **Défense en profondeur** : l'overlay d'erreurs ignore désormais les messages « plugin is not implemented » : une future version du web utilisant un plugin absent d'un vieil APK dégradera la fonctionnalité **sans bloquer l'application**.

### Impact produit / comportement visible
- APK 1.5 : plus aucun écran rouge ; la sonnerie fonctionne, la voix est simplement absente (normal, plugin non embarqué).
- APK 1.6 (AAB sur le Bureau, versionCode 9) : sonnerie **et** voix.
- Aucun secret, aucune modification de schéma.

### Risques & rollback
- **Risque très faible** : si `isPluginAvailable` renvoyait `false` à tort, la voix native serait désactivée (repli silencieux, sonnerie intacte).
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit` : 24 erreurs, toutes pré-existantes dans `_headers/Code-component-*.tsx`
- [x] `npm run build` OK
- [x] `npx cap sync android` OK (assets 1.6 embarqués)
- [x] AAB/APK 1.6 reconstruits : versionCode 9 / versionName 1.6, signature `fb9ad899…6d4a75` (même clé)
- [ ] À valider : sur APK 1.5, lancer une course → sonnerie seule, **aucun écran rouge**

---

## 2026-11-16 (5) — Sonnerie de course : son réel (fichier audio en boucle) + voix native TTS dans l'APK

- **Commit** : _(ce commit)_ (branche `main`, poussée sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : sur l'APK Android, la notification de course s'affichait mais **ne parlait pas et ne produisait aucun son** (« la sonnerie ne parle pas, il n'y a pas de son »).

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/native-tts.ts` | **Nouveau** : wrapper du plugin `@capacitor-community/text-to-speech` (voix native Android), avec repli de langue et pré-chauffage |
| `lib/notification-sound.ts` | Sonnerie jouée par un `<audio>` WAV (data URI) en boucle + repli WebAudio bouclé ; `speakMessage` utilise la voix native en app ; `stopAllNotifications` coupe sonnerie + TTS natif ; amorçage de l'élément audio au premier geste |
| `lib/native-push.ts` | (déjà) envoi `platform`/`appVersion` avec le token |
| `package.json` / `package-lock.json` | Ajout `@capacitor-community/text-to-speech@8.0.2` |
| `android/app/build.gradle` | `versionCode 9` / `versionName "1.6"` (le plugin TTS est natif → nouvelle release obligatoire) |
| `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle` | Générés par `npx cap sync android` (enregistrement du plugin TTS) |
| `build-release-aab.ps1` | Copie aussi le plugin `@capacitor-community/text-to-speech` hors OneDrive avant compilation |

### Description technique
- **Cause 1 — aucune voix** : la WebView Android **n'implémente pas** `window.speechSynthesis`. Tout le chemin TTS existant (`speakUtterance`/`SpeechSynthesisUtterance`) était donc inopérant dans l'APK, alors qu'il fonctionnait sur navigateur. La voix est désormais produite par le moteur TTS natif d'Android via `@capacitor-community/text-to-speech`. `nativeSpeak()` essaie la langue demandée (`fr-FR`), puis `fr`, puis la langue par défaut du téléphone : un `speak()` sur une langue non installée **rejette**, ce qui rendait la voix muette sur les appareils sans voix française. La langue qui fonctionne est mémorisée (`_preferredLang`) et le moteur est pré-chauffé (`nativeTTSWarmup`) au démarrage du tableau de bord.
- **Cause 2 — aucun son** : la sonnerie reposait sur `AudioContext` + oscillateurs, qui reste `suspended` sans geste utilisateur fiable dans la WebView. Elle est maintenant jouée par un élément `<audio>` alimenté par un WAV généré en mémoire (data URI, 3 groupes « ding-dong » 880/1100 Hz, 22 050 Hz mono) et **en boucle** jusqu'à acceptation/refus/expiration de la course. Le repli WebAudio est conservé (et bouclé lui aussi, au lieu d'un unique bip de 1,5 s perçu comme un silence). Capacitor pose `setMediaPlaybackRequiresUserGesture(false)`, la lecture programmatique est donc autorisée. L'élément audio est « amorcé » (lecture à volume 0 puis pause) lors du premier toucher, pour les WebView plus strictes.
- **Arrêt propre** : `stopAllNotifications()` met en pause la sonnerie, vide la boucle de repli, annule `speechSynthesis` et appelle `TextToSpeech.stop()` : plus d'annonce qui continue après un refus de course.
- **Ordre de lecture** : sonnerie (volume 0,8) démarrée immédiatement, puis annonce vocale par-dessus (« Bonjour, vous avez une nouvelle course SmartCabb ! … »).

### Impact produit / comportement visible
- App ouverte : la course **sonne en continu** et est **annoncée à voix haute** (départ + destination).
- La voix nécessite l'APK **1.6** (plugin natif embarqué) ; le son de sonnerie et les autres correctifs web sont déjà actifs sans rebuild (bundle servi par `www.smartcabb.com`).
- App fermée / arrière-plan : inchangé, notification système via le canal `smartcabb_rides` (voir entrée 4).

### Risques & rollback
- **Risque faible** : sonnerie en boucle potentiellement insistante — coupée automatiquement par le compte à rebours (10 s par défaut), l'acceptation, le refus ou la disparition de la course.
- Si le téléphone n'a **aucun** moteur TTS (Google TTS désinstallé), la voix est abandonnée silencieusement (`_nativeBroken`) mais **la sonnerie continue** ; correction possible en installant « Synthèse vocale Google » + voix française.
- **Rollback** : `git revert <hash>` (le son retombe alors sur les bips WebAudio) ; l'APK 1.6 peut être retiré du canal de test Play Console.

### Tests / vérifications
- [x] `npx tsc --noEmit` : 24 erreurs, toutes pré-existantes dans `_headers/Code-component-*.tsx`
- [x] `npm run build` OK (`dist/assets` présent)
- [x] `npx cap sync android` : 5 plugins détectés, dont `@capacitor-community/text-to-speech@8.0.2` (`com.getcapacitor.community.tts.TextToSpeechPlugin`)
- [ ] À valider par le propriétaire sur l'APK 1.6 : course lancée app ouverte → sonnerie continue + annonce vocale
- [ ] Test à faire aussi avec le volume média du téléphone > 0 et « Synthèse vocale Google » installée

---

## 2026-11-16 (4) — Push Android : canal `smartcabb_rides` réparé, init natif indépendant de la vue, diagnostic du token

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : sur l'APK 1.5 installé depuis le Play Store, permission notifications accordée et envoi FCM accepté par Google (`messageId` retourné), **aucune notification ne s'affichait**. Deux causes matérielles identifiées dans le code client.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/native-push.ts` | `createChannel` ne passe plus `sound: 'default'` ; suppression unique de l'ancien canal (réparation) ; envoi de `platform`/`appVersion` avec le token |
| `pages/DriverApp.tsx` | `initNativePush` n'est plus conditionné à `currentView === 'driver'` ; réenregistrement au retour au premier plan |
| `supabase/functions/make-server-2eb02e52/fcm-routes.ts` | `/register-driver-token` mémorise `fcmPlatform` et `fcmAppVersion` (diagnostic) |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | `/debug-drivers` expose `fcmPlatform`, `fcmAppVersion`, `fcmTokenUpdatedAt` |

### Description technique
- **Bug 1 — canal silencieux** : `PushNotifications.createChannel({ sound: 'default' })` est interprété par le plugin Android (`NotificationChannelManager.createChannel`) comme un **fichier `res/raw/default`** : `Uri.parse("android.resource://<pkg>/raw/default")`. Cette ressource n'existe pas → le canal est créé avec un son invalide (notifications muettes). En **omettant** `sound`, Android applique le son de notification par défaut du téléphone. Un canal Android étant **immuable après création**, un `deleteChannel` unique (gardé par `localStorage.sc_channel_repair_v2`) est exécuté avant de le recréer, pour réparer les installations existantes.
- **Bug 2 — init jamais exécutée** : l'effet de `DriverApp` exigeait `state.currentView === 'driver'`. Au démarrage de l'app, la vue peut être encore `login`/`home` ; l'effet ne se relançait pas ensuite si la vue changeait sans changer de chauffeur → **ni canal, ni token natif**, et donc des notifications visant un canal inexistant (jetées silencieusement par Android, alors que FCM renvoie bien un `messageId`). La condition est désormais `state.currentDriver?.id` uniquement, avec réenregistrement sur `visibilitychange`.
- **Observabilité** : le token enregistré par le **plugin natif** est désormais marqué `fcmPlatform: 'native'` + `fcmAppVersion` (l'ancien FCM web n'envoie pas ces champs). Permet de distinguer, depuis `/rides/debug-drivers`, un token natif d'un token navigateur — indispensable pour diagnostiquer ce type d'incident sans accès au téléphone.

### Impact produit / comportement visible
- Diffusable **sans nouvelle release Play Store** : correctif 100 % web (le bundle est chargé depuis `www.smartcabb.com`) + Edge Function redéployée.
- Après réouverture de l'app par le chauffeur : le canal est recréé avec le son système, le token natif est (ré)enregistré, et les notifications apparaissent app en arrière-plan ou fermée.

### Risques & rollback
- **Risque faible** : la suppression du canal réinitialise ses réglages personnalisés (son/vibration) — un seul passage, automatique.
- **Rollback** : `git revert <hash>` + redéploiement Edge Function ; le canal peut aussi être désactivé/réactivé par l'utilisateur dans les réglages Android.

### Tests / vérifications
- [x] `npx tsc --noEmit` : aucune erreur hors `_headers/Code-component-*.tsx`
- [x] `npm run build` OK (chunk `DriverApp-ClK84LmZ.js`)
- [x] Edge Function redéployée (`make-server-2eb02e52`, projet `zaerjqchzqmcxqblkfkg`)
- [ ] À valider par le propriétaire : ouvrir l'app 1.5, rester 10 s sur le tableau de bord, puis test push app fermée
- [ ] Contrôle attendu sur `/rides/debug-drivers` : `fcmPlatform: "native"`, `fcmAppVersion: "1.5"`

---

## 2026-11-16 (3) — Build release 1.5 (AAB + APK signés) et script de build fiabilisé

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : chore + fix
- **Objectif** : produire l'AAB/APK **1.5** contenant le push natif (le `google-services.json` est désormais en place) et rendre `build-release-aab.ps1` utilisable : il s'arrêtait au premier warning de Vite parce que `$ErrorActionPreference = "Stop"` transformait la sortie stderr en erreur fatale.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `build-release-aab.ps1` | Helper `Invoke-Logged` (Start-Process + logs dans `%TEMP%\smartcabb-build-logs`) pour `npm run build`, `cap sync` et Gradle ; on ne se fie plus qu'au code de sortie |
| `lib/vehicle-helpers.ts` | Suppression du `case 'smart_standard_clim'` en doublon (clause morte signalée par esbuild, comportement inchangé) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Cause du blocage** : Vite écrit ses WARNINGS sur stderr ; avec `$ErrorActionPreference = "Stop"` et un appel natif direct, PowerShell lève une `NativeCommandError` et interrompt le script avant même `cap sync`. Les étapes sont maintenant exécutées via `Start-Process -Wait -PassThru` avec stdout/stderr redirigés vers des fichiers de log relus ensuite, donc plus aucune sortie de warning ne peut tuer le build (les logs sont conservés en cas d'échec).
- **Important (environnement agent)** : lancé **en arrière-plan** par le harnais, le processus PowerShell est terminé pendant l'attente des enfants (npm/Gradle) : utiliser un **terminal PowerShell normal** ou lancer les étapes une par une. En avant-plan le script fonctionne ; pour cette livraison les étapes ont été exécutées manuellement dans l'ordre `npm run build` → `npx cap sync android` → `robocopy` hors OneDrive → `gradlew bundleRelease assembleRelease`.
- **Piège rencontré** : un build web interrompu laisse `dist/` **sans `dist/assets/`** (Vite vide le dossier de sortie avant d'écrire). `cap sync` embarquait alors un bundle cassé. Toujours vérifier `dist/assets` et `android/app/src/main/assets/public/index.html` après un build.
- **Artefacts produits** (Bureau) : `SmartCabb-1.5.aab` (13 660 898 o) et `SmartCabb-1.5.apk` (13 238 542 o).
- **Contrôles** : `package com.smartcabb.app`, `versionCode 8`, `versionName 1.5`, `minSdk 24`, `targetSdk 36`, permissions `POST_NOTIFICATIONS` + `VIBRATE` présentes, `com.google.firebase.messaging.FirebaseMessagingService` et `FirebaseInstanceIdReceiver` bien enregistrés dans le manifest (donc FCM natif actif), signature `CN=SmartCabb, OU=Mobile, O=SmartCabb, L=Kinshasa, CD` — **même clé que l'AAB 1.4** (SHA-256 `fb9ad899…6d4a75`), donc téléversement Play Console sans réinitialisation de clé.

### Impact produit / comportement visible
- Aucun changement visible côté web.
- L'AAB 1.5 apporte la permission de notifications, le canal `smartcabb_rides` et le token FCM natif : la sonnerie de course fonctionne aussi **app en arrière-plan ou fermée**, et un appui sur la notification ouvre le tableau de bord avec la course.

### Risques & rollback
- **Risque** : les chauffeurs doivent accepter la permission « Notifications » au premier lancement ; en cas de refus, la sonnerie ne fonctionne qu'app ouverte (polling 8 s).
- **Rollback** : conserver l'AAB 1.4 en Play Console (déploiement progressif) ; côté dépôt `git revert <hash>` puis rebuild.
- `public/apk-version.json` **volontairement non modifié** (encore 1.3 / 6) : à passer en 1.5 / 8 uniquement après téléversement réel de l'APK dans le bucket Supabase (distribution hors Play Store).

### Tests / vérifications
- [x] `npm run build` OK (`dist/assets` : 114 fichiers)
- [x] `npx cap sync android` OK — 4 plugins détectés (`app`, `contacts`, `geolocation`, `push-notifications`)
- [x] `gradlew bundleRelease assembleRelease --no-daemon` → **BUILD SUCCESSFUL** (297 tâches)
- [x] `npx tsc --noEmit` : aucune erreur hors `_headers/Code-component-*.tsx`
- [x] Signature et manifest de l'APK vérifiés (`apksigner`, `aapt2 dump badging/xmltree`)
- [ ] Téléversement Play Console (AAB 1.5) + test réel « app fermée » à faire par le propriétaire

---

## 2026-11-16 (2) — Push natif Android (sonnerie app fermée) + catégories manquantes corrigées

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat + fix
- **Objectif** : dans l'APK, aucune notification n'arrivait quand l'app était en arrière-plan ou fermée (le FCM JavaScript n'existe pas en WebView Capacitor), et 3 chauffeurs n'avaient aucune catégorie de véhicule donc ne pouvaient jamais matcher.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/native-push.ts` | **Nouveau** — enregistrement push natif, canal Android `smartcabb_rides`, relais des événements FCM vers l'UI, mémorisation de la notification ouverte |
| `pages/DriverApp.tsx` | Appelle `initNativePush('driver', id)` quand un chauffeur est connecté |
| `components/driver/DriverDashboardNew.tsx` | Consomme la notification native ouverte (course affichée dès le montage du tableau de bord) |
| `android/app/src/main/AndroidManifest.xml` | Ajout de `POST_NOTIFICATIONS` (Android 13+) et `VIBRATE` |
| `android/app/build.gradle` | Version `1.5` / `versionCode 8` (release signée) |
| `build-release-aab.ps1` | **Nouveau** — build release AAB + APK signés, avec contrôle de `google-services.json` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Pourquoi** : `@capacitor/push-notifications` était déjà installé et enregistré côté Android, et les helpers existaient dans `lib/capacitor-bridge.ts`, mais **aucun code n'appelait** `register()`. De plus `google-services.json` est absent (plugin Google Services non appliqué), donc aucun token natif n'était possible. Les notifications FCM version Web ne fonctionnent pas en WebView (pas de `PushManager`).
- **Client** : `initNativePush(role, userId)` est idempotent. Il installe les listeners (`registration`, `registrationError`, `pushNotificationReceived`, `pushNotificationActionPerformed`), crée le canal `smartcabb_rides` (importance 5, son par défaut, vibration, lights), demande la permission puis `register()`; le token reçu est envoyé à `/fcm/register-driver-token` (ou `/fcm/register-passenger-token`). Le backend n'a pas changé : il envoyait déjà `channelId: smartcabb_rides` et `priority: high`.
- **App ouverte** : `pushNotificationReceived` → événements `fcm-new-ride-request` / `fcm-ride-dismissed` / `fcm-reservation-assigned` déjà écoutés par `DriverDashboardNew`.
- **App fermée** : `pushNotificationActionPerformed` mémorise le payload dans `sessionStorage` (`smartcabb_pending_push`), redirige vers `/app/driver` si nécessaire ; le tableau de bord consomme ce payload au montage (`consumePendingPushRide`) et affiche la popup + la sonnerie.
- **Données** : les 3 chauffeurs sans catégorie (`Conducteur Test Google`, `Jeremie Mulumba`, `ORLY ORLY ISSA`, tous à 0 FC) ont reçu `smart_standard` via `POST /drivers/:id/update`. Répartition finale : 17 standard, 3 confort, 1 plus, 1 business, 1 standard_clim, 1 standard_no_clim — **24/24**.

### Impact produit / comportement visible
- Une fois l'APK 1.5 installé (avec `google-services.json`), le chauffeur reçoit la notification système **même app fermée**, avec son haut-parleur ; un appui ouvre directement le tableau de bord avec la course à accepter.
- En web (Chrome/Safari mobile), comportement inchangé : FCM web + polling.
- Plus aucun chauffeur « invisible » faute de catégorie.

### Risques & rollback
- **Risque** : sur Android 13+, la permission notifications est demandée au démarrage ; si refusée, pas de push (le polling reste actif app ouverte).
- **Risque** : sur un APK sans `google-services.json`, `register()` échoue proprement (`registrationError`), sans crash.
- **Rollback** : `git revert <hash>` + rebuild APK ; pour désactiver côté web sans rebuild, retirer l'appel `initNativePush` dans `pages/DriverApp.tsx`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] `POST /drivers/:id/update` appliqué aux 3 chauffeurs, contrôle `/rides/debug-drivers` : 0 chauffeur sans catégorie
- [ ] Build release AAB/APK **en attente de `android/app/google-services.json`** (Firebase Console)
- [ ] Test push réel app fermée après installation de l'APK 1.5

---

## 2026-11-16 — Sonnerie de course chauffeur (audio mobile + écoute globale) et fiabilisation du matching

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : la sonnerie/popup « nouvelle course » n'arrivait pas de façon fiable côté chauffeur (surtout sur téléphone et quand il n'était pas sur le tableau de bord), et le matching pouvait proposer une course à un chauffeur déjà en course ou d'une autre catégorie.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `pages/DriverApp.tsx` | Déverrouillage audio mobile global + surveillance `/rides/pending` hors tableau de bord |
| `components/driver/DriverDashboardNew.tsx` | Vérification immédiate des courses au montage, polling 8 s, déverrouillage audio, son unique |
| `supabase/functions/make-server-2eb02e52/ride-routes.ts` | Disponibilité réelle, exclusion des chauffeurs occupés, contrôle de catégorie à l'acceptation, libération après course |
| `supabase/functions/make-server-2eb02e52/fcm-routes.ts` | 1 appareil = 1 chauffeur (token FCM unique), disponibilité préservée pendant une course |
| `supabase/functions/make-server-2eb02e52/driver-routes.ts` | Passage en ligne sans rendre « disponible » un chauffeur en course |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Audio mobile** : `unlockMobileAudio()` (AudioContext + TTS) n'était appelé que dans l'app passager. Il est maintenant appelé au montage de `DriverApp` (donc dès l'ouverture de l'app chauffeur), dans `DriverDashboardNew`, et à chaque retour au premier plan (`visibilitychange`). Sans geste utilisateur, l'AudioContext reste `suspended` sur mobile : la popup s'affichait mais aucun son ne sortait.
- **Écoute globale des courses** : les listeners (FCM, message Service Worker, polling `/rides/pending/:driverId`) vivaient uniquement dans `DriverDashboardNew`, démonté sur Gains / Profil / Portefeuille / Réglages / Réservations. Un watcher ajouté dans `DriverApp` interroge `/rides/pending` toutes les 8 s sur ces écrans et ramène automatiquement sur `driver-dashboard` dès qu'une course est proposée : la popup et la sonnerie s'affichent alors normalement.
- **Vérification immédiate** : le polling du tableau de bord attendait 10 s avant le premier appel ; il est lancé immédiatement au montage puis toutes les 8 s. `setPendingRideRequest(prev => prev || …)` évite d'écraser une notification déjà affichée.
- **Son unique** : `RideNotification` joue déjà `playRideNotification` ; le composant `RideNotificationSound` rendu en parallèle a été retiré (double beep + double annonce vocale).
- **Matching — disponibilité** : `isDriverOnline`/`isDriverAvailable` privilégient désormais les booléens explicites (`isOnline`, `is_online`, `is_available`, `available`) au lieu de `status_online='online'` obsolète (des chauffeurs forcés hors ligne pour solde insuffisant restaient considérés « en ligne »).
- **Matching — 1 course à la fois** : `/rides/accept` refuse (`409 COURSE_EN_COURS`) un chauffeur ayant déjà `activeRideId` sur une course non terminée, puis marque le chauffeur occupé (`is_available=false`, `activeRideId`). `findAndNotifyNearbyDrivers` et `/check-drivers-availability` excluent les chauffeurs occupés.
- **Matching — catégorie** : `/rides/accept` vérifie `categoriesCompatible(...)` et refuse (`409 CATEGORIE_INCOMPATIBLE`) toute acceptation hors catégorie (le front affiche désormais `message`). La normalisation Standard reste inchangée (`smart_standard` / `smart_standard_no_clim` → `smart_standard_clim`).
- **Libération** : `releaseDriverAfterRide()` remet le chauffeur disponible (s'il est toujours en ligne) et efface `activeRideId` sur `/complete`, `/:id/complete`, `/cancel` et les clôtures/annulations automatiques de `/sweep-fraud`.
- **Réservations programmées** : une course à l'avance pré-attribuée (`/process-scheduled`) marque également le chauffeur occupé (`is_available=false`, `activeRideId`) pour éviter qu'il accepte une course immédiate en parallèle.
- **FCM** : à l'enregistrement d'un token chauffeur, le même token est retiré des autres fiches `driver:` (un téléphone ne peut plus « posséder » plusieurs chauffeurs) ; `is_available` n'est plus forcé à `true` si une course est en cours.

### Impact produit / comportement visible
- La sonnerie + annonce vocale (« Nouvelle course… ») se déclenchent sur téléphone, y compris si le chauffeur est sur Gains/Profil/Portefeuille (retour automatique au tableau de bord).
- Un chauffeur ne peut plus accepter une course d'une autre catégorie ni une deuxième course en parallèle.
- Les passagers ne voient plus comme « disponibles » des chauffeurs déjà en course.

### Risques & rollback
- **Risque** : un chauffeur dont la fiche contient un `activeRideId` obsolète (course supprimée) serait bloqué ; `releaseDriverAfterRide` et la vérification du statut terminal (`completed|rated|cancelled|no_driver_found`) lèvent ce blocage, et `/debug-drivers` expose `busy`/`activeRideId` pour diagnostic.
- **Rollback** : `git revert <hash>` + redéploiement de l'Edge Function `make-server-2eb02e52`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] Contrôle de syntaxe des 3 fichiers Deno (`ride-routes.ts`, `fcm-routes.ts`, `driver-routes.ts`)
- [x] Edge Function `make-server-2eb02e52` redéployée et `/rides/debug-drivers` + `/rides/check-drivers-availability` vérifiés sur les 4 catégories

---

## 2026-11-15 (4) — iPhone : écran rouge « Erreur détectée » à cause de Google Maps (IntersectionObserver)

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : sur iPhone (Safari), l'écran « Prix estimé » affichait un écran rouge technique : *« Promesse non gérée : TypeError: Argument 1 ('target') to IntersectionObserver.observe must be an instance of Element »*. Le passager ne pouvait plus utiliser la page.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/safe-intersection-observer.ts` | **Nouveau** — protège `IntersectionObserver.observe/unobserve` contre les cibles non-Element |
| `main.tsx` | Installe le garde-fou avant tout rendu (et avant le chargement de Google Maps) |
| `utils/diagnostics.ts` | N'affiche plus l'overlay rouge pour les erreurs d'origine tierce (Google Maps) ; ajout de motifs bénins |
| `components/MapView.tsx` | Détection élargie des échecs Google Maps (fichier `maps.googleapis.com`, `IntersectionObserver`, `gm_authFailure`) et bascule automatique vers OpenStreetMap, y compris sur promesse rejetée. Fichier réencodé en UTF-8 (il était en Windows-1252) |
| `components/GoogleMapView.tsx` | Attend que le conteneur soit dans le DOM et ait une taille > 0 avant de créer la carte ; libère les listeners Google au démontage |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Origine** : Google Maps JS v3.66 (`main.js:272-273`) crée une promesse interne puis appelle `IntersectionObserver.observe(target)`. Sur iOS/Safari, la cible peut être `null` (conteneur pas encore mesuré, écran en transition, carte démontée pendant l'initialisation) → exception **asynchrone**. Notre `utils/diagnostics.ts` écoute `unhandledrejection` et affiche un overlay rouge technique pour toute promesse non gérée : d'où l'écran bloquant alors que la carte, elle, continuait de fonctionner.
- **Correctif 1 (racine)** : `installSafeIntersectionObserver()` remplace `IntersectionObserver.prototype.observe` et `unobserve` par des versions qui ignorent une cible invalide (`nodeType !== 1`) au lieu de lever. L'appel reste 100 % natif pour les cibles valides. Neutralise aussi les autres librairies tierces.
- **Correctif 2 (UX)** : `diagnostics.ts` ignore désormais les erreurs dont le fichier ou la pile contient `maps.googleapis.com` / `maps.gstatic.com` (+ motifs `IntersectionObserver`, `gm_authFailure`, `You must enable Billing`). Les vraies erreurs applicatives continuent d'afficher l'overlay.
- **Correctif 3 (résilience)** : `MapView` écoute aussi `unhandledrejection` ; toute défaillance Google Maps (clé, billing, bug interne, conteneur non visible) bascule sur la carte OpenStreetMap déjà en place, sans écran d'erreur.
- **Correctif 4 (prévention)** : `GoogleMapView` attend jusqu'à 2 s que le conteneur soit attaché au DOM et mesuré (`offsetWidth/Height > 0`) avant `new google.maps.Map(...)`, et nettoie les listeners au démontage.

### Impact produit / comportement visible
- Plus d'écran rouge technique sur iPhone à cause de Google Maps.
- Si Google Maps échoue (clé/billing/réseau/iOS), la carte bascule silencieusement sur OpenStreetMap avec le bandeau « Mode carte simplifié (OpenStreetMap) ».
- Les erreurs réelles de l'application continuent d'être signalées (overlay conservé pour le diagnostic).

### Risques & rollback
- **Risque** : le patch d'`IntersectionObserver` est global ; il ne modifie que le comportement des cibles invalides (qui levaient une exception auparavant). Aucun impact sur les cibles valides.
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK
- [x] Test local (preview) : `new IntersectionObserver(cb).observe(null)` ne lève plus d'exception (`patched: true`, `observeThrew: false`)
- [x] Test local : rejet simulé avec le message exact de Google Maps → **aucun** overlay affiché
- [x] Test local : rejet applicatif réel → overlay toujours affiché (non-régression du diagnostic)
- [ ] Test manuel iPhone : ouvrir « Prix estimé » → carte affichée, aucun écran rouge

---

## 2026-11-15 (3) — Admin : vue « Revenus » (gain total → courses / réservations → tendance 12 mois)

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : feat
- **Objectif** : dans le panel admin, afficher **d'abord le gain total**, puis le **gain des commandes de course** et le **gain des commandes par réservation**, avec la **tendance** sous forme de graphique.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `supabase/functions/make-server-2eb02e52/admin-routes.ts` | `/stats` charge `scheduled_rides` et renvoie un objet `stats.revenue` (total, courses, réservations, aujourd'hui, mois, compteurs, série 12 mois) |
| `components/admin/RevenueOverview.tsx` | **Nouveau** — carte « Gain total », deux cartes de ventilation avec parts en %, graphique empilé 12 mois (CSS pur) |
| `components/admin/AdminDashboard.tsx` | Import + rendu de `<RevenueOverview stats={liveStats} />` en haut du contenu ; KPI « Revenus aujourd'hui » et « Total » incluent désormais les réservations |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Backend** : `/admin/stats` fait une requête supplémentaire sur `scheduled_rides` (colonnes réelles `id,status,estimated_price,category,scheduled_date,created_at,updated_at`, limite 5000 — les colonnes `total_price` / `final_price` / `completed_at` **n'existent pas** dans cette table, vérifié via l'API REST). Une réservation est considérée **honorée** si `status ∈ {completed, done, finished, terminee, terminée}` ; en pratique l'admin passe la réservation à `completed` via « Traiter ». Prix : `estimated_price` (seule colonne tarifaire de la table).
- **Agrégats** :
  - `revenue.totalCDF` = courses terminées + réservations honorées ;
  - `revenue.ridesCDF` / `revenue.reservationsCDF` ;
  - `revenue.todayCDF`, `ridesTodayCDF`, `reservationsTodayCDF` (minuit local) ;
  - `revenue.monthCDF`, `ridesMonthCDF`, `reservationsMonthCDF` ;
  - `revenue.ridesCount`, `reservationsCount`, `reservationsTotal` ;
  - `revenue.monthly[]` : 12 points `{month,label,shortLabel,ridesCDF,reservationsCDF,totalCDF}`.
- Dates utilisées : courses `completedAt || completed_at || updatedAt || updated_at || createdAt || created_at` ; réservations `updated_at || scheduled_date || created_at` (pas de `completed_at`).
- **Rétrocompatibilité** : `totalRevenueCDF` et `revenueTodayCDF` restent **courses uniquement** ; le front privilégie `revenue.*` et retombe sur les anciens champs si l'objet est absent.
- **UI** : graphique en barres empilées bleu (courses) / violet (réservations), hauteur relative au max sur 12 mois, infobulle native par mois, aucune librairie de charts (cohérent avec `StatsCharts`, build Vercel léger). Layout responsive (`grid-cols-1 md:grid-cols-2`, scroll horizontal du graphique sur mobile).

### Impact produit / comportement visible
- En haut du tableau de bord admin : **Gain total** en grand, avec « Aujourd'hui » et « Ce mois ».
- Dessous : **Commandes de course** (nombre de courses terminées, part en %, montant du jour) et **Commandes par réservation** (nombre honorées / total, part en %, montant du jour).
- Puis la **tendance sur 12 mois** empilée courses + réservations.
- Les cartes KPI « Revenus aujourd'hui » et « Total » comptabilisent désormais aussi les réservations.

### Risques & rollback
- **Risque** : la lecture de `scheduled_rides` peut échouer (RLS/permissions) → un `console.warn` est émis et les gains réservations tombent à 0, **sans casser** l'endpoint.
- **Rollback** : `git revert <hash>` + redéploiement de l'Edge Function.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK — `AdminDashboard-BOaTkpSg.js` contient « Gain total » et « Tendance des gains »
- [x] Vérification de l'API en production : `revenue.totalCDF` > 0, `reservationsCDF` alimenté (43 réservations, 36 honorées)
- [ ] Vérification visuelle admin en production (données réelles)
- [ ] Vérification du rendu mobile (graphique défilable)

---

## 2026-11-15 (2) — Profil : « Modes de paiement » ouvrait l'écran de paiement de course (crash `Card is not defined`)

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : depuis **Mon Profil**, le bouton « Modes de paiement » affichait « Page indisponible ». Reproduit et diagnostiqué en production : `ReferenceError: Card is not defined`.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/ProfileScreen.tsx` | La ligne « Modes de paiement » ouvre `payment-settings` (écran de réglage) au lieu de `payment-method` (paiement de course) |
| `components/CurrencySelector.tsx` | Import manquant `Card` (cause du crash) |
| `components/admin/CustomerSupportScreen.tsx` | Imports manquants `Card`, `CardContent`, `CardHeader`, `CardTitle` |
| `components/driver/DriverBalanceManager.tsx` | Import manquant `Card` |
| `components/driver/GPSNavigationScreen.tsx` | Import manquant `Card` |
| `components/driver/OfflineModeCache.tsx` | Import manquant `Card` |
| `components/passenger/CustomerAssistant.tsx` | Imports manquants `CardHeader`, `CardTitle`, `CardContent` |
| `components/passenger/RatingDialog.tsx` | Import manquant `Card` |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Deux bugs cumulés** :
  1. `ProfileScreen` déclarait `screen: 'payment-method'` pour « Modes de paiement ». Cet écran (`PaymentMethodScreen`) est celui du paiement **pendant une course** : il redirige vers `estimate` s'il n'y a pas de course, et sinon rend `CurrencySelector`.
  2. `CurrencySelector` utilisait `<Card>` **sans l'importer**. Le bundler laissait donc une référence globale `Card` → `ReferenceError: Card is not defined` dès qu'une course était en cours. TypeScript ne le signalait pas (aucune vérification d'import pour ce fichier lors du build).
- **Correctif principal** : la ligne du profil pointe désormais vers `payment-settings` — l'écran réparé la veille (mode préféré Mobile Money / Espèces, enregistré côté serveur).
- **Correctif système** : balayage de tous les `components/`, `pages/` et `src/` à la recherche de `<Card…>` sans import correspondant ; 7 fichiers corrigés, dont plusieurs écrans chauffeur/admin qui auraient planté de la même façon.
- Vérification post-build : `0` occurrence de `Card` non résolue dans le bundle (`e.jsxs(Card`).

### Impact produit / comportement visible
- Profil → Modes de paiement affiche l'écran de réglage fonctionnel (plus de plantage, plus de redirection vers l'estimation).
- L'écran de paiement pendant une course (Mobile Money / Espèces / Mixte) ne plante plus à cause de `CurrencySelector`.
- Les écrans chauffeur (solde, navigation, mode hors ligne) et admin (support) ne plantent plus sur `Card`.

### Risques & rollback
- **Risque** : aucun changement de logique métier, uniquement des imports manquants et une destination de navigation.
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK — `PassengerApp-CusgYiRW.js`, 0 référence `Card` non résolue
- [x] Reproduction du bug en production avant correctif : `ReferenceError: Card is not defined` (console navigateur)
- [ ] Test manuel téléphone : Profil → Modes de paiement → choisir un mode → retour → le choix est conservé
- [ ] Test manuel : course en cours → écran de paiement → changer de devise (USD/CDF) sans erreur

---

## 2026-11-15 — Auto-mise à jour des clients bloqués sur un ancien bundle (+ diagnostic d'erreur)

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : l'écran « Moyens de paiement » fonctionnait en production mais restait en erreur sur le téléphone de l'utilisateur. Cause : un ancien Service Worker / Cache Storage du WebView servait encore les fichiers JS d'avant le correctif. L'écran d'erreur affiché (nouveau code) provenait du bundle frais, alors que le composant fautif, lui, venait du cache.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/app-update.ts` | **Nouveau** : purge SW/caches, rechargement sans cache, détection de nouveau build |
| `main.tsx` | Nettoyage automatique au démarrage + vérification du build 4 s après lancement |
| `components/ErrorBoundary.tsx` | Bouton « Forcer la mise à jour de l'application » + détail technique replié |
| `hooks/useTranslation.ts` | Description « Moyens de paiement » corrigée (plus de mention de cartes) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Diagnostic** : vérification de l'écran en production (`https://www.smartcabb.com/app/passenger`, session passager simulée, navigation Paramètres → Moyens de paiement) → l'écran s'affiche correctement et le clic enregistre le mode. Le crash observé sur le téléphone ne vient donc pas du code déployé mais d'un bundle obsolète côté client.
- **`lib/app-update.ts`** :
  - `purgeRuntimeCaches()` : `navigator.serviceWorker.getRegistrations()` → `unregister()`, puis suppression de toutes les clés `caches`.
  - `releaseStaleServiceWorker()` : si un Service Worker contrôle encore la page, purge puis **un seul** rechargement par session (`sessionStorage.smartcabb_sw_reloaded`).
  - `checkForNewBuild()` : `fetch('/index.html', { cache: 'no-store' })`, extraction du `assets/index-*.js` référencé par le serveur, comparaison avec le `<script>` réellement chargé ; si différent → purge + rechargement (anti-boucle 60 s via `smartcabb_build_refresh_at`).
  - `runStartupCacheCleanup(BUILD_ID)` : purge unique par version (`smartcabb_sw_cleanup_done`).
  - `forceAppUpdate()` : purge + rechargement avec paramètre `_v=<timestamp>` pour contourner le cache HTTP.
- **`main.tsx`** : `BUILD_ID = 'v517.75-2026-11-15'` ; le nettoyage et la vérification ne s'exécutent qu'en production (`import.meta.env.PROD`).
- **`ErrorBoundary`** : ajout du lien « Forcer la mise à jour de l'application » (fonctionne même quand l'app est coincée) et d'un bloc `<details> « Détail technique »` replié, visible en production pour permettre un diagnostic par capture d'écran.
- **Traductions** : « Gérer vos cartes et comptes » → « Choisir Mobile Money ou espèces » (fr) / « Choose Mobile Money or cash » (en), cohérent avec l'écran réel qui ne stocke aucune carte.

### Impact produit / comportement visible
- Un téléphone qui conserve une ancienne version se met à jour tout seul au lancement suivant.
- En cas d'erreur persistante, l'utilisateur dispose d'un bouton explicite pour forcer la mise à jour, sans vider manuellement les données de l'app.
- Le support peut lire le message d'erreur exact via « Détail technique ».

### Risques & rollback
- **Risque** : la purge des caches supprime le mode hors ligne du PWA. Celui-ci est déjà désactivé (enregistrement du Service Worker commenté dans `main.tsx`), donc aucun impact réel.
- **Risque** : double rechargement au tout premier lancement après déploiement (une fois). Les garde-fous `sessionStorage` empêchent toute boucle.
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK — `index-BtGSAbZU.js`, `PassengerApp-Gla2-NTf.js`
- [x] Écran Moyens de paiement testé en direct sur `smartcabb.com` (session simulée) : affichage + clic OK
- [ ] Test manuel téléphone : fermer complètement l'app, rouvrir, Paramètres → Moyens de paiement
- [ ] Test manuel : si l'erreur persiste, appuyer sur « Forcer la mise à jour de l'application »

---

## 2026-11-14 — Paramètres : écran « Moyens de paiement » réparé + message clair en cas de mauvaise connexion

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : (1) Paramètres → « Moyens de paiement » plantait immédiatement (`useAppState is not defined`). (2) En cas de mauvaise qualité de connexion, l'écran d'erreur affichait un message technique brut et des consignes clavier PC inutilisables sur Android.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/PaymentSettingsScreen.tsx` | Réécriture : import `useAppState` manquant, mode de paiement préféré réel enregistré côté serveur, suppression du faux stockage de cartes |
| `components/ErrorBoundary.tsx` | Détection réseau/module, rechargement automatique unique, message mobile « Connexion instable », suppression des consignes PC |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Écran Moyens de paiement** : le composant appelait `useAppState()` sans l'importer (crash immédiat à l'ouverture, attrapé par l'`ErrorBoundary` → écran « Erreur de chargement »). L'écran a été réécrit :
  - import de `useAppState` (`setCurrentScreen`, `state`, `mergeCurrentUser`) ;
  - affichage du mode **préféré réel** (`state.currentUser.favoritePaymentMethod`) ;
  - choix Mobile Money / Espèces enregistré via `POST /passengers/update/:id` (écrit `passenger:{id}` **et** `profile:{id}`), cache `localStorage` en secours, rollback + message explicite si l'appel échoue ;
  - suppression de l'ancien gestionnaire de cartes qui ne stockait que dans `localStorage` tout en affichant des mentions « données cryptées / PCI-DSS » inexactes.
  - Aucun numéro de carte n'est plus demandé nulle part.
- **ErrorBoundary** :
  - classification de l'erreur en `offline` (`navigator.onLine === false`), `network` (`Failed to fetch dynamically imported module`, `ChunkLoadError`, `Failed to fetch`, `Load failed`…) ou `runtime` ;
  - pour un module dynamique manquant avec connexion active (cas typique d'un ancien `index.html` après déploiement), **un seul rechargement automatique** est tenté, avec verrou `sessionStorage` (`smartcabb_chunk_reload_at`, cooldown 60 s) pour ne jamais boucler ;
  - si le module manque toujours, l'écran « Connexion instable » s'affiche avec `Réessayer` (rechargement complet) et `Retour à l'accueil` ;
  - réécoute de l'événement `online` : rechargement automatique dès que le réseau revient ;
  - interface mobile : `min-h-[100dvh]`, `pb-safe-page`, textes adaptés, icône Wi-Fi, aucune mention `Ctrl+Shift+Delete` / `Cmd+Shift+R` ;
  - le message d'erreur technique brut n'est plus affiché qu'en développement (`process.env.NODE_ENV === 'development'`).

### Impact produit / comportement visible
- Paramètres → Paiement affiche enfin un écran fonctionnel ; le choix y est le même que dans Profil et reste enregistré après déconnexion.
- En cas de réseau faible, l'utilisateur voit « Connexion instable » avec une consigne compréhensible sur téléphone, et l'app se rétablit seule quand la connexion revient.
- Plus de risque de boucle de rechargement si un fichier JS a réellement disparu du serveur.

### Risques & rollback
- **Risque** : les éventuelles cartes ajoutées dans l'ancien écran (uniquement en `localStorage` sous `smartcabb_payment_methods`) ne sont plus affichées ; elles n'ont jamais été transmises au serveur ni utilisées pour un paiement.
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK — chunk `PassengerApp-ISbHLMM5.js`, 0 appel `useAppState(` non importé, verrou anti-boucle présent
- [ ] Test manuel : Paramètres → Paiement → choisir un mode → quitter/revenir → le choix est conservé
- [ ] Test manuel : passer en mode avion puis ouvrir une page non chargée → écran « Connexion instable » / « Vous êtes hors ligne », puis retour réseau → rechargement automatique

---

## 2026-11-13 — Profil : mode de paiement persisté, champ email plus écrasé pendant la saisie

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : (1) le mode de paiement choisi revenait à « Non défini » après déconnexion/reconnexion. (2) Le champ email se remplissait à nouveau avec l'ancienne adresse pendant la modification.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `components/passenger/ProfileScreen.tsx` | Sauvegarde du mode de paiement côté serveur, rechargement à l'ouverture, garde anti-écrasement du formulaire, sélection du texte au focus |
| `components/passenger/LoginScreen.tsx` | `favoritePaymentMethod` repris du profil serveur (et du cache local en secours) |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **Mode de paiement** : le clic ne faisait que `mergeCurrentUser` + `localStorage` — rien n'était envoyé au serveur. Après déconnexion, `LoginScreen` rechargeait `/passengers/:id` puis construisait un objet `user` **en liste blanche** (id, nom, email, téléphone, solde, dates) : `favoritePaymentMethod` était perdu.
  - Nouveau `handleSelectPaymentMethod()` : mise à jour optimiste → `POST /passengers/update/:id` avec `{ favoritePaymentMethod }` (la route fusionne les champs dans `passenger:{id}` **et** `profile:{id}`) → toast de succès et fermeture du dialogue. En cas d'échec : retour à la valeur précédente et message d'erreur, pour ne jamais afficher un choix non enregistré.
  - `LoginScreen` mappe désormais `profile.favoritePaymentMethod || profile.favorite_payment_method` et, à défaut, la valeur du cache `smartcabb_user_{id}`.
  - Effet de rechargement dans `ProfileScreen` : pour une session restaurée depuis `localStorage` avant ce correctif, le mode de paiement est récupéré depuis `/passengers/:id`.
  - Pendant l'enregistrement, les boutons sont désactivés et affichent « Enregistrement… ».
- **Champ email** : le `useEffect` qui synchronisait `editData` dépendait de `state.currentUser`. Or le solde est rafraîchi toutes les 10 s via `mergeCurrentUser({ walletBalance })`, ce qui remplaçait l'objet `currentUser` et **réinjectait l'ancien email** au milieu de la saisie. La synchronisation est maintenant ignorée tant que `isEditing` est vrai (et relancée à la fermeture du formulaire).
  - Complément ergonomique : le contenu du champ email est **sélectionné au focus** (remplacement immédiat possible) et `autoComplete` passe à `off` pour limiter le remplissage automatique d'Android.
- **Aucun changement backend** : `POST /passengers/update/:id` acceptait déjà des champs arbitraires et écrivait les deux clés KV.

### Impact produit / comportement visible
- Le mode de paiement choisi (« Mobile Money » ou « Espèces ») reste affiché après déconnexion/reconnexion, redémarrage de l'app et changement d'appareil.
- Le chauffeur voit toujours le mode de paiement du passager (déjà lu depuis `favoritePaymentMethod`).
- La modification de l'email n'est plus annulée toutes les 10 secondes ; un appui sur le champ sélectionne l'adresse existante pour la remplacer d'un coup.

### Risques & rollback
- **Risque** : un mode de paiement enregistré sur un ancien appareil n'est pas migré automatiquement (la clé `smartcabb_preferred_payment` n'est pas liée à l'utilisateur). L'utilisateur devra le resélectionner une fois ; l'opération est ensuite persistée.
- **Risque** : si l'API est indisponible, le choix est annulé avec un message explicite (comportement voulu).
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK — bundle avec l'appel `favoritePaymentMethod` et le message d'échec
- [ ] Test manuel : Profil → Modifier le mode de paiement → choisir Mobile Money → se déconnecter → se reconnecter → le choix est conservé
- [ ] Test manuel : Profil → Modifier → vider l'email et taper une nouvelle adresse → attendre 30 s → la saisie n'est plus remplacée
- [x] Déploiement Vercel vérifié en direct

---

## 2026-11-12 — TikTok : URL de profil + diagnostic du sélecteur de contacts

- **Commit** : _(ce commit)_ (branche `main`, poussé sur `origin`)
- **Auteur** : agent OpenCode
- **Type** : fix
- **Objectif** : (1) remplacer le lien de partage TikTok par l'URL de profil définitive. (2) Le bouton « Contacts » de « Réserver pour quelqu'un d'autre » affichait « Sélection indisponible sur ce téléphone » : rendre la détection plus robuste et expliquer clairement quand l'APK installé est trop ancien.

### Fichiers touchés
| Fichier | Nature du changement |
|---|---|
| `lib/social-links.ts` | TikTok → `https://www.tiktok.com/@smartcabb7` |
| `index.html` | `sameAs` JSON-LD : même URL TikTok |
| `lib/contact-picker.ts` | Appel direct du plugin natif sans garde `isPluginAvailable`, nouveau motif `old_app`, `getInstalledAppVersion()` |
| `components/passenger/BookForSomeoneElse.tsx` | Message d'erreur explicite + encart persistant sous le champ téléphone |
| `docs/CHANGELOG_TECHNIQUE.md` | Cette entrée |

### Description technique
- **TikTok** : `https://vm.tiktok.com/ZS9fmufQFyFVM-vbxMq/` remplacé par `https://www.tiktok.com/@smartcabb7` dans la source unique `lib/social-links.ts` (les deux pieds de page suivent) et dans le `sameAs` de `index.html`. Le lien court pouvait expirer.
- **Sélecteur de contacts — cause probable** : l'APK 1.3 (celle encore servie par le Play Store) ne contient pas le plugin natif `@capacitor/contacts`. Comme l'APK charge le site en direct, la version web récente affiche bien le bouton, mais l'appel échoue : la WebView Android n'implémente pas non plus `navigator.contacts`, d'où `unsupported` et le message générique.
- **Robustesse** : `pickPhoneContact()` ne teste plus `Capacitor.isPluginAvailable('Contacts')` avant d'agir (cette garde pouvait produire un faux négatif si le pont natif n'était pas encore visible). Sur plateforme native, le plugin est importé et appelé directement ; une erreur « not implemented / not available » est traduite en `{ status: 'unsupported', reason: 'old_app' }`.
- **Diagnostic** : nouveau `getInstalledAppVersion()` (via `@capacitor/app`) ; quand le motif est `old_app`, le message affiche la version réellement installée et demande la 1.4+. L'encart reste sous le champ (les toasts disparaissent trop vite) et s'efface dès que l'utilisateur tape un numéro.
- **Web / Chrome Android** : le chemin `navigator.contacts.select` reste inchangé et fonctionne ; le message `old_app` n'apparaît que dans une coque native sans plugin.

### Impact produit / comportement visible
- TikTok pointe vers le profil officiel, plus de lien court susceptible d'expirer.
- Sur un APK 1.3, le bouton « Contacts » indique désormais explicitement qu'une mise à jour est nécessaire, avec le numéro de version installée — au lieu de laisser croire que le téléphone ne sait pas lire le répertoire.
- Sur l'APK 1.4 (versionCode 7) le sélecteur système s'ouvre normalement.

### Risques & rollback
- **Risque** : aucun sur le web ; les données ne sont pas touchées.
- **Risque** : `getInstalledAppVersion()` dépend de `@capacitor/app`, présent dans l'APK ; en cas d'échec la fonction renvoie `null` et le message reste compréhensible.
- **Rollback** : `git revert <hash>`.

### Tests / vérifications
- [x] `npx tsc --noEmit` (hors erreurs pré-existantes `_headers/Code-component-*.tsx`)
- [x] `npx vite build` OK — bundle avec `tiktok.com/@smartcabb7`, sans `vm.tiktok.com`, présence du motif `old_app`
- [x] Déploiement Vercel vérifié en direct
- [ ] Test manuel sur l'APK 1.4 : bouton « Contacts » → sélecteur système → numéro injecté
- [ ] Test manuel sur l'APK 1.3 : message « nécessite SmartCabb 1.4 (version installée : 1.3) »

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

