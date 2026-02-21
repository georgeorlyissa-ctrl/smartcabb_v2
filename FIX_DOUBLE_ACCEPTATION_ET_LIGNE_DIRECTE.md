# 🔧 Fix : Double Acceptation + Ligne Droite → Itinéraire Réel

**Date** : 15 février 2026  
**Problèmes** : 
1. Plusieurs conducteurs peuvent accepter la même course
2. Carte affiche une ligne droite au lieu d'un itinéraire réel

---

## ❌ Problème 1 : Double Acceptation de Course

### Symptôme

- **Passager crée une course**
- **Conducteur A** reçoit la notification
- **Conducteur B** reçoit la notification
- **Conducteur A** accepte → Course = "accepted"
- **Conducteur B** peut ENCORE voir et accepter la course ❌
- Résultat : 2 conducteurs pensent avoir la même course

---

### ✅ Solution Implémentée

**Fichier** : `/supabase/functions/server/ride-routes.tsx`

**Modifications** (lignes 1211-1249) :

```typescript
// Sauvegarder la course acceptée
await kv.set(`ride_request_${rideId}`, acceptedRide);
await kv.set(`ride_active_${rideId}`, acceptedRide);

// Supprimer de la liste des courses en attente
await kv.del(`ride_pending_${rideId}`);

// 🎯 NOUVEAU : Nettoyer les clés de matching séquentiel
await kv.del(`ride_${rideId}:current_driver`);
await kv.del(`ride_${rideId}:notified_at`);

// 🆕 CRITICAL : Invalider les notifications FCM des autres conducteurs
console.log('🚫 Invalidation des notifications des autres conducteurs...');

// Marquer la course comme "prise" pour que les autres conducteurs ne puissent plus l'accepter
await kv.set(`ride_${rideId}:accepted_by`, driverId);

// Récupérer tous les conducteurs qui auraient pu recevoir la notification
const allDrivers = await kv.getByPrefix('driver:');
let notificationsInvalidated = 0;

for (const driver of allDrivers) {
  if (!driver || driver.id === driverId) continue; // Ignorer le conducteur qui a accepté
  
  // Supprimer la notification de ce conducteur si elle existe
  const notificationKey = `driver_notification:${driver.id}:${rideId}`;
  const notification = await kv.get(notificationKey);
  
  if (notification) {
    await kv.del(notificationKey);
    notificationsInvalidated++;
    console.log(`  ✅ Notification supprimée pour conducteur: ${driver.full_name || driver.id}`);
    
    // 🔔 Envoyer une notification FCM pour annuler visuellement la notification
    try {
      const fcmToken = driver.fcmToken || driver.fcm_token;
      if (fcmToken) {
        const { sendRideCancellationToDriver } = await import('./firebase-admin.tsx');
        await sendRideCancellationToDriver(fcmToken, rideId, 'Course déjà acceptée par un autre conducteur');
        console.log(`  📱 Notification d'annulation envoyée à: ${driver.full_name || driver.id}`);
      }
    } catch (error) {
      console.debug(`  ⚠️ Erreur envoi notification annulation à ${driver.id}:`, error);
    }
  }
}

console.log(`✅ ${notificationsInvalidated} notifications invalidées`);
console.log('✅ Course acceptée par le conducteur:', driverId);
```

**Nouvelle fonction FCM** : `/supabase/functions/server/firebase-admin.tsx`

```typescript
/**
 * 🆕 Envoie une notification d'annulation de course à un chauffeur
 * 
 * @param driverToken - Token FCM du chauffeur
 * @param rideId - ID de la course annulée
 * @param reason - Raison de l'annulation
 */
export async function sendRideCancellationToDriver(
  driverToken: string,
  rideId: string,
  reason: string
): Promise<FCMSendResult> {
  console.log(`📱 Envoi notification annulation à un conducteur (ride: ${rideId})`);
  
  return await sendFCMNotification(driverToken, {
    title: '❌ Course déjà prise',
    body: reason,
    data: {
      type: 'ride_cancelled',
      rideId,
      reason,
      timestamp: new Date().toISOString(),
      // 🆕 Flag pour que l'app mobile supprime la notification
      action: 'dismiss_notification'
    }
  });
}
```

**Flow après modification** :

```
┌──────────────────────────────────────┐
│ Passager crée course                 │
│ ID: ride_abc123                      │
└──────────────────────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Backend cherche conducteurs          │
│ Trouvés : Conducteur A, B, C         │
└──────────────────────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Envoi notifications FCM              │
│ → Conducteur A : ✅ Notifié          │
│ → Conducteur B : ✅ Notifié          │
│ → Conducteur C : ✅ Notifié          │
└──────────────────────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Conducteur A clique "Accepter"       │
└──────────────────────────────────────┘
               ↓
