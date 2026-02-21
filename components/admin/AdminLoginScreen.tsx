import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { useNavigate } from '../../lib/simple-router';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import * as authService from '../../lib/auth-service'; // ✅ Import de toutes les exports nommées

// Icônes inline (évite import lib/icons qui n'existe plus)
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);

const EyeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

export function AdminLoginScreen() {
  const { setCurrentScreen, setCurrentView, setIsAdmin, setCurrentUser } = useAppState();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSyncLink, setShowSyncLink] = useState(false);

  // ❌ SUPPRIMÉ : Pas de vérification automatique de session
  // L'admin DOIT toujours saisir son mot de passe pour se connecter (sécurité)

  const handleLogin = async () => {
    // Validation simple
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setShowSyncLink(false); // Réinitialiser

    try {
      console.log('👑 Connexion admin en mode standalone...', email);
      
      // ✅ MODE STANDALONE : Utiliser auth-service directement
      if (!authService || typeof authService.signIn !== 'function') {
        console.error('❌ Erreur: authService non disponible ou invalide', authService);
        toast.error('Erreur système: Service d\'authentification non disponible');
        setLoading(false);
        return;
      }
      
      const result = await authService.signIn({ identifier: email, password });

      if (!result.success) {
        console.error('❌ Erreur authentification:', result.error || 'Erreur inconnue');
        
        // Si c'est une erreur d'identifiants invalides, proposer la synchronisation
        if (result.error && (
          result.error.includes('Invalid login credentials') ||
          result.error.includes('Email ou mot de passe incorrect') ||
          result.error.includes('incorrect')
        )) {
          toast.error('Identifiants incorrects. Vérifiez votre email et mot de passe.');
          setShowSyncLink(true); // Afficher le lien de synchronisation
        } else {
          toast.error(result.error || 'Email ou mot de passe incorrect');
        }
        
        setLoading(false);
        return;
      }

      console.log('✅ Authentification réussie, vérification du rôle admin...');

      // Vérifier que c'est bien un admin
      if (result.profile.role !== 'admin') {
        console.error('❌ Pas un compte admin');
        toast.error('Ce compte n\'a pas les droits d\'administration');
        setLoading(false);
        return;
      }

      console.log('✅ Mise à jour des états admin...');

      // Créer l'objet utilisateur admin
      const adminUser = {
        id: result.profile.id,
        name: result.profile.full_name || 'Admin',
        email: result.profile.email,
        phone: result.profile.phone || '',
        role: 'admin'
      };

      // Mettre à jour les états
      setCurrentUser(adminUser);
      setIsAdmin(true);
      setCurrentView('admin');
      
      console.log('✅ États admin définis, redirection...');
      
      // Message de succès personnalisé
      const adminName = result.profile.full_name?.split(' ')[0] || email.split('@')[0];
      toast.success(`Bienvenue ${adminName} ! 👋`);
      
      // Redirection directe vers le dashboard admin
      setCurrentScreen('admin-dashboard');
      
      console.log('✅ Redirection effectuée vers admin-dashboard');

    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur de connexion. Vérifiez votre connexion Internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
      >
        {/* Header */}
        <div className="text-center mb-8 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsAdmin(false);
              setCurrentView('passenger');
              setCurrentScreen('landing');
              navigate('/');
            }}
            className="absolute -top-2 -left-2 w-10 h-10"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldIcon className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Administration</h1>
          <p className="text-gray-600">SmartCabb Dashboard</p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="mt-2">
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@smartcabb.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 h-12 text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative mt-2">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-4 pr-12 h-12 text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
              >
                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white text-lg"
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

              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🔗 ========================================');
                console.log('🔗 CLIC SUR MOT DE PASSE OUBLIÉ');
                console.log('🔗 Button type:', e.currentTarget.type);
                console.log('🔗 Button disabled:', e.currentTarget.disabled);
                console.log('🔗 Loading state:', loading);
                console.log('🔗 Navigate function exists:', typeof navigate === 'function');
                console.log('🔗 Appel de navigate(\'/admin/forgot-password\')...');
                
                try {
                  navigate('/admin/forgot-password');
                  console.log('✅ Navigate appelé avec succès');
                  console.log('🔗 URL actuelle:', window.location.pathname);
                } catch (error) {
                  console.error('❌ Erreur lors de navigate:', error);
                }
                
                console.log('🔗 ========================================');

              onClick={() => {
                console.log('🔗 Clic sur "Mot de passe oublié"');
                console.log('🔗 Redirection vers /admin/forgot-password');
                navigate('/admin/forgot-password');
              }}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
              disabled={loading}
            >
              Mot de passe oublié ?
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-600">
              Pas de compte admin ?{' '}
              <button 
                type="button"

                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  console.log('🔗 ========================================');
                  console.log('🔗 CLIC SUR CRÉER UN COMPTE');
                  console.log('🔗 Button type:', e.currentTarget.type);
                  console.log('🔗 Button disabled:', e.currentTarget.disabled);
                  console.log('🔗 Loading state:', loading);
                  console.log('🔗 Navigate function exists:', typeof navigate === 'function');
                  console.log('🔗 Appel de navigate(\'/admin/signup\')...');
                  
                  try {
                    navigate('/admin/signup');
                    console.log('✅ Navigate appelé avec succès');
                    console.log('🔗 URL actuelle:', window.location.pathname);
                    
                    // Double vérification après un délai
                    setTimeout(() => {
                      console.log('🔗 URL après 100ms:', window.location.pathname);
                    }, 100);
                  } catch (error) {
                    console.error('❌ Erreur lors de navigate:', error);
                  }
                  
                  console.log('🔗 ========================================');

                onClick={() => {
                  console.log('🔗 Clic sur "Créer un compte"');
                  console.log('🔗 Redirection vers /admin/signup');
                  navigate('/admin/signup');
                }}
                className="text-purple-600 hover:text-purple-700 font-semibold"
                disabled={loading}
              >
                Créer un compte
              </button>
            </p>
          </div>

          {showSyncLink && (
            <div className="text-center mt-4">
              <p className="text-gray-600">
                Votre compte nécessite une synchronisation.{' '}
                <button 
                  onClick={() => setCurrentScreen('admin-account-sync')}
                  className="text-purple-600 hover:text-purple-700 font-semibold"
                >
                  Synchroniser
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
