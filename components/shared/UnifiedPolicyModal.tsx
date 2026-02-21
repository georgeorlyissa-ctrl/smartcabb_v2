import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Shield, FileText, X } from '../../lib/icons';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import { memo } from 'react';

interface UnifiedPolicyModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  mode?: 'privacy' | 'terms' | 'both';
  userType?: 'passenger' | 'driver';
}

/**
 * Modal Unifiée pour Afficher les Politiques
 * Utilisée de manière identique pour passagers et conducteurs
 * Mode 'both' affiche les deux politiques (pour l'inscription)
 * Mode 'privacy' ou 'terms' affiche uniquement la politique demandée
 */
export const UnifiedPolicyModal = memo(function UnifiedPolicyModal({ 
  isOpen, 
  onAccept, 
  onClose,
  showCloseButton = false,
  mode = 'both',
  userType = 'passenger'
}: UnifiedPolicyModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (showCloseButton) {
      onAccept();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <Card className="bg-white flex-1 flex flex-col">
          <div className="p-6 flex-1 flex flex-col">
            {/* Header */}
            <div className="text-center mb-4">
              {showCloseButton && (
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="w-8 h-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {mode === 'terms' ? (
                  <FileText className="w-8 h-8 text-green-600" />
                ) : (
                  <Shield className="w-8 h-8 text-green-600" />
                )}
              </div>
              {mode === 'both' && (
                <>
                  <h2 className="text-xl mb-2">
                    Bienvenue sur SmartCabb
                  </h2>
                  <p className="text-sm text-gray-600">
                    {userType === 'driver' 
                      ? 'En tant que conducteur partenaire'
                      : 'En tant que passager'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Veuillez lire et accepter nos conditions et politique de confidentialité
                  </p>
                </>
              )}
              {mode === 'terms' && (
                <>
                  <h2 className="text-xl mb-2">
                    Conditions Générales d'Utilisation
                  </h2>
                  <p className="text-sm text-gray-600">
                    Identiques pour tous les utilisateurs SmartCabb
                  </p>
                </>
              )}
              {mode === 'privacy' && (
                <>
                  <h2 className="text-xl mb-2">
                    Politique de Confidentialité
                  </h2>
                  <p className="text-sm text-gray-600">
                    Protection de vos données personnelles
                  </p>
                </>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {mode === 'both' && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-blue-600" />
                      Conditions Générales d'Utilisation
                    </h3>
                    <TermsOfService />
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-green-600" />
                      Politique de Confidentialité
                    </h3>
                    <PrivacyPolicy />
                  </div>
                </div>
              )}
              {mode === 'terms' && <TermsOfService />}
              {mode === 'privacy' && <PrivacyPolicy />}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t space-y-3">
              {mode === 'both' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note importante :</strong> Ces conditions sont <strong>identiques</strong> pour 
                    les passagers et les conducteurs. Nous appliquons les mêmes règles de confidentialité 
                    et de protection des données pour tous nos utilisateurs.
                  </p>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                {onClose && (
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                )}
                <Button
                  onClick={onAccept}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {mode === 'both' ? "J'accepte les conditions" : 'Fermer'}
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                {mode === 'both' 
                  ? "En acceptant, vous confirmez avoir lu et compris ces documents"
                  : "Ces conditions s'appliquent à tous les utilisateurs SmartCabb"}
              </p>
            </div>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
});