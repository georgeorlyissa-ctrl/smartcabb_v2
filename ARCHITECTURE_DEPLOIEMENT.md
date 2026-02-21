# 🏗️ Architecture et Déploiement SmartCabb

## 📊 Vue d'ensemble de l'Architecture

SmartCabb utilise une **architecture trois-tiers** avec séparation frontend/backend :

```
┌─────────────────────────────────────────────────────────────┐
│                    UTILISATEURS                              │
│  (Web Browser / Mobile App)                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS
                         │
┌────────────────────────▼────────────────────────────────────┐
│               FRONTEND (Vercel)                              │
│  ✅ URL : https://smartcabb.com                             │
│  ✅ Tech : React + Vite + Tailwind CSS                      │
│  ✅ Déploiement : Automatique via GitHub                    │
│  ✅ Variables : VITE_* (configurées dans Vercel)            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ fetch() API Calls
                         │
┌────────────────────────▼────────────────────────────────────┐
│            BACKEND (Supabase Edge Functions)                 │
│  ❌ URL : https://zaerjqchzqmcxqblkfkg.supabase.co         │
│           /functions/v1/make-server-2eb02e52/*              │
│  ❌ Tech : Hono + Deno Runtime                              │
│  ❌ Déploiement : MANUEL via Supabase CLI                   │
│  ❌ Variables : Secrets Supabase (non configurés)           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ PostgreSQL Protocol
                         │
┌────────────────────────▼────────────────────────────────────┐
│            DATABASE (Supabase PostgreSQL)                    │
│  ✅ URL : Configurée automatiquement                        │
│  ✅ Tables : kv_store_2eb02e52, profiles, rides, etc.       │
│  ✅ Auth : Supabase Auth intégré                            │
│  ✅ Storage : Supabase Storage pour fichiers                │
│  ✅ Realtime : WebSocket pour mises à jour live             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Comparaison : Frontend vs Backend

| Aspect | Frontend (Vercel) | Backend (Supabase) |
|--------|-------------------|-------------------|
| **Statut** | ✅ Déployé | ❌ NON déployé |
| **Plateforme** | Vercel | Supabase |
| **Runtime** | Node.js (build) + Static | Deno |
| **Framework** | React + Vite | Hono (web framework) |
| **URL** | `smartcabb.com` | `zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/...` |
| **Déploiement** | Automatique via GitHub | Manuel via CLI |
| **Commande déploiement** | `git push` → auto deploy | `supabase functions deploy` |
| **Variables d'env** | VITE_* dans Vercel UI | Secrets via `supabase secrets set` |
| **Configuration** | ✅ Configuré (18 vars) | ❌ Non configuré |
| **Accès code** | Public (bundle JS) | Privé (serveur) |
| **Secrets exposés ?** | ❌ Non (VITE_ = public keys) | ⚠️ Risque si mal configuré |

---

## 🔐 Gestion des Variables d'Environnement

### Variables Frontend (Vercel)

**Préfixe** : `VITE_*`  
**Localisation** : Vercel Dashboard → Settings → Environment Variables  
**Sécurité** : ⚠️ Publiques (visibles dans le bundle JavaScript)

```env
# Exemples de variables frontend (Vercel)
VITE_SUPABASE_URL=https://zaerjqchzqmcxqblkfkg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...                    # Public OK
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...                    # Public OK (avec restrictions)
VITE_MAPBOX_API_KEY=pk.eyJ...                         # Public OK
```

**Usage** :
```typescript
// Frontend (React)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```

---

### Variables Backend (Supabase)

**Préfixe** : Aucun  
**Localisation** : Supabase Secrets (via CLI)  
**Sécurité** : ✅ Privées (jamais exposées au frontend)

```env
# Exemples de variables backend (Supabase)
AFRICAS_TALKING_USERNAME=...                          # Secret
AFRICAS_TALKING_API_KEY=...                           # Secret
FLUTTERWAVE_SECRET_KEY=...                            # Secret
SENDGRID_API_KEY=...                                  # Secret
GOOGLE_MAPS_SERVER_API_KEY=...                        # Secret
SUPABASE_SERVICE_ROLE_KEY=...                         # Secret (auto-configuré)
```

**Usage** :
```typescript
// Backend (Deno)
const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY');
```

---

## 📦 Structure des Fichiers

### Structure Actuelle (Incorrecte)

```
smartcabb/
├── supabase/
│   └── functions/
│       └── server/                  ❌ NOM INCORRECT
│           ├── index.tsx
│           ├── admin-routes.tsx
│           └── ... (autres routes)
└── ...
```

