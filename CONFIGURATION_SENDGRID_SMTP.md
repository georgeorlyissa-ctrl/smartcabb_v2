# 📧 Configuration SendGrid SMTP pour Supabase - SmartCabb

## 🎯 OBJECTIF

Configurer un fournisseur SMTP personnalisé (SendGrid) pour Supabase afin de :
- ✅ Contrôler entièrement l'envoi des emails
- ✅ Améliorer la délivrabilité
- ✅ Éviter les restrictions Supabase liées aux emails bounced
- ✅ Obtenir des statistiques détaillées sur l'envoi

## 📋 PRÉREQUIS

- ✅ Compte SendGrid (gratuit jusqu'à 100 emails/jour)
- ✅ Clé API SendGrid (déjà configurée : `SENDGRID_API_KEY`)
- ✅ Accès au Dashboard Supabase
- ✅ Domaine vérifié (optionnel mais recommandé)

## 🚀 ÉTAPES DE CONFIGURATION

### Étape 1 : Créer une clé API SendGrid

1. Se connecter à [SendGrid Dashboard](https://app.sendgrid.com/)
2. Aller dans **Settings** > **API Keys**
3. Cliquer sur **Create API Key**
4. Nom : `SmartCabb-Supabase-Auth`
5. Permissions : **Full Access** (ou au minimum "Mail Send")
6. Copier la clé API (vous ne pourrez plus la voir après)

**Note** : La clé est déjà configurée dans les secrets Supabase : `SENDGRID_API_KEY`

### Étape 2 : Vérifier votre expéditeur dans SendGrid

1. Dans SendGrid Dashboard, aller dans **Settings** > **Sender Authentication**
2. Cliquer sur **Verify a Single Sender**
3. Remplir le formulaire :
   - **From Name** : SmartCabb
   - **From Email Address** : noreply@smartcabb.com
   - **Reply To** : support@smartcabb.com
   - **Company Address** : Adresse de votre entreprise en RDC
4. Vérifier l'email de confirmation envoyé
5. ✅ L'adresse est maintenant vérifiée

**Alternative** : Vérifier tout le domaine `smartcabb.com` (recommandé pour la production)

### Étape 3 : Configurer SMTP dans Supabase

1. Se connecter au [Dashboard Supabase](https://supabase.com/dashboard/project/zaerjqchzqmcxqblkfkg)

2. Aller dans **Authentication** > **Email** > **SMTP Settings**

3. Activer **Enable Custom SMTP**

4. Remplir les champs :

   ```
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP Username: apikey
   SMTP Password: [Votre clé API SendGrid]
   Sender Email: noreply@smartcabb.com
   Sender Name: SmartCabb
   ```

5. ⚠️ **IMPORTANT** : Le username est TOUJOURS `apikey` (littéralement le mot "apikey")

6. Cliquer sur **Save**

### Étape 4 : Tester la configuration

#### Test 1 : Email de test Supabase

1. Dans **SMTP Settings**, cliquer sur **Send Test Email**
2. Entrer votre adresse email personnelle
3. Vérifier que l'email arrive bien

#### Test 2 : Inscription d'un utilisateur de test

1. Créer un compte avec un email réel (ex: votre email personnel)
2. Vérifier les logs Supabase pour confirmer l'envoi
3. Vérifier l'email de confirmation

#### Test 3 : Réinitialisation de mot de passe

1. Utiliser la fonction "Mot de passe oublié"
2. Vérifier que l'email arrive bien

### Étape 5 : Configurer les templates d'email (Optionnel)

Supabase vous permet de personnaliser les templates d'emails :

1. Dans **Authentication** > **Email Templates**
2. Personnaliser :
   - **Confirm signup** : Email de confirmation d'inscription
   - **Invite user** : Email d'invitation
   - **Magic Link** : Email de connexion magique
   - **Reset password** : Email de réinitialisation
   - **Change Email** : Email de changement d'adresse

Exemple de personnalisation :

```html
<h2>Bienvenue sur SmartCabb !</h2>
<p>Merci de vous être inscrit. Confirmez votre email en cliquant sur le lien ci-dessous :</p>
<p><a href="{{ .ConfirmationURL }}">Confirmer mon email</a></p>
<p>Ou copiez-collez ce lien dans votre navigateur :</p>
<p>{{ .ConfirmationURL }}</p>
<p>Cordialement,<br>L'équipe SmartCabb</p>
```

## 🔍 VÉRIFICATION ET MONITORING

### Vérifier que SMTP fonctionne

1. Aller dans SendGrid Dashboard > **Activity**
2. Vérifier que les emails apparaissent dans l'activité
3. Vérifier le statut : **Delivered**, **Opened**, **Clicked**, etc.

### Surveiller les métriques

SendGrid fournit des métriques détaillées :
- **Delivered** : Emails délivrés avec succès
- **Bounced** : Emails rejetés (hard/soft bounce)
- **Opened** : Emails ouverts par les destinataires
- **Clicked** : Liens cliqués dans les emails
- **Spam Reports** : Emails marqués comme spam

### Alertes à surveiller

Si vous voyez un taux élevé de :
- **Hard Bounces** : Adresses email invalides → Améliorer la validation
- **Soft Bounces** : Problèmes temporaires → Attendre quelques heures
- **Spam Reports** : Emails marqués comme spam → Revoir le contenu

## 🛡️ BONNES PRATIQUES

### 1. Validation des emails en amont

✅ **Déjà implémenté** : Validation stricte dans `/supabase/functions/server/index.tsx`

```typescript
// Ne jamais envoyer d'emails aux adresses @smartcabb.app
if (email.includes('@smartcabb.app')) {
  // Utiliser SMS à la place
}
```

### 2. Ne jamais envoyer aux emails internes

Les emails `@smartcabb.app` sont **internes uniquement** :
- Ce sont des placeholders pour les utilisateurs qui s'inscrivent par téléphone
- Ils ne doivent JAMAIS recevoir d'emails
- Utiliser SMS (Africa's Talking) pour ces utilisateurs

### 3. Limites SendGrid (Plan gratuit)

- **100 emails/jour** : Suffisant pour les tests
- **40,000 emails/mois** : Plan Essentials à $19.95/mois
- **100,000 emails/mois** : Plan Pro à $89.95/mois

### 4. Éviter le spam

- Toujours inclure un lien de désinscription
- Ne pas envoyer trop d'emails à la même personne
- Utiliser des templates clairs et professionnels

### 5. Tester régulièrement

- Tester avec différents fournisseurs (Gmail, Outlook, Yahoo)
- Vérifier que les emails n'arrivent pas dans les spams
- Utiliser [Mail Tester](https://www.mail-tester.com/) pour vérifier la qualité

## 🔧 TROUBLESHOOTING

### Problème : "SMTP connection failed"

**Solutions** :
1. Vérifier que le port est bien `587` (pas 465 ou 25)
2. Vérifier que le username est `apikey`
3. Vérifier que la clé API est correcte
4. Vérifier que la clé API a les bonnes permissions (Mail Send)

### Problème : "Sender not verified"

**Solutions** :
1. Vérifier l'expéditeur dans SendGrid (Single Sender Verification)
2. OU Vérifier tout le domaine (Domain Authentication)
3. Attendre quelques minutes après la vérification

### Problème : Emails arrivent en spam

**Solutions** :
1. Configurer SPF, DKIM et DMARC pour votre domaine
2. Vérifier le contenu des emails (éviter les mots "spam")
3. Utiliser Domain Authentication dans SendGrid
4. Tester avec [Mail Tester](https://www.mail-tester.com/)

### Problème : Taux de bounce élevé

**Solutions** :
1. ✅ Validation stricte implémentée
2. Nettoyer la base de données des emails invalides
3. Ne jamais envoyer aux @smartcabb.app
4. Vérifier les emails avant inscription

## 📊 SUIVI POST-CONFIGURATION

### Jour 1-3 : Surveillance intensive

- Vérifier tous les emails dans SendGrid Activity
- Confirmer que les bounces diminuent
- Tester tous les flux d'emails (inscription, reset password, etc.)

### Semaine 1 : Monitoring régulier

- Vérifier les métriques SendGrid quotidiennement
- Ajuster les templates si nécessaire
- Confirmer que Supabase n'envoie plus d'alertes

### Mois 1 : Optimisation

- Analyser les taux d'ouverture
- Améliorer les templates
- Considérer le plan payant si besoin (>100 emails/jour)

## 📞 SUPPORT

### Supabase Support
- Email : support@supabase.com
- Discord : https://discord.supabase.com/

### SendGrid Support
- Docs : https://docs.sendgrid.com/
- Support : https://support.sendgrid.com/

## ✅ CHECKLIST FINALE

Avant de considérer la configuration terminée :

- [ ] Clé API SendGrid créée et copiée
- [ ] Expéditeur vérifié dans SendGrid (noreply@smartcabb.com)
- [ ] SMTP configuré dans Supabase Dashboard
- [ ] Email de test Supabase envoyé et reçu
- [ ] Inscription test réussie avec email réel
- [ ] Réinitialisation mot de passe testée
- [ ] Templates personnalisés (optionnel)
- [ ] Monitoring SendGrid Activity configuré
- [ ] Documentation lue et comprise

---

**Date de création** : 5 février 2026  
**Auteur** : George Orlyissa  
**Projet** : SmartCabb  
**Statut** : ⚠️ À CONFIGURER IMMÉDIATEMENT
