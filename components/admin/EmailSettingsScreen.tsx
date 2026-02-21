/**
 * ============================================================================
 * SMARTCABB - ÉCRAN DE CONFIGURATION EMAIL
 * ============================================================================
 * VERSION PRODUCTION - COMPATIBLE VERCEL
 * Import sonner SANS version pour compatibilité build production
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// ✅ IMPORT CORRECT POUR PRODUCTION
import { toast } from '../../lib/toast';

import { 
  Mail, 
  Send, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Key,
  Server,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft
} from '../../lib/admin-icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';

interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp';
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  resendApiKey?: string;
  sendgridApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  isConfigured: boolean;
  isEnabled: boolean;
}

interface EmailSettingsScreenProps {
  onBack?: () => void;
}

export function EmailSettingsScreen({ onBack }: EmailSettingsScreenProps) {
  const [config, setConfig] = useState<EmailConfig>({
    provider: 'sendgrid',
    fromEmail: 'contact@smartcabb.com',
    fromName: 'SmartCabb',
    replyToEmail: 'support@smartcabb.com',
    isConfigured: false,
    isEnabled: false
  });

  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isQuickTesting, setIsQuickTesting] = useState(false);
  const [quickTestEmail, setQuickTestEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/email-config`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error('❌ Erreur chargement config email:', error);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/email-config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        }
      );

      if (response.ok) {
        toast.success('Configuration email sauvegardée');
        loadConfig();
      } else {
        throw new Error('Erreur sauvegarde');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const testEmailConnection = async () => {
    if (!testEmail) {
      toast.error('Veuillez entrer une adresse email de test');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/test-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            to: testEmail,
            config 
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Email de test envoyé avec succès ! Vérifiez votre boîte de réception.');
      } else {
        throw new Error(data.error || 'Erreur envoi test');
      }
    } catch (error: any) {
      console.error('❌ Erreur test email:', error);
      toast.error(error.message || 'Erreur lors du test');
    } finally {
      setIsTesting(false);
    }
  };

  const quickTestSendGrid = async () => {
    if (!quickTestEmail) {
      toast.error('Veuillez entrer une adresse email de test');
      return;
    }

    setIsQuickTesting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/quick-test-sendgrid`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ to: quickTestEmail }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('🎉 Email SendGrid envoyé avec succès ! Vérifiez votre boîte de réception.');
      } else {
        throw new Error(data.error || 'Erreur envoi test SendGrid');
      }
    } catch (error: any) {
      console.error('❌ Erreur test SendGrid:', error);
      toast.error(error.message || 'Erreur lors du test SendGrid');
    } finally {
      setIsQuickTesting(false);
    }
  };

  const resetToSendGrid = async () => {
    setIsResetting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/email-config/reset`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          toast.success('✅ Configuration réinitialisée à SendGrid !');
        }
      } else {
        throw new Error('Erreur réinitialisation');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="hover:bg-gray-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuration Email</h1>
              <p className="text-gray-600 mt-1">
                Gérez vos paramètres d'envoi d'emails
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-8 h-8 text-cyan-500" />
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config.isConfigured && config.isEnabled ? (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-700">Emails activés</p>
                      <p className="text-sm text-gray-600">
                        Provider: {config.provider.toUpperCase()} • From: {config.fromEmail}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-orange-500" />
                    <div>
                      <p className="font-semibold text-orange-700">Configuration requise</p>
                      <p className="text-sm text-gray-600">
                        Configurez vos paramètres email ci-dessous
                      </p>
                    </div>
                  </>
                )}
              </div>
              <Switch
                checked={config.isEnabled}
                onCheckedChange={(checked) => setConfig({ ...config, isEnabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 🚀 CARTE DE TEST RAPIDE SENDGRID - Toujours visible */}
        <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              🎉 Test Rapide SendGrid
            </CardTitle>
            <CardDescription>
              SendGrid est configuré ! Testez l'envoi d'emails immédiatement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white/60 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700">
                <strong>✅ Clé API active :</strong> La clé SendGrid est stockée de manière sécurisée dans l'environnement.
                <br />
                <strong>📧 Expéditeur :</strong> contact@smartcabb.com
                <br />
                <strong>📊 Limite gratuite :</strong> 100 emails par jour
              </p>
            </div>

            <div>
              <Label>Entrez votre email pour recevoir un test</Label>
              <Input
                type="email"
                value={quickTestEmail}
                onChange={(e) => setQuickTestEmail(e.target.value)}
                placeholder="votre@email.com"
                className="mt-2"
              />
            </div>

            <Button
              onClick={quickTestSendGrid}
              disabled={isQuickTesting || !quickTestEmail}
              className="w-full h-12 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600"
            >
              {isQuickTesting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Envoyer un Email de Test SendGrid
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Vous recevrez un email détaillé confirmant que SendGrid fonctionne correctement.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Provider Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Service d'envoi</Label>
              <Select
                value={config.provider}
                onValueChange={(value: 'resend' | 'sendgrid' | 'smtp') => 
                  setConfig({ ...config, provider: value })
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">
                    Resend (Recommandé - Gratuit jusqu'à 3000/mois)
                  </SelectItem>
                  <SelectItem value="sendgrid">
                    SendGrid (Gratuit jusqu'à 100/jour)
                  </SelectItem>
                  <SelectItem value="smtp">
                    SMTP Custom (Votre serveur)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Recommandation :</strong> Resend est le plus simple à configurer et offre 3000 emails gratuits par mois.
                {' '}Parfait pour démarrer avec SmartCabb.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Paramètres de base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ⚠️ AVERTISSEMENT SENDGRID */}
            <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>⚠️ IMPORTANT SendGrid :</strong> Vous devez utiliser une adresse email <strong>vérifiée</strong> dans SendGrid.
                <br />
                ✅ <strong>Adresses vérifiées :</strong> contact@, info@, support@, ftshimpi@, norely@
                <br />
                ❌ <strong>NON vérifiée :</strong> noreply@smartcabb.com (erreur "API key is invalid")
              </p>
            </div>

            <div>
              <Label>Adresse d'expédition (From)</Label>
              <Select
                value={config.fromEmail}
                onValueChange={(value) => setConfig({ ...config, fromEmail: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact@smartcabb.com">contact@smartcabb.com (Principal - Automatique) ✅</SelectItem>
                  <SelectItem value="info@smartcabb.com">info@smartcabb.com (Assistance Générale) ✅</SelectItem>
                  <SelectItem value="support@smartcabb.com">support@smartcabb.com (Support Technique) ✅</SelectItem>
                  <SelectItem value="ftshimpi@smartcabb.com">ftshimpi@smartcabb.com (Employé) ✅</SelectItem>
                  <SelectItem value="norely@smartcabb.com">norely@smartcabb.com ✅</SelectItem>
                  <SelectItem value="noreply@smartcabb.com" disabled>noreply@smartcabb.com (❌ Non vérifiée)</SelectItem>
                  <SelectItem value="forumep@smartcabb.com" disabled>forumep@smartcabb.com (❌ Non vérifiée)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nom d'expédition</Label>
              <Input
                value={config.fromName}
                onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                placeholder="SmartCabb"
                className="mt-2"
              />
            </div>

            <div>
              <Label>Adresse de réponse (Reply-To)</Label>
              <Select
                value={config.replyToEmail}
                onValueChange={(value) => setConfig({ ...config, replyToEmail: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support@smartcabb.com">support@smartcabb.com (Support Technique)</SelectItem>
                  <SelectItem value="contact@smartcabb.com">contact@smartcabb.com (Contact Principal)</SelectItem>
                  <SelectItem value="info@smartcabb.com">info@smartcabb.com (Assistance Générale)</SelectItem>
                  <SelectItem value="ftshimpi@smartcabb.com">ftshimpi@smartcabb.com (Employé)</SelectItem>
                  <SelectItem value="norely@smartcabb.com">norely@smartcabb.com</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {config.provider === 'resend' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Configuration Resend
              </CardTitle>
              <CardDescription>
                Obtenez votre clé API sur{' '}
                <a 
                  href="https://resend.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:underline"
                >
                  resend.com/api-keys
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Clé API Resend</Label>
                <div className="relative mt-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.resendApiKey || ''}
                    onChange={(e) => setConfig({ ...config, resendApiKey: e.target.value })}
                    placeholder="re_xxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {config.provider === 'sendgrid' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Configuration SendGrid
              </CardTitle>
              <CardDescription>
                Obtenez votre clé API sur{' '}
                <a 
                  href="https://app.sendgrid.com/settings/api_keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-600 hover:underline"
                >
                  app.sendgrid.com/settings/api_keys
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Clé API SendGrid</Label>
                <div className="relative mt-2">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.sendgridApiKey || ''}
                    onChange={(e) => setConfig({ ...config, sendgridApiKey: e.target.value })}
                    placeholder="SG.xxxxxxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {config.provider === 'smtp' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Configuration SMTP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Serveur SMTP (Host)</Label>
                <Input
                  value={config.smtpHost || ''}
                  onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                  placeholder="smtp.example.com"
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={config.smtpPort || 587}
                    onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value) })}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-end pb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Switch
                      checked={config.smtpSecure || false}
                      onCheckedChange={(checked) => setConfig({ ...config, smtpSecure: checked })}
                    />
                    <span className="text-sm">SSL/TLS</span>
                  </label>
                </div>
              </div>

              <div>
                <Label>Utilisateur SMTP</Label>
                <Input
                  value={config.smtpUser || ''}
                  onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                  placeholder="votre@email.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Mot de passe SMTP</Label>
                <div className="relative mt-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={config.smtpPassword || ''}
                    onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Tester la configuration
            </CardTitle>
            <CardDescription>
              Envoyez un email de test pour vérifier que tout fonctionne
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email de test</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="votre@email.com"
                className="mt-2"
              />
            </div>

            <Button
              onClick={testEmailConnection}
              disabled={isTesting || !testEmail}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer un email de test
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={resetToSendGrid}
            disabled={isResetting}
            variant="outline"
            className="h-14 border-2 border-orange-300 hover:bg-orange-50"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Réinitialisation...
              </>
            ) : (
              '🔄 Réinitialiser à SendGrid'
            )}
          </Button>
          
          <Button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex-1 h-14 bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder la configuration'
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}