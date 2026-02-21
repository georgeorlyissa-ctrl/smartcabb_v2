# 📧 Organisation des Emails SmartCabb

## 📬 Adresses Email Vérifiées dans SendGrid

Toutes les adresses ci-dessous sont vérifiées et peuvent envoyer/recevoir des emails :

| Adresse | Statut | Rôle | Usage Principal |
|---------|--------|------|-----------------|
| **contact@smartcabb.com** | ✅ VERIFIED | **Email expéditeur principal** | Emails transactionnels automatiques (confirmations de réservation, factures, codes de vérification, notifications) |
| **info@smartcabb.com** | ✅ VERIFIED | **Assistance générale** | Questions administratives, demandes d'information, partenariats, communication institutionnelle |
| **support@smartcabb.com** | ✅ VERIFIED | **Support technique** | Problèmes techniques, bugs, aide à l'utilisation, assistance clients/conducteurs |
| **ftshimpi@smartcabb.com** | ✅ VERIFIED | **Employé** | Communications internes, emails de la part de l'équipe SmartCabb |
| **norely@smartcabb.com** | ✅ VERIFIED | **À définir** | Utilisation flexible selon les besoins |

---

## 🎯 Recommandations d'Usage

### 🤖 Emails Automatiques (via SendGrid API)
- **Expéditeur** : `contact@smartcabb.com`
- **Reply-To** : `support@smartcabb.com` (pour les emails de support) ou `info@smartcabb.com` (pour les emails généraux)
- **Exemples** :
  - Confirmation de réservation → From: contact@, Reply-To: support@
  - Facture de course → From: contact@, Reply-To: support@
  - Code de vérification → From: contact@, Reply-To: support@
  - Newsletter marketing → From: contact@, Reply-To: info@

### 📨 Emails Manuels (via Webmail Namecheap)
- **info@smartcabb.com** → Correspondance générale, partenariats
- **support@smartcabb.com** → Réponses aux tickets de support
- **ftshimpi@smartcabb.com** → Communications de l'employé

---

## 🔧 Configuration Technique

### SendGrid
- **API Key** : Stockée dans `SENDGRID_API_KEY` (variable d'environnement)
- **Limite gratuite** : 100 emails par jour
- **Sender Authentication** : Domain Authentication configuré pour `smartcabb.com`

### Namecheap PrivateEmail
- **Provider** : Namecheap PrivateEmail
- **Serveur IMAP** : `mail.privateemail.com` (Port 993, SSL)
- **Serveur SMTP** : `mail.privateemail.com` (Port 465, SSL)
- **Webmail** : [https://privateemail.com](https://privateemail.com)

---

## 📊 Historique & Logs
- Tous les emails envoyés via SendGrid sont enregistrés dans le **KV Store** sous `system:email_logs`
- Accessible depuis le panel admin dans **"Historique des emails"**
- Contient : destinataire, sujet, statut, date d'envoi, provider utilisé

---

## 🚀 Tests
- **Test rapide SendGrid** : Disponible dans `/admin` → Paramètres Email → Carte "Test Rapide SendGrid"
- Envoie un email HTML formaté avec toutes les infos de configuration
- Utilise automatiquement la clé API de l'environnement

---

**Dernière mise à jour** : 11 décembre 2024
**Contact technique** : ftshimpi@smartcabb.com
