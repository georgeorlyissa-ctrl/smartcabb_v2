import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tag, Check, X } from '../lib/icons';
import { useAppState } from '../hooks/useAppState';
import { useTranslation } from '../hooks/useTranslation';
import { PromoCode } from '../types';

interface PromoCodeInputProps {
  rideAmount: number;
  onPromoApplied: (promo: PromoCode | null) => void;
}

export function PromoCodeInput({ rideAmount, onPromoApplied }: PromoCodeInputProps) {
  const { t } = useTranslation();
  const { validatePromoCode } = useAppState();
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;

    const validPromo = validatePromoCode?.(promoCode.toUpperCase(), rideAmount);
    
    if (validPromo) {
      setAppliedPromo(validPromo);
      setError(null);
      onPromoApplied(validPromo);
    } else {
      setError('Code promo invalide ou expiré');
      setAppliedPromo(null);
      onPromoApplied(null);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setError(null);
    onPromoApplied(null);
  };

  const calculateDiscount = (promo: PromoCode): number => {
    if (promo.type === 'percentage') {
      return Math.round(rideAmount * (promo.discount / 100));
    }
    return promo.discount;
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-5 h-5 text-green-600" />
        <h3 className="font-medium">{t('promo_code')}</h3>
      </div>

      {!appliedPromo ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Entrez votre code promo"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase());
                setError(null);
              }}
              className="flex-1"
            />
            <Button
              onClick={handleApplyPromo}
              disabled={!promoCode.trim()}
              size="sm"
            >
              Appliquer
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <X className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <div>
                <p className="font-medium text-green-800">{appliedPromo.code}</p>
                <p className="text-sm text-green-600">{appliedPromo.description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemovePromo}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex justify-between text-sm">
            <span>Réduction:</span>
            <span className="font-medium text-green-600">
              -{(calculateDiscount(appliedPromo) || 0).toLocaleString()} {t('cdf')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}