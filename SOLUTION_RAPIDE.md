# ⚡ Solution Rapide : Backend SmartCabb Down

## 🔴 Problème

**Le backend n'est pas déployé sur Supabase.**

Erreurs actuelles :
- ❌ "Failed to fetch" dans le frontend
- ❌ Erreur 429 (rate limit) lors de l'inscription admin
- ❌ Backend inaccessible

## ✅ Solution (5 minutes)

### Option 1 : Script Automatique ⭐ RECOMMANDÉ

**macOS/Linux** :
```bash
chmod +x deploy-backend.sh
./deploy-backend.sh
```

**Windows** :
```powershell
.\deploy-backend.ps1
```

---

### Option 2 : Commandes Manuelles

```bash
# 1. Installer Supabase CLI
npm install -g supabase

# 2. Renommer le dossier
mv supabase/functions/server supabase/functions/make-server-2eb02e52

# 3. Authentifier
supabase login

# 4. Lier le projet
supabase link --project-ref zaerjqchzqmcxqblkfkg

# 5. Configurer les secrets
cp .env.supabase.example .env.supabase
# Remplir .env.supabase avec vos clés
supabase secrets set --env-file .env.supabase

# 6. Déployer
supabase functions deploy make-server-2eb02e52

# 7. Vérifier
curl https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/health
```

**Résultat attendu** : `{"status":"ok"}`

---

## 🔍 Vérifier l'État Actuel

```bash
# macOS/Linux
chmod +x check-backend-status.sh
./check-backend-status.sh

# Windows
.\check-backend-status.ps1
```

---

## 📚 Documentation Complète

| Fichier | Description |
|---------|-------------|
| `README_BACKEND_DEPLOIEMENT.md` | Guide complet du problème et solution |
| `GUIDE_DEPLOIEMENT_BACKEND_SUPABASE.md` | Instructions détaillées étape par étape |
| `DIAGNOSTIC_BACKEND.md` | Diagnostic technique et dépannage |
| `.env.supabase.example` | Template pour les secrets backend |

---

## 🎯 Checklist

- [ ] Supabase CLI installé
- [ ] Dossier renommé en `make-server-2eb02e52`
- [ ] Authentifié : `supabase login`
- [ ] Projet lié
- [ ] Secrets configurés
- [ ] Backend déployé
- [ ] Health check répond OK

---

## 💡 Pourquoi ce problème ?

Après la réinitialisation du repository GitHub :
1. ✅ Frontend redéployé automatiquement sur Vercel via GitHub
2. ❌ Backend NON redéployé (doit être fait manuellement sur Supabase)

**L'architecture SmartCabb sépare frontend et backend :**
- Frontend → Vercel (déploiement auto via GitHub)
- Backend → Supabase (déploiement manuel via CLI)

---

## 🚀 Après le Déploiement

Testez votre application :
1. Ouvrez https://smartcabb.com
2. Créez un compte admin
3. Connectez-vous au dashboard

Les erreurs "Failed to fetch" devraient disparaître.

---

**Temps estimé** : 5-10 minutes  
**Créé le** : 5 février 2026
