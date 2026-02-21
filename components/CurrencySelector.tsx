import React, { useState } from 'react';
import { motion } from '../lib/motion';
import { DollarSign, Banknote } from '../lib/icons';

interface CurrencySelectorProps {
  onCurrencySelect: (currency: 'USD' | 'CDF') => void;
  selectedCurrency?: 'USD' | 'CDF';
  exchangeRate: number;
  amount: number;
}

export function CurrencySelector({ 
  onCurrencySelect, 
  selectedCurrency, 
  exchangeRate,
  amount 
}: CurrencySelectorProps) {
  // Validation des données
  const validAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const validExchangeRate = typeof exchangeRate === 'number' && exchangeRate > 0 ? exchangeRate : 2850;
  
  const currencies = [
    {
      id: 'USD' as const,
      title: 'Dollar américain',
      symbol: '$',
      icon: DollarSign,
      color: 'bg-green-500',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50',
      amount: validAmount / validExchangeRate
    },
    {
      id: 'CDF' as const,
      title: 'Franc congolais',
      symbol: 'CDF',
      icon: Banknote,
      color: 'bg-blue-500',
      borderColor: 'border-blue-200',
      bgColor: 'bg-blue-50',
      amount: validAmount
    }
  ];

  return (
    <Card className="p-4 mb-6">
      <h3 className="font-semibold mb-4">Devise de paiement</h3>
      <div className="grid grid-cols-2 gap-3">
        {currencies.map((currency) => {
          const Icon = currency.icon;
          const isSelected = selectedCurrency === currency.id;
          
          return (
            <motion.div
              key={currency.id}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected 
                  ? `${currency.borderColor} ${currency.bgColor}` 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onCurrencySelect(currency.id)}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`w-10 h-10 ${currency.color} rounded-full flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{currency.title}</p>
                  <p className="text-lg font-bold">
                    {currency.id === 'USD' 
                      ? `$${((currency.amount || 0)).toFixed(2)}`
                      : `${Math.round(currency.amount || 0).toLocaleString()} CDF`
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 text-center">
          Taux de change : 1 USD = {validExchangeRate.toLocaleString()} CDF
        </p>
      </div>
    </Card>
  );
}