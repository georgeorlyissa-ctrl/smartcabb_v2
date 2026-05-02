import { useState, useEffect, useCallback } from 'react';
import { toast } from '../../lib/toast';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Switch } from '../ui/switch';
import { 
  ArrowLeft, 
  Bell, 
  Shield, 
  CreditCard,
  User,
  HelpCircle,
  LogOut,
  Settings,
  ChevronRight,
  Globe,
} from '../../lib/icons';
import { useTranslation } from '../../hooks/useTranslation';
import { useAppState } from '../../hooks/useAppState';
// ✅ AJOUT: Sélecteur de langue passager (remplace le Select shadcn)
import { PassengerLanguageSelector } from './PassengerLanguageSelector';

// ─── Dark Mode inline hook ────────────────────────────────────────────────────
const DARK_KEY = 'smartcabb_dark_mode';

function useDarkModeLocal() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem(DARK_KEY) === 'true'; } catch { return false; }
  });

  const toggle = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      try {
        localStorage.setItem(DARK_KEY, String(next));
        if (next) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(DARK_KEY) === 'true';
    setIsDark(stored);
    if (stored) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  return { isDark, toggle };
}

// ─── Toggle sombre inline ─────────────────────────────────────────────────────
function InlineDarkToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Basculer mode sombre"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 52,
        height: 28,
        borderRadius: 999,
        backgroundColor: isDark ? '#0098FF' : '#d1d5db',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 300ms',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          backgroundColor: 'white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          transform: isDark ? 'translateX(24px)' : 'translateX(0px)',
          transition: 'transform 300ms cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
        }}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  );
}

export function SettingsScreen() {
  const { t, language } = useTranslation();
  const { state, setCurrentScreen, setCurrentUser } = useAppState();
  const { isDark, toggle: toggleDark } = useDarkModeLocal();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('smartcabb_notifications_enabled');
    if (saved !== null) setNotificationsEnabled(saved === 'true');
  }, []);

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    localStorage.setItem('smartcabb_notifications_enabled', enabled.toString());
    toast.success(enabled ? 'Notifications activées ✅' : 'Notifications désactivées 🔕');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('landing');
    toast.success('Déconnexion réussie 👋');
  };

  // ✅ Label langue affiché dans la description
  const currentLangLabel = language === 'fr' ? '🇫🇷 Français' : '🇬🇧 English';

  const settings = [
    {
      icon: Globe,
      title: t('language'),
      description: currentLangLabel,
      // ✅ REMPLACÉ: PassengerLanguageSelector au lieu de <Select>
      content: (
        <PassengerLanguageSelector compact={false} />
      ),
    },
    {
      icon: Bell,
      title: t('notifications'),
      description: t('notifications_desc'),
      content: (
        <Switch 
          checked={notificationsEnabled} 
          onCheckedChange={handleNotificationsToggle}
        />
      ),
    },
    {
      icon: Shield,
      title: t('privacy'),
      description: t('privacy_desc'),
      action: () => setCurrentScreen('privacy-settings'),
    },
    {
      icon: CreditCard,
      title: t('payment_settings'),
      description: t('payment_desc'),
      action: () => setCurrentScreen('payment-settings'),
    },
  ];

  const menuItems = [
    {
      icon: User,
      title: t('my_profile'),
      description: t('my_profile_desc'),
      action: () => setCurrentScreen('profile'),
    },
    {
      icon: HelpCircle,
      title: t('help_support'),
      description: t('help_desc'),
      action: () => setCurrentScreen('support'),
    },
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
              <Settings className="w-5 h-5 text-cyan-600" />
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
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-full flex items-center justify-center">
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

        {/* Paramètres */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t('settings')}</h2>

          {/* Apparence / Dark mode */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">{isDark ? '🌙' : '☀️'}</span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">Apparence</p>
                    <p className="text-xs text-gray-500">
                      {isDark ? 'Mode sombre activé' : 'Mode clair activé'}
                    </p>
                  </div>
                </div>
                <InlineDarkToggle isDark={isDark} onToggle={toggleDark} />
              </div>
            </CardContent>
          </Card>

          {/* Liste des paramètres (Langue, Notifications, Confidentialité, Paiement) */}
          {settings.map((setting) => {
            const Icon = setting.icon;
            return (
              <Card
                key={setting.title}
                className={setting.action ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
                onClick={setting.action}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm">{setting.title}</h3>
                        <p className="text-xs text-gray-500 truncate">{setting.description}</p>
                      </div>
                    </div>
                    {/* ✅ content (PassengerLanguageSelector ou Switch) */}
                    {setting.content && (
                      <div onClick={(e) => e.stopPropagation()}>
                        {setting.content}
                      </div>
                    )}
                    {/* Flèche pour les actions navigation */}
                    {setting.action && !setting.content && (
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Menu */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Menu</h2>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.title}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={item.action}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{item.title}</h3>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Déconnexion */}
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
          <p className="text-sm text-gray-500">{t('app_version')}</p>
          <p className="text-xs text-gray-400">{t('rights')}</p>
        </div>
      </div>
    </motion.div>
  );
}
