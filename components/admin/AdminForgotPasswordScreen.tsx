import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from '../../lib/toast';
import { useNavigate } from '../../lib/simple-router';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Icônes inline
const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const MailIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export function AdminForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    // Validation email basique
    if (!email.includes('@')) {
      toast.error('Email invalide');
      return;
    }

    setLoading(true);

    try {
      console.log('📧 Envoi de la demande de réinitialisation pour:', email);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            identifier: email,
            userType: 'admin'
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        console.error('❌ Erreur:', result.error);
        toast.error(result.error || 'Erreur lors de l\'envoi de l\'email');
        setLoading(false);
        return;
      }

      console.log('✅ Email envoyé avec succès');
      setSuccess(true);
      toast.success('Email de réinitialisation envoyé !');

    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur de connexion. Vérifiez votre connexion Internet.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Email envoyé !
          </h1>
          
          <p className="text-gray-600 mb-6">
            Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-blue-800">
              <strong>Prochaines étapes :</strong>
            </p>
            <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
              <li>Vérifiez votre boîte email</li>
              <li>Cliquez sur le lien de réinitialisation</li>
              <li>Définissez un nouveau mot de passe</li>
            </ol>
          </div>

          <p className="text-xs text-gray-500 mb-6">
            Vous n'avez pas reçu l'email ? Vérifiez vos spams ou réessayez dans quelques minutes.
          </p>

          <Button
            onClick={() => navigate('/admin/login')}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/login')}
            className="absolute -top-2 -left-2 w-10 h-10"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
          
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MailIcon className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mot de passe oublié ?
          </h1>
          <p className="text-gray-600">
            Entrez votre email pour réinitialiser votre mot de passe
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <Label htmlFor="email">Email administrateur</Label>
            <div className="mt-2">
              <Input
                id="email"
                type="email"
                placeholder="admin@smartcabb.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-4 h-12 text-base"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !email}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white text-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Envoi...</span>
              </div>
            ) : (
              'Envoyer le lien de réinitialisation'
            )}
          </Button>

          <div className="text-center">
            <button
              onClick={() => navigate('/admin/login')}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              disabled={loading}
            >
              ← Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
