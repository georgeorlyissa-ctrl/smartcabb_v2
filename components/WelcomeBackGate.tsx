import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppState } from '../hooks/useAppState';
import { useLocation } from '../lib/simple-router';
import { WelcomeBackScreen } from './WelcomeBackScreen';

/**
 * « Welcome back » — affiché une fois par session de navigation :
 *  - après une connexion (passager ou chauffeur) ;
 *  - à la réouverture de l'app quand une session est restaurée depuis localStorage.
 *
 * Le marqueur est stocké en `sessionStorage` (donc oublié à la fermeture de
 * l'onglet / de l'app) et purgé à la déconnexion : la reconnexion suivante
 * réaffiche l'écran.
 *
 * Le mode est déduit d'un marqueur persistant (`localStorage`) :
 * première connexion → « Bienvenue », retour → « Bon retour ».
 */

const SEEN_PREFIX = 'smartcabb_welcome_back_seen';
const KNOWN_PREFIX = 'smartcabb_known_user';

type Role = 'passenger' | 'driver';

interface WelcomeSession {
  role: Role;
  name?: string;
  photo?: string;
  mode: 'welcome' | 'reconnect';
}

function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* navigation privée : on continue sans marqueur */
  }
}

function sessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function localGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function WelcomeBackGate() {
  const {
    state,
    setCurrentUser,
    setCurrentDriver,
    setCurrentView,
    setCurrentScreen,
  } = useAppState();

  const [active, setActive] = useState<WelcomeSession | null>(null);
  const handled = useRef<string>('');
  const location = useLocation();

  // Uniquement dans les applications passager (`/app`) et chauffeur (`/driver`),
  // jamais sur le site vitrine ni dans l'admin.
  const inApp = /^\/(app|driver)(\/|$)/.test(location.pathname);

  const passenger = state.currentUser;
  const driver = state.currentDriver;
  const isAdminView = state.isAdmin || state.currentView === 'admin';

  /** Rôle effectif : `currentView` d'abord, sinon le seul slot de session rempli. */
  const role: Role | null = useMemo(() => {
    if (isAdminView || !inApp) return null;

    if (state.currentView === 'driver') return driver ? 'driver' : null;
    if (state.currentView === 'passenger') return passenger ? 'passenger' : null;

    if (driver && !passenger) return 'driver';
    if (passenger && !driver) return 'passenger';
    return null;
  }, [isAdminView, state.currentView, driver, passenger, inApp]);

  const entity: any = role === 'driver' ? driver : role === 'passenger' ? passenger : null;
  const entityId = entity?.id ? String(entity.id) : '';

  // Déconnexion : on oublie le passage pour réafficher l'écran à la reconnexion.
  useEffect(() => {
    if (!passenger && !driver) {
      sessionRemove(`${SEEN_PREFIX}:passenger`);
      sessionRemove(`${SEEN_PREFIX}:driver`);
      handled.current = '';
      setActive(null);
    }
  }, [passenger, driver]);

  useEffect(() => {
    if (!role || !entity || !entityId) return;

    // Chauffeur non approuvé : pas de « welcome back » tant que le compte est en attente.
    if (role === 'driver') {
      const status = String(entity.status || entity.applicationStatus || '').toLowerCase();
      if (status === 'pending' || status === 'rejected' || status === 'suspended') return;
    }

    const signature = `${role}:${entityId}`;
    if (handled.current === signature) return;

    const seenKey = `${SEEN_PREFIX}:${role}`;
    const alreadySeen = sessionGet(seenKey) === entityId;

    if (alreadySeen) {
      handled.current = signature;
      return;
    }

    sessionSet(seenKey, entityId);
    handled.current = signature;

    const knownKey = `${KNOWN_PREFIX}:${role}:${entityId}`;
    const isKnownUser = localGet(knownKey) === '1';
    localSet(knownKey, '1');

    const rawName = entity.name || entity.full_name || entity.email?.split('@')[0];
    const photo =
      entity.photo ||
      entity.photo_url ||
      entity.profile_photo ||
      entity.avatar ||
      entity.profilePhoto ||
      undefined;

    setActive({
      role,
      name: typeof rawName === 'string' && rawName.trim() ? rawName.trim() : undefined,
      photo: typeof photo === 'string' && photo ? photo : undefined,
      mode: isKnownUser ? 'reconnect' : 'welcome',
    });
  }, [role, entityId, entity?.name, entity?.email, entity?.status, entity?.applicationStatus, entity?.photo, entity?.photo_url, entity?.profile_photo, entity?.avatar]);

  if (!inApp || !active) return null;

  const dismiss = () => setActive(null);

  const changeUser = () => {
    dismiss();
    sessionRemove(`${SEEN_PREFIX}:${active.role}`);
    if (active.role === 'driver') {
      setCurrentDriver(null);
      setCurrentView('driver');
      setCurrentScreen('driver-welcome');
    } else {
      setCurrentUser(null);
      setCurrentView('passenger');
      setCurrentScreen('login');
    }
  };

  return (
    <div className="fixed inset-0 z-[999] overflow-auto bg-white">
      <WelcomeBackScreen
        userName={active.name}
        userPhoto={active.photo}
        userType={active.role}
        mode={active.mode}
        autoContinueMs={2800}
        onContinue={dismiss}
        onComplete={dismiss}
        onChangeUser={changeUser}
      />
    </div>
  );
}

export default WelcomeBackGate;
