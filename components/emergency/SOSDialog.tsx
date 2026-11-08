/**
 * 🚨 DIALOGUE SOS — SMARTCABB
 *
 * Parcours unique et honnête :
 *   1. Choix du type d'urgence + note facultative
 *   2. Capture de la position réelle puis envoi au backend
 *   3. Confirmation réelle, ou échec explicite avec appels d'urgence
 *
 * Aucun message de succès n'est affiché si l'alerte n'a pas été enregistrée.
 *
 * @version 1.0.0
 */

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Shield,
  X,
  XCircle,
} from '../../lib/icons';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { toast } from '../../lib/toast';
import { getCurrentPosition } from '../../lib/graceful-geolocation';
import {
  cancelSos,
  fetchEmergencyNumbers,
  sendSos,
  type EmergencyNumbers,
  type EmergencyRole,
  type EmergencyType,
  type SosAlert,
} from '../../lib/emergency-service';

export interface SOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: EmergencyRole;
  userId?: string;
  userName?: string;
  userPhone?: string;
  rideId?: string;
  vehicleInfo?: string;
  counterpartName?: string;
  counterpartPhone?: string;
  /** Adresse utilisée si le GPS n'est pas disponible. */
  fallbackAddress?: string;
  onAlertChange?: (alert: SosAlert | null) => void;
  /** Alerte déjà en cours : le dialogue s'ouvre directement sur son statut. */
  activeAlert?: SosAlert | null;
}

const TYPES: Array<{ id: EmergencyType; label: string; emoji: string; hint: string }> = [
  { id: 'security', label: 'Sécurité', emoji: '🚨', hint: 'Menace, agression, danger immédiat' },
  { id: 'medical', label: 'Médical', emoji: '🚑', hint: 'Besoin de soins urgents' },
  { id: 'accident', label: 'Accident', emoji: '🚗', hint: 'Collision ou incident de circulation' },
  { id: 'harassment', label: 'Harcèlement', emoji: '⚠️', hint: 'Comportement déplacé ou menaçant' },
];

type Step = 'confirm' | 'sending' | 'sent' | 'error';

