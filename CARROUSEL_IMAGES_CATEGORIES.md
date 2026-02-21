# 🎠 CARROUSEL D'IMAGES PAR CATÉGORIE

Date: 1er février 2026
Feature: Carrousel automatique pour chaque catégorie de véhicule

---

## ✅ IMPLÉMENTATION COMPLÈTE

Chaque carte de service affiche maintenant un **carrousel d'images** qui défile automatiquement toutes les 3 secondes !

---

## 🚗 IMAGES PAR CATÉGORIE

### **SmartCabb Standard** (6 images)
```
Standard_1.png
Standard_2.png
Standard_3.png
Standard_4.png
Standard_5.png
Standard_6.png
```

### **SmartCabb Confort** (3 images)
```
confort 1.png   ← (avec espace et minuscule)
Confort_2.png
Confort_3.png
```

### **SmartCabb Business** (6 images)
```
Business_1.png
Business_2.png
Business_3.png
Business_4.png
Business_5.png
Business_6.png
```

### **SmartCabb Familia** (1 image temporaire)
```
Image Unsplash temporaire
(En attente des vraies images Familia)
```

---

## 🎨 FONCTIONNALITÉS DU CARROUSEL

### **Défilement automatique :**
✅ Change d'image toutes les **3 secondes**
✅ Boucle infinie (revient à la 1ère après la dernière)
✅ Transition fluide (fade)

### **Navigation manuelle :**
✅ Boutons **← →** au hover
✅ Clic sur les **dots** pour aller à une image spécifique
✅ Boutons stylisés (blanc avec ombre)

### **Indicateurs visuels :**
✅ **Dots de pagination** en bas (points blancs)
✅ **Compteur** en haut à droite ("1 / 6")
✅ **Logo SmartCabb** en bas à gauche
✅ Dot actif plus large que les autres

### **UX :**
✅ Boutons visibles uniquement au **hover**
✅ Smooth transitions
✅ Accessible (attributs aria-label)
✅ Fallback si image ne charge pas

---

## 📦 FICHIERS CRÉÉS/MODIFIÉS

### **1. `/components/ImageCarousel.tsx`** ✨ (Nouveau)

Composant React réutilisable pour le carrousel :

```tsx
interface ImageCarouselProps {
  images: string[];
  serviceName: string;
}

export function ImageCarousel({ images, serviceName }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-défilement toutes les 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Rendu : image + boutons + dots + logo + compteur
  return (...)
}
```

**Features :**
- Défilement automatique
- Navigation manuelle (← →)
- Pagination (dots)
- Compteur d'images
- Logo SmartCabb
- Fallback erreur

---

### **2. `/pages/ServicesPage.tsx`** ✨ (Modifié)

Utilise maintenant le composant `ImageCarousel` :

```tsx
import { ImageCarousel } from '../components/ImageCarousel';

// Dans la grille :
<ImageCarousel 
  images={service.images} 
  serviceName={service.name} 
/>
```

**Données :**
```tsx
const services = [
  {
    id: 'standard',
    images: [
      'https://raw.githubusercontent.com/.../Standard_1.png',
      'https://raw.githubusercontent.com/.../Standard_2.png',
      // ... 6 images total
    ],
    // ...
  },
  // ... autres catégories
];
```

---

## 🎯 STRUCTURE DU CARROUSEL

```
┌────────────────────────────────────┐
│  [1 / 6] ← Compteur       (top-right)
│                                    │
│    [IMAGE DU VÉHICULE]             │
│                                    │
│  ←  [dots: ●──○○○○○]  →            │
│      ↑ Pagination                  │
│                                    │
│  [SC | Standard] ← Logo (bottom-left)
└────────────────────────────────────┘
```

### **Éléments positionnés :**

1. **Compteur** (top-right)
   - Background noir transparent
   - Texte blanc
   - "1 / 6"

