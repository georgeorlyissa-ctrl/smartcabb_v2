# 🧪 Guide de Test - Attribution Séquentielle SmartCabb

**Date** : 14 février 2026

---

## ✅ Le système est DÉJÀ opérationnel !

Bonne nouvelle : **Votre système d'attribution séquentielle fonctionne déjà** ! Il est actif dans le code depuis les lignes 142-311 du fichier `/supabase/functions/server/ride-routes.tsx`.

---

## 🎯 Ce Qui Fonctionne Actuellement

### ✅ Attribution Séquentielle (Round Robin)
- **1 conducteur à la fois** - Pas de broadcast simultané
- **Timeout de 15 secondes** - Si pas de réponse, passage au suivant
- **Tri intelligent** : Proximité → Meilleure note
- **Gestion des refus** : Les conducteurs qui refusent sont exclus

---

## 🧪 Comment Tester

### Test 1 : Créer Une Course et Observer les Logs

#### Étape 1 : Préparer le Backend

```bash
# Ouvrir les logs en temps réel
supabase functions logs make-server-2eb02e52 --tail
```

Gardez cette fenêtre ouverte pour voir les logs en direct.

#### Étape 2 : Créer Une Course

1. **Passager** : Ouvrez l'application passager
2. **Saisir** : Adresse de départ et destination
3. **Choisir** : Type de véhicule (ex: Smart Standard)
4. **Créer** : Cliquer sur "Demander une course"

#### Étape 3 : Observer les Logs

Vous devriez voir :

```
🎯 ========== DÉBUT MATCHING SÉQUENTIEL ==========
🆔 Ride ID: ride_1234567890_abc123
📍 Pickup: Avenue Kasavubu, Kinshasa
🚗 Type véhicule: smart_standard
🕒 Timestamp: 2026-02-14T21:15:00.000Z

🔍 [STEP 1] Récupération des conducteurs depuis KV store...
📋 3 conducteur(s) trouvé(s) dans le système

✅ Jean Mukendi: ÉLIGIBLE (standard, en ligne, GPS OK)
⏭️ Marie Kabila: HORS LIGNE
✅ Pierre Tshisekedi: ÉLIGIBLE (standard, en ligne, GPS OK)

🎯 2 conducteur(s) éligible(s)

📊 Conducteurs triés par proximité + note:
  1. Jean Mukendi - 0.85km - ⭐4.9
  2. Pierre Tshisekedi - 2.30km - ⭐4.7

🔔 [1/2] Envoi notification à: Jean Mukendi
✅ Course ride_1234 assignée au conducteur Jean Mukendi
📱 Envoi notification FCM au conducteur: Jean Mukendi
⏳ Attente de 15 secondes pour la réponse de Jean Mukendi...
```

---

### Test 2 : Vérifier l'Acceptation

#### Scénario A : Le Conducteur Accepte

**Conducteur Jean** :
1. Recevoir la notification sonore 🔊
2. Voir la popup avec les détails
3. Cliquer **"Accepter"**

**Logs attendus** :
```
✅ COURSE ACCEPTÉE par Jean Mukendi !
🎯 ========== FIN MATCHING SÉQUENTIEL (SUCCÈS) ==========
```

**Durée** : 2-10 secondes

---

#### Scénario B : Le Conducteur Refuse

**Conducteur Jean** :
1. Recevoir la notification
2. Cliquer **"Refuser"**

**Logs attendus** :
```
❌ Refus de course: { rideId: 'ride_1234', driverId: 'jean_id' }
🚫 Conducteurs ayant déjà refusé: 1
ℹ️ Course refusée par jean_id, relance immédiate du matching séquentiel...

🎯 ========== DÉBUT MATCHING SÉQUENTIEL ==========
⏭️ Jean Mukendi a déjà refusé, ignoré

🔔 [2/2] Envoi notification à: Pierre Tshisekedi
⏳ Attente de 15 secondes pour la réponse de Pierre Tshisekedi...
```

**Action** : Le système passe **immédiatement** au conducteur suivant (Pierre).

---

#### Scénario C : Timeout (Pas de Réponse)

**Conducteur Jean** :
1. Recevoir la notification
2. **NE PAS RÉPONDRE** pendant 15 secondes

**Logs attendus** :
```
⏳ Attente de 15 secondes pour la réponse de Jean Mukendi...
[... 15 secondes s'écoulent ...]
⏭️ Pas de réponse de Jean Mukendi, passage au conducteur suivant

🔔 [2/2] Envoi notification à: Pierre Tshisekedi
⏳ Attente de 15 secondes...
```

