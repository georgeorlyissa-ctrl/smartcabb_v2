# 🔍 Diagnostic Backend SmartCabb - Résolution du Problème "Backend Down"

## 📊 Résumé du Diagnostic

**Problème** : Le backend n'est pas disponible (erreurs "Failed to fetch")  
**Cause racine** : Le backend Supabase Edge Function n'a jamais été déployé  
**Statut actuel** : Frontend déployé sur Vercel ✅ | Backend non déployé sur Supabase ❌

---

## 🏗️ Architecture SmartCabb

```
┌─────────────────────────────────────────┐
│  FRONTEND (Vercel)                      │
│  ✅ Déployé : https://smartcabb.com     │
│  ✅ Variables VITE_* configurées        │
└───────────────┬─────────────────────────┘
                │
                │ HTTP Requests
                │ fetch()
                │
                v
┌─────────────────────────────────────────┐
│  BACKEND (Supabase Edge Function)       │
│  ❌ NON DÉPLOYÉ                         │
│  ❌ URL attendue :                      │
│     https://zaerjqchzqmcxqblkfkg       │
│     .supabase.co/functions/v1/          │
│     make-server-2eb02e52/*              │
└───────────────┬─────────────────────────┘
                │
                v
┌─────────────────────────────────────────┐
│  DATABASE (Supabase PostgreSQL)         │
│  ✅ Configurée                          │
│  ✅ Table kv_store_2eb02e52             │
└─────────────────────────────────────────┘
```

---

## ❌ Pourquoi le Backend est "Down"

### Ce qui s'est passé :

1. ✅ Vous avez réinitialisé le repository GitHub (suite aux alertes de sécurité)
2. ✅ Vous avez créé un nouveau projet Vercel
3. ✅ Vous avez configuré 18 variables d'environnement dans Vercel
4. ✅ Le frontend a été déployé automatiquement sur Vercel via GitHub

### Ce qui manque :

5. ❌ **Le backend n'a PAS été déployé sur Supabase**

### Pourquoi ?

- **Vercel déploie seulement le frontend** (application React/Vite)
- **Le backend doit être déployé manuellement** sur Supabase via Supabase CLI
- Supabase Edge Functions ≠ Vercel Serverless Functions
- L'architecture SmartCabb utilise Supabase pour le backend, pas Vercel

---

## 🔴 Erreurs Actuelles

### 1. Erreur "Failed to fetch" dans le frontend

```javascript
// Frontend essaie d'appeler le backend
fetch('https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/create-admin', ...)
```

**Résultat** : `Failed to fetch` ou `net::ERR_NAME_NOT_RESOLVED`

**Cause** : La fonction Edge `make-server-2eb02e52` n'existe pas sur Supabase (jamais déployée)

### 2. Erreur 404 sur les endpoints backend

```bash
curl https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/health

# Réponse actuelle :
404 Not Found
Function not found
```

**Cause** : La fonction n'est pas déployée

### 3. Rate limit Supabase (erreur 429) dans inscription admin

**Cause** : Le frontend tente de créer des comptes directement via `supabase.auth.admin.createUser()` depuis le navigateur, ce qui :
- Nécessite la `SERVICE_ROLE_KEY` (ne doit JAMAIS être exposée au frontend)
- Déclenche des rate limits Supabase
- Est une faille de sécurité

**Solution** : Le backend doit gérer la création de comptes (avec SERVICE_ROLE_KEY côté serveur)

---

## ✅ Solution Complète

### Option A : Script Automatique (Recommandé)

#### Sur macOS/Linux :

```bash
# 1. Rendre le script exécutable
chmod +x deploy-backend.sh

# 2. Exécuter le script
./deploy-backend.sh
```

#### Sur Windows (PowerShell) :

```powershell
# Exécuter le script
.\deploy-backend.ps1
```

Le script va :
1. ✅ Vérifier Supabase CLI
2. ✅ Restructurer le dossier backend (renommer `server` → `make-server-2eb02e52`)
3. ✅ Authentifier Supabase
4. ✅ Lier le projet
5. ✅ Configurer les secrets (si `.env.supabase` existe)
6. ✅ Déployer la fonction Edge
7. ✅ Vérifier le déploiement

---

### Option B : Déploiement Manuel

#### 1. Installer Supabase CLI

**macOS** :
```bash
brew install supabase/tap/supabase
```

**Windows** :
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**NPM (toutes plateformes)** :
```bash
npm install -g supabase
```

#### 2. Restructurer le dossier backend

**Actuellement** :
```
/supabase/functions/server/    ❌
```

**Requis** :
```
/supabase/functions/make-server-2eb02e52/    ✅
```

**Commande** :
```bash
# macOS/Linux
mv supabase/functions/server supabase/functions/make-server-2eb02e52

# Windows PowerShell
Rename-Item -Path "supabase\functions\server" -NewName "make-server-2eb02e52"
```

#### 3. Se connecter et lier le projet

```bash
# Authentification
supabase login

# Lier le projet
supabase link --project-ref zaerjqchzqmcxqblkfkg
```

#### 4. Configurer les secrets

Créez `.env.supabase` (utilisez `.env.supabase.example` comme modèle) :