### Structure Requise (Correcte)

```
smartcabb/
├── supabase/
│   └── functions/
│       └── make-server-2eb02e52/    ✅ NOM CORRECT
│           ├── index.tsx
│           ├── admin-routes.tsx
│           └── ... (autres routes)
└── ...
```

**Pourquoi ?**  
Le nom du dossier doit correspondre au nom de la fonction Edge pour que Supabase CLI puisse la déployer correctement.

---

## 🚀 Workflow de Déploiement

### Workflow Frontend (Automatique)

```bash
# 1. Modifier le code frontend
vim App.tsx

# 2. Commit et push vers GitHub
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main

# 3. Vercel détecte le push et redéploie automatiquement
# ✅ Aucune action manuelle requise
```

**Temps de déploiement** : ~2-3 minutes après le push

---

### Workflow Backend (Manuel)

```bash
# 1. Modifier le code backend
vim supabase/functions/make-server-2eb02e52/index.tsx

# 2. Commit et push vers GitHub (optionnel pour versioning)
git add .
git commit -m "fix: correction backend"
git push origin main

# 3. Déployer manuellement sur Supabase
supabase functions deploy make-server-2eb02e52

# ✅ Le backend est maintenant à jour
```

**Temps de déploiement** : ~10-30 secondes

⚠️ **IMPORTANT** : Le backend ne se déploie PAS automatiquement. Vous devez exécuter `supabase functions deploy` manuellement après chaque modification.

---

## 🔍 URLs et Endpoints

### Frontend URLs

| Environnement | URL | Statut |
|---------------|-----|--------|
| Production | `https://smartcabb.com` | ✅ Déployé |
| Production (www) | `https://www.smartcabb.com` | ✅ Redirigé |
| Preview | `https://smartcabb-*.vercel.app` | ✅ Auto pour chaque PR |

### Backend URLs

| Environnement | URL | Statut |
|---------------|-----|--------|
| Production | `https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/*` | ❌ Non déployé |

**Endpoints Backend** :
```
GET  /make-server-2eb02e52/health                    # Health check
POST /make-server-2eb02e52/create-admin              # Créer admin
POST /make-server-2eb02e52/init-test-user            # Créer utilisateur test
GET  /make-server-2eb02e52/drivers/online-drivers    # Liste conducteurs en ligne
POST /make-server-2eb02e52/rides/create              # Créer une course
... (et 50+ autres endpoints)
```

---

## 🔧 Configuration Requise

### Prérequis Système

| Outil | Version Minimum | Installation |
|-------|----------------|--------------|
| Node.js | 18.x ou supérieur | https://nodejs.org/ |
| npm | 9.x ou supérieur | Inclus avec Node.js |
| Git | 2.x ou supérieur | https://git-scm.com/ |
| Supabase CLI | 1.x ou supérieur | `npm install -g supabase` |

### Comptes Requis

| Service | Utilisé pour | Compte créé ? |
|---------|-------------|---------------|
| Vercel | Hébergement frontend | ✅ Oui |
| Supabase | Backend + Database | ✅ Oui |
| GitHub | Version control | ✅ Oui |
| Africa's Talking | Service SMS | ⚠️ À vérifier |
| Flutterwave | Paiements Mobile Money | ⚠️ À vérifier |
| SendGrid | Service Email | ⚠️ À vérifier |
| Google Maps | Géolocalisation | ⚠️ À vérifier |
| Mapbox | Cartes interactives | ⚠️ À vérifier |
| Firebase | Push notifications | ⚠️ À vérifier |

---

## 🎯 Statut Actuel du Déploiement

### ✅ Ce qui fonctionne

- [x] Frontend déployé sur Vercel
- [x] Variables frontend configurées (9 variables VITE_*)
- [x] Domaine smartcabb.com configuré
- [x] SSL/HTTPS actif
- [x] Supabase Database créée
- [x] Table kv_store_2eb02e52 existe
- [x] Supabase Auth configuré

### ❌ Ce qui ne fonctionne PAS

- [ ] Backend Supabase Edge Function déployée
- [ ] Secrets backend configurés
- [ ] API endpoints accessibles
- [ ] Inscription admin fonctionnelle
- [ ] Login fonctionnel
- [ ] Dashboard admin accessible
- [ ] Services SMS/Email/Paiements opérationnels

---

## 🚨 Problèmes Actuels

### 1. Backend Non Déployé

