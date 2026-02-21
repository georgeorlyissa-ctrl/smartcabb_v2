import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Heart } from '../lib/icons';
import { useTranslation } from '../hooks/useTranslation';

interface TipSelectorProps {
  onTipSelect: (tipAmount: number) => void;
  rideAmount: number;
}

export function TipSelector({ onTipSelect, rideAmount }: TipSelectorProps) {
  const { t } = useTranslation();
  const [customTip, setCustomTip] = useState('');
  const [selectedTip, setSelectedTip] = useState<number | null>(null);

  const suggestedTips = [
    { percentage: 10, amount: Math.round(rideAmount * 0.1) },
    { percentage: 15, amount: Math.round(rideAmount * 0.15) },
    { percentage: 20, amount: Math.round(rideAmount * 0.2) },
  ];

  const handlePresetTip = (amount: number) => {
    setSelectedTip(amount);
    setCustomTip('');
    onTipSelect(amount);
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    const amount = parseInt(value) || 0;
    setSelectedTip(amount);
    onTipSelect(amount);
  };

  const handleNoTip = () => {
    setSelectedTip(0);
    setCustomTip('');
    onTipSelect(0);
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-red-500" />
        <h3 className="font-medium">{t('add_tip')}</h3>
      </div>

      <div className="space-y-3">
        {/* Pourboires suggérés */}
        <div className="grid grid-cols-3 gap-2">
          {suggestedTips.map((tip) => (
            <Button
              key={tip.percentage}
              variant={selectedTip === tip.amount ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetTip(tip.amount)}
              className="flex flex-col py-3 h-auto"
            >
              <span className="text-xs">{tip.percentage}%</span>
              <span className="font-medium">{(tip.amount || 0).toLocaleString()} {t('cdf')}</span>
            </Button>
          ))}
        </div>

        {/* Pourboire personnalisé */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={t('tip_amount')}
            value={customTip}
            onChange={(e) => handleCustomTip(e.target.value)}
            className="flex-1"
          />
          <span className="text-sm text-gray-500">{t('cdf')}</span>
        </div>

        {/* Pas de pourboire */}
        <Button
          variant={selectedTip === 0 ? "default" : "outline"}
          size="sm"
          onClick={handleNoTip}
          className="w-full"
        >
          Pas de pourboire
        </Button>
      </div>

      {selectedTip !== null && selectedTip > 0 && (
        <div className="mt-3 p-2 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
            Pourboire sélectionné: {(selectedTip || 0).toLocaleString()} {t('cdf')}
          </p>
        </div>
      )}
    </div>
  );
}