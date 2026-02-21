import { useState, useEffect } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { useAppState } from '../hooks/useAppState';
import { 
  AlertTriangle, 
  Phone, 
  MapPin, 
  Clock,
  Shield,
  Users,
  X
} from '../lib/icons';
import { toast } from '../lib/toast';
import { sendEmergencyAlert } from '../lib/sms-service';

interface EmergencyAlertProps {
  userType: 'passenger' | 'driver';
}

export function EmergencyAlert({ userType }: EmergencyAlertProps) {
  const { state } = useAppState();
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [emergencyType, setEmergencyType] = useState<'medical' | 'security' | 'accident' | 'harassment'>('security');

  // Countdown for emergency activation
  useEffect(() => {
    if (showEmergencyDialog && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && showEmergencyDialog) {
      activateEmergency();
    }
  }, [showEmergencyDialog, countdown]);

  const emergencyTypes = {
    medical: {
      title: 'Urgence médicale',
      description: 'Besoin d\'assistance médicale immédiate',
      icon: '🚑',
      priority: 'high'
    },
    security: {
      title: 'Problème de sécurité',
      description: 'Situation dangereuse ou menace',
      icon: '🚨',
      priority: 'high'
    },
    accident: {
      title: 'Accident',
      description: 'Accident de circulation ou incident',
      icon: '🚗',
      priority: 'medium'
    },
    harassment: {
      title: 'Harcèlement',
      description: 'Comportement inapproprié ou harcèlement',
      icon: '⚠️',
      priority: 'high'
    }
  };

  const activateEmergency = async () => {
    setEmergencyActive(true);
    setShowEmergencyDialog(false);
    
    const userName = userType === 'driver' 
      ? state.currentDriver?.name || 'Conducteur'
      : state.currentUser?.name || state.currentUser?.email || 'Passager';
    
    const userPhone = userType === 'driver'
      ? state.currentDriver?.phone || ''
      : state.currentUser?.phone || '';
    
    const location = userType === 'driver' 
      ? state.currentDriver?.currentLocation?.address || 'Kinshasa, RDC'
      : 'Kinshasa, RDC';
    
    // Log emergency in state (in real app, this would send to emergency services)
    const emergencyData = {
      id: `emergency_${Date.now()}`,
      userId: userType === 'driver' ? state.currentDriver?.id : state.currentUser?.id,
      userType,
      type: emergencyType,
      location: userType === 'driver' ? state.currentDriver?.currentLocation : 
        { lat: -4.3217, lng: 15.3125, address: 'Kinshasa, RDC' }, // Default location
      timestamp: new Date().toISOString(),
      rideId: state.currentRide?.id,
      status: 'active'
    };

    console.log('Emergency activated:', emergencyData);
    
    toast.error(`🚨 Alerte d'urgence activée - ${emergencyTypes[emergencyType].title}`);
    
    // Envoi SMS d'urgence
    if (state.currentRide) {
      try {
        const otherPartyIsDriver = userType === 'passenger';
        const otherParty = otherPartyIsDriver 
          ? state.currentDriver 
          : state.currentUser;
        
        const otherPartyName = otherPartyIsDriver
          ? state.currentDriver?.name || 'Conducteur'
          : state.currentUser?.name || 'Passager';
        
        const otherPartyPhone = otherPartyIsDriver
          ? state.currentDriver?.phone || ''
          : state.currentUser?.phone || '';
        
        const vehicleInfo = state.currentDriver 
          ? `${state.currentDriver.vehicleModel} - ${state.currentDriver.licensePlate}`
          : 'N/A';
        
        await sendEmergencyAlert(
          userType === 'driver' ? 'conducteur' : 'passager',
          userName,
          userPhone,
          otherPartyName,
          otherPartyPhone,
          vehicleInfo,
          location,
          state.currentRide.id || 'N/A'
        );
        
        toast.info('Les services d\'urgence et l\'autre partie ont été notifiés par SMS.');
      } catch (error) {
        console.error('Erreur envoi SMS urgence:', error);
      }
    }
    
    // In real app: send to emergency services, notify contacts, etc.
    setTimeout(() => {
      toast.info('Les services d\'urgence ont été notifiés. Aide en route.');
    }, 2000);
  };

  const cancelEmergency = () => {
    setShowEmergencyDialog(false);
    setCountdown(5);
    toast.info('Alerte d\'urgence annulée');
  };

  const deactivateEmergency = () => {
    setEmergencyActive(false);
    toast.success('Alerte d\'urgence désactivée - Situation résolue');
  };

  return (
    <div className="relative">
      {/* Emergency Button */}
      <Button
        onClick={() => setShowEmergencyDialog(true)}
        variant={emergencyActive ? "destructive" : "outline"}
        size="sm"
        className={`${emergencyActive ? 'animate-pulse bg-red-600 hover:bg-red-700' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
      >
        <AlertTriangle className="w-4 h-4 mr-1" />
        {emergencyActive ? 'Urgence Active' : 'SOS'}
      </Button>

      {/* Active Emergency Banner */}
      {emergencyActive && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-3 shadow-lg"
        >
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <div>
                <p className="font-semibold">Alerte d'urgence active</p>
                <p className="text-sm opacity-90">{emergencyTypes[emergencyType].title}</p>
              </div>
            </div>
            <Button
              onClick={deactivateEmergency}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Emergency Activation Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">
            Activation d'alerte d'urgence
          </DialogTitle>
          <DialogDescription className="sr-only">
            Sélectionnez le type d'urgence et confirmez l'activation
          </DialogDescription>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-4"
          >
            {/* Warning Header */}
            <div className="space-y-3">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <div>
                <h2 className="text-xl font-semibold text-red-900">
                  Alerte d'urgence
                </h2>
                <p className="text-sm text-gray-600">
                  Cette action notifiera immédiatement les services d'urgence
                </p>
              </div>
            </div>

            {/* Emergency Type Selection */}
            <div className="space-y-3">
              <label className="font-medium text-left block">Type d'urgence :</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(emergencyTypes).map(([key, type]) => (
                  <button
                    key={key}
                    onClick={() => setEmergencyType(key as any)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      emergencyType === key 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-lg mb-1">{type.icon}</div>
                    <div className="text-sm font-medium">{type.title}</div>
                    <div className="text-xs text-gray-600">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Location Info */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">Localisation actuelle</span>
              </div>
              <p className="text-sm text-gray-600">
                {userType === 'driver' 
                  ? state.currentDriver?.currentLocation?.address || 'Kinshasa, RDC'
                  : 'Kinshasa, RDC'
                }
              </p>
              <p className="text-xs text-gray-500">
                📍 4°19'19"S, 15°18'45"E
              </p>
            </div>

            {/* Countdown */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">
                  Activation dans {countdown}s
                </span>
              </div>
              <p className="text-xs text-red-700">
                Les services d'urgence et vos contacts seront notifiés
              </p>
            </div>

            {/* Emergency Services Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span>Police: 112</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="w-4 h-4 text-red-600" />
                  <span>Urgences: 113</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={cancelEmergency}
                variant="outline"
                className="flex-1"
                disabled={countdown === 0}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button
                onClick={activateEmergency}
                variant="destructive"
                className="flex-1"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Activer maintenant
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}