**Durée** : Exactement 15 secondes entre chaque conducteur.

---

### Test 3 : Vérifier l'Ordre de Sélection

**Objectif** : S'assurer que le conducteur le plus proche et/ou avec la meilleure note est contacté en premier.

#### Configuration

Créez 3 conducteurs avec ces caractéristiques :

| Conducteur | Distance | Note | Ordre attendu |
|------------|----------|------|---------------|
| Conducteur A | 1.0 km | ⭐ 4.5 | 2ème |
| Conducteur B | 0.8 km | ⭐ 4.8 | **1er** (+ proche + bonne note) |
| Conducteur C | 3.5 km | ⭐ 5.0 | 3ème (trop loin) |

#### Test

1. Les 3 conducteurs passent **en ligne**
2. Créer une course
3. Observer les logs

**Logs attendus** :
```
📊 Conducteurs triés par proximité + note:
  1. Conducteur B - 0.80km - ⭐4.8
  2. Conducteur A - 1.00km - ⭐4.5
  3. Conducteur C - 3.50km - ⭐5.0

🔔 [1/3] Envoi notification à: Conducteur B
```

✅ **Conducteur B** est contacté en premier car il est le plus proche.

---

### Test 4 : Aucun Conducteur Disponible

**Configuration** :
- Tous les conducteurs **hors ligne** OU
- Aucun conducteur de la catégorie demandée

**Logs attendus** :
```
🔍 [STEP 1] Récupération des conducteurs...
📋 3 conducteur(s) trouvé(s) dans le système

⏭️ Jean Mukendi: HORS LIGNE
⏭️ Marie Kabila: mauvaise catégorie (confort ≠ standard)
⏭️ Pierre Tshisekedi: PAS DE GPS

❌ Aucun conducteur éligible trouvé
```

**Résultat** : La course reçoit le statut `no_drivers`.

---

## 📊 Vérification de l'État de la Course

### Méthode 1 : Via l'API

```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/make-server-2eb02e52/rides/status/RIDE_ID \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Réponse attendue** :
```json
{
  "success": true,
  "ride": {
    "id": "ride_1234567890_abc",
    "status": "pending",
    "assignedDriverId": "jean_mukendi_id",
    "assignedDriverName": "Jean Mukendi",
    "assignedAt": "2026-02-14T21:15:05.000Z",
    ...
  }
}
```

### Méthode 2 : Logs Backend

Recherchez dans les logs :
```bash
grep "assignedDriverId" logs.txt
```

---

## 🔍 Diagnostic des Problèmes

### Problème 1 : Le Matching Ne Se Lance Pas

**Symptôme** : Aucun log `🎯 ========== DÉBUT MATCHING SÉQUENTIEL ==========`

**Vérification** :
```bash
grep "CRITIQUE" logs.txt
```

**Logs attendus** :
```
🚀 [CRITIQUE] Lancement du matching séquentiel pour: ride_xxx
🚀 [CRITIQUE] Pickup: {"lat":-4.3217,"lng":15.3125,"address":"Gombe"}
🚀 [CRITIQUE] VehicleType: smart_standard
🚀 [CRITIQUE] startSequentialMatching() lancé en arrière-plan
```

**Si absents** : Problème lors de la création de la course. Vérifier `POST /rides/create`.

---

### Problème 2 : Conducteur Ne Reçoit Pas la Notification

**Symptôme** : Le log montre `⏳ Attente de 15 secondes...` mais le conducteur ne voit rien.

**Vérifications** :

1. **Conducteur en ligne ?**
   ```bash
   grep "HORS LIGNE" logs.txt
   ```

2. **Token FCM enregistré ?**
   ```bash
   grep "Token FCM récupéré" logs.txt
   ```
   
   Log attendu : `🔍 Token FCM récupéré depuis KV store: OUI ✅`

3. **SMS envoyé ?**
   ```bash
   grep "SMS" logs.txt
   ```

**Solutions** :
- ✅ S'assurer que le conducteur est **en ligne** dans son dashboard
- ✅ Vérifier que le conducteur a activé les **permissions de notification**
- ✅ Voir le guide `/FIX_NOTIFICATIONS_SONORES_V2.md` pour diagnostiquer les notifications sonores

---

### Problème 3 : Timeout Systématique

**Symptôme** : Toutes les notifications expirent après 15 secondes.

**Causes possibles** :
1. ❌ Conducteur ne voit pas la popup (notifications sonores désactivées)
2. ❌ Conducteur voit la popup mais ne clique pas
3. ❌ Bug frontend (acceptation ne communique pas avec le backend)

**Tests** :

1. **Vérifier polling côté conducteur** :
   - Ouvrir la console (F12) dans l'app conducteur
   - Chercher : `📱 Nouvelle demande de course reçue`

2. **Vérifier l'acceptation** :
   - Cliquer "Accepter"
   - Vérifier logs : `✅ POST /rides/accept`

---

## 📈 Métriques de Performance

### Temps de Réponse Attendus

| Scénario | Temps Min | Temps Typique | Temps Max |
|----------|-----------|---------------|-----------|
| Acceptation immédiate | 2s | 5s | 10s |
| 1 refus | 5s | 18s | 30s |
| 1 timeout | 15s | 20s | 30s |
| 2 timeouts | 30s | 35s | 45s |
| Aucun conducteur | 1s | 2s | 5s |

### Indicateurs de Succès

✅ **Taux d'acceptation** : > 70%  
✅ **Temps moyen** : < 20 secondes  
✅ **Échecs (no_drivers)** : < 10%  

---

## 🎯 Checklist de Validation

### Avant de Tester

- [ ] Backend déployé et à jour
  ```bash
  supabase functions deploy make-server-2eb02e52
  ```

- [ ] Au moins 2 conducteurs enregistrés
- [ ] Conducteurs passés "en ligne"
- [ ] Conducteurs ont position GPS activée
- [ ] Permissions de notification accordées

### Pendant les Tests

- [ ] Logs backend visibles en temps réel
- [ ] Console frontend ouverte (F12)
- [ ] Téléphone avec son activé (notifications sonores)

### Tests à Effectuer

- [ ] **Test 1** : Acceptation immédiate
- [ ] **Test 2** : Refus + passage au suivant
- [ ] **Test 3** : Timeout + passage au suivant
- [ ] **Test 4** : Vérifier l'ordre de sélection (proximité + note)
- [ ] **Test 5** : Aucun conducteur disponible → `no_drivers`

---

## 💡 Astuces de Débogage

### Astuce 1 : Logs Filtrés

```bash
# Voir uniquement les étapes du matching
supabase functions logs make-server-2eb02e52 | grep "SÉQUENTIEL"

