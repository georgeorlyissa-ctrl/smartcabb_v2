import { useState } from 'react'; // ✅ Ajout import React
import { Button } from '../ui/button'; // ✅ Ajout import Button
import { Input } from '../ui/input'; // ✅ Ajout import Input
import { Label } from '../ui/label'; // ✅ Ajout import Label
import { toast } from '../../lib/toast';
import { useNavigate } from '../../lib/simple-router';
import { createAdmin } from '../../lib/auth-service'; // ✅ Correction : enlever .tsx

/**
 * 🚀 INSCRIPTION ADMIN - MODE BACKEND
 * 
 * Crée un compte admin via l'endpoint backend /create-admin
 * Crée automatiquement le profil dans la table profiles
 * Email auto-confirmé (pas besoin de vérification)
 */
export function QuickAdminSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });

  // 🔍 Debug: Vérifier que le composant se charge bien
  console.log('🚀 QuickAdminSignup component loaded');
  console.log('🔍 Current URL:', window.location.pathname);

  const handleSignup = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Création compte admin via backend...');

      // Appeler l'endpoint backend qui crée TOUT automatiquement
      const result = await createAdmin({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName
      });

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la création du compte');
        setLoading(false);
        return;
      }

      console.log('✅ Compte admin créé avec succès !');
      toast.success('✅ Compte admin créé avec succès !');
      
      // Message supplémentaire
      setTimeout(() => {
        toast.success('🎉 Vous pouvez maintenant vous connecter');
      }, 1500);
      
      // Redirection après 3 secondes
      setTimeout(() => {
        navigate('/admin/login');
      }, 3000);

    } catch (error: any) {
      console.error('❌ Erreur complète:', error);
      toast.error('Erreur: ' + (error.message || 'Erreur inconnue'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👨‍💼</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Créer un compte admin
          </h1>
          <p className="text-gray-600">
            Accès complet au panel d'administration
          </p>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div>
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jean Dupont"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="mt-2 h-12"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@smartcabb.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-2 h-12"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-2 h-12"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 6 caractères
            </p>
          </div>

          <Button
            onClick={handleSignup}
            disabled={loading}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white text-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Création...</span>
              </div>
            ) : (
              'Créer le compte admin'
            )}
          </Button>

          <div className="text-center">
            <button
              onClick={() => navigate('/admin/login')}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors"
              disabled={loading}
            >
              ← Retour à la connexion
            </button>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-900 font-medium mb-2">
            ✅ Création automatique
          </p>
          <ul className="text-xs text-green-800 space-y-1">
            <li>• Compte Supabase Auth créé</li>
            <li>• Profil admin créé dans la base de données</li>
            <li>• Email auto-confirmé (connexion immédiate)</li>
            <li>• Accès complet au panel d'administration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
