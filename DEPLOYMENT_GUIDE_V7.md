# 📱 Guide de Déploiement SmartCabb Backend V7

## 🐛 Problème Résolu

**Erreur précédente** : "Failed to deploy edge function: Failed to bundle the function (reason: Module not found)"

**Cause** : Le fichier `phone-normalizer.tsx` ne pouvait pas être importé correctement lors du déploiement sur Supabase Edge Functions.

**Solution** : 
1. ✅ Création d'un fichier utilitaire `phone-utils.ts` (TypeScript simple, pas TSX)
2. ✅ Mise à jour de tous les imports dans les fichiers backend
3. ✅ Suppression de l'ancien fichier `phone-normalizer.tsx`

## 🔧 Fichiers Modifiés

### Fichiers Créés
- ✅ `/supabase/functions/server/phone-utils.ts` - Utilitaire centralisé de normalisation des numéros

### Fichiers Mis à Jour
- ✅ `/supabase/functions/server/index.tsx` - Import de `phone-utils.ts` au lieu de `phone-normalizer.tsx`
- ✅ `/supabase/functions/server/auth-routes.tsx` - Import de `phone-utils.ts`
- ✅ `/supabase/functions/server/chat-routes.tsx` - Import de `phone-utils.ts`
- ✅ `/supabase/functions/server/ride-routes.tsx` - Import de `phone-utils.ts`
- ✅ `/supabase/functions/server/sms-routes.tsx` - Import de `phone-utils.ts` et suppression de la fonction locale

### Fichiers Supprimés
- ❌ `/supabase/functions/server/phone-normalizer.tsx` - Remplacé par `phone-utils.ts`

## 📦 Commandes de Déploiement

### Option 1 : Déploiement via Supabase CLI (Recommandé)

```bash
# 1. Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# 2. Se connecter à votre projet Supabase
supabase login

# 3. Lier votre projet local au projet Supabase
supabase link --project-ref VOTRE_PROJECT_REF

# 4. Déployer la fonction edge
supabase functions deploy make-server-2eb02e52

# 5. Vérifier le déploiement
supabase functions list
```

### Option 2 : Déploiement via Dashboard Supabase

1. Allez sur https://supabase.com/dashboard/project/VOTRE_PROJECT_ID/functions
2. Sélectionnez la fonction "make-server-2eb02e52"
3. Cliquez sur "Deploy new version"
4. Uploadez le contenu du dossier `/supabase/functions/server/`

## 🧪 Tests Après Déploiement

### 1. Test de Santé du Serveur
```bash
curl https://VOTRE_PROJECT_ID.supabase.co/functions/v1/make-server-2eb02e52/health
```

**Réponse attendue** :
```json
{
  "status": "ok",
  "timestamp": "2026-02-14T..."
}
```

### 2. Test de Diagnostic Supabase
```bash
curl https://VOTRE_PROJECT_ID.supabase.co/functions/v1/make-server-2eb02e52/diagnostic/supabase
```

**Réponse attendue** :
```json
{
  "timestamp": "...",
  "env": {
    "SUPABASE_URL": true,
    "SUPABASE_SERVICE_ROLE_KEY": true,
    "SUPABASE_ANON_KEY": true
  },
  "kvStore": {
    "status": "connected"
  }
}
```

### 3. Test d'Envoi SMS
Depuis l'application web admin, testez l'envoi d'un SMS :
1. Allez dans le panel admin
2. Section "Notifications SMS"
3. Entrez un numéro de test (ex: 0991234567)
4. Cliquez sur "Envoyer SMS de test"

**Formats acceptés** :
- `+243991234567` ✅ (Format international complet)
- `243991234567` ✅ (Format international sans +)
- `00243991234567` ✅ (Format international avec 00)
- `0991234567` ✅ (Format local RDC avec 0)
- `991234567` ✅ (Format local sans 0)

**Tous ces formats seront normalisés vers** : `+243991234567`

## 🔍 Logs de Déploiement

Après le déploiement, vous devriez voir dans les logs :

```
🔄 Serveur SmartCabb V7 - Fix Téléphone - 14/02/2026
🚀 Démarrage du serveur SmartCabb...
🔍 Diagnostic variables d'environnement:
  - SUPABASE_URL: ✅ Configuré
  - SUPABASE_SERVICE_ROLE_KEY: ✅ Configuré
  - SUPABASE_ANON_KEY: ✅ Configuré
  - FIREBASE_PROJECT_ID: ✅ Configuré
  - FIREBASE_SERVICE_ACCOUNT_JSON: ✅ Configuré
  - AFRICAS_TALKING_API_KEY: ✅ Configuré
```

## 🚨 Dépannage

### Erreur : Module not found
**Cause** : Ancien cache du bundler Supabase  
**Solution** : Supprimer et re-déployer la fonction
```bash
supabase functions delete make-server-2eb02e52
supabase functions deploy make-server-2eb02e52
```

### Erreur : Invalid environment variable
**Cause** : Variables d'environnement manquantes  
**Solution** : Vérifier les secrets dans le dashboard Supabase
```bash
# Liste des variables requises :
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
AFRICAS_TALKING_API_KEY
AFRICAS_TALKING_USERNAME
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON
```

### Les conducteurs ne reçoivent toujours pas de notifications
**Étapes de diagnostic** :
1. Vérifier que le backend est déployé (V7)
2. Tester l'endpoint de santé
3. Vérifier les logs Firebase dans le panel admin
4. Vérifier les credentials Africa's Talking
5. Tester l'envoi d'un SMS manuel

## 📊 Changelog V7

### Corrections
- 🐛 Fix erreur "Module not found" lors du déploiement
- 🐛 Fix erreur "InvalidPhoneNumber" Africa's Talking
- 🔧 Centralisation de la normalisation des numéros de téléphone

### Améliorations
- ✨ Création du fichier utilitaire `phone-utils.ts`
- ✨ Suppression des fonctions dupliquées de normalisation
- ✨ Meilleure gestion des formats de numéros de téléphone RDC
- 📝 Documentation améliorée

## ✅ Prochaines Étapes

Après le déploiement réussi :

1. ✅ Tester la création d'une course depuis l'app passager
2. ✅ Vérifier que les conducteurs reçoivent bien les notifications push
3. ✅ Vérifier que les conducteurs reçoivent bien les SMS (si solde suffisant)
4. ✅ Monitorer les logs pour s'assurer qu'il n'y a plus d'erreurs "InvalidPhoneNumber"

## 📞 Support

En cas de problème :
1. Vérifier les logs dans le dashboard Supabase
2. Tester les endpoints de diagnostic
3. Vérifier que toutes les variables d'environnement sont bien configurées

---

**Version** : V7  
**Date** : 14 février 2026  
**Auteur** : Assistant SmartCabb