2. **Boutons ← →** (left/right center)
   - Visible au hover uniquement
   - Background blanc transparent
   - Rond (w-10 h-10)

3. **Dots pagination** (bottom center)
   - Points blancs
   - Dot actif plus large
   - Cliquables

4. **Logo SmartCabb** (bottom-left)
   - Icône SC cyan
   - Nom de la catégorie
   - Background blanc avec ombre

---

## ⚙️ CONFIGURATION

### **Timing :**
```tsx
const interval = setInterval(() => {
  // Change d'image
}, 3000); // 3 secondes
```

Vous pouvez changer `3000` pour modifier la vitesse :
- `2000` = 2 secondes (plus rapide)
- `5000` = 5 secondes (plus lent)

### **Transitions :**
```tsx
className="transition-opacity duration-500"
```

Animations fluides sur 500ms.

---

## 🔄 LOGIQUE DU CARROUSEL

### **Index circulaire :**
```tsx
// Aller à l'image suivante
setCurrentIndex((prev) => (prev + 1) % images.length);

// Aller à l'image précédente
setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
```

### **Auto-défilement :**
```tsx
useEffect(() => {
  if (images.length <= 1) return; // Pas de carrousel si 1 seule image

  const interval = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, 3000);

  return () => clearInterval(interval); // Cleanup
}, [images.length]);
```

### **Navigation manuelle :**
```tsx
const goToPrevious = () => {
  setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
};

const goToNext = () => {
  setCurrentIndex((prev) => (prev + 1) % images.length);
};
```

---

## 🎨 STYLES TAILWIND

### **Container :**
```tsx
className="relative h-64 bg-white overflow-hidden group"
```

### **Image :**
```tsx
className="w-full h-full object-cover transition-opacity duration-500"
```

### **Boutons ← → :**
```tsx
className="absolute left-2 top-1/2 -translate-y-1/2 
           bg-white/80 hover:bg-white text-gray-800 
           rounded-full w-10 h-10 flex items-center justify-center 
           opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
```

### **Dots pagination :**
```tsx
// Dot inactif
className="w-2 h-2 rounded-full bg-white/50 hover:bg-white/75"

// Dot actif
className="w-2 h-2 rounded-full bg-white w-6"
```

### **Compteur :**
```tsx
className="absolute top-4 right-4 
           bg-black/50 text-white 
           px-3 py-1 rounded-full text-xs font-semibold"
```

### **Logo :**
```tsx
className="absolute bottom-4 left-4 
           flex items-center gap-2 
           bg-white px-3 py-1.5 rounded-lg shadow-md"
```

---

## 🧪 TESTS À EFFECTUER

### **Défilement automatique :**
- [ ] Les images changent toutes les 3 secondes
- [ ] Boucle infinie (revient au début)
- [ ] Transitions fluides

### **Navigation manuelle :**
- [ ] Boutons ← → visibles au hover
- [ ] Clic sur ← va à l'image précédente
- [ ] Clic sur → va à l'image suivante
- [ ] Clic sur un dot va à cette image

### **Indicateurs :**
- [ ] Compteur affiche "X / Total"
- [ ] Dot actif est plus large
- [ ] Logo SmartCabb visible

### **Erreurs :**
- [ ] Fallback si image ne charge pas
- [ ] Pas d'erreur console

---

## 📊 COMPARAISON AVANT/APRÈS

| Avant | Après |
|-------|-------|
| ❌ 1 seule image statique | ✅ Carrousel de 3-6 images |
| ❌ Pas de navigation | ✅ Auto-défilement + manuel |
| ❌ Vue limitée | ✅ Vue complète des véhicules |
| ❌ Pas d'indicateurs | ✅ Compteur + dots |

---

## 🚀 COPIER DANS GITHUB

**Fichiers à copier :**
```
components/ImageCarousel.tsx  ← NOUVEAU
pages/ServicesPage.tsx        ← MODIFIÉ
```