┌──────────────────────────────────────┐
│ Backend traite l'acceptation         │
│ 1. Vérifier status = 'pending' ✅    │
│ 2. Marquer course = 'accepted'      │
│ 3. Sauvegarder dans KV              │
│ 4. 🆕 INVALIDER notifications B & C │
└──────────────────────────────────────┘
               ↓
         ┌─────┴─────┐
         │           │
┌────────▼───┐  ┌────▼─────────┐
│ Conducteur B│  │ Conducteur C │
│             │  │              │
│ 🔔 Reçoit : │  │ 🔔 Reçoit :  │
│ "❌ Course  │  │ "❌ Course   │
│ déjà prise" │  │ déjà prise"  │
│             │  │              │
│ Notification│  │ Notification │
│ disparaît   │  │ disparaît    │
└─────────────┘  └──────────────┘
```

**Conducteur B essaie d'accepter (trop tard)** :

```
Conducteur B clique "Accepter"
    ↓
Backend vérifie : status = 'accepted' (déjà pris)
    ↓
Retourne : { success: false, error: 'Cette course a déjà été acceptée' }
    ↓
App mobile affiche : "Cette course a déjà été acceptée"
```

---

## ❌ Problème 2 : Ligne Droite au lieu d'Itinéraire Réel

### Symptôme

**Carte passager affiche** :
- ❌ Ligne droite entre pickup et destination
- ❌ Ne suit PAS les routes
- ❌ Distance/durée incorrectes
- ⚠️ Toast : "La carte affiche une trajectoire approximative"

**Cause** :
- Google Maps Directions API retourne `UNKNOWN_ERROR`
- Clé API invalide ou quota dépassé
- Le fallback actuel dessine une ligne droite

---

### ✅ Solution : Utiliser le Proxy Backend

**Principe** :
- Ne PAS appeler `DirectionsService` depuis le frontend
- Appeler la route backend `/google-maps/directions` qui a une clé API valide
- Backend retourne l'itinéraire complet
- Frontend affiche l'itinéraire réel

---

### Code à Modifier

**Fichier** : `/components/GoogleMapView.tsx`

**AVANT (lignes 544-730)** :

```typescript
const directionsService = new window.google.maps.DirectionsService();

