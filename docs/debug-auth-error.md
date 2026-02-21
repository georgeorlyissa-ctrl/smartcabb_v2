# 🔍 Guide de Diagnostic - Erreur d'Authentification

## 🐛 Erreur Actuelle

```
❌ Erreur authentification: Erreur de connexion. Veuillez réessayer.
```

---

## 📊 Logs de Diagnostic Ajoutés

J'ai ajouté des logs détaillés à plusieurs niveaux du processus d'authentification pour identifier le problème exact.

### **Logs ajoutés dans `/lib/auth-service.ts` :**

#### **1. Niveau erreur Supabase Auth (ligne 123-126)**
```typescript
if (authError) {
  console.error('❌ Erreur de connexion:', authError.message);
  console.error('❌ Code d\'erreur:', authError.status);
  console.error('❌ Détails complets:', JSON.stringify(authError, null, 2));
  // ...
}
```

#### **2. Niveau réponse incomplète (ligne 191-199)**
```typescript
if (!data?.user || !data?.session) {
  console.error('❌ [signIn] Réponse Supabase incomplète:');
  console.error('   - data:', data);
  console.error('   - data.user:', data?.user);
  console.error('   - data.session:', data?.session);
  console.error('   - Cela signifie que l\'authentification a "réussi" mais sans session valide');
  
  return {
    success: false,
    error: 'Erreur de connexion. Veuillez réessayer.'  // ← CETTE ERREUR
  };
}
```

#### **3. Niveau profil (ligne 201-215)**
```typescript
console.log('✅ [signIn] Authentification Supabase réussie');
console.log('   - User ID:', data.user.id);
console.log('   - Email:', data.user.email);
console.log('   - Session valide:', !!data.session);

console.log('🔍 [signIn] Récupération du profil...');
const profile = await profileService.getProfile(data.user.id);

if (!profile) {
  console.error('❌ [signIn] Aucun profil trouvé pour user ID:', data.user.id);
  return {
    success: false,
    error: 'Profil introuvable. Veuillez contacter le support.'
  };
}
```

---

## 🔬 Comment Diagnostiquer

### **ÉTAPE 1 : Tentez de vous connecter**
1. Allez sur `/admin/login`
2. Entrez vos identifiants admin
3. Cliquez "Se connecter"
4. **GARDEZ LA CONSOLE OUVERTE** (F12 → Console)

### **ÉTAPE 2 : Analysez les logs dans la console**

Vous devriez voir une séquence de logs. Regardez EXACTEMENT où ça s'arrête :

#### **Scénario A : L'erreur vient AVANT l'appel Supabase**
```
🔐 [signIn] Début de la connexion...
🔐 [signIn] Identifier: admin@example.com
🔍 [signIn] Type détecté: email pour: admin@example.com
❌ [signIn] Identifiant vide   // OU autre erreur de validation
```
**Problème :** Validation des inputs

#### **Scénario B : L'erreur vient de Supabase Auth**
```
🔐 [signIn] Début de la connexion...
🔐 [signIn] Identifier: admin@example.com
🔍 [signIn] Type détecté: email
🔐 Tentative de connexion via Supabase Auth direct...
🔐 Email/identifier: admin@example.com
🔑 Longueur du mot de passe: 8
❌ Erreur de connexion: Invalid login credentials
❌ Code d'erreur: 400
❌ Détails complets: { "message": "Invalid login credentials", ... }
```
**Problème :** Identifiants incorrects ou compte inexistant

#### **Scénario C : Authentification réussie MAIS pas de session (C'EST PROBABLEMENT VOTRE CAS)**
```
🔐 [signIn] Début de la connexion...
🔐 [signIn] Identifier: admin@example.com
🔍 [signIn] Type détecté: email
🔐 Tentative de connexion via Supabase Auth direct...
🔐 Email/identifier: admin@example.com
🔑 Longueur du mot de passe: 8
❌ [signIn] Réponse Supabase incomplète:
   - data: { user: {...}, session: null }   // ← SESSION NULL !
   - data.user: {...}
   - data.session: null                     // ← LE PROBLÈME EST ICI
```
**Problème :** Configuration Supabase ou compte non confirmé

#### **Scénario D : Authentification réussie MAIS pas de profil**
```
🔐 [signIn] Début de la connexion...
✅ [signIn] Authentification Supabase réussie
   - User ID: abc-123-def
   - Email: admin@example.com
   - Session valide: true
🔍 [signIn] Récupération du profil...
❌ [signIn] Aucun profil trouvé pour user ID: abc-123-def
```
**Problème :** Pas d'entrée dans la table `profiles_2eb02e52`

---

## 🛠️ Solutions par Scénario

### **SOLUTION A : Problème de validation**
→ Vérifiez que vous entrez un email valide et un mot de passe non vide

### **SOLUTION B : Invalid login credentials**
→ Le compte n'existe pas ou les identifiants sont incorrects

