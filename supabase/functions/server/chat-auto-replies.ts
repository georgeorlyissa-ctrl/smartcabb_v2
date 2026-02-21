// ============================================================
// SMARTCABB - RÉPONSES AUTOMATIQUES INTELLIGENTES
// ============================================================
// Système de détection d'intention et réponses contextuelles
// ============================================================

export interface AutoReplyRule {
  id: string;
  keywords: string[];
  priority: number; // Plus haut = plus prioritaire
  response: string;
  response_en?: string; // ✅ Traduction anglaise optionnelle
  category: string;
  followUpSuggestions?: string[];
  followUpSuggestions_en?: string[]; // ✅ Traduction anglaise des suggestions
}

// ============================================================
// BASE DE RÈGLES DE RÉPONSES AUTOMATIQUES
// ============================================================

export const autoReplyRules: AutoReplyRule[] = [
  // ========== URGENCE / IMMÉDIAT ==========
  {
    id: 'urgent',
    keywords: ['urgent', 'urgence', 'vite', 'rapide', 'maintenant', 'immédiat', 'pressé', 'emergency', 'quick', 'now', 'asap', 'fast', 'hurry'],
    priority: 100,
    category: 'urgence',
    response: `🚨 BESOIN URGENT DE TRANSPORT ?

📞 Appelez immédiatement :
+243 990 666 661

Ou téléchargez l'app SmartCabb pour réserver en 30 secondes :
📱 Android : play.google.com/store/apps/smartcabb
📱 iOS : apps.apple.com/smartcabb

Un chauffeur sera chez vous en quelques minutes ! ⚡`,
    response_en: `🚨 URGENT TRANSPORT NEEDED?

📞 Call immediately:
+243 990 666 661

Or download the SmartCabb app to book in 30 seconds:
📱 Android: play.google.com/store/apps/smartcabb
📱 iOS: apps.apple.com/smartcabb

A driver will be with you in minutes! ⚡`,
    followUpSuggestions: [
      'Voir les tarifs',
      'Comment payer ?',
      'Zones couvertes'
    ],
    followUpSuggestions_en: [
      'View pricing',
      'How to pay?',
      'Coverage areas'
    ]
  },

  // ========== PRIX / TARIFS ==========
  {
    id: 'prix-general',
    keywords: ['prix', 'tarif', 'coût', 'coute', 'combien', 'cher', 'montant', 'frais', 'price', 'pricing', 'cost', 'how much', 'fare', 'rate'],
    priority: 90,
    category: 'tarifs',
    response: `💰 GRILLE TARIFAIRE SMARTCABB 2025

Nous avons 4 catégories de véhicules :

🚗 SmartCabb Standard (3 places)
   Jour (06h-20h59) : 7$/h = 19 600 FC/h
   Nuit (21h-05h59) : 10$/h = 28 000 FC/h
   Location journalière : 60$ = 168 000 FC
   Airport: $70 (A/R) | $35 (simple)

🚙 SmartCabb Confort (3 places, Data gratuit)
   Jour (06h-20h59) : 15$/h = 42 000 FC/h
   Nuit (21h-05h59) : 17$/h = 47 600 FC/h
   Location journalière : 80$ = 224 000 FC
   Airport: $90 (A/R) | $50 (simple)

✨ SmartCabb Plus (4 places, Data gratuit)
   Jour (06h-20h59) : 15$/h = 42 000 FC/h
   Nuit (21h-05h59) : 20$/h = 56 000 FC/h
   Location : 100$/jour | 280 000 FC/jour
   Airport: $110 (A/R) | $60 (simple)

👑 SmartCabb Business (4 places, Rafraîchissement, Data gratuit)
   Location journalière uniquement : 160$ = 448 000 FC
   Airport: $200 (A/R) | $100 (simple)
   Heures supplémentaires (après 21h) : 30$/h

⚠️ Zone lointaine : doublement 1ère heure
📱 Téléchargez l'app pour réserver !`,
    response_en: `💰 SMARTCABB PRICING GRID 2025

We have 4 vehicle categories:

🚗 SmartCabb STANDARD (3 seats, AC)
   • Hourly: $7/h (day 06h-20h59) | $10/h (night 21h-05h59)
   • Daily rental: $60/day (07h-21h)
   • Airport: $35 (one way) | $70 (round trip)
   Vehicles: Toyota IST, Vitz, Swift, Blade, Ractis, Runx

🚙 SmartCabb CONFORT (3 seats, AC, Free Data)
   • Hourly: $15/h (day) | $17/h (night)
   • Daily rental: $80/day
   • Airport: $50 (OW) | $90 (RT)
   Vehicles: Toyota Marx, Crown, Mercedes C-Class, Harrier, Vanguard, Nissan Juke

🚐 SmartCabb PLUS (7 seats, AC, Free Data)
   • Hourly: $15/h (day) | $20/h (night)
   • Daily rental: $100/day
   • Airport: $60 (OW) | $110 (RT)
   Night: 6,500 FC base + 1,300 FC/km

👨‍👩‍👧‍👦 Smart Familial (4 seats)
   Day: 6,500 FC base + 1,300 FC/km
   Night: 8,000 FC base + 1,600 FC/km

💎 Smart VIP (Luxury)
   Day: 10,000 FC base + 2,000 FC/km
   Night: 13,000 FC base + 2,600 FC/km

📱 Download the app to calculate your exact trip price!`,
    followUpSuggestions: [
      'Comment réserver ?',
      'Modes de paiement',
      'Zones couvertes'
    ],
    followUpSuggestions_en: [
      'How to book?',
      'Payment methods',
      'Coverage areas'
    ]
  },

  {
    id: 'prix-aeroport',
    keywords: ['aéroport', 'aeroport', 'ndjili', 'vol', 'avion'],
    priority: 95,
    category: 'tarifs',
    response: `✈️ TARIFS VERS L'AÉROPORT NDJILI

Depuis le centre-ville de Kinshasa :

🚗 Smart Flex : ~15 000 - 20 000 FC
🚙 Smart Confort : ~25 000 - 30 000 FC
🚐 Smart Plus : ~35 000 - 45 000 FC
👨‍👩‍👧‍👦 Smart Familial : ~45 000 - 55 000 FC
💎 Smart VIP : ~70 000 - 90 000 FC

Le prix exact dépend de :
- Votre adresse de départ
- L'heure (jour/nuit)
- Le trafic

📱 Calculez le prix exact dans l'app SmartCabb !
📞 Ou appelez : +243 990 666 661`,
    followUpSuggestions: [
      'Réserver maintenant',
      'Paiement à bord',
      'Temps de trajet'
    ]
  },

  // ========== RÉSERVATION ==========
  {
    id: 'reservation',
    keywords: ['réserver', 'reserver', 'réservation', 'reservation', 'commander', 'prendre', 'demander'],
    priority: 85,
    category: 'reservation',
    response: `📱 COMMENT RÉSERVER VOTRE COURSE ?

3 façons simples :

1️⃣ APPLICATION MOBILE (Recommandé)
   📥 Android : play.google.com/store/apps/smartcabb
   📥 iOS : apps.apple.com/smartcabb
   ⏱️ Réservation en 30 secondes !

2️⃣ TÉLÉPHONE
   📞 Appelez : +243 990 666 661
   🕐 Disponible 24h/24, 7j/7

3️⃣ WHATSAPP
   💬 +243 990 666 661
   📝 Envoyez : Adresse départ + Destination + Heure

✅ Confirmation immédiate
✅ Chauffeur attribué en temps réel
✅ Suivi GPS de votre course`,
    followUpSuggestions: [
      'Voir les tarifs',
      'Moyens de paiement',
      'Annuler une course'
    ]
  },

  {
    id: 'annulation',
    keywords: ['annuler', 'annulation', 'cancel', 'modifier'],
    priority: 80,
    category: 'reservation',
    response: `🔄 ANNULATION / MODIFICATION DE COURSE

📱 DEPUIS L'APPLICATION :
   • Ouvrez "Mes courses"
   • Cliquez sur la course active
   • Bouton "Annuler" ou "Modifier"

📞 PAR TÉLÉPHONE :
   • Appelez : +243 990 666 661
   • Donnez votre numéro de course

⚠️ FRAIS D'ANNULATION :
   ✅ Gratuit : Si annulé 5+ minutes avant
   💰 50% du prix : Si chauffeur déjà en route
   💰 100% : Si chauffeur est arrivé

💡 Astuce : Modifiez plutôt qu'annuler !`,
    followUpSuggestions: [
      'Comment réserver ?',
      'Contacter support',
      'Voir mes courses'
    ]
  },

  // ========== PAIEMENT ==========
  {
    id: 'paiement',
    keywords: ['paiement', 'payer', 'carte', 'espèce', 'mobile money', 'airtel', 'vodacom', 'orange', 'mpesa'],
    priority: 85,
    category: 'paiement',
    response: `💳 MOYENS DE PAIEMENT ACCEPTÉS

Nous acceptons tous les modes de paiement :

1️⃣ MOBILE MONEY (Recommandé)
   📱 Airtel Money
   📱 Vodacom M-Pesa
   📱 Orange Money
   ✅ Paiement sécurisé dans l'app

2️⃣ ESPÈCES
   💵 Francs Congolais (CDF)
   💵 Dollars Américains (USD)
   ✅ Paiement au chauffeur

3️⃣ CARTE BANCAIRE (Bientôt)
   💳 Visa / Mastercard
   🔒 Paiement sécurisé par Flutterwave

4️⃣ COMPTE SMARTCABB
   💰 Rechargez votre wallet
   ⚡ Paiement instantané

🎁 BONUS : +5% de crédit sur recharges de 50 000 FC+`,
    followUpSuggestions: [
      'Recharger mon compte',
      'Voir les tarifs',
      'Problème de paiement'
    ]
  },

  // ========== SÉCURITÉ ==========
  {
    id: 'securite',
    keywords: ['sécurité', 'securite', 'sûr', 'sur', 'fiable', 'confiance', 'danger', 'risque'],
    priority: 90,
    category: 'securite',
    response: `🛡️ VOTRE SÉCURITÉ, NOTRE PRIORITÉ

Chez SmartCabb, vous êtes en sécurité :

✅ CHAUFFEURS VÉRIFIÉS
   • Casier judiciaire contrôlé
   • Permis de conduire validé
   • Formation obligatoire
   • Notation par les passagers

✅ SUIVI GPS EN TEMPS RÉEL
   • Vous pouvez partager votre trajet
   • Votre famille suit votre course
   • Enregistrement de tous les trajets

✅ ASSISTANCE 24/7
   • Bouton SOS dans l'app
   • Équipe disponible jour et nuit
   • Intervention rapide si problème

✅ VÉHICULES ASSURÉS
   • Assurance tous risques
   • Contrôle technique à jour
   • Entretien régulier

📞 Urgence : +243 990 666 661`,
    followUpSuggestions: [
      'Comment noter un chauffeur ?',
      'Signaler un problème',
      'Partager mon trajet'
    ]
  },

  // ========== DEVENIR CHAUFFEUR ==========
  {
    id: 'devenir-chauffeur',
    keywords: ['chauffeur', 'conducteur', 'devenir', 'rejoindre', 'travailler', 'emploi', 'job', 'partenaire'],
    priority: 85,
    category: 'chauffeur',
    response: `🚗 DEVENEZ CHAUFFEUR SMARTCABB

💰 GAGNEZ JUSQU'À 500 000 FC/MOIS

CONDITIONS REQUISES :
✅ Permis de conduire valide (2+ ans)
✅ Voiture en bon état (2010+)
✅ Casier judiciaire vierge
✅ Âge : 21-60 ans
✅ Smartphone Android/iOS

AVANTAGES :
💸 Commissions attractives (80% pour vous)
📱 Application chauffeur gratuite
🎓 Formation offerte
🛡️ Assurance incluse
📊 Suivi de vos gains en temps réel

INSCRIPTION :
1️⃣ Visitez : https://chief-mess-97839970.figma.site/drivers
2️⃣ Remplissez le formulaire
3️⃣ Validation en 24-48h
4️⃣ Formation (1 jour)
5️⃣ Commencez à gagner !

📞 Questions ? Appelez : +243 990 666 661`,
    followUpSuggestions: [
      'Documents nécessaires',
      'Commission chauffeur',
      'Planning flexible ?'
    ]
  },

  // ========== HORAIRES / DISPONIBILITÉ ==========
  {
    id: 'horaires',
    keywords: ['horaire', 'heure', 'disponible', 'ouvert', 'ferme', '24h', 'nuit', 'dimanche'],
    priority: 80,
    category: 'horaires',
    response: `🕐 HORAIRES DE SERVICE

SmartCabb est disponible :

🌍 24 HEURES SUR 24
⏰ 7 JOURS SUR 7
📅 Tous les jours de l'année
🎄 Même les jours fériés !

TARIFS SELON L'HEURE :

☀️ JOUR (6h00 - 20h59)
   💰 Tarifs normaux

🌙 NUIT (21h00 - 5h59)
   💰 Tarifs majorés (+20%)
   🛡️ Sécurité renforcée
   ⚡ Disponibilité garantie

📱 Réservez à l'avance ou en temps réel !`,
    followUpSuggestions: [
      'Réserver pour ce soir',
      'Tarifs de nuit',
      'Zones couvertes'
    ]
  },

  // ========== ZONES / LOCALISATION ==========
  {
    id: 'zones',
    keywords: ['zone', 'commune', 'quartier', 'gombe', 'limete', 'matete', 'kinshasa', 'ndjili', 'masina'],
    priority: 75,
    category: 'zones',
    response: `📍 ZONES COUVERTES À KINSHASA

SmartCabb dessert TOUTE la ville de Kinshasa :

✅ COMMUNES CENTRALES
   • Gombe, Kinshasa, Barumbu
   • Lingwala, Kintambo, Ngaliema

✅ COMMUNES EST
   • Limete, Masina, Ndjili
   • Kimbanseke, Nsele

✅ COMMUNES SUD
   • Kalamu, Makala, Selembao
   • Bumbu, Ngiri-Ngiri, Kasa-Vubu

✅ COMMUNES OUEST
   • Lemba, Matete, Mont-Ngafula
   • Ngaba, Kisenso

✅ AÉROPORT NDJILI

💡 Même les zones éloignées sont desservies !
📱 Vérifiez la disponibilité dans l'app`,
    followUpSuggestions: [
      'Réserver maintenant',
      'Voir les tarifs',
      'Temps d\'attente moyen'
    ]
  },

  // ========== APPLICATION ==========
  {
    id: 'application',
    keywords: ['app', 'application', 'télécharger', 'telecharger', 'installer', 'android', 'ios', 'iphone', 'playstore'],
    priority: 85,
    category: 'app',
    response: `📱 TÉLÉCHARGEZ L'APPLICATION SMARTCABB

Réservez en 30 secondes depuis votre smartphone !

📥 ANDROID
   Google Play Store
   🔗 play.google.com/store/apps/smartcabb
   ⚙️ Requis : Android 6.0+

📥 iOS (iPhone/iPad)
   Apple App Store
   🔗 apps.apple.com/smartcabb
   ⚙️ Requis : iOS 12.0+

✨ FONCTIONNALITÉS :
   ✅ Réservation en temps réel
   ✅ Suivi GPS de votre course
   ✅ Estimation de prix instantanée
   ✅ Historique de vos trajets
   ✅ Partage de trajet avec proches
   ✅ Paiement Mobile Money intégré
   ✅ Notation des chauffeurs
   ✅ Support chat 24/7

🎁 BONUS : -20% sur votre 1ère course !
Code promo : BIENVENUE20`,
    followUpSuggestions: [
      'Créer un compte',
      'Code promo',
      'Problème d\'installation'
    ]
  },

  // ========== CONTACT / SUPPORT ==========
  {
    id: 'contact',
    keywords: ['contact', 'contacter', 'joindre', 'appeler', 'email', 'aide', 'support', 'assistance'],
    priority: 70,
    category: 'contact',
    response: `📞 NOUS CONTACTER

Notre équipe est disponible 24/7 :

📱 TÉLÉPHONE / WHATSAPP
   +243 990 666 661
   🕐 Disponible jour et nuit

📧 EMAIL
   support@smartcabb.cd
   ⏱️ Réponse sous 24h

💬 CHAT EN DIRECT
   Ici même sur le site web !
   ⚡ Réponse immédiate

🏢 BUREAU
   Avenue Colonel Tshatshi, Kinshasa
   📍 Gombe, face à l'Hôtel Memling
   🕐 Lundi-Vendredi : 8h-17h

📱 RÉSEAUX SOCIAUX
   Facebook : @SmartCabbRDC
   Instagram : @smartcabb_official
   Twitter : @SmartCabb

Nous sommes là pour vous aider ! 😊`,
    followUpSuggestions: [
      'Signaler un problème',
      'Réclamation',
      'Suggestion'
    ]
  },

  // ========== PROBLÈME / RÉCLAMATION ==========
  {
    id: 'probleme',
    keywords: ['problème', 'probleme', 'bug', 'erreur', 'marche pas', 'fonctionne pas', 'réclamation', 'plainte'],
    priority: 95,
    category: 'support',
    response: `⚠️ SIGNALER UN PROBLÈME

Nous sommes désolés pour ce désagrément !

🔴 PROBLÈME URGENT ?
   📞 Appelez immédiatement : +243 990 666 661
   💬 Ou utilisez ce chat pour nous expliquer

📝 POUR TOUTE RÉCLAMATION :
1. Décrivez le problème
2. Donnez le numéro de course (si applicable)
3. Joignez une capture d'écran si possible

⚡ DÉLAI DE TRAITEMENT :
   • Urgence : Réponse immédiate
   • Réclamation : 24-48h
   • Remboursement : 3-5 jours

📧 Email : support@smartcabb.cd

Nous prenons chaque réclamation au sérieux et ferons tout pour résoudre votre problème rapidement ! 🙏`,
    followUpSuggestions: [
      'Parler à un humain',
      'Demander remboursement',
      'Suivre ma réclamation'
    ]
  },

  // ========== PROMO / RÉDUCTION ==========
  {
    id: 'promo',
    keywords: ['promo', 'promotion', 'code', 'réduction', 'reduction', 'rabais', 'offre', 'gratuit', 'cadeau'],
    priority: 80,
    category: 'promo',
    response: `🎁 PROMOTIONS EN COURS

OFFRES ACTIVES ACTUELLEMENT :

🎉 NOUVEAUX CLIENTS
   Code : BIENVENUE20
   💰 -20% sur les 3 premières courses
   📅 Valide : 30 jours après inscription

💎 RECHARGE BONUS
   Rechargez 50 000 FC → Recevez 52 500 FC (+5%)
   Rechargez 100 000 FC → Recevez 107 000 FC (+7%)
   Rechargez 200 000 FC → Recevez 220 000 FC (+10%)

👥 PARRAINAGE
   Parrainez un ami → 5 000 FC de crédit
   Votre ami reçoit → 5 000 FC de crédit
   ♾️ Illimité !

🌙 HAPPY HOURS (Lundi-Jeudi 14h-16h)
   💰 -15% sur toutes les courses

Comment utiliser un code promo ?
1️⃣ Ouvrez l'app SmartCabb
2️⃣ Menu → "Codes promo"
3️⃣ Entrez le code
4️⃣ Réduction appliquée automatiquement !`,
    followUpSuggestions: [
      'Mon code promo',
      'Parrainer un ami',
      'Recharger mon compte'
    ]
  },

  // ========== DÉFAUT / GÉNÉRAL ==========
  {
    id: 'default',
    keywords: ['bonjour', 'salut', 'coucou', 'hey', 'hello', 'bonsoir'],
    priority: 10,
    category: 'general',
    response: `👋 Bonjour ! Bienvenue chez SmartCabb !

Je suis votre assistant virtuel. Comment puis-je vous aider ?

Voici ce que je peux faire pour vous :

💰 Voir les tarifs et prix
🚗 Réserver une course
📱 Télécharger l'application
🛡️ Information sur la sécurité
💳 Moyens de paiement
🚕 Devenir chauffeur partenaire
📞 Vous mettre en contact avec notre équipe

📞 Pour une réservation immédiate : +243 990 666 661

Posez-moi votre question ! 😊`,
    followUpSuggestions: [
      'Voir les tarifs',
      'Réserver une course',
      'Télécharger l\'app'
    ]
  }
];

