import { motion } from '../../lib/motion'; // ✅ FIX: Import depuis lib/motion
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useAppState } from '../../hooks/useAppState';
import { useState, useMemo } from 'react';
import { getVehicleDisplayName } from '../../lib/vehicle-helpers';

// Icônes SVG inline
const ArrowLeft = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>);
const Bell = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>);
const MapPin = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const Car = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>);
const DollarSign = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const Shield = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>);
const Moon = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>);
const Volume2 = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>);
const Smartphone = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>);
const Navigation = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>);
const Settings = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const HelpCircle = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>);
const LogOut = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>);
const User = ({ className = "w-5 h-5" }: { className?: string }) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>);

export function DriverSettingsScreen() {
  const { setCurrentScreen, state, setCurrentDriver, setCurrentView } = useAppState();
  
  // ✅ FIX: Construire l'objet vehicleInfo depuis les champs individuels du driver
  const vehicleInfo = useMemo(() => {
    const driver = state.currentDriver;
    if (!driver) return null;
    
    // Si l'objet vehicle existe ET n'est pas vide, l'utiliser
    if (driver.vehicle && (driver.vehicle.make || driver.vehicle.category || driver.vehicle.license_plate)) {
      return {
        make: driver.vehicle.make || driver.vehicle_make || '',
        model: driver.vehicle.model || driver.vehicle_model || '',
        color: driver.vehicle.color || driver.vehicle_color || '',
        plate: driver.vehicle.license_plate || driver.vehicle_plate || driver.license_plate || '',
        type: driver.vehicle.category || driver.vehicle_category || driver.vehicle_type || 'standard'
      };
    }
    
    // Sinon, construire depuis les champs individuels
    if (driver.vehicle_category || driver.vehicle_make || driver.vehicle_plate) {
      return {
        make: driver.vehicle_make || '',
        model: driver.vehicle_model || '',
        color: driver.vehicle_color || '',
        plate: driver.vehicle_plate || driver.license_plate || '',
        type: driver.vehicle_category || driver.vehicle_type || 'standard'
      };
    }
    
    return null;
  }, [state.currentDriver]);
  
  const [settings, setSettings] = useState({
    notifications: {
      newRides: true,
      payments: true,
      promotions: false,
      system: true
    },
    privacy: {
      shareLocation: true,
      showProfile: true,
      allowDirectContact: false
    },
    preferences: {
      darkMode: false,
      soundEffects: true,
      autoAcceptRadius: 5,
      workHours: {
        start: '06:00',
        end: '22:00'
      }
    }
  });

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const settingSections = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          key: 'newRides',
          label: 'Nouvelles demandes de course',
          description: 'Recevoir des notifications pour les nouvelles courses',
          type: 'switch',
          category: 'notifications'
        },
        {
          key: 'payments',
          label: 'Paiements reçus',
          description: 'Notifications de confirmation de paiement',
          type: 'switch',
          category: 'notifications'
        },
        {
          key: 'promotions',
          label: 'Promotions et offres',
          description: 'Recevoir des informations sur les promotions',
          type: 'switch',
          category: 'notifications'
        },
        {
          key: 'system',
          label: 'Mises à jour système',
          description: 'Notifications importantes du système',
          type: 'switch',
          category: 'notifications'
        }
      ]
    },
    {
      title: 'Confidentialité',
      icon: Shield,
      items: [
        {
          key: 'shareLocation',
          label: 'Partager ma position',
          description: 'Permettre aux clients de voir votre position',
          type: 'switch',
          category: 'privacy'
        },
        {
          key: 'showProfile',
          label: 'Profil visible',
          description: 'Afficher votre profil aux clients',
          type: 'switch',
          category: 'privacy'
        },
        {
          key: 'allowDirectContact',
          label: 'Contact direct',
          description: 'Permettre aux clients de vous contacter directement',
          type: 'switch',
          category: 'privacy'
        }
      ]
    },
    {
      title: 'Préférences',
      icon: Settings,
      items: [
        {
          key: 'darkMode',
          label: 'Mode sombre',
          description: 'Utiliser le thème sombre de l\'application',
          type: 'switch',
          category: 'preferences'
        },
        {
          key: 'soundEffects',
          label: 'Effets sonores',
          description: 'Activer les sons de notification',
          type: 'switch',
          category: 'preferences'
        }
      ]
    }
  ];

  const quickActions = [
    {
      title: 'Zone de travail',
      description: 'Définir votre zone de service préférée',
      icon: MapPin,
      action: () => {
        // Navigate to zone settings
      }
    },
    {
      title: 'Informations véhicule',
      description: 'Modifier les détails de votre véhicule',
      icon: Car,
      action: () => {
        // Navigate to vehicle settings
      }
    },
    {
      title: 'Paramètres de gain',
      description: 'Configuration des revenus et bonus',
      icon: DollarSign,
      action: () => {
        // Navigate to earnings settings
      }
    },
    {
      title: 'Navigation',
      description: 'Préférences de navigation GPS',
      icon: Navigation,
      action: () => {
        // Navigate to navigation settings
      }
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('driver-dashboard')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Paramètres</h1>
              <p className="text-sm text-gray-600">Configuration de votre compte chauffeur</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profil rapide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
                {state.currentDriver?.photo ? (
                  <img 
                    src={state.currentDriver.photo} 
                    alt={state.currentDriver.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{state.currentDriver?.name}</h2>
                <p className="text-gray-600">
                  {getVehicleDisplayName(vehicleInfo)}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-sm">
                  <span className="text-green-600">● En ligne</span>
                  <span className="text-gray-600">Note: {state.currentDriver?.rating}/5</span>
                  <span className="text-gray-600">{state.currentDriver?.totalRides} courses</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentScreen('driver-profile')}>
                Modifier profil
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Actions rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full h-auto p-4 justify-start"
                      onClick={action.action}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-medium">{action.title}</h4>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                      </div>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Paramètres détaillés */}
        {settingSections.map((section, sectionIndex) => {
          const SectionIcon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + sectionIndex * 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <SectionIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                </div>
                
                <div className="space-y-4">
                  {section.items.map((item, itemIndex) => (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + sectionIndex * 0.1 + itemIndex * 0.05 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <Label htmlFor={item.key} className="text-sm font-medium">
                          {item.label}
                        </Label>
                        <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                      </div>
                      
                      {item.type === 'switch' && (
                        <Switch
                          id={item.key}
                          checked={settings[item.category as keyof typeof settings][item.key as keyof any]}
                          onCheckedChange={(checked) => 
                            updateSetting(item.category, item.key, checked)
                          }
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          );
        })}

        {/* Paramètres avancés */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Paramètres avancés</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Rayon d'acceptation automatique</Label>
                  <p className="text-xs text-gray-600">Distance maximale pour accepter automatiquement les courses</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={settings.preferences.autoAcceptRadius}
                    onChange={(e) => updateSetting('preferences', 'autoAcceptRadius', parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm font-medium">{settings.preferences.autoAcceptRadius}km</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Heures de travail</Label>
                  <p className="text-xs text-gray-600">Définir vos heures de disponibilité préférées</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={settings.preferences.workHours.start}
                    onChange={(e) => updateSetting('preferences', 'workHours', {
                      ...settings.preferences.workHours,
                      start: e.target.value
                    })}
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <span className="text-xs">à</span>
                  <input
                    type="time"
                    value={settings.preferences.workHours.end}
                    onChange={(e) => updateSetting('preferences', 'workHours', {
                      ...settings.preferences.workHours,
                      end: e.target.value
                    })}
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Actions système */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Support et aide</h3>
            
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <HelpCircle className="w-5 h-5 mr-3" />
                Centre d'aide
              </Button>
              
              <a href="tel:+243990666661" className="w-full">
                <Button variant="outline" className="w-full justify-start">
                  <Smartphone className="w-5 h-5 mr-3" />
                  Contacter le support (+243 990 666 661)
                </Button>
              </a>
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  console.log('🚪 Déconnexion du conducteur');
                  setCurrentDriver(null);
                  // Pas besoin de changer currentView, juste l'écran
                  setCurrentScreen('landing');
                }}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Se déconnecter
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