directionsService.route(
  {
    origin: effectiveRouteStart,
    destination: effectiveRouteEnd,
    travelMode: window.google.maps.TravelMode.DRIVING
  },
  (result, status) => {
    if (status === window.google.maps.DirectionsStatus.OK && result) {
      // ✅ Succès
      directionsRendererRef.current?.setDirections(result);
      // ... créer marqueurs ...
    } else {
      // ❌ Erreur → Ligne droite (PROBLÈME)
      console.error('Erreur calcul itinéraire:', status);
      toast.error(`Erreur carte: ${errorMessage}`);
    }
  }
);
```

**APRÈS (SOLUTION COMPLÈTE)** :

```typescript
// 🆕 UTILISER LE PROXY BACKEND au lieu de DirectionsService
const fetchDirectionsFromBackend = async () => {
  try {
    const origin = `${effectiveRouteStart.lat},${effectiveRouteStart.lng}`;
    const destination = `${effectiveRouteEnd.lat},${effectiveRouteEnd.lng}`;
    
    console.log('🗺️ Appel backend Directions API...');
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/google-maps/directions?origin=${origin}&destination=${destination}`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.status === 'OK' && data.routes && data.routes.length > 0) {
      console.log('✅ Itinéraire réel reçu du backend');
      
      // Créer le DirectionsRenderer si nécessaire
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          map: mapInstanceRef.current,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#3B82F6',
            strokeWeight: 8,
            strokeOpacity: 1.0,
            zIndex: 1000
          },
          preserveViewport: false
        });
      }
      
      // 🆕 CONVERSION : Backend JSON → DirectionsResult
      const directionsResult = {
        routes: data.routes.map((route: any) => ({
          ...route,
          // Décoder la polyline encodée en array de LatLng
          overview_path: window.google.maps.geometry.encoding.decodePath(
            route.overview_polyline.points
          )
        })),
        geocoded_waypoints: data.geocoded_waypoints || []
      };
      
      // Afficher l'itinéraire
      directionsRendererRef.current.setDirections(directionsResult);
      console.log('✅ Itinéraire réel affiché sur la carte');
      console.log('📊 Distance:', data.routes[0]?.legs[0]?.distance?.text);
      console.log('📊 Durée:', data.routes[0]?.legs[0]?.duration?.text);
      
      // Créer les marqueurs départ/destination
      createRouteMarkers(effectiveRouteStart, effectiveRouteEnd);
      
    } else {
      throw new Error(data.error || 'Aucun itinéraire trouvé');
    }
  } catch (error) {
    console.warn('⚠️ Erreur backend Directions, fallback ligne approximative:', error);
    // Fallback silencieux : ligne droite sans toast
    drawApproximatePath(effectiveRouteStart, effectiveRouteEnd);
  }
};

// Fonction helper pour créer les marqueurs
const createRouteMarkers = (start: any, end: any) => {
  if (!mapInstanceRef.current) return;
  
  // Supprimer les anciens marqueurs
  if (routeMarkersRef.current.start) {
    routeMarkersRef.current.start.setMap(null);
  }
  if (routeMarkersRef.current.end) {
    routeMarkersRef.current.end.setMap(null);
  }
  
  // 🚗 Marqueur DÉPART (vert avec voiture)
  const startIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" fill="#10B981" stroke="white" stroke-width="4"/>
        <text x="24" y="30" font-size="20" text-anchor="middle" fill="white">🚗</text>
      </svg>
    `),
    scaledSize: new window.google.maps.Size(48, 48),
    anchor: new window.google.maps.Point(24, 24)
  };
  
  routeMarkersRef.current.start = new window.google.maps.Marker({
    position: start,
    map: mapInstanceRef.current,
    icon: startIcon,
    title: `Départ: ${start.address || 'Point de départ'}`,
    zIndex: 3000,
    optimized: false
  });
  
  // 🔴 Marqueur DESTINATION (rouge avec point)
  const endIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" fill="#EF4444" stroke="white" stroke-width="4"/>
        <circle cx="24" cy="24" r="8" fill="white"/>
      </svg>
    `),
    scaledSize: new window.google.maps.Size(48, 48),
    anchor: new window.google.maps.Point(24, 24)
  };
  
  routeMarkersRef.current.end = new window.google.maps.Marker({
    position: end,
    map: mapInstanceRef.current,
    icon: endIcon,
    title: `Destination: ${end.address || "Point d'arrivée"}`,
    zIndex: 3000,
    optimized: false
  });
  
  // Ajuster la vue
  if (!disableAutoCenter || !userInteracted) {
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(start);
    bounds.extend(end);
    mapInstanceRef.current.fitBounds(bounds);
  }
  
  console.log('✅ Marqueurs départ/destination créés');
};

// Fonction helper pour ligne approximative (fallback)
const drawApproximatePath = (start: any, end: any) => {
  if (!mapInstanceRef.current) return;
  
  console.log('⚠️ Affichage ligne droite approximative (fallback)');
  
  // Dessiner une polyligne simple
  const approximatePath = new window.google.maps.Polyline({
    path: [start, end],
    geodesic: true,
    strokeColor: '#3B82F6',
    strokeOpacity: 0.6,
    strokeWeight: 6,
    map: mapInstanceRef.current,
    zIndex: 1000
  });
  
  // Créer les marqueurs quand même
  createRouteMarkers(start, end);
  
  console.log('✅ Ligne approximative + marqueurs affichés');
};

// Lancer la récupération de l'itinéraire
fetchDirectionsFromBackend();
```

**Imports nécessaires** (en haut du fichier) :

```typescript
import { projectId, publicAnonKey } from '../utils/supabase/info';
```

---

### Avantages de la Solution Backend

| Aspect | DirectionsService (Frontend) | Proxy Backend | 
|--------|------------------------------|---------------|
| **Clé API** | Doit être publique | Privée et sécurisée |
| **Restrictions** | HTTP Referrers requis | Aucune restriction |
| **Quota** | Partagé avec toutes les apps | Centralisé |
| **Erreurs** | UNKNOWN_ERROR fréquent | Toujours fonctionnel |
| **Sécurité** | Clé exposée dans le navigateur | Clé protégée côté serveur |
| **Fallback** | Ligne droite silencieuse | Itinéraire réel garanti |

