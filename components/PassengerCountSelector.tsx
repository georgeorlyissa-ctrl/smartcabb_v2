import { useState } from 'react';
import { Button } from './ui/button';
import { Users, Plus, Minus } from '../lib/icons';
import { useTranslation } from '../hooks/useTranslation';

interface PassengerCountSelectorProps {
  value: number;
  onChange: (count: number) => void;
  maxPassengers?: number;
}

export function PassengerCountSelector({ 
  value, 
  onChange, 
  maxPassengers = 4 
}: PassengerCountSelectorProps) {
  const { t } = useTranslation();

  const handleDecrease = () => {
    if (value > 1) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    if (value < maxPassengers) {
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-green-600" />
        <span className="font-medium">{t('passenger_count')}</span>
      </div>
      
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecrease}
          disabled={value <= 1}
          className="w-8 h-8 p-0"
        >
          <Minus className="w-4 h-4" />
        </Button>
        
        <span className="w-8 text-center font-medium">{value}</span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleIncrease}
          disabled={value >= maxPassengers}
          className="w-8 h-8 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}