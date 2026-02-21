import React, { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { Button } from '../ui/button';
import { useNavigate } from '../../lib/simple-router';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

export function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier si on a un token d'accès dans l'URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    console.log('🔐 Reset Password Page - Token:', accessToken ? 'présent' : 'absent');
    console.log('🔐 Refresh Token:', refreshToken ? 'présent' : 'absent');
    console.log('🔐 Type:', type);
    console.log('🔐 Hash complet:', window.location.hash);

    if (!accessToken || type !== 'recovery') {
      console.error('❌ Token absent ou type incorrect');
      setError('Lien de réinitialisation invalide ou expiré. Veuillez demander un nouveau lien.');
      setCheckingToken(false);
      return;
    }

    // Établir la session avec le token
    const establishSession = async () => {
      try {
        console.log('🔄 Établissement de la session avec le token...');
        
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) {
          console.error('❌ Erreur session:', sessionError);
          setError('Impossible d\'établir la session. Le lien est peut-être expiré.');
          setCheckingToken(false);
          return;
        }

        console.log('✅ Session établie:', data);
        setSessionEstablished(true);
        setError(''); // ✅ IMPORTANT : Effacer l'erreur
        setCheckingToken(false);

      } catch (err: any) {
        console.error('❌ Erreur établissement session:', err);
        setError('Erreur lors de l\'établissement de la session');
        setCheckingToken(false);
      }
    };

    establishSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔄 Mise à jour du mot de passe...');

      // Mettre à jour le mot de passe avec Supabase
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Erreur:', error);
        throw error;
      }

      console.log('✅ Mot de passe mis à jour:', data);
      
      setSuccess(true);
      toast.success('Mot de passe réinitialisé avec succès !');

      // Rediriger vers la page de connexion après 3 secondes
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error: any) {
      console.error('❌ Erreur réinitialisation:', error);
      setError(error.message || 'Erreur lors de la réinitialisation du mot de passe');
      toast.error(error.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              {/* Check icon inline */}
              <svg className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>

            <h1 className="text-2xl mb-4">Mot de passe réinitialisé !</h1>
            <p className="text-gray-600 mb-6">
              Votre mot de passe a été mis à jour avec succès.
            </p>
            <p className="text-sm text-gray-500">
              Redirection vers la page de connexion...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 flex items-center justify-center p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              {/* Lock icon inline */}
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl mb-2">Réinitialiser le mot de passe</h1>
            <p className="text-gray-600">
              Choisissez un nouveau mot de passe sécurisé
            </p>
          </div>

          {/* Message d'erreur */}
          {error && !sessionEstablished && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start space-x-3"
            >
              {/* AlertCircle icon inline */}
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
                <Button
                  variant="link"
                  className="text-red-600 p-0 h-auto mt-2"
                  onClick={() => navigate('/forgot-password')}
                >
                  Demander un nouveau lien
                </Button>
              </div>
            </motion.div>
          )}

          {/* Message de chargement de la session */}
          {checkingToken && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center space-x-3"
            >
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-blue-800">Vérification du lien de réinitialisation...</p>
            </motion.div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Nouveau mot de passe */}
            <div>
              <label className="block text-sm mb-2">Nouveau mot de passe</label>
              <div className="relative">
                {/* Lock icon inline */}
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading || !sessionEstablished}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmer le mot de passe */}
            <div>
              <label className="block text-sm mb-2">Confirmer le mot de passe</label>
              <div className="relative">
                {/* Lock icon inline */}
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={loading || !sessionEstablished}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Indicateurs de force */}
            {newPassword && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${newPassword.length >= 6 ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={newPassword.length >= 6 ? 'text-green-600' : 'text-gray-500'}>
                    Au moins 6 caractères
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${newPassword === confirmPassword && confirmPassword ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={newPassword === confirmPassword && confirmPassword ? 'text-green-600' : 'text-gray-500'}>
                    Les mots de passe correspondent
                  </span>
                </div>
              </div>
            )}

            {/* Bouton de soumission */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={loading || !sessionEstablished}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </motion.div>
                  <span>Mise à jour...</span>
                </div>
              ) : (
                'Réinitialiser le mot de passe'
              )}
            </Button>
          </form>

          {/* Lien retour */}
          <div className="text-center mt-6">
            <Button
              variant="link"
              onClick={() => navigate('/login')}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Retour à la connexion
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}