# Voir les notifications envoyées
supabase functions logs make-server-2eb02e52 | grep "🔔"

# Voir les refus
supabase functions logs make-server-2eb02e52 | grep "Refus"
```

### Astuce 2 : Réduire le Timeout pour Tester

**Temporairement**, vous pouvez réduire le timeout de 15s à 5s pour tester plus rapidement :

```typescript
// Ligne 284 de ride-routes.tsx
await new Promise(resolve => setTimeout(resolve, 5000)); // Au lieu de 15000
```

⚠️ **Ne pas déployer en production avec cette modification !**

### Astuce 3 : Simulation en Local

Pour tester sans créer de vraies courses :

```bash
# Appeler directement l'endpoint
curl -X POST http://localhost:54321/functions/v1/make-server-2eb02e52/rides/create \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "test",
    "passengerName": "Test User",
    "pickup": {"lat": -4.3217, "lng": 15.3125, "address": "Gombe"},
    "destination": {"lat": -4.3300, "lng": 15.3200, "address": "Kinshasa"},
    "vehicleType": "smart_standard",
    "estimatedPrice": 5000
  }'
```

---

## 📞 Support

Si les tests échouent :

1. **Vérifier les logs** : `supabase functions logs make-server-2eb02e52 --tail`
2. **Consulter la documentation** : `/SYSTEME_ATTRIBUTION_SEQUENTIELLE.md`
3. **Diagnostic notifications** : `/GUIDE_DIAGNOSTIC_NOTIFICATIONS_SONORES.md`

---

## ✅ Résumé

Le système d'attribution séquentielle est **opérationnel** et fonctionne comme suit :

1. **Course créée** → Matching lancé automatiquement
2. **Conducteurs triés** → Proximité + Meilleure note
3. **Notification envoyée** → 1 seul conducteur à la fois
4. **Attente 15 secondes** → Acceptation / Refus / Timeout
5. **Si refus/timeout** → Passage automatique au suivant
6. **Si acceptation** → Course attribuée ✅

**Pas de configuration supplémentaire nécessaire** - tout est déjà en place dans le code !

---

**Date** : 14 février 2026  
**Version** : 1.0
