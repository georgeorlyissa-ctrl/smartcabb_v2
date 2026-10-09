import { useEffect, useRef } from 'react';
import { useNavigate } from '../../lib/simple-router';
import { useAppState } from '../../hooks/useAppState';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';

// ⏱️ Expiration de la session admin après inactivité
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // avertissement 2 minutes avant
const CHECK_INTERVAL_MS = 30 * 1000; // vérification toutes les 30 secondes

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;

/**
 * Déconnecte l'admin après 30 minutes d'inactivité et renvoie vers
 * la page de connexion (admin-login). Actif uniquement quand isAdmin.
 * Monté dans AdminAppContent (a accès au Router + AppProvider).
 */
export function AdminSessionTimeout() {
  const { state, setCurrentScreen, setIsAdmin } = useAppState();
  const navigate = useNavigate();
  const lastActivityRef = useRef<number>(Date.now());
  const warnedRef = useRef<boolean>(false);
  const timedOutRef = useRef<boolean>(false);
  const isAdminRef = useRef<boolean>(state.isAdmin);
  isAdminRef.current = state.isAdmin;

  // Nouvelle connexion admin → réarmer le minuteur
  useEffect(() => {
    if (state.isAdmin) {
      timedOutRef.current = false;
      warnedRef.current = false;
      lastActivityRef.current = Date.now();
    }
  }, [state.isAdmin]);

  useEffect(() => {
    const markActivity = () => {
      if (!isAdminRef.current || timedOutRef.current) return;
      lastActivityRef.current = Date.now();
      warnedRef.current = false;
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, markActivity, { passive: true })
    );

    const doTimeoutLogout = async () => {
      if (timedOutRef.current) return;
      timedOutRef.current = true;
      console.log("⏱️ Session admin expirée (30 min d'inactivité) — retour au login");
      try {
        await supabase.auth.signOut();
      } catch {}
      try {
        localStorage.removeItem('smartcab_current_admin');
      } catch {}
      try {
        localStorage.removeItem('smartcab_admin_2fa_token');
      } catch {}
      setIsAdmin(false);
      setCurrentScreen('admin-login');
      navigate('/admin');
      toast.info("Session expirée après 30 minutes d'inactivité. Veuillez vous reconnecter.");
    };

    const timer = setInterval(() => {
      if (!isAdminRef.current || timedOutRef.current) return;
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= INACTIVITY_LIMIT_MS) {
        void doTimeoutLogout();
      } else if (!warnedRef.current && idleFor >= INACTIVITY_LIMIT_MS - WARNING_BEFORE_MS) {
        warnedRef.current = true;
        toast.warning('Session admin : expiration dans 2 minutes par inactivité.');
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