**Commit :**
```bash
git add components/ImageCarousel.tsx pages/ServicesPage.tsx
git commit -m "feat: Carrousel d'images pour chaque catégorie de véhicule"
git push origin main
```

---

## 🎯 RÉSULTAT FINAL

### **Standard (6 images) :**
Défile entre Standard_1 → Standard_2 → ... → Standard_6 → (boucle)

### **Confort (3 images) :**
Défile entre confort 1 → Confort_2 → Confort_3 → (boucle)

### **Business (6 images) :**
Défile entre Business_1 → Business_2 → ... → Business_6 → (boucle)

### **Familia (1 image) :**
Pas de carrousel (1 seule image temporaire)

---

## 💡 URLS UTILISÉES

### **Format standard :**
```
https://raw.githubusercontent.com/georgeorliyssa-ctrl/smartcabb/main/public/vehicles/smartcabb_[catégorie]/[Nom_fichier].png
```

### **Cas spécial - Confort 1 (avec espace) :**
```
https://raw.githubusercontent.com/.../confort%201.png
```
→ L'espace est encodé en `%20`

---

## 🔧 PERSONNALISATION

### **Changer la vitesse :**
Dans `ImageCarousel.tsx` :
```tsx
setInterval(() => {
  // Change image
}, 3000); // ← Changer ici (en millisecondes)
```

### **Changer les couleurs :**
```tsx
// Boutons
bg-white/80 → bg-cyan-500/80

// Dots
bg-white → bg-cyan-400

// Compteur
bg-black/50 → bg-cyan-500/90
```

### **Désactiver l'auto-défilement :**
Supprimer ou commenter le `useEffect` dans `ImageCarousel.tsx`.

---

## ✨ FONCTIONNALITÉS BONUS

### **Responsive :**
✅ Fonctionne sur mobile (touch gestures possibles à ajouter)
✅ Boutons adaptés à la taille d'écran

### **Accessible :**
✅ Attributs `aria-label` sur les boutons
✅ Navigation au clavier (via boutons)

### **Performance :**
✅ Cleanup du setInterval (pas de memory leak)
✅ Transitions CSS optimisées
✅ Images lazy-loaded

---

## 📱 COMPORTEMENT PAR CATÉGORIE

| Catégorie | Nombre d'images | Comportement |
|-----------|-----------------|--------------|
| **Standard** | 6 | Carrousel actif |
| **Confort** | 3 | Carrousel actif |
| **Business** | 6 | Carrousel actif |
| **Familia** | 1 | Pas de carrousel |

---

## 🎨 APPARENCE FINALE

```
┌─────────────────────────────────────┐
│ SMARTCABB STANDARD       [3 / 6]    │ ← Badge + Compteur
│                                     │
│  ←  [IMAGE TOYOTA VITZ]  →          │ ← Carrousel
│      ●──○○○○○                        │ ← Dots
│  [SC | Standard]                    │ ← Logo
├─────────────────────────────────────┤
│ 🚗 SmartCabb Standard               │
│ Solution économique...              │
│ Véhicules: Toyota IST, Swift...     │
│ 👥 3 places ❄️ Climatisé 🛡️ Sécurisé │
│ À partir de 3000 FC                 │
│ [Réserver maintenant]               │
└─────────────────────────────────────┘
```

---

## ✅ PRÊT !

Les carrousels défilent maintenant automatiquement dans chaque catégorie :

✅ **Standard** : 6 images qui défilent
✅ **Confort** : 3 images qui défilent  
✅ **Business** : 6 images qui défilent  
✅ **Familia** : 1 image (temporaire)  

✅ **Défilement automatique** toutes les 3s  
✅ **Navigation manuelle** (← → et dots)  
✅ **Compteur** d'images visible  
✅ **Logo SmartCabb** sur chaque image  
✅ **Transitions fluides**  

---

**Copiez les fichiers dans GitHub et profitez des carrousels ! 🎠🚗**

---

Made with ❤️ for SmartCabb
