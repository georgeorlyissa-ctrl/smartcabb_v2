import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useGlobalConfig } from '../../hooks/useGlobalConfig';
import { useAppState } from '../../hooks/useAppState';
import { PhoneMigrationButton } from './PhoneMigrationButton';
import { 
  ArrowLeft, 
  Settings, 
  Percent, 
  DollarSign, 
  Clock,
  Bell,
  RefreshCw,
  Save,
  RotateCcw,
  MessageSquare
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';

export function GlobalSettingsScreen() {
  const { setCurrentScreen } = useAppState();
  const { config, loading, updateConfig, refresh } = useGlobalConfig();
  
  // État local pour les modifications
  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);

  // Synchroniser avec la config globale
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Mise à jour d'un paramètre local
  const handleChange = <K extends keyof typeof config>(
    key: K,
    value: typeof config[K]
  ) => {
    setLocalConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Sauvegarder tous les changements
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateConfig(localConfig);
      
      if (success) {
        toast.success('Paramètres mis à jour avec succès', {
          description: 'Les modifications sont appliquées partout dans l\'application en temps réel',
        });
      } else {
        toast.error('Erreur lors de la mise à jour', {
          description: 'Les paramètres n\'ont pas pu être sauvegardés',
        });
      }
    } catch (error) {
      toast.error('Erreur', {
        description: 'Impossible de sauvegarder les paramètres',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Réinitialiser aux valeurs serveur
  const handleReset = async () => {
    if (confirm('Voulez-vous vraiment annuler toutes les modifications non sauvegardées ?')) {
      await refresh();
      toast.success('Modifications annulées', {
        description: 'Valeurs restaurées depuis le serveur',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentScreen('admin-dashboard')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl">Paramètres Globaux</h1>
                <p className="text-sm text-gray-600">
                  Les modifications s'appliquent à toute l'application
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Commission */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Percent className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Commission</h3>
                  <p className="text-sm text-gray-600">Taux appliqué sur chaque course</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="commissionRate">Taux de commission (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={localConfig.commissionRate}
                    onChange={(e) => handleChange('commissionRate', parseFloat(e.target.value))}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Actuellement : {localConfig.commissionRate}%
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Tarification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Taux de Change</h3>
                  <p className="text-sm text-gray-600">Conversion USD ↔ CDF</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="exchangeRate">1 USD = ? CDF</Label>
                  <Input
                    id="exchangeRate"
                    type="number"
                    min="1000"
                    max="5000"
                    step="10"
                    value={localConfig.exchangeRate}
                    onChange={(e) => handleChange('exchangeRate', parseFloat(e.target.value))}
                    className="mt-1 text-xl font-bold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💱 Actuellement : 1 USD = {localConfig.exchangeRate} CDF
                  </p>
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠️ Cette modification affecte tous les prix affichés dans l'application
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Horaires & Tarification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Horaires & Tarifs</h3>
                  <p className="text-sm text-gray-600">Horaires et multiplicateurs</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nightTimeStart">Début nuit</Label>
                    <Input
                      id="nightTimeStart"
                      type="time"
                      value={localConfig.nightTimeStart}
                      onChange={(e) => handleChange('nightTimeStart', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nightTimeEnd">Fin nuit</Label>
                    <Input
                      id="nightTimeEnd"
                      type="time"
                      value={localConfig.nightTimeEnd}
                      onChange={(e) => handleChange('nightTimeEnd', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="freeWaitingMinutes">Minutes d'attente gratuites</Label>
                  <Input
                    id="freeWaitingMinutes"
                    type="number"
                    min="0"
                    max="60"
                    value={localConfig.freeWaitingMinutes}
                    onChange={(e) => handleChange('freeWaitingMinutes', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="distantZoneMultiplier">Multiplicateur zone lointaine (×)</Label>
                  <Input
                    id="distantZoneMultiplier"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={localConfig.distantZoneMultiplier}
                    onChange={(e) => handleChange('distantZoneMultiplier', parseFloat(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Paiement */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Paiement</h3>
                  <p className="text-sm text-gray-600">Options de paiement</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Post-paiement activé</Label>
                    <p className="text-xs text-gray-500">Permettre le paiement après la course</p>
                  </div>
                  <Switch
                    checked={localConfig.postpaidEnabled}
                    onCheckedChange={(checked) => handleChange('postpaidEnabled', checked)}
                  />
                </div>

                {localConfig.postpaidEnabled && (
                  <div>
                    <Label htmlFor="postpaidFee">Frais post-paiement (CDF)</Label>
                    <Input
                      id="postpaidFee"
                      type="number"
                      min="0"
                      step="100"
                      value={localConfig.postpaidFee}
                      onChange={(e) => handleChange('postpaidFee', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Flutterwave activé</Label>
                    <p className="text-xs text-gray-500">Paiement par carte/mobile money</p>
                  </div>
                  <Switch
                    checked={localConfig.flutterwaveEnabled}
                    onCheckedChange={(checked) => handleChange('flutterwaveEnabled', checked)}
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* SMS & Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Notifications</h3>
                  <p className="text-sm text-gray-600">SMS et alertes</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications activées</Label>
                    <p className="text-xs text-gray-500">Notifications push et email</p>
                  </div>
                  <Switch
                    checked={localConfig.notificationsEnabled}
                    onCheckedChange={(checked) => handleChange('notificationsEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS activés</Label>
                    <p className="text-xs text-gray-500">Envoi de SMS aux utilisateurs</p>
                  </div>
                  <Switch
                    checked={localConfig.smsEnabled}
                    onCheckedChange={(checked) => handleChange('smsEnabled', checked)}
                  />
                </div>

                {localConfig.smsEnabled && (
                  <div>
                    <Label htmlFor="smsProvider">Fournisseur SMS</Label>
                    <select
                      id="smsProvider"
                      value={localConfig.smsProvider}
                      onChange={(e) => handleChange('smsProvider', e.target.value as any)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    >
                      <option value="africas_talking">Africa's Talking</option>
                      <option value="twilio">Twilio</option>
                      <option value="disabled">Désactivé</option>
                    </select>
                  </div>
                )}

                {/* Bouton pour accéder aux paramètres SMS détaillés */}
                {localConfig.smsEnabled && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setCurrentScreen('sms-settings')}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Configurer & Tester les SMS
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Accédez aux paramètres détaillés, testez l'envoi et consultez l'historique
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Système */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Settings className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Système</h3>
                  <p className="text-sm text-gray-600">Paramètres avancés</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="appVersion">Version de l'application</Label>
                  <Input
                    id="appVersion"
                    type="text"
                    value={localConfig.appVersion}
                    onChange={(e) => handleChange('appVersion', e.target.value)}
                    className="mt-1"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Version actuelle : {localConfig.appVersion}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mode maintenance</Label>
                    <p className="text-xs text-gray-500">Désactiver temporairement l'application</p>
                  </div>
                  <Switch
                    checked={localConfig.maintenanceMode}
                    onCheckedChange={(checked) => handleChange('maintenanceMode', checked)}
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Informations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <RefreshCw className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Propagation automatique
                  </h4>
                  <p className="text-sm text-blue-800">
                    Les modifications apportées ici seront automatiquement appliquées dans toute l'application :
                  </p>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4 list-disc">
                    <li>Page d'accueil</li>
                    <li>Interface passager</li>
                    <li>Interface conducteur</li>
                    <li>Panel administrateur</li>
                    <li>Calculs de prix</li>
                    <li>Notifications SMS</li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Migration des numéros de téléphone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-start space-x-3 mb-4">
                <Settings className="w-5 h-5 text-yellow-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    Outils de maintenance
                  </h4>
                  <p className="text-sm text-yellow-800 mb-4">
                    Si des utilisateurs ne peuvent pas se connecter, normalisez tous les numéros de téléphone au format standard +243XXXXXXXXX.
                  </p>
                  <PhoneMigrationButton />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}