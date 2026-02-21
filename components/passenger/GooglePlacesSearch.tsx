import { useEffect, useState } from 'react';
import { Search, MapPin, X, Loader2 } from '../../lib/icons';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import * as GoogleMapsService from '../../lib/google-maps-service';
import { toast } from '../../lib/toast';

interface GooglePlacesSearchProps {
  onSelectPlace: (place: {
    description: string;
    lat: number;
    lng: number;
  }) => void;
  placeholder?: string;
  value?: string;
  className?: string;
  currentLocation?: { lat: number; lng: number };
}

interface Prediction {
  id: string;
  name: string;
  description: string;
  coordinates: { lat: number; lng: number };
  placeId?: string;
}

export function GooglePlacesSearch({ 
  onSelectPlace, 
  placeholder = "Rechercher une adresse...",
  value = "",
  className = "",
  currentLocation
}: GooglePlacesSearchProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // ✅ Recherche via le backend SmartCabb (Google Maps API)
  const fetchPredictions = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔍 Recherche Google Places via backend:', searchQuery);
      
      // ✅ UTILISER LE SERVICE BACKEND AU LIEU D'APPELER DIRECTEMENT L'API
      const results = await GoogleMapsService.searchPlaces(
        searchQuery,
        currentLocation || { lat: -4.3276, lng: 15.3136 } // Position par défaut: Kinshasa
      );
      
      console.log('✅ Résultats reçus:', results.length);

      // Convertir les résultats au format attendu
      const formattedPredictions: Prediction[] = results.map(result => ({
        id: result.id,
        name: result.name,
        description: result.description,
        coordinates: result.coordinates,
        placeId: result.placeId
      }));

      setPredictions(formattedPredictions);
      
      if (formattedPredictions.length === 0) {
        console.warn('⚠️ Aucune suggestion trouvée pour:', searchQuery);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la recherche:', error);
      toast.error('Erreur lors de la recherche d\'adresses');
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Effet pour la recherche avec debounce
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fetchPredictions(query);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  // ✅ Plus besoin de getPlaceDetails : les coordonnées sont déjà dans les résultats
  const handleSelectPrediction = (prediction: Prediction) => {
    setQuery(prediction.description);
    setShowSuggestions(false);
    setPredictions([]);

    // Les coordonnées sont déjà disponibles dans le résultat de searchPlaces()
    onSelectPlace({
      description: prediction.description,
      lat: prediction.coordinates.lat,
      lng: prediction.coordinates.lng
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

      {/* Liste des suggestions */}
      {showSuggestions && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0"
            >
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900">{prediction.description}</p>
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
        </div>
      )}
    </div>
  );
}