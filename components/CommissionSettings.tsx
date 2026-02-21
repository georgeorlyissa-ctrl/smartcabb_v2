import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAppState } from '../hooks/useAppState';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Percent,
  DollarSign,
  TrendingUp,
  Clock,
  Settings as SettingsIcon,
  AlertCircle,
  CheckCircle,
  Receipt,
  Info
} from '../lib/icons';
import { toast } from '../lib/toast';

interface CommissionSettingsProps {
  userType: 'admin' | 'driver';
  driverId?: string;
}

export function CommissionSettings({ userType, driverId }: CommissionSettingsProps) {
  const { state, updateAdminSettings } = useAppState();
  const [commissionEnabled, setCommissionEnabled] = useState(true);
  const [commissionRate, setCommissionRate] = useState(15); // Percentage
  const [minimumCommission, setMinimumCommission] = useState(500); // CDF
  const [paymentFrequency, setPaymentFrequency] = useState<'immediate' | 'daily' | 'weekly'>('immediate');
  const [autoDeduction, setAutoDeduction] = useState(true);
  const [totalCommissionToday, setTotalCommissionToday] = useState(0); // ✅ Initialisé à 0
  const [totalCommissionWeek, setTotalCommissionWeek] = useState(0); // ✅ Initialisé à 0
  const [pendingCommission, setPendingCommission] = useState(0); // ✅ Initialisé à 0
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charger les paramètres depuis le backend au démarrage
    loadSettings();
    
    // ✅ CORRECTION : Charger les commissions réelles pour le conducteur avec auto-refresh
    if (userType === 'driver' && driverId) {
      loadDriverCommissions();
      
      // ✅ NOUVEAU : Rafraîchir toutes les 10 secondes
      const intervalId = setInterval(loadDriverCommissions, 10000);
      
      return () => clearInterval(intervalId);
    }
  }, [userType, driverId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/settings/load`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erreur chargement paramètres');
      }

      const data = await response.json();
      
      if (data.success && data.settings) {
        // Mettre à jour le state avec les paramètres chargés
        setCommissionEnabled(data.settings.commissionEnabled ?? true);
        setCommissionRate(data.settings.commissionRate ?? 15);
        setMinimumCommission(data.settings.minimumCommission ?? 500);
        setPaymentFrequency(data.settings.paymentFrequency ?? 'immediate');
        setAutoDeduction(data.settings.autoDeduction ?? true);
        
        // Mettre à jour le state global aussi
        if (updateAdminSettings) {
          updateAdminSettings(data.settings);
        }
        
        console.log('✅ Paramètres admin chargés depuis le backend');
      }
    } catch (error) {
      console.error('❌ Erreur chargement paramètres admin:', error);
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOUVEAU : Charger les commissions réelles du conducteur
  const loadDriverCommissions = async () => {
    if (!driverId) return;

    try {
      setLoading(true);

      // Récupérer les gains d'aujourd'hui
      const todayResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/driver/${driverId}/earnings?period=today`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Récupérer les gains de la semaine
      const weekResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/driver/${driverId}/earnings?period=week`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (todayResponse.ok && weekResponse.ok) {
        const todayData = await todayResponse.json();
        const weekData = await weekResponse.json();

        if (todayData.success && weekData.success) {
          setTotalCommissionToday(todayData.earnings.commission || 0);
          setTotalCommissionWeek(weekData.earnings.commission || 0);
          setPendingCommission(0); // Pour l'instant pas de commission en attente
          
          console.log('✅ Commissions conducteur chargées:', {
            today: todayData.earnings.commission,
            week: weekData.earnings.commission
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement commissions conducteur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    const newSettings = {
      ...state.adminSettings,
      commissionEnabled,
      commissionRate,
      minimumCommission,
      paymentFrequency,
      autoDeduction,
      updatedAt: new Date().toISOString()
    };

    try {
      // Sauvegarder dans le backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/settings/save`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newSettings)
        }
      );

      if (!response.ok) {
        throw new Error('Erreur sauvegarde paramètres');
      }

      const data = await response.json();
      
      if (data.success) {
        // Mettre à jour le state global
        if (updateAdminSettings) {
          updateAdminSettings(newSettings);
        }
        
        toast.success('✅ Paramètres enregistrés dans la base de données !');
        console.log('✅ Paramètres admin sauvegardés dans le backend');
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('❌ Erreur sauvegarde paramètres admin:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
    }
  };

  const calculateCommission = (rideAmount: number) => {
    const commission = (rideAmount * commissionRate) / 100;
    return Math.max(commission, minimumCommission);
  };

  const paymentFrequencyOptions = {
    immediate: 'Prélèvement immédiat',
    daily: 'Prélèvement quotidien',
    weekly: 'Prélèvement hebdomadaire'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Percent className="w-5 h-5 mr-2 text-blue-600" />
            {userType === 'admin' ? 'Gestion des Commissions' : 'Ma Commission'}
          </h3>
          <p className="text-sm text-gray-600">
            {userType === 'admin' 
              ? 'Configuration du système de prélèvement automatique'
              : 'Informations sur vos commissions et prélèvements'
            }
          </p>
        </div>
        
        {userType === 'admin' && (
          <Badge variant={commissionEnabled ? "default" : "secondary"}>
            {commissionEnabled ? 'Actif' : 'Inactif'}
          </Badge>
        )}
      </div>

      {/* Commission Statistics (for both admin and driver) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aujourd'hui</p>
              <p className="text-xl font-semibold text-green-600">
                {(totalCommissionToday || 0).toLocaleString()} CDF
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cette semaine</p>
              <p className="text-xl font-semibold text-blue-600">
                {(totalCommissionWeek || 0).toLocaleString()} CDF
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-xl font-semibold text-orange-600">
                {(pendingCommission || 0).toLocaleString()} CDF
              </p>
            </div>
            <Receipt className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Admin Settings */}
      {userType === 'admin' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-gray-600" />
            <h4 className="font-semibold">Paramètres de Commission</h4>
          </div>

          {/* Enable/Disable Commission */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Prélèvement automatique</Label>
              <p className="text-sm text-gray-600">
                Activer le système de prélèvement automatique des commissions
              </p>
            </div>
            <Switch
              checked={commissionEnabled}
              onCheckedChange={setCommissionEnabled}
            />
          </div>

          <Separator />

          {/* Commission Rate */}
          <div className="space-y-3">
            <Label className="font-medium">Taux de commission (%)</Label>
            <div className="flex items-center space-x-3">
              <Input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-32"
                min="0"
                max="50"
                step="0.5"
                disabled={!commissionEnabled}
              />
              <span className="text-sm text-gray-600">% par course</span>
            </div>
            <p className="text-xs text-gray-500">
              Commission prélevée sur chaque course terminée
            </p>
          </div>

          {/* Minimum Commission */}
          <div className="space-y-3">
            <Label className="font-medium">Commission minimum (CDF)</Label>
            <div className="flex items-center space-x-3">
              <Input
                type="number"
                value={minimumCommission}
                onChange={(e) => setMinimumCommission(Number(e.target.value))}
                className="w-32"
                min="0"
                step="100"
                disabled={!commissionEnabled}
              />
              <span className="text-sm text-gray-600">CDF minimum</span>
            </div>
            <p className="text-xs text-gray-500">
              Montant minimum prélevé même pour les petites courses
            </p>
          </div>

          {/* Payment Frequency */}
          <div className="space-y-3">
            <Label className="font-medium">Fréquence de prélèvement</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(paymentFrequencyOptions).map(([key, label]) => (
                <Button
                  key={key}
                  variant={paymentFrequency === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentFrequency(key as any)}
                  disabled={!commissionEnabled}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Auto Deduction */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Prélèvement automatique</Label>
              <p className="text-sm text-gray-600">
                Prélever automatiquement lors du paiement des courses
              </p>
            </div>
            <Switch
              checked={autoDeduction}
              onCheckedChange={setAutoDeduction}
              disabled={!commissionEnabled}
            />
          </div>

          <Separator />

          <Button onClick={handleSaveSettings} className="w-full">
            <CheckCircle className="w-4 h-4 mr-2" />
            Sauvegarder les paramètres
          </Button>
        </Card>
      )}

      {/* Commission Calculator */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold">Calculateur de Commission</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Montant de la course</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                placeholder="Ex: 15000"
                className="text-center"
                id="ride-amount"
              />
              <span className="text-sm text-gray-600">CDF</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Commission ({commissionRate}%)</Label>
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <span className="font-semibold text-blue-600">
                {calculateCommission(15000).toLocaleString()} CDF
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Montant conducteur</Label>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <span className="font-semibold text-green-600">
                {(15000 - calculateCommission(15000)).toLocaleString()} CDF
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Information Panel */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h5 className="font-medium text-blue-900 mb-2">
              Informations importantes
            </h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Les commissions sont prélevées automatiquement après chaque course</li>
              <li>• Le conducteur reçoit le montant net après déduction</li>
              <li>• Les prélèvements sont transparents et détaillés dans l'historique</li>
              <li>• Possibilité de modifier les paramètres selon les besoins</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}