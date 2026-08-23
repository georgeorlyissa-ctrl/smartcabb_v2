import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Shield, FileText } from '../../lib/icons';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import { memo } from 'react';

interface UnifiedPolicyModalProps {
  isOpen: boolean;
  onAccept?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  mode?: 'privacy' | 'terms' | 'both';
  userType?: 'passenger' | 'driver';
  readOnly?: boolean; // ✅ Nouveau prop pour mode lecture seule
}

/**
 * Modal Unifiée pour Afficher les Politiques
 * Utilisée de manière identique pour passagers et conducteurs
 * Mode 'both' affiche les deux politiques (pour l'inscription)
 * Mode 'privacy' ou 'terms' affiche uniquement la politique demandée
 * readOnly = true : Affiche uniquement les documents sans demander d'acceptation
 */
export const UnifiedPolicyModal = memo(function UnifiedPolicyModal({ 
  isOpen, 
  onAccept, 
  onClose,
  showCloseButton = false,
  mode = 'both',
  userType = 'passenger',
  readOnly = false
}: UnifiedPolicyModalProps) {
  if (!isOpen) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (showCloseButton && onAccept) {
      onAccept();
    }
  };
  
  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0 bg-white">
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 flex-shrink-0 text-center border-b bg-white">
            {!readOnly ? (
              <>
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  {mode === 'terms' ? (
                    <FileText className="w-8 h-8 text-green-600" />
                  ) : mode === 'privacy' ? (
                    <Shield className="w-8 h-8 text-green-600" />
                  ) : (
                    <Shield className="w-8 h-8 text-green-600" />
                  )}
                </div>
                {mode === 'both' && (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Bienvenue sur SmartCabb</h2>
                    <p className="text-sm text-gray-600">{userType === 'driver' ? 'En tant que conducteur partenaire' : 'En tant que passager'}</p>
                    <p className="text-xs text-gray-500 mt-1">Veuillez lire et accepter nos conditions et politique de confidentialité</p>
                  </>
                )}
                {mode === 'terms' && (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Conditions Générales d'Utilisation</h2>
                    <p className="text-sm text-gray-600">Identiques pour tous les utilisateurs SmartCabb</p>
                  </>
                )}
                {mode === 'privacy' && (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Politique de Confidentialité</h2>
                    <p className="text-sm text-gray-600">Protection de vos données personnelles</p>
                  </>
                )}
              </>
            ) : (
              <h2 className="text-lg font-bold text-gray-900">Conditions et confidentialité</h2>
            )}
          </div>

          {/* Content scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {mode === 'both' && (
              <>
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center text-gray-900">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Conditions Générales d'Utilisation
                  </h3>
                  <TermsOfService />
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center text-gray-900">
                    <Shield className="w-5 h-5 mr-2 text-green-600" />
                    Politique de Confidentialité
                  </h3>
                  <PrivacyPolicy />
                </div>
              </>
            )}
            {mode === 'terms' && <div className="bg-white border rounded-xl p-4"><TermsOfService /></div>}
            {mode === 'privacy' && <div className="bg-white border rounded-xl p-4"><PrivacyPolicy /></div>}
          </div>

          {/* Footer */}
          <div className="p-4 pt-4 border-t bg-white flex-shrink-0 space-y-3">
            {mode === 'both' && !readOnly && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900 leading-relaxed">
                  <strong>Note importante :</strong> Ces conditions sont <strong>identiques</strong> pour les passagers et les conducteurs.
                </p>
              </div>
            )}
            {readOnly ? (
              <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700 text-white">Fermer</Button>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {onClose && (
                    <Button onClick={onClose} variant="outline" className="flex-1">Annuler</Button>
                  )}
                  <Button onClick={handleAccept} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                    {mode === 'both' ? "J'accepte les conditions" : 'Fermer'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {mode === 'both' ? "En acceptant, vous confirmez avoir lu et compris ces documents" : "Ces conditions s'appliquent à tous les utilisateurs SmartCabb"}
                </p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
