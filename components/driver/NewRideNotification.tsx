import { useState, useEffect } from 'react'; // ✅ FIX: Import React hooks
import { motion, AnimatePresence } from '../../lib/motion'; // ✅ FIX CRITIQUE: Import motion et AnimatePresence
import { X, MapPin, Clock, DollarSign, User, Navigation, Phone } from '../../lib/icons';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface NewRideNotificationProps {
  driverId: string;
  onAccept: (rideRequest: any) => void;
  onDecline: (requestId: string) => void;
}

interface RideRequest {
  id: string;
  passenger_name: string;
  passenger_phone: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  category: string;
  estimated_price: number;
  distance_km: number;
  created_at: string;
}

export function NewRideNotification({ driverId, onAccept, onDecline }: NewRideNotificationProps) {
  const [pendingRequests, setPendingRequests] = useState<RideRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<RideRequest | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Load pending requests on mount
  useEffect(() => {
    loadPendingRequests();

    // Subscribe to new ride requests in real-time
    const channel = supabase
      .channel('ride-requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_requests',
          filter: `driver_id=eq.${driverId}`
        },
        (payload) => {
          console.log('🔔 New ride request:', payload.new);
          
          const newRequest = payload.new as RideRequest;
          
          // Add to list
          setPendingRequests(prev => [newRequest, ...prev]);
          
          // Show immediately if no current request
          if (!currentRequest) {
            setCurrentRequest(newRequest);
            setTimeLeft(30);
          }

          // Play notification sound
          if (audioEnabled) {
            playNotificationSound();
          }

          // Toast notification
          toast('New ride available!', {
            description: `From ${newRequest.pickup_address}`,
            duration: 5000
          });

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('SmartCabb - New Ride', {
              body: `From ${newRequest.pickup_address}`,
              icon: '/vite.svg',
              badge: '/vite.svg',
              tag: 'new-ride',
              requireInteraction: true
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [driverId, currentRequest, audioEnabled]);

  // Load pending requests
  const loadPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('ride_requests')
        .select('*')
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setPendingRequests(data);
        setCurrentRequest(data[0]);
        setTimeLeft(30);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  // Timer for auto-reject after 30 seconds
  useEffect(() => {
    if (!currentRequest) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleDecline();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRequest]);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleAccept = () => {
    if (currentRequest) {
      onAccept(currentRequest);
      moveToNextRequest();
    }
  };

  const handleDecline = () => {
    if (currentRequest) {
      onDecline(currentRequest.id);
      moveToNextRequest();
    }
  };

  const moveToNextRequest = () => {
    const remaining = pendingRequests.filter(r => r.id !== currentRequest?.id);
    setPendingRequests(remaining);
    
    if (remaining.length > 0) {
      setCurrentRequest(remaining[0]);
      setTimeLeft(30);
    } else {
      setCurrentRequest(null);
    }
  };

  if (!currentRequest) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
      >
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-2xl border-0">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <h3 className="font-bold text-lg">New Ride Request</h3>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white">
                {timeLeft}s
              </Badge>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-white/20 rounded-full mb-4 overflow-hidden">
              <motion.div
                className="h-full bg-white"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 30, ease: 'linear' }}
              />
            </div>

            {/* Passenger info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="font-medium">{currentRequest.passenger_name}</span>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{currentRequest.passenger_phone}</span>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm opacity-80">Pickup</p>
                  <p className="font-medium">{currentRequest.pickup_address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Navigation className="w-4 h-4 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm opacity-80">Dropoff</p>
                  <p className="font-medium">{currentRequest.dropoff_address}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{(currentRequest.distance_km || 0).toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-bold text-lg">
                    ${(currentRequest.estimated_price || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleDecline}
                variant="outline"
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                className="flex-1 bg-white text-blue-600 hover:bg-white/90"
              >
                Accept Ride
              </Button>
            </div>

            {/* Queue indicator */}
            {pendingRequests.length > 1 && (
              <p className="text-center text-sm mt-3 opacity-80">
                +{pendingRequests.length - 1} more request{pendingRequests.length > 2 ? 's' : ''} waiting
              </p>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}