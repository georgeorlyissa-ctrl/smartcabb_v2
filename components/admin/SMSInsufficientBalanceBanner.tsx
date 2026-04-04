import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, ExternalLink, X } from '../../lib/admin-icons';

/**
 * Bannière d'alerte pour solde SMS insuffisant
 * Affichée en haut du dashboard admin
 */
export function SMSInsufficientBalanceBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Vérifier si l'utilisateur a déjà fermé la bannière (stocké en localStorage)
  useEffect(() => {
    const dismissed = localStorage.getItem('sms-insufficient-balance-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      // Réafficher la bannière après 24h
      if (now.getTime() - dismissedDate.getTime() > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('sms-insufficient-balance-dismissed');
      } else {
        setIsDismissed(true);
        setIsVisible(false);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('sms-insufficient-balance-dismissed', new Date().toISOString());
  };

  if (!isVisible || isDismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6"
    >
      <Card className="border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50 shadow-lg">
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            {/* Icône */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                ⚠️ Solde SMS insuffisant
              </h3>
              <p className="text-sm text-orange-800 mb-3">
                Votre compte <strong>Africa's Talking</strong> n'a plus de crédit SMS. 
                Les notifications par SMS (codes OTP, alertes de courses, etc.) ne peuvent plus être envoyées.
              </p>
              
              <div className="bg-white/50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-orange-900 font-semibold mb-2">
                  💡 Comment résoudre ce problème :
                </p>
                <ol className="text-xs text-orange-800 space-y-1 ml-4 list-decimal">
                  <li>Connectez-vous à votre compte Africa's Talking</li>
                  <li>Accédez à la section "Recharge" / "Top Up"</li>
                  <li>Ajoutez du crédit SMS (minimum recommandé: $10)</li>
                  <li>Attendez quelques minutes pour que le solde soit mis à jour</li>
                  <li>Rafraîchissez cette page pour vérifier</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => window.open('https://account.africastalking.com', '_blank')}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Recharger maintenant
                </Button>
                
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                >
                  Masquer pendant 24h
                </Button>
              </div>
            </div>

            {/* Bouton fermer */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-orange-400 hover:text-orange-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
