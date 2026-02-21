import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState'; // ✅ FIX: Import manquant
import { toast } from '../../lib/toast';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button'; // ✅ FIX: Import manquant
import { Card, CardContent } from '../ui/card'; // ✅ FIX: Import manquant
import { Switch } from '../ui/switch'; // ✅ FIX: Import manquant
import { 
  ArrowLeft, 
  Shield, 
  Eye, 
  EyeOff,
  MapPin,
  Share2,
  Lock,
  Smartphone,
  Users,
  FileText,
  AlertCircle
} from '../../lib/icons';

export function PrivacySettingsScreen() {
  const { setCurrentScreen } = useAppState();
  
  // États des paramètres de confidentialité (sauvegardés dans localStorage)
  const [settings, setSettings] = useState({
    shareLocation: true,
    shareRideStatus: true,
    showProfileToDrivers: true,
    allowDataAnalytics: true,
    twoFactorAuth: false,
    biometricAuth: false
  });

  // Charger les préférences au montage
  useEffect(() => {
    const savedSettings = localStorage.getItem('smartcabb_privacy_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Sauvegarder les préférences
  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('smartcabb_privacy_settings', JSON.stringify(newSettings));
    toast.success('Préférence mise à jour');
  };

  const privacyOptions = [
    {
      icon: MapPin,
      title: 'Partager ma localisation',
      description: 'Permet aux conducteurs de voir votre position en temps réel',
      key: 'shareLocation' as keyof typeof settings,
      recommended: true
    },
    {
      icon: Share2,
      title: 'Partager l\'état de mes courses',
      description: 'Vos contacts d\'urgence peuvent suivre vos trajets',
      key: 'shareRideStatus' as keyof typeof settings,
      recommended: true
    },
    {
      icon: Eye,
      title: 'Profil visible aux conducteurs',
      description: 'Les conducteurs voient votre nom et photo de profil',
      key: 'showProfileToDrivers' as keyof typeof settings,
      recommended: true
    },
    {
      icon: FileText,
      title: 'Analyses de données',
      description: 'Aide à améliorer l\'expérience SmartCabb',
      key: 'allowDataAnalytics' as keyof typeof settings,
      recommended: false
    }
  ];

  const securityOptions = [
    {
      icon: Lock,
      title: 'Authentification à deux facteurs',
      description: 'Ajoute une couche de sécurité supplémentaire',
      key: 'twoFactorAuth' as keyof typeof settings,
      badge: 'Bientôt disponible',
      disabled: true
    },
    {
      icon: Smartphone,
      title: 'Authentification biométrique',
      description: 'Utilisez votre empreinte ou Face ID',
      key: 'biometricAuth' as keyof typeof settings,
      badge: 'Bientôt disponible',
      disabled: true
    }
  ];

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25 }}
      className="min-h-screen bg-gray-50"
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('passenger-settings')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-semibold">Confidentialité</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-semibold mb-1">Vos données sont protégées</p>
                <p className="text-blue-700">
                  SmartCabb s'engage à protéger votre vie privée. Vous contrôlez quelles informations sont partagées.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5 text-gray-600" />
            Paramètres de confidentialité
          </h2>
          
          {privacyOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card key={option.key}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{option.title}</h3>
                          {option.recommended && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              Recommandé
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings[option.key]}
                      onCheckedChange={(checked) => updateSetting(option.key, checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Security Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-600" />
            Sécurité du compte
          </h2>
          
          {securityOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card key={option.key} className={option.disabled ? 'opacity-50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{option.title}</h3>
                          {option.badge && (
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                              {option.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings[option.key]}
                      onCheckedChange={(checked) => updateSetting(option.key, checked)}
                      disabled={option.disabled}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Data Management */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            Gestion des données
          </h2>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">Télécharger mes données</h3>
                    <p className="text-sm text-gray-600">Obtenez une copie de vos informations</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast.info('Fonctionnalité bientôt disponible')}
                >
                  Télécharger
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-red-600">Supprimer mon compte</h3>
                    <p className="text-sm text-gray-600">Action irréversible</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => toast.error('Contactez le support pour supprimer votre compte')}
                >
                  Supprimer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legal Links */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Documents légaux</h2>
          
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600">Politique de confidentialité</span>
                <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-600">Conditions d'utilisation</span>
                <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}