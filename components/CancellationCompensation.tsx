import { useState } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { useAppState } from '../hooks/useAppState';
import { toast } from '../lib/toast';

// Icônes SVG inline
const AlertTriangle = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const MapPin = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Clock = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DollarSign = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckCircle = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircle = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const Navigation = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const User = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const Phone = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
 
interface CancellationCompensationProps {
  rideId: string;
  passengerId: string;
  driverId: string;
  estimatedPrice: number;
  driverLocation: { lat: number; lng: number; address: string };
  pickupLocation: { lat: number; lng: number; address: string };
  driverTravelTime: number; // minutes to reach pickup
  onCompensationApproved?: (amount: number) => void;
}

export function CancellationCompensation({
  rideId,
  passengerId,
  driverId,
  estimatedPrice,
  driverLocation,
  pickupLocation,
  driverTravelTime,
  onCompensationApproved
}: CancellationCompensationProps) {
  const { updateRide, drivers } = useAppState();
  const [showCompensationDialog, setShowCompensationDialog] = useState(false);
  const [compensationApproved, setCompensationApproved] = useState(false);
  const [compensationAmount, setCompensationAmount] = useState(0);

  // Calculer la distance réelle entre conducteur et passager (Haversine)
  const calculateDistance = () => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (pickupLocation.lat - driverLocation.lat) * Math.PI / 180;
    const dLon = (pickupLocation.lng - driverLocation.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(driverLocation.lat * Math.PI / 180) * Math.cos(pickupLocation.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Arrondi à 1 décimale
  };

  // Déterminer la compensation basée sur la distance réelle
  const calculateCompensation = () => {
    const distance = calculateDistance();
    const baseCompensation = estimatedPrice * 0.5; // 50% compensation de base
    
    // Bonus basé sur la distance parcourue
    let distanceBonus = 0;
    if (distance >= 3) {
      distanceBonus = estimatedPrice * 0.1; // +10% si le conducteur était loin
    }
    
    // Bonus si le conducteur était très proche
    let timeBonus = 0;
    if (driverTravelTime <= 2) {
      timeBonus = estimatedPrice * 0.15; // +15% si presque arrivé
    }
    
    return Math.round(baseCompensation + distanceBonus + timeBonus);
  };

  const handleRequestCompensation = () => {
    const compensation = calculateCompensation();
    setCompensationAmount(compensation);
    setShowCompensationDialog(true);
  };

  const handleApproveCompensation = () => {
    if (updateRide) {
      updateRide(rideId, {
        status: 'cancelled',
        cancellationCompensation: compensationAmount,
        cancellationReason: 'Passager annulé - Conducteur compensé',
        compensationApproved: true,
        compensationApprovedAt: new Date().toISOString()
      });
    }

    setCompensationApproved(true);
    setShowCompensationDialog(false);
    
    if (onCompensationApproved) {
      onCompensationApproved(compensationAmount);
    }
    
    toast.success(`Compensation de ${(compensationAmount || 0).toLocaleString()} CDF approuvée`);
  };

  const handleRejectCompensation = () => {
    if (updateRide) {
      updateRide(rideId, {
        status: 'cancelled',
        cancellationCompensation: 0,
        cancellationReason: 'Passager annulé - Compensation refusée',
        compensationApproved: false
      });
    }

    setShowCompensationDialog(false);
    toast.info('Demande de compensation refusée');
  };

  const driver = drivers.find(d => d.id === driverId);
  const distance = calculateDistance();

  return (
    <div>
      {/* Compensation Request Button */}
      {!compensationApproved && (
        <Button
          onClick={handleRequestCompensation}
          variant="outline"
          className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Demander une compensation
        </Button>
      )}

      {/* Compensation Approved Badge */}
      {compensationApproved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">Compensation approuvée</p>
              <p className="text-sm text-green-700">
                {(compensationAmount || 0).toLocaleString()} CDF ont été crédités à votre compte
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Compensation Dialog */}
      <Dialog open={showCompensationDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle className="sr-only">
            Demande de compensation pour annulation
          </DialogTitle>
          <DialogDescription className="sr-only">
            Évaluation et approbation de la compensation pour course annulée
          </DialogDescription>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 py-4"
          >
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold">
                  Compensation pour annulation
                </h2>
                <p className="text-sm text-gray-600">
                  Course #{rideId.slice(-6)} annulée par le passager
                </p>
              </div>
            </div>

            {/* Driver Info */}
            <Card className="p-4 bg-blue-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">{driver?.name || 'Conducteur'}</h3>
                  <p className="text-sm text-gray-600">{driver?.vehicleInfo.make} {driver?.vehicleInfo.model}</p>
                  <p className="text-sm text-gray-600">{driver?.vehicleInfo.plate}</p>
                </div>
              </div>
            </Card>

            {/* Situation Analysis */}
            <div className="space-y-4">
              <h4 className="font-medium">Analyse de la situation :</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Distance parcourue</span>
                  </div>
                  <p className="text-lg font-semibold">{distance} km</p>
                  <p className="text-xs text-gray-600">vers le point de récupération</p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Temps de trajet</span>
                  </div>
                  <p className="text-lg font-semibold">{driverTravelTime} min</p>
                  <p className="text-xs text-gray-600">estimé jusqu'au passager</p>
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-2">
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">Position du conducteur</p>
                    <p className="text-sm text-gray-600">{driverLocation.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">Point de récupération</p>
                    <p className="text-sm text-gray-600">{pickupLocation.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Compensation Breakdown */}
            <Card className="p-4 space-y-3">
              <h4 className="font-medium flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                Calcul de la compensation
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Prix de course original</span>
                  <span>{(estimatedPrice || 0).toLocaleString()} CDF</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Compensation de base (50%)</span>
                  <span>{Math.round((estimatedPrice || 0) * 0.5).toLocaleString()} CDF</span>
                </div>
                
                {distance >= 3 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Bonus distance (+10%)</span>
                    <span>+{Math.round((estimatedPrice || 0) * 0.1).toLocaleString()} CDF</span>
                  </div>
                )}
                
                {driverTravelTime <= 2 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Bonus proximité (+15%)</span>
                    <span>+{Math.round((estimatedPrice || 0) * 0.15).toLocaleString()} CDF</span>
                  </div>
                )}
                
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total compensation</span>
                  <span className="text-green-600">{(compensationAmount || 0).toLocaleString()} CDF</span>
                </div>
              </div>
            </Card>

            {/* Warning */}
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Cette compensation sera déduite du compte du passager et créditée au conducteur.
                L'action est irréversible.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={handleRejectCompensation}
                variant="outline"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Refuser
              </Button>
              <Button
                onClick={handleApproveCompensation}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approuver compensation
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}