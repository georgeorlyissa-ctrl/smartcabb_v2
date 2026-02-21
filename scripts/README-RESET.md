# 🗑️ Guide de Réinitialisation de la Base de Données

Ce document explique comment vider la base de données SmartCabb pour repartir sur des données propres.

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Méthode 1: Interface Admin (Recommandé)](#méthode-1-interface-admin-recommandé)
3. [Méthode 2: Script Node.js](#méthode-2-script-nodejs)
4. [Méthode 3: API REST](#méthode-3-api-rest)
5. [Types de Réinitialisation](#types-de-réinitialisation)
6. [Précautions](#précautions)

---

## Vue d'ensemble

Trois méthodes sont disponibles pour réinitialiser la base de données :

| Méthode | Difficulté | Usage |
|---------|------------|-------|
| **Interface Admin** | ⭐ Facile | Recommandé pour la plupart des utilisateurs |
| **Script Node.js** | ⭐⭐ Moyen | Pour les développeurs en local |
| **API REST** | ⭐⭐⭐ Avancé | Pour l'automatisation |

---

## Méthode 1: Interface Admin (Recommandé)

### Étapes :

1. **Connectez-vous au panel admin** de SmartCabb
2. **Naviguez vers** : Tableau de bord → **🧹 Nettoyage des données**
3. **Cliquez sur "Actualiser"** pour voir les statistiques actuelles
4. **Choisissez une option** :
   - 🔴 **Nettoyage complet** : Supprime toutes les données sauf les paramètres
   - 🟡 **Utilisateurs uniquement** : Supprime profils, conducteurs, véhicules
   - 🟢 **Courses uniquement** : Supprime l'historique des courses
5. **Confirmez** l'action (double confirmation requise)
6. **Attendez** la fin du processus

### Avantages :
- ✅ Interface visuelle intuitive
- ✅ Statistiques en temps réel
- ✅ Double confirmation de sécurité
- ✅ Pas besoin de configuration technique

---

## Méthode 2: Script Node.js

### Installation :

Aucune installation requise si vous avez Node.js installé.

### Usage :

```bash
# Afficher les statistiques
node scripts/reset-database.js --stats

# Supprimer toutes les courses
node scripts/reset-database.js --rides

# Supprimer tous les utilisateurs (garde paramètres)
node scripts/reset-database.js --users

# TOUT réinitialiser (DANGEREUX !)
node scripts/reset-database.js --all

# Afficher l'aide
node scripts/reset-database.js --help
```

### Exemple de sortie :

```
📊 Chargement des statistiques...

═══════════════════════════════════════
  📊 STATISTIQUES DE LA BASE DE DONNÉES
═══════════════════════════════════════

  Total d'enregistrements: 1,245
  Clés KV Store: 18

  Détail par table:
    profiles                 152
    drivers                   45
    vehicles                  48
    rides                    856
    ratings                  234
    transactions             112
    ...

═══════════════════════════════════════
```

### Configuration :

Par défaut, le script utilise les valeurs de `SUPABASE_URL` et `SUPABASE_ANON_KEY` depuis les variables d'environnement. Vous pouvez aussi les définir directement dans le script.

```bash
# Avec variables d'environnement
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"
node scripts/reset-database.js --stats
```

---

## Méthode 3: API REST

### Endpoints disponibles :

#### 1. Afficher les statistiques

```bash
curl -X GET \
  https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/reset/database-stats \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Réponse :**
```json
{
  "tables": [
    { "name": "profiles", "count": 152 },
    { "name": "drivers", "count": 45 },
    ...
  ],
  "totalRecords": 1245,
  "kvKeys": 18
}
```

#### 2. Réinitialiser TOUT

```bash
curl -X POST \
  https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/reset/reset-all \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### 3. Réinitialiser utilisateurs uniquement

```bash
curl -X POST \
  https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/reset/reset-users-only \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### 4. Réinitialiser courses uniquement

```bash
curl -X POST \
  https://zaerjqchzqmcxqblkfkg.supabase.co/functions/v1/make-server-2eb02e52/reset/reset-rides-only \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Réponse (succès) :**
```json
{
  "success": true,
  "cleared": [
    { "table": "rides", "deletedRows": 856 },
    { "table": "ratings", "deletedRows": 234 },
    ...
  ],
  "errors": [],
  "summary": {
    "totalDeleted": 1090,
    "tablesCleared": 3,
    "kvKeysDeleted": 12
  }
}
```

---

## Types de Réinitialisation

### 🔴 Réinitialisation complète (`reset-all`)

**Supprime :**
- ✅ Tous les profils utilisateurs
- ✅ Tous les conducteurs et véhicules
- ✅ Toutes les courses
- ✅ Tous les avis et notes
- ✅ Toutes les transactions
- ✅ Toutes les notifications
- ✅ Tous les documents
- ✅ Tous les codes promo
- ✅ Tous les paramètres
- ✅ Toutes les clés KV Store (sauf config globale)

**⚠️ ATTENTION :** Base de données complètement vide !

---

### 🟡 Utilisateurs uniquement (`reset-users-only`)

**Supprime :**
- ✅ Profils utilisateurs
- ✅ Conducteurs et véhicules
- ✅ Courses
- ✅ Avis et notes
- ✅ Transactions
- ✅ Notifications
- ✅ Documents

**Conserve :**
- ❌ Codes promo
- ❌ Paramètres système
- ❌ Configuration globale

**Usage :** Nettoyer les données de test avant production

---

### 🟢 Courses uniquement (`reset-rides-only`)

**Supprime :**
- ✅ Courses
- ✅ Avis et notes
- ✅ Transactions liées

**Conserve :**
- ❌ Utilisateurs et profils
- ❌ Conducteurs et véhicules
- ❌ Tous les paramètres

**Usage :** Nettoyer l'historique des courses de test

---

## Précautions

### ⚠️ Avant de réinitialiser :

1. **Faites une sauvegarde** via l'interface admin (Backup & Recovery)
2. **Vérifiez** que vous êtes sur le bon environnement (dev/prod)
3. **Prévenez** les autres utilisateurs si vous êtes en équipe
4. **Téléchargez** les données importantes si nécessaire

### 🔒 Sécurité :

- Les routes de réinitialisation nécessitent une authentification
- Double confirmation requise dans l'interface admin
- Les logs sont enregistrés pour audit
- Action **IRRÉVERSIBLE** - aucun moyen de récupérer les données

### 📊 Après réinitialisation :

1. ✅ Vérifiez les statistiques pour confirmer
2. ✅ Testez la création de nouvelles données
3. ✅ Vérifiez que l'application fonctionne correctement
4. ✅ Recréez les données de base si nécessaire (paramètres, etc.)

---

## FAQ

**Q: Puis-je annuler une réinitialisation ?**  
R: Non, l'action est irréversible. Faites toujours une sauvegarde avant.

**Q: Les sauvegardes sont-elles supprimées ?**  
R: Non, les fichiers de sauvegarde dans Supabase Storage sont conservés.

**Q: Combien de temps prend une réinitialisation ?**  
R: Généralement 5-30 secondes selon la quantité de données.

**Q: Puis-je réinitialiser en production ?**  
R: Techniquement oui, mais **FORTEMENT DÉCONSEILLÉ**. Faites toujours une sauvegarde complète avant.

**Q: La configuration globale (taux de change, etc.) est-elle supprimée ?**  
R: Avec `reset-all` : OUI. Avec `reset-users-only` : NON.

---

## Support

Pour toute question ou problème :
- 📧 Email: support@smartcabb.com
- 📱 Telegram: @smartcabb_support
- 📖 Documentation: https://docs.smartcabb.com

---

**Dernière mise à jour :** 5 février 2026  
**Version :** 1.0.0
