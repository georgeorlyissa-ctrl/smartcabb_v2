# 🔧 CRÉER/SYNCHRONISER LE COMPTE SUPPORT

Date: 4 février 2026  
Fix: Correction de l'erreur "Invalid login credentials" pour support@smartcabb.com

---

## 🎯 Problème résolu

L'erreur d'authentification pour `support@smartcabb.com` était causée par:
- Le compte n'existait pas dans Supabase Auth
- Ou le mot de passe était incorrect/désynchronisé

---

## ✅ Solution implémentée

### 1. Nouvelle route backend créée

**Route:** `POST /make-server-2eb02e52/auth/support/create`

**Fonctionnalités:**
- ✅ Crée le compte `support@smartcabb.com` dans Supabase Auth
- ✅ Synchronise avec le KV store
- ✅ Met à jour le mot de passe s'il existe déjà
- ✅ Retourne les identifiants de connexion

**Identifiants par défaut:**
- Email: `support@smartcabb.com`
- Mot de passe: `Support2026!`

---

## 🚀 Comment utiliser

### Option 1: Via le composant React (Recommandé)

1. Importer le composant:
```tsx
import { SupportAccountManager } from './components/admin/SupportAccountManager';
```

2. L'utiliser dans votre interface:
```tsx
<SupportAccountManager />
```

### Option 2: Via cURL (Terminal)

```bash
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-2eb02e52/auth/support/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Option 3: Via JavaScript (Console navigateur)

Ouvrez la console du navigateur sur smartcabb.com et exécutez:

```javascript
// Récupérer les infos Supabase
const { projectId, publicAnonKey } = await import('./utils/supabase/info');

// Créer le compte support
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/support/create`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    }
  }
);

const result = await response.json();
console.log('✅ Résultat:', result);

// Afficher les identifiants
if (result.success) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:', result.email);
  console.log('🔑 Mot de passe:', result.password);
  console.log('🆔 User ID:', result.userId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  alert('✅ Compte créé ! Voir la console pour les identifiants.');
} else {
  console.error('❌ Erreur:', result.error);
  alert('❌ Erreur: ' + result.error);
}
```

---

## 📋 Réponse de l'API

### Succès (création):
```json
{
  "success": true,
  "message": "Compte support créé avec succès",
  "userId": "uuid-du-compte",
  "email": "support@smartcabb.com",
  "password": "Support2026!",
  "note": "Utilisez ces identifiants pour vous connecter"
}
```

### Succès (synchronisation):
```json
{
  "success": true,
  "message": "Compte support synchronisé avec succès",
  "userId": "uuid-du-compte",
  "email": "support@smartcabb.com",
  "password": "Support2026!",
  "note": "Mot de passe mis à jour"
}
```

### Erreur:
```json
{
  "success": false,
  "error": "Message d'erreur détaillé"
}
```

---

## 🔐 Sécurité

⚠️ **IMPORTANT:**
1. Le mot de passe par défaut `Support2026!` devrait être changé après la première connexion
2. Cette route peut être appelée plusieurs fois sans problème (idempotente)
3. Le compte a le rôle `admin` avec tous les privilèges

---

## 🧪 Test de connexion

Après avoir créé le compte, testez la connexion:

1. Allez sur: `https://smartcabb.com/app/admin`
2. Entrez:
   - Email: `support@smartcabb.com`
   - Mot de passe: `Support2026!`
3. Cliquez sur "Se connecter"

Si tout fonctionne, vous devriez être connecté au panel admin ! 🎉

---

## 📝 Fichiers modifiés

1. **`/supabase/functions/server/auth-routes.tsx`**
   - Ajout de la route `POST /auth/support/create`
   - ~130 lignes ajoutées

2. **`/components/admin/SupportAccountManager.tsx`** (NOUVEAU)
   - Composant React pour gérer le compte support
   - Interface utilisateur complète
   - ~330 lignes

3. **`/CREATE_SUPPORT_ACCOUNT.md`** (NOUVEAU)
   - Documentation complète

---

## 🔄 Intégration dans AdminApp

Pour ajouter ce gestionnaire dans le panel admin, ajoutez cette option dans le menu:

```tsx
import { SupportAccountManager } from './components/admin/SupportAccountManager';

// Dans le menu admin
{screen === 'support-account' && <SupportAccountManager onBack={() => setScreen('dashboard')} />}
```

---

**Créé le:** 4 février 2026  
**Version:** v518.2.0  
**Statut:** ✅ TESTÉ ET FONCTIONNEL
