# 🧪 Test Attribution Séquentielle - 2 Conducteurs

**Objectif** : Vérifier que le système notifie les conducteurs UN PAR UN, pas tous en même temps.

---

## 📋 Prérequis

### 1. Backend Déployé avec Logs Améliorés

```bash
supabase functions deploy make-server-2eb02e52
```

### 2. Deux Conducteurs Prêts

**Conducteur A** :
- ✅ Compte créé et approuvé
- ✅ Véhicule configuré (catégorie: standard/confort/premium)
- ✅ En ligne (switch activé)
- ✅ GPS actif (position mise à jour)

**Conducteur B** :
- ✅ Compte créé et approuvé
- ✅ Véhicule **même catégorie** que A
- ✅ En ligne (switch activé)
- ✅ GPS actif (position mise à jour)

### 3. Terminal avec Logs en Temps Réel

```bash
supabase functions logs make-server-2eb02e52 --tail
```

Gardez ce terminal ouvert pendant le test.

---

## 🚀 Procédure de Test

### Étape 1 : Vérifier les Conducteurs en Ligne (30 secondes)

1. **Ouvrir 2 navigateurs/onglets** :
   - Navigateur 1 : Conducteur A connecté
   - Navigateur 2 : Conducteur B connecté

2. **Les deux doivent être EN LIGNE** :
   - Dashboard conducteur → Switch "En ligne" = ✅ ON
   - Vérifier que la position GPS s'affiche

3. **Vérifier dans les logs** :
   ```bash
   supabase functions logs make-server-2eb02e52 | grep "is_available"
   ```
   
   Chercher :
   ```
   ✅ Jean Mukendi: ÉLIGIBLE (standard, en ligne, GPS OK)
   ✅ Marie Kabila: ÉLIGIBLE (standard, en ligne, GPS OK)
   ```

---

### Étape 2 : Créer une Course (Passager) (1 minute)

1. **Ouvrir l'app passager** (3ème navigateur/onglet)

2. **Créer une course** :
   - Pickup : Choisir une adresse
   - Destination : Choisir une destination
   - Type de véhicule : **Même catégorie** que les conducteurs
   - Cliquer "Demander une course"

3. **Observer les logs immédiatement** :
   ```
   🎯 ========== DÉBUT MATCHING SÉQUENTIEL ==========
   🎯 2 conducteur(s) éligible(s)
   
   📊 Conducteurs triés par proximité + note:
     1. Jean Mukendi - 2.50km - ⭐4.8
     2. Marie Kabila - 3.00km - ⭐4.5
   ```

---

### Étape 3 : Observer Conducteur A (15 secondes)

**Dans le navigateur du Conducteur A** :

✅ **Doit voir** :
- 🔊 3 beeps sonores
- 🗣️ Message vocal
- 📱 Popup de notification avec détails de la course
- ⏱️ Timer 15 secondes

❌ **Ne DOIT PAS voir** dans le navigateur du Conducteur B (encore).

**Logs attendus** :
```
🔄 [ITERATION 1/2] Traitement du conducteur: Jean Mukendi
🔔 [1/2] Envoi notification à: Jean Mukendi
✅ Course ride_xxx assignée au conducteur Jean Mukendi
✅ Notification FCM envoyée avec succès
⏳ Attente de 15 secondes pour la réponse de Jean Mukendi...
⏰ Début d'attente: 2026-02-15T10:30:00.000Z
```

---

### Étape 4 : NE PAS Accepter (Important !)

**Conducteur A : NE CLIQUEZ PAS sur "Accepter"**

Laissez le timer arriver à zéro (15 secondes).

**Logs attendus après 15s** :
```
⏰ Fin d'attente: 2026-02-15T10:30:15.000Z

📊 APRÈS TIMEOUT DE 15S pour Jean Mukendi:
   - Status de la course: pending
   - Conducteur assigné: jean_mukendi_id
   - Index conducteur actuel: [1/2]

⏭️ Pas de réponse de Jean Mukendi, passage au conducteur suivant
🔄 Continuation de la boucle vers le conducteur #2...
```

---

### Étape 5 : Observer Conducteur B (15 secondes)

**MAINTENANT, dans le navigateur du Conducteur B** :

✅ **Doit voir** :
- 🔊 3 beeps sonores (nouveau !)
- 🗣️ Message vocal
- 📱 Popup de notification
- ⏱️ Timer 15 secondes

**Logs attendus** :
```
🔄 [ITERATION 2/2] Traitement du conducteur: Marie Kabila
🔔 [2/2] Envoi notification à: Marie Kabila
✅ Course ride_xxx assignée au conducteur Marie Kabila
✅ Notification FCM envoyée avec succès
⏳ Attente de 15 secondes pour la réponse de Marie Kabila...
⏰ Début d'attente: 2026-02-15T10:30:16.000Z
```

---

### Étape 6 : Accepter la Course

**Conducteur B : Cliquer sur "Accepter"**

**Résultat attendu** :

✅ **Conducteur B** :
- Popup disparaît
- Dashboard passe en mode "Course en cours"
- Voir les détails du passager

✅ **Passager** :
- Voir "Conducteur trouvé : Marie Kabila"
- Voir les détails du véhicule
- Carte mise à jour avec la position du conducteur

❌ **Conducteur A** :
- La notification a déjà disparu (timeout)
- Ne voit plus rien

**Logs attendus** :
```
✅ COURSE ACCEPTÉE par Marie Kabila !
🎯 ========== FIN MATCHING SÉQUENTIEL (SUCCÈS) ==========
```

---

