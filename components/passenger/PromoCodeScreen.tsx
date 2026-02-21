import { ArrowLeft, Tag, Check, X, Gift, Percent } from '../../lib/icons';
import { useAppState } from '../../hooks/useAppState'; // ✅ FIX: Import manquant
import { toast } from '../../lib/toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { formatCDF } from '../../lib/pricing';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';

interface PromoCode {
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  description: string;
  isActive: boolean;
}

export function PromoCodeScreen() {
  const { setCurrentScreen, state } = useAppState();
  const [promoCode, setPromoCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validatedCode, setValidatedCode] = useState<PromoCode | null>(null);
  const [availablePromoCodes, setAvailablePromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les codes promo depuis le backend
  useEffect(() => {
    loadPromoCodes();
  }, []);

  const loadPromoCodes = async () => {
    try {
      const response = await fetch(`https://${supabase.supabaseUrl.replace('https://', '')}/functions/v1/make-server-2eb02e52/promo-codes`, {
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailablePromoCodes(data.promoCodes || []);
      }
    } catch (error) {
      console.error('Erreur chargement codes promo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!promoCode.trim()) {
      toast.error('Veuillez saisir un code promo');
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch(`https://${supabase.supabaseUrl.replace('https://', '')}/functions/v1/make-server-2eb02e52/promo-codes/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: promoCode.toUpperCase() })
      });
      
      const result = await response.json();
      
      if (result.valid) {
        setValidatedCode(result.promoCode);
        toast.success('Code promo validé avec succès ! ✅');
      } else {
        setValidatedCode(null);
        toast.error('Code promo invalide ou expiré');
      }
    } catch (error) {
      console.error('Erreur validation code promo:', error);
      toast.error('Erreur lors de la validation');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('map')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Codes Promo</h1>
              <p className="text-sm text-gray-600">Bénéficiez de réductions sur vos courses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Section de saisie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Entrez votre code promo</h3>
                <p className="text-sm text-gray-500">Profitez de réductions exclusives</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: SMARTCABB10"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 uppercase"
                  disabled={isValidating}
                />
                <Button
                  onClick={handleValidate}
                  disabled={isValidating || !promoCode.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isValidating ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Valider'
                  )}
                </Button>
              </div>

              {validatedCode && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 mb-1">Code validé !</p>
                      <p className="text-sm text-green-700">{validatedCode.description}</p>
                      <div className="mt-2 px-3 py-1 bg-green-500 text-white rounded-full text-sm inline-flex items-center gap-1">
                        <Percent className="w-4 h-4" />
                        {validatedCode.type === 'percentage' 
                          ? `${validatedCode.discount}%`
                          : formatCDF(validatedCode.discount)
                        } de réduction
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Codes disponibles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" />
            Codes promo disponibles
          </h3>
          {isLoading ? (
            <Card className="p-8 text-center">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-500">Chargement des codes promo...</p>
            </Card>
          ) : availablePromoCodes.length === 0 ? (
            <Card className="p-8 text-center">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Aucun code promo disponible pour le moment</p>
            </Card>
          ) : (
          <div className="space-y-3">
            {availablePromoCodes.map((code, index) => (
              <motion.div
                key={code.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-lg font-mono font-semibold">
                          {code.code}
                        </span>
                        {code.isActive && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Actif
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{code.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPromoCode(code.code);
                        handleValidate();
                      }}
                      className="ml-3"
                    >
                      Appliquer
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-semibold mb-1">Comment ça marche ?</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Entrez votre code promo</li>
                  <li>• La réduction sera automatiquement appliquée</li>
                  <li>• Valable sur votre prochaine course</li>
                  <li>• Un seul code promo par course</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}