import { useState } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, Phone } from '../lib/icons';
import { detectInputType, isValidEmail, isValidPhoneNumber } from '../lib/phone-utils';

interface EmailPhoneInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  autoCorrect?: string;
  autoCapitalize?: string;
  spellCheck?: string;
}

export function EmailPhoneInput({
  value,
  onChange,
  label = 'Email ou Téléphone',
  placeholder = 'email@exemple.com ou 812345678',
  error,
  disabled = false,
  required = false,
  className = '',
  id = 'email-phone-input',
  onKeyPress,
  autoComplete = 'off',
  autoCorrect = 'off',
  autoCapitalize = 'off',
  spellCheck = 'false'
}: EmailPhoneInputProps) {
  const [inputType, setInputType] = useState<'email' | 'phone' | 'unknown'>('unknown');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(e);
    
    // Détecter le type d'input
    const type = detectInputType(newValue);
    setInputType(type);
  };

  const getValidationMessage = (): string | undefined => {
    if (!value || value.trim() === '') {
      return undefined;
    }

    if (inputType === 'email') {
      if (!isValidEmail(value)) {
        return 'Email invalide';
      }
    } else if (inputType === 'phone') {
      if (!isValidPhoneNumber(value)) {
        return 'Numéro invalide (9-10 chiffres attendus)';
      }
    } else if (value.length > 3) {
      return 'Format invalide (email ou numéro de téléphone)';
    }

    return undefined;
  };

  const validationMessage = getValidationMessage();
  const showError = error || validationMessage;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor="email-phone-input">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          id="email-phone-input"
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`px-4 text-base ${showError ? 'border-red-500 focus:ring-red-500' : ''}`}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          spellCheck={spellCheck}
          onKeyPress={onKeyPress}
        />
        
        {inputType !== 'unknown' && value && !showError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
        )}
      </div>
      
      {showError && (
        <p className="text-sm text-red-600">{showError}</p>
      )}
      
      {inputType === 'unknown' && value.length > 0 && value.length <= 3 && (
        <p className="text-xs text-gray-500">
          Entrez un email ou un numéro à 9-10 chiffres
        </p>
      )}
      
      {inputType === 'phone' && !validationMessage && value && (
        <p className="text-xs text-green-600">
          ✓ Numéro de téléphone RDC détecté
        </p>
      )}
      
      {inputType === 'email' && !validationMessage && value && (
        <p className="text-xs text-green-600">
          ✓ Email détecté
        </p>
      )}
    </div>
  );
}