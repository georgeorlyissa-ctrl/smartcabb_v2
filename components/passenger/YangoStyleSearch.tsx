/**
 * 🔍 SMARTCABB — MOTEUR DE RECHERCHE ULTRA-INTELLIGENT
 *
 * Architecture :
 *  1. MODE PIVOT-COMMUNE  — si la requête correspond à un quartier/commune
 *     → retourner TOUS les lieux de cette zone triés par popularité
 *     → biaiser Google Places vers les coordonnées de la zone
 *  2. MODE RECHERCHE LIBRE — recherche token-fuzzy dans la DB + Google Places
 *
 * Résultat : "mont ngafula" → UPN, Kimwenza, Mitendi, Mbudi, Hôpital MN, …
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '../../lib/toast';
import { Input } from '../ui/input';
import { motion, AnimatePresence } from '../../lib/motion';
import { Search, MapPin, Clock, Star, X, Navigation, ChevronRight } from '../../lib/icons';
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

// ─── Dictionnaire géographique de Kinshasa ────────────────────────────────────

interface ZoneInfo {
  lat: number;
  lng: number;
  aliases: string[];          // variantes d'orthographe pour la détection
  quartiers: string[];        // sous-quartiers à suggérer
}

const KINSHASA_ZONES: Record<string, ZoneInfo> = {
  'Gombe':          { lat: -4.3230, lng: 15.3147, aliases: ['gombe', 'centre-ville', 'downtown', 'ville'], quartiers: ['Centre', 'Boulevard du 30 Juin', 'Gombe Centre'] },
  'Mont-Ngafula':   { lat: -4.4396, lng: 15.2519, aliases: ['mont ngafula', 'mont-ngafula', 'ngafula', 'montagne ngafula'], quartiers: ['Kimwenza', 'Mitendi', 'Mbudi', 'Sanga', 'Ngansele', 'UPN'] },
  'Masina':         { lat: -4.3856, lng: 15.4446, aliases: ['masina'], quartiers: ['Kingasani', 'Zone Industrielle', 'Pascal', 'Camp Massart'] },
  'Limete':         { lat: -4.3469, lng: 15.3634, aliases: ['limete'], quartiers: ['Industriel', 'Résidentiel', 'Mombele'] },
  'Ngaliema':       { lat: -4.3249, lng: 15.2560, aliases: ['ngaliema'], quartiers: ['Djelo Binza', 'Binza Météo', 'OUA', 'Ngomba-Kinkusa', 'Mvula'] },
  'Lemba':          { lat: -4.3968, lng: 15.3111, aliases: ['lemba'], quartiers: ['Terminus', 'Mont Amba', 'Righini', 'UNIKIN'] },
  'Kalamu':         { lat: -4.3568, lng: 15.3131, aliases: ['kalamu', 'matonge', 'matongé'], quartiers: ['Matonge', 'Camp Luka'] },
  'Kasa-Vubu':      { lat: -4.3426, lng: 15.3028, aliases: ['kasa-vubu', 'kasavubu', 'kasa vubu'], quartiers: ['Victoire', 'Matonge'] },
  'Lingwala':       { lat: -4.3162, lng: 15.3028, aliases: ['lingwala'], quartiers: ['Stade des Martyrs', 'Pont Kasai'] },
  'Kintambo':       { lat: -4.3219, lng: 15.2889, aliases: ['kintambo', 'magasin'], quartiers: ['Magasin', 'Kintambo Centre'] },
  'Barumbu':        { lat: -4.3162, lng: 15.2974, aliases: ['barumbu'], quartiers: ['Gambela'] },
  'Ngiri-Ngiri':    { lat: -4.3471, lng: 15.3028, aliases: ['ngiri-ngiri', 'ngiri ngiri', 'ngiri'], quartiers: [] },
  'Bandalungwa':    { lat: -4.3508, lng: 15.2901, aliases: ['bandalungwa', 'banda'], quartiers: ['Djingarey'] },
  'Makala':         { lat: -4.3744, lng: 15.2787, aliases: ['makala'], quartiers: ['Cité Verte'] },
  "N'djili":        { lat: -4.3731, lng: 15.4061, aliases: ['ndjili', "n'djili", 'ndili'], quartiers: ['Camp Kauka', "Aéroport N'djili"] },
  "N'sele":         { lat: -4.3569, lng: 15.5333, aliases: ['nsele', "n'sele"], quartiers: ['Mikonga', 'Malweka'] },
  'Kimbanseke':     { lat: -4.4281, lng: 15.4019, aliases: ['kimbanseke'], quartiers: ['Kimbwala'] },
  'Matete':         { lat: -4.3682, lng: 15.2895, aliases: ['matete'], quartiers: ['Righini'] },
  'Bumbu':          { lat: -4.3897, lng: 15.2740, aliases: ['bumbu'], quartiers: [] },
  'Selembao':       { lat: -4.4101, lng: 15.2737, aliases: ['selembao', 'sélémbao'], quartiers: ['Kimwenza'] },
  'Kisenso':        { lat: -4.4003, lng: 15.3288, aliases: ['kisenso'], quartiers: ['Mitendi'] },
  'Maluku':         { lat: -4.0564, lng: 15.5628, aliases: ['maluku'], quartiers: ['Mbankana'] },
  'Kinshasa':       { lat: -4.3219, lng: 15.3147, aliases: ['kinshasa', 'kin'], quartiers: ['Centre', 'Matonge'] },
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(/[\s\-,\/\.]+/).filter(t => t.length >= 2);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Détection de zone (commune / quartier) ───────────────────────────────────
// Retourne { zoneName, zoneInfo, score } si la requête correspond à une zone connue

function detectZone(query: string): { zoneName: string; zoneInfo: ZoneInfo; score: number } | null {
  const q = normalize(query);
  const tokens = tokenize(query);

  let best: { zoneName: string; zoneInfo: ZoneInfo; score: number } | null = null;

  for (const [name, info] of Object.entries(KINSHASA_ZONES)) {
    let score = 0;
    const normName = normalize(name);

    // Correspondance exacte avec le nom de la zone
    if (q === normName) score += 100;
    else if (normName.includes(q) || q.includes(normName)) score += 80;

    // Correspondance avec les aliases
    for (const alias of info.aliases) {
      const normAlias = normalize(alias);
      if (q === normAlias) { score += 100; break; }
      if (normAlias.startsWith(q) || q.startsWith(normAlias)) { score += 75; break; }
      // Token matching
      const aliasTokens = tokenize(alias);
      const matchingTokens = tokens.filter(t => aliasTokens.some(at => at.startsWith(t) || t.startsWith(at)));
      if (matchingTokens.length === tokens.length && tokens.length > 0) {
        score += 60;
      }
    }

    // Correspondance avec les quartiers
    for (const quartier of info.quartiers) {
      const normQ = normalize(quartier);
      if (tokens.some(t => normQ.startsWith(t) || normQ.includes(t))) {
        score += 50;
      }
    }

    if (score > (best?.score ?? 0)) {
      best = { zoneName: name, zoneInfo: info, score };
    }
  }

  // Seuil : score > 50 = zone détectée
  return best && best.score >= 50 ? best : null;
}

// ─── Recherche locale en mode PIVOT-COMMUNE ───────────────────────────────────
// Retourne tous les lieux de la zone détectée, triés par popularité puis distance

function pivotSearch(
  zoneName: string,
  zoneInfo: ZoneInfo,
  currentLocation?: { lat: number; lng: number }
): SearchResult[] {
  const results: SearchResult[] = [];
  const normZone = normalize(zoneName);

  for (const place of kinshasaPlacesDatabase) {
    const normCommune = normalize(place.commune);
    const normQuartier = normalize(place.quartier || '');
    // Inclure les lieux dont la commune OU le quartier correspond à la zone
    const inZone = normCommune.includes(normZone) || normZone.includes(normCommune) ||
      zoneInfo.aliases.some(a => normalize(a) === normCommune) ||
      (normQuartier && normZone.includes(normQuartier));

    if (!inZone) continue;

    const dist = currentLocation
      ? haversineKm(currentLocation.lat, currentLocation.lng, place.coordinates.lat, place.coordinates.lng)
      : haversineKm(zoneInfo.lat, zoneInfo.lng, place.coordinates.lat, place.coordinates.lng);

    results.push({
      id: place.id,
      name: place.name,
      description: `${place.address}, ${place.commune}`,
      coordinates: place.coordinates,
      type: 'place',
      placeType: place.category,
      distance: dist,
      source: 'local',
      score: (place.popularity || 5) * 10,
    });
  }

  // Ajouter les quartiers de la zone comme suggestions rapides
  for (const quartier of zoneInfo.quartiers) {
    const already = results.some(r => normalize(r.name).includes(normalize(quartier)));
    if (!already) {
      results.push({
        id: `zone-${normalize(zoneName)}-${normalize(quartier)}`,
        name: `${quartier}`,
        description: `Quartier · ${zoneName}, Kinshasa`,
        coordinates: { lat: zoneInfo.lat + (Math.random() - 0.5) * 0.01, lng: zoneInfo.lng + (Math.random() - 0.5) * 0.01 },
        type: 'commune',
        source: 'local',
        score: 40,
      });
    }
  }

  // Trier : d'abord popularité (score), puis distance
  results.sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (Math.abs(scoreDiff) > 15) return scoreDiff;
    return (a.distance || 999) - (b.distance || 999);
  });

  return results.slice(0, 20);
}

// ─── Recherche locale en mode LIBRE ───────────────────────────────────────────

function freeSearch(query: string, currentLocation?: { lat: number; lng: number }): SearchResult[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const scored: Array<{ place: LocalPlace; score: number }> = [];

  for (const place of kinshasaPlacesDatabase) {
    let score = 0;
    const fields = [
      { text: normalize(place.name), weight: 10 },
      { text: normalize(place.commune), weight: 8 },
      ...place.aliases.map(a => ({ text: normalize(a), weight: 7 })),
      { text: normalize(place.quartier || ''), weight: 7 },
      { text: normalize(place.address), weight: 4 },
      ...(place.tags || []).map(t => ({ text: normalize(t), weight: 2 })),
    ];

    for (const token of tokens) {
      for (const { text, weight } of fields) {
        if (!text) continue;
        if (text === token) score += weight * 10;
        else if (text.startsWith(token)) score += weight * 6;
        else if (text.includes(token)) score += weight * 3;
        else if (token.length >= 4 && (token.startsWith(text.slice(0, 4)) || text.startsWith(token.slice(0, 4)))) score += weight;
      }
    }

    score += (place.popularity || 5) * 2;

    if (currentLocation) {
      const dist = haversineKm(currentLocation.lat, currentLocation.lng, place.coordinates.lat, place.coordinates.lng);
      if (dist < 2) score += 20;
      else if (dist < 5) score += 10;
    }

    if (score > 0) scored.push({ place, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 15).map(({ place, score }) => ({
    id: place.id,
    name: place.name,
    description: `${place.address}, ${place.commune}`,
    coordinates: place.coordinates,
    type: 'place' as const,
    placeType: place.category,
    distance: currentLocation
      ? haversineKm(currentLocation.lat, currentLocation.lng, place.coordinates.lat, place.coordinates.lng)
      : undefined,
    source: 'local' as const,
    score,
  }));
}

// ─── Icônes ───────────────────────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  terminal: '🚌', market: '🛒', mall: '🏬', hotel: '🏨', restaurant: '🍽️',
  hospital: '🏥', church: '⛪', school: '🎓', bank: '🏦', station: '⛽',
  office: '🏢', park: '🌳', university: '🎓', government: '🏛️', airport: '✈️',
  stadium: '🏟️', monument: '🗿', embassy: '🏢', gas_station: '⛽',
  landmark: '📍', residential: '🏘️', commune: '🗺️', other: '📍',
  // Google types
  shopping_mall: '🏬', supermarket: '🛒', bus_station: '🚌',
  pharmacy: '💊', mosque: '🕌', library: '📚', atm: '💳',
  parking: '🅿️', police: '👮', gym: '💪', movie_theater: '🎬',
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
  const [detectedZone, setDetectedZone] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = controlledValue !== undefined ? controlledValue : query;

  useEffect(() => {
    try {
      const saved = localStorage.getItem('smartcabb_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  // ─── Moteur de recherche ─────────────────────────────────────────────────

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (displayValue.length < 2) {
      setResults(recentSearches.slice(0, 6));
      setDetectedZone(null);
      setIsLoading(false);
      return;
    }

    // ── Étape 1 : Détection de zone (immédiate) ──
    const zone = detectZone(displayValue);
    setDetectedZone(zone ? zone.zoneName : null);

    if (zone) {
      // MODE PIVOT-COMMUNE : résultats locaux instantanés
      const pivotResults = pivotSearch(zone.zoneName, zone.zoneInfo, currentLocation);
      setResults(pivotResults);
      setIsLoading(true);

      // Appel Google avec coordonnées de la zone comme biais
      timerRef.current = setTimeout(async () => {
        try {
          const googlePlaces = await GoogleMapsService.searchPlaces(
            `${displayValue} Kinshasa`,
            { lat: zone.zoneInfo.lat, lng: zone.zoneInfo.lng } // biais géographique vers la zone
          );

          if (googlePlaces && googlePlaces.length > 0) {
            const googleResults: SearchResult[] = googlePlaces.map((p: any) => ({
              id: p.id || p.placeId || `g-${Math.random()}`,
              name: p.name,
              description: p.description || p.fullAddress || `${zone.zoneName}, Kinshasa`,
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

            // Merge : Google en premier (résultats réels), puis locaux non dupliqués
            const seenNames = new Set(googleResults.map(r => normalize(r.name)));
            const localComplement = pivotResults
              .filter(r => !seenNames.has(normalize(r.name)))
              .slice(0, 8);

            setResults([...googleResults, ...localComplement]);
          }
        } catch {
          // Pivot local déjà affiché, on garde
        } finally {
          setIsLoading(false);
        }
      }, 400);

    } else {
      // MODE RECHERCHE LIBRE
      const local = freeSearch(displayValue, currentLocation);
      if (local.length > 0) setResults(local);
      setIsLoading(true);

      timerRef.current = setTimeout(async () => {
        try {
          const googlePlaces = await GoogleMapsService.searchPlaces(displayValue, currentLocation);
          if (googlePlaces && googlePlaces.length > 0) {
            const googleResults: SearchResult[] = googlePlaces.map((p: any) => ({
              id: p.id || p.placeId || `g-${Math.random()}`,
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

            const seenNames = new Set(googleResults.map(r => normalize(r.name)));
            const localComp = local.filter(r => !seenNames.has(normalize(r.name))).slice(0, 5);
            setResults([...googleResults, ...localComp]);
          } else if (local.length === 0) {
            setResults([]);
          }
        } catch {
          // local déjà affiché
        } finally {
          setIsLoading(false);
        }
      }, 380);
    }

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [displayValue, currentLocation]);

  // ─── Sélection ───────────────────────────────────────────────────────────

  const handleSelect = useCallback(async (result: SearchResult) => {
    let final = { ...result };

    if (result.source === 'google_maps' && result.placeId && !result.coordinates) {
      try {
        const details = await GoogleMapsService.getPlaceDetails(result.placeId);
        if (details?.coordinates) final.coordinates = details.coordinates;
      } catch {}
    }

    if (!final.coordinates) {
      toast.error('Impossible de localiser cette adresse.');
      return;
    }

    const newRecent: SearchResult[] = [
      { ...final, type: 'recent', source: 'recent' },
      ...recentSearches.filter(r => r.id !== final.id),
    ].slice(0, 10);
    setRecentSearches(newRecent);
    localStorage.setItem('smartcabb_recent_searches', JSON.stringify(newRecent));

    if (onControlledChange) onControlledChange(final.name);
    else setQuery(final.name);

    onSelect(final);
    setShowSuggestions(false);
    setResults([]);
    setDetectedZone(null);
  }, [recentSearches, onControlledChange, onSelect]);

  const clearInput = () => {
    setQuery('');
    if (onControlledChange) onControlledChange('');
    setResults(recentSearches.slice(0, 6));
    setDetectedZone(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && displayValue.trim()) {
      e.preventDefault();
      if (results.length > 0) handleSelect(results[0]);
      else if (onManualSubmit) onManualSubmit(displayValue);
    }
  };

  const getIcon = (r: SearchResult) => {
    if (r.type === 'recent') return <Clock className="w-4 h-4 text-gray-400" />;
    if (r.type === 'commune') return <span className="text-base">🗺️</span>;
    const emoji = ICONS[r.placeType || ''] || ICONS['other'];
    return <span className="text-base leading-none">{emoji}</span>;
  };

  const showResults = showSuggestions && results.length > 0;
  const showEmpty = showSuggestions && !isLoading && displayValue.length >= 2 && results.length === 0;

  return (
    <div className="relative w-full">
      {/* ── Input ──────────────────────────────────────────────────────────── */}
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
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && displayValue.length >= 2 && (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          )}
          {displayValue && !isLoading && (
            <button
              onMouseDown={e => { e.preventDefault(); clearInput(); }}
              className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* ── Suggestions ────────────────────────────────────────────────────── */}
      {showResults && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[9999]"
          style={{ maxHeight: '72vh', overflowY: 'auto' }}
        >
          {/* Bandeau zone détectée */}
          {detectedZone && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
              <span className="text-base">🗺️</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-700">
                  Lieux à <span className="font-bold">{detectedZone}</span>
                </p>
                <p className="text-[10px] text-blue-500">Résultats dans cette zone, triés par popularité</p>
              </div>
              {isLoading && (
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
            </div>
          )}

          {/* Historique header */}
          {displayValue.length < 2 && recentSearches.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Récents</span>
              </div>
              <button
                onMouseDown={e => { e.preventDefault(); setRecentSearches([]); localStorage.removeItem('smartcabb_recent_searches'); setResults([]); }}
                className="text-xs text-blue-500 hover:text-blue-700"
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
              className="w-full px-3 py-3 text-left hover:bg-blue-50/70 active:bg-blue-100 transition-colors border-b border-gray-50 last:border-b-0 flex items-center gap-3 group"
            >
              {/* Icône */}
              <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 group-hover:bg-blue-100 transition-colors">
                {getIcon(result)}
              </div>

              {/* Texte */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">{result.name}</p>
                  {result.source === 'google_maps' && (
                    <span className="flex-shrink-0 text-[9px] bg-blue-50 text-blue-500 font-bold px-1.5 py-0.5 rounded-full">G</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{result.description}</p>
                {result.rating != null && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-amber-600 font-medium">{result.rating.toFixed(1)}</span>
                    {result.userRatingsTotal && (
                      <span className="text-[10px] text-gray-400">({result.userRatingsTotal})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Distance */}
              {result.distance != null && (
                <span className="flex-shrink-0 text-xs font-medium text-gray-400">
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
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 text-center z-[9999]"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Navigation className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Aucun résultat pour « {displayValue} »</p>
          <p className="text-xs text-gray-500 mb-3">Essayez un quartier, une commune ou un lieu connu</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {['Gombe', 'Limete', 'Masina', 'Mont-Ngafula', 'Ngaliema', "N'djili"].map(sug => (
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
