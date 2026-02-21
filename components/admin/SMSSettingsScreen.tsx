/**
 * Écran de gestion des paramètres SMS
 * Pour configurer Africa's Talking ou Twilio
 */

import { useState, useEffect } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../../lib/toast';
import { ArrowLeft, Send, CheckCircle, XCircle, Loader2, Info, RefreshCw } from '../../lib/admin-icons';
import { supabase } from '../../lib/supabase';
import { Alert, AlertDescription } from '../ui/alert';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface SMSSettings {
  sms_enabled: boolean;
  sms_provider: 'africas-talking' | 'twilio';
}

interface SMSLog {
  id: string;
  phone_number: string;
  message: string;
  type: string;
  provider: string;
  status: string;
  sent_at: string;
}

interface SMSSettingsScreenProps {
  onBack: () => void;
}

export function SMSSettingsScreen({ onBack }: SMSSettingsScreenProps) {
  const [settings, setSettings] = useState<SMSSettings>({
    sms_enabled: false,
    sms_provider: 'africas-talking',
  });
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('🔄 Chargement des paramètres SMS depuis Supabase...');
      
      const { data, error } = await supabase
        .from('settings_2eb02e52')
        .select('sms_enabled, sms_provider')
        .single();

      console.log('📊 Résultat Supabase:', { data, error });

      if (error) {
        console.error('❌ Erreur chargement paramètres SMS depuis Supabase:', error);
        
        // ✅ Si la table n'existe pas, créer automatiquement
        if (error.code === 'PGRST116') {
          console.log('⚠️ Aucune ligne trouvée, création automatique...');
          
          const { error: insertError } = await supabase
            .from('settings_2eb02e52')
            .insert({
              id: '1',
              sms_enabled: true,
              sms_provider: 'africas-talking'
            });

          if (insertError && insertError.code !== '23505') {
            console.error('Erreur création paramètres:', insertError);
          } else {
            console.log('✅ Paramètres créés automatiquement !');
            // Réessayer de charger
            const { data: newData } = await supabase
              .from('settings_2eb02e52')
              .select('sms_enabled, sms_provider')
              .single();
            
            if (newData) {
              setSettings({
                sms_enabled: newData.sms_enabled ?? true,
                sms_provider: newData.sms_provider || 'africas-talking',
              });
              console.log('✅ Paramètres SMS chargés après création:', newData);
              setLoading(false);
              return;
            }
          }
        }
        
        // ✅ FALLBACK : Lire depuis localStorage si Supabase échoue
        try {
          const savedSettings = localStorage.getItem('smartcab_system_settings');
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettings({
              sms_enabled: parsed.smsNotifications ?? false,
              sms_provider: 'africas-talking',
            });
            console.log('⚠️ Paramètres SMS chargés depuis localStorage (fallback):', parsed);
            toast.warning('Paramètres chargés depuis le cache local. Cliquez sur 🔄 pour recharger depuis la base.');
            setLoading(false);
            return;
          }
        } catch (localError) {
          console.error('Erreur lecture localStorage:', localError);
        }
        
        toast.error('Erreur de chargement des paramètres');
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          sms_enabled: data.sms_enabled ?? true, // Par défaut TRUE
          sms_provider: data.sms_provider || 'africas-talking',
        });
        console.log('✅ Paramètres SMS chargés depuis Supabase:', data);
      }
    } catch (error) {
      console.error('❌ Erreur chargement paramètres SMS:', error);
      toast.error('Erreur de chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        console.log('⚠️ Pas de session, impossible de charger les logs');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/sms/logs`,
        {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setLogs(result.logs || []);
        console.log('✅ Logs SMS chargés:', result.logs?.length || 0);
      } else {
        console.error('❌ Erreur HTTP chargement logs:', response.status);
        // Ne pas afficher d'erreur à l'utilisateur, juste logger
      }
    } catch (error) {
      console.error('❌ Erreur chargement logs SMS:', error);
      // Ne pas afficher d'erreur toast, c'est pas critique
      // L'utilisateur peut quand même utiliser les paramètres SMS
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings_2eb02e52')
        .update({
          sms_enabled: settings.sms_enabled,
          sms_provider: settings.sms_provider,
        })
        .eq('id', '1'); // id est TEXT, pas INTEGER

      if (error) throw error;

      // ✅ Sauvegarder AUSSI dans localStorage pour synchronisation
      const savedSettings = localStorage.getItem('smartcab_system_settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          parsed.smsNotifications = settings.sms_enabled;
          localStorage.setItem('smartcab_system_settings', JSON.stringify(parsed));
          console.log('✅ Paramètres SMS synchronisés dans localStorage');
        } catch (e) {
          console.error('Erreur synchronisation localStorage:', e);
        }
      }

      toast.success('Paramètres SMS enregistrés avec succès');
    } catch (error) {
      console.error('Erreur sauvegarde paramètres SMS:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const testSMS = async () => {
    if (!testPhone) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }

    if (!testPhone.startsWith('+243')) {
      toast.error('Le numéro doit commencer par +243 (format RDC)');
      return;
    }

    setTesting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Session expirée');
        return;
      }

      console.log('🔄 Envoi SMS de test vers:', testPhone);
      
      // ✅ TIMEOUT DE 15 SECONDES
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('⏱️ TIMEOUT : Le serveur ne répond pas');
      }, 15000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/sms/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ phoneNumber: testPhone }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const result = await response.json();
      console.log('📊 Résultat SMS:', result);

      if (result.success) {
        toast.success(`SMS de test envoyé via ${result.provider}!`);
        setTestPhone('');
        loadLogs(); // Recharger les logs
      } else {
        console.error('❌ Erreur SMS:', result.message);
        toast.error(result.message || 'Échec de l\'envoi du SMS');
      }
    } catch (error) {
      console.error('❌ Erreur test SMS:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Le serveur met trop de temps à répondre. Vérifiez vos identifiants Africa\'s Talking.');
      } else {
        toast.error('Erreur de connexion: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
      }
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Envoyé
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            Échoué
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
            <Loader2 className="w-3 h-3 animate-spin" />
            En attente
          </span>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ride_confirmed: 'Course confirmée',
      driver_enroute: 'Conducteur en route',
      driver_arrived: 'Conducteur arrivé',
      confirmation_code: 'Code de confirmation',
      ride_started: 'Course démarrée',
      ride_completed: 'Course terminée',
      payment_received: 'Paiement reçu',
      rating_request: 'Demande de notation',
      account_validated: 'Compte validé',
      test: 'Test',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl">Notifications SMS</h1>
                <p className="text-sm text-gray-600">
                  Configurer Africa's Talking ou Twilio
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setLoading(true);
                loadSettings();
                loadLogs();
                toast.success('Paramètres rechargés');
              }}
              className="shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration SMS</CardTitle>
            <CardDescription>
              Activer et configurer les notifications SMS pour les passagers et conducteurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Activation */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Activer les notifications SMS</Label>
                <p className="text-sm text-gray-500">
                  Envoyer des SMS automatiques pour les événements importants
                </p>
              </div>
              <Switch
                checked={settings.sms_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sms_enabled: checked })
                }
              />
            </div>

            {/* Provider */}
            <div className="space-y-2">
              <Label>Provider SMS</Label>
              <Select
                value={settings.sms_provider}
                onValueChange={(value: 'africas-talking' | 'twilio') =>
                  setSettings({ ...settings, sms_provider: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="africas-talking">
                    Africa's Talking (Recommandé pour la RDC)
                  </SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Instructions */}
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                {settings.sms_provider === 'africas-talking' ? (
                  <div className="space-y-2">
                    <p className="font-medium">Africa's Talking Configuration:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Créer un compte sur <a href="https://africastalking.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">africastalking.com</a></li>
                      <li>Obtenir votre API Key</li>
                      <li>Dans Supabase: Settings → Edge Functions → Secrets</li>
                      <li>Ajouter: <code className="bg-gray-100 px-1 rounded">AFRICAS_TALKING_API_KEY</code></li>
                      <li>Ajouter: <code className="bg-gray-100 px-1 rounded">AFRICAS_TALKING_USERNAME</code> (optionnel)</li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-medium">Twilio Configuration:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Créer un compte sur <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">twilio.com</a></li>
                      <li>Obtenir Account SID, Auth Token et Phone Number</li>
                      <li>Dans Supabase: Settings → Edge Functions → Secrets</li>
                      <li>Ajouter: <code className="bg-gray-100 px-1 rounded">TWILIO_ACCOUNT_SID</code></li>
                      <li>Ajouter: <code className="bg-gray-100 px-1 rounded">TWILIO_AUTH_TOKEN</code></li>
                      <li>Ajouter: <code className="bg-gray-100 px-1 rounded">TWILIO_PHONE_NUMBER</code></li>
                    </ol>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Bouton Enregistrer */}
            <Button onClick={saveSettings} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les paramètres'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test SMS */}
        <Card>
          <CardHeader>
            <CardTitle>Tester l'envoi de SMS</CardTitle>
            <CardDescription>
              Envoyer un SMS de test pour vérifier la configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Numéro de téléphone (format international)</Label>
              <Input
                type="tel"
                placeholder="+243999123456"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Le numéro doit commencer par +243 (indicatif RDC)
              </p>
            </div>
            <Button
              onClick={testSMS}
              disabled={testing || !settings.sms_enabled}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer un SMS de test
                </>
              )}
            </Button>
            {!settings.sms_enabled && (
              <p className="text-sm text-amber-600">
                ⚠️ Vous devez activer les SMS avant de tester
              </p>
            )}
          </CardContent>
        </Card>

        {/* Historique des SMS */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des SMS envoyés</CardTitle>
            <CardDescription>
              Les 100 derniers SMS envoyés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Aucun SMS envoyé pour le moment
              </p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {getTypeLabel(log.type)}
                          </span>
                          {getStatusBadge(log.status)}
                        </div>
                        <p className="text-sm text-gray-900">{log.phone_number}</p>
                        <p className="text-xs text-gray-600">{log.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Via {log.provider}</span>
                      <span>{new Date(log.sent_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Types de notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Types de notifications SMS</CardTitle>
            <CardDescription>
              SMS automatiques envoyés par SmartCabb
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {[
                { type: 'ride_confirmed', desc: 'Quand une course est confirmée (passager + conducteur)' },
                { type: 'driver_enroute', desc: 'Quand le conducteur se dirige vers le passager' },
                { type: 'driver_arrived', desc: 'Quand le conducteur est arrivé au point de départ' },
                { type: 'confirmation_code', desc: 'Code à montrer au conducteur pour démarrer' },
                { type: 'ride_started', desc: 'Quand la course démarre (passager + conducteur)' },
                { type: 'ride_completed', desc: 'Quand la course est terminée (passager + conducteur)' },
                { type: 'payment_received', desc: 'Quand le paiement est reçu (conducteur)' },
                { type: 'rating_request', desc: 'Demande de notation après la course' },
                { type: 'account_validated', desc: 'Quand un compte conducteur est validé' },
              ].map((item) => (
                <div key={item.type} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm">{getTypeLabel(item.type)}</p>
                    <p className="text-xs text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}