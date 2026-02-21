import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  onSubmit?: () => void;
  label?: string;
  disabled?: boolean;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  autoComplete?: string;
  autoCorrect?: string;
  autoCapitalize?: string;
  spellCheck?: string | boolean;
}

export function PhoneInput({ 
  value, 
  onChange, 
  placeholder = "81 234 5678",
  className = "",
  id = "phone",
  onSubmit,
  label,
  disabled = false,
  onKeyPress,
  autoComplete,
  autoCorrect,
  autoCapitalize,
  spellCheck
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const PREFIX = '+243 ';

  useEffect(() => {
    // Initialiser avec le préfixe si la valeur est vide
    if (!value) {
      setDisplayValue(PREFIX);
      onChange(PREFIX);
    } else {
      setDisplayValue(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionnellement vide - exécuter une seule fois au montage

  const formatPhoneNumber = (input: string) => {
    // Retirer tout sauf les chiffres
    let digitsOnly = input.replace(/\D/g, '');
    
    // Si l'utilisateur a collé un numéro avec 243 au début, le retirer
    if (digitsOnly.startsWith('243')) {
      digitsOnly = digitsOnly.substring(3);
    }
    
    // Limiter à 10 chiffres maximum (format RDC)
    digitsOnly = digitsOnly.substring(0, 10);
    
    // Formater avec des espaces: XX XXX XXXX ou XXX XXX XXXX
    let formatted = digitsOnly;
    if (digitsOnly.length > 2) {
      formatted = digitsOnly.substring(0, 2) + ' ' + digitsOnly.substring(2);
    }
    if (digitsOnly.length > 5) {
      formatted = digitsOnly.substring(0, 2) + ' ' + 
                  digitsOnly.substring(2, 5) + ' ' + 
                  digitsOnly.substring(5);
    }
    
    return PREFIX + formatted;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Empêcher la suppression du préfixe +243
    if (!inputValue.startsWith(PREFIX)) {
      return;
    }
    
    // Extraire la partie après le préfixe
    const afterPrefix = inputValue.substring(PREFIX.length);
    
    // Formater le numéro
    const formatted = formatPhoneNumber(afterPrefix);
    
    setDisplayValue(formatted);
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const cursorPosition = input.selectionStart || 0;
    
    // Gérer la touche Enter pour soumettre le formulaire
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
      return;
    }
    
    // Empêcher la suppression du préfixe
    if (
      (e.key === 'Backspace' || e.key === 'Delete') &&
      cursorPosition <= PREFIX.length
    ) {
      e.preventDefault();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Placer le curseur après le préfixe
    setTimeout(() => {
      const input = e.target;
      if (input.value === PREFIX) {
        input.setSelectionRange(PREFIX.length, PREFIX.length);
      }
    }, 0);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const cursorPosition = input.selectionStart || 0;
    
    // Empêcher de placer le curseur dans le préfixe
    if (cursorPosition < PREFIX.length) {
      input.setSelectionRange(PREFIX.length, PREFIX.length);
    }
  };

  const getDigitsCount = () => {
    return displayValue.replace(/\D/g, '').substring(0, 10).length;
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          type="tel"
          placeholder={PREFIX + placeholder}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onClick={handleClick}
          className={`pl-4 pr-16 h-12 bg-gray-50 border-0 rounded-xl text-base ${className}`}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          autoCapitalize={autoCapitalize}
          spellCheck={spellCheck}
          disabled={disabled}
          onKeyPress={onKeyPress}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
          {getDigitsCount()}/10
        </div>
      </div>
    </div>
  );
}

export default PhoneInput;
