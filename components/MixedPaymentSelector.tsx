import { useState, useEffect } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Banknote, Smartphone, Calculator } from '../lib/icons';

interface MixedPaymentSelectorProps {
  totalAmount: number;
  currency: 'USD' | 'CDF';
  onPaymentSplit: (cashAmount: number, mobileMoneyAmount: number) => void;
  cashAmount: number;
  mobileMoneyAmount: number;
}

export function MixedPaymentSelector({ 
  totalAmount, 
  currency, 
  onPaymentSplit,
  cashAmount,
  mobileMoneyAmount
}: MixedPaymentSelectorProps) {
  const [splitPercentage, setSplitPercentage] = useState(50);
  const [customCashAmount, setCustomCashAmount] = useState(cashAmount);

  useEffect(() => {
    // Vérifier que totalAmount est valide
    if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount <= 0) {
      console.warn('⚠️ MixedPaymentSelector: totalAmount invalide', totalAmount);
      return;
    }
    
    const newCashAmount = (totalAmount * splitPercentage) / 100;
    const newMobileAmount = totalAmount - newCashAmount;
    setCustomCashAmount(newCashAmount);
    onPaymentSplit(newCashAmount, newMobileAmount);
  }, [splitPercentage, totalAmount, onPaymentSplit]);

  const handleCustomCashChange = (value: string) => {
    if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount <= 0) {
      console.warn('⚠️ handleCustomCashChange: totalAmount invalide', totalAmount);
      return;
    }
    
    const cash = parseFloat(value) || 0;
    const maxCash = Math.min(cash, totalAmount);
    const mobile = totalAmount - maxCash;
    
    setCustomCashAmount(maxCash);
    onPaymentSplit(maxCash, mobile);
    
    // Update slider position
    const newPercentage = totalAmount > 0 ? (maxCash / totalAmount) * 100 : 50;
    setSplitPercentage(newPercentage);
  };

  const formatAmount = (amount: number | undefined) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return currency === 'USD' ? '$0.00' : '0 CDF';
    }
    const safeAmount = Number(amount) || 0;
    return currency === 'USD' 
      ? `${safeAmount.toFixed(2)}`
      : `${Math.round(safeAmount).toLocaleString()} CDF`;
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <Calculator className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold">Paiement mixte</h3>
          <p className="text-sm text-gray-600">Répartissez entre espèces et Flutterwave</p>
        </div>
      </div>

      {/* Visual Split Display */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Répartition</span>
          <span className="text-sm text-gray-600">Total : {formatAmount(totalAmount)}</span>
        </div>
        
        <div className="h-12 bg-gray-100 rounded-lg overflow-hidden flex">
          <motion.div
            className="bg-orange-500 flex items-center justify-center"
            style={{ width: `${splitPercentage}%` }}
            layout
          >
            <Banknote className="w-4 h-4 text-white" />
          </motion.div>
          <motion.div
            className="bg-green-500 flex items-center justify-center"
            style={{ width: `${100 - splitPercentage}%` }}
            layout
          >
            <Smartphone className="w-4 h-4 text-white" />
          </motion.div>
        </div>
      </div>

      {/* Slider Control - Simplifié */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">
          Pourcentage en espèces : {((splitPercentage || 0)).toFixed(0)}%
        </Label>
        <div className="relative w-full">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-200" 
              style={{width: `${splitPercentage}%`}}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={splitPercentage}
            onChange={(e) => setSplitPercentage(parseFloat(e.target.value))}
            className="w-full mt-2 h-2 bg-transparent appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Amount Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center space-x-2 mb-2">
            <Banknote className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Espèces</span>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-bold text-orange-800">
              {formatAmount(customCashAmount)}
            </p>
            <Input
              type="number"
              value={(customCashAmount || 0).toFixed(2)}
              onChange={(e) => handleCustomCashChange(e.target.value)}
              className="text-sm"
              step={currency === 'USD' ? '0.01' : '100'}
              max={totalAmount}
              min={0}
            />
          </div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center space-x-2 mb-2">
            <Smartphone className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Flutterwave</span>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-bold text-green-800">
              {formatAmount(totalAmount - customCashAmount)}
            </p>
            <p className="text-xs text-green-600">
              Montant automatique
            </p>
          </div>
        </Card>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSplitPercentage(25)}
          className="text-xs"
        >
          25% espèces
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSplitPercentage(50)}
          className="text-xs"
        >
          50% espèces
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSplitPercentage(75)}
          className="text-xs"
        >
          75% espèces
        </Button>
      </div>

      {/* Warning for insufficient cash */}
      {customCashAmount > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Important :</strong> Assurez-vous d'avoir le montant exact en espèces. 
            Le solde sera payé par Flutterwave.
          </p>
        </div>
      )}
    </Card>
  );
}