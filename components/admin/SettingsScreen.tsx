import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useAppState } from '../../hooks/useAppState';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { PolicyModal } from '../PolicyModal';
import { CommissionSettings } from '../CommissionSettings';
import { 
  ArrowLeft, 
  Settings, 
  Euro, 
  Percent,
  Clock,
  Car,
  Smartphone,
  Save,
  Shield,
  FileText,
  DollarSign,
  RefreshCw
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';
import { formatCDF } from '../../lib/pricing';
import { supabase } from '../../lib/supabase';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface SettingsScreenProps {
  onBack?: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { setCurrentScreen, setPolicyAccepted, state, updateSystemSettings } = useAppState();
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  
  const [pricing, setPricing] = useState({
    baseFare: 2.50,
    perKmRate: 1.20,
    perMinuteRate: 0.25,
    minimumFare: 5.00,
    commission: 20
  });

  const [currencySettings, setCurrencySettings] = useState(() => ({
    exchangeRateUSDToCDF: state.systemSettings?.exchangeRate || 2000, // 🔄 Mis à jour : 2000 CDF par défaut
    postpaidInterestRate: state.systemSettings?.postpaidInterestRate || 15,
    allowMixedPayment: true,
    allowUSDPayment: true
  }));

  const [features, setFeatures] = useState({
    realTimeTracking: true,
    automaticDispatch: true,
    driverRatings: true,
    promotionalCodes: false,
    peakHourPricing: true
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  });

  // Charger les paramètres de notifications depuis l'état global au montage
  useEffect(() => {
    if (state.systemSettings) {
      setNotifications({
        emailNotifications: state.systemSettings.emailNotifications ?? true,
        smsNotifications: state.systemSettings.smsNotifications ?? false,
        pushNotifications: state.systemSettings.pushNotifications ?? true
      });
    }
  }, [state.systemSettings]);

  const handleSaveSettings = async () => {
    // Sauvegarder les nouveaux paramètres dans l'état global (localStorage)
    if (updateSystemSettings) {
      updateSystemSettings({
        exchangeRate: currencySettings.exchangeRateUSDToCDF,
        postpaidInterestRate: currencySettings.postpaidInterestRate,
        // Sauvegarder les paramètres de notifications
        emailNotifications: notifications.emailNotifications,
        smsNotifications: notifications.smsNotifications,
        pushNotifications: notifications.pushNotifications
      });
    }
    
    // 🔥 AUSSI sauvegarder dans le KV store serveur (pour que le backend y accède)
    try {
      const systemSettings = {
        exchangeRate: currencySettings.exchangeRateUSDToCDF,
        postpaidInterestRate: currencySettings.postpaidInterestRate,
        emailNotifications: notifications.emailNotifications,
        smsNotifications: notifications.smsNotifications,
        pushNotifications: notifications.pushNotifications,
        updatedAt: new Date().toISOString()
      };
      
      console.log('📤 Envoi au backend:', systemSettings);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/settings/update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(systemSettings)
        }
      );
      
      const result = await response.json();
      
      if (!result.success) {
        console.warn('⚠️ Erreur sauvegarde KV store:', result.error);
        toast.error('Erreur lors de la sauvegarde backend', {
          description: result.error || 'Impossible de sauvegarder dans le backend'
        });
        return;
      } else {
        console.log('✅ Paramètres sauvegardés dans le KV store serveur:', result);
        toast.success('Paramètres sauvegardés avec succès !', {
          description: `Taux de change: ${currencySettings.exchangeRateUSDToCDF} CDF - Synchronisé sur tous les appareils`
        });
      }
    } catch (err) {
      console.error('⚠️ Erreur appel serveur pour KV store:', err);
      toast.error('Erreur réseau', {
        description: 'Impossible de contacter le serveur backend'
      });
      return;
    }
    
    // ✅ AUSSI sauvegarder dans Supabase (seulement SMS car c'est la seule colonne qui existe)
    try {
      const { error } = await supabase
        .from('settings_2eb02e52')
        .update({
          sms_enabled: notifications.smsNotifications
          // NOTE: email_enabled et push_enabled n'existent pas dans la table
        })
        .eq('id', '1'); // id est TEXT

      if (error) {
        console.error('Erreur sauvegarde Supabase:', error);
        // Ne pas bloquer si erreur Supabase, on a déjà sauvegardé dans localStorage
      } else {
        console.log('✅ Notification SMS sauvegardée dans Supabase:', notifications.smsNotifications);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde Supabase:', err);
    }
  };

  const handleResetPolicy = () => {
    setPolicyAccepted(false);
    setShowPolicyModal(true);
    toast.info("Politique d'utilisation réinitialisée. Les utilisateurs devront l'accepter à nouveau.");
  };

  const handlePolicyAccept = () => {
    setPolicyAccepted(true);
    setShowPolicyModal(false);
  };

  useEffect(() => {
    // Initialiser les paramètres de devise et de tarification à partir des paramètres du système
    if (state.systemSettings) {
      setCurrencySettings({
        exchangeRateUSDToCDF: state.systemSettings.exchangeRate || 2000, // 🔄 Mis à jour : 2000 CDF par défaut
        postpaidInterestRate: state.systemSettings.postpaidInterestRate || 15,
        allowMixedPayment: true,
        allowUSDPayment: true
      });
      setPricing({
        baseFare: state.systemSettings.baseFare || 2.50,
        perKmRate: state.systemSettings.perKmRate || 1.20,
        perMinuteRate: state.systemSettings.perMinuteRate || 0.25,
        minimumFare: state.systemSettings.minimumFare || 5.00,
        commission: state.systemSettings.commission || 20
      });
    }
  }, [state.systemSettings]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onBack ? onBack() : setCurrentScreen('admin-dashboard')}
                className="w-10 h-10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl">Paramètres du système</h1>
                  <p className="text-sm text-gray-600">Configuration générale de SmartCabb</p>
                </div>
              </div>
            </div>
            <Button
              onClick={handleSaveSettings}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Currency Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl">Paramètres de devise</h2>
                  <p className="text-sm text-gray-600">Configuration USD/CDF et post payé</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="exchangeRate">Taux de change USD → CDF</Label>
                  <div className="relative mt-2">
                    <Input
                      id="exchangeRate"
                      type="number"
                      value={currencySettings.exchangeRateUSDToCDF}
                      onChange={(e) => setCurrencySettings(prev => ({ 
                        ...prev, 
                        exchangeRateUSDToCDF: parseFloat(e.target.value) 
                      }))}
                      className="pr-10"
                    />
                    <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    1 USD = {formatCDF(currencySettings.exchangeRateUSDToCDF)}
                  </p>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      💡 <strong>Synchronisation automatique :</strong> Lorsque vous sauvegardez, le taux sera synchronisé sur tous les appareils (desktop, mobile, etc.) automatiquement.
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="postpaidRate">Taux d'intérêt post payé (%)</Label>
                  <div className="relative mt-2">
                    <Input
                      id="postpaidRate"
                      type="number"
                      value={currencySettings.postpaidInterestRate}
                      onChange={(e) => setCurrencySettings(prev => ({ 
                        ...prev, 
                        postpaidInterestRate: parseFloat(e.target.value) 
                      }))}
                      className="pr-10"
                    />
                    <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Paiement en USD</Label>
                      <p className="text-sm text-gray-600">Autoriser les paiements en dollars</p>
                    </div>
                    <Switch
                      checked={currencySettings.allowUSDPayment}
                      onCheckedChange={(checked) => setCurrencySettings(prev => ({ 
                        ...prev, 
                        allowUSDPayment: checked 
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Paiement mixte</Label>
                      <p className="text-sm text-gray-600">Espèces + Mobile Money</p>
                    </div>
                    <Switch
                      checked={currencySettings.allowMixedPayment}
                      onCheckedChange={(checked) => setCurrencySettings(prev => ({ 
                        ...prev, 
                        allowMixedPayment: checked 
                      }))}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          {/* Pricing Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Euro className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl">Tarification</h2>
                  <p className="text-sm text-gray-600">Configuration des prix</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="baseFare">Prix de base (€)</Label>
                  <Input
                    id="baseFare"
                    type="number"
                    step="0.01"
                    value={pricing.baseFare}
                    onChange={(e) => setPricing(prev => ({ ...prev, baseFare: parseFloat(e.target.value) }))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="perKmRate">Prix par kilomètre (€)</Label>
                  <Input
                    id="perKmRate"
                    type="number"
                    step="0.01"
                    value={pricing.perKmRate}
                    onChange={(e) => setPricing(prev => ({ ...prev, perKmRate: parseFloat(e.target.value) }))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="perMinuteRate">Prix par minute (€)</Label>
                  <Input
                    id="perMinuteRate"
                    type="number"
                    step="0.01"
                    value={pricing.perMinuteRate}
                    onChange={(e) => setPricing(prev => ({ ...prev, perMinuteRate: parseFloat(e.target.value) }))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="minimumFare">Course minimum (€)</Label>
                  <Input
                    id="minimumFare"
                    type="number"
                    step="0.01"
                    value={pricing.minimumFare}
                    onChange={(e) => setPricing(prev => ({ ...prev, minimumFare: parseFloat(e.target.value) }))}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="commission">Commission SmartCabb (%)</Label>
                  <div className="relative mt-2">
                    <Input
                      id="commission"
                      type="number"
                      value={pricing.commission}
                      onChange={(e) => setPricing(prev => ({ ...prev, commission: parseInt(e.target.value) }))}
                      className="pr-10"
                    />
                    <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Feature Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl">Fonctionnalités</h2>
                  <p className="text-sm text-gray-600">Activation des services</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Suivi en temps réel</Label>
                    <p className="text-sm text-gray-600">GPS tracking des courses</p>
                  </div>
                  <Switch
                    checked={features.realTimeTracking}
                    onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, realTimeTracking: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Attribution automatique</Label>
                    <p className="text-sm text-gray-600">Assignation auto des conducteurs</p>
                  </div>
                  <Switch
                    checked={features.automaticDispatch}
                    onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, automaticDispatch: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Évaluations conducteurs</Label>
                    <p className="text-sm text-gray-600">Système de notation</p>
                  </div>
                  <Switch
                    checked={features.driverRatings}
                    onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, driverRatings: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Codes promotionnels</Label>
                    <p className="text-sm text-gray-600">Réductions et offres</p>
                  </div>
                  <Switch
                    checked={features.promotionalCodes}
                    onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, promotionalCodes: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tarification dynamique</Label>
                    <p className="text-sm text-gray-600">Prix selon la demande</p>
                  </div>
                  <Switch
                    checked={features.peakHourPricing}
                    onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, peakHourPricing: checked }))}
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Notification Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl">Notifications</h2>
                  <p className="text-sm text-gray-600">Paramètres d'alerte</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications email</Label>
                    <p className="text-sm text-gray-600">Alertes par email</p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications SMS</Label>
                    <p className="text-sm text-gray-600">Alertes par SMS</p>
                  </div>
                  <Switch
                    checked={notifications.smsNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, smsNotifications: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications push</Label>
                    <p className="text-sm text-gray-600">Alertes mobiles</p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushNotifications: checked }))}
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl">État du système</h2>
                  <p className="text-sm text-gray-600">Informations techniques</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Version de l'application</span>
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">v2.4.1</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Dernière sauvegarde</span>
                  <span className="text-sm text-gray-600">Il y a 2 heures</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Serveurs</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-600">Opérationnels</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Base de données</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm text-green-600">Connectée</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Legal & Policy Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl">Politique et conditions</h2>
                  <p className="text-sm text-gray-600">Gestion des conditions d'utilisation</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <div>
                      <Label>Politique d'utilisation</Label>
                      <p className="text-sm text-gray-600">Consulter ou modifier les conditions d'utilisation</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPolicyModal(true)}
                    >
                      Consulter
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetPolicy}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-700 mb-1">Information importante</p>
                      <p className="text-blue-600">
                        La réinitialisation de la politique d'utilisation obligera tous les utilisateurs 
                        à accepter à nouveau les conditions lors de leur prochaine connexion.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
          
          {/* Commission Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2"
          >
            <CommissionSettings userType="admin" />
          </motion.div>
        </div>

        {/* Save Button (Mobile) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 lg:hidden"
        >
          <Button
            onClick={handleSaveSettings}
            className="w-full h-12 bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder les paramètres
          </Button>
        </motion.div>
      </div>

      {/* Policy Modal */}
      <PolicyModal 
        isOpen={showPolicyModal}
        onAccept={() => setShowPolicyModal(false)}
        showCloseButton={true}
      />
    </div>
  );
}