import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from '../../lib/icons';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface NominatimPlacesSearchProps {
  onSelectPlace: (place: {
    description: string;
    lat: number;
    lng: number;
  }) => void;
  placeholder?: string;
  value?: string;
  className?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

/**
 * 🆓 ALTERNATIVE 100% GRATUITE à Google Places API
 * Utilise Nominatim (OpenStreetMap) - Aucun coût, aucune clé API requise
 * 
 * Avantages :
 * ✅ Totalement gratuit
 * ✅ Pas de limite de requêtes stricte
 * ✅ Pas de clé API nécessaire
 * ✅ Données OpenStreetMap de qualité
 * 
 * Limitations :
 * ⚠️ Limité à 1 requête par seconde (fair use)
 * ⚠️ Moins de résultats que Google dans certaines zones
 */
export function NominatimPlacesSearch({ 
  onSelectPlace, 
  placeholder = "Rechercher une adresse...",
  value = "",
  className = ""
}: NominatimPlacesSearchProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Suggestions locales pour Kinshasa en fallback
  const localSuggestions = [
    { name: 'Gombe', lat: -4.3217, lng: 15.3125 },
    { name: 'Ngaliema', lat: -4.3789, lng: 15.2719 },
    { name: 'Limete', lat: -4.3667, lng: 15.3333 },
    { name: 'Bandalungwa', lat: -4.3515, lng: 15.2947 },
    { name: 'Kalamu', lat: -4.3333, lng: 15.3167 },
    { name: 'Kintambo', lat: -4.3219, lng: 15.2831 },
    { name: 'Barumbu', lat: -4.3167, lng: 15.3167 },
    { name: 'Lingwala', lat: -4.3167, lng: 15.3000 },
    { name: 'Kinshasa', lat: -4.3276, lng: 15.3136 },
    { name: 'Matete', lat: -4.3833, lng: 15.3000 },
    { name: 'Lemba', lat: -4.3833, lng: 15.2667 },
    { name: 'Ngaba', lat: -4.3667, lng: 15.2833 },
    { name: 'Selembao', lat: -4.3833, lng: 15.2833 },
    { name: 'Makala', lat: -4.4000, lng: 15.2667 },
    { name: 'Bumbu', lat: -4.4167, lng: 15.2833 },
    { name: 'Kasa-Vubu', lat: -4.3500, lng: 15.3000 },
    { name: 'Mont-Ngafula', lat: -4.4167, lng: 15.2667 },
    { name: 'Ngiri-Ngiri', lat: -4.3667, lng: 15.3000 },
  ];

  // Fonction pour obtenir les suggestions d'adresses via Nominatim
  const fetchPredictions = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 3) {
      // Si moins de 3 caractères, afficher suggestions locales
      const filtered = localSuggestions
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
        .map((s, i) => ({
          place_id: i,
          display_name: `${s.name}, Kinshasa, RDC`,
          lat: s.lat.toString(),
          lon: s.lng.toString(),
          type: 'local'
        }));
      setPredictions(filtered);
      return;
    }

    setIsLoading(true);

    try {
      // Nominatim API - 100% GRATUIT
      // Documentation : https://nominatim.org/release-docs/latest/api/Search/
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
          q: searchQuery + ', Kinshasa, RDC',
          format: 'json',
          addressdetails: '1',
          limit: '10',
          countrycodes: 'cd', // Limiter à la RDC
          'accept-language': 'fr'
        }),
        {
          headers: {
            // User-Agent requis par Nominatim (fair use policy)
            'User-Agent': 'SmartCabb/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erreur Nominatim');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        setPredictions(data);
      } else {
        // Si aucun résultat, afficher suggestions locales
        const filtered = localSuggestions
          .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .slice(0, 5)
          .map((s, i) => ({
            place_id: i,
            display_name: `${s.name}, Kinshasa, RDC`,
            lat: s.lat.toString(),
            lon: s.lng.toString(),
            type: 'local'
          }));
        setPredictions(filtered);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche Nominatim:', error);
      
      // Fallback : Suggestions locales
      const filtered = localSuggestions
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
        .map((s, i) => ({
          place_id: i,
          display_name: `${s.name}, Kinshasa, RDC`,
          lat: s.lat.toString(),
          lon: s.lng.toString(),
          type: 'local'
        }));
      setPredictions(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  // Effet pour la recherche avec debounce (1 seconde pour respecter Nominatim fair use)
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce de 1 seconde (requis par Nominatim)
    timeoutRef.current = setTimeout(() => {
      fetchPredictions(query);
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  const handleSelectPrediction = (prediction: NominatimResult) => {
    setQuery(prediction.display_name);
    setShowSuggestions(false);
    setPredictions([]);

    onSelectPlace({
      description: prediction.display_name,
      lat: parseFloat(prediction.lat),
      lng: parseFloat(prediction.lon)
    });
  };

  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setShowSuggestions(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-base"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
        )}
        {!isLoading && query && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Badge "100% Gratuit" */}
      {query.length === 0 && (
        <div className="absolute top-full left-0 mt-1">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
            🆓 100% Gratuit - OpenStreetMap
          </span>
        </div>
      )}

      {/* Liste des suggestions */}
      {showSuggestions && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0"
            >
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">{prediction.display_name}</p>
                {prediction.type === 'local' && (
                  <p className="text-xs text-blue-600 mt-1">📍 Suggestion locale</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Message si aucun résultat */}
      {showSuggestions && !isLoading && query.length >= 3 && predictions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <p className="text-sm text-gray-500 text-center">
            Aucune adresse trouvée pour "{query}"
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">
            Essayez un nom de commune (Gombe, Ngaliema, Limete...)
          </p>
        </div>
      )}
    </div>
  );
}