import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion'; // ✅ FIX: Import depuis lib/motion
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation'; // ✅ FIX: Import manquant
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { 
  Check, 
  X, 
  Clock,
  Lock,
  AlertCircle,
  CheckCircle,
  Smartphone
} from '../../lib/icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

interface ConfirmationCodeScreenProps {
  rideId: string;
  driverId: string;
  expectedCode: string;
  passengerName: string;
  onConfirmed: () => void;
  onCancel: () => void;
}

export function ConfirmationCodeScreen({
  rideId,
  driverId,
  expectedCode,
  passengerName,
  onConfirmed,
  onCancel
}: ConfirmationCodeScreenProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleCodeChange = (index: number, value: string) => {
    // Autoriser seulement les chiffres
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus sur le champ suivant
    if (value && index < 3) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }

    // Vérifier automatiquement si tous les champs sont remplis
    if (newCode.every(digit => digit !== '') && index === 3) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyCode = async (enteredCode: string) => {
    setIsVerifying(true);
    setError('');

    try {
      console.log('🔐 Vérification du code:', { enteredCode, expectedCode });

      // Vérifier si le code correspond
      if (enteredCode !== expectedCode) {
        setError('Code incorrect. Veuillez réessayer.');
        setCode(['', '', '', '']);
        document.getElementById('code-0')?.focus();
        toast.error('Code incorrect', {
          description: 'Le code de confirmation ne correspond pas.',
          duration: 3000
        });
        setIsVerifying(false);
        return;
      }

      // Démarrer la course (changer le statut à 'in_progress')
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/start`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            rideId,
            driverId,
            confirmationCode: enteredCode
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Erreur serveur:', errorData);
        throw new Error('Erreur lors du démarrage de la course');
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Course démarrée avec succès');
        toast.success('Course démarrée !', {
          description: 'Le trajet a commencé. Bonne route !',
          duration: 3000
        });
        
        // Notifier le parent que la confirmation est réussie
        setTimeout(() => {
          onConfirmed();
        }, 500);
      } else {
        throw new Error(data.error || 'Erreur lors de la confirmation');
      }
    } catch (error) {
      console.error('❌ Erreur vérification code:', error);
      setError(error instanceof Error ? error.message : 'Erreur de connexion');
      toast.error('Erreur', {
        description: 'Impossible de confirmer le code. Vérifiez votre connexion.',
        duration: 4000
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerify = () => {
    const enteredCode = code.join('');
    if (enteredCode.length !== 4) {
      setError('Veuillez entrer les 4 chiffres du code');
      return;
    }
    verifyCode(enteredCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={isVerifying}
            className="w-10 h-10 hover:bg-muted"
          >
            <X className="w-5 h-5 text-primary" />
          </Button>
          <h1 className="text-primary">Code de confirmation</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        {/* Icône */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="w-24 h-24 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center shadow-lg"
        >
          <Lock className="w-12 h-12 text-white" />
        </motion.div>

        {/* Titre */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Confirmation de prise en charge</h2>
          <p className="text-muted-foreground">
            Demandez le code de confirmation à <span className="font-semibold text-primary">{passengerName}</span>
          </p>
        </div>

        {/* Info SMS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 max-w-md"
        >
          <Smartphone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Code envoyé par SMS</p>
            <p className="text-blue-700">
              Le passager a reçu un code à 4 chiffres par SMS. Demandez-lui de vous le communiquer.
            </p>
          </div>
        </motion.div>

        {/* Champs de saisie du code */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 w-full max-w-sm"
        >
          <div className="flex justify-center gap-4">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isVerifying}
                className="w-16 h-20 text-center text-3xl font-bold border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Erreur */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}

          {/* Bouton de vérification manuelle */}
          <Button
            onClick={handleManualVerify}
            disabled={isVerifying || code.some(d => !d)}
            className="w-full bg-gradient-to-r from-secondary to-primary text-white py-6 text-lg disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Vérification...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Confirmer et démarrer
              </>
            )}
          </Button>
        </motion.div>

        {/* Instructions */}
        <div className="text-center text-sm text-muted-foreground max-w-md">
          <p>
            💡 <span className="font-medium">Conseil :</span> Assurez-vous que le passager est bien présent et prêt avant de démarrer la course.
          </p>
        </div>
      </div>
    </div>
  );
}