import { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { GoogleMapView } from '../GoogleMapView';
import { YangoStyleSearch } from './YangoStyleSearch';
import { FavoriteLocations } from './FavoriteLocations';
import { reverseGeocode } from '../../lib/precise-gps';
import { toast } from '../../lib/toast';

// Icônes SVG inline
const MapPin = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const Navigation = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);
const Home = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>);
const Briefcase = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>);
const Star = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>);
const Plus = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>);
const Menu = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const User = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);
const Loader2 = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>);

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * 🗺️ ÉCRAN PRINCIPAL DE LA CARTE - PASSAGER
 * 
 * Fonctionnalités :
 * - Affichage de la carte avec position actuelle
 * - Sélection de destination par clic sur carte
 * - Recherche de lieu
 * - Suggestions (Domicile, Travail)
 * - Affichage du nom de lieu via geocoding inverse
 */
export function MapScreen() {
  const appState = useAppState();
  const { state, setCurrentScreen } = appState;
  const updatePickup = appState.updatePickup || appState.setPickup;
  const updateDestination = appState.updateDestination || appState.setDestination;
  
  const [currentLocation, setCurrentLocation] = useState<Location>({
    lat: -4.3276,
    lng: 15.3136,
    address: 'Kinshasa, RDC'
  });
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🏠 État pour afficher le modal de lieux favoris
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);

  // 📍 Charger la position GPS au démarrage
  useEffect(() => {
    if ('geolocation' in navigator) {
      console.log('📍 Demande de géolocalisation...');
      setLoadingLocation(true);
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('✅ Position GPS obtenue:', position.coords);
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Obtenir l'adresse
          setLoadingAddress(true);
          const address = await reverseGeocode(lat, lng);
          console.log('📍 Adresse obtenue:', address);
          
          const location = { lat, lng, address };
          setCurrentLocation(location);
          setPickupLocation(location);
          if (updatePickup) {
            updatePickup(location);
          }
          setLoadingAddress(false);
          setLoadingLocation(false);
          
          // 🎯 DESTINATION PAR DÉFAUT POUR LES TESTS
          // Mettre une destination par défaut (Aéroport de Kinshasa N'djili)
          if (!state.destination && updateDestination) {
            console.log('🎯 Définition d\'une destination par défaut pour les tests');
            const defaultDestination = {
              lat: -4.3856,
              lng: 15.4446,
              address: 'Aéroport International de N\'djili, Kinshasa'
            };
            updateDestination(defaultDestination);
            
            // Afficher un toast pour informer l'utilisateur
            toast('📍 Destination par défaut définie', {
              description: 'Aéroport de Kinshasa N\'djili - Utilisez la recherche pour changer',
              duration: 5000
            });
          }
        },
        (error) => {
          // Message utilisateur selon le code d'erreur - SANS afficher d'erreur alarmante
          if (error.code === 1) {
            // Permission refusée ou bloquée par permissions policy
            console.log('📍 Géolocalisation non disponible (permissions refusées ou bloquées)');
            // Message informatif au lieu d'erreur
            toast('📍 Sélectionnez votre position en touchant la carte', {
              duration: 5000,
              description: 'Ou utilisez la recherche pour trouver votre adresse'
            });
          } else if (error.code === 2) {
            console.warn('⚠️ Position GPS non disponible');
            toast.error('Position GPS non disponible');
          } else if (error.code === 3) {
            console.warn('⚠️ Délai de géolocalisation dépassé');
            toast.error('Délai de géolocalisation dépassé');
          }
          
          // Garder la position par défaut (Kinshasa)
          setLoadingLocation(false);
          
          // 🎯 DESTINATION PAR DÉFAUT MÊME EN CAS D'ERREUR GPS
          if (!state.destination && updatePickup && updateDestination) {
            console.log('🎯 Définition d\'une destination par défaut (fallback)');
            const defaultPickup = {
              lat: -4.3276,
              lng: 15.3136,
              address: 'Centre-ville de Kinshasa'
            };
            const defaultDestination = {
              lat: -4.3856,
              lng: 15.4446,
              address: 'Aéroport International de N\'djili, Kinshasa'
            };
            updatePickup(defaultPickup);
            updateDestination(defaultDestination);
            
            toast('📍 Adresses par défaut définies', {
              description: 'Centre-ville → Aéroport N\'djili',
              duration: 5000
            });
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 15000, // Augmenté à 15 secondes pour éviter les timeouts
          maximumAge: 60000
        }
      );
    } else {
      console.warn('⚠️ Géolocalisation non supportée');
      setLoadingLocation(false);
      
      // 🎯 DESTINATION PAR DÉFAUT SI PAS DE GÉOLOCALISATION
      if (!state.destination && updatePickup && updateDestination) {
        console.log('🎯 Définition d\'une destination par défaut (pas de géolocalisation)');
        const defaultPickup = {
          lat: -4.3276,
          lng: 15.3136,
          address: 'Centre-ville de Kinshasa'
        };
        const defaultDestination = {
          lat: -4.3856,
          lng: 15.4446,
          address: 'Aéroport International de N\'djili, Kinshasa'
        };
        updatePickup(defaultPickup);
        updateDestination(defaultDestination);
        
        toast('📍 Adresses par défaut définies', {
          description: 'Centre-ville → Aéroport N\'djili',
          duration: 5000
        });
      }
    }
  }, [state.destination, setCurrentScreen]);

  // 🖱️ Gestion du clic sur la carte
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    console.log('🖱️ Clic sur carte:', lat, lng);
    
    // Afficher les coordonnées immédiatement
    const tempLocation = {
      lat,
      lng,
      address: `${Math.abs(lat).toFixed(6)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(6)}°${lng < 0 ? 'W' : 'E'}`
    };
    
    setPickupLocation(tempLocation);
    if (updatePickup) {
      updatePickup(tempLocation);
    }
    
    // Obtenir le nom de lieu en arrière-plan
    setLoadingAddress(true);
    try {
      const address = await reverseGeocode(lat, lng);
      console.log('📍 Nom de lieu obtenu:', address);
      
      const location = { lat, lng, address };
      setPickupLocation(location);
      if (updatePickup) {
        updatePickup(location);
      }
    } catch (error) {
      console.error('❌ Erreur geocoding:', error);
    } finally {
      setLoadingAddress(false);
    }
  }, [updatePickup]);

  // 🔍 Sélection depuis la recherche
  const handleSearchSelect = (result: any) => {
    console.log('🔍 Sélection recherche:', result);
    
    if (result.coordinates && updateDestination) {
      const location = {
        lat: result.coordinates.lat,
        lng: result.coordinates.lng,
        address: result.name || result.description
      };
      updateDestination(location);
      setCurrentScreen('estimate');
    }
  };

  // 👤 Profil
  const handleProfileClick = () => {
    setCurrentScreen('profile');
  };

  // Adresse affichée
  const displayAddress = pickupLocation?.address || currentLocation.address;
  const displayLat = pickupLocation?.lat || currentLocation.lat;
  const displayLng = pickupLocation?.lng || currentLocation.lng;

  return (
    <div className="h-screen w-full flex flex-col bg-white relative">
      {/* ========== HEADER ========== */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white shadow-md">
        <div className="flex items-center justify-between p-4">
          {/* Menu */}
          <button
            onClick={handleProfileClick}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>

          {/* Titre */}
          <h1 className="text-lg font-bold text-gray-900">SmartCabb</h1>

          {/* Profil */}
          <button
            onClick={handleProfileClick}
            className="w-10 h-10 rounded-full bg-primary text-white shadow-md flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <User className="w-5 h-5" />
          </button>
        </div>

        {/* Position actuelle */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <div className="bg-green-500 p-2 rounded-full">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Position actuelle</p>
              <p className="text-sm font-medium text-gray-900 truncate">
                {loadingLocation || loadingAddress ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {loadingAddress ? 'Recherche du nom...' : 'Localisation...'}
                  </span>
                ) : (
                  displayAddress
                )}
              </p>
              {!loadingLocation && (
                <p className="text-xs text-gray-400">
                  ±{Math.round(33)}m
                </p>
              )}
            </div>
            {!loadingLocation && (
              <button
                onClick={() => {
                  const newState = !isSelectingOnMap;
                  setIsSelectingOnMap(newState);
                  
                  // Feedback visuel avec toast
                  if (newState) {
                    toast('📍 Mode sélection activé', {
                      description: 'Touchez la carte pour choisir votre position de départ'
                    });
                  } else {
                    toast('✅ Mode sélection désactivé');
                  }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isSelectingOnMap 
                    ? 'bg-primary text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========== CARTE ========== */}
      <div className="flex-1 relative">
        <GoogleMapView
          center={currentLocation}
          zoom={15}
          className="w-full h-full"
          showUserLocation={true}
          enableGeolocation={true}
          onLocationUpdate={(location) => {
            console.log('📍 Mise à jour position:', location);
            setCurrentLocation(location);
            if (!pickupLocation && updatePickup) {
              setPickupLocation(location);
              updatePickup(location);
            }
          }}
          onMapClick={handleMapClick}
          isSelectingOnMap={isSelectingOnMap}
        />

        {/* Indicateur de sélection */}
        {isSelectingOnMap && (
          <div className="absolute top-48 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-2xl text-sm font-semibold z-[900] flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>Touchez la carte pour sélectionner</span>
          </div>
        )}
      </div>

      {/* ========== PANNEAU INFÉRIEUR ========== */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl shadow-2xl">
        <div className="p-6 space-y-4">
          {/* Titre */}
          <h2 className="text-xl font-bold text-gray-900">Où allez-vous ?</h2>

          {/* Recherche de destination */}
          <YangoStyleSearch
            placeholder="Rechercher une destination..."
            onSelect={handleSearchSelect}
            currentLocation={currentLocation}
            value={searchQuery}
            onChange={setSearchQuery}
          />

          {/* Lieux favoris */}
          <div className="space-y-2">
            {/* Bouton Lieux favoris - CLIQUABLE */}
            <button
              onClick={() => setShowFavoritesModal(true)}
              className="flex items-center gap-2 text-sm text-gray-600 mb-3 hover:text-primary transition-colors"
            >
              <Star className="w-4 h-4" />
              <span>Lieux favoris</span>
            </button>

            {/* Domicile */}
            <button
              onClick={() => {
                if (state.homeAddress && updateDestination) {
                  // Définir le domicile comme destination
                  console.log('🏠 Domicile sélectionné comme destination:', state.homeAddress);
                  updateDestination(state.homeAddress);
                  setCurrentScreen('estimate');
                  toast('🏠 Destination: Domicile');
                } else {
                  // Pas d'adresse domicile configurée - proposer de la configurer
                  toast('🏠 Configurez votre adresse domicile', {
                    description: 'Utilisez la recherche ci-dessus pour trouver votre domicile'
                  });
                  setShowFavoritesModal(true);
                }
              }}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Home className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-gray-900">Domicile</p>
                {state.homeAddress ? (
                  <p className="text-xs text-gray-500 truncate">{state.homeAddress.address}</p>
                ) : (
                  <p className="text-xs text-gray-400">Appuyez pour configurer</p>
                )}
              </div>
            </button>

            {/* Travail */}
            <button
              onClick={() => {
                if (state.workAddress && updateDestination) {
                  // Définir le travail comme destination
                  console.log('💼 Travail sélectionné comme destination:', state.workAddress);
                  updateDestination(state.workAddress);
                  setCurrentScreen('estimate');
                  toast('💼 Destination: Travail');
                } else {
                  // Pas d'adresse travail configurée - proposer de la configurer
                  toast('💼 Configurez votre adresse de travail', {
                    description: 'Utilisez la recherche ci-dessus pour trouver votre lieu de travail'
                  });
                  setShowFavoritesModal(true);
                }
              }}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-gray-900">Travail</p>
                {state.workAddress ? (
                  <p className="text-xs text-gray-500 truncate">{state.workAddress.address}</p>
                ) : (
                  <p className="text-xs text-gray-400">Appuyez pour configurer</p>
                )}
              </div>
            </button>
          </div>

          {/* Instructions de prise en charge (optionnel) */}
          <div className="pt-2">
            <label className="text-sm text-gray-600 block mb-2">
              Instructions de prise en charge (optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: Devant l'entrée principale"
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Debug en bas */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs p-2 rounded z-[2000] pointer-events-none">
          <div>📍 Lat: {displayLat.toFixed(6)}</div>
          <div>📍 Lng: {displayLng.toFixed(6)}</div>
          <div>🗺️ Mode sélection: {isSelectingOnMap ? 'OUI' : 'NON'}</div>
        </div>
      )}

      {/* ========== MODAL TOUS LES LIEUX FAVORIS ========== */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                Lieux favoris
              </h3>
              <button
                onClick={() => setShowFavoritesModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* FavoriteLocations Component */}
            <div className="flex-1 overflow-y-auto p-6">
              <FavoriteLocations
                onSelectLocation={(location) => {
                  console.log('🎯 Favori sélectionné:', location);
                  if (updateDestination) {
                    updateDestination({
                      lat: location.lat,
                      lng: location.lng,
                      address: location.address
                    });
                    setShowFavoritesModal(false);
                    setCurrentScreen('estimate');
                    toast('⭐ Destination: Lieu favori');
                  }
                }}
                currentLocation={currentLocation}
                className=""
              />
            </div>

            {/* Footer - Actions */}
            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowFavoritesModal(false)}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}