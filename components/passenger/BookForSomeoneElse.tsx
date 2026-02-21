/**
 * COMPOSANT : BookForSomeoneElse
 * 
 * Permet à un passager de réserver une course pour quelqu'un d'autre
 * 
 * CAS D'USAGE :
 * - Réserver pour un ami/famille qui n'a pas l'app
 * - Service corporate (réserver pour un employé)
 * - Parent réserve pour un enfant
 * - Secrétaire réserve pour un patron
 * 
 * FONCTIONNALITÉS :
 * - Toggle "Pour moi-même" vs "Pour quelqu'un d'autre"
 * - Saisir nom et téléphone du bénéficiaire
 * - Validation numéro téléphone RDC
 * - Affichage compact intégré dans EstimateScreen
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../lib/motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Switch } from '../ui/switch';
import { useAppState } from '../../hooks/useAppState';
import { toast } from '../../lib/toast';
import { User, Phone, AlertCircle, Users } from '../../lib/icons';

interface BookForSomeoneElseProps {
  showForm: boolean;
  onToggleForm: (show: boolean) => void;
  onBeneficiaryChange: (beneficiary: { name: string; phone: string } | null) => void;
}

export function BookForSomeoneElse({ showForm, onToggleForm, onBeneficiaryChange }: BookForSomeoneElseProps) {
  const { state } = useAppState();
  const currentUser = state.currentUser;

  const [bookingForSelf, setBookingForSelf] = useState(true);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  /**
   * Valider le numéro de téléphone RDC
   */
  const validatePhone = (phone: string): boolean => {
    // Format accepté : +243XXXXXXXXX (12 chiffres) ou 0XXXXXXXXX (10 chiffres)
    const phoneRegex = /^(\+243|0)[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  /**
   * Formater le numéro au format international
   */
  const formatPhoneToInternational = (phone: string): string => {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.startsWith('+243')) {
      return cleaned;
    }
    if (cleaned.startsWith('0')) {
      return '+243' + cleaned.substring(1);
    }
    return '+243' + cleaned;
  };

  /**
   * Basculer entre "pour moi" et "pour quelqu'un d'autre"
   */
  const handleToggle = (checked: boolean) => {
    setBookingForSelf(checked);
    setErrors({});
    
    if (checked) {
      // Pour moi-même
      setBeneficiaryName('');
      setBeneficiaryPhone('');
      onBeneficiaryChange(null);
    } else {
      // Pour quelqu'un d'autre
      // Attendre que l'utilisateur remplisse le formulaire
    }
  };

  /**
   * Mise à jour du bénéficiaire
   */
  const updateBeneficiary = () => {
    if (bookingForSelf) {
      onBeneficiaryChange(null);
      return;
    }

    // Validation
    const newErrors: { name?: string; phone?: string } = {};
    
    if (!beneficiaryName.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (beneficiaryName.trim().length < 3) {
      newErrors.name = 'Minimum 3 caractères';
    }

    if (!beneficiaryPhone.trim()) {
      newErrors.phone = 'Le numéro est requis';
    } else if (!validatePhone(beneficiaryPhone)) {
      newErrors.phone = 'Format invalide';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Validation OK
      const formattedPhone = formatPhoneToInternational(beneficiaryPhone);
      onBeneficiaryChange({
        name: beneficiaryName.trim(),
        phone: formattedPhone
      });
    } else {
      // Validation échouée
      onBeneficiaryChange(null);
    }
  };

  useEffect(() => {
    updateBeneficiary();
  }, [beneficiaryName, beneficiaryPhone, bookingForSelf]);

  return (
    <Card className="p-4 space-y-3 bg-white">
      {/* Toggle : Pour moi / Pour quelqu'un d'autre */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-sm font-medium">Réserver pour moi-même</p>
            <p className="text-xs text-gray-600">
              {currentUser?.name || 'Passager'} • {currentUser?.phone || '+243...'}
            </p>
          </div>
        </div>
        <Switch
          checked={bookingForSelf}
          onCheckedChange={handleToggle}
        />
      </div>

      {/* Formulaire bénéficiaire (si pas pour soi-même) */}
      <AnimatePresence>
        {!bookingForSelf && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              ℹ️ Le conducteur contactera ce numéro
            </div>

            {/* Nom du bénéficiaire */}
            <div>
              <Label htmlFor="beneficiary-name" className="text-sm">
                Nom complet *
              </Label>
              <div className="relative mt-1">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="beneficiary-name"
                  type="text"
                  placeholder="Ex: Jean Kalala"
                  value={beneficiaryName}
                  onChange={(e) => {
                    setBeneficiaryName(e.target.value);
                    setErrors({ ...errors, name: undefined });
                  }}
                  onBlur={updateBeneficiary}
                  className={`pl-9 h-10 ${errors.name ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Téléphone du bénéficiaire */}
            <div>
              <Label htmlFor="beneficiary-phone" className="text-sm">
                Téléphone *
              </Label>
              <div className="relative mt-1">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="beneficiary-phone"
                  type="tel"
                  placeholder="+243 999..."
                  value={beneficiaryPhone}
                  onChange={(e) => {
                    setBeneficiaryPhone(e.target.value);
                    setErrors({ ...errors, phone: undefined });
                  }}
                  onBlur={updateBeneficiary}
                  className={`pl-9 h-10 ${errors.phone ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.phone}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Ex: +243999999999 ou 0999999999
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}