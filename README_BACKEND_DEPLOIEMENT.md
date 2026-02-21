# 🚨 URGENT : Backend SmartCabb Non Déployé

## 🔴 Problème Identifié

**Le backend SmartCabb n'est PAS déployé sur Supabase.**

Votre application frontend fonctionne sur Vercel (https://smartcabb.com), mais toutes les requêtes API échouent avec **"Failed to fetch"** parce que le backend Supabase Edge Function n'existe pas.

---

## 📋 Résumé de la Situation

| Composant | Statut | Détails |
|-----------|--------|---------|
| **Frontend** | ✅ Déployé | Vercel : https://smartcabb.com |
| **Variables Frontend** | ✅ Configurées | 9 variables VITE_* dans Vercel |
| **Backend** | ❌ NON DÉPLOYÉ | Supabase Edge Function manquante |
| **Variables Backend** | ❌ NON CONFIGURÉES | Secrets Supabase non définis |
| **Database** | ✅ Configurée | Supabase PostgreSQL opérationnelle |

---

## ⚡ Solution Rapide (5 minutes)

### Étape 1 : Installer Supabase CLI

**macOS** :
```bash
brew install supabase/tap/supabase
```

**Windows (PowerShell en Admin)** :
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**NPM (toutes plateformes)** :
```bash
npm install -g supabase
```

### Étape 2 : Exécuter le Script de Déploiement

**macOS/Linux** :
```bash
chmod +x deploy-backend.sh
./deploy-backend.sh
```

**Windows PowerShell** :
```powershell
.\deploy-backend.ps1
```

Le script va :
1. ✅ Vérifier Supabase CLI
2. ✅ Restructurer le dossier backend
3. ✅ Vous authentifier
4. ✅ Lier le projet Supabase
5. ✅ Configurer les secrets (si `.env.supabase` existe)
6. ✅ Déployer le backend
7. ✅ Vérifier que tout fonctionne

### Étape 3 : Configurer les Secrets

Créez un fichier `.env.supabase` à partir de `.env.supabase.example` :

```bash
cp .env.supabase.example .env.supabase
```

Modifiez `.env.supabase` avec vos vraies clés API, puis :

```bash
supabase secrets set --env-file .env.supabase
```

### Étape 4 : Vérifier le Déploiement

```bash
curl https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/health
```

**Réponse attendue** :
```json
{"status":"ok"}
```

---

## 📖 Documentation Complète

### Fichiers de documentation disponibles :

1. **`GUIDE_DEPLOIEMENT_BACKEND_SUPABASE.md`**  
   Guide complet étape par étape du déploiement

2. **`DIAGNOSTIC_BACKEND.md`**  
   Diagnostic détaillé du problème et solutions de dépannage

3. **`.env.supabase.example`**  
   Template pour les variables d'environnement backend

---

## 🔑 Secrets Backend Requis

Ces variables d'environnement doivent être configurées sur Supabase (PAS sur Vercel) :

```bash
AFRICAS_TALKING_USERNAME=...        # Service SMS
AFRICAS_TALKING_API_KEY=...         # Service SMS
FLUTTERWAVE_SECRET_KEY=...          # Paiements Mobile Money
SENDGRID_API_KEY=...                # Emails
GOOGLE_MAPS_SERVER_API_KEY=...     # Géolocalisation
MAPBOX_API_KEY=...                  # Cartes
FIREBASE_PROJECT_ID=...             # Push notifications
FIREBASE_SERVER_KEY=...             # Push notifications
```

⚠️ **IMPORTANT** : Ces secrets ne doivent JAMAIS être exposés au frontend.

---

## 🏗️ Architecture Actuelle vs. Requise

### ❌ Actuelle (Cassée)

```
Frontend (Vercel) ─ fetch() ──> ❌ Backend (404 Not Found)
```

### ✅ Requise (Après Déploiement)

```
Frontend (Vercel) ─ fetch() ──> ✅ Backend (Supabase Edge Function) ─> Database
```

---

## 🎯 Checklist de Déploiement

- [ ] Supabase CLI installé
- [ ] Dossier renommé : `/supabase/functions/make-server-2eb02e52/`
- [ ] Authentifié : `supabase login`
- [ ] Projet lié : `supabase link --project-ref zaerjqchzqmcxqblkfkg`
- [ ] Secrets configurés : `.env.supabase` créé et déployé
- [ ] Backend déployé : `supabase functions deploy make-server-2eb02e52`
- [ ] Health check répond : `curl .../health` → `{"status":"ok"}`
- [ ] Frontend peut créer un compte admin
- [ ] Frontend peut se connecter au dashboard

---

## 🚀 Commandes Essentielles

### Déployer le backend
```bash
supabase functions deploy make-server-2eb02e52
```

### Voir les logs en temps réel
```bash
supabase functions logs make-server-2eb02e52 --follow
```

### Lister les secrets configurés
```bash
supabase secrets list
```

### Tester le backend
```bash
curl https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/health
```

---

## ❓ Questions Fréquentes

### Q : Pourquoi le backend n'est-il pas sur Vercel ?

**R** : SmartCabb utilise **Supabase Edge Functions** (runtime Deno) pour le backend, pas Vercel Serverless Functions (runtime Node.js). L'architecture a été conçue ainsi pour utiliser Supabase Auth, Database, Storage et Realtime de manière intégrée.

### Q : Dois-je redéployer le backend après chaque modification ?

**R** : Oui. Contrairement au frontend qui se redéploie automatiquement via Vercel quand vous pushez sur GitHub, le backend doit être redéployé manuellement :

```bash
git push origin main              # Redéploie le frontend automatiquement
supabase functions deploy ...     # Doit être fait manuellement pour le backend
```

### Q : Les variables d'environnement Vercel sont-elles utilisées par le backend ?

**R** : Non. Les variables dans Vercel (préfixées `VITE_*`) sont pour le frontend uniquement. Le backend utilise les **secrets Supabase** configurés via `supabase secrets set`.

### Q : Que se passe-t-il si je ne configure pas les secrets ?

**R** : Les fonctionnalités qui dépendent de ces secrets ne fonctionneront pas :
- Pas de secrets SMS → Pas d'envoi de codes OTP
- Pas de secrets Flutterwave → Pas de paiements Mobile Money
- Pas de secrets SendGrid → Pas d'envoi d'emails
- Etc.

Mais le backend démarrera quand même et les autres fonctionnalités marcheront.

---

## 🐛 Problèmes Courants

### "Command not found: supabase"

**Solution** : Installez Supabase CLI (voir Étape 1 ci-dessus)

### "Function not found" après déploiement

**Cause** : Le dossier n'a pas été renommé correctement

**Solution** :
```bash
mv supabase/functions/server supabase/functions/make-server-2eb02e52
```

### "Failed to fetch" persiste après déploiement

**Causes possibles** :
1. Le backend n'a pas démarré (attendre 30 secondes)
2. Erreur CORS (vérifier `index.tsx`)
3. Secrets manquants causant un crash du backend

**Solution** : Vérifier les logs
```bash
supabase functions logs make-server-2eb02e52
```

---

## 📞 Support

Si le backend ne fonctionne toujours pas :

1. **Lisez le diagnostic complet** : `DIAGNOSTIC_BACKEND.md`
2. **Vérifiez les logs** : `supabase functions logs make-server-2eb02e52`
3. **Testez le health check** : `curl .../health`
4. **Vérifiez les secrets** : `supabase secrets list`

---

## 🔗 Liens Utiles

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Secrets Management](https://supabase.com/docs/guides/functions/secrets)

---

**Créé le** : 5 février 2026  
**Projet** : SmartCabb  
**Auteur** : Assistant IA Figma Make

---

## ⚡ TL;DR

```bash
# 1. Installer Supabase CLI
npm install -g supabase

# 2. Renommer le dossier
mv supabase/functions/server supabase/functions/make-server-2eb02e52

# 3. Authentifier et lier
supabase login
supabase link --project-ref zaerjqchzqmcxqblkfkg

# 4. Configurer les secrets
cp .env.supabase.example .env.supabase
# Remplir .env.supabase avec vos vraies clés
supabase secrets set --env-file .env.supabase

# 5. Déployer
supabase functions deploy make-server-2eb02e52

# 6. Vérifier
curl https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/health
# → {"status":"ok"}
```

**Temps estimé** : 5-10 minutes

**C'est tout !** 🎉