**Action immédiate :** Créer un compte admin

```typescript
// Aller sur /admin/signup et créer un compte
// OU utiliser la console :
import { createAdmin } from './lib/auth-service';

createAdmin({
  email: 'admin@smartcabb.com',
  password: 'Admin123!',
  fullName: 'Administrateur SmartCabb'
}).then(result => console.log('Résultat:', result));
```

### **SOLUTION C : Session null (PROBABLE)**

C'est le problème le plus courant. Voici ce qui peut causer ça :

#### **Cause 1 : Email non confirmé**
Supabase peut être configuré pour exiger une confirmation d'email.

**Vérification :**
1. Allez dans Supabase Dashboard
2. Authentication → Settings
3. Regardez "Enable email confirmations"

**Solutions :**
- **Option 1 :** Désactiver la confirmation d'email pour dev
- **Option 2 :** Confirmer manuellement l'email dans Auth → Users

#### **Cause 2 : Configuration Auth incorrecte**
**Vérification :**
1. Supabase Dashboard → Settings → API
2. Vérifiez que `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont correctes

#### **Cause 3 : Politique RLS bloque la session**
**Vérification :**
```sql
-- Dans SQL Editor Supabase
SELECT * FROM auth.users WHERE email = 'admin@smartcabb.com';
```

Si la requête retourne un user, c'est bon. Sinon, le compte n'existe pas.

### **SOLUTION D : Profil manquant**

Le user existe dans `auth.users` mais pas dans votre table `profiles_2eb02e52`.

**Action immédiate :**

```sql
-- Dans SQL Editor Supabase
-- Vérifier si le profil existe
SELECT * FROM profiles_2eb02e52 WHERE email = 'admin@smartcabb.com';

-- Si rien, créer manuellement :
INSERT INTO profiles_2eb02e52 (id, email, full_name, role, created_at, updated_at)
VALUES (
  '<USER_ID_FROM_AUTH_USERS>',
  'admin@smartcabb.com',
  'Admin SmartCabb',
  'admin',
  NOW(),
  NOW()
);
```

---

## 📋 Checklist de Diagnostic

Cochez au fur et à mesure :

- [ ] **1.** J'ai ouvert la console (F12) avant de me connecter
- [ ] **2.** J'ai noté EXACTEMENT où les logs s'arrêtent
- [ ] **3.** J'ai vérifié que mes identifiants sont corrects
- [ ] **4.** J'ai vérifié dans Supabase Dashboard que le compte existe
- [ ] **5.** J'ai vérifié que `email_confirm` n'est pas requis
- [ ] **6.** J'ai vérifié que le profil existe dans `profiles_2eb02e52`

---

## 🔥 ACTION IMMÉDIATE - Créer un compte admin qui fonctionne

Si vous n'avez pas encore de compte admin fonctionnel, voici comment en créer un **garantie de fonctionner** :

### **Option 1 : Via l'interface de création (recommandé)**
1. Allez sur `/admin/signup`
2. Remplissez le formulaire
3. Regardez les logs dans la console

### **Option 2 : Via Supabase Dashboard (100% fiable)**
1. Allez dans Supabase Dashboard
2. Authentication → Users → Add user
3. Email : `admin@smartcabb.com`
4. Password : `Admin123!`
5. Auto Confirm User : ✅ **ACTIVÉ**
6. Cliquez "Create user"

7. Ensuite, allez dans SQL Editor :
```sql
-- Créer le profil admin
INSERT INTO profiles_2eb02e52 (id, email, full_name, phone, role, created_at, updated_at)
VALUES (
  '<COPIEZ_L_ID_DU_USER_CRÉÉ>',
  'admin@smartcabb.com',
  'Administrateur SmartCabb',
  NULL,
  'admin',
  NOW(),
  NOW()
);
```

### **Option 3 : Via l'endpoint create-admin**
```bash
curl -X POST \
  https://<PROJECT_ID>.supabase.co/functions/v1/make-server-2eb02e52/create-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{
    "email": "admin@smartcabb.com",
    "password": "Admin123!",
    "fullName": "Administrateur SmartCabb"
  }'
```

---

## 🎯 Une fois le diagnostic fait

**Partagez-moi EXACTEMENT les logs de la console**, par exemple :

```
🔐 [signIn] Début de la connexion...
🔐 [signIn] Identifier: admin@example.com
🔍 [signIn] Type détecté: email pour: admin@example.com
🔐 Tentative de connexion via Supabase Auth direct...
🔐 Email/identifier: admin@example.com
🔑 Longueur du mot de passe: 8
❌ [signIn] Réponse Supabase incomplète:
   - data: { user: {...}, session: null }
   - data.user: [Object]
   - data.session: null
```

Et je pourrai vous donner la solution **exacte et précise** ! 🎯

---

**Date :** 5 février 2026  
**Version :** 1.0.3  
**Status :** 🔍 En diagnostic
