/**
 * 🚕 DriverAvailabilityCheck Component
 * 
 * Affiche le nombre de conducteurs disponibles avant de commander une course
 * et propose des alternatives si aucun conducteur n'est disponible
 */

import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { motion } from '../../lib/motion';
import { Car, Users, AlertCircle, CheckCircle2, TrendingUp, Loader2 } from '../../lib/icons';
import { VehicleCategory } from '../../lib/pricing';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Alternative {
  category: VehicleCategory;
  driversCount: number;
  categoryName: string;
}

interface DriverAvailabilityCheckProps {
  vehicleType: VehicleCategory;
  pickup: { lat: number; lng: number; address: string };
  onContinue: () => void;
  onChangeCategory?: (category: VehicleCategory) => void;
  className?: string;
}

export function DriverAvailabilityCheck({
  vehicleType,
  pickup,
  onContinue,
  onChangeCategory,
  className = ''
}: DriverAvailabilityCheckProps) {
  const [checking, setChecking] = useState(true);
  const [available, setAvailable] = useState(false);
  const [driversCount, setDriversCount] = useState(0);
  const [categoryName, setCategoryName] = useState('');
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noDriversOnlineAtAll, setNoDriversOnlineAtAll] = useState(false); // ✅ NOUVEAU FLAG

  // Vérifier la disponibilité des conducteurs
  useEffect(() => {
    checkAvailability();
  }, [vehicleType]);

  const checkAvailability = async () => {
    setChecking(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/check-drivers-availability`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vehicleType,
            pickup
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la vérification');
      }

      const data = await response.json();
      
      if (data.success) {
        setAvailable(data.available);
        setDriversCount(data.driversCount);
        setCategoryName(data.requestedCategoryName);
        setAlternatives(data.alternatives || []);
        setNoDriversOnlineAtAll(data.noDriversOnlineAtAll || false); // ✅ NOUVEAU FLAG
      } else {
        setError(data.error || 'Erreur inconnue');
      }
    } catch (err) {
      console.error('❌ Erreur vérification disponibilité:', err);
      setError('Impossible de vérifier la disponibilité');
    } finally {
      setChecking(false);
    }
  };

  const handleSelectAlternative = (category: VehicleCategory) => {
    if (onChangeCategory) {
      onChangeCategory(category);
    }
  };

  // État de chargement
  if (checking) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-blue-50 border border-blue-200 rounded-xl p-4 ${className}`}
      >
        <div className="flex items-center space-x-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Vérification en cours...</p>
            <p className="text-xs text-blue-700">Recherche de conducteurs disponibles</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Erreur
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-orange-50 border border-orange-200 rounded-xl p-4 ${className}`}
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-orange-800">{error}</p>
            <Button
              onClick={checkAvailability}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Réessayer
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Conducteurs disponibles ✅
  if (available && driversCount > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-green-50 border-2 border-green-300 rounded-xl p-4 ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="bg-green-500 rounded-full p-2">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-800">
                {driversCount} conducteur{driversCount > 1 ? 's' : ''} disponible{driversCount > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-green-700 mt-1">
                <span className="font-semibold">{categoryName}</span> • Prêts à vous prendre en charge
              </p>
              <div className="flex items-center space-x-1 mt-2 text-green-700">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">
                  Temps d'attente estimé: {driversCount > 3 ? '1-2 min' : '2-4 min'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Aucun conducteur disponible ❌ mais alternatives disponibles
  if (!available && alternatives.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-orange-50 border-2 border-orange-300 rounded-xl p-4 ${className}`}
      >
        <div className="flex items-start space-x-3 mb-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              Aucun conducteur disponible en {categoryName}
            </p>
            <p className="text-xs text-orange-700 mt-1">
              Essayez une autre catégorie de véhicule ci-dessous
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-orange-800 mb-2 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            Alternatives recommandées:
          </p>
          {alternatives.map((alt) => (
            <motion.button
              key={alt.category}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectAlternative(alt.category as VehicleCategory)}
              className="w-full p-3 rounded-lg border-2 border-orange-200 bg-white hover:border-orange-400 hover:bg-orange-50 transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Car className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{alt.categoryName}</p>
                    <p className="text-xs text-gray-600">
                      {alt.driversCount} conducteur{alt.driversCount > 1 ? 's' : ''} disponible{alt.driversCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-medium text-orange-600">
                  Choisir →
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  // Aucun conducteur et aucune alternative ❌
  // ✅ CORRECTION : N'afficher ce message QUE si AUCUN conducteur n'est en ligne dans TOUTES les catégories
  if (noDriversOnlineAtAll) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-red-50 border-2 border-red-300 rounded-xl p-4 ${className}`}
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Aucun conducteur disponible
            </p>
            <p className="text-xs text-red-700 mt-1">
              Tous nos conducteurs sont actuellement occupés. Veuillez réessayer dans quelques minutes.
            </p>
            <Button
              onClick={checkAvailability}
              variant="outline"
              size="sm"
              className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
            >
              Vérifier à nouveau
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Si pas de conducteurs dans cette catégorie et pas d'alternatives, mais des conducteurs en ligne ailleurs
  // Ne rien afficher (l'utilisateur continuera à attendre)
  return null;
}