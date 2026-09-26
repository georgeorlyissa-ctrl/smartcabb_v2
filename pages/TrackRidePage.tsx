/**
 * 🗺️ SUIVI DE COURSE PUBLIC — SMARTCABB (style Yango)
 * Page ouverte via le lien WhatsApp partagé : montre l'itinéraire
 * et la position du chauffeur en direct, sans compte. + lien appli.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from '../lib/simple-router';
import { MapView } from '../components/MapView';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.smartcabb.app';

interface TrackedRide {
  id: string;
  status: string;
  pickup: any;
  destination: any;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driver?: any;
  passengerName?: string | null;
  estimatedPrice?: number | null;
  driverLocation?: { lat: number; lng: number } | null;
}

function coords(p: any): { lat: number; lng: number } | null {
  if (!p) return null;
  const lat = p.coordinates?.lat ?? p.lat ?? p.latitude;
  const lng = p.coordinates?.lng ?? p.lng ?? p.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

function placeName(p: any): string {
  if (!p) return '—';
  if (typeof p === 'string') return p;
  return p.name || p.address || '—';
}

function statusText(status: string): string {
  switch (status) {
    case 'searching': return 'Recherche d\u2019un chauffeur en cours…';
    case 'accepted': return 'Le chauffeur est en route';
    case 'arrived': return 'Le chauffeur est arrivé au point de départ';
    case 'in_progress': return 'Course en cours';
    case 'completed':
    case 'rated': return 'Course terminée, merci d\u2019avoir roulé avec SmartCabb';
    case 'cancelled': return 'Cette course a été annulée';
    case 'no_driver_found': return 'Aucun chauffeur disponible pour le moment';
    default: return 'Suivi de la course';
  }
}

export function TrackRidePage() {
  const params = useParams();
  const queryRideId = new URLSearchParams(window.location.search).get('rideId');
  const rideId = (params as any)?.rideId || queryRideId;

  const [ride, setRide] = useState<TrackedRide | null>(null);
  const [error, setError] = useState(false);

  const fetchRide = useCallback(async () => {
    if (!rideId) return;
    try {
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/${rideId}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (!resp.ok) {
        setError(true);
        return;
      }
      const data = await resp.json();
      if (data.success && data.ride) {
        setRide(data.ride);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, [rideId]);

  useEffect(() => {
    fetchRide();
    const iv = setInterval(fetchRide, 10000);
    return () => clearInterval(iv);
  }, [fetchRide]);

  if (!rideId || error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-3">🗺️</p>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Suivi indisponible</h1>
          <p className="text-sm text-gray-500 mb-5">Ce lien de suivi ne correspond à aucune course. Il a peut-être expiré.</p>
          <a href={PLAY_STORE_URL} className="block w-full py-3 bg-cyan-600 text-white rounded-xl font-semibold text-sm">
            Télécharger SmartCabb
          </a>
          <a href="https://smartcabb.com" className="block mt-3 text-sm text-cyan-700">
            smartcabb.com
          </a>
        </div>
      </div>
    );
  }

  const pickup = ride ? coords(ride.pickup) : null;
  const destination = ride ? coords(ride.destination) : null;
  const driverPos = ride?.driverLocation || null;
  const center = driverPos || pickup || { lat: -4.3276, lng: 15.3136 };
  const driverName = ride?.driverName || ride?.driver?.name || null;
  const vehicle = ride?.driver?.vehicle || null;
  const plate = vehicle?.plate || vehicle?.license_plate || null;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-white relative overflow-hidden">
      {/* Header */}
      <div className="relative z-20 px-4 pt-4 pb-2 bg-white">
        <p className="text-center font-bold text-gray-900">SmartCabb — Suivi de course</p>
        {ride && (
          <p className="text-center text-xs text-gray-500 mt-1">{statusText(ride.status)}</p>
        )}
      </div>

      {/* Carte itinéraire + chauffeur en direct */}
      <div className="relative flex-1 z-0">
        <MapView
          center={pickup && destination ? undefined : center}
          pickup={pickup || undefined}
          destination={destination || undefined}
          vehicleLocation={driverPos || undefined}
          zoom={14}
          className="w-full h-full"
          showUserLocation={false}
          enableGeolocation={false}
          showTraffic={false}
          enableZoomControls={true}
          disableAutoCenter={true}
        />
      </div>

      {/* Fiche course */}
      <div className="relative z-20 bg-white rounded-t-3xl shadow-2xl px-5 pt-3 pb-[env(safe-area-inset-bottom)] -mt-4">
        {ride ? (
          <div className="py-3 space-y-2">
            {driverName && (
              <p className="text-sm font-semibold text-gray-900">
                {driverName}
                {vehicle?.make || vehicle?.model ? ` · ${vehicle.make || ''} ${vehicle.model || ''}`.trim() : ''}
                {plate ? ` · ${plate}` : ''}
              </p>
            )}
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{placeName(ride.pickup)}</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{placeName(ride.destination)}</p>
            </div>
            <a
              href={PLAY_STORE_URL}
              className="block text-center w-full py-3 mt-1 bg-cyan-600 text-white rounded-xl font-semibold text-sm"
            >
              Télécharger SmartCabb
            </a>
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-gray-400">Chargement du suivi…</div>
        )}
      </div>
    </div>
  );
}
