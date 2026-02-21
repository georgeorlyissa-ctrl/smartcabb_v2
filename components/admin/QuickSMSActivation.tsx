/**
 * Composant d'activation rapide des SMS
 * Bouton flottant pour activer/désactiver les notifications SMS
 */

import { useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from '../../lib/toast';
import { MessageSquare, Loader2 } from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

interface QuickSMSActivationProps {
  onOpenSettings?: () => void;
}

export function QuickSMSActivation({ onOpenSettings }: QuickSMSActivationProps) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
  });

  const loadConfig = async () => {
    try {
      const { data } = await supabase
        .from('settings_2eb02e52')
        .select('sms_enabled')
        .single();

      if (data) {
        setEnabled(data.sms_enabled || false);
      }
    } catch (error) {
      console.error('Erreur chargement config SMS:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await supabase
        .from('sms_logs_2eb02e52')
        .select('status');

      if (data) {
        setStats({
          total: data.length,
          sent: data.filter(log => log.status === 'sent').length,
          failed: data.filter(log => log.status === 'failed').length,
        });
      }
    } catch (error) {
      console.error('Erreur chargement stats SMS:', error);
    }
  };

  const toggleSMS = async (checked: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('settings_2eb02e52')
        .update({ sms_enabled: checked })
        .eq('id', 1);

      if (error) throw error;

      setEnabled(checked);
      toast.success(
        checked 
          ? '✅ Notifications SMS activées !' 
          : '🔕 Notifications SMS désactivées'
      );
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const sendTestSMS = async () => {
    if (!testPhone) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }

    if (!testPhone.startsWith('+243')) {
      toast.error('Le numéro doit commencer par +243');
      return;
    }

    setTesting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error('Session expirée');
        return;
      }

      const response = await fetch(
        `https://${projectId || 'ookexbnnokctqflkpqjm'}.supabase.co/functions/v1/make-server-2eb02e52/sms/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ phoneNumber: testPhone }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('✅ SMS de test envoyé !');
        setTestPhone('');
        loadStats();
      } else {
        toast.error(result.message || 'Échec de l\'envoi');
      }
    } catch (error) {
      console.error('Erreur test SMS:', error);
      toast.error('Erreur lors du test SMS');
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 p-4 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-all hover:scale-110"
        title="Notifications SMS"
      >
        <MessageSquare className="w-6 h-6" />
        {enabled && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-600" />
              Notifications SMS
            </DialogTitle>
            <DialogDescription>
              Gérer les notifications SMS pour SmartCabb
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Activation */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Activer les SMS</Label>
                    <p className="text-sm text-gray-500">
                      Notifications automatiques
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={toggleSMS}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl text-blue-600">{stats.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl text-green-600">{stats.sent}</div>
                    <div className="text-xs text-gray-600">Envoyés</div>
                  </div>
                  <div>
                    <div className="text-2xl text-red-600">{stats.failed}</div>
                    <div className="text-xs text-gray-600">Échoués</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test */}
            {enabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Test rapide</CardTitle>
                  <CardDescription>
                    Envoyer un SMS de test
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    type="tel"
                    placeholder="+243999123456"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                  <Button
                    onClick={sendTestSMS}
                    disabled={testing}
                    className="w-full"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Bouton Paramètres complets */}
            {onOpenSettings && (
              <Button
                onClick={() => {
                  setOpen(false);
                  onOpenSettings();
                }}
                variant="outline"
                className="w-full"
              >
                <Settings className="w-4 h-4 mr-2" />
                Paramètres complets
              </Button>
            )}

            {/* Info */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>✅ Course confirmée</p>
              <p>✅ Conducteur en route</p>
              <p>✅ Conducteur arrivé</p>
              <p>✅ Course démarrée</p>
              <p>✅ Course terminée</p>
              <p>✅ Paiement reçu</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}