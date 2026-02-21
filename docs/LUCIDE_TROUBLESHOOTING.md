# 🔧 Lucide React - Guide de Dépannage

## 📚 Table des Matières
1. [Problème Courant](#problème-courant)
2. [Diagnostic Rapide](#diagnostic-rapide)
3. [Solutions par Symptôme](#solutions-par-symptôme)
4. [Icônes Compatibles](#icônes-compatibles)
5. [Migration Guide](#migration-guide)

---

## 🚨 Problème Courant

### Symptôme
```
ERROR: "SomeIcon" is not exported by lucide-react
```

### Cause
L'icône n'existe pas dans `lucide-react@0.263.1` (version stable utilisée).

### Solution Rapide
1. Vérifier si l'icône existe dans la version 0.263.1
2. Utiliser une alternative compatible
3. Consulter la liste ci-dessous

---

## 🔍 Diagnostic Rapide

### Vérifier la Version Chargée

**Dans la console navigateur:**
```javascript
// Copier-coller ce code
const importMap = document.querySelector('script[type="importmap"]');
const map = JSON.parse(importMap.textContent);
console.log('Version lucide-react:', map.imports['lucide-react']);
```

**Dans les logs Vercel:**
```bash
# Chercher cette ligne
lucide-react@0.263.1
```

### Vérifier les Erreurs Build

**Logs Vercel typiques:**
```
✅ SUCCÈS: 
  ✓ 2741 modules transformed

❌ ÉCHEC:
  ERROR: "Route" is not exported by lucide-react
  → Utiliser "Navigation" à la place
```

---

## 💡 Solutions par Symptôme

### 1. Build Error - Icon Not Exported

**Erreur:**
```
"IconName" is not exported by lucide-react
```

**Solution:**
1. Trouver l'icône alternative dans la table ci-dessous
2. Remplacer dans le fichier
3. Rebuild

**Exemple:**
```tsx
// ❌ INCORRECT (0.561.0 seulement)
import { Route } from 'lucide-react';

// ✅ CORRECT (0.263.1 compatible)
import { Navigation } from 'lucide-react';
```

### 2. Runtime Error - Wrong Version Loaded

**Erreur:**
```
Failed to fetch https://esm.sh/lucide-react@0.561.0
```

**Solution:**
Vérifier ces 3 fichiers:

1. `/index.html` - Import map présent?
2. `/vite.config.ts` - Alias configuré?
3. `/package.json` - Version 0.263.1?

### 3. Page Blanche - No Errors

**Cause:** Service Worker cache l'ancienne version

**Solution:**
```javascript
// Dans console navigateur
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
location.reload();
```

Ou utiliser le bouton vert 🐛 → "Désinstaller SW"

---

## 📋 Icônes Compatibles v0.263.1

### ✅ Icons Disponibles (Safe to Use)

#### Navigation & Maps
- ✅ `MapPin`
- ✅ `Navigation` (PAS Route!)
- ✅ `Map`
- ✅ `Compass`

#### Users
- ✅ `User`
- ✅ `Users`
- ✅ `UserPlus`
- ✅ `UserCheck`
- ✅ `UserX`

#### Vehicles
- ✅ `Car`
- ✅ `Truck`

#### UI Controls
- ✅ `X`
- ✅ `Plus`
- ✅ `Minus`
- ✅ `Check`
- ✅ `CheckCircle`
- ✅ `CheckCircle2`

#### Arrows
- ✅ `ArrowLeft`
- ✅ `ArrowRight`
- ✅ `ArrowUp`
- ✅ `ArrowDown`
- ✅ `ChevronLeft`
- ✅ `ChevronRight`
- ✅ `ChevronUp`
- ✅ `ChevronDown`

#### Time
- ✅ `Clock`
- ✅ `Calendar`
- ✅ `Timer`

#### Communication
- ✅ `Phone`
- ✅ `Mail`
- ✅ `MessageCircle`
- ✅ `MessageSquare`
- ✅ `Send`

#### Money
- ✅ `DollarSign`
- ✅ `CreditCard`
- ✅ `Banknote`
- ✅ `Wallet`

#### Status
- ✅ `AlertCircle`
- ✅ `AlertTriangle`
- ✅ `Info`
- ✅ `Shield`

#### Actions
- ✅ `Edit`
- ✅ `Edit2`
- ✅ `Edit3`
- ✅ `Trash`
- ✅ `Trash2`
- ✅ `Save`
- ✅ `Download`
- ✅ `Upload`
- ✅ `RefreshCw`
- ✅ `Search`

#### Misc
- ✅ `Star`
- ✅ `Heart`
- ✅ `Eye`
- ✅ `EyeOff`
- ✅ `Lock`
- ✅ `Settings`
- ✅ `Menu`
- ✅ `Home`
- ✅ `Bell`
- ✅ `Loader2`

### ❌ Icons NON Disponibles (v0.561.0+)

- ❌ `Route` → Utiliser `Navigation`
- ❌ `RouteOff` → Utiliser `NavigationOff`
- ❌ Certaines icônes récentes...

---

## 🔄 Migration Guide

### Étape 1: Identifier les Icônes Problématiques

```bash
# Dans le terminal (si disponible)
grep -r "from 'lucide-react'" --include="*.tsx" | grep "Route"

# Ou chercher manuellement dans IDE
# Rechercher: from 'lucide-react'
```

### Étape 2: Remplacer les Icônes

**Template de remplacement:**
```tsx
// AVANT
import { ProblematicIcon } from 'lucide-react';

// APRÈS - Vérifier la table ci-dessus
import { AlternativeIcon } from 'lucide-react';
```

### Étape 3: Vérifier le Build

```bash
# Local
npm run build

# Vercel (après push)
# Vérifier les logs dans Dashboard Vercel
```

### Étape 4: Test Runtime

1. Ouvrir l'app dans navigateur
2. Ouvrir console DevTools
3. Chercher erreurs lucide
4. Vérifier affichage des icônes

---

## 🛠️ Outils de Debug

### 1. Script de Vérification

Exécuter dans console:
```javascript
// Charger le script de vérification
const script = document.createElement('script');
script.src = '/verify-lucide-version.js';
document.head.appendChild(script);
```

### 2. Visual Debug Panel

Cliquer sur le bouton vert 🐛 en bas à droite:
- État de l'application
- Logs en temps réel
- Actions de dépannage
- Cache management

### 3. Network Tab

1. Ouvrir DevTools → Network
2. Filtrer: "lucide"
3. Vérifier URL: doit contenir `@0.263.1`

---

## 📞 Support

### En cas de problème persistant:

1. **Vérifier les 3 fichiers clés:**
   - `/index.html` → Import map
   - `/vite.config.ts` → Alias
   - `/package.json` → Version lock

2. **Clear cache complet:**
   - Service Worker
   - Browser cache
   - Vercel cache (redeploy)

3. **Vérifier logs:**
   - Console navigateur
   - Vercel build logs
   - Network tab

4. **Contact:**
   - Créer issue GitHub avec logs
   - Inclure screenshot console
   - Préciser environnement (mobile/desktop, browser)

---

## 📚 Ressources

- [Lucide Icons Gallery](https://lucide.dev/icons/)
- [Version 0.263.1 Release Notes](https://github.com/lucide-icons/lucide/releases/tag/0.263.1)
- [ESM.sh Documentation](https://esm.sh/)
- [Import Maps MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)

---

**Dernière mise à jour:** 2024-12-18 (v517.9)  
**Maintenu par:** Équipe SmartCabb
