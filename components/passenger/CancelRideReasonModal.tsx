import { useState, useEffect } from 'react'; // ✅ FIX: Ajout useEffect
import { motion } from '../../lib/motion'; // ✅ FIX: Ajout motion
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea'; // ✅ FIX: Ajout Textarea
import { toast } from '../../lib/toast'; // ✅ FIX: Ajout toast
import { X, AlertTriangle, CheckCircle2 } from '../../lib/icons';

interface CancelRideReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  hasPenalty?: boolean;
  penaltyAmount?: number;
}

export function CancelRideReasonModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  hasPenalty = false,
  penaltyAmount = 0
}: CancelRideReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  // ✅ Réinitialiser les états quand le modal se ferme
  useEffect(() => {
    if (!isOpen) {
      setSelectedReason('');
      setCustomReason('');
    }
  }, [isOpen]);

  // Liste des motifs prédéfinis
  const cancelReasons = [
    { id: 1, text: 'Attente trop longue', icon: '⏰' },
    { id: 2, text: 'Problème avec le véhicule', icon: '🚗' },
    { id: 3, text: 'Prix trop élevé', icon: '💰' },
    { id: 4, text: 'Mauvaise adresse de départ', icon: '📍' },
    { id: 5, text: 'Changement de plan', icon: '🏠' },
    { id: 6, text: 'Conducteur non professionnel', icon: '👤' },
    { id: 7, text: 'Problème de communication', icon: '📱' },
    { id: 8, text: 'Autre raison...', icon: '✏️' }
  ];

  const handleConfirm = () => {
    const finalReason = selectedReason === 'Autre raison...'
      ? customReason
      : selectedReason;
    
    console.log('🔍 Confirmation annulation:', {
      selectedReason,
      customReason,
      finalReason,
      isEmpty: !finalReason.trim()
    });
    
    if (!finalReason.trim()) {
      console.warn('⚠️ Aucune raison sélectionnée');
      toast.error('Raison requise', {
        description: 'Veuillez sélectionner une raison d\'annulation',
        duration: 3000
      });
      return;
    }
    
    console.log('✅ Envoi de la raison:', finalReason);
    onConfirm(finalReason);
    
    // ✅ Fermer le modal immédiatement après confirmation
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Annuler la course</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Warning if penalty applies */}
        {hasPenalty && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-4"
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">Amende d'annulation</p>
                <p className="text-xs text-orange-700 mt-1">
                  Une amende de {penaltyAmount.toLocaleString()} CDF (50% du prix) sera appliquée pour cette annulation tardive.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Subtitle */}
        <p className="text-gray-600 mb-6">
          Pourquoi souhaitez-vous annuler cette course ?
        </p>

        {/* Predefined reasons */}
        <div className="space-y-2 mb-6">
          {cancelReasons.map((reason) => (
            <motion.button
              key={reason.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedReason(reason.text)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selectedReason === reason.text
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{reason.icon}</span>
                  <span className="font-medium">{reason.text}</span>
                </div>
                {selectedReason === reason.text && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Custom reason input */}
        {selectedReason === 'Autre raison...' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Précisez la raison
            </label>
            <Textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Ex: J'ai trouvé un autre moyen de transport..."
              className="min-h-[100px]"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {customReason.length}/200 caractères
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-12"
          >
            Retour
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedReason ||
              (selectedReason === 'Autre raison...' && !customReason.trim())
            }
            variant="destructive"
            className="flex-1 h-12"
          >
            Confirmer l'annulation
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
