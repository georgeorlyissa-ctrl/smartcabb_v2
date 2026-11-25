import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PhoneInput } from '../PhoneInput';
import { UnifiedPolicyModal } from '../shared/UnifiedPolicyModal';
import { motion } from '../../lib/motion';
import { toast } from '../../lib/toast';
import { useAppState } from '../../hooks/useAppState';
import { ArrowLeft, Lock, User, Car, Upload, FileCheck, AlertCircle, Camera } from '../../lib/icons';
import { ArrowRight, Wallet, ShieldCheck, Clock } from '../../lib/icons';
import {
  AuthShell,
  AuthCard,
  AuthCardBrand,
  AuthEyebrow,
  AuthHeading,
  AuthField,
  AuthInput,
  AuthPasswordInput,
  AuthButton,
  AuthBackButton,
  AuthCheckbox,
  PasswordStrength,
} from '../auth/AuthKit';
import { SmartCabbLogo } from '../SmartCabbLogo';
import { signUpDriver } from '../../lib/auth-service-driver-signup';
import { PhoneVerificationStep } from '../PhoneVerificationStep';
import { sendSMS } from '../../lib/sms-service';
import { fetchGlobalConfig } from '../../lib/config-sync';
import { useNavigate } from '../../lib/simple-router';

// Congolese names for realistic data
const congoleseNames = [
  'Jean Kabongo',
  'Moses Mwamba',
  'Félicité Mumba',
  'Pauline Mwamba',
  'Dieudonné Mumba',
  'Marie Kabongo',
  'Joseph Mwamba',
  'Alice Mumba',
  'Emmanuel Mumba',
  'Sophie Kabongo'
];

