/**
 * 💳 EjpayWaitingModal — « Validez sur votre téléphone »
 * ---------------------------------------------------------------------------
 * Affiché pendant l'attente du résultat d'un paiement Mobile Money.
 * Aucune redirection, aucune popup : le client reçoit une demande de
 * validation opérateur (prompt / USSD) et cet écran suit l'avancement.
 */

import { motion, AnimatePresence } from '../../lib/motion';
import { Loader2, Smartphone, Clock, CheckCircle2, X } from '../../lib/icons';
import { formatMsisdn } from '../../lib/ejpay-service';

interface EjpayWaitingModalProps {
  open: boolean;
  /** Temps écoulé depuis l'envoi de la demande, en millisecondes. */
  elapsedMs?: number;
  message?: string;
  amount?: number;
  currency?: 'CDF' | 'USD';
  msisdn?: string | null;
  operatorName?: string | null;
  onCancel?: () => void;
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function EjpayWaitingModal({
  open,
  elapsedMs = 0,
  message,
  amount,
  currency = 'CDF',
  msisdn,
  operatorName,
  onCancel,
}: EjpayWaitingModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            {/* Icône + titre */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 animate-ping rounded-full bg-[#FFB800]/30" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#FFB800]/15">
                  <Smartphone className="h-8 w-8 text-[#0D3145]" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-[#0D3145]">
                Validez sur votre téléphone
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {message || 'Une demande de paiement vient de vous être envoyée.'}
              </p>
            </div>

            {/* Montant */}
            {typeof amount === 'number' && amount > 0 && (
              <div className="mt-5 rounded-xl bg-[#0D3145]/5 p-3 text-center">
                <p className="text-xs uppercase tracking-wide text-gray-500">Montant</p>
                <p className="text-2xl font-bold text-[#0D3145]">
                  {amount.toLocaleString('fr-FR')} {currency}
                </p>
                {(operatorName || msisdn) && (
                  <p className="mt-1 text-xs text-gray-600">
                    {[operatorName, formatMsisdn(msisdn)].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            )}

            {/* Étapes */}
            <div className="mt-5 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                <span className="text-gray-700">Demande envoyée à l'opérateur</span>
              </div>
              <div className="flex items-start gap-2">
                <Loader2 className="mt-0.5 h-4 w-4 flex-shrink-0 animate-spin text-[#FFB800]" />
                <span className="text-gray-700">
                  Saisissez votre code secret sur le téléphone pour confirmer
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                <span className="text-gray-500">
                  En attente depuis {formatElapsed(elapsedMs)}
                </span>
              </div>
            </div>

            <p className="mt-4 rounded-lg bg-amber-50 p-2 text-center text-[11px] text-amber-800">
              Vous n'avez rien reçu ? Vérifiez le solde de votre compte Mobile Money, puis
              composez le code de votre opérateur. Ne relancez pas le paiement.
            </p>

            {onCancel && (
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                onClick={onCancel}
              >
                <X className="h-4 w-4" />
                Annuler l'attente
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
