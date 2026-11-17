/**
 * 🚨 DÉTAILS DE COURSE — CARTE SOS ADMIN
 *
 * Affiche, dans une alerte SOS, tout ce qu'il faut pour intervenir :
 *   - lieu de prise en charge et destination (avec itinéraire Google Maps),
 *   - passager et chauffeur joignables,
 *   - distance / durée / prix / statut de la course,
 *   - dernière position connue du chauffeur,
 *   - incidents déclarés pendant la course.
 *
 * Les routes `GET /rides/:id` et `GET /rides/:id/incidents` sont publiques
 * (clé anon) : aucun jeton admin n'est nécessaire pour cette lecture.
 *
 * @version 1.0.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  AlertTriangle,
  Car,
  Clock,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  User,
} from '../../lib/icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;
const POLL_MS = 30_000;

interface Point {
  address?: string | null;
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface RideDriver {
  id?: string;
  name?: string | null;
  phone?: string | null;
  rating?: number | null;
  vehicle?: string | Point | { make?: string; model?: string; plate?: string; color?: string } | null;
}

interface RideIncident {
  id: string;
  reporterType?: string;
  kind?: string;
  kindLabel?: string;
  comment?: string | null;
  lat?: number | null;
  lng?: number | null;
  createdAt?: string;
}

interface RideDetails {
  id: string;
  status?: string;
  createdAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  pickup?: string | Point | null;
  destination?: string | Point | null;
  pickupInstructions?: string | null;
  passengerName?: string | null;
  passengerPhone?: string | null;
  driver?: RideDriver | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  distance?: number | string | null;
  estimatedDuration?: number | string | null;
  estimatedPrice?: number | string | null;
  finalPrice?: number | string | null;
  price?: number | string | null;
  vehicleCategory?: string | null;
  vehicleType?: string | null;
  driverLocation?: { lat: number; lng: number; updatedAt?: string | null } | null;
}

interface SosRideDetailsProps {
  rideId: string;
}

const STATUS_LABELS: Record<string, string> = {
  searching: 'Recherche chauffeur',
  accepted: 'Chauffeur en route',
  enroute: 'Chauffeur en route',
  arrived: 'Chauffeur sur place',
  waiting: 'Attente passager',
  in_progress: 'Course en cours',
  completed: 'Terminée',
  rated: 'Terminée',
  cancelled: 'Annulée',
  no_driver_found: 'Aucun chauffeur',
};

const STATUS_CLASSES: Record<string, string> = {
  searching: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  enroute: 'bg-blue-100 text-blue-800',
  arrived: 'bg-blue-100 text-blue-800',
  waiting: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-gray-200 text-gray-700',
  rated: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
  no_driver_found: 'bg-red-100 text-red-700',
};

function textOf(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidate = obj.address || obj.name || obj.label || obj.formattedAddress;
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
  }
  return null;
}

function coordsOf(value: unknown): { lat: number; lng: number } | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  const lat = Number(obj.lat ?? obj.latitude);
  const lng = Number(obj.lng ?? obj.longitude ?? obj.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function coordinatesText(value: unknown): string | null {
  const coords = coordsOf(value);
  return coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : null;
}

function vehicleText(vehicle: RideDriver['vehicle']): string | null {
  if (!vehicle) return null;
  if (typeof vehicle === 'string') return vehicle;
  const obj = vehicle as Record<string, unknown>;
  return textOf(vehicle) || [obj.make, obj.model, obj.plate].filter(Boolean).join(' ') || null;
}

function formatTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return typeof value === 'string' ? value : null;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatPrice(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return typeof value === 'string' ? value : null;
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} CDF`;
}

function mapsPosition(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function mapsRoute(origin: { lat: number; lng: number } | null, destination: { lat: number; lng: number } | null): string | null {
  if (!origin || !destination) return null;
  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&origin=${origin.lat},${origin.lng}` +
    `&destination=${destination.lat},${destination.lng}` +
    '&travelmode=driving'
  );
}

export function SosRideDetails({ rideId }: SosRideDetailsProps) {
  const [ride, setRide] = useState<RideDetails | null>(null);
  const [incidents, setIncidents] = useState<RideIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!rideId) return;
      if (!options.silent) setLoading(true);
      else setRefreshing(true);

      try {
        const headers = { Authorization: `Bearer ${publicAnonKey}` };
        const [rideResponse, incidentsResponse] = await Promise.all([
          fetch(`${API_BASE}/rides/${rideId}`, { headers }),
          fetch(`${API_BASE}/rides/${rideId}/incidents`, { headers }),
        ]);

        const rideJson = await rideResponse.json().catch(() => null);
        const incidentsJson = await incidentsResponse.json().catch(() => null);

        if (!rideResponse.ok || !rideJson?.success || !rideJson?.ride) {
          setError(rideJson?.error || `Course indisponible (${rideResponse.status})`);
          setRide(null);
        } else {
          setError(null);
          setRide(rideJson.ride as RideDetails);
        }

        setIncidents(
          incidentsJson?.success && Array.isArray(incidentsJson.incidents)
            ? (incidentsJson.incidents as RideIncident[])
            : [],
        );
      } catch {
        setError('Impossible de charger les détails de la course (réseau).');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [rideId],
  );

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load({ silent: true }), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const pickupLabel = useMemo(() => textOf(ride?.pickup), [ride]);
  const destinationLabel = useMemo(() => textOf(ride?.destination), [ride]);
  const pickupCoords = useMemo(() => coordsOf(ride?.pickup), [ride]);
  const destinationCoords = useMemo(() => coordsOf(ride?.destination), [ride]);
  const driverLocation = ride?.driverLocation || null;

  const routeUrl = mapsRoute(
    pickupCoords || (driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : null),
    destinationCoords,
  );

  if (loading) {
    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Chargement des détails de la course…
        </p>
      </div>
    );
  }

  if (error && !ride) {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          Détails de la course indisponibles
        </p>
        <p className="text-xs text-amber-800 mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
          Réessayer
        </Button>
      </div>
    );
  }

  if (!ride) return null;

  const status = ride.status || 'unknown';
  const vehicleLabel = vehicleText(ride.driver?.vehicle);
  const passengerName = ride.passengerName || 'Passager';
  const driverName = ride.driver?.name || ride.driverName || 'Chauffeur';
  const driverPhone = ride.driver?.phone || ride.driverPhone || null;
  const price = formatPrice(ride.finalPrice ?? ride.estimatedPrice ?? ride.price);
  const duration = formatDuration(ride.estimatedDuration);
  const distance =
    ride.distance === null || ride.distance === undefined || ride.distance === ''
      ? null
      : `${Number(ride.distance).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`;
  const createdAt = formatTimestamp(ride.createdAt);
  const acceptedAt = formatTimestamp(ride.acceptedAt);
  const positionUpdatedAt = formatTimestamp(driverLocation?.updatedAt);

  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
          <Car className="w-4 h-4 text-red-600" />
          Détails de la course
        </p>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_CLASSES[status] || 'bg-gray-100 text-gray-700'}>
            {STATUS_LABELS[status] || status}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            disabled={refreshing}
            onClick={() => void load({ silent: true })}
            title="Rafraîchir les détails"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Trajet */}
      <div className="rounded-md bg-gray-50 border border-gray-200 p-2.5 space-y-1.5">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase text-gray-500 font-semibold">Prise en charge</p>
            <p className="text-sm text-gray-900 break-words">
              {pickupLabel || coordinatesText(ride.pickup) || 'Non renseigné'}
            </p>
            {ride.pickupInstructions && (
              <p className="text-xs text-gray-600 italic break-words">{ride.pickupInstructions}</p>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Navigation className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase text-gray-500 font-semibold">Destination</p>
            <p className="text-sm text-gray-900 break-words">
              {destinationLabel || coordinatesText(ride.destination) || 'Non renseignée'}
            </p>
          </div>
        </div>
        {routeUrl && (
          <Button
            size="sm"
            variant="outline"
            className="w-full mt-1"
            onClick={() => window.open(routeUrl, '_blank', 'noopener,noreferrer')}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Ouvrir l’itinéraire (Google Maps)
          </Button>
        )}
      </div>

      {/* Passager / chauffeur */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-2.5">
          <p className="text-[11px] uppercase text-gray-500 font-semibold flex items-center gap-1">
            <User className="w-3 h-3" /> Passager
          </p>
          <p className="text-sm font-medium text-gray-900 break-words">{passengerName}</p>
          {ride.passengerPhone && (
            <a
              href={`tel:${ride.passengerPhone}`}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
            >
              <Phone className="w-3 h-3" /> {ride.passengerPhone}
            </a>
          )}
        </div>
        <div className="rounded-md border border-gray-200 p-2.5">
          <p className="text-[11px] uppercase text-gray-500 font-semibold flex items-center gap-1">
            <Car className="w-3 h-3" /> Chauffeur
          </p>
          <p className="text-sm font-medium text-gray-900 break-words">{driverName}</p>
          {driverPhone && (
            <a
              href={`tel:${driverPhone}`}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
            >
              <Phone className="w-3 h-3" /> {driverPhone}
            </a>
          )}
          {(vehicleLabel || ride.vehicleCategory || ride.vehicleType) && (
            <p className="text-xs text-gray-600 mt-0.5 break-words">
              {[vehicleLabel, ride.vehicleCategory || ride.vehicleType].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Métriques */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {distance && <span>Distance : <strong className="text-gray-900">{distance}</strong></span>}
        {duration && <span>Durée : <strong className="text-gray-900">{duration}</strong></span>}
        {price && <span>Prix : <strong className="text-gray-900">{price}</strong></span>}
        {acceptedAt && <span>Acceptée : <strong className="text-gray-900">{acceptedAt}</strong></span>}
        {createdAt && <span>Créée : <strong className="text-gray-900">{createdAt}</strong></span>}
      </div>

      {/* Position chauffeur */}
      <div className="rounded-md border border-gray-200 p-2.5">
        <p className="text-[11px] uppercase text-gray-500 font-semibold flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Dernière position du chauffeur
        </p>
        {driverLocation ? (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-gray-900">
              {driverLocation.lat.toFixed(5)}, {driverLocation.lng.toFixed(5)}
            </span>
            {positionUpdatedAt && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {positionUpdatedAt}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={() =>
                window.open(
                  mapsPosition(driverLocation.lat, driverLocation.lng),
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            >
              <MapPin className="w-3.5 h-3.5 mr-1" /> Voir sur la carte
            </Button>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-1">Position non disponible (chauffeur hors ligne).</p>
        )}
      </div>

      {/* Incidents */}
      <div className="rounded-md border border-gray-200 p-2.5">
        <p className="text-[11px] uppercase text-gray-500 font-semibold flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Incidents déclarés ({incidents.length})
        </p>
        {incidents.length === 0 ? (
          <p className="text-xs text-gray-500 mt-1">Aucun incident signalé sur cette course.</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {incidents.map((incident) => {
              const incidentCoords = coordsOf(incident);
              return (
                <li key={incident.id} className="text-xs text-gray-700 border-l-2 border-red-400 pl-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <strong className="text-gray-900">
                      {incident.kindLabel || incident.kind || 'Incident'}
                    </strong>
                    {incident.reporterType && (
                      <span className="text-[10px] uppercase text-gray-500">
                        {incident.reporterType === 'driver' ? 'chauffeur' : 'passager'}
                      </span>
                    )}
                    {formatTimestamp(incident.createdAt) && (
                      <span className="text-[10px] text-gray-500">
                        {formatTimestamp(incident.createdAt)}
                      </span>
                    )}
                    {incidentCoords && (
                      <a
                        href={mapsPosition(incidentCoords.lat, incidentCoords.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        position
                      </a>
                    )}
                  </div>
                  {incident.comment && <p className="break-words">{incident.comment}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
