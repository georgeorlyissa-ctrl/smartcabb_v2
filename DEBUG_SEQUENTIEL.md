# 🔍 Debug : Attribution Séquentielle - 2 Conducteurs

## 🎯 Comportement Attendu

Avec **2 conducteurs en ligne** (A et B), voici ce qui DOIT se passer :

```
T+0s   : Passager crée une course
T+1s   : Système trie les conducteurs (proximité + note)
         Résultat : [A (2.5km, ⭐4.8), B (3.0km, ⭐4.5)]
         
T+2s   : 🔔 Notification UNIQUEMENT à conducteur A
         └─ assignedDriverId = A
         └─ ride_{id}:current_driver = A
         
T+2-17s: ⏳ ATTENTE 15 secondes
         └─ AUCUN autre conducteur ne doit voir la course
         
T+17s  : Vérification : A a-t-il accepté ?
         
         CAS 1 : ✅ A accepte
         └─ FIN (succès)
         
         CAS 2 : ⏭️ A ne répond pas
         ├─ 🔔 Notification à conducteur B
         ├─ assignedDriverId = B  
         ├─ ride_{id}:current_driver = B
         └─ ⏳ ATTENTE 15 secondes
         
T+32s  : Vérification : B a-t-il accepté ?
         
         CAS 1 : ✅ B accepte
         └─ FIN (succès)
         
         CAS 2 : ⏭️ B ne répond pas
         └─ 🔄 RETRY (car seulement 2 conducteurs)
```

---

## ❌ Comportement Actuel (Problème Rapporté)

> "Le push de notification ne prend qu'un seul conducteur"

**Interprétation possible** :
1. **Un seul conducteur reçoit** : OK, c'est normal ! C'est le principe séquentiel.
2. **Mais si timeout, le 2ème ne reçoit PAS** : ❌ PROBLÈME

---

## 🔬 Points de Vérification

### 1. Les 2 Conducteurs Sont-Ils Éligibles ?

**Checklist pour chaque conducteur** :

```typescript
✅ is_available || isOnline === true
✅ vehicle.category === vehicleType demandé
✅ location.lat et location.lng existent
```

**Comment vérifier** :

```bash
# Logs backend lors de la création de course
supabase functions logs make-server-2eb02e52 | grep "éligible"
```

**Exemple de logs OK** :
```
✅ Jean Mukendi: ÉLIGIBLE (standard, en ligne, GPS OK)
✅ Marie Kabila: ÉLIGIBLE (standard, en ligne, GPS OK)
🎯 2 conducteur(s) éligible(s)
```

**Exemple de logs PROBLÈME** :
```
✅ Jean Mukendi: ÉLIGIBLE (standard, en ligne, GPS OK)
⏭️ Marie Kabila: HORS LIGNE
🎯 1 conducteur(s) éligible(s)
```

---

### 2. Le Système Séquentiel S'Exécute-t-il ?

**Logs à rechercher** :

```bash
supabase functions logs make-server-2eb02e52 | grep "MATCHING SÉQUENTIEL"
```

**Exemple de logs OK (2 conducteurs)** :
```
🎯 ========== DÉBUT MATCHING SÉQUENTIEL ==========
🎯 2 conducteur(s) éligible(s)

📊 Conducteurs triés par proximité + note:
  1. Jean Mukendi - 2.50km - ⭐4.8
  2. Marie Kabila - 3.00km - ⭐4.5

🔔 [1/2] Envoi notification à: Jean Mukendi
✅ Course ride_xxx assignée au conducteur Jean Mukendi
⏳ Attente de 15 secondes pour la réponse de Jean Mukendi...

[15 secondes plus tard]

⏭️ Pas de réponse de Jean Mukendi, passage au conducteur suivant

🔔 [2/2] Envoi notification à: Marie Kabila
✅ Course ride_xxx assignée au conducteur Marie Kabila
⏳ Attente de 15 secondes pour la réponse de Marie Kabila...
```

---

### 3. L'Assignation est-elle Correcte ?

**Vérifier que `ride_{id}:current_driver` change** :

```bash
# Voir les assignations
supabase functions logs make-server-2eb02e52 | grep "current_driver"
```

**Logs attendus** :
```
T+2s  : ride_abc123:current_driver = jean_id
T+17s : ride_abc123:current_driver = marie_id
```

---

### 4. Le Polling Conducteur Filtre-t-il Correctement ?

**Le polling doit ne retourner QUE les courses assignées au conducteur** :

```bash
# Logs de l'endpoint /pending/:driverId
supabase functions logs make-server-2eb02e52 | grep "ASSIGNÉE"
```

**Logs attendus pour conducteur A** :
```
T+2s  : ✅ Course ride_abc123 ASSIGNÉE à jean_id
        [Jean reçoit la notification]
        
T+17s : ℹ️ Aucune course assignée à ce conducteur
        [Jean ne voit plus la course car timeout]
```