**Symptôme** :
```
fetch('https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/health')
→ Failed to fetch
→ net::ERR_NAME_NOT_RESOLVED
→ 404 Not Found
```

**Cause** : La fonction Edge n'existe pas sur Supabase

**S$olution** : Déployer le backend (voir `SOLUTION_RAPIDE.md`)

---

### 2. Rate Limit Supabase (429)

**Symptôme** :
```javascript
supabase.auth.admin.createUser({ ... })
→ Error 429: Too Many Requests
```

**Cause** : Le frontend essaie de créer des comptes directement avec SERVICE_ROLE_KEY

**Pourquoi c'est un problème** :
1. La SERVICE_ROLE_KEY ne doit JAMAIS être exposée au frontend (risque de sécurité)
2. Supabase limite les appels directs depuis le frontend
3. Cette approche contourne l'architecture prévue

**Solution** : Le backend doit gérer la création de comptes (avec SERVICE_ROLE_KEY côté serveur)

---

### 3. Erreur "Cannot read properties of undefined"

**Symptôme** :
```
Cannot read properties of undefined (reading 'includes')
```

**Cause** : Le code frontend essaie d'accéder à une réponse du backend qui n'existe pas (car backend down)

**Solution** : Déployer le backend

---

## 🎓 Concepts Importants

### Edge Functions vs Serverless Functions

| Aspect | Supabase Edge Functions | Vercel Serverless |
|--------|------------------------|-------------------|
| Runtime | Deno (V8 isolate) | Node.js |
| Localisation | Proche de la DB | Proche de l'utilisateur |
| Latence vers DB | Ultra-faible (~1ms) | Variable |
| Démarrage à froid | Quasi-instantané | Quelques ms |
| Coût | Inclus dans Supabase | Inclus dans Vercel |
| Cas d'usage | Operations DB intensives | Rendering, API routes |

**Pourquoi SmartCabb utilise Supabase Edge Functions** :
- Accès direct et rapide à la base de données
- Intégration native avec Supabase Auth, Storage, Realtime
- Gestion simplifiée des secrets (SERVICE_ROLE_KEY)
- Pas de latence réseau entre backend et DB

---

### KV Store vs Tables PostgreSQL

SmartCabb utilise les deux :

**KV Store** (`kv_store_2eb02e52` table) :
- Stockage clé-valeur simple
- Idéal pour : configurations, caches, profils
- Accès via `kv.get()`, `kv.set()`, etc.

**Tables PostgreSQL** (autres tables) :
- Stockage relationnel structuré
- Idéal pour : courses, utilisateurs, paiements
- Accès via `supabase.from('rides').select()`, etc.

---

## 📈 Roadmap Déploiement

### Phase 1 : Déploiement Initial (ACTUEL)

- [x] Créer projet Supabase
- [x] Créer projet Vercel
- [x] Configurer domaine smartcabb.com
- [ ] **Déployer backend sur Supabase** ← VOUS ÊTES ICI
- [ ] Configurer secrets backend
- [ ] Tester l'application end-to-end

### Phase 2 : Optimisation

- [ ] Configurer CI/CD pour le backend
- [ ] Mettre en place monitoring (Sentry, LogRocket)
- [ ] Optimiser les performances
- [ ] Configurer backups automatiques

### Phase 3 : Production

- [ ] Tests de charge
- [ ] Sécurité audit (OWASP Top 10)
- [ ] Documentation API
- [ ] Formation équipe

---

## 🆘 Résolution Rapide

**Si vous lisez ceci, le backend est probablement down. Voici la solution en 30 secondes :**

```bash
# Installation Supabase CLI
npm install -g supabase

# Authentification
supabase login

# Renommer le dossier
mv supabase/functions/server supabase/functions/make-server-2eb02e52

# Lier et déployer
supabase link --project-ref zaerjqchzqmcxqblkfkg
supabase functions deploy make-server-2eb02e52

# Vérifier
curl https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/health
```

**Réponse attendue** : `{"status":"ok"}`

---

## 📚 Documentation Associée

- `SOLUTION_RAPIDE.md` - Solution en 5 minutes
- `README_BACKEND_DEPLOIEMENT.md` - Guide complet
- `GUIDE_DEPLOIEMENT_BACKEND_SUPABASE.md` - Instructions détaillées
- `DIAGNOSTIC_BACKEND.md` - Diagnostic technique
- `LIRE_DABORD.txt` - Résumé urgent

---

**Créé le** : 5 février 2026  
**Projet** : SmartCabb  
**Version** : 1.0  
**Auteur** : Assistant IA Figma Make