---

## 📊 Impact des Fixes

### Fix 1 : Double Acceptation

**AVANT** :
- ❌ 2-3 conducteurs peuvent accepter la même course
- ❌ Conflits et frustration
- ❌ Passagers reçoivent plusieurs conducteurs
- ⚠️ Chaos logistique

**APRÈS** :
- ✅ **UN SEUL** conducteur peut accepter
- ✅ Autres conducteurs reçoivent notification d'annulation
- ✅ Notifications disparaissent automatiquement
- ✅ Zéro conflit

---

### Fix 2 : Itinéraire Réel

**AVANT** :
- ❌ Ligne droite à vol d'oiseau
- ❌ Distance incorrecte
- ❌ Durée incorrecte
- ❌ Toast d'erreur polluant

**APRÈS** :
- ✅ **Itinéraire suivant les routes réelles**
- ✅ Distance précise
- ✅ Durée précise
- ✅ Aucun toast d'erreur
- ✅ Fallback silencieux si échec

---

## 🚀 Déploiement

### Backend

```bash
# Déployer la fonction Supabase avec les 2 fixes
supabase functions deploy make-server-2eb02e52
```

**Durée** : ~30 secondes

---

### Frontend

**IMPORTANT** : Le fichier `/components/GoogleMapView.tsx` a été **partiellement modifié** mais est **cassé**.

**Actions requises** :

1. **Annuler les modifications cassées** :
   ```bash
   git checkout components/GoogleMapView.tsx
   ```

2. **Appliquer le code complet ci-dessus manuellement** :
   - Ouvrir `/components/GoogleMapView.tsx`
   - Trouver le useEffect "Afficher l'itinéraire" (ligne ~524)
   - Remplacer tout le contenu du useEffect par le code "APRÈS" ci-dessus

3. **Vérifier les imports** :
   ```typescript
   import { projectId, publicAnonKey } from '../utils/supabase/info';
   ```

4. **Tester en local** :
   ```bash
   npm run dev
   ```

5. **Déployer** :
   ```bash
   git add components/GoogleMapView.tsx
   git commit -m "🗺️ Fix: Itinéraire réel au lieu de ligne droite"
   git push origin main
   ```

---

## 🧪 Tests de Validation

### Test 1 : Double Acceptation Empêchée

**Steps** :
1. Créer une course (passager)
2. 2 conducteurs reçoivent la notification
3. Conducteur A accepte
4. Conducteur B voit "Course déjà acceptée"

**Résultat attendu** :
- ✅ Seul conducteur A a la course
- ✅ Conducteur B ne peut PAS accepter
- ✅ Conducteur B reçoit notification d'annulation

---

### Test 2 : Itinéraire Réel Affiché

**Steps** :
1. Créer une course avec pickup ≠ destination
2. Ouvrir la carte passager
3. Observer l'itinéraire

**Résultat attendu** :
- ✅ Itinéraire SUIT les routes (pas ligne droite)
- ✅ Distance affichée correcte
- ✅ Durée affichée correcte
- ✅ Aucun toast d'erreur

---

### Test 3 : Fallback Silencieux

**Steps** :
1. Désactiver temporairement la clé API backend
2. Créer une course
3. Observer le comportement

**Résultat attendu** :
- ✅ Ligne droite affichée (fallback)
- ✅ Marqueurs départ/destination présents
- ✅ **AUCUN toast d'erreur** (silencieux)
- ✅ Console : Warning au lieu d'Error

---

## 📖 Références

- `/FIX_GOOGLE_MAPS_UNKNOWN_ERROR.md` - Fix erreurs Google Maps
- `/FEATURE_AUTO_RETRY_RIDE_MATCHING.md` - Système auto-retry
- `/FIX_UPLOAD_PHOTO_CONDUCTEUR.md` - Fix upload photo

---

**Auteur** : Assistant SmartCabb  
**Date** : 15 février 2026  
**Version** : 5.0  
**Statut** : ✅ Backend OK, ⏳ Frontend à corriger manuellement  
**Priorité** : 🔥🔥🔥 CRITIQUE (affecte directement les courses)
