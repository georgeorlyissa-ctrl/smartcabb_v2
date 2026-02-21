import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PhoneInput } from '../PhoneInput';
import { PolicyModal } from '../PolicyModal';
import { motion } from '../../lib/motion';
import { toast } from '../../lib/toast';
import { useAppState } from '../../hooks/useAppState';
import { ArrowLeft, Lock, User, Car, Upload, FileCheck, AlertCircle, Camera } from '../../lib/icons';
import { signUpDriver } from '../../lib/auth-service-driver-signup';
import { sendSMS } from '../../lib/sms-service';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
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
  
  const { setCurrentScreen } = useAppState();
    
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
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isOtherMake, setIsOtherMake] = useState(false);

  // 🚫 SUPPRIMÉ : Un seul document obligatoire à télécharger : Permis de conduire
  // const requiredDocumentLabel = 'Permis de conduire';
  
  // 📋 Documents à déposer physiquement au bureau SmartCabb
  const physicalDocuments = [
    'Permis de conduire',
    'Volet jaune ou carte rose',
    'Attestation d\'assurance',
    'Carte grise du véhicule'
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

  // NOUVEAU : Mapping des véhicules complets avec leur type - Grille Officielle 2025
  const predefinedVehicles = [
    // SmartCabb Standard (3 places)
    { make: 'Toyota', model: 'IST', type: 'smart_standard', label: 'Toyota IST (Standard)' },
    { make: 'Suzuki', model: 'Swift', type: 'smart_standard', label: 'Suzuki Swift (Standard)' },
    { make: 'Toyota', model: 'Vitz', type: 'smart_standard', label: 'Toyota Vitz (Standard)' },
    { make: 'Toyota', model: 'Blade', type: 'smart_standard', label: 'Toyota Blade (Standard)' },
    { make: 'Toyota', model: 'Ractis', type: 'smart_standard', label: 'Toyota Ractis (Standard)' },
    { make: 'Toyota', model: 'Runx', type: 'smart_standard', label: 'Toyota Runx (Standard)' },
    
    // SmartCabb Confort (3 places + Data)
    { make: 'Toyota', model: 'Marx', type: 'smart_confort', label: 'Toyota Marx (Confort)' },
    { make: 'Toyota', model: 'Crown', type: 'smart_confort', label: 'Toyota Crown (Confort)' },
    { make: 'Mercedes-Benz', model: 'C-Class', type: 'smart_confort', label: 'Mercedes C-Class (Confort)' },
    { make: 'Toyota', model: 'Harrier', type: 'smart_confort', label: 'Harrier (Confort)' },
    { make: 'Toyota', model: 'Vanguard', type: 'smart_confort', label: 'Toyota Vanguard (Confort)' },
    { make: 'Nissan', model: 'Juke', type: 'smart_confort', label: 'Nissan Juke (Confort)' },
    
    // SmartCabb Plus (4 places + Data)
    { make: 'Toyota', model: 'Noah', type: 'smart_plus', label: 'Noah (Plus)' },
    { make: 'Toyota', model: 'Alphard', type: 'smart_plus', label: 'Alphard (Plus)' },
    { make: 'Toyota', model: 'Voxy', type: 'smart_plus', label: 'Voxy (Plus)' },
    
    // SmartCabb Business (4 places + Data + Rafraîchissement)
    { make: 'Toyota', model: 'Prado', type: 'smart_business', label: 'Prado (Business)' },
    { make: 'Toyota', model: 'Fortuner', type: 'smart_business', label: 'Fortuner (Business)' },
  ];

  // Nouvelle structure avec catégorie automatique basée sur le type - Grille Officielle 2025
  const vehicleTypes = [
    { value: 'smart_standard', label: 'SmartCabb Standard', category: '3 places', rates: '7$/h (jour) - 10$/h (nuit)' },
    { value: 'smart_confort', label: 'SmartCabb Confort', category: '3 places + Data', rates: '15$/h (jour) - 17$/h (nuit)' },
    { value: 'smart_plus', label: 'SmartCabb Plus', category: '4 places + Data', rates: '15$/h (jour) - 20$/h (nuit)' },
    { value: 'smart_business', label: 'SmartCabb Business', category: '4 places VIP', rates: '160$/jour (location uniquement)' }
  ];

  // Fonction pour obtenir la catégorie du véhicule
  const getVehicleCategory = (vehicleType: string) => {
    const type = vehicleTypes.find(t => t.value === vehicleType);
    return type ? type.category : '';
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
      
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success('Photo de profil ajoutée');
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
          console.log('✅ Utilisateur conducteur orphelin nettoyé avant inscription');
        }
      } catch (cleanupError) {
        console.log('⚠️ Nettoyage préalable conducteur ignoré:', cleanupError);
        // Continuer même si le nettoyage échoue
      }
      
      // Inscription via Supabase
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
        profilePhoto: profilePhotoPreview // 📸 Photo en Base64
      });

      if (result.success) {
        toast.success('✅ Inscription réussie !');
        toast.info('Votre candidature est en attente d\'approbation par un administrateur.');
        toast.info('Vous serez notifié par SMS une fois vos documents validés.');
        
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
            console.error('❌ Erreur envoi SMS inscription conducteur:', error);
          }
        }
        
        // Rediriger vers l'écran d'accueil conducteur après 2 secondes
        setTimeout(() => {
          setCurrentScreen('driver-welcome');
        }, 2000);
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

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            console.log('⬅️ Retour à l\'écran de bienvenue conducteur');
            setCurrentScreen('driver-welcome');
          }}
          className="w-10 h-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <Car className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl">Devenir Conducteur</h1>
        </div>
        <div className="w-10" />
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-6"
        >
          <h2 className="text-xl mb-2">Inscription Conducteur</h2>
          <p className="text-gray-600 text-sm">
            Rejoignez notre équipe de conducteurs professionnels
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {/* Personal Information */}
          <div className="bg-white rounded-xl p-4 space-y-4">
            <h3 className="font-medium text-gray-800">Informations personnelles</h3>
            
            <div>
              <Label htmlFor="name">Nom complet *</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="name"
                  placeholder="Jean Kabongo"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="pl-10 h-11 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">
                Téléphone <span className="text-red-500">*</span>
              </Label>
              <div className="mt-1">
                <PhoneInput
                  id="phone"
                  value={formData.phone}
                  onChange={(value) => handleInputChange('phone', value)}
                  className="h-11"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Format: +243 XX XXX XXXX (9 chiffres)</p>
            </div>

            <div>
              <Label htmlFor="password">Mot de passe *</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pl-10 h-11 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="pl-10 h-11 bg-gray-50 border-gray-200"
                />
              </div>
            </div>

            {/* Photo de profil */}
            <div>
              <Label htmlFor="photo">Photo de profil *</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept=".jpg,.jpeg"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <div className="flex items-center space-x-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors">
                    {profilePhotoPreview ? (
                      <img
                        src={profilePhotoPreview}
                        alt="Photo de profil"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {profilePhotoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                      </p>
                      <p className="text-xs text-gray-500">JPG uniquement, max 5MB</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-white rounded-xl p-4 space-y-4">
            <h3 className="font-medium text-gray-800">Informations du véhicule</h3>
            
            <div>
              <Label htmlFor="vehicleSelect">Marque et Modèle *</Label>
              <Select 
                value={isOtherMake ? 'Autre' : `${formData.vehicleMake}-${formData.vehicleModel}`} 
                onValueChange={(value) => {
                  if (value === 'Autre') {
                    setIsOtherMake(true);
                    handleInputChange('vehicleMake', '');
                    handleInputChange('vehicleModel', '');
                    handleInputChange('vehicleType', '');
                  } else {
                    const selectedVehicle = predefinedVehicles.find(v => `${v.make}-${v.model}` === value);
                    if (selectedVehicle) {
                      setIsOtherMake(false);
                      handleInputChange('vehicleMake', selectedVehicle.make);
                      handleInputChange('vehicleModel', selectedVehicle.model);
                      handleInputChange('vehicleType', selectedVehicle.type);
                      toast.success(`Type automatique : ${vehicleTypes.find(t => t.value === selectedVehicle.type)?.label}`);
                    }
                  }
                }}
              >
                <SelectTrigger className="mt-1 h-11 bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Sélectionnez votre véhicule" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {predefinedVehicles.map((vehicle) => (
                    <SelectItem key={`${vehicle.make}-${vehicle.model}`} value={`${vehicle.make}-${vehicle.model}`}>
                      {vehicle.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="Autre" className="bg-yellow-50 border-t-2 border-yellow-300 font-medium">
                    🔸 Autre véhicule (saisie manuelle)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isOtherMake && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg space-y-3">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">Saisie manuelle activée</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="customMake" className="text-xs">Marque *</Label>
                    <Input
                      id="customMake"
                      placeholder="Ex: Peugeot"
                      value={formData.vehicleMake}
                      onChange={(e) => handleInputChange('vehicleMake', e.target.value)}
                      className="mt-1 h-11 bg-white border-yellow-400 focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customModel" className="text-xs">Modèle *</Label>
                    <Input
                      id="customModel"
                      placeholder="Ex: 508"
                      value={formData.vehicleModel}
                      onChange={(e) => handleInputChange('vehicleModel', e.target.value)}
                      className="mt-1 h-11 bg-white border-yellow-400 focus:border-yellow-500"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="customType" className="text-xs">Type de véhicule *</Label>
                  <Select 
                    value={formData.vehicleType} 
                    onValueChange={(value) => handleInputChange('vehicleType', value)}
                  >
                    <SelectTrigger className="mt-1 h-11 bg-white border-yellow-400">
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
                </div>
              </div>
            )}

            {!isOtherMake && formData.vehicleType && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-300">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <p className="text-sm font-medium text-green-900">Type déterminé automatiquement</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Véhicule :</span>
                    <span className="font-semibold text-green-900">
                      {formData.vehicleMake} {formData.vehicleModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Type :</span>
                    <span className="font-semibold text-green-900">
                      {vehicleTypes.find(t => t.value === formData.vehicleType)?.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Catégorie :</span>
                    <span className="font-semibold text-green-900">
                      {getVehicleCategory(formData.vehicleType)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-green-200">
                    <span className="text-sm text-gray-600">Tarification :</span>
                    <span className="text-sm text-green-700 font-medium">
                      {vehicleTypes.find(t => t.value === formData.vehicleType)?.rates}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isOtherMake && formData.vehicleType && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Catégorie :</span>
                    <span className="font-semibold text-blue-900">
                      {getVehicleCategory(formData.vehicleType)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tarification :</span>
                    <span className="text-sm text-blue-700">
                      {vehicleTypes.find(t => t.value === formData.vehicleType)?.rates}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehiclePlate">Plaque d'immatriculation *</Label>
                <Input
                  id="vehiclePlate"
                  placeholder="CD-123-KIN"
                  value={formData.vehiclePlate}
                  onChange={(e) => handleInputChange('vehiclePlate', e.target.value)}
                  className="mt-1 h-11 bg-gray-50 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="vehicleColor">Couleur *</Label>
                <Select
                  value={formData.vehicleColor}
                  onValueChange={(value) => handleInputChange('vehicleColor', value)}
                >
                  <SelectTrigger className="mt-1 h-11 bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Sélectionnez la couleur" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleColors.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 🚫 SUPPRIMÉ : Section Documents Upload pour économiser de l'espace */}
          {/* Information sur les documents physiques */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-5 border-2 border-yellow-300">
            <div className="flex items-start space-x-3 mb-3">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Documents requis</h3>
                <p className="text-sm text-yellow-800">
                  Apportez ces documents au bureau SmartCabb pour la validation
                </p>
              </div>
            </div>
            
            <ul className="space-y-2 ml-13">
              {physicalDocuments.map((doc, index) => (
                <li key={index} className="text-sm text-yellow-800 flex items-start space-x-3">
                  <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{doc}</span>
                </li>
              ))}
            </ul>
            
            <div className="mt-4 p-3 bg-white/70 rounded-lg">
              <p className="text-xs text-yellow-900">
                <strong>📍 Adresse :</strong> Bureau SmartCabb, Kinshasa
                <br />
                <strong>📞 Info :</strong> Contactez-nous pour prendre rendez-vous
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Terms and Conditions */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
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
            J'accepte les <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowTermsModal(true);
              }}
              className="text-blue-500 hover:underline"
            >
              conditions d'utilisation
            </button> et la <button 
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowTermsModal(true);
              }}
              className="text-blue-500 hover:underline"
            >
              politique de confidentialité
            </button> de SmartCabb.
          </label>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="px-6 pb-6 space-y-4"
      >
        <Button
          onClick={handleSubmit}
          disabled={loading || !termsAccepted}
          className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-50"
        >
          {loading ? 'Inscription en cours...' : 'Soumettre ma candidature'}
        </Button>
        
        <p className="text-center text-gray-600 text-sm">
          Déjà inscrit ?{' '}
          <button 
            onClick={() => setCurrentScreen('driver-login')}
            className="text-blue-500 hover:underline"
          >
            Se connecter
          </button>
        </p>
      </motion.div>

      {/* Terms Modal */}
      <PolicyModal
        isOpen={showTermsModal}
        onAccept={() => setShowTermsModal(false)}
        showCloseButton={true}
      />
    </motion.div>
  );
}
