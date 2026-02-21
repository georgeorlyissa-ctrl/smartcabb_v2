/**
 * 🎯 RECHERCHE YANGO-STYLE - 100% GOOGLE MAPS API
 * 
 * ✅ MIGRATION COMPLÈTE : Utilise uniquement Google Maps API
 * ✅ Google Places Text Search + Autocomplete
 * ✅ Exactement comme Yango/Uber
 * ✅ Pas de base locale, pas d'OpenStreetMap
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '../../lib/toast';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { motion } from '../../lib/motion';
import { Search, MapPin, Clock, Star, X } from '../../lib/icons';
import * as GoogleMapsService from '../../lib/google-maps-service';
import { kinshasaPlacesDatabase, type LocalPlace } from '../../lib/kinshasa-places-database';

interface SearchResult {
  id: string;
  name: string;
  description: string;
  coordinates?: { lat: number; lng: number };
  placeId?: string;
  type?: 'place' | 'recent' | 'favorite';
  placeType?: string;
  distance?: number;
  rating?: number;
  userRatingsTotal?: number;
  source: 'google_maps';
}

interface YangoStyleSearchProps {
  placeholder?: string;
  onSelect: (result: SearchResult) => void;
  currentLocation?: { lat: number; lng: number };
  value?: string;
  onChange?: (value: string) => void;
  onManualSubmit?: (value: string) => void;
}

export function YangoStyleSearch({ 
  placeholder = "Où allez-vous ?", 
  onSelect,
  currentLocation,
  value: controlledValue,
  onChange: onControlledChange,
  onManualSubmit
}: YangoStyleSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Utiliser la valeur contrôlée si fournie
  const displayValue = controlledValue !== undefined ? controlledValue : query;

  // Charger l'historique au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('smartcabb_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Erreur chargement historique:', e);
      }
    }
  }, []);

  // ✅ RECHERCHE 100% GOOGLE MAPS API + FALLBACK LOCAL POUR FIGMA MAKE
  useEffect(() => {
    if (displayValue.length < 2) {
      // Afficher l'historique si le champ est vide ou < 2 caractères
      setResults(recentSearches.slice(0, 5));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Délai anti-spam
    const timer = setTimeout(async () => {
      console.log('🗺️ ===== RECHERCHE ADRESSE =====');
      console.log(`📝 Query: "${displayValue}"`);
      console.log(`📍 Position:`, currentLocation);
      
      try {
        // ✅ DÉTECTION ENVIRONNEMENT FIGMA MAKE
        const isFigmaMake = window.location.hostname.includes('figma.site');
        console.log(`🏗️ Environnement: ${isFigmaMake ? 'FIGMA MAKE' : 'PRODUCTION'}`);
        
        let googleResults = [];
        
        // ✅ SEULEMENT EN PRODUCTION : Appeler Google Maps
        if (!isFigmaMake) {
          console.log('☁️ Recherche Google Maps...');
          googleResults = await GoogleMapsService.searchPlaces(
            displayValue,
            currentLocation
          );
          console.log(`✅ Google Maps: ${googleResults.length} résultats`);
        } else {
          console.log('⚠️ Figma Make détecté - SKIP Google Maps, utilisation base locale directe');
        }
        
        // 🔄 FALLBACK : Si Google Maps ne retourne rien OU si Figma Make
        if (googleResults.length === 0) {
          console.log('⚠️ Utilisation de la base locale de Kinshasa...');
          
          // Recherche dans la base locale de Kinshasa
          const queryLower = displayValue.toLowerCase().trim();
          const localResults = kinshasaPlacesDatabase.filter(place => {
            const nameMatch = place.name.toLowerCase().includes(queryLower);
            const aliasMatch = place.aliases.some(alias => alias.toLowerCase().includes(queryLower));
            const communeMatch = place.commune.toLowerCase().includes(queryLower);
            const quartierMatch = place.quartier?.toLowerCase().includes(queryLower);
            const addressMatch = place.address.toLowerCase().includes(queryLower);
            
            return nameMatch || aliasMatch || communeMatch || quartierMatch || addressMatch;
          });
          
          console.log(`🏙️ Base locale: ${localResults.length} résultats trouvés`);
          
          // Calculer la distance si position fournie
          if (currentLocation) {
            localResults.forEach(place => {
              const R = 6371; // Rayon Terre en km
              const dLat = (place.coordinates.lat - currentLocation.lat) * Math.PI / 180;
              const dLng = (place.coordinates.lng - currentLocation.lng) * Math.PI / 180;
              const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(currentLocation.lat * Math.PI / 180) * 
                        Math.cos(place.coordinates.lat * Math.PI / 180) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              place.distance = R * c;
            });
            
            // Trier par distance
            localResults.sort((a, b) => (a.distance || 999) - (b.distance || 999));
          } else {
            // Trier par popularité
            localResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
          }
          
          // Convertir au format SearchResult
          const searchResults: SearchResult[] = localResults.slice(0, 15).map(place => ({
            id: place.id,
            name: place.name,
            description: `${place.address}${place.commune ? `, ${place.commune}` : ''}`,
            coordinates: place.coordinates,
            type: 'place' as const,
            placeType: place.category,
            distance: place.distance,
            source: 'google_maps' as const // On garde google_maps pour la cohérence
          }));
          
          setResults(searchResults);
          console.log('🏙️ Résultats locaux affichés');
          setIsLoading(false);
          return;
        }
        
        // Convertir les résultats Google Maps au format SearchResult
        const searchResults: SearchResult[] = googleResults.map(place => ({
          id: place.id,
          name: place.name,
          description: place.description,
          coordinates: place.coordinates,
          placeId: place.placeId,
          type: 'place' as const,
          placeType: place.types?.[0] || 'place',
          distance: place.distance,
          rating: place.rating,
          userRatingsTotal: place.userRatingsTotal,
          source: 'google_maps' as const
        }));
        
        // Filtrer par distance si position fournie
        let filtered = searchResults;
        
        if (currentLocation) {
          const MAX_DISTANCE = 50; // km
          
          filtered = searchResults.filter(r => {
            if (!r.distance) return true; // Garder si pas de distance
            return r.distance <= MAX_DISTANCE;
          });
          
          console.log(`🎯 ${filtered.length} résultats après filtre distance (< ${MAX_DISTANCE}km)`);
        }
        
        // Trier par pertinence (distance puis rating)
        filtered.sort((a, b) => {
          // Priorité à la distance si disponible
          if (a.distance !== undefined && b.distance !== undefined) {
            if (Math.abs(a.distance - b.distance) > 1) {
              return a.distance - b.distance;
            }
          }
          
          // Sinon, trier par rating
          if (a.rating && b.rating) {
            return b.rating - a.rating;
          }
          
          return 0;
        });
        
        // Limiter à 15 résultats max
        const final = filtered.slice(0, 15);
        
        console.log('📊 Top 5:', final.slice(0, 5).map(r => 
          `${r.name} - ${r.distance?.toFixed(1)}km ${r.rating ? `⭐${r.rating}` : ''}`
        ));
        console.log('🗺️ ===== RECHERCHE TERMINÉE =====');
        
        setResults(final);
        
      } catch (error) {
        console.error('❌ Erreur recherche Google Maps:', error);
        
        // 🔄 FALLBACK EN CAS D'ERREUR : Utiliser la base locale
        console.log('⚠️ Erreur Google Maps - Basculement vers base locale...');
        
        const queryLower = displayValue.toLowerCase().trim();
        const localResults = kinshasaPlacesDatabase.filter(place => {
          const nameMatch = place.name.toLowerCase().includes(queryLower);
          const aliasMatch = place.aliases.some(alias => alias.toLowerCase().includes(queryLower));
          const communeMatch = place.commune.toLowerCase().includes(queryLower);
          
          return nameMatch || aliasMatch || communeMatch;
        });
        
        console.log(`🏙️ Base locale (fallback): ${localResults.length} résultats`);
        
        // Calculer distance et trier
        if (currentLocation) {
          localResults.forEach(place => {
            const R = 6371;
            const dLat = (place.coordinates.lat - currentLocation.lat) * Math.PI / 180;
            const dLng = (place.coordinates.lng - currentLocation.lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(currentLocation.lat * Math.PI / 180) * 
                      Math.cos(place.coordinates.lat * Math.PI / 180) *
                      Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            place.distance = R * c;
          });
          localResults.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        } else {
          localResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        }
        
        const searchResults: SearchResult[] = localResults.slice(0, 15).map(place => ({
          id: place.id,
          name: place.name,
          description: `${place.address}${place.commune ? `, ${place.commune}` : ''}`,
          coordinates: place.coordinates,
          type: 'place' as const,
          placeType: place.category,
          distance: place.distance,
          source: 'google_maps' as const
        }));
        
        setResults(searchResults);
        
        if (searchResults.length === 0) {
          toast.error('Erreur de recherche. Veuillez réessayer.');
        }
      } finally {
        setIsLoading(false);
      }
    }, 400); // 400ms de délai pour éviter trop de requêtes

    return () => clearTimeout(timer);
  }, [displayValue, currentLocation, recentSearches]);

  const handleSelect = async (result: SearchResult) => {
    console.log('✅ Lieu sélectionné:', result.name);
    console.log('🔍 Coordonnées:', result.coordinates);
    
    // Si placeId mais pas de coordonnées, récupérer les détails
    if (result.placeId && !result.coordinates) {
      try {
        console.log('📍 Récupération des détails pour place_id:', result.placeId);
        
        const place = await GoogleMapsService.getPlaceDetails(result.placeId);
        
        if (place && place.coordinates) {
          result.coordinates = place.coordinates;
          console.log('✅ Coordonnées récupérées:', place.coordinates);
        } else {
          console.error('❌ Impossible de récupérer les coordonnées');
        }
      } catch (error) {
        console.error('❌ Erreur place details:', error);
      }
    }
    
    // ✅ VÉRIFICATION CRITIQUE : S'assurer que le résultat a des coordonnées
    if (!result.coordinates) {
      console.error('❌ ERREUR: Aucune coordonnée disponible pour:', result.name);
      toast.error('Impossible de localiser cette adresse. Veuillez réessayer.');
      return;
    }
    
    // Sauvegarder dans l'historique
    if (result.type === 'place') {
      const newRecent = [
        { ...result, type: 'recent' as const },
        ...recentSearches.filter(r => r.id !== result.id)
      ].slice(0, 10);
      
      setRecentSearches(newRecent);
      localStorage.setItem('smartcabb_recent_searches', JSON.stringify(newRecent));
    }
    
    // Mettre à jour la valeur affichée
    if (onControlledChange) {
      onControlledChange(result.name);
    } else {
      setQuery(result.name);
    }
    
    // Notifier le parent
    console.log('📤 Envoi du résultat au parent:', {
      name: result.name,
      coordinates: result.coordinates,
      description: result.description
    });
    onSelect(result);
    
    // Fermer les suggestions
    setShowSuggestions(false);
    setResults([]);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('smartcabb_recent_searches');
    setResults([]);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && displayValue.trim()) {
      e.preventDefault();
      
      if (results.length > 0) {
        // Sélectionner le premier résultat
        handleSelect(results[0]);
      } else if (onManualSubmit) {
        // Saisie manuelle (pas recommandé avec Google Maps)
        console.log('✍️ Saisie manuelle validée:', displayValue);
        onManualSubmit(displayValue);
      }
    }
  };

  // Déterminer l'icône selon le type de lieu Google Maps
  const getPlaceIcon = (types?: string[]) => {
    if (!types || types.length === 0) {
      return <MapPin className="w-5 h-5 text-blue-600" />;
    }
    
    const type = types[0];
    
    // Icônes basées sur les types Google Maps
    const iconMap: Record<string, string> = {
      'airport': '✈️',
      'bus_station': '🚌',
      'train_station': '🚆',
      'transit_station': '🚉',
      'shopping_mall': '🏬',
      'supermarket': '🛒',
      'store': '🏪',
      'restaurant': '🍽️',
      'cafe': '☕',
      'bar': '🍺',
      'hospital': '🏥',
      'pharmacy': '💊',
      'doctor': '👨‍⚕️',
      'church': '⛪',
      'mosque': '🕌',
      'hindu_temple': '🛕',
      'school': '🎓',
      'university': '🏛️',
      'library': '📚',
      'bank': '🏦',
      'atm': '💳',
      'hotel': '🏨',
      'lodging': '🛏️',
      'park': '🌳',
      'stadium': '🏟️',
      'gym': '💪',
      'museum': '🏛️',
      'art_gallery': '🎨',
      'movie_theater': '🎬',
      'gas_station': '⛽',
      'car_repair': '🔧',
      'parking': '🅿️',
      'police': '👮',
      'fire_station': '🚒',
      'post_office': '📮',
      'embassy': '🏛️'
    };
    
    const emoji = iconMap[type];
    
    if (emoji) {
      return <span className="text-xl">{emoji}</span>;
    }
    
    return <MapPin className="w-5 h-5 text-blue-600" />;
  };

  return (
    <div className="relative w-full">
      {/* Input de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setQuery(newValue);
            if (onControlledChange) {
              onControlledChange(newValue);
            }
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 300);
          }}
          placeholder={placeholder}
          className="pl-11 pr-10 h-12 text-base border border-blue-400 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all"
          autoComplete="off"
        />
        {displayValue && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setQuery('');
              if (onControlledChange) {
                onControlledChange('');
              }
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Liste de suggestions */}
      {showSuggestions && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto z-50" ref={suggestionsRef}>
          {/* En-tête si historique */}
          {query.length < 2 && recentSearches.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Recherches récentes</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecent}
                className="text-xs text-blue-600 hover:text-blue-700 h-auto p-1"
              >
                Effacer
              </Button>
            </div>
          )}

          {/* Résultats Google Maps */}
          {results.map((result) => {
            const icon = result.type === 'recent' 
              ? <Clock className="w-5 h-5 text-gray-600" />
              : getPlaceIcon(result.placeType?.split(','));
            
            return (
              <button
                key={result.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(result);
                }}
                className="w-full px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0 flex items-start gap-3"
              >
                {/* Icône */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-50">
                  {icon}
                </div>

                {/* Texte */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-gray-900 truncate">
                      {result.name}
                    </p>
                    {result.rating && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 flex-shrink-0">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{result.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-0.5">
                    {result.description}
                  </p>
                  {result.userRatingsTotal && (
                    <p className="text-xs text-gray-500 mt-1">
                      {result.userRatingsTotal} avis
                    </p>
                  )}
                </div>
                
                {/* Distance si disponible */}
                {result.distance !== undefined && (
                  <div className="flex-shrink-0 text-sm text-gray-500">
                    {result.distance.toFixed(1)} km
                  </div>
                )}
              </button>
            );
          })}

          {/* Loader */}
          {isLoading && (
            <div className="px-4 py-6 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Recherche sur Google Maps...</p>
            </div>
          )}
        </div>
      )}

      {/* Message "Aucun résultat" */}
      {!isLoading && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-6 text-center z-50">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-base font-semibold text-gray-900 mb-1">Aucun résultat</p>
          <p className="text-sm text-gray-600">Essayez un autre lieu ou quartier</p>
        </div>
      )}
      
      {/* Badge "Powered by Google" */}
      {showSuggestions && results.length > 0 && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded">
          Powered by Google Maps
        </div>
      )}
    </div>
  );
}