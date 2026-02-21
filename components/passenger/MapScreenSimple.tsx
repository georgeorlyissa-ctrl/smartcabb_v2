import { useEffect, useState } from 'react';
import { GoogleMapView } from '../GoogleMapView';
import { useAppState } from '../../hooks/useAppState';
import { MapPin, Loader2 } from '../../lib/icons';

/**
 * Version simplifiée de MapScreen pour diagnostic
 */
export function MapScreenSimple() {
  const { state } = useAppState();
  const [currentLocation, setCurrentLocation] = useState({
    lat: -4.3276,
    lng: 15.3136,
    address: 'Kinshasa, RDC'
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(true);

  // Charger la position
  useEffect(() => {
    if ('geolocation' in navigator) {
      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('📍 Position obtenue:', position.coords);
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Position actuelle'
          });
          setLoadingLocation(false);
        },
        (error) => {
          console.error('❌ Erreur géolocalisation:', error);
          setLoadingLocation(false);
        }
      );
    }
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4 shadow-lg z-50">
        <h1 className="text-xl font-bold">🗺️ Test de Carte</h1>
        <p className="text-sm text-white/80">SmartCabb - Diagnostic</p>
      </div>

      {/* Diagnostic (peut être masqué) */}
      {showDiagnostic && <MapDiagnostic />}

      <button
        onClick={() => setShowDiagnostic(!showDiagnostic)}
        className="fixed top-20 left-4 z-[9998] bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm"
      >
        {showDiagnostic ? 'Masquer' : 'Afficher'} diagnostic
      </button>

      {/* Position actuelle */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 p-2 rounded-full">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Position actuelle</p>
            <p className="text-sm font-medium text-gray-900">
              {loadingLocation ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Localisation...
                </span>
              ) : (
                currentLocation.address
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Carte */}
      <div className="flex-1 relative">
        <div className="absolute inset-0">
          <GoogleMapView
            center={currentLocation}
            drivers={[]}
            zoom={13}
            className="w-full h-full"
            showUserLocation={true}
            enableGeolocation={true}
            onLocationUpdate={(location) => {
              console.log('📍 Mise à jour position:', location);
              setCurrentLocation(location);
            }}
          />
        </div>

        {/* Indicateur de chargement */}
        {loadingLocation && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl p-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-gray-600">Chargement de la carte...</p>
          </div>
        )}
      </div>

      {/* Info de debug en bas */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="text-xs text-gray-500 space-y-1">
          <div>📍 Lat: {currentLocation.lat.toFixed(6)}</div>
          <div>📍 Lng: {currentLocation.lng.toFixed(6)}</div>
          <div>🌍 OSM Leaflet + OpenStreetMap</div>
        </div>
      </div>
    </div>
  );
}