// ============================================================
// FONCTION DE DÉTECTION D'INTENTION
// ============================================================

export function detectIntent(message: string): AutoReplyRule | null {
  const messageLower = message.toLowerCase();
  
  // Normaliser le texte (enlever accents, caractères spéciaux)
  const normalizedMessage = messageLower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever accents
    .replace(/[^\w\s]/g, ' '); // Remplacer ponctuation par espaces
  
  let matchedRules: { rule: AutoReplyRule; score: number }[] = [];

  // Parcourir toutes les règles
  for (const rule of autoReplyRules) {
    let score = 0;
    
    for (const keyword of rule.keywords) {
      const normalizedKeyword = keyword
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      
      // Vérifier si le mot-clé est présent
      if (normalizedMessage.includes(normalizedKeyword)) {
        // Bonus si mot-clé au début
        if (normalizedMessage.startsWith(normalizedKeyword)) {
          score += 3;
        } else {
          score += 1;
        }
      }
      
      // Bonus pour correspondance exacte de mot
      const words = normalizedMessage.split(/\s+/);
      if (words.includes(normalizedKeyword)) {
        score += 2;
      }
    }
    
    if (score > 0) {
      // Ajouter le score de priorité
      score += rule.priority / 10;
      matchedRules.push({ rule, score });
    }
  }

  // Si aucune règle ne correspond, utiliser la règle par défaut
  if (matchedRules.length === 0) {
    const defaultRule = autoReplyRules.find(r => r.id === 'default');
    return defaultRule || null;
  }

  // Trier par score décroissant
  matchedRules.sort((a, b) => b.score - a.score);

  // Retourner la règle avec le meilleur score
  return matchedRules[0].rule;
}

