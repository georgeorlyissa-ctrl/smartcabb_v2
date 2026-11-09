# Dispositif SOS / Urgences — SmartCabb

> Dernière mise à jour : 2026-11-11
> Périmètre : **Lots A et B** — socle fiable (persistance, position réelle, statut honnête) **et** écran d'administration temps réel.
> Les lots C (contacts d'urgence) et D (mode discret) ne sont pas encore implémentés.

---

## 1. Principe

Un seul composant client gère le SOS pour tous les écrans : `components/emergency/SOSButton.tsx`.
Il ouvre `SOSDialog.tsx`, qui :

1. laisse choisir le type d'urgence (sécurité, médical, accident, harcèlement) ;
2. capture la **position GPS réelle** via `lib/graceful-geolocation.ts` ;
3. envoie l'alerte à `POST /emergency/sos` ;
4. affiche un **succès uniquement si l'alerte est enregistrée en base** ;
5. en cas d'échec, affiche un message explicite et des boutons d'appel `tel:`.

> ⚠️ L'autre partie de la course (conducteur ou passager) n'est **jamais** notifiée.
> C'est une décision de sécurité : dans la majorité des cas, l'agresseur présumé est l'autre partie.

---

## 2. Base de données

Table `public.emergency_alerts` (migration `20261108000000_emergency_alerts.sql`).

| Colonne | Rôle |
|---|---|
| `id` | UUID de l'alerte (référence affichée à l'utilisateur : 8 premiers caractères) |
| `user_id` | Identifiant de l'auteur (session vérifiée en priorité) |
| `role` | `passenger` ou `driver` |
| `ride_id` | Course en cours au moment de l'alerte (facultatif) |
| `type` | `medical` \| `security` \| `accident` \| `harassment` |
| `status` | `active` → `acknowledged` → `resolved` / `false_alarm` / `cancelled` |
| `lat`, `lng`, `accuracy` | Position réelle (NULL si GPS indisponible — jamais de fausse position) |
| `address` | Adresse de repli (départ de course) |
| `note` | Précision libre de l'utilisateur (≤ 300 car.) |
| `vehicle_info`, `counterpart_name/phone` | Contexte de course (diagnostic, **pas de notification**) |
| `metadata` | `source`, `locationSource`, `sessionVerified`, `ip`, `userAgent` |
| `ack_by/at`, `resolved_by/at`, `resolution_note` | Cycle de vie côté admin |

**RLS** : lecture par le propriétaire (`auth.uid()::text = user_id`) ou par un admin
(`user_metadata.role` / `app_metadata.role = 'admin'`). Aucune politique d'écriture :
seule l'Edge Function (service role) écrit.

---

## 3. API (`/functions/v1/make-server-2eb02e52/emergency`)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `GET` | `/config` | anon key ou session | Numéros police / ambulance / support (config admin) |
| `POST` | `/sos` | anon key ou session | Crée une alerte ; renvoie `201` + alerte |
| `POST` | `/:id/cancel` | auteur de l'alerte | Annule une alerte encore active |
| `POST` | `/:id/ack` | **JWT admin** | Marque l'alerte comme prise en charge |
| `POST` | `/:id/resolve` | **JWT admin** | Clôture (`resolved` ou `false_alarm`) |
| `GET` | `/alerts?status=&limit=` | **JWT admin** | Liste des alertes (200 max) |
| `GET` | `/active` | **JWT admin** | Alertes `active` + `acknowledged` |

### Garde-fous

- `POST /sos` : 3 alertes / 10 min / utilisateur et 10 / 10 min / IP.
- Anti-doublon : une alerte `active` de moins de **90 s** est renvoyée telle quelle (`deduplicated: true`).
- Identité : si un JWT de session est fourni, son `id` **prime** sur le `userId` du corps.
- Le message de succès n'est jamais renvoyé si l'insertion échoue.

### Notification de l'équipe

- Aucune notification n'est envoyée par défaut.
- Si `emergencySmsEnabled = true` **et** `emergencyNumbers.support` est renseigné,
  un SMS court est envoyé au support via EJ SMS (`sendEjSms`).
- En cas d'absence de crédits, l'alerte reste enregistrée ; l'échec est journalisé mais ne bloque pas l'insertion.

