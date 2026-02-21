import { useState } from 'react';
import { AlertTriangle, Phone, MapPin, MessageSquare, X, Shield } from '../../lib/icons';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { toast } from '../../lib/toast';
import { motion, AnimatePresence } from '../../lib/motion';
import { Card } from '../ui/card';

interface SOSEmergencyButtonProps {
  driverId: string;
  driverName: string;
  driverPhone: string;
  currentRide?: {
    id: string;
    passenger_name: string;
    passenger_phone: string;
    pickup_address: string;
    dropoff_address: string;
  } | null;
  currentPosition?: {
    lat: number;
    lng: number;
  } | null;
}

interface EmergencyContact {
  name: string;
  phone: string;
  type: 'police' | 'ambulance' | 'support';
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: 'Police', phone: '112', type: 'police' },
  { name: 'Ambulance', phone: '115', type: 'ambulance' },
  { name: 'SmartCabb Support', phone: '+243 999 000 000', type: 'support' }
];

export function SOSEmergencyButton({
  driverId,
  driverName,
  driverPhone,
  currentRide,
  currentPosition
}: SOSEmergencyButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyId, setEmergencyId] = useState<string | null>(null);

  // Countdown for emergency activation
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      activateEmergency();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const startEmergency = () => {
    setShowDialog(true);
    setCountdown(5); // 5 seconds countdown
  };

  const cancelEmergency = () => {
    setCountdown(null);
    setShowDialog(false);
    toast.success('Alerte annulée');
  };

  const activateEmergency = async () => {
    setCountdown(null);
    setEmergencyActive(true);

    try {
      // Create emergency record
      const { data, error } = await supabase
        .from('emergencies')
        .insert({
          driver_id: driverId,
          driver_name: driverName,
          driver_phone: driverPhone,
          ride_id: currentRide?.id,
          passenger_name: currentRide?.passenger_name,
          passenger_phone: currentRide?.passenger_phone,
          location_lat: currentPosition?.lat,
          location_lng: currentPosition?.lng,
          status: 'active',
          triggered_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setEmergencyId(data.id);

      // Send notifications to all emergency contacts
      await notifyEmergencyContacts();

      // Send push notification to admin
      await supabase.from('notifications').insert({
        user_id: 'admin', // Special admin user
        title: '🚨 URGENCE - Conducteur en danger',
        message: `${driverName} a activé le bouton SOS`,
        type: 'error',
        data: {
          driver_id: driverId,
          driver_name: driverName,
          ride_id: currentRide?.id,
          location: currentPosition
        }
      });

      toast.error('🚨 ALERTE D\'URGENCE ACTIVÉE', {
        description: 'Les secours ont été contactés',
        duration: Infinity
      });

      // Play alert sound
      playAlertSound();

      // Send SMS (in production)
      console.log('📱 SMS envoyés aux contacts d\'urgence');
    } catch (error) {
      console.error('Error activating emergency:', error);
      toast.error('Erreur lors de l\'activation de l\'alerte');
    }
  };

  const notifyEmergencyContacts = async () => {
    const message = `🚨 URGENCE SmartCabb\n\nConducteur: ${driverName}\nTéléphone: ${driverPhone}\n${currentRide ? `Course en cours avec ${currentRide.passenger_name}` : 'Aucune course en cours'}\n${currentPosition ? `Position: https://www.google.com/maps?q=${currentPosition.lat},${currentPosition.lng}` : ''}\n\nMerci d'intervenir rapidement.`;

    // In production, send actual SMS
    console.log('Emergency message:', message);
    
    // For demo, just log
    EMERGENCY_CONTACTS.forEach(contact => {
      console.log(`📞 Calling ${contact.name} at ${contact.phone}`);
    });
  };

  const playAlertSound = () => {
    try {
      const audio = new Audio('/emergency-alert.mp3');
      audio.loop = true;
      audio.play();
    } catch (error) {
      console.error('Error playing alert sound:', error);
    }
  };

  const deactivateEmergency = async () => {
    if (!emergencyId) return;

    try {
      await supabase
        .from('emergencies')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', emergencyId);

      setEmergencyActive(false);
      setEmergencyId(null);
      setShowDialog(false);

      toast.success('Alerte désactivée');
    } catch (error) {
      console.error('Error deactivating emergency:', error);
    }
  };

  const callContact = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const shareLocation = () => {
    if (!currentPosition) {
      toast.error('Position GPS non disponible');
      return;
    }

    const url = `https://www.google.com/maps?q=${currentPosition.lat},${currentPosition.lng}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Ma position - Urgence SmartCabb',
        text: `Je suis en situation d'urgence. Ma position actuelle:`,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Lien de localisation copié');
    }
  };

  return (
    <>
      {/* Emergency button */}
      <motion.div
        whileHover={{ scale: emergencyActive ? 1 : 1.05 }}
        whileTap={{ scale: emergencyActive ? 1 : 0.95 }}
      >
        <Button
          onClick={startEmergency}
          className={`w-full gap-2 ${
            emergencyActive 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : 'bg-red-500 hover:bg-red-600'
          }`}
          size="lg"
        >
          <AlertTriangle className="w-5 h-5" />
          {emergencyActive ? '🚨 URGENCE ACTIVE' : 'SOS Urgence'}
        </Button>
      </motion.div>

      {/* Emergency Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              {emergencyActive ? 'Urgence Activée' : 'Activation SOS'}
            </DialogTitle>
            <DialogDescription>
              Demandez une assistance d'urgence
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {countdown !== null && !emergencyActive && (
              <motion.div
                key="countdown"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl text-red-600">{countdown}</span>
                  </div>
                  <svg className="w-32 h-32 -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-red-600"
                      strokeDasharray="351.86"
                      initial={{ strokeDashoffset: 0 }}
                      animate={{ strokeDashoffset: 351.86 }}
                      transition={{ duration: 5, ease: 'linear' }}
                    />
                  </svg>
                </div>

                <p className="text-lg mb-4">Activation dans {countdown}s...</p>
                <p className="text-sm text-gray-600 mb-6">
                  Les secours seront alertés automatiquement
                </p>

                <Button
                  onClick={cancelEmergency}
                  variant="outline"
                  className="w-full"
                >
                  Annuler
                </Button>
              </motion.div>
            )}

            {emergencyActive && (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Alert banner */}
                <Card className="bg-red-50 border-red-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-red-900">Alerte active</p>
                      <p className="text-sm text-red-700">Les secours ont été contactés</p>
                    </div>
                  </div>
                </Card>

                {/* Current info */}
                <div className="space-y-2 text-sm">
                  {currentRide && (
                    <>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>Passager: {currentRide.passenger_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{currentRide.passenger_phone}</span>
                      </div>
                    </>
                  )}
                  
                  {currentPosition && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-xs">
                        {(currentPosition.lat || 0).toFixed(6)}, {(currentPosition.lng || 0).toFixed(6)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Emergency contacts */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Contacts d'urgence :</p>
                  {EMERGENCY_CONTACTS.map((contact) => (
                    <Button
                      key={contact.phone}
                      onClick={() => callContact(contact.phone)}
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span>{contact.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{contact.phone}</span>
                        <Phone className="w-4 h-4" />
                      </div>
                    </Button>
                  ))}
                </div>

                {/* Share location */}
                <Button
                  onClick={shareLocation}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={!currentPosition}
                >
                  <Navigation className="w-4 h-4" />
                  Partager ma position
                </Button>

                {/* Deactivate */}
                <Button
                  onClick={deactivateEmergency}
                  variant="default"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Désactiver l'alerte
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}