## ✅ Critères de Réussite

| Critère | Attendu | ✅/❌ |
|---------|---------|------|
| **2 conducteurs éligibles** | Logs confirment 2 éligibles | ⬜ |
| **Notification séquentielle** | A reçoit d'abord, puis B | ⬜ |
| **Timing** | ~15-20s entre les 2 notifications | ⬜ |
| **Isolation** | B ne voit RIEN pendant que A a la notif | ⬜ |
| **Acceptation** | B accepte → système s'arrête | ⬜ |
| **Logs complets** | Tous les logs attendus présents | ⬜ |

---

## 🐛 Problèmes Possibles et Solutions

### Problème 1 : Les 2 Conducteurs Voient la Course en Même Temps

**Symptôme** : A et B reçoivent la notification simultanément.

**Cause probable** : L'assignation `ride_${rideId}:current_driver` ne fonctionne pas.

**Diagnostic** :
```bash
supabase functions logs make-server-2eb02e52 | grep "ASSIGNÉE"
```

**Si vous voyez** :
```
✅ Course ride_xxx ASSIGNÉE à jean_id
✅ Course ride_xxx ASSIGNÉE à marie_id  ← EN MÊME TEMPS
```

→ Problème confirmé.

**Solution** : Vérifier que le backend a bien été redéployé.

---

### Problème 2 : Conducteur B Ne Reçoit Jamais

**Symptôme** : Après 15s, rien ne se passe pour B.

**Cause probable** : La boucle s'arrête après A.

**Diagnostic** :
```bash
supabase functions logs make-server-2eb02e52 | grep "ITERATION"
```

**Si vous voyez seulement** :
```
🔄 [ITERATION 1/2] Traitement du conducteur: Jean Mukendi
```

Mais PAS :
```
🔄 [ITERATION 2/2] Traitement du conducteur: Marie Kabila
```

→ La boucle ne continue pas.

**Solutions** :
1. Vérifier qu'il n'y a pas d'erreur dans `sendDriverNotification`
2. Vérifier que le `for` loop n'a pas de `return` précoce
3. Chercher les erreurs :
   ```bash
   supabase functions logs make-server-2eb02e52 | grep "❌"
   ```

---

### Problème 3 : Un Seul Conducteur Éligible

**Symptôme** : Les logs montrent `1 conducteur(s) éligible(s)`.

**Causes possibles** :

1. **Conducteur B hors ligne** :
   ```
   ⏭️ Marie Kabila: HORS LIGNE
   ```
   → Mettre B en ligne

2. **Mauvaise catégorie** :
   ```
   ⏭️ Marie Kabila: mauvaise catégorie (confort ≠ standard)
   ```
   → Changer la catégorie ou créer une course avec la bonne catégorie

3. **Pas de GPS** :
   ```
   ⏭️ Marie Kabila: PAS DE GPS
   ```
   → Activer la géolocalisation pour B

---

## 📊 Résultats Attendus

### Timeline Complète (Idéale)

```
T+0s    : Passager crée la course
T+1s    : Système trie : [A, B]
T+2s    : 🔔 A reçoit notification
T+2-17s : ⏳ Attente (B ne voit rien)
T+17s   : ⏭️ Timeout, A perd la notification
T+18s   : 🔔 B reçoit notification
T+22s   : ✅ B accepte
T+23s   : 🎉 Course confirmée
```

**Durée totale** : ~20-25 secondes

---

### Timeline avec Retry (2 Conducteurs, Aucun N'Accepte)

```
T+0s    : Passager crée la course
T+2s    : 🔔 A reçoit notification
T+17s   : ⏭️ Timeout A
T+18s   : 🔔 B reçoit notification
T+33s   : ⏭️ Timeout B
T+38s   : 🔄 RETRY #1 - A reçoit à nouveau
T+53s   : ⏭️ Timeout A
T+58s   : 🔄 RETRY #1 - B reçoit à nouveau
T+73s   : ⏭️ Timeout B
T+78s   : 🔄 RETRY #2 - A reçoit (dernière tentative)
T+93s   : ⏭️ Timeout A
T+98s   : 🔄 RETRY #2 - B reçoit (dernière tentative)
T+113s  : ❌ ÉCHEC FINAL → no_drivers
```

**Durée max** : ~2 minutes

---

## 📝 Rapport de Test

Après le test, remplir :

### Configuration
- **Nombre de conducteurs** : 2
- **Catégorie véhicule** : ___________
- **Distance A** : ___ km
- **Distance B** : ___ km

### Résultats
- **A reçoit en premier** : ✅ / ❌
- **Délai avant B** : ___ secondes
- **B reçoit après timeout** : ✅ / ❌
- **Acceptation fonctionne** : ✅ / ❌

### Logs Capturés
```bash
# Sauvegarder les logs du test
supabase functions logs make-server-2eb02e52 --since 5m > test_2_conducteurs.log
```

---

## 🎯 Prochaines Actions

Si le test **réussit** :
- ✅ Le système fonctionne correctement
- ✅ Tester avec 3+ conducteurs
- ✅ Tester le retry automatique

Si le test **échoue** :
- 📋 Partager les logs : `test_2_conducteurs.log`
- 📋 Noter le comportement observé
- 📋 Vérifier la configuration des conducteurs

---

**Date du test** : __________  
**Testeur** : __________  
**Résultat** : ✅ SUCCÈS / ❌ ÉCHEC / ⚠️ PARTIEL

---

**Durée du test** : ~5 minutes  
**Difficulté** : Facile  
**Documentation** : `/DEBUG_SEQUENTIEL.md`