---

## 4. Configuration (admin)

`Admin → Paramètres globaux → Urgences (SOS)` :

| Clé | Défaut | Effet |
|---|---|---|
| `emergencyNumbers.police` | `112` | Numéro affiché / appelé dans le dialogue SOS |
| `emergencyNumbers.ambulance` | `115` | Idem |
| `emergencyNumbers.support` | `""` | Numéro de l'équipe sécurité SmartCabb |
| `emergencySmsEnabled` | `false` | Envoie un SMS au support à chaque alerte (1 crédit EJ SMS) |

Ces valeurs sont lues à chaud depuis le KV (`smartcabb_global_config`) : **aucun redéploiement** nécessaire après modification. Le dialogue SOS met en cache les numéros 5 minutes.

---

## 4 bis. Écran admin temps réel (Lot B)

### Accès

`Admin → Actions rapides → 🚨 Urgences SOS` (écran `admin-emergencies`).

La carte d'action rapide affiche un **compteur rouge pulsé** dès qu'une alerte est en cours.
Le compteur est rafraîchi toutes les 30 s via `GET /emergency/active`.

### Veilleur global (`EmergencyAlertsWatcher`)

Monté en permanence dans `AdminApp` (hors écrans login/register), il :

- interroge `GET /emergency/active` toutes les **20 s** et s'abonne au Realtime `emergency_alerts` ;
- affiche une **bannière rouge persistante** (compteur + dernier demandeur + type + adresse) ;
- joue `playSosAlarm()` : sirène 3 rafales, vibration longue, notification navigateur persistante et annonce vocale ;
- **ré-alarme toutes les 2 minutes** tant que l'alerte reste `active` (non acquittée) ;
- bascule en simple **pastille flottante « N SOS »** quand la bannière est masquée ;
- se met en **sourdine lorsque l'écran Urgences est ouvert** (l'écran gère alors l'alarme) ;
- mémorise les alertes déjà vues pour ne pas hurler à chaque rechargement de page.

L'état « alarme active / coupée » est partagé avec l'écran via `localStorage` (`smartcabb_sos_sound`).

### Écran `EmergencyAlertsScreen`

| Élément | Comportement |
|---|---|
| KPI | En cours · Sans prise en charge · SLA > 60 s · Clôturées aujourd'hui |
| Filtres | En cours (`active` + `acknowledged`) · Toutes · Clôturées |
| Carte alerte | Type, rôle, nom, téléphone, course, adresse/coordonnées ± précision, note, véhicule, autre partie |
| Chrono SLA | Temps écoulé en direct ; passe en rouge « SLA dépassé » au-delà de **60 s** sans acquittement |
| Actions | `Appeler` (`tel:`), `Itinéraire` (Google Maps), `Acquitter`, `Clôturer` |
| Clôture | Dialogue avec note (≤ 500 car.) et case **Faux positif / test** |
| Actualisation | Realtime Supabase + polling de secours toutes les **15 s** + bouton Actualiser |
| Alarme | Sirène + vibration + notification navigateur + voix sur nouvelle alerte ; ré-alarme toutes les 2 min |

Les appels utilisent `lib/emergency-admin-service.ts` avec le **JWT de session admin**.
Une session expirée ou un compte non admin affiche un message explicite (401/403).

---

