# 🚨 FIX RAPIDE - Erreur Build Vercel

## ❌ ERREUR

```
Could not resolve "./components/admin/AdminForgotPasswordScreen" from "App.tsx"
```

---

## ✅ SOLUTION RAPIDE (2 minutes)

### **1️⃣ Vérifier les fichiers manquants**

```bash
node scripts/check-missing-files.js
```

**OU**

```bash
git status
```

---

### **2️⃣ Ajouter TOUS les fichiers**

```bash
git add .
```

---

### **3️⃣ Commiter**

```bash
git commit -m "fix: Ajout composants admin manquants"
```

---

### **4️⃣ Pusher**

```bash
git push origin main
```

---

### **5️⃣ Vérifier sur Vercel**

Attendez 2-3 minutes que Vercel redéploie automatiquement.

**Ou redéployez manuellement :**
https://vercel.com/dashboard → SmartCabb → Deployments → Redeploy

---

## 🎯 COMMANDE TOUT-EN-UN

```bash
git add . && git commit -m "fix: Ajout composants admin manquants" && git push origin main
```

---

## 📋 VÉRIFICATION

### **Sur GitHub:**
1. Allez sur https://github.com/georgeorlyissa-ctrl/smartcabb
2. Naviguez vers `components/admin/`
3. Vérifiez que `AdminForgotPasswordScreen.tsx` apparaît

### **Sur Vercel:**
1. Allez sur https://vercel.com/dashboard
2. Sélectionnez SmartCabb
3. Cliquez sur "Deployments"
4. Attendez que le build soit ✅ vert

---

## 🆘 SI ÇA NE MARCHE PAS

**Lisez la documentation complète :**
`/docs/FIX-VERCEL-BUILD-ERROR.md`

**Ou utilisez le script de diagnostic :**
```bash
bash scripts/verify-git-files.sh
```

---

**Date :** 5 février 2026  
**Temps de résolution :** ~2 minutes
