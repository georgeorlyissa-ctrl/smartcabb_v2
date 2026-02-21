"use client";

import { useState } from 'react';
import { motion } from '../lib/motion';
import { X, AlertTriangle } from '../lib/icons';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface CancelRideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  rideStatus: string;
  hasPenalty: boolean;
  penaltyAmount?: number;
}

const CANCELLATION_REASONS = [
  'Changement de plans',
  'Temps d\'attente trop long',
  'Chauffeur trop loin',
  'Prix trop élevé',
  'Trouvé un autre moyen de transport',
  'Urgence / Imprévu',
  'Erreur d\'adresse',
  'Problème avec le véhicule',
  'Comportement du chauffeur',
  'Autre raison'
];

export function CancelRideModal({
  isOpen,
  onClose,
  onConfirm,
  rideStatus,
  hasPenalty,
  penaltyAmount = 0
}: CancelRideModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    const finalReason = selectedReason === 'Autre raison' && customReason
      ? customReason
      : selectedReason;

    if (!finalReason) {
      alert('Veuillez sélectionner une raison d\'annulation');
      return;
    }

    setIsConfirming(true);
    await onConfirm(finalReason);
    setIsConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg"
      >
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Annuler la course</h2>
              <p className="text-sm text-gray-600 mt-1">
                Veuillez indiquer la raison de l'annulation
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Avertissement pénalité */}
          {hasPenalty && penaltyAmount > 0 && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900">Pénalité d'annulation</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Une pénalité de <span className="font-bold">{penaltyAmount.toLocaleString('fr-FR')} CDF</span> sera
                    déduite de votre portefeuille car un chauffeur a déjà accepté votre course.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Liste des raisons */}
          <div className="space-y-2 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Sélectionnez une raison :
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {CANCELLATION_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedReason === reason
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Raison personnalisée */}
          {selectedReason === 'Autre raison' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Précisez la raison :
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Décrivez la raison de l'annulation..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isConfirming}
            >
              Retour
            </Button>
            <Button
              onClick={handleConfirm}
              variant="default"
              className="flex-1 bg-red-600 hover:bg-red-700"
              disabled={!selectedReason || isConfirming}
            >
              {isConfirming ? 'Annulation...' : 'Confirmer l\'annulation'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
