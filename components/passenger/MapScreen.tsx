import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { GoogleMapView } from '../GoogleMapView';
import { YangoStyleSearch } from './YangoStyleSearch';
import { FavoriteLocations } from './FavoriteLocations';
import { SmartCabbPromoSection } from './SmartCabbPromoSection';
import { PassengerLanguageSelector } from './PassengerLanguageSelector';
import { reverseGeocode } from '../../lib/precise-gps';
import { toast } from '../../lib/toast';

const MapPin = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const Home = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>);
const Briefcase = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>);
const Star = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="currentColor" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>);
const Plus = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>);
const Menu = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>);
const User = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);
const Loader2 = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>);

interface Location { lat: number; lng: number; address?: string; }

export function MapScreen() {
  const appState = useAppState();
  const { state, setCurrentScreen } = appState;
  const { t } = useTranslation();
  const updatePickup = appState.updatePickup || appState.setPickup;
  const updateDestination = appState.updateDestination || appState.setDestination;

  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem('smartcabb_dark_mode') === 'true'; } catch { return false; }
  });
  const toggleDark = () => {
    setIsDark(prev => {
      const next = !prev;
      try {
        localStorage.setItem('smartcabb_dark_mode', String(next));
        if (next) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } catch {}
      return next;
    });
  };

  const [currentLocation, setCurrentLocation] = useState<Location>({ lat: -4.3276, lng: 15.3136, address: 'Kinshasa, RDC' });
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);

  // ✅ FIX: useRef pour éviter la boucle infinie de destination
  const defaultDestinationSet = useRef(false);

  useEffect(() => {
    const shouldSetDefault = !defaultDestinationSet.current && !state.destination;

    if ('geolocation' in navigator) {
      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLoadingAddress(true);
          const address = await reverseGeocode(lat, lng);
          const location = { lat, lng, address };
          setCurrentLocation(location);
          setPickupLocation(location);
          if (updatePickup) updatePickup(location);
          setLoadingAddress(false);
          setLoadingLocation(false);
          if (shouldSetDefault && updateDestination) {
            defaultDestinationSet.current = true;
            updateDestination({ lat: -4.3856, lng: 15.4446, address: "Aéroport International de N'djili, Kinshasa" });
          }
        },
        (error) => {
          if (error.code === 1) {
            toast.info('📍 Sélectionnez votre position en touchant la carte', { duration: 5000 });
          }
          setLoadingLocation(false);
          if (shouldSetDefault && updatePickup && updateDestination) {
            defaultDestinationSet.current = true;
            updatePickup({ lat: -4.3276, lng: 15.3136, address: 'Centre-ville de Kinshasa' });
            updateDestination({ lat: -4.3856, lng: 15.4446, address: "Aéroport International de N'djili, Kinshasa" });
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      setLoadingLocation(false);
      if (shouldSetDefault && updatePickup && updateDestination) {
        defaultDestinationSet.current = true;
        updatePickup({ lat: -4.3276, lng: 15.3136, address: 'Centre-ville de Kinshasa' });
        updateDestination({ lat: -4.3856, lng: 15.4446, address: "Aéroport International de N'djili, Kinshasa" });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const address = await reverseGeocode(lat, lng);
      const location = { lat, lng, address };
      setPickupLocation(location);
      if (updatePickup) updatePickup(location);
    } catch {
      const location = { lat, lng, address: 'Position sélectionnée' };
      setPickupLocation(location);
      if (updatePickup) updatePickup(location);
    } finally {
      setLoadingAddress(false);
    }
  }, [updatePickup]);

  const handleSearchSelect = (result: any) => {
    if (result.coordinates && updateDestination) {
      updateDestination({ lat: result.coordinates.lat, lng: result.coordinates.lng, address: result.name || result.description });
      setCurrentScreen('estimate');
    }
  };

  const displayAddress = pickupLocation?.address || currentLocation.address;

  return (
    <div className="h-screen w-full flex flex-col bg-white relative">

      {/* ========== HEADER ========== */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white shadow-md">
        <div className="flex items-center justify-between px-3 py-2.5 gap-1.5">

          {/* Menu gauche */}
          <button
            onClick={() => setCurrentScreen('profile')}
            className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0"
          >
            <Menu className="w-4 h-4 text-gray-700" />
          </button>

          {/* Titre */}
          <h1 className="text-base font-bold text-gray-900 flex-1 text-center">SmartCabb</h1>

          {/* Droite : Langue + Dark + Profil */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* ✅ SÉLECTEUR DE LANGUE — bouton drapeau compact */}
            <PassengerLanguageSelector compact />

            {/* Dark mode */}
            <button
              onClick={toggleDark}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Mode sombre"
            >
              <span className="text-sm">{isDark ? '☀️' : '🌙'}</span>
            </button>

            {/* Profil */}
            <button
              onClick={() => setCurrentScreen('profile')}
              className="w-9 h-9 rounded-full bg-cyan-600 text-white shadow-md flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Position actuelle */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <div className="bg-green-500 p-2 rounded-full flex-shrink-0">
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
                ) : displayAddress}
              </p>
              {!loadingLocation && <p className="text-xs text-gray-400">±33m</p>}
            </div>
            {!loadingLocation && (
              <button
                onClick={() => {
                  const next = !isSelectingOnMap;
                  setIsSelectingOnMap(next);
                  if (next) toast.info('📍 Mode sélection activé', { description: 'Touchez la carte pour choisir votre position' });
                }}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isSelectingOnMap ? 'bg-cyan-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
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
            setCurrentLocation(location);
            if (!pickupLocation && updatePickup) { setPickupLocation(location); updatePickup(location); }
          }}
          onMapClick={handleMapClick}
          isSelectingOnMap={isSelectingOnMap}
        />
        {isSelectingOnMap && (
          <div className="absolute top-48 left-1/2 -translate-x-1/2 bg-cyan-600 text-white px-6 py-3 rounded-full shadow-2xl text-sm font-semibold z-[900] flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>Touchez la carte pour sélectionner</span>
          </div>
        )}
      </div>

      {/* ========== PANNEAU INFÉRIEUR ========== */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl shadow-2xl" style={{ maxHeight: '52vh' }}>
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-8 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="overflow-y-auto px-4 pb-5 space-y-2.5" style={{ maxHeight: 'calc(52vh - 24px)' }}>

          {/* Départ */}
          <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <p className="flex-1 text-xs font-medium text-gray-700 truncate">
              {pickupLocation?.address || 'Ma position actuelle'}
            </p>
            <button
              onClick={() => setIsSelectingOnMap(true)}
              className="text-[10px] text-cyan-600 font-semibold flex-shrink-0 bg-cyan-50 px-2 py-0.5 rounded-full"
            >
              {t('edit') || 'Modifier'}
            </button>
          </div>

          <h2 className="text-base font-bold text-gray-900 px-0.5">{t('where_to') || 'Où allez-vous ?'}</h2>

          <YangoStyleSearch
            placeholder={t('enter_destination') || 'Rechercher une destination...'}
            onSelect={handleSearchSelect}
            currentLocation={currentLocation}
            value={searchQuery}
            onChange={setSearchQuery}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (state.homeAddress && updateDestination) { updateDestination(state.homeAddress); setCurrentScreen('estimate'); }
                else setShowFavoritesModal(true);
              }}
              className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <Home className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-gray-900">{t('home') || 'Domicile'}</p>
                <p className="text-[9px] text-gray-400 truncate">{state.homeAddress ? state.homeAddress.address : 'Non configuré'}</p>
              </div>
            </button>

            <button
              onClick={() => {
                if (state.workAddress && updateDestination) { updateDestination(state.workAddress); setCurrentScreen('estimate'); }
                else setShowFavoritesModal(true);
              }}
              className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-gray-900">{t('work') || 'Travail'}</p>
                <p className="text-[9px] text-gray-400 truncate">{state.workAddress ? state.workAddress.address : 'Non configuré'}</p>
              </div>
            </button>
          </div>

          <SmartCabbPromoSection />
        </div>
      </div>

      {/* Modal lieux favoris */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-end justify-center">
          <div className="bg-white rounded-t-3xl shadow-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                Lieux favoris
              </h3>
              <button onClick={() => setShowFavoritesModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FavoriteLocations
                onSelectLocation={(location) => {
                  if (updateDestination) {
                    updateDestination({ lat: location.lat, lng: location.lng, address: location.address });
                    setShowFavoritesModal(false);
                    setCurrentScreen('estimate');
                  }
                }}
                currentLocation={currentLocation}
                className=""
              />
            </div>
            <div className="p-6 border-t bg-gray-50">
              <button onClick={() => setShowFavoritesModal(false)} className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