## 5. Fichiers

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20261108000000_emergency_alerts.sql` | Table, index, RLS, publication Realtime |
| `supabase/migrations/20261109000000_cleanup_sos_test_rows.sql` | Nettoyage des alertes de test |
| `supabase/functions/make-server-2eb02e52/emergency-routes.ts` | Routes SOS |
| `supabase/functions/make-server-2eb02e52/index.ts` | Montage `/emergency` |
| `supabase/functions/make-server-2eb02e52/config-routes.ts` | Clés `emergencyNumbers`, `emergencySmsEnabled` |
| `lib/emergency-service.ts` | Client HTTP + cache de configuration |
| `lib/emergency-admin-service.ts` | Client admin : `/active`, `/alerts`, `ack`, `resolve` + helpers SLA |
| `lib/notification-sound.ts` | `playSosAlarm()` — sirène, vibration, notification, voix |
| `components/emergency/SOSButton.tsx` | Bouton réutilisable + état « SOS ACTIF » |
| `components/emergency/SOSDialog.tsx` | Dialogue 4 étapes (confirmation, envoi, succès, échec) |
| `components/admin/EmergencyAlertsScreen.tsx` | Écran admin temps réel (KPI, filtres, SLA, actions) |
| `components/admin/EmergencyAlertsWatcher.tsx` | Veilleur global : bannière, pastille, alarme, ré-alarme |
| `pages/AdminApp.tsx` | Écran `admin-emergencies` + montage du veilleur |
| `components/admin/AdminDashboard.tsx` | Carte d'action rapide « Urgences SOS » + compteur |
| `components/passenger/LiveTrackingScreen.tsx` | Bouton SOS unifié |
| `components/passenger/RideTrackingScreen.tsx` | Bouton SOS unifié |
| `components/driver/ActiveRideNavigationScreen.tsx` | Bouton SOS compact dans l'en-tête conducteur |
| `components/admin/GlobalSettingsScreen.tsx` | Carte « Urgences (SOS) » |

### Supprimés (code mort / dangereux)

| Fichier | Raison |
|---|---|
| `components/EmergencyAlert.tsx` | Jamais monté ; envoyait le SMS d'urgence **à l'autre partie** |
| `components/driver/SOSEmergencyButton.tsx` | Jamais utilisé, imports cassés, tables inexistantes |
| `SMS_TEMPLATES.emergency_alert_*` + `sendEmergencyAlert()` | Notifiaient le conducteur/passager en cas de SOS |

---

## 6. Limites connues / suites

- **Pas de contacts d'urgence personnels** ni de notification de proches. → Lot C.
- **Pas de mode discret** ni de PIN de désactivation. → Lot D.
- L'écran admin et le veilleur dépendent du **Realtime Supabase** ; un polling de secours (15–20 s) prend le relais si la session ne reçoit pas les événements (RLS / coupure réseau).
- La sirène web ne peut pas démarrer avant une interaction utilisateur (politique navigateur) : le premier clic déverrouille l'audio (`unlockMobileAudio`).
- Une alerte envoyée **hors ligne** n'est pas rejouée automatiquement : le dialogue propose « Réessayer » et les appels directs.
- Les numéros par défaut (`112` / `115`) doivent être validés auprès des autorités congolaises ; ils sont modifiables sans redéploiement.

---

## 7. Tests effectués (production, 2026-11-09)

| Test | Résultat |
|---|---|
| `GET /emergency/config` sans jeton | `401` |
| `GET /emergency/config` avec anon key | `200` + numéros |
| `POST /emergency/sos` sans jeton | `401` |
| `POST /emergency/sos` sans `userId` | `400` |
| `POST /emergency/sos` avec anon key | `201` + alerte persistée |
| Deuxième envoi < 90 s | `deduplicated: true` |
| `POST /:id/cancel` par l'auteur | `200`, statut `cancelled` |
| `POST /:id/cancel` par un autre | `403` |
| `GET /emergency/alerts` avec anon key | `401` |
| `GET /emergency/active` sans jeton | `401` |
| `GET /rest/v1/emergency_alerts` avec anon key | `[]` (RLS) |

Alertes de test supprimées par la migration `20261109000000`.

---

## 8. Tests effectués — Lot B (2026-11-11)

| Test | Résultat |
|---|---|
| `npx tsc --noEmit` | OK hors erreurs pré-existantes `_headers/Code-component-*.tsx` |
| `npx vite build` | OK — chunk `EmergencyAlertsScreen-*.js` produit |
| `GET /emergency/active` avec JWT admin | `200` + `{ count, alerts }` |
| `POST /:id/ack` avec JWT admin | `200`, statut `acknowledged`, `ack_at` renseigné |
| `POST /:id/resolve` (`false_alarm`) | `200`, statut `false_alarm`, `resolution_note` |
| `GET /emergency/active` avec anon key | `401` (le client admin n'utilise que le JWT) |
| Bannière + sirène sur nouvelle alerte | À valider manuellement en production |
| Ré-alarme après 2 min sans acquittement | À valider manuellement en production |
| Rafraîchissement Realtime de la liste | À valider manuellement en production (polling 15 s en secours) |