export function DriverRegistrationScreen() {
  console.log('🚗 DriverRegistrationScreen - Début du chargement');
  
  const navigate = useNavigate();
  
  const { setCurrentScreen, setCurrentDriver } = useAppState();

  // ✅ Détecter si l'utilisateur vient du site web via /signup
  const cameFromWeb = window.location.pathname.includes('/signup');

  const handleBack = () => {
    if (cameFromWeb) {
      // Vient du site → retour navigateur (ex: /drivers)
      console.log('⬅️ Retour au site depuis /signup');
      window.history.back();
      // Déclencher la mise à jour du router (simple-router écoute popstate)
      setTimeout(() => window.dispatchEvent(new PopStateEvent('popstate')), 0);
    } else {
      // Vient de l'intérieur de l'app → retour écran welcome
      console.log('⬅️ Retour à l\'écran de bienvenue conducteur');
      setCurrentScreen('driver-welcome');
    }
  };
    
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    vehicleMake: '',
    vehicleModel: '',
    vehiclePlate: '',
    vehicleColor: '',
    vehicleType: ''
  });
  // 🚫 Documents supprimés pour économiser de l'espace - validation physique uniquement
  // const [documents, setDocuments] = useState<File[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>('');
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [isOtherMake, setIsOtherMake] = useState(false);

  // 🚫 SUPPRIMÉ : Un seul document obligatoire à télécharger : Permis de conduire
  // const requiredDocumentLabel = 'Permis de conduire';
  
  // 📋 Documents à déposer physiquement au bureau SmartCabb
  const physicalDocuments = [
    'Permis de conduire',
    'Volet jaune ou carte rose',
    'Attestation d\'assurance'
  ];

  // 🎨 Couleurs prédéfinies pour le véhicule
  const vehicleColors = [
    { value: 'Noir', label: 'Noir' },
    { value: 'Blanc', label: 'Blanc' },
    { value: 'Gris', label: 'Gris' },
    { value: 'Argent', label: 'Argent' },
    { value: 'Bleu', label: 'Bleu' },
    { value: 'Rouge', label: 'Rouge' },
    { value: 'Vert', label: 'Vert' },
    { value: 'Jaune', label: 'Jaune' },
    { value: 'Marron', label: 'Marron' },
    { value: 'Beige', label: 'Beige' },
    { value: 'Orange', label: 'Orange' },
  ];

  // NOUVEAU : Mapping des véhicules complets avec leur type - Grille Officielle 2026
  const predefinedVehicles = [
    // SmartCabb Standard (3 places)
    { make: 'Toyota', model: 'IST', type: 'smart_standard', label: 'Toyota IST (Standard)' },
    { make: 'Suzuki', model: 'Swift', type: 'smart_standard', label: 'Suzuki Swift (Standard)' },
    { make: 'Toyota', model: 'Vitz', type: 'smart_standard', label: 'Toyota Vitz (Standard)' },
    { make: 'Toyota', model: 'Blade', type: 'smart_standard', label: 'Toyota Blade (Standard)' },
    { make: 'Toyota', model: 'Ractis', type: 'smart_standard', label: 'Toyota Ractis (Standard)' },
    { make: 'Toyota', model: 'Runx', type: 'smart_standard', label: 'Toyota Runx (Standard)' },
    { make: 'Toyota', model: 'Belta', type: 'smart_standard', label: 'Toyota Belta (Standard)' },

    // SmartCabb Confort (3 places + Data)
    { make: 'Toyota', model: 'Marx', type: 'smart_confort', label: 'Toyota Marx (Confort)' },
    { make: 'Toyota', model: 'Crown', type: 'smart_confort', label: 'Toyota Crown (Confort)' },
    { make: 'Mercedes-Benz', model: 'C-Class', type: 'smart_confort', label: 'Mercedes C-Class (Confort)' },
    { make: 'Toyota', model: 'Harrier', type: 'smart_confort', label: 'Harrier (Confort)' },
    { make: 'Toyota', model: 'Vanguard', type: 'smart_confort', label: 'Toyota Vanguard (Confort)' },
    { make: 'Nissan', model: 'Juke', type: 'smart_confort', label: 'Nissan Juke (Confort)' },
    { make: 'Toyota', model: 'RAV4', type: 'smart_confort', label: 'Toyota RAV4 (Confort)' },
    { make: 'Suzuki', model: 'Vitara', type: 'smart_confort', label: 'Suzuki Vitara (Confort)' },

    // SmartCabb Familiale (7 places + Data)
    { make: 'Toyota', model: 'Noah', type: 'smart_plus', label: 'Noah (Familiale)' },
    { make: 'Toyota', model: 'Alphard', type: 'smart_plus', label: 'Alphard (Familiale)' },
    { make: 'Toyota', model: 'Voxy', type: 'smart_plus', label: 'Voxy (Familiale)' },

    // SmartCabb Business (4 places + Data + Rafraîchissement)
    { make: 'Toyota', model: 'Prado', type: 'smart_business', label: 'Prado (Business)' },
    { make: 'Toyota', model: 'Fortuner', type: 'smart_business', label: 'Fortuner (Business)' },
  ];

  // Nouvelle structure avec catégorie automatique basée sur le type - Grille Officielle 2026
  // 🚦 La variante « Standard sans clim » est en pause (voir NO_CLIM_CATEGORY_ENABLED) :
  // il ne reste qu'une seule catégorie « SmartCabb Standard ».
  const vehicleTypes = [
    { value: 'smart_standard', label: 'SmartCabb Standard', category: '3 places', rates: '6$/h (jour) - 10$/h (nuit)' },
    { value: 'smart_confort', label: 'SmartCabb Confort', category: '3 places + Data', rates: '10$/h (jour) - 15$/h (nuit)' },
    { value: 'smart_plus', label: 'SmartCabb Familiale', category: '7 places + Data', rates: '12$/h (jour) - 15$/h (nuit)' },
    { value: 'smart_business', label: 'SmartCabb Business', category: '4 places VIP', rates: '160$/jour (location uniquement)' }
  ];

  // Fonction pour obtenir la catégorie du véhicule
  const getVehicleCategory = (vehicleType: string) => {
    if (!vehicleType) return '';
    const type = vehicleTypes.find(t => t.value === vehicleType);
    return type?.category || '';
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 🚫 SUPPRIMÉ : handleFileUpload - Plus besoin d'upload de documents
  // Les conducteurs apportent les documents physiquement au bureau

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension !== 'jpg' && extension !== 'jpeg') {
        toast.error('Seuls les fichiers JPG sont acceptés pour la photo');
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        toast.error('La photo ne doit pas dépasser 1 MB');
        return;
      }
      
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success('Photo de profil ajoutée');
    }
  };

  const handleVehiclePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const extension = file.name.toLowerCase().split('.').pop();
      if (extension !== 'jpg' && extension !== 'jpeg') {
        toast.error('Seuls les fichiers JPG sont acceptés pour la photo du véhicule');
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        toast.error('La photo du véhicule ne doit pas dépasser 1 MB');
        return;
      }
      setVehiclePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVehiclePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success('Photo du véhicule ajoutée');
    }
  };

  // 🚫 SUPPRIMÉ : removeDocument - Plus besoin car pas d'upload de documents
  // const removeDocument = (index: number) => {
  //   setDocuments(prev => prev.filter((_, i) => i !== index));
  //   toast.info('Document supprimé');
  // };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name || !formData.phone || !formData.password) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier que le téléphone a 9 ou 10 chiffres (sans compter +243)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    // Retirer le préfixe 243 si présent pour obtenir les 9-10 chiffres
    const phoneWithoutPrefix = phoneDigits.startsWith('243') ? phoneDigits.substring(3) : phoneDigits;
    if (phoneWithoutPrefix.length < 9 || phoneWithoutPrefix.length > 10) {
      toast.error('Le numéro de téléphone doit contenir 9 ou 10 chiffres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (!formData.vehicleMake || !formData.vehicleModel || !formData.vehiclePlate || !formData.vehicleColor || !formData.vehicleType) {
      toast.error('Veuillez remplir toutes les informations du véhicule');
      return;
    }

    if (!vehiclePhoto) {
      toast.error('Veuillez ajouter la photo du véhicule (obligatoire pour devenir chauffeur)');
      return;
    }

    // 🚫 SUPPRIMÉ : Vérification des documents (économie d'espace)
    // Les documents seront déposés physiquement au bureau
    // if (documents.length < 1) {
    //   toast.error('Veuillez télécharger votre permis de conduire');
    //   return;
    // }

    if (!profilePhoto) {
      toast.error('Veuillez ajouter votre photo de profil');
      return;
    }

    if (!termsAccepted) {
      toast.error('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    // 🔐 Étape OTP : vérifier le numéro de téléphone avant l'inscription
    // Phase de test : si l'OTP est désactivé côté config, inscription directe
    try {
      const cfg = await fetchGlobalConfig();
      if (cfg && cfg.otpRequired !== true) {
        await handleOtpVerified('');
        return;
      }
    } catch {}
    setShowOtp(true);
  };

  const handleOtpVerified = async (otpToken: string) => {
    setLoading(true);

    try {
      // Inscription via Supabase
      // 🚦 Une seule catégorie Standard (la variante « sans clim » est en pause)
      const vehicleCategory = formData.vehicleType as 'smart_standard' | 'smart_confort' | 'smart_plus' | 'smart_business';
      
      const result = await signUpDriver({
        phone: formData.phone,
        password: formData.password,
        fullName: formData.name,
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        vehiclePlate: formData.vehiclePlate,
        vehicleColor: formData.vehicleColor,
        vehicleCategory,
        profilePhoto: profilePhotoPreview, // 📸 Photo en Base64
        vehiclePhoto: vehiclePhotoPreview, // 🚗 Photo du véhicule en Base64 (obligatoire)
        otpToken: otpToken || undefined // 🔐 Jeton OTP (vérification du numéro)
      });

      if (result.success) {
        toast.success('✅ Inscription réussie !');
        toast.info('Votre candidature est en attente d\'approbation par un administrateur.');
        toast.info('Vous serez notifié par SMS une fois vos documents validés.');
        
        // ❌ NE PAS sauvegarder le profil conducteur dans l'état
        // ❌ NE PAS permettre l'accès au dashboard avant approbation
        
        // 🧹 NETTOYER COMPLÈTEMENT LE STATE ET LE LOCALSTORAGE
        // Pour éviter qu'un ancien profil conducteur soit détecté et charge le dashboard
        console.log('🧹 Nettoyage complet du state conducteur...');
        localStorage.removeItem('smartcab_current_driver');
        localStorage.removeItem('smartcab_current_user');
        setCurrentDriver(null);
        
        // 📱 Envoyer SMS de confirmation d'inscription
        if (formData.phone) {
          try {
            await sendSMS({
              to: formData.phone,
              message: `SmartCabb: Bienvenue ${formData.name}! Votre candidature comme conducteur a ete enregistree. Vos documents sont en cours de verification. Vous serez notifie par SMS une fois valide.`,
              type: 'account_validated',
            });
            console.log('✅ SMS de confirmation inscription conducteur envoyé');
          } catch (error) {
            // ⚠️ Ne pas afficher d'erreur à l'utilisateur si le SMS échoue
            // L'inscription a réussi, c'est juste le SMS qui n'a pas été envoyé
            console.warn('⚠️ SMS de confirmation non envoyé (pas d\'impact sur l\'inscription):', error);
          }
        }
        
        // ✅ FIX : Sortir d'abord de l'URL /signup pour que le useEffect
        // de DriverApp ne remette pas le screen à 'driver-registration'
        if (window.location.pathname.includes('/signup')) {
          window.history.replaceState({}, '', '/driver');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        setCurrentScreen('driver-login');
      } else {
        toast.error(result.error || 'Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('❌ Erreur inattendue lors de l\'inscription conducteur:', error);
      toast.error('Erreur lors de l\'inscription', {
        description: 'Une erreur inattendue est survenue. Vérifiez votre connexion Internet.'
      });
    }

    setLoading(false);
  };

  const goToStep = (next: number) => {
    if (next === 2) {
      if (!formData.name || !formData.phone || !formData.password) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }
      const phoneDigits = formData.phone.replace(/\D/g, '');
      const localDigits = phoneDigits.startsWith('243') ? phoneDigits.substring(3) : phoneDigits;
      if (localDigits.length < 9 || localDigits.length > 10) {
        toast.error('Le numéro de téléphone doit contenir 9 ou 10 chiffres');
        return;
      }
      if (formData.password.length < 6) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        return;
      }
      if (!profilePhoto) {
        toast.error('Veuillez ajouter votre photo de profil');
        return;
      }
    }
    setStep(next);
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  };

  return (
    <AuthShell
      audience="driver"
      headline="Devenez chauffeur SmartCabb."
      subline="Rejoignez une flotte professionnelle, recevez des courses près de vous et suivez vos gains en temps réel."
      highlights={[
        {
          icon: <Wallet className="h-[18px] w-[18px]" />,
          title: 'Revenus lisibles',
          text: 'Chaque course affiche son prix, la commission et votre gain net.',
        },
        {
          icon: <ShieldCheck className="h-[18px] w-[18px]" />,
          title: 'Dossier vérifié',
          text: 'Validation humaine de votre véhicule et de vos documents.',
        },
        {
          icon: <Clock className="h-[18px] w-[18px]" />,
          title: 'Vous choisissez',
          text: 'Acceptez uniquement les courses proches de votre position.',
        },
      ]}
    >
      <AuthCard>
        <AuthCardBrand audience="driver" />

        {showOtp ? (
          <>
            <AuthEyebrow audience="driver">Vérification</AuthEyebrow>
            <AuthHeading
              title="Confirmez votre numéro"
              subtitle="Saisissez le code à 6 chiffres reçu par SMS pour finaliser votre candidature."
            />
            <div className="mt-5">
              <PhoneVerificationStep
                phone={formData.phone}
                purpose="registration"
                onVerified={handleOtpVerified}
                onBack={() => setShowOtp(false)}
                title="Code de vérification"
                accentClass="bg-[#FFCC00] hover:bg-[#FFD633] text-[#001B3D]"
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <AuthBackButton
                label={step === 1 ? 'Retour' : 'Identité'}
                onClick={() => (step === 1 ? handleBack() : goToStep(1))}
              />
              <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#64748B]">
                Étape {step} / 2
              </span>
            </div>

            <div className="mt-4">
              <AuthEyebrow audience="driver">Candidature chauffeur</AuthEyebrow>
              <AuthHeading
                title={step === 1 ? 'Vos informations' : 'Votre véhicule'}
                subtitle={
                  step === 1
                    ? 'Identité, contact et photo : la base de votre dossier.'
                    : 'Renseignez votre véhicule, puis joignez les photos demandées.'
                }
              />
            </div>

            {/* Progression */}
            <div className="mt-4 flex gap-1.5">
              {[1, 2].map((s) => (
                <span
                  key={s}
                  className="h-1.5 flex-1 rounded-full transition-all duration-300"
                  style={{ background: step >= s ? '#FFCC00' : '#E4E9F0' }}
                />
              ))}
            </div>

            {step === 1 ? (
              <div className="mt-5 space-y-4">
                <AuthField label="Nom complet" htmlFor="name">
                  <AuthInput
                    id="name"
                    placeholder="Jean Kabongo"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    autoComplete="name"
                    autoCapitalize="words"
                    icon={<User className="h-[18px] w-[18px]" />}
                  />
                </AuthField>

                <AuthField
                  label="Téléphone"
                  htmlFor="phone"
                  hint="Un code SMS confirmera ce numéro à la dernière étape."
                >
                  <PhoneInput
                    id="phone"
                    variant="auth"
                    value={formData.phone}
                    onChange={(value) => handleInputChange('phone', value)}
                  />
                </AuthField>

                <AuthField label="Mot de passe" htmlFor="password">
                  <AuthPasswordInput
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    autoComplete="new-password"
                    icon={<Lock className="h-[18px] w-[18px]" />}
                  />
                  <PasswordStrength password={formData.password} />
                </AuthField>

                <AuthField label="Confirmer le mot de passe" htmlFor="confirmPassword">
                  <AuthPasswordInput
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                    icon={<Lock className="h-[18px] w-[18px]" />}
                  />
                  {formData.confirmPassword.length > 0 && (
                    <p
                      className={`mt-1.5 text-[11px] font-semibold ${
                        formData.confirmPassword === formData.password ? 'text-[#0F9D58]' : 'text-[#E11D48]'
                      }`}
                    >
                      {formData.confirmPassword === formData.password
                        ? '✓ Les mots de passe correspondent'
                        : '✕ Les mots de passe ne correspondent pas'}
                    </p>
                  )}
                </AuthField>

                <div>
                  <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                    Photo de profil *
                  </p>
                  <input
                    type="file"
                    accept=".jpg,.jpeg"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="flex items-center gap-3.5 rounded-2xl border border-dashed border-[#D7DEE8] bg-[#FBFCFE] p-3.5 transition-colors hover:border-[#FFCC00] hover:bg-[#FFFDF5]">
                      {profilePhotoPreview ? (
                        <img
                          src={profilePhotoPreview}
                          alt="Photo de profil"
                          className="h-14 w-14 rounded-full object-cover ring-2 ring-[#FFCC00]"
                        />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white ring-1 ring-[#E4E9F0]">
                          <Camera className="h-5 w-5 text-[#94A3B8]" />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-[12.5px] font-bold text-[#0B1B2B]">
                          {profilePhotoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[#94A3B8]">
                          JPG uniquement · 1 MB maximum
                        </span>
                      </span>
                    </div>
                  </label>
                </div>

                <AuthButton
                  variant="driver"
                  onClick={() => goToStep(2)}
                  trailingIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Continuer
                </AuthButton>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#64748B]">
                    Photo du véhicule *
                  </p>
                  <input
                    type="file"
                    accept=".jpg,.jpeg"
                    onChange={handleVehiclePhotoUpload}
                    className="hidden"
                    id="vehicle-photo-upload"
                  />
                  <label htmlFor="vehicle-photo-upload" className="cursor-pointer block">
                    <div
                      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed transition-colors ${
                        vehiclePhotoPreview
                          ? 'border-[#E4E9F0] bg-[#F6F8FB] hover:border-[#007AFF]'
                          : 'border-[#FDE68A] bg-[#FFFBEB] hover:border-[#FFCC00]'
                      }`}
                      style={{ height: 168 }}
                    >
                      {vehiclePhotoPreview ? (
                        <img
                          src={vehiclePhotoPreview}
                          alt="Photo du véhicule"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <>
                          <SmartCabbLogo className="mb-2 h-16 w-16 opacity-70" plain />
                          <span className="flex items-center gap-1 text-[11.5px] font-semibold text-[#92400E]">
                            <Camera className="h-3.5 w-3.5" /> Ajouter une photo (obligatoire)
                          </span>
                        </>
                      )}
                      {vehiclePhotoPreview && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity hover:opacity-100">
                          <span className="flex items-center gap-1 text-[11.5px] font-bold text-white">
                            <Camera className="h-4 w-4" /> Changer la photo
                          </span>
                        </div>
                      )}
                    </div>
                  </label>
                  <p className="mt-1.5 text-[11px] leading-snug text-[#94A3B8]">
                    La photo du véhicule (JPG, max 1 MB) est vérifiée par notre équipe avant validation.
                  </p>
                </div>

                <AuthField label="Marque et modèle" htmlFor="vehicleSelect">
                  <Select
                    value={isOtherMake ? 'Autre' : `${formData.vehicleMake}-${formData.vehicleModel}`}
                    onValueChange={(value) => {
                      if (value === 'Autre') {
                        setIsOtherMake(true);
                        handleInputChange('vehicleMake', '');
                        handleInputChange('vehicleModel', '');
                        handleInputChange('vehicleType', '');
                      } else {
                        const selectedVehicle = predefinedVehicles.find((v) => `${v.make}-${v.model}` === value);
                        if (selectedVehicle) {
                          setIsOtherMake(false);
                          handleInputChange('vehicleMake', selectedVehicle.make);
                          handleInputChange('vehicleModel', selectedVehicle.model);
                          handleInputChange('vehicleType', selectedVehicle.type);
                          toast.success(
                            `Type automatique : ${vehicleTypes.find((t) => t.value === selectedVehicle.type)?.label || 'Type inconnu'}`,
                          );
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-[#E4E9F0] bg-[#F6F8FB] text-[15px] font-medium">
                      <SelectValue placeholder="Sélectionnez votre véhicule" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {predefinedVehicles.map((vehicle) => (
                        <SelectItem key={`${vehicle.make}-${vehicle.model}`} value={`${vehicle.make}-${vehicle.model}`}>
                          {vehicle.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="Autre" className="border-t-2 border-[#FDE68A] bg-[#FFFBEB] font-medium">
                        🔸 Autre véhicule (saisie manuelle)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </AuthField>

                {isOtherMake && (
                  <div className="space-y-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-[#B45309]" />
                      <p className="text-[12px] font-semibold text-[#92400E]">Saisie manuelle activée</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <AuthField label="Marque *" htmlFor="customMake">
                        <AuthInput
                          id="customMake"
                          placeholder="Ex : Peugeot"
                          value={formData.vehicleMake}
                          onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                        />
                      </AuthField>
                      <AuthField label="Modèle *" htmlFor="customModel">
                        <AuthInput
                          id="customModel"
                          placeholder="Ex : 508"
                          value={formData.vehicleModel}
                          onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                        />
                      </AuthField>
                    </div>

                    <AuthField label="Type de véhicule *" htmlFor="customType">
                      <Select
                        value={formData.vehicleType}
                        onValueChange={(value) => handleInputChange('vehicleType', value)}
                      >
                        <SelectTrigger className="h-12 rounded-2xl border-[#E4E9F0] bg-white text-[15px] font-medium">
                          <SelectValue placeholder="Sélectionnez le type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label} - {type.category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </AuthField>
                  </div>
                )}

                {!isOtherMake && formData.vehicleType && (
                  <div className="rounded-2xl border border-[#BBF7D0] bg-[#ECFDF3] p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0F9D58] text-[11px] font-bold text-white">
                        ✓
                      </span>
                      <p className="text-[12px] font-bold text-[#166534]">Type déterminé automatiquement</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11.5px] text-[#64748B]">Véhicule</span>
                        <span className="text-[12px] font-bold text-[#166534]">
                          {formData.vehicleMake} {formData.vehicleModel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11.5px] text-[#64748B]">Type</span>
                        <span className="text-[12px] font-bold text-[#166534]">
                          {vehicleTypes.find((t) => t.value === formData.vehicleType)?.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11.5px] text-[#64748B]">Catégorie</span>
                        <span className="text-[12px] font-bold text-[#166534]">
                          {getVehicleCategory(formData.vehicleType)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-[#BBF7D0] pt-2">
                        <span className="text-[11.5px] text-[#64748B]">Tarification</span>
                        <span className="text-[11.5px] font-semibold text-[#15803D]">
                          {vehicleTypes.find((t) => t.value === formData.vehicleType)?.rates}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {isOtherMake && formData.vehicleType && (
                  <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11.5px] text-[#64748B]">Catégorie</span>
                        <span className="text-[12px] font-bold text-[#1E40AF]">
                          {getVehicleCategory(formData.vehicleType)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11.5px] text-[#64748B]">Tarification</span>
                        <span className="text-[11.5px] font-semibold text-[#1E40AF]">
                          {vehicleTypes.find((t) => t.value === formData.vehicleType)?.rates}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <AuthField label="Plaque" htmlFor="vehiclePlate">
                    <AuthInput
                      id="vehiclePlate"
                      placeholder="CD-123-KIN"
                      value={formData.vehiclePlate}
                      onChange={(e) => handleInputChange('vehiclePlate', e.target.value)}
                      autoCapitalize="characters"
                    />
                  </AuthField>
                  <AuthField label="Couleur" htmlFor="vehicleColor">
                    <Select
                      value={formData.vehicleColor}
                      onValueChange={(value) => handleInputChange('vehicleColor', value)}
                    >
                      <SelectTrigger className="h-12 rounded-2xl border-[#E4E9F0] bg-[#F6F8FB] text-[15px] font-medium">
                        <SelectValue placeholder="Couleur" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleColors.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            {color.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </AuthField>
                </div>

                <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                  <div className="mb-3 flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFCC00]">
                      <AlertCircle className="h-4 w-4 text-[#001B3D]" />
                    </span>
                    <div>
                      <p className="text-[12.5px] font-bold text-[#92400E]">Documents à déposer au bureau</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#A16207]">
                        Apportez ces pièces pour la validation finale de votre compte.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {physicalDocuments.map((doc, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-[11.5px] text-[#92400E]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFCC00] text-[10px] font-bold text-[#001B3D]">
                          {index + 1}
                        </span>
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 rounded-xl bg-white/80 p-3">
                    <p className="text-[11px] leading-relaxed text-[#92400E]">
                      <strong>📍 Adresse :</strong> 63, Avenue Colonel MONDJIBA, C/ Ngaliema, Kinshasa
                      <br />
                      <strong>📞 Info :</strong> contactez-nous pour prendre rendez-vous
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E4E9F0] bg-[#FBFCFE] p-3.5">
                  <div className="flex items-start gap-2.5">
                    <AuthCheckbox
                      id="terms"
                      checked={termsAccepted}
                      onChange={(checked) => setTermsAccepted(checked)}
                    />
                    <label htmlFor="terms" className="text-[11.5px] leading-relaxed text-[#64748B]">
                      J'accepte les{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowTermsModal(true);
                        }}
                        className="inline p-0 align-baseline font-semibold text-[#0063D1] hover:underline" style={{ minHeight: 0 }}
                      >
                        conditions d'utilisation
                      </button>{' '}
                      et la{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowPrivacyModal(true);
                        }}
                        className="inline p-0 align-baseline font-semibold text-[#0063D1] hover:underline" style={{ minHeight: 0 }}
                      >
                        politique de confidentialité
                      </button>{' '}
                      de SmartCabb.
                    </label>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-2xl bg-[#EFF6FF] px-3.5 py-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" />
                  <p className="text-[11.5px] leading-snug text-[#1E40AF]">
                    Un code SMS à 6 chiffres confirmera votre numéro avant l'envoi du dossier.
                  </p>
                </div>

                <AuthButton
                  variant="driver"
                  loading={loading}
                  disabled={!termsAccepted}
                  onClick={handleSubmit}
                  trailingIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Soumettre ma candidature
                </AuthButton>

                <div className="text-center">
                  <p className="text-[12.5px] text-[#64748B]">
                    Déjà inscrit ?{' '}
                    <button
                      onClick={() => {
                        if (window.location.pathname.includes('/signup')) {
                          window.history.replaceState({}, '', '/driver');
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }
                        setCurrentScreen('driver-login');
                      }}
                      className="inline p-0 align-baseline font-semibold text-[#0063D1] hover:underline" style={{ minHeight: 0 }}
                    >
                      Se connecter
                    </button>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </AuthCard>

      <UnifiedPolicyModal
        isOpen={showTermsModal}
        onAccept={() => setShowTermsModal(false)}
        showCloseButton={true}
        mode="terms"
      />
      <UnifiedPolicyModal
        isOpen={showPrivacyModal}
        onAccept={() => setShowPrivacyModal(false)}
        showCloseButton={true}
        mode="privacy"
      />
    </AuthShell>
  );
}
