/**
 * 💳 useEjpayCheckout — paiement Mobile Money de bout en bout (côté écran)
 * ---------------------------------------------------------------------------
 * Encapsule les trois étapes que tous les écrans de paiement doivent répéter :
 *
 *   1. `paymentService.initPayment()` → `POST /ejpay/collect`
 *      (le client reçoit une demande de validation sur son téléphone) ;
 *   2. attente du résultat final (`GET /ejpay/status/:orderId` toutes les 3 s),
 *      avec chronomètre et annulation ;
 *   3. verdict normalisé (`completed` / `failed` / `cancelled` / `timeout`).
 *
 * Aucune fenêtre surgissante : tout se passe sur le téléphone du client.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { paymentService } from '../lib/payment-service';
import { waitForEjpayOrder } from '../lib/ejpay-service';
import type { PaymentInitData } from '../lib/payment-providers/base-provider';

export type EjpayCheckoutPhase =
  | 'idle'
  | 'initiating'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type EjpayOutcomeStatus = 'completed' | 'failed' | 'cancelled' | 'timeout';

export interface EjpayCheckoutOutcome {
  success: boolean;
  status: EjpayOutcomeStatus;
  transactionId?: string;
  message: string;
  /** `true` si le paiement est toujours en attente côté opérateur (timeout). */
  pending?: boolean;
}

export interface UseEjpayCheckout {
  phase: EjpayCheckoutPhase;
  /** Temps écoulé depuis l'envoi de la demande (ms). */
  elapsedMs: number;
  message: string;
  transactionId: string | null;
  isBusy: boolean;
  pay: (data: PaymentInitData) => Promise<EjpayCheckoutOutcome>;
  cancel: () => void;
  reset: () => void;
}

export function useEjpayCheckout(): UseEjpayCheckout {
  const [phase, setPhase] = useState<EjpayCheckoutPhase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [message, setMessage] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopTimer();
    abortRef.current?.abort();
  }, [stopTimer]);

  const reset = useCallback(() => {
    stopTimer();
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase('idle');
    setElapsedMs(0);
    setMessage('');
    setTransactionId(null);
  }, [stopTimer]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const pay = useCallback(async (data: PaymentInitData): Promise<EjpayCheckoutOutcome> => {
    setPhase('initiating');
    setMessage('Envoi de la demande de paiement…');
    setElapsedMs(0);
    setTransactionId(null);

    const result = await paymentService.initPayment(data);

    if (!result.success) {
      const failure = result.message || 'Paiement refusé';
      setPhase('failed');
      setMessage(failure);
      return {
        success: false,
        status: 'failed',
        transactionId: result.transactionId,
        message: failure,
      };
    }

    const orderId = result.transactionId;
    if (!orderId) {
      setPhase('failed');
      setMessage('Référence de paiement manquante');
      return { success: false, status: 'failed', message: 'Référence de paiement manquante' };
    }

    setTransactionId(orderId);
    setPhase('waiting');
    setMessage(
      result.metadata?.operatorName
        ? `Validez le paiement ${result.metadata.operatorName} sur votre téléphone`
        : 'Validez le paiement sur votre téléphone',
    );

    startedAtRef.current = Date.now();
    stopTimer();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 1000);

    const controller = new AbortController();
    abortRef.current = controller;

    const outcome = await waitForEjpayOrder(orderId, {
      intervalMs: 3000,
      timeoutMs: 180_000,
      signal: controller.signal,
      onTick: (elapsed) => setElapsedMs(elapsed),
    });

    stopTimer();
    abortRef.current = null;

    if (outcome.status === 'SUCCESS') {
      setPhase('completed');
      setElapsedMs(outcome.elapsedMs);
      setMessage('Paiement confirmé');
      return { success: true, status: 'completed', transactionId: orderId, message: 'Paiement confirmé' };
    }

    if (outcome.status === 'CANCELLED') {
      setPhase('cancelled');
      setElapsedMs(outcome.elapsedMs);
      setMessage('Paiement annulé');
      return {
        success: false,
        status: 'cancelled',
        transactionId: orderId,
        message: 'Paiement annulé. Si vous avez déjà validé sur votre téléphone, le montant sera crédité automatiquement.',
      };
    }

    if (outcome.status === 'TIMEOUT') {
      // On ne laisse pas l'overlay ouvert : le paiement reste suivi côté serveur
      // (webhook) et l'écran affiche un message informatif.
      setPhase('idle');
      setElapsedMs(outcome.elapsedMs);
      setMessage('Toujours en attente de validation sur votre téléphone…');
      return {
        success: false,
        status: 'timeout',
        transactionId: orderId,
        pending: true,
        message: 'Paiement toujours en attente. Il sera crédité automatiquement dès validation.',
      };
    }

    const failure = outcome.reason || (outcome.status === 'REVIEW' ? 'Paiement en vérification manuelle' : 'Paiement refusé');
    setPhase('failed');
    setElapsedMs(outcome.elapsedMs);
    setMessage(failure);
    return {
      success: false,
      status: 'failed',
      transactionId: orderId,
      pending: outcome.status === 'REVIEW',
      message: failure,
    };
  }, [stopTimer]);

  return {
    phase,
    elapsedMs,
    message,
    transactionId,
    isBusy: phase === 'initiating' || phase === 'waiting',
    pay,
    cancel,
    reset,
  };
}
