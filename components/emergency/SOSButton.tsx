/**
 * 🚨 BOUTON SOS RÉUTILISABLE — SMARTCABB
 *
 * Regroupe le bouton, le dialogue et l'état « alerte active ».
 * Tous les écrans (passager, conducteur) utilisent ce même composant afin
 * d'éviter les duplications divergentes constatées auparavant.
 *
 * @version 1.0.0
 */

import { useState } from 'react';
import { AlertTriangle } from '../../lib/icons';
import type { EmergencyRole, SosAlert } from '../../lib/emergency-service';
import { SOSDialog } from './SOSDialog';

export interface SOSButtonProps {
  role: EmergencyRole;
  userId?: string;
  userName?: string;
  userPhone?: string;
  rideId?: string;
  vehicleInfo?: string;
  counterpartName?: string;
  counterpartPhone?: string;
  fallbackAddress?: string;
  variant?: 'full' | 'compact';
  className?: string;
  label?: string;
}

export function SOSButton({
  role,
  userId,
  userName,
  userPhone,
  rideId,
  vehicleInfo,
  counterpartName,
  counterpartPhone,
  fallbackAddress,
  variant = 'full',
  className = '',
  label = 'SOS',
}: SOSButtonProps) {
  const [open, setOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<SosAlert | null>(null);

  const isActive = Boolean(activeAlert && ['active', 'acknowledged'].includes(activeAlert.status));

  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1';
  const size =
    variant === 'compact'
      ? 'px-3 py-2 text-xs'
      : 'w-full py-3 text-sm';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${base} ${size} ${
          isActive
            ? 'bg-red-700 text-white ring-2 ring-red-300 animate-pulse'
            : 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200'
        } ${className}`}
        aria-label={isActive ? 'Alerte SOS active — ouvrir le suivi' : 'Déclencher une alerte SOS'}
      >
        <AlertTriangle className="w-4 h-4" />
        {isActive ? 'SOS ACTIF' : label}
      </button>

      <SOSDialog
        open={open}
        onOpenChange={setOpen}
        role={role}
        userId={userId}
        userName={userName}
        userPhone={userPhone}
        rideId={rideId}
        vehicleInfo={vehicleInfo}
        counterpartName={counterpartName}
        counterpartPhone={counterpartPhone}
        fallbackAddress={fallbackAddress}
        activeAlert={activeAlert}
        onAlertChange={setActiveAlert}
      />
    </>
  );
}
