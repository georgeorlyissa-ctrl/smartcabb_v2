import { useState } from 'react';
import { toast } from '../../lib/toast';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  ArrowLeft,
  CreditCard,
  Smartphone,
  Banknote,
  Check,
  Wallet,
  Shield,
  AlertCircle
} from '../../lib/icons';
import { useAppState } from '../../hooks/useAppState';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

type PaymentMethodId = 'mobile_money' | 'cash';

const METHODS: Array<{
  id: PaymentMethodId;
  icon: typeof Smartphone;
  label: string;
  description: string;
}> = [
  {
    id: 'mobile_money',
    icon: Smartphone,
    label: 'Mobile Money',
    description: 'Airtel Money, M-Pesa, Orange Money — paiement à la fin de la course'
  },
  {
    id: 'cash',
    icon: Banknote,
    label: 'Espèces',
    description: 'Vous payez le chauffeur en main propre à la fin de la course'
  }
];

/**
 * Écran « Moyens de paiement » accessible depuis Paramètres.
 *
 * ⚠️ Il s'agit du mode de paiement PRÉFÉRÉ du passager, celui qui est
 * proposé par défaut au moment de confirmer une course. Il est enregistré
 * côté serveur (`favoritePaymentMethod`) pour survivre à la déconnexion —
 * exactement comme depuis l'écran Profil. Aucune donnée bancaire n'est
 * saisie ni stockée ici.
 */
export function PaymentSettingsScreen() {
  const { setCurrentScreen, state, mergeCurrentUser } = useAppState();
  const [saving, setSaving] = useState<PaymentMethodId | null>(null);

  const current = state.currentUser?.favoritePaymentMethod;

  const handleSelect = async (methodId: PaymentMethodId) => {
    const userId = state.currentUser?.id;
    if (!userId) {
      toast.error('Utilisateur non connecté');
      return;
    }

    const previous = current;
    mergeCurrentUser({ favoritePaymentMethod: methodId });
    setSaving(methodId);

    // Cache local (secours hors ligne)
    try {
      localStorage.setItem('smartcabb_preferred_payment', methodId);
      const userKey = `smartcabb_user_${userId}`;
      const raw = localStorage.getItem(userKey);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(userKey, JSON.stringify({ ...parsed, favoritePaymentMethod: methodId }));
    } catch {}

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/update/${userId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ favoritePaymentMethod: methodId })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || `Erreur ${response.status}`);
      }
      toast.success('Mode de paiement enregistré ✅');
    } catch (error) {
      console.error('❌ [PAYMENT SETTINGS] Enregistrement impossible:', error);
      // On n'affiche jamais un choix non sauvegardé
      mergeCurrentUser({ favoritePaymentMethod: previous });
      toast.error('Connexion instable : le mode de paiement n\'a pas été enregistré. Réessayez.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-safe-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('passenger-settings')}
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <h1 className="text-lg font-semibold">Moyens de paiement</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Mode actuel */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-sm text-purple-900">
                <p className="font-semibold mb-1">Mode de paiement préféré</p>
                <p className="text-purple-700">
                  {current === 'mobile_money'
                    ? 'Mobile Money'
                    : current === 'cash'
                      ? 'Espèces'
                      : 'Aucun mode sélectionné'}
                </p>
                <p className="text-purple-600 text-xs mt-1">
                  Ce choix est proposé par défaut lorsque vous confirmez une course.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Choix */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Choisir un mode de paiement</h2>

          {METHODS.map((method) => {
            const isActive = current === method.id;
            const isSaving = saving === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => handleSelect(method.id)}
                disabled={saving !== null}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 bg-white text-left transition-all disabled:opacity-60 ${
                  isActive
                    ? 'border-purple-500 bg-purple-50/40'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <method.icon className="w-5 h-5 text-gray-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{method.label}</p>
                  <p className="text-xs text-gray-500 leading-snug">{method.description}</p>
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-xs text-purple-600 font-medium flex-shrink-0">
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Enregistrement…' : 'Actif'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-semibold mb-1">Aucune donnée bancaire</p>
                <p className="text-blue-700 text-xs leading-relaxed">
                  SmartCabb ne vous demande jamais de numéro de carte. Vos coordonnées
                  Mobile Money sont demandées uniquement par votre opérateur au moment du
                  paiement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aide */}
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Le mode choisi ici est enregistré sur votre compte : vous le retrouverez
                après une déconnexion ou sur un autre téléphone.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