**Logs attendus pour conducteur B** :
```
T+2s  : ℹ️ Aucune course assignée à ce conducteur
        [Marie ne voit RIEN]
        
T+17s : ✅ Course ride_abc123 ASSIGNÉE à marie_id
        [Marie reçoit maintenant la notification]
```

---

## 🐛 Problèmes Possibles

### Problème 1 : Tous les Conducteurs Voient la Course

**Symptôme** : Les 2 conducteurs reçoivent la notification en même temps.

**Cause** : La vérification `ride_${req.id}:current_driver` ne fonctionne pas.

**Solution** : Vérifier que la clé est bien sauvegardée :

```typescript
// Dans startSequentialMatching, ligne 264
await kv.set(`ride_${rideId}:current_driver`, driver.id);
```

---

### Problème 2 : Le 2ème Conducteur Ne Reçoit Jamais

**Symptôme** : Seul le 1er conducteur reçoit, jamais le 2ème même après timeout.

**Causes possibles** :
1. Le timeout de 15s ne se termine pas
2. Le `for` loop s'arrête après le 1er conducteur
3. Une erreur dans `sendDriverNotification` bloque la boucle

**Solution** : Ajouter des logs détaillés (voir ci-dessous).

---

### Problème 3 : La Boucle Ne Continue Pas

**Symptôme** : Après le timeout, rien ne se passe.

**Cause** : Le `await` bloque ou une erreur est swallowed.

**Solution** : Vérifier que le code après `await new Promise(resolve => setTimeout(resolve, 15000))` s'exécute.

---

## 🛠️ Solutions de Diagnostic

### Solution 1 : Logs Détaillés Améliorés

J'ai amélioré les logs dans le code. Après déploiement, vous verrez :

```bash
supabase functions logs make-server-2eb02e52 --tail
```

**Ce qu'il faut voir** :
```
🎯 ========== DÉBUT MATCHING SÉQUENTIEL ==========
🎯 2 conducteur(s) éligible(s)

🔔 [1/2] Envoi notification à: Jean Mukendi
⏳ Attente de 15 secondes...
📊 APRÈS TIMEOUT : Status de la course = pending
⏭️ Pas de réponse de Jean Mukendi, passage au conducteur suivant

🔔 [2/2] Envoi notification à: Marie Kabila
⏳ Attente de 15 secondes...
```

---

### Solution 2 : Test Manuel Étape par Étape

1. **Préparer 2 conducteurs** :
   - Conducteur A : Jean (en ligne, GPS actif)
   - Conducteur B : Marie (en ligne, GPS actif)

2. **Créer une course** (côté passager)

3. **Observer conducteur A** :
   - ✅ Doit voir la notification immédiatement
   - Timer de 15 secondes apparaît

4. **NE PAS accepter** (laisser le timeout)

5. **Après 15 secondes** :
   - ❌ Conducteur A : Notification disparaît
   - ✅ Conducteur B : Notification apparaît

6. **Observer les logs** :
   ```bash
   supabase functions logs make-server-2eb02e52 | grep "🔔"
   ```

---

### Solution 3 : Vérifier le KV Store

**Commande de diagnostic** (si accès au backend) :

```typescript
// Voir toutes les clés liées à une course
const rideId = "ride_1739611234_abc123";

const currentDriver = await kv.get(`ride_${rideId}:current_driver`);
const notifiedAt = await kv.get(`ride_${rideId}:notified_at`);
const refusedDrivers = await kv.get(`ride_${rideId}:refused_drivers`);

console.log({
  currentDriver,   // Devrait être "jean_id" puis "marie_id"
  notifiedAt,      // Timestamp de la dernière notification
  refusedDrivers   // Array des conducteurs qui ont refusé
});
```

---

## ✅ Checklist de Validation

Avant de conclure que le système fonctionne :

- [ ] **Logs** : Voir "🔔 [1/2]" puis "🔔 [2/2]" dans les logs
- [ ] **Timing** : ~15-20 secondes entre les 2 notifications
- [ ] **Isolation** : Conducteur B ne voit RIEN pendant que A a la notification
- [ ] **Transition** : Conducteur A perd la notif, puis B la reçoit
- [ ] **Acceptation** : Si B accepte, le système s'arrête (pas de 3ème conducteur)

---

## 🚀 Prochaines Étapes

1. **Déployer le backend amélioré** :
   ```bash
   supabase functions deploy make-server-2eb02e52
   ```

2. **Créer une course de test** avec 2 conducteurs en ligne

3. **Capturer les logs** :
   ```bash
   supabase functions logs make-server-2eb02e52 --tail > test_sequentiel.log
   ```

4. **Analyser le fichier de log** pour identifier le problème exact

5. **Partager les logs** pour diagnostic approfondi

---

**Document créé** : 15 février 2026  
**Objectif** : Diagnostiquer le problème de notification séquentielle
