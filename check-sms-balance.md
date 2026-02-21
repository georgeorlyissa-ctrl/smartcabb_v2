# 🔍 Vérification Rapide du Solde SMS

## ⚡ Check en 30 Secondes

### Option 1 : Via l'Interface Web (Recommandé)

1. **Ouvrir** : https://account.africastalking.com
2. **Se connecter** avec vos identifiants
3. **Dashboard** → Voir le solde en haut à droite
4. **Résultat** :
   - ✅ **Solde > $5** : Tout va bien
   - ⚠️ **Solde $1-5** : Recharger bientôt
   - 🔴 **Solde < $1** : Recharger maintenant

---

### Option 2 : Via les Logs Backend

```bash
# Voir les erreurs SMS dans les logs
supabase functions logs make-server-2eb02e52 | grep "InsufficientBalance"
```

**Si vous voyez des lignes** :
```
❌ Échec envoi SMS: InsufficientBalance (code: 405)
```

→ **Solde insuffisant** 🔴

**Si aucune ligne** :
```
✅ SMS envoyé avec succès
```

→ **Tout va bien** ✅

---

## 📊 Interprétation des Codes d'Erreur

| Code | Statut | Signification | Action |
|------|--------|---------------|--------|
| **200** | `Success` | SMS envoyé | ✅ Aucune |
| **401** | `InvalidCredentials` | API Key incorrecte | 🔧 Vérifier config |
| **404** | `InvalidPhoneNumber` | Numéro invalide | 🔧 Corriger format |
| **405** | `InsufficientBalance` | **Plus de crédit** | 💰 **Recharger** |
| **407** | `FailedDelivery` | Échec livraison | 📱 Vérifier réseau |

---

## 💰 Recharge Rapide

### Montants Recommandés

| Budget | Crédit | SMS Estimés | Durée |
|--------|--------|-------------|-------|
| **Test** | $5 | ~5,000 | 1-2 semaines |
| **Production** | $20 | ~20,000 | 1-2 mois |
| **Longue durée** | $50 | ~50,000 | 3-6 mois |

### Méthodes de Paiement

1. **Carte bancaire** (Visa, Mastercard)
2. **Mobile Money** (M-Pesa, Airtel Money)
3. **Virement bancaire**
4. **PayPal**

**Lien direct** : https://account.africastalking.com/airtime/topup

---

## 🔔 Configurer les Alertes

**Pour ne plus être surpris** :

1. **Aller sur** : https://account.africastalking.com/settings
2. **Activer** : "Low Balance Alert"
3. **Seuil** : $5 USD
4. **Email** : Votre email de contact
5. **Sauvegarder**

**Résultat** : Vous recevrez un email quand le solde passe sous $5.

---

## 🧪 Test de Notification Sans SMS

Si vous ne pouvez pas recharger tout de suite, testez que FCM fonctionne :

### Test Côté Conducteur

1. Ouvrir l'app SmartCabb Conducteur
2. Passer **en ligne**
3. Laisser l'app **au premier plan**

### Test Côté Passager

1. Créer une course
2. Vérifier que le conducteur reçoit :
   - ✅ Popup de notification
   - ✅ Son de notification (3 beeps)
   - ✅ Message vocal

**Si ça fonctionne** → Le système est opérationnel ! 🎉

---

## 📞 Support Africa's Talking

Si problème avec la recharge :

- **Email** : support@africastalking.com
- **Téléphone** : +254 20 2606 691
- **Chat** : Sur le dashboard après connexion
- **Heures** : Lun-Ven 8h-17h (GMT+3)

---

## ✅ Action Immédiate

**Si vous voyez l'erreur `InsufficientBalance`** :

```bash
1. ✅ Vérifier que FCM fonctionne (test ci-dessus)
2. 💰 Se connecter à Africa's Talking
3. 💳 Recharger avec $20 minimum
4. 🔔 Configurer l'alerte de solde bas
5. ✅ Tester l'envoi d'un SMS
```

**Temps total** : ~5 minutes

---

## 📈 Monitoring Continue

Ajoutez cette commande à vos checks quotidiens :

```bash
# Voir les erreurs SMS des dernières 24h
supabase functions logs make-server-2eb02e52 --since 24h | grep "SMS"
```

Rechercher :
- ✅ `✅ SMS envoyé avec succès` → Tout va bien
- ⚠️ `InsufficientBalance` → Recharger
- ❌ `InvalidCredentials` → Vérifier config

---

**Aide complète** : Voir `/ALERTE_CREDIT_SMS.md`