export function SOSDialog({
  open,
  onOpenChange,
  role,
  userId,
  userName,
  userPhone,
  rideId,
  vehicleInfo,
  counterpartName,
  counterpartPhone,
  fallbackAddress,
  onAlertChange,
  activeAlert,
}: SOSDialogProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [type, setType] = useState<EmergencyType>('security');
  const [note, setNote] = useState('');
  const [numbers, setNumbers] = useState<EmergencyNumbers>({ police: '112', ambulance: '115', support: '' });
  const [alert, setAlert] = useState<SosAlert | null>(null);
  const [smsNotified, setSmsNotified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Réinitialiser à chaque ouverture + charger les numéros configurés.
  useEffect(() => {
    if (!open) return;

    if (activeAlert && ['active', 'acknowledged'].includes(activeAlert.status)) {
      setAlert(activeAlert);
      setStep('sent');
      setSmsNotified(false);
    } else {
      setStep('confirm');
    }

    setNote('');
    setError(null);
    setConfirmCancel(false);

    let mounted = true;
    fetchEmergencyNumbers().then((value) => {
      if (mounted) setNumbers(value);
    });
    return () => {
      mounted = false;
    };
  }, [open, activeAlert]);

  const trigger = async () => {
    setStep('sending');
    setError(null);

    let lat: number | null = null;
    let lng: number | null = null;
    let accuracy: number | null = null;
    let address = fallbackAddress || undefined;
    let locationSource: 'gps' | 'cached' | 'default' | 'unavailable' = 'unavailable';

    try {
      const position = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      });

      if (!position.isDefault) {
        lat = position.lat;
        lng = position.lng;
        accuracy = position.accuracy ?? null;
        locationSource = position.source === 'cached' ? 'cached' : 'gps';
      } else {
        locationSource = 'default';
        address = address || 'Kinshasa, RDC (position approximative)';
      }
    } catch {
      locationSource = 'unavailable';
    }

    const result = await sendSos({
      role,
      type,
      userId,
      userName,
      userPhone,
      rideId,
      lat,
      lng,
      accuracy,
      address,
      note: note.trim() || undefined,
      vehicleInfo,
      counterpartName,
      counterpartPhone,
      locationSource,
      source: 'app',
    });

    if (result.ok && result.alert) {
      setAlert(result.alert);
      setSmsNotified(Boolean(result.smsNotified));
      setStep('sent');
      onAlertChange?.(result.alert);
      toast.error('🚨 Alerte SOS enregistrée', {
        description: locationSource === 'gps'
          ? 'Votre position a été transmise à l’équipe SmartCabb.'
          : 'Alerte transmise sans position GPS précise.',
        duration: 6000,
      });
    } else {
      setError(result.error || 'Alerte non transmise');
      setStep('error');
      toast.error('Alerte SOS non transmise', {
        description: 'Appelez directement les secours ci-dessous.',
        duration: 8000,
      });
    }
  };

  const doCancel = async () => {
    if (!alert) return;
    setCancelling(true);
    const ok = await cancelSos(alert.id, userId);
    setCancelling(false);

    if (ok) {
      toast.success('Alerte annulée');
      setAlert(null);
      onAlertChange?.(null);
      onOpenChange(false);
    } else {
      toast.error('Impossible d’annuler l’alerte. Contactez le support.');
    }
  };

  const callNumber = (phone: string) => {
    if (!phone) return;
    const cleaned = phone.replace(/[^\d+]/g, '');
    window.location.href = `tel:${cleaned}`;
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (step === 'sending' ? undefined : onOpenChange(next))}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            {step === 'sent' ? 'Alerte enregistrée' : step === 'error' ? 'Alerte non transmise' : 'Alerte SOS'}
          </DialogTitle>
          <DialogDescription>
            {step === 'confirm' && 'Choisissez le type d’urgence. L’équipe SmartCabb reçoit votre position et les informations de votre course.'}
            {step === 'sending' && 'Transmission de l’alerte et de votre position…'}
            {step === 'sent' && 'Votre alerte est enregistrée. Gardez votre téléphone à portée de main.'}
            {step === 'error' && 'L’alerte n’a pas pu être transmise au serveur. Appelez directement les secours.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                  className={`rounded-xl border-2 p-3 text-left transition-all ${
                    type === item.id
                      ? 'border-red-500 bg-red-50 shadow-sm'
                      : 'border-gray-200 hover:border-red-200'
                  }`}
                >
                  <div className="text-xl mb-1">{item.emoji}</div>
                  <div className="font-semibold text-sm text-gray-900">{item.label}</div>
                  <div className="text-[11px] leading-tight text-gray-500">{item.hint}</div>
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600" htmlFor="sos-note">
                Précision facultative
              </label>
              <textarea
                id="sos-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 300))}
                rows={2}
                placeholder="Ex. : le conducteur ne suit pas l’itinéraire"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
              />
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-[11px] text-gray-600 space-y-1">
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                Position GPS réelle (ou approximative si indisponible)
              </p>
              <p className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-red-500" />
                L’autre partie de la course n’est jamais prévenue
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="py-3" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                onClick={trigger}
                className="bg-red-600 hover:bg-red-700 text-white py-3 font-semibold"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Déclencher
              </Button>
            </div>

            <div className="border-t pt-3">
              <p className="text-[11px] text-gray-500 mb-2">Danger immédiat ? Appelez directement :</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="py-2" onClick={() => callNumber(numbers.police)}>
                  <Phone className="w-4 h-4 mr-2" />
                  Police {numbers.police || '—'}
                </Button>
                <Button variant="outline" className="py-2" onClick={() => callNumber(numbers.ambulance)}>
                  <Phone className="w-4 h-4 mr-2" />
                  Ambulance {numbers.ambulance || '—'}
                </Button>
              </div>
              {numbers.support && (
                <Button
                  variant="outline"
                  className="w-full mt-2 py-2"
                  onClick={() => callNumber(numbers.support)}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Support SmartCabb {numbers.support}
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-4" />
            <p className="font-semibold text-gray-900">Transmission en cours…</p>
            <p className="text-xs text-gray-500 mt-1">Localisation et informations de course</p>
          </div>
        )}

        {step === 'sent' && alert && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Alerte enregistrée</p>
                  <p className="text-xs text-green-800 mt-1">
                    Référence : {alert.id.slice(0, 8).toUpperCase()} · {new Date(alert.created_at).toLocaleTimeString('fr-FR')}
                  </p>
                  <p className="text-xs text-green-800 mt-1">
                    {smsNotified
                      ? 'L’équipe sécurité a été notifiée par SMS.'
                      : 'L’alerte est visible par l’équipe SmartCabb. Si le danger est immédiat, appelez les secours.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
              <p>
                <strong>Position :</strong>{' '}
                {alert.lat != null && alert.lng != null
                  ? `${alert.lat.toFixed(5)}, ${alert.lng.toFixed(5)}`
                  : 'non disponible'}
              </p>
              {alert.address && (
                <p className="mt-1">
                  <strong>Lieu :</strong> {alert.address}
                </p>
              )}
              <p className="mt-1">
                <strong>Type :</strong> {TYPES.find((t) => t.id === alert.type)?.label || alert.type}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button className="py-3 bg-red-600 hover:bg-red-700" onClick={() => callNumber(numbers.police)}>
                <Phone className="w-4 h-4 mr-2" />
                Police
              </Button>
              <Button className="py-3 bg-red-600 hover:bg-red-700" onClick={() => callNumber(numbers.ambulance)}>
                <Phone className="w-4 h-4 mr-2" />
                Ambulance
              </Button>
            </div>

            {numbers.support && (
              <Button variant="outline" className="w-full py-2" onClick={() => callNumber(numbers.support)}>
                <Phone className="w-4 h-4 mr-2" />
                Support SmartCabb {numbers.support}
              </Button>
            )}

            <div className="border-t pt-3 space-y-2">
              {!confirmCancel ? (
                <Button
                  variant="ghost"
                  className="w-full text-gray-500"
                  onClick={() => setConfirmCancel(true)}
                >
                  Je me suis trompé — annuler l’alerte
                </Button>
              ) : (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <p className="text-xs text-orange-800 mb-2">
                    Confirmer l’annulation ? L’équipe SmartCabb sera informée que la situation est réglée.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="py-2" onClick={() => setConfirmCancel(false)}>
                      Retour
                    </Button>
                    <Button
                      className="py-2 bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={doCancel}
                      disabled={cancelling}
                    >
                      {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
                    </Button>
                  </div>
                </div>
              )}
              <Button variant="outline" className="w-full py-2" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Aucune alerte enregistrée</p>
                  <p className="text-xs text-red-800 mt-1">
                    {error || 'Le serveur n’a pas répondu.'} Vérifiez votre connexion ou appelez directement.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button className="py-3 bg-red-600 hover:bg-red-700" onClick={() => callNumber(numbers.police)}>
                <Phone className="w-4 h-4 mr-2" />
                Police {numbers.police}
              </Button>
              <Button className="py-3 bg-red-600 hover:bg-red-700" onClick={() => callNumber(numbers.ambulance)}>
                <Phone className="w-4 h-4 mr-2" />
                Ambulance {numbers.ambulance}
              </Button>
            </div>

            {numbers.support && (
              <Button variant="outline" className="w-full py-2" onClick={() => callNumber(numbers.support)}>
                <Phone className="w-4 h-4 mr-2" />
                Support SmartCabb {numbers.support}
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <Button variant="outline" className="py-3" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4 mr-2" />
                Fermer
              </Button>
              <Button className="py-3 bg-red-600 hover:bg-red-700" onClick={trigger}>
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
