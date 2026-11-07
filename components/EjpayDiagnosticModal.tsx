import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from '../lib/motion';
import { Button } from './ui/button';
import {
  X,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from '../lib/icons';

interface EjpayDiagnosticModalProps {
  show: boolean;
  onClose: () => void;
}

interface EjpayHealth {
  success: boolean;
  provider: string;
  version: string;
  enabled: boolean;
  configured: boolean;
  oauthOk: boolean;
  oauthError: string | null;
  callbackConfigured: boolean;
  callbackUrl: string | null;
  operators: Array<{ id: number; key: string; name: string }>;
  minAmount: Record<string, number>;
  checkedAt: string;
}

function StatusRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail?: string;
}) {
  const Icon = ok ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${ok ? 'text-green-600' : 'text-red-600'}`} />
      <div className="min-w-0">
        <p className={`text-sm font-medium ${ok ? 'text-green-900' : 'text-red-900'}`}>{label}</p>
        {detail ? (
          <p className={`text-xs mt-1 break-words ${ok ? 'text-green-800' : 'text-red-800'}`}>{detail}</p>
        ) : null}
      </div>
    </div>
  );
}

export function EjpayDiagnosticModal({ show, onClose }: EjpayDiagnosticModalProps) {
  const [health, setHealth] = useState<EjpayHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const runDiagnostic = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/ejpay/health`,
        {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      setHealth(result as EjpayHealth);
    } catch (err: any) {
      setHealth(null);
      setError(err?.message || 'Impossible de joindre le serveur');
    } finally {
      setIsLoading(false);
    }
  };

  // Diagnostic automatique à l'ouverture : aucun paiement n'est créé.
  useEffect(() => {
    if (show && !health && !isLoading) {
      void runDiagnostic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const copyReport = async () => {
    const report = [
      'SmartCabb — diagnostic Mobile Money (Ejpay)',
      `Date: ${new Date().toLocaleString()}`,
      health ? JSON.stringify(health, null, 2) : `Erreur: ${error}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponible */
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl">📱 Diagnostic Mobile Money (Ejpay)</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Vérifie la configuration serveur, sans créer de paiement
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex gap-3">
                <Button onClick={runDiagnostic} disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Vérification…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Relancer le diagnostic
                    </span>
                  )}
                </Button>
                {(health || error) && (
                  <Button onClick={copyReport} variant="outline" className="flex items-center gap-2">
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copier le rapport
                      </>
                    )}
                  </Button>
                )}
              </div>

              {error && (
                <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                  <p className="text-sm font-medium text-red-900">Diagnostic indisponible</p>
                  <p className="text-xs mt-1 text-red-800 break-words">{error}</p>
                </div>
              )}

              {health && (
                <div className="space-y-3">
                  <StatusRow
                    ok={health.enabled}
                    label={health.enabled ? 'Mobile Money activé' : 'Mobile Money désactivé (flag ejpayEnabled)'}
                    detail={
                      health.enabled
                        ? 'Les paiements Mobile Money sont acceptés.'
                        : 'Réactivez le flag ejpayEnabled dans la configuration.'
                    }
                  />
                  <StatusRow
                    ok={health.configured}
                    label={health.configured ? 'Identifiants OAuth présents' : 'Identifiants OAuth manquants'}
                    detail={
                      health.configured
                        ? 'EJPAY_CLIENT_ID et EJPAY_CLIENT_SECRET sont définis.'
                        : 'Renseignez EJPAY_CLIENT_ID et EJPAY_CLIENT_SECRET dans les secrets Supabase.'
                    }
                  />
                  <StatusRow
                    ok={health.oauthOk}
                    label={health.oauthOk ? 'Authentification Ejpay OK' : 'Authentification Ejpay en échec'}
                    detail={
                      health.oauthOk
                        ? 'Le jeton OAuth est obtenu avec les identifiants actuels.'
                        : health.oauthError || 'Vérifiez le Client Secret.'
                    }
                  />
                  <StatusRow
                    ok={health.callbackConfigured}
                    label={
                      health.callbackConfigured
                        ? 'URL de callback configurée'
                        : 'URL de callback manquante'
                    }
                    detail={
                      health.callbackUrl
                        ? `${health.callbackUrl} — envoyée à Ejpay dans chaque paiement.`
                        : 'SUPABASE_URL doit être défini côté Edge Function.'
                    }
                  />

                  <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-2">Opérateurs disponibles</p>
                    <div className="flex flex-wrap gap-2">
                      {health.operators.map((operator) => (
                        <span
                          key={operator.id}
                          className="text-xs px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-700"
                        >
                          {operator.name} (ID {operator.id})
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Montants minimum :{' '}
                      {Object.entries(health.minAmount)
                        .map(([currency, value]) => `${value} ${currency}`)
                        .join(' · ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Version API {health.version} · vérifié le{' '}
                      {new Date(health.checkedAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
              )}

              {!health && !error && !isLoading && (
                <div className="text-center py-10 text-gray-400">
                  <p>Aucun résultat pour le moment.</p>
                  <p className="text-sm mt-2">Lancez le diagnostic pour vérifier la passerelle.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-2xl">
              <p className="text-sm text-gray-600">
                ✅ <strong>Attendu :</strong> activé + identifiants présents + authentification OK + callback
                configuré.
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Ce diagnostic n'initie aucun paiement : aucun montant n'est débité. Pour tester un vrai
                encaissement, utilisez la recharge du portefeuille (minimum 100 CDF).
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Secrets concernés (valeurs jamais affichées) : EJPAY_CLIENT_ID, EJPAY_CLIENT_SECRET,
                EJPAY_WEBHOOK_SECRET.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
