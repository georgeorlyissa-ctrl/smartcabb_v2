import { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useAppState } from '../../hooks/useAppState';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';

/* ── Icônes SVG inline ─────────────────────────────────────────────── */
const ArrowLeft  = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>);
const Bell       = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>);
const MapPin     = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>);
const Car        = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>);
const DollarSign = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>);
const Shield     = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>);
const SettingsIc = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>);
const HelpCircle = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>);
const LogOut     = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>);
const User       = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>);
const Navigation = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>);
const Smartphone = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>);
const ChevronDown = ({ className = 'w-5 h-5' }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>);

/* ── Constante dark mode ───────────────────────────────────────────── */
const DARK_KEY = 'smartcabb_dark_mode';

/* ── Composant ─────────────────────────────────────────────────────── */
export function DriverSettingsScreen() {
  const { setCurrentScreen, state, setCurrentDriver } = useAppState();

  /* Véhicule */
  const vehicleInfo = useMemo(() => {
    const d = state.currentDriver;
    if (!d) return null;
    if (d.vehicle && (d.vehicle.make || d.vehicle.category || d.vehicle.license_plate)) {
      return { make: d.vehicle.make || d.vehicle_make || '', model: d.vehicle.model || d.vehicle_model || '', color: d.vehicle.color || d.vehicle_color || '', plate: d.vehicle.license_plate || d.vehicle_plate || d.license_plate || '', type: d.vehicle.category || d.vehicle_category || d.vehicle_type || 'standard' };
    }
    if (d.vehicle_category || d.vehicle_make || d.vehicle_plate) {
      return { make: d.vehicle_make || '', model: d.vehicle_model || '', color: d.vehicle_color || '', plate: d.vehicle_plate || d.license_plate || '', type: d.vehicle_category || d.vehicle_type || 'standard' };
    }
    return null;
  }, [state.currentDriver]);

  /* Settings */
  const [settings, setSettings] = useState(() => {
    let savedDark = false;
    try { savedDark = localStorage.getItem(DARK_KEY) === 'true'; } catch {}
    return {
      notifications: { newRides: true, payments: true, promotions: false, system: true },
      privacy:       { shareLocation: true, showProfile: true, allowDirectContact: false },
      preferences:   { darkMode: savedDark, soundEffects: true, autoAcceptRadius: 5, workHours: { start: '06:00', end: '22:00' } },
    };
  });

  /* Sync dark mode → DOM */
  useEffect(() => {
    const dark = settings.preferences.darkMode;
    try {
      localStorage.setItem(DARK_KEY, String(dark));
      if (dark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch {}
  }, [settings.preferences.darkMode]);

  const updateSetting = (category: string, key: string, value: any) =>
    setSettings(prev => ({ ...prev, [category]: { ...(prev as any)[category], [key]: value } }));

  /* Accordéon */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggle = (title: string) => setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));

  /* Données */
  const settingSections = [
    {
      title: 'Notifications', icon: Bell, color: 'bg-orange-100', iconColor: 'text-orange-500',
      items: [
        { key: 'newRides',    label: 'Nouvelles demandes',     description: 'Recevoir des notifications pour les nouvelles courses',    category: 'notifications' },
        { key: 'payments',   label: 'Paiements reçus',        description: 'Notifications de confirmation de paiement',                category: 'notifications' },
        { key: 'promotions', label: 'Promotions et offres',   description: 'Recevoir des informations sur les promotions',             category: 'notifications' },
        { key: 'system',     label: 'Mises à jour système',   description: 'Notifications importantes du système',                    category: 'notifications' },
      ],
    },
    {
      title: 'Confidentialité', icon: Shield, color: 'bg-green-100', iconColor: 'text-green-600',
      items: [
        { key: 'shareLocation',      label: 'Partager ma position', description: 'Permettre aux clients de voir votre position',              category: 'privacy' },
        { key: 'showProfile',        label: 'Profil visible',       description: 'Afficher votre profil aux clients',                         category: 'privacy' },
        { key: 'allowDirectContact', label: 'Contact direct',       description: 'Permettre aux clients de vous contacter directement',       category: 'privacy' },
      ],
    },
    {
      title: 'Préférences', icon: SettingsIc, color: 'bg-purple-100', iconColor: 'text-purple-600',
      items: [
        { key: 'darkMode',     label: 'Mode sombre',   description: "Utiliser le thème sombre de l'application", category: 'preferences' },
        { key: 'soundEffects', label: 'Effets sonores', description: 'Activer les sons de notification',           category: 'preferences' },
      ],
    },
  ];

  const quickActions = [
    { title: 'Zone de travail',      description: 'Définir votre zone de service',        icon: MapPin },
    { title: 'Informations véhicule', description: 'Modifier les détails de votre véhicule', icon: Car },
    { title: 'Paramètres de gain',   description: 'Configuration des revenus et bonus',   icon: DollarSign },
    { title: 'Navigation GPS',       description: 'Préférences de navigation',             icon: Navigation },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* ── Header ── */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen('driver-dashboard')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <p className="text-base font-bold text-gray-900 leading-none">Paramètres</p>
              <p className="text-xs text-gray-500 mt-0.5">Configuration du compte chauffeur</p>
            </div>
          </div>
          {/* 🌙 Toggle dark mode */}
          <button
            onClick={() => updateSetting('preferences', 'darkMode', !settings.preferences.darkMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-base">{settings.preferences.darkMode ? '☀️' : '🌙'}</span>
            <span className="text-xs font-medium text-gray-600">
              {settings.preferences.darkMode ? 'Clair' : 'Sombre'}
            </span>
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── Profil rapide ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
              {state.currentDriver?.photo
                ? <img src={state.currentDriver.photo} alt={state.currentDriver.name} className="w-full h-full object-cover" />
                : <User className="w-7 h-7 text-blue-600" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{state.currentDriver?.name}</p>
              <p className="text-sm text-gray-500 truncate">{getVehicleDisplayName(vehicleInfo)}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="text-green-600 font-medium">● En ligne</span>
                <span>⭐ {state.currentDriver?.rating}/5</span>
                <span>{state.currentDriver?.totalRides} courses</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentScreen('driver-profile')} className="flex-shrink-0 text-xs">
              Modifier
            </Button>
          </div>
        </div>

        {/* ── Actions rapides ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Actions rapides</p>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ title, description, icon: Icon }) => (
              <button
                key={title}
                className="flex flex-col items-start gap-1 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mb-1">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-semibold text-gray-800 leading-tight">{title}</span>
                <span className="text-[11px] text-gray-400 leading-tight">{description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Sections accordéon ── */}
        {settingSections.map(({ title, icon: Icon, color, iconColor, items }) => {
          const isOpen = !!openSections[title];
          const catKey = items[0]?.category as keyof typeof settings;
          return (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* En-tête cliquable */}
              <button
                type="button"
                onClick={() => toggle(title)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="text-xs text-gray-400">{items.length} option{items.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Contenu dépliable */}
              {isOpen && (
                <div className="border-t border-gray-100">
                  {items.map(({ key, label, description }, idx) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-5 py-4 ${idx < items.length - 1 ? 'border-b border-gray-50' : ''}`}
                    >
                      <div className="flex-1 pr-4">
                        <Label htmlFor={`setting-${key}`} className="text-sm font-medium text-gray-800 cursor-pointer">
                          {label}
                        </Label>
                        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                      </div>
                      <Switch
                        id={`setting-${key}`}
                        checked={!!(settings as any)[catKey]?.[key]}
                        onCheckedChange={(checked) => updateSetting(catKey as string, key, checked)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* ── Paramètres avancés ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Paramètres avancés</p>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-800">Rayon d'acceptation</p>
              <p className="text-xs text-gray-400">Distance max. pour auto-accepter une course</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range" min="1" max="20"
                value={settings.preferences.autoAcceptRadius}
                onChange={(e) => updateSetting('preferences', 'autoAcceptRadius', parseInt(e.target.value))}
                className="w-20 accent-blue-600"
              />
              <span className="text-sm font-bold text-blue-600 w-10 text-right">{settings.preferences.autoAcceptRadius}km</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-800">Heures de travail</p>
              <p className="text-xs text-gray-400">Plage de disponibilité préférée</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="time" value={settings.preferences.workHours.start}
                onChange={(e) => updateSetting('preferences', 'workHours', { ...settings.preferences.workHours, start: e.target.value })}
                className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white"
              />
              <span className="text-xs text-gray-400">→</span>
              <input type="time" value={settings.preferences.workHours.end}
                onChange={(e) => updateSetting('preferences', 'workHours', { ...settings.preferences.workHours, end: e.target.value })}
                className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white"
              />
            </div>
          </div>
        </div>

        {/* ── Support & déconnexion ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Support et aide</p>

          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left">
            <HelpCircle className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Centre d'aide</span>
          </button>

          <a href="tel:+243990666661" className="block">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-left">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Support (+243 990 666 661)</span>
            </button>
          </a>

          <button
            onClick={() => { setCurrentDriver(null); setCurrentScreen('landing'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-100 bg-red-50 hover:bg-red-100 transition-colors text-left"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="text-sm font-semibold text-red-600">Se déconnecter</span>
          </button>
        </div>

      </div>
    </div>
  );
}
