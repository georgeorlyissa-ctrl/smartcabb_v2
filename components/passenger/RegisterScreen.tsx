import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { PhoneInput } from '../PhoneInput';
import { PolicyModal } from '../PolicyModal';
import { signUp } from '../../lib/auth-service';
import { sendSMS } from '../../lib/sms-service';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Icônes inline (évite import lib/icons qui n'existe plus)
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export function RegisterScreen() {
  const { setCurrentScreen, setCurrentUser, setCurrentView } = useAppState();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Nettoyer les messages d'erreur au montage et démontage du composant
  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
    
    return () => {
      setErrorMsg('');
      setSuccessMsg('');
    };
  }, []);

  const handleRegister = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    
    // Validation: nom, téléphone et mot de passe obligatoires
    if (!formData.name || !formData.phone || !formData.password) {
      setErrorMsg('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier que le téléphone a 9 ou 10 chiffres (sans compter +243)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    // Retirer le préfixe 243 si présent pour obtenir les 9-10 chiffres
    const phoneWithoutPrefix = phoneDigits.startsWith('243') ? phoneDigits.substring(3) : phoneDigits;
    if (phoneWithoutPrefix.length < 9 || phoneWithoutPrefix.length > 10) {
      setErrorMsg('Le numéro de téléphone doit contenir 9 ou 10 chiffres');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas');
      return;
    }

    if (!termsAccepted) {
      setErrorMsg('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    setLoading(true);
    
    try {
      // 🧹 NETTOYER LES UTILISATEURS ORPHELINS AVANT L'INSCRIPTION
      try {
        const cleanupResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/delete-user-by-phone`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: JSON.stringify({ phone: formData.phone })
          }
        );
        
        const cleanupResult = await cleanupResponse.json();
        if (cleanupResult.deletedAuth || cleanupResult.deletedProfile) {
          console.log('✅ Utilisateur orphelin nettoyé avant inscription');
        }
      } catch (cleanupError) {
        console.log('⚠️ Nettoyage préalable ignoré:', cleanupError);
        // Continuer même si le nettoyage échoue
      }
      
      // Inscription avec Supabase
      const result = await signUp({
        email: formData.email || undefined, // ✅ Passer l'email s'il est fourni
        phone: formData.phone,
        password: formData.password,
        fullName: formData.name,
        role: 'passenger'
      });
      
      if (result.success && result.profile) {
        setCurrentUser({
          id: result.profile.id,
          name: result.profile.full_name,
          email: result.profile.email,
          phone: result.profile.phone || formData.phone
        });
        
        setSuccessMsg(`Bienvenue ${result.profile.full_name}!`);
        
        // 📱 Envoyer SMS de bienvenue au nouveau passager
        const phone = result.profile.phone || formData.phone;
        if (phone) {
          try {
            await sendSMS({
              to: phone,
              message: `SmartCabb: Bienvenue ${result.profile.full_name}! Votre compte passager a ete cree avec succes. Reservez votre premiere course des maintenant!`,
              type: 'account_validated',
            });
            console.log('✅ SMS de bienvenue envoyé au nouveau passager');
          } catch (error) {
            console.error('❌ Erreur envoi SMS de bienvenue:', error);
          }
        }
        
        setTimeout(() => {
          setCurrentScreen('map');
        }, 500);
      } else {
        // 🔍 Détecter si l'utilisateur existe déjà
        const errorMessage = result.error || 'Erreur lors de l\'inscription';
        
        if (errorMessage.toLowerCase().includes('already been registered') || 
            errorMessage.toLowerCase().includes('déjà enregistré') ||
            errorMessage.toLowerCase().includes('already exists')) {
          setErrorMsg('Ce numéro de téléphone est déjà inscrit. Connectez-vous plutôt.');
          
          // Rediriger automatiquement vers l'écran de connexion après 3 secondes
          setTimeout(() => {
            setCurrentScreen('login');
          }, 3000);
        } else {
          setErrorMsg(errorMessage);
        }
      }
    } catch (error) {
      console.error('❌ Erreur inattendue lors de l\'inscription:', error);
      setErrorMsg('Erreur lors de l\'inscription. Vérifiez votre connexion Internet.');
    }
    
    setLoading(false);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div 
      className="min-h-screen bg-white flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            console.log('⬅️ Retour vers la page d\'accueil');
            setCurrentView(null);
            setCurrentScreen('landing');
          }}
          className="w-10 h-10"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <h1 className="text-xl">Inscription</h1>
        <div className="w-10" />
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <div
          className="space-y-6"
        >
          <p className="text-gray-600 mb-8 text-center">
            Créez votre compte SmartCabb
          </p>

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
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-800 font-medium">{errorMsg}</p>
              </div>
              
              {/* Si c'est une erreur "déjà inscrit", afficher un bouton de connexion */}
              {(errorMsg.includes('déjà inscrit') || errorMsg.includes('already registered')) && (
                <Button
                  onClick={() => setCurrentScreen('login')}
                  className="w-full mt-3 bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  Aller à la connexion
                </Button>
              )}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Nom complet</Label>
              <div className="mt-2">
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Ex: Jean Mulamba"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="px-4 h-12 bg-gray-50 border-0 rounded-xl text-base"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="words"
                  spellCheck="false"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="mt-2">
                <Input
                  id="register-email"
                  type="email"
                  placeholder="exemple@email.com"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="px-4 h-12 bg-gray-50 border-0 rounded-xl text-base"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">
                Téléphone <span className="text-red-500">*</span>
              </Label>
              <div className="mt-2">
                <PhoneInput
                  id="register-phone"
                  value={formData.phone}
                  onChange={(value) => updateFormData('phone', value)}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Format: +243 XX XXX XXXX (9 chiffres)</p>
            </div>

            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <div className="mt-2">
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => updateFormData('password', e.target.value)}
                  className="px-4 h-12 bg-gray-50 border-0 rounded-xl text-base"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="mt-2">
                <Input
                  id="register-confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                  className="px-4 h-12 bg-gray-50 border-0 rounded-xl text-base"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div
        className="px-6"
      >
        <div className="flex items-start space-x-2 mb-4">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            className="mt-1"
          />
          <label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
            J'accepte les{' '}
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowTermsModal(true);
              }}
              className="text-green-500 hover:underline"
            >
              conditions d'utilisation
            </button>{' '}
            et la{' '}
            <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowTermsModal(true);
              }}
              className="text-green-500 hover:underline"
            >
              politique de confidentialité
            </button>{' '}
            de SmartCabb.
          </label>
        </div>
      </div>

      {/* Actions */}
      <div
        className="px-6 pb-8 space-y-4"
      >
        <Button
          onClick={handleRegister}
          disabled={loading || !termsAccepted}
          className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl disabled:opacity-50"
        >
          {loading ? 'Inscription...' : 'Valider'}
        </Button>
        
        <p className="text-center text-gray-600">
          Déjà un compte ?{' '}
          <button
            onClick={() => setCurrentScreen('login')}
            className="text-green-500 hover:underline"
          >
            Se connecter
          </button>
        </p>
      </div>

      {/* Terms Modal */}
      <PolicyModal
        isOpen={showTermsModal}
        onAccept={() => setShowTermsModal(false)}
        showCloseButton={true}
      />
    </div>
  );
}