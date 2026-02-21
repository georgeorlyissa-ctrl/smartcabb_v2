import { useState, useEffect } from 'react';
import { toast } from '../../lib/toast';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from '../ui/button'; // ✅ FIX: Import manquant
import { Card, CardContent } from '../ui/card'; // ✅ FIX: Import manquant
import { Switch } from '../ui/switch'; // ✅ FIX: Import manquant
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'; // ✅ FIX: Import manquant
import { 
  ArrowLeft, 
  Globe, 
  Bell, 
  Shield, 
  CreditCard,
  User,
  HelpCircle,
  LogOut,
  Settings,
  ChevronRight
} from '../../lib/icons';
import { useTranslation } from '../../hooks/useTranslation'; // ✅ FIX: Import manquant
import { useAppState } from '../../hooks/useAppState'; // ✅ FIX: Import manquant

export function SettingsScreen() {
  const { t, language } = useTranslation();
  const { state, setCurrentScreen, setLanguage, setCurrentUser, setCurrentView } = useAppState();
  
  // État pour les notifications (sauvegardé dans localStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Charger les préférences au montage
  useEffect(() => {
    const savedNotifPref = localStorage.getItem('smartcabb_notifications_enabled');
    if (savedNotifPref !== null) {
      setNotificationsEnabled(savedNotifPref === 'true');
    }
  }, []);

  const handleLanguageChange = (newLanguage: 'fr' | 'en') => {
    setLanguage(newLanguage);
    toast.success(`Langue changée en ${newLanguage === 'fr' ? 'Français' : 'English'}`);
  };

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('smartcabb_notifications_enabled', enabled.toString());
    toast.success(enabled ? 'Notifications activées ✅' : 'Notifications désactivées 🔕');
  };

  const handleLogout = () => {
    console.log('🚪 Déconnexion du passager');
    setCurrentUser(null);
    setCurrentScreen('landing');
    toast.success('Déconnexion réussie 👋');
  };

  const settings = [
    {
      icon: Globe,
      title: t('language'),
      description: 'Choisir la langue de l\'application',
      content: (
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">{t('french')}</SelectItem>
            <SelectItem value="en">{t('english')}</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Gérer les notifications push',
      content: (
        <Switch 
          checked={notificationsEnabled} 
          onCheckedChange={handleNotificationsToggle}
        />
      )
    },
    {
      icon: Shield,
      title: 'Confidentialité',
      description: 'Paramètres de confidentialité',
      action: () => setCurrentScreen('privacy-settings')
    },
    {
      icon: CreditCard,
      title: 'Moyens de paiement',
      description: 'Gérer vos cartes et comptes',
      action: () => setCurrentScreen('payment-settings')
    }
  ];

  const menuItems = [
    {
      icon: User,
      title: 'Mon profil',
      description: 'Informations personnelles',
      action: () => setCurrentScreen('profile')
    },
    {
      icon: HelpCircle,
      title: 'Aide et support',
      description: 'FAQ et contact support',
      action: () => setCurrentScreen('support')
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
              onClick={() => setCurrentScreen('map')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-green-600" />
              <h1 className="text-xl font-semibold">{t('settings')}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* User Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{state.currentUser?.name || 'Utilisateur'}</h3>
                <p className="text-gray-600">{state.currentUser?.email}</p>
                <p className="text-sm text-gray-500">{state.currentUser?.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Paramètres</h2>
          
          {settings.map((setting) => {
            const Icon = setting.icon;
            return (
              <Card 
                key={setting.title}
                className={setting.action ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
                onClick={setting.action}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{setting.title}</h3>
                        <p className="text-sm text-gray-600">{setting.description}</p>
                      </div>
                    </div>
                    {setting.content && setting.content}
                    {setting.action && (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Menu Items */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Menu</h2>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="cursor-pointer hover:shadow-md transition-shadow" onClick={item.action}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Logout */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-100"
            >
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">SmartCabb v1.0.0</p>
          <p className="text-xs text-gray-400">© 2026 SmartCabb. Tous droits réservés.</p>
        </div>
      </div>
    </motion.div>
  );
}