// ============================================================
// FONCTION DE GÉNÉRATION DE RÉPONSE AUTOMATIQUE
// ============================================================

export function generateAutoReply(message: string, language: 'fr' | 'en' = 'fr'): {
  reply: string;
  category: string;
  suggestions: string[];
  confidence: number;
} {
  const rule = detectIntent(message);
  
  if (!rule) {
    const defaultReply = language === 'en' 
      ? `Thank you for your message! Our SmartCabb team will get back to you as soon as possible. For immediate assistance, call +243 990 666 661.`
      : `Merci pour votre message ! Notre équipe SmartCabb vous répondra dans les plus brefs délais. Pour une assistance immédiate, appelez le +243 990 666 661.`;
    
    return {
      reply: defaultReply,
      category: 'general',
      suggestions: [],
      confidence: 0
    };
  }

  // Choisir la bonne langue pour la réponse
  let reply = rule.response;
  let suggestions = rule.followUpSuggestions || [];
  
  // Si la langue est anglaise, chercher la traduction
  if (language === 'en') {
    const englishTranslation = getEnglishReply(rule.id);
    if (englishTranslation) {
      reply = englishTranslation.response;
      suggestions = englishTranslation.suggestions;
    } else if (rule.response_en) {
      // Fallback sur response_en si disponible
      reply = rule.response_en;
      suggestions = rule.followUpSuggestions_en || suggestions;
    }
  }

  return {
    reply,
    category: rule.category,
    suggestions,
    confidence: rule.priority / 100
  };
}

// ============================================================
// FONCTION D'ANALYSE DE SENTIMENT (BONUS)
// ============================================================

export function analyzeSentiment(message: string): 'positive' | 'negative' | 'neutral' {
  const messageLower = message.toLowerCase();
  
  const positiveWords = ['merci', 'super', 'génial', 'excellent', 'parfait', 'top', 'bien', 'bon', 'bravo'];
  const negativeWords = ['problème', 'bug', 'nul', 'mauvais', 'déçu', 'mécontent', 'arnaque', 'lent'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of positiveWords) {
    if (messageLower.includes(word)) positiveCount++;
  }
  
  for (const word of negativeWords) {
    if (messageLower.includes(word)) negativeCount++;
  }
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// ============================================================
// IMPORT ENGLISH TRANSLATIONS
// ============================================================

import { getEnglishReply } from './chat-auto-replies-en.tsx';

// ============================================================
// EXPORT
// ============================================================

export default {
  autoReplyRules,
  detectIntent,
  generateAutoReply,
  analyzeSentiment
};