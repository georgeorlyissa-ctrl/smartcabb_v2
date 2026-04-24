/**
 * 🔍 SMARTCABB INTELLIGENT SEARCH — Moteur de recherche ultra-intelligent pour Kinshasa
 *
 * Stratégie multi-sources en parallèle :
 *  1. Base locale Kinshasa → résultats instantanés (0 ms)
 *  2. Google Places API via backend → résultats précis (~500 ms)
 *  3. Merge intelligent + scoring fuzzy par tokens
 *
 * @version 4.0.0 — Moteur hybride sans dépendance au hostname
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '../../lib/toast';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { motion } from '../../lib/motion';
import { Search, MapPin, Clock, Star, X, Navigation } from '../../lib/icons';
import * as GoogleMapsService from '../../lib/google-maps-service';
import { kinshasaPlacesDatabase, type LocalPlace } from '../../lib/kinshasa-places-database';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  coordinates?: { lat: number; lng: number };
  placeId?: string;
  type?: 'place' | 'recent' | 'favorite' | 'commune';
  placeType?: string;
  distance?: number;
  rating?: number;
  userRatingsTotal?: number;
  source: 'google_maps' | 'local' | 'recent';
  score?: number;
}

export interface YangoStyleSearchProps {
  placeholder?: string;
  onSelect: (result: SearchResult) => void;
  currentLocation?: { lat: number; lng: number };
  value?: string;
  onChange?: (value: string) => void;
  onManualSubmit?: (value: string) => void;
}

// ─── Base étendue : communes + quartiers de Kinshasa ─────────────────────────
// Utilisée comme "hints" pour la recherche locale quand la DB principale ne couvre pas

const KINSHASA_COMMUNES: Record<string, { lat: number; lng: number; quartiers: string[] }> = {
  'Gombe':        { lat: -4.3037, lng: 15.3072, quartiers: ['Gombe', 'Centre-ville', 'Boulevard du 30 Juin'] },
  'Kinshasa':     { lat: -4.3219, lng: 15.3147, quartiers: ['Kinshasa', 'Kintambo'] },
  'Barumbu':      { lat: -4.3162, lng: 15.2974, quartiers: ['Barumbu', 'Kintambo', 'Ngaliema'] },
  'Kasa-Vubu':    { lat: -4.3426, lng: 15.3028, quartiers: ['Kasa-Vubu', 'Matonge', 'Victoire'] },
  'Ngiri-Ngiri':  { lat: -4.3471, lng: 15.3028, quartiers: ['Ngiri-Ngiri', 'Matonge'] },
  'Bumbu':        { lat: -4.3897, lng: 15.2740, quartiers: ['Bumbu', 'Kisenso'] },
  'Selembao':     { lat: -4.4101, lng: 15.2737, quartiers: ['Selembao', 'Kimwenza'] },
  'Kalamu':       { lat: -4.3568, lng: 15.3131, quartiers: ['Kalamu', 'Matonge', 'Camp Luka'] },
  'Lemba':        { lat: -4.3968, lng: 15.3111, quartiers: ['Lemba', 'Righini', 'Terminus'] },
  'Makala':       { lat: -4.3744, lng: 15.2787, quartiers: ['Makala', 'Cité Verte'] },
  'Ngaliema':     { lat: -4.3249, lng: 15.2560, quartiers: ['Ngaliema', 'Djelo Binza', 'Binza', 'Djalo', 'Djali', 'Ngomba-Kinkusa'] },
  'Mont-Ngafula': { lat: -4.4396, lng: 15.2519, quartiers: ['Mont-Ngafula', 'Kimwenza', 'Mbudi'] },
  'Kimbanseke':   { lat: -4.4281, lng: 15.4019, quartiers: ['Kimbanseke', 'Kimbwala'] },
  "N'sele":       { lat: -4.3569, lng: 15.5333, quartiers: ["N'sele", 'Mikonga', 'Malweka'] },
  'Maluku':       { lat: -4.0564, lng: 15.5628, quartiers: ['Maluku', 'Mbankana'] },
  'Masina':       { lat: -4.3856, lng: 15.4446, quartiers: ['Masina', 'Kingasani', 'Camp Massart', 'Pascal', 'Zone industrielle'] },
  'Matete':       { lat: -4.3682, lng: 15.2895, quartiers: ['Matete', 'Righini'] },
  "N'djili":      { lat: -4.3856, lng: 15.4094, quartiers: ["N'djili", 'Aéroport', 'Camp Kauka'] },
  'Bandalungwa':  { lat: -4.3508, lng: 15.2901, quartiers: ['Bandalungwa', 'Djingarey'] },
  'Lingwala':     { lat: -4.3162, lng: 15.3028, quartiers: ['Lingwala', 'Pont Kasai'] },
  'Kintambo':     { lat: -4.3219, lng: 15.2889, quartiers: ['Kintambo', 'Magasin'] },
  'Kisenso':      { lat: -4.4003, lng: 15.3288, quartiers: ['Kisenso', 'Mitendi'] },
  'Limete':       { lat: -4.3469, lng: 15.3634, quartiers: ['Limete', 'Industriel', 'Résidentiel', 'Mombele'] },
  'Ndjili':       { lat: -4.3731, lng: 15.4061, quartiers: ["N'djili", 'Aéroport N\'djili'] },
};

// ─── Moteur de scoring fuzzy ─────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Retire les accents
    .split(/[\s,\-\/\(\)\.]+/)
    .filter(t => t.length >= 2);
}

function scorePlace(place: LocalPlace, tokens: string[]): number {
  let score = 0;
  const nameTokens = tokenize(place.name);
  const communeTokens = tokenize(place.commune);
  const aliasTokens = place.aliases.flatMap(a => tokenize(a));
  const quartierTokens = place.quartier ? tokenize(place.quartier) : [];
  const addressTokens = tokenize(place.address);
  const tagTokens = (place.tags || []).flatMap(t => tokenize(t));

  for (const token of tokens) {
    // Correspondance exacte dans le nom → score élevé
    if (nameTokens.some(t => t === token)) score += 10;
    else if (nameTokens.some(t => t.startsWith(token) || token.startsWith(t))) score += 6;

    // Commune
    if (communeTokens.some(t => t === token)) score += 8;
    else if (communeTokens.some(t => t.startsWith(token) || token.startsWith(t))) score += 5;

    // Aliases
    if (aliasTokens.some(t => t === token)) score += 7;
    else if (aliasTokens.some(t => t.startsWith(token) || token.startsWith(t))) score += 4;

    // Quartier
    if (quartierTokens.some(t => t === token)) score += 7;
    else if (quartierTokens.some(t => t.startsWith(token) || token.startsWith(t))) score += 4;

    // Adresse
    if (addressTokens.some(t => t === token)) score += 4;
    else if (addressTokens.some(t => t.startsWith(token) || token.startsWith(t))) score += 2;

    // Tags
    if (tagTokens.some(t => t === token)) score += 2;
  }

  // Bonus popularité
  score += (place.popularity || 0) * 0.3;

  return score;
}

// Recherche dans les communes de Kinshasa (pour couvrir les cas non couverts par la DB)
function searchCommunes(tokens: string[]): SearchResult[] {
  const results: SearchResult[] = [];
  for (const [commune, data] of Object.entries(KINSHASA_COMMUNES)) {
    const communeTokens = tokenize(commune);
    const quartierResults: SearchResult[] = [];

    let communeScore = 0;
    for (const token of tokens) {
      if (communeTokens.some(t => t === token || t.startsWith(token) || token.startsWith(t))) {
        communeScore += 8;
      }
    }

    // Chercher dans les quartiers
    for (const quartier of data.quartiers) {
      const quartierTokens = tokenize(quartier);
      let qtScore = 0;
      for (const token of tokens) {
        if (quartierTokens.some(t => t === token || t.startsWith(token) || token.startsWith(t))) {
          qtScore += 6;
        }
      }
      if (qtScore > 0) {
        quartierResults.push({
          id: `commune-${commune}-${quartier}`.replace(/\s+/g, '-').toLowerCase(),
          name: `${quartier}`,
          description: `Commune de ${commune}, Kinshasa`,
          coordinates: data,
          type: 'commune',
          source: 'local',
          score: qtScore + communeScore,
        });
      }
    }

    if (quartierResults.length > 0) {
      results.push(...quartierResults);
    } else if (communeScore > 0) {
      results.push({
        id: `commune-${commune}`.replace(/\s+/g, '-').toLowerCase(),
        name: commune,
        description: `Commune de Kinshasa`,
        coordinates: data,
        type: 'commune',
        source: 'local',
        score: communeScore,
      });
    }
  }
  return results;
}

function localSearch(query: string, currentLocation?: { lat: number; lng: number }): SearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  // Scorer la DB principale
  const dbResults: Array<{ place: LocalPlace; score: number }> = [];
  for (const place of kinshasaPlacesDatabase) {
    const score = scorePlace(place, tokens);
    if (score > 0) dbResults.push({ place, score });
  }

  // Chercher dans les communes
  const communeResults = searchCommunes(tokens);

  // Convertir DB en SearchResult
  const dbSearchResults: SearchResult[] = dbResults.map(({ place, score }) => ({
    id: place.id,
    name: place.name,
    description: `${place.address}${place.commune ? `, ${place.commune}` : ''}`,
    coordinates: place.coordinates,
    type: 'place' as const,
    placeType: place.category,
    source: 'local' as const,
    score,
  }));

  // Merger et dédupliquer
  const merged = [...dbSearchResults, ...communeResults];

  // Calculer distance si position disponible
  if (currentLocation) {
    for (const r of merged) {
      if (r.coordinates) {
        const R = 6371;
        const dLat = (r.coordinates.lat - currentLocation.lat) * Math.PI / 180;
        const dLng = (r.coordinates.lng - currentLocation.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(currentLocation.lat * Math.PI / 180) *
          Math.cos(r.coordinates.lat * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2;
        r.distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
    }
  }

  // Tri : score desc, puis distance asc
  merged.sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (Math.abs(scoreDiff) > 2) return scoreDiff;
    return (a.distance || 999) - (b.distance || 999);
  });

  return merged.slice(0, 20);
}

// Icônes par type de lieu
const PLACE_ICONS: Record<string, string> = {
  terminal: '🚌', market: '🛒', mall: '🏬', hotel: '🏨', restaurant: '🍽️',
  hospital: '🏥', church: '⛪', school: '🎓', bank: '🏦', station: '⛽',
  office: '🏢', park: '🌳', university: '🏛️', government: '🏛️', airport: '✈️',
  stadium: '🏟️', monument: '🗽', embassy: '🏛️', gas_station: '⛽',
  landmark: '📍', residential: '🏘️', commune: '📍', other: '📍',
  // Types Google Maps
  shopping_mall: '🏬', supermarket: '🛒', bus_station: '🚌', train_station: '🚆',
  transit_station: '🚉', pharmacy: '💊', bar: '🍺', mosque: '🕌', library: '📚',
  atm: '💳', parking: '🅿️', police: '👮', gym: '💪', movie_theater: '🎬',
};

// ─── Composant principal ──────────────────────────────────────────────────────

export function YangoStyleSearch({
  placeholder = 'Où allez-vous ?',
  onSelect,
  currentLocation,
  value: controlledValue,
  onChange: onControlledChange,
  onManualSubmit,
}: YangoStyleSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const googleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = controlledValue !== undefined ? controlledValue : query;

  // Charger historique
  useEffect(() => {
    try {
      const saved = localStorage.getItem('smartcabb_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  // ─── Moteur de recherche hybride ──────────────────────────────────────────

  useEffect(() => {
    if (googleTimerRef.current) clearTimeout(googleTimerRef.current);

    if (displayValue.length < 2) {
      setResults(recentSearches.slice(0, 6));
      setIsLoading(false);
      return;
    }

    // 1️⃣ Résultats locaux IMMÉDIATS
    const local = localSearch(displayValue, currentLocation);
    if (local.length > 0) {
      setResults(local);
    }
    setIsLoading(true);

    // 2️⃣ Recherche Google Places via backend (avec délai anti-spam)
    googleTimerRef.current = setTimeout(async () => {
      try {
        console.log('🔍 [SmartSearch] Backend Google Places:', displayValue);
        const googlePlaces = await GoogleMapsService.searchPlaces(displayValue, currentLocation);

        if (googlePlaces && googlePlaces.length > 0) {
          console.log(`✅ [SmartSearch] Google: ${googlePlaces.length} résultats`);

          const googleResults: SearchResult[] = googlePlaces.map((p: any) => ({
            id: p.id || p.placeId || String(Math.random()),
            name: p.name,
            description: p.description || p.fullAddress || '',
            coordinates: p.coordinates,
            placeId: p.placeId,
            type: 'place' as const,
            placeType: p.types?.[0] || 'place',
            distance: p.distance,
            rating: p.rating,
            userRatingsTotal: p.userRatingsTotal,
            source: 'google_maps' as const,
            score: 100,
          }));

          // Merger Google + local (Google en priorité, local en complément)
          const seenNames = new Set(googleResults.map(r => r.name.toLowerCase()));
          const localComplement = local
            .filter(r => !seenNames.has(r.name.toLowerCase()))
            .slice(0, 5);

          const merged = [...googleResults, ...localComplement];
          setResults(merged);
        } else if (local.length === 0) {
          // Ni Google ni local → aucun résultat
          setResults([]);
        }
        // Si Google vide mais local a des résultats, on garde les locaux
      } catch (err) {
        console.warn('⚠️ [SmartSearch] Google indisponible, résultats locaux uniquement');
        // Les résultats locaux sont déjà affichés
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      if (googleTimerRef.current) clearTimeout(googleTimerRef.current);
    };
  }, [displayValue, currentLocation]);

  // ─── Sélection d'un résultat ──────────────────────────────────────────────

  const handleSelect = useCallback(async (result: SearchResult) => {
    let finalResult = { ...result };

    // Si placeId Google mais pas de coordonnées, récupérer les détails
    if (result.source === 'google_maps' && result.placeId && !result.coordinates) {
      try {
        const details = await GoogleMapsService.getPlaceDetails(result.placeId);
        if (details?.coordinates) finalResult.coordinates = details.coordinates;
      } catch {}
    }

    if (!finalResult.coordinates) {
      toast.error('Impossible de localiser cette adresse. Veuillez réessayer.');
      return;
    }

    // Sauvegarder dans l'historique
    const newRecent: SearchResult[] = [
      { ...finalResult, type: 'recent', source: 'recent' },
      ...recentSearches.filter(r => r.id !== finalResult.id),
    ].slice(0, 10);
    setRecentSearches(newRecent);
    localStorage.setItem('smartcabb_recent_searches', JSON.stringify(newRecent));

    // Mettre à jour l'input
    if (onControlledChange) onControlledChange(finalResult.name);
    else setQuery(finalResult.name);

    onSelect(finalResult);
    setShowSuggestions(false);
    setResults([]);
  }, [recentSearches, onControlledChange, onSelect]);

  const clearInput = () => {
    setQuery('');
    if (onControlledChange) onControlledChange('');
    setResults(recentSearches.slice(0, 6));
    inputRef.current?.focus();
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('smartcabb_recent_searches');
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && displayValue.trim()) {
      e.preventDefault();
      if (results.length > 0) handleSelect(results[0]);
      else if (onManualSubmit) onManualSubmit(displayValue);
    }
  };

  // Icône pour un résultat
  const getIcon = (result: SearchResult) => {
    if (result.type === 'recent') return <Clock className="w-4 h-4 text-gray-500" />;
    const key = result.placeType || result.type || 'other';
    const emoji = PLACE_ICONS[key] || PLACE_ICONS['other'];
    return <span className="text-lg leading-none">{emoji}</span>;
  };

  const showResults = showSuggestions && results.length > 0;
  const showEmpty = showSuggestions && !isLoading && displayValue.length >= 2 && results.length === 0;

  return (
    <div className="relative w-full">
      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={e => {
            const v = e.target.value;
            setQuery(v);
            if (onControlledChange) onControlledChange(v);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setShowSuggestions(true);
            if (displayValue.length < 2) setResults(recentSearches.slice(0, 6));
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          className="pl-10 pr-9 h-11 text-sm border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all bg-white shadow-sm"
          autoComplete="off"
          spellCheck={false}
        />
        {/* Indicateur chargement / bouton clear */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && displayValue.length >= 2 && (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          )}
          {displayValue && !isLoading && (
            <button
              onMouseDown={e => { e.preventDefault(); clearInput(); }}
              className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* ── Liste de suggestions ──────────────────────────────────────────── */}
      {showResults && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[9999]"
          style={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
          {/* En-tête historique */}
          {displayValue.length < 2 && recentSearches.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 bg-gray-50/80">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Récents</span>
              </div>
              <button
                onMouseDown={e => { e.preventDefault(); clearRecent(); }}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                Effacer
              </button>
            </div>
          )}

          {/* Résultats */}
          {results.map((result, idx) => (
            <button
              key={`${result.id}-${idx}`}
              onMouseDown={e => { e.preventDefault(); handleSelect(result); }}
              className="w-full px-3 py-3 text-left hover:bg-blue-50/60 active:bg-blue-100 transition-colors border-b border-gray-50 last:border-b-0 flex items-center gap-3 group"
            >
              {/* Icône */}
              <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 group-hover:bg-blue-100 transition-colors">
                {getIcon(result)}
              </div>

              {/* Texte */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{result.name}</p>
                  {result.source === 'google_maps' && (
                    <span className="flex-shrink-0 text-[10px] text-blue-500 font-medium bg-blue-50 px-1.5 py-0.5 rounded-full">
                      Google
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{result.description}</p>
                {result.rating && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-amber-600 font-medium">{result.rating.toFixed(1)}</span>
                    {result.userRatingsTotal && (
                      <span className="text-xs text-gray-400">({result.userRatingsTotal})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Distance */}
              {result.distance !== undefined && (
                <span className="flex-shrink-0 text-xs text-gray-400 font-medium">
                  {result.distance < 1
                    ? `${Math.round(result.distance * 1000)} m`
                    : `${result.distance.toFixed(1)} km`}
                </span>
              )}
            </button>
          ))}

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">{results.length} résultat{results.length > 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400">Powered by</span>
              <span className="text-[10px] font-semibold text-gray-500">Google Maps</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Aucun résultat ────────────────────────────────────────────────── */}
      {showEmpty && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 text-center z-[9999]"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Navigation className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Aucun résultat pour « {displayValue} »</p>
          <p className="text-xs text-gray-500">
            Essayez le nom d'un quartier, d'une commune ou d'un lieu connu à Kinshasa
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            {['Gombe', 'Limete', 'Masina', 'Ngaliema', "N'djili"].map(sug => (
              <button
                key={sug}
                onMouseDown={e => {
                  e.preventDefault();
                  setQuery(sug);
                  if (onControlledChange) onControlledChange(sug);
                  setShowSuggestions(true);
                }}
                className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
              >
                {sug}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
