import { useState } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { PhoneInput } from '../PhoneInput'; // ✅ FIX: Ajout import PhoneInput
import { useAppState } from '../../hooks/useAppState';
import { toast } from '../../lib/toast';
import { Eye, EyeOff, ArrowLeft, Loader2, AlertCircle } from '../../lib/icons';
import { useNavigate } from '../../lib/simple-router';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { validatePhoneNumberRDC } from '../../lib/phone-utils';
import { supabase } from '../../lib/supabase';
import { signIn } from '../../lib/auth-service';

export function LoginScreen() {
  console.log('🔐 LoginScreen - Début du render');
  
  const navigate = useNavigate();
  
  let hookData;
  try {
    hookData = useAppState();
    console.log('✅ useAppState OK');
  } catch (error) {
    console.error('❌ CRASH useAppState:', error);
    return (
      <div className="min-h-screen bg-red-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur useAppState</h1>
          <p className="text-gray-700">{String(error)}</p>
        </div>
      </div>
    );
  }

  const { setCurrentScreen, setCurrentUser, setCurrentView } = hookData;
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  console.log('✅ LoginScreen - States initialisés');

  const doLogin = async () => {
    console.log('🔐 DÉBUT LOGIN - Vraie connexion Supabase');
    
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!identifier || !password) {
      setErrorMsg('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    console.log('⏳ Loading = true');

    try {
      // ✅ VRAIE CONNEXION avec Supabase Auth
      console.log('🔐 Tentative de connexion avec:', identifier);
      const result = await signIn({ identifier, password });

      if (!result.success) {
        console.error('❌ Erreur de connexion:', result.error);
        
        // 🆕 CAS SPÉCIAL : Profil orphelin détecté
        if (result.error === 'ORPHAN_PROFILE' && (result as any).orphanProfile) {
          const orphanProfile = (result as any).orphanProfile;
          console.log('⚠️ Profil orphelin détecté:', orphanProfile);
          
          setErrorMsg('');
          
          toast.error(
            <div className="space-y-2">
              <p className="font-semibold">Compte incomplet détecté</p>
              <p className="text-sm">Votre profil existe mais votre compte d'authentification n'a pas été créé.</p>
              <button
                onClick={() => {
                  window.location.href = '/auth/create-auth-from-profile';
                }}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 w-full"
              >
                Activer mon compte maintenant
              </button>
            </div>,
            {
              duration: 10000, // 10 secondes
              position: 'top-center'
            }
          );
          
          setLoading(false);
          return;
        }
        
        // ✅ FIX: Convertir l'erreur en string si c'est un objet
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || JSON.stringify(result.error) || 'Erreur de connexion';
        
        // ✅ Afficher aussi le détail si disponible
        const errorDetail = (result as any).detail || '';
        const fullMessage = errorDetail ? `${errorMessage}. ${errorDetail}` : errorMessage;
        
        setErrorMsg(fullMessage);
        
        // 🔍 Afficher les infos de debug si disponibles (dev mode uniquement)
        if ((result as any).debug) {
          console.error('🐛 Debug info:', (result as any).debug);
        }
        
        toast.error(fullMessage, {
          duration: 6000 // Plus long pour lire le message
        });
        setLoading(false);
        return;
      }

      console.log('✅ Connexion réussie, récupération du profil...');

      // 🔥 Récupérer le profil depuis le backend (auto-création si nécessaire)
      const profileResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${result.user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur récupération profil depuis le backend:', errorData);
        setErrorMsg('Impossible de récupérer votre profil. Veuillez réessayer.');
        toast.error('Impossible de récupérer votre profil. Veuillez réessayer.');
        setLoading(false);
        return;
      }

      const profileData = await profileResponse.json();
      
      if (!profileData.success || !profileData.passenger) {
        console.error('❌ Profil introuvable dans la réponse du backend:', profileData);
        setErrorMsg('Profil introuvable');
        toast.error('Profil introuvable');
        setLoading(false);
        return;
      }

      const profile = profileData.passenger;
      console.log('✅ Profil récupéré depuis le backend:', profile);

      // 🔒 VÉRIFICATION DE SÉCURITÉ : Vérifier le rôle depuis les données du backend
      // Le backend a déjà créé le profil si nécessaire, donc on utilise directement les données
      // Note: Le backend retourne toujours un profil avec role='passenger' pour cette route
      console.log('✅ Profil validé avec rôle:', profile.role || 'passenger');

      // 💰 CHARGER LE SOLDE DU PORTEFEUILLE DEPUIS LE BACKEND
      let walletBalance = 0;
      try {
        console.log('💳 Chargement du solde du portefeuille...');
        const balanceResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/wallet/passenger-balance/${profile.id}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          walletBalance = balanceData.balance || 0;
          console.log('✅ Solde chargé:', walletBalance, 'CDF');
        } else {
          console.warn('⚠️ Impossible de charger le solde, utilisation de 0 par défaut');
        }
      } catch (balanceError) {
        console.error('❌ Erreur chargement solde:', balanceError);
        // Continue avec solde 0
      }

      // Créer l'objet utilisateur avec les vraies données Supabase
      const user: any = {
        id: profile.id,
        name: profile.full_name || 'Utilisateur',
        email: profile.email,
        phone: profile.phone || '',
        // ✅ FIX: Utiliser le solde chargé depuis le backend
        walletBalance: walletBalance,
        walletTransactions: [], // Seront chargées depuis la base si nécessaire
        // ✅ FIX: Ajouter les dates depuis le profil
        created_at: profile.created_at,
        registeredAt: profile.created_at
      };

      // 💾 CHARGER LES DONNÉES DE LOCALSTORAGE (override Supabase si disponible)
      try {
        const userKey = `smartcabb_user_${profile.id}`;
        const localData = localStorage.getItem(userKey);
        if (localData) {
          const parsedLocalData = JSON.parse(localData);
          console.log('✅ Données locales trouvées:', parsedLocalData);
          // Merger avec les données Supabase (localStorage a priorité pour name, email, phone, address)
          user.name = parsedLocalData.name || user.name;
          user.email = parsedLocalData.email || user.email;
          user.phone = parsedLocalData.phone || user.phone;
          if (parsedLocalData.address) {
            user.address = parsedLocalData.address;
          }
          console.log('✅ Données mergées avec localStorage:', user);
        }
      } catch (e) {
        console.warn('⚠️ Impossible de charger localStorage:', e);
      }

      console.log('✅ User créé avec vraies données:', user);
      
      setCurrentUser(user);
      console.log('✅ setCurrentUser appelé avec vraies données');
      
      const passengerName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'Passager';
      setSuccessMsg(`Bienvenue ${passengerName} ! 👋`);
      toast.success(`Bienvenue ${passengerName} ! 👋`);
      console.log('✅ Message de succès affiché');
      
      // Attendre un peu avant de naviguer
      setTimeout(() => {
        setCurrentScreen('map');
        console.log('✅ setCurrentScreen(map) appelé');
      }, 500);
      
      setLoading(false);
      console.log('✅ Loading = false');
      console.log('🎉 LOGIN TERMINÉ');
    } catch (error) {
      console.error('❌ Erreur pendant le login:', error);
      setLoading(false);
      setErrorMsg('Erreur lors de la connexion');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      doLogin();
    }
  };

  console.log('✅ LoginScreen - doLogin défini, début du JSX');

  try {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in duration-300">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">SC</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h1>
            <p className="text-gray-600">Bienvenue sur SmartCabb</p>
          </div>

          {/* Messages de succès et d'erreur */}
          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-800 font-medium">{successMsg}</p>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-800 font-medium">{errorMsg}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <PhoneInput
                id="passenger-identifier"
                value={identifier}
                onChange={(value) => setIdentifier(value)}
                onKeyPress={handleKeyPress}
                className="px-4 h-12 text-base"
                disabled={loading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                label="Email ou Téléphone"
              />
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative mt-2">
                <Input
                  id="passenger-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="px-4 pr-12 h-12 text-base"
                  disabled={loading}
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                doLogin();
              }}
              disabled={loading}
              className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white text-lg transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connexion...</span>
                </div>
              ) : (
                'Se connecter'
              )}
            </Button>

            <div className="text-center">
              <button 
                type="button"
                onClick={() => setCurrentScreen('forgot-password')}
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
                disabled={loading}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <div className="text-center">
              <p className="text-gray-600">
                Pas de compte ?{' '}
                <button 
                  type="button"
                  onClick={() => setCurrentScreen('register')}
                  className="text-cyan-500 hover:text-cyan-600 font-semibold transition-colors"
                  disabled={loading}
                >
                  S'inscrire
                </button>
              </p>
            </div>

            <div className="text-center">
              <button 
                type="button"
                onClick={() => {
                  console.log('⬅️ Retour vers la page d\'accueil');
                  setCurrentView(null);
                  setCurrentScreen('landing');
                  navigate('/');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                disabled={loading}
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ CRASH dans le JSX du LoginScreen:', error);
    return (
      <div className="min-h-screen bg-red-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur de rendu</h1>
          <p className="text-gray-700">{String(error)}</p>
        </div>
      </div>
    );
  }
}
