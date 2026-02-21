/**
 * 🧪 TESTEUR DE NOTIFICATIONS
 * 
 * Composant pour tester les notifications sonores
 * À intégrer temporairement dans l'interface chauffeur
 */

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useState } from 'react';
import { Bell, Volume2, Vibrate, Smartphone } from '../../lib/icons';
import { 
  testNotification, 
  requestNotificationPermission,
  playRideNotification 
} from '../../lib/notification-sound';
import { RideNotification } from './RideNotification';

export function NotificationTester() {
  const [showTestNotif, setShowTestNotif] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionGranted(granted);
    if (granted) {
      alert('✅ Permission accordée !');
    } else {
      alert('❌ Permission refusée');
    }
  };

  const handleTestSound = async () => {
    await playRideNotification({
      passengerName: 'Jean Mukendi',
      pickup: 'Avenue Kasavubu, Kinshasa',
      destination: 'Boulevard du 30 Juin, Kinshasa',
      distance: 3.5,
      estimatedEarnings: 2500
    });
  };

  const handleTestFullNotification = () => {
    testNotification();
  };

  const handleShowVisualNotif = () => {
    setShowTestNotif(true);
  };

  const mockRideRequest = {
    id: 'test-ride-123',
    passengerId: 'passenger-456',
    passengerName: 'Jean Mukendi',
    passengerRating: 4.8,
    pickup: {
      lat: -4.3276,
      lng: 15.3136,
      address: 'Avenue Kasavubu, Commune de la Gombe, Kinshasa'
    },
    destination: {
      lat: -4.3450,
      lng: 15.3250,
      address: 'Boulevard du 30 Juin, Kinshasa'
    },
    distance: 3.5,
    estimatedEarnings: 2500,
    estimatedDuration: 12,
    vehicleType: 'SmartCabb',
    createdAt: new Date().toISOString()
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
      <div className="flex items-center gap-2 pb-4 border-b">
        <Bell className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-bold text-gray-900">Test Notifications</h3>
      </div>

      {/* Permission */}
      <div className="bg-blue-50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Permission Notifications</p>
              <p className="text-sm text-gray-600">
                {permissionGranted ? '✅ Accordée' : '❌ Non accordée'}
              </p>
            </div>
          </div>
          {!permissionGranted && (
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Autoriser
            </button>
          )}
        </div>
      </div>

      {/* Boutons de test */}
      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={handleTestSound}
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all"
        >
          <Volume2 className="w-5 h-5" />
          <div className="flex-1 text-left">
            <p className="font-semibold">Tester le Son + Vibration</p>
            <p className="text-sm opacity-90">Message vocal + beep + vibration</p>
          </div>
        </button>

        <button
          onClick={handleTestFullNotification}
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          <Bell className="w-5 h-5" />
          <div className="flex-1 text-left">
            <p className="font-semibold">Notification Complète</p>
            <p className="text-sm opacity-90">Son + vibration + notification navigateur</p>
          </div>
        </button>

        <button
          onClick={handleShowVisualNotif}
          className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all"
        >
          <Vibrate className="w-5 h-5" />
          <div className="flex-1 text-left">
            <p className="font-semibold">Interface Visuelle</p>
            <p className="text-sm opacity-90">Popup avec détails de la course</p>
          </div>
        </button>
      </div>

      {/* Info */}
      <div className="bg-yellow-50 rounded-xl p-4">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">💡 Note :</span> Pour une expérience complète 
          (notifications même écran éteint), consultez le fichier{' '}
          <code className="bg-yellow-200 px-2 py-1 rounded text-xs">
            /NOTIFICATION_GUIDE.md
          </code>{' '}
          pour intégrer Firebase Cloud Messaging (FCM).
        </p>
      </div>

      {/* Notification de test */}
      {showTestNotif && (
        <RideNotification
          rideRequest={mockRideRequest}
          onAccept={(rideId) => {
            console.log('✅ Course acceptée:', rideId);
            setShowTestNotif(false);
            alert('✅ Course acceptée (TEST)');
          }}
          onDecline={(rideId) => {
            console.log('❌ Course refusée:', rideId);
            setShowTestNotif(false);
            alert('❌ Course refusée (TEST)');
          }}
          timeoutSeconds={15}
        />
      )}
    </div>
  );
}