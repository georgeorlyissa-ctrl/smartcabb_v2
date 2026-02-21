import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { motion, AnimatePresence } from '../lib/motion';
import { searchQuartiers, findNearbyQuartiers, QUARTIERS_KINSHASA, type Quartier } from '../lib/kinshasa-map-data';
import { searchLocationsByCommune, getLocationTypeLabel, type Location } from '../lib/kinshasa-locations-database';
import { searchProfessionalPlaces, getPlaceCoordinates, type ProfessionalPlace } from '../lib/professional-geocoding'; // 🆕 API PROFESSIONNELLE (Mapbox + Google)

// Icônes inline (évite import lucide-react)
const SearchIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

interface Address {
  id: string;
  name: string;
  description: string;
  coordinates: { lat: number; lng: number };
  distance?: number; // 🆕 Distance en km depuis la position actuelle (comme Yango)
  placeId?: string; // 🆕 Pour Google Places (obtenir coordonnées plus tard)
}

interface AddressSearchInputProps {
  placeholder?: string;
  onAddressSelect: (address: Address) => void;
  value?: string;
  onChange?: (value: string) => void;
  currentLocation?: { lat: number; lng: number; address: string }; // 🆕 Position actuelle pour filtrage contextuel
}

export function AddressSearchInput({ 
  placeholder = "Rechercher une adresse...", 
  onAddressSelect,
  value = "",
  onChange,
  currentLocation
}: AddressSearchInputProps) {
  // ✅ SOLUTION FINALE : State local avec synchronisation ONE-WAY (parent → enfant uniquement)
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Address[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ✅ Synchroniser SEULEMENT quand le parent change explicitement la valeur
  // (par exemple après un clear ou une réinitialisation)
  const isUserTypingRef = useRef(false);
  
  useEffect(() => {
    // Ne synchroniser que si l'utilisateur ne tape PAS actuellement
    if (!isUserTypingRef.current && value !== inputValue) {
      console.log('🔄 Synchronisation parent → enfant:', value);
      setInputValue(value);
    }
  }, [value]);

  // Calculer la position du dropdown
  const updateDropdownPosition = () => {
    if (searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const handleSearch = (query: string) => {
    // ✅ ÉTAPE 1: Mettre à jour le state local IMMÉDIATEMENT
    setInputValue(query);
    isUserTypingRef.current = true;
    
    // ✅ ÉTAPE 2: Notifier le parent
    onChange?.(query);
    
    if (query.length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      isUserTypingRef.current = false;
      return;
    }

    setIsLoading(true);
    updateDropdownPosition();
    
    // 🌍 RECHERCHE SIMPLE : JUSTE MAPBOX (comme Uber/Yango)
    setTimeout(async () => {
      const queryLower = query.toLowerCase().trim();
      
      console.log('🌍 ===== RECHERCHE ADRESSE DÉMARRÉE =====');
      console.log(`🔍 Query: "${query}"`);
      console.log(`📍 Position actuelle:`, currentLocation);
      
      try {
        // 🚀 RECHERCHE AVEC API PROFESSIONNELLES (Mapbox ou Google Places)
        const professionalResults = await searchProfessionalPlaces(queryLower, currentLocation);
        
        console.log(`✅ Résultats professionnels: ${professionalResults.length}`);
        professionalResults.forEach((result, i) => {
          console.log(`  ${i + 1}. ${result.name} (${result.source}) - ${result.distance !== undefined ? ((result.distance || 0).toFixed(1)) + ' km' : 'distance inconnue'}`);
        });
        
        // Convertir au format Address
        const suggestions: Address[] = professionalResults.map((place, index) => ({
          id: place.id,
          name: place.name,
          description: place.description,
          coordinates: place.coordinates,
          distance: place.distance,
          placeId: place.placeId // 🆕 Pour Google Places
        }));
        
        console.log(`🎯 ${suggestions.length} suggestions à afficher`);
        console.log('🌍 ===== RECHERCHE TERMINÉE =====');
        
        setSuggestions(suggestions);
        setIsOpen(suggestions.length > 0);
        setIsLoading(false);
        isUserTypingRef.current = false;
        
      } catch (error) {
        console.error('❌ Erreur recherche professionnelle:', error);
        setSuggestions([]);
        setIsOpen(false);
        setIsLoading(false);
        isUserTypingRef.current = false;
      }
    }, 300); // Délai anti-spam
  };

  const handleAddressSelect = async (address: Address) => {
    console.log('==========================================');
    console.log('🔍 handleAddressSelect APPELÉ');
    console.log('📍 Adresse sélectionnée:', address.name);
    console.log('📊 placeId:', address.placeId);
    console.log('📊 coordinates:', address.coordinates);
    console.log('==========================================');
    
    // ✅ ÉTAPE 1: Mettre à jour inputValue IMMÉDIATEMENT
    setInputValue(address.name);
    console.log('✅ setInputValue appelé avec:', address.name);
    
    // ✅ ÉTAPE 2: Notifier le parent
    if (onChange) {
      onChange(address.name);
      console.log('✅ onChange(parent) appelé avec:', address.name);
    }
    
    // ✅ ÉTAPE 3: Fermer le dropdown immédiatement pour améliorer l'UX
    setIsOpen(false);
    setSuggestions([]);
    console.log('✅ Dropdown fermé');
    
    // ✅ ÉTAPE 4: Si c'est un Google Places sans coordonnées, les récupérer
    if (address.placeId && (!address.coordinates || !address.coordinates.lat)) {
      console.log('📍 Récupération des coordonnées pour Google Places...');
      setIsLoading(true);
      
      try {
        const details = await getPlaceCoordinates(address.placeId);
        
        if (details) {
          console.log('✅ Coordonnées récupérées:', details.coordinates);
          
          // Créer un nouvel objet address avec les coordonnées
          const completeAddress: Address = {
            ...address,
            coordinates: details.coordinates,
            name: details.name || address.name,
            description: address.description
          };
          
          // ✅ ÉTAPE 5: Appeler onAddressSelect avec les coordonnées complètes
          onAddressSelect(completeAddress);
          console.log('✅ onAddressSelect appelé avec coordonnées complètes');
        } else {
          console.error('❌ Impossible de récupérer les coordonnées');
          // Fallback: appeler quand même avec l'adresse originale
          onAddressSelect(address);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la récupération des coordonnées:', error);
        // Fallback: appeler quand même avec l'adresse originale
        onAddressSelect(address);
      } finally {
        setIsLoading(false);
      }
    } else {
      // ✅ ÉTAPE 5: Coordonnées déjà présentes, appeler directement onAddressSelect
      onAddressSelect(address);
      console.log('✅ onAddressSelect appelé avec coordonnées existantes');
    }
    
    console.log('==========================================');
    console.log('🎉 handleAddressSelect TERMINÉ');
    console.log('==========================================');
  };

  const clearSearch = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    onChange?.('');
  };

  // Rendu du dropdown
  const dropdownContent = (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        zIndex: 99999,
        pointerEvents: 'auto'
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-y-auto"
    >
      {isLoading ? (
        <div className="p-4 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Recherche...</p>
        </div>
      ) : (
        suggestions.map((address) => (
          <button
            key={address.id}
            onMouseDown={(e) => {
              e.preventDefault(); // ✅ CRUCIAL : Empêcher le blur de l'input
              handleAddressSelect(address);
            }}
            className="w-full px-4 py-4 text-left hover:bg-green-50 active:bg-green-100 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-green-50"
          >
            <div className="flex items-start space-x-3">
              <MapPinIcon className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 leading-snug">{address.name}</p>
                <p className="text-sm text-gray-700 mt-1 leading-relaxed">{address.description}</p>
              </div>
              {/* 🆕 DISTANCE COMME YANGO */}
              {address.distance !== undefined && (
                <div className="flex-shrink-0 ml-2">
                  <p className="text-sm font-medium text-gray-500">{(address.distance || 0).toFixed(1)} km</p>
                </div>
              )}
            </div>
          </button>
        ))
      )}
      
      {!isLoading && suggestions.length === 0 && value.length >= 2 && (
        <div className="p-6 text-center text-gray-600">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <MapPinIcon className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">Lieu introuvable</p>
          <p className="text-sm text-gray-600 mb-2">Ce lieu n'existe pas dans notre base de données</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-xs text-blue-800 font-medium mb-1">💡 Suggestions :</p>
            <p className="text-xs text-blue-700">• Vérifiez l'orthographe</p>
            <p className="text-xs text-blue-700">• Utilisez le nom d'un quartier ou lieu connu</p>
            <p className="text-xs text-blue-700">• Essayez un point de repère proche</p>
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <>
      <div ref={searchRef} className="relative w-full">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={placeholder}
            className="pl-11 pr-10 h-12 bg-white border-gray-200 rounded-xl shadow-sm"
            onFocus={() => {
              updateDropdownPosition();
              if (suggestions.length > 0) {
                setIsOpen(true);
              }
            }}
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Portail pour afficher les suggestions au-dessus de tout */}
      {typeof document !== 'undefined' && isOpen && (suggestions.length > 0 || isLoading) && createPortal(
        <AnimatePresence>
          {dropdownContent}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}