```bash
AFRICAS_TALKING_USERNAME=votre_username
AFRICAS_TALKING_API_KEY=votre_api_key
FLUTTERWAVE_SECRET_KEY=votre_secret_key
SENDGRID_API_KEY=votre_api_key
GOOGLE_MAPS_SERVER_API_KEY=votre_api_key
MAPBOX_API_KEY=votre_api_key
FIREBASE_PROJECT_ID=votre_project_id
FIREBASE_SERVER_KEY=votre_server_key
```

Puis :

```bash
# Configurer tous les secrets
supabase secrets set --env-file .env.supabase

# OU un par un
supabase secrets set AFRICAS_TALKING_USERNAME=...
supabase secrets set AFRICAS_TALKING_API_KEY=...
# etc.
```

#### 5. Déployer la fonction

```bash
supabase functions deploy make-server-2eb02e52
```

**Sortie attendue** :
```
Deploying Function make-server-2eb02e52...
✓ Deployed Function make-server-2eb02e52 in 3s
https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52
```

#### 6. Vérifier le déploiement

```bash
# Test health check
curl https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/health

# Réponse attendue :
{"status":"ok"}
```

---

## 🎯 Vérification Complète

### Checklist Backend Déployé

- [ ] Supabase CLI installé : `supabase --version`
- [ ] Dossier renommé : `/supabase/functions/make-server-2eb02e52/` existe
- [ ] Authentifié : `supabase login` réussi
- [ ] Projet lié : `.supabase/config.toml` existe
- [ ] Secrets configurés : `supabase secrets list` montre 8+ secrets
- [ ] Fonction déployée : `supabase functions deploy` réussi
- [ ] Health check répond : `curl .../health` → `{"status":"ok"}`

### Checklist Frontend Fonctionnel

- [ ] Frontend accessible : https://smartcabb.com charge
- [ ] Page inscription admin charge sans erreur
- [ ] Création compte admin fonctionne (plus d'erreur 429)
- [ ] Login admin fonctionne
- [ ] Dashboard admin charge
- [ ] Console navigateur : pas d'erreur "Failed to fetch"

---

## 🐛 Dépannage

### Problème 1 : "Command not found: supabase"

**Cause** : Supabase CLI non installé

**Solution** :
```bash
npm install -g supabase
# OU
brew install supabase/tap/supabase
```

---

### Problème 2 : "Function not found" après déploiement

**Cause** : Le dossier n'a pas été renommé correctement

**Solution** :
```bash
# Vérifier la structure
ls -la supabase/functions/

# Doit contenir :
make-server-2eb02e52/

# Si ce n'est pas le cas, renommez :
mv supabase/functions/server supabase/functions/make-server-2eb02e52
```

---

### Problème 3 : "Project not linked"

**Cause** : Le projet local n'est pas lié à Supabase

**Solution** :
```bash
supabase link --project-ref zaerjqchzqmcxqblkfkg
```

---

### Problème 4 : Secrets manquants

**Cause** : Variables d'environnement non configurées sur Supabase

**Solution** :
```bash
# Vérifier les secrets actuels
supabase secrets list

# Configurer les secrets manquants
supabase secrets set AFRICAS_TALKING_USERNAME=...
supabase secrets set AFRICAS_TALKING_API_KEY=...
# etc.
```

---

### Problème 5 : Erreur CORS

**Cause** : L'origine du frontend n'est pas autorisée dans le backend

**Solution** : Vérifiez `/supabase/functions/make-server-2eb02e52/index.tsx` :

```typescript
cors({
  origin: [
    "https://smartcabb.com", 
    "https://www.smartcabb.com", 
    "http://localhost:3000"
  ],
  // ...
})
```

Redéployez si modifié :
```bash
supabase functions deploy make-server-2eb02e52
```

---

## 📊 Logs et Monitoring

### Afficher les logs en temps réel

```bash
supabase functions logs make-server-2eb02e52 --follow
```

### Filtrer par erreur

```bash
supabase functions logs make-server-2eb02e52 | grep ERROR
```

### Afficher les dernières 100 lignes

```bash
supabase functions logs make-server-2eb02e52 --limit 100
```

---

## 🔄 Workflow de Développement

### Modifier le backend

1. Modifier le code dans `/supabase/functions/make-server-2eb02e52/`
2. Tester localement (optionnel) :
   ```bash
   supabase functions serve make-server-2eb02e52
   ```
3. Commit et push vers GitHub :
   ```bash
   git add supabase/functions/make-server-2eb02e52/
   git commit -m "fix: update backend logic"
   git push origin main
   ```
4. Redéployer sur Supabase :
   ```bash
   supabase functions deploy make-server-2eb02e52
   ```

**Note** : Vercel redéploie automatiquement le frontend, mais le backend doit être redéployé manuellement.

---

## 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. **Vérifier les logs** :
   ```bash
   supabase functions logs make-server-2eb02e52
   ```

2. **Vérifier les secrets** :
   ```bash
   supabase secrets list
   ```

3. **Vérifier la configuration frontend** dans Vercel (variables VITE_*)

4. **Tester directement le backend** :
   ```bash
   curl -X POST https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/init-test-user \
     -H "Content-Type: application/json"
   ```

---

## 📚 Ressources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Supabase Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [Deno Runtime (utilisé par Supabase)](https://deno.com/manual)

---

**Créé le** : 5 février 2026  
**Projet** : SmartCabb  
**Version** : 1.0  
**Auteur** : Assistant IA Figma Make
