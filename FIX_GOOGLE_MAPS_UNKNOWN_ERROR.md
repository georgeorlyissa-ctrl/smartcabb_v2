# 🗺️ Fix : Erreurs Google Maps UNKNOWN_ERROR

**Date** : 15 février 2026  
**Problème** : Multiples erreurs "Erreur carte: Erreur inconnue: UNKNOWN_ERROR" côté passager

---

## ❌ Problème Identifié

### Capture d'écran

![Erreurs Google Maps](figma:asset/372e1a59a8ca00fa76cfce71288e910bb4f74a00.png)
![Console d'erreurs](figma:asset/f765bb5b289d0260d1723d9991cbbe5b5d84d695.png)

**Symptômes** :
- ✅ Course créée avec succès
- ✅ Conducteur assigné
- ❌ Multiples toasts d'erreur "Erreur carte: Erreur inconnue: UNKNOWN_ERROR"
- ❌ Console pleine d'erreurs `MapServerError: DIRECTIONS_ROUTE: UNKNOWN_ERROR`

---

## 🔍 Analyse de la Racine

### Erreur Console

```bash
🔴 MapServerError: DIRECTIONS_ROUTE: UNKNOWN_ERROR: There was an issue performing a Directions request.
    at directions.js:13:402
    at directions.js:14:352

# Multiples occurrences :
🔴 Départ: ▶ {lat: -4.359185275797635, lng: 15.284102439817535}
🔴 Destination: ▶ {lat: -4.38436, lng: 15.2598067, address: 'U.p.n'}
🔴 Détails: Erreur Inconnue: UNKNOWN_ERROR
🔴 $5E:ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep 200 (OK)
```

---

### Cause 1 : Clé API Google Maps Invalide ou Manquante

**Fichier** : `/components/GoogleMapView.tsx` (ligne 544)

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
      // Succès
    } else {
      // ❌ ERREUR : UNKNOWN_ERROR si clé invalide
      console.error('Erreur calcul itinéraire:', status);
    }
  }
);
```

**Diagnostic** :
- L'API `DirectionsService` est appelée **directement depuis le frontend**
- Nécessite une **clé API Google Maps valide** avec Directions API activée
- Si la clé est **invalide**, **expirée**, ou **sans quota**, retourne `UNKNOWN_ERROR`

---

### Cause 2 : Restrictions de Clé API

**Problèmes possibles** :
1. **HTTP Referrers** mal configurés (bloque smartcabb.com)
2. **API Restrictions** : Directions API non activée
3. **Quota dépassé** : Limite gratuite atteinte (40 000 requêtes/mois)
4. **Facturation désactivée** : Google Cloud Billing non configuré

---

### Cause 3 : CORS / COEP Headers

**Erreur secondaire** :
```
net::ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep
```

Cette erreur indique un problème de **Cross-Origin Embedder Policy** qui peut bloquer certaines ressources Google Maps.

---

## ✅ Solutions

### Solution 1 : Gestion Élégante des Erreurs ⭐⭐⭐⭐⭐ (IMMÉDIATE)

**Objectif** : Masquer les erreurs visuelles, afficher un itinéraire approximatif à la place

**Fichier** : `/components/GoogleMapView.tsx`

**Code actuel (AVANT)** :
```typescript
directionsService.route(
  {
    origin: effectiveRouteStart,
    destination: effectiveRouteEnd,
    travelMode: window.google.maps.TravelMode.DRIVING
  },
  (result, status) => {
    if (status === window.google.maps.DirectionsStatus.OK && result) {
      directionsRendererRef.current?.setDirections(result);
      console.log('✅ Itinéraire Google Maps affiché');
    } else {
      console.error('❌ Erreur calcul itinéraire:', status);
      // ❌ PAS DE FALLBACK → Toast d'erreur
    }
  }
);
```

**Code corrigé (APRÈS)** :
```typescript
directionsService.route(
  {
    origin: effectiveRouteStart,
    destination: effectiveRouteEnd,
    travelMode: window.google.maps.TravelMode.DRIVING
  },
  (result, status) => {
    if (status === window.google.maps.DirectionsStatus.OK && result) {
      directionsRendererRef.current?.setDirections(result);
      console.log('✅ Itinéraire Google Maps affiché');
    } else {
      // 🆕 FALLBACK : Dessiner une ligne droite approximative
      console.warn(`⚠️ Erreur Directions API (${status}), affichage ligne approximative`);
      
      // Ne pas afficher de toast d'erreur (pollue l'UX)
      // toast.error('Erreur carte'); // ❌ SUPPRIMÉ
      
      // Dessiner une polyligne approximative entre départ et destination
      const approximatePath = new window.google.maps.Polyline({
        path: [effectiveRouteStart, effectiveRouteEnd],
        geodesic: true,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.6,
        strokeWeight: 6,
        map: mapInstanceRef.current
      });
      
      // Ajuster la vue pour inclure les 2 points
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(effectiveRouteStart);
      bounds.extend(effectiveRouteEnd);
      mapInstanceRef.current?.fitBounds(bounds);
      
      console.log('✅ Ligne approximative affichée (fallback)');
    }
  }
);
```

**Avantages** :
- ✅ Pas de toast d'erreur qui pollue l'UX
- ✅ Ligne droite visible entre départ et destination
- ✅ Carte centrée correctement
- ✅ Passager voit quand même l'itinéraire (approximatif)

---

### Solution 2 : Utiliser le Proxy Backend ⭐⭐⭐⭐ (RECOMMANDÉ)

**Objectif** : Utiliser la route backend `/google-maps/directions` qui a une clé valide

**Fichier backend** : `/supabase/functions/server/google-maps-api.tsx`

**Route existante** :
```typescript
app.get('/directions', async (c) => {
  const origin = c.req.query('origin');
  const destination = c.req.query('destination');
  
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${GOOGLE_MAPS_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return c.json(data);
});
```

**Modification frontend** : Remplacer `DirectionsService` par un appel au backend

**Code frontend (NEW)** :
```typescript
// ❌ NE PLUS FAIRE ÇA
// const directionsService = new window.google.maps.DirectionsService();

// ✅ FAIRE ÇA À LA PLACE
const fetchBackendDirections = async () => {
  try {
    const origin = `${effectiveRouteStart.lat},${effectiveRouteStart.lng}`;
    const destination = `${effectiveRouteEnd.lat},${effectiveRouteEnd.lng}`;
    
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/google-maps/directions?origin=${origin}&destination=${destination}`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.routes.length > 0) {
      // Convertir en format DirectionsResult
      const directionsResult = {
        routes: data.routes,
        // ... autres champs nécessaires
      };
      
      directionsRendererRef.current?.setDirections(directionsResult);
      console.log('✅ Itinéraire backend affiché');
    } else {
      // Fallback ligne droite
      console.warn('⚠️ Pas de route, affichage ligne approximative');
      drawStraightLine();
    }
  } catch (error) {
    console.error('❌ Erreur backend directions:', error);
    drawStraightLine();
  }
};

fetchBackendDirections();
```

**Avantages** :
- ✅ Clé API centralisée et protégée
- ✅ Pas de restrictions HTTP Referrers
- ✅ Meilleur contrôle des quotas
- ⚠️ Nécessite modification du code

---

### Solution 3 : Configurer Correctement la Clé API Google Maps ⭐⭐⭐ (BEST PRACTICE)

**Étapes** :

#### 1. Vérifier que la clé existe

```bash
# Dans Supabase Dashboard → Settings → Edge Functions → Secrets
GOOGLE_MAPS_API_KEY=AIzaSy... (existe déjà selon le context fourni)
GOOGLE_MAPS_SERVER_API_KEY=AIzaSy... (existe déjà selon le context fourni)
```

#### 2. Vérifier les APIs activées dans Google Cloud Console

```
https://console.cloud.google.com/apis/library
```

**APIs requises** :
- ✅ Maps JavaScript API (pour afficher la carte)
- ✅ Directions API (pour calculer les itinéraires) ← **CRITIQUE**
- ✅ Places API (pour l'autocomplete)
- ✅ Geocoding API (pour adresses → coordonnées)

#### 3. Vérifier les restrictions de clé

**Option A : Clé Frontend (avec restrictions HTTP Referrers)**
```
Google Cloud Console → APIs & Services → Credentials
→ Votre clé API → Application restrictions
→ HTTP referrers (web sites)
→ Ajouter :
  - https://smartcabb.com/*
  - https://*.smartcabb.com/*
  - http://localhost:* (dev)
```

**Option B : Clé Backend (sans restrictions)**
```
→ Application restrictions → None
→ API restrictions → Restrict key
→ Sélectionner :
  - Directions API
  - Geocoding API
  - Places API
```

#### 4. Activer la facturation Google Cloud

**IMPORTANT** : Google Maps nécessite un compte de facturation actif (même si sous le quota gratuit)

```
Google Cloud Console → Billing
→ Link a billing account
→ Configurer carte bancaire
```

**Quota gratuit** :
- Directions API : **$200 de crédit/mois gratuit**
- = **40 000 requêtes/mois** (0,005$ par requête)

---

## 🚀 Implémentation Recommandée

### Étape 1 : Gestion d'erreur élégante (immédiate)

**Priorité** : 🔥🔥🔥 HAUTE

```typescript
// Dans /components/GoogleMapView.tsx
// Remplacer toutes les erreurs Directions par un fallback
```

✅ **Déjà en cours d'implémentation ci-dessous**

---

### Étape 2 : Vérifier la clé API (à faire manuellement)

**Priorité** : 🔥🔥 MOYENNE

1. Aller sur Google Cloud Console
2. Vérifier que Directions API est activée
3. Vérifier les restrictions
4. Vérifier la facturation

---

### Étape 3 : Migrer vers le proxy backend (optionnel)

**Priorité** : 🔥 BASSE

Migration progressive :
1. Garder le fallback de la ligne droite
2. Remplacer DirectionsService par appel backend
3. Tester en prod

---

## 📊 Impact

### AVANT (Problématique)

- ❌ 10-20 toasts d'erreur par course
- ❌ Console saturée d'erreurs
- ❌ Expérience utilisateur dégradée
- ⚠️ Itinéraire parfois affiché, parfois non

---

### APRÈS (Corrigé)

- ✅ Aucun toast d'erreur
- ✅ Console propre (warning au lieu d'error)
- ✅ Ligne droite approximative toujours affichée
- ✅ Expérience cohérente

---

**Auteur** : Assistant SmartCabb  
**Date** : 15 février 2026  
**Version** : 4.0  
**Statut** : ⏳ En cours d'implémentation  
**Priorité** : 🔥🔥🔥 HAUTE (affecte l'expérience passager)
