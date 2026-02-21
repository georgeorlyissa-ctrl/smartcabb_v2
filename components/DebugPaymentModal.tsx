import { useState } from 'react';
import { motion, AnimatePresence } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale avec AnimatePresence
import { Button } from './ui/button';
import { X, Copy, CheckCircle2, AlertCircle } from '../lib/icons';

interface DebugPaymentModalProps {
  show: boolean;
  onClose: () => void;
}

interface DebugLog {
  timestamp: string;
  level: 'info' | 'success' | 'error';
  message: string;
  data?: any;
}

export function DebugPaymentModal({ show, onClose }: DebugPaymentModalProps) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const addLog = (level: 'info' | 'success' | 'error', message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data,
    };
    setLogs((prev) => [...prev, log]);
  };

  const testFlutterwaveInit = async () => {
    setLogs([]);
    setIsLoading(true);
    
    try {
      addLog('info', 'Début du test Flutterwave');
      
      // Données de test
      const testData = {
        reference: `TEST_${Date.now()}`,
        description: 'Test Flutterwave - Debug',
        amount: 1000, // 1000 CDF
        currency: 'CDF',
        customerEmail: 'test@smartcabb.com',
        customerPhone: '0810000000',
        customerName: 'Test User',
        metadata: {
          userId: 'test-user-123',
          type: 'debug_test',
        },
      };

      addLog('info', 'Données de test préparées', testData);

      // Appel au serveur
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52`;
      
      addLog('info', `Envoi vers: ${serverUrl}/payments/flutterwave/init`);

      const response = await fetch(`${serverUrl}/payments/flutterwave/init`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      addLog('info', `Status HTTP: ${response.status} ${response.statusText}`);

      const result = await response.json();
      
      addLog('info', 'Réponse de création reçue', result);
      
      if (response.ok && result.success) {
        addLog('success', '✅ Transaction créée avec succès !', {
          transactionId: result.transactionId,
          providerReference: result.providerReference,
          redirectUrl: result.redirectUrl,
        });
        
        // Attendre 2 secondes avant de vérifier (délai de synchronisation Flutterwave)
        addLog('info', '⏳ Attente de 2 secondes pour la synchronisation Flutterwave...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test de vérification
        addLog('info', '🔍 Test de vérification de la transaction...');
        addLog('info', `   → TX_REF utilisé: ${result.transactionId}`);
        
        const verifyResponse = await fetch(
          `${serverUrl}/payments/flutterwave/verify/${encodeURIComponent(result.transactionId)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        addLog('info', `Status vérification HTTP: ${verifyResponse.status} ${verifyResponse.statusText}`);
        
        const verifyResult = await verifyResponse.json();
        
        if (verifyResponse.ok && verifyResult.isValid) {
          addLog('success', '✅ Vérification réussie !', verifyResult);
        } else {
          addLog('error', '❌ Échec de la vérification', verifyResult);
          
          // Diagnostic supplémentaire
          if (verifyResult.error?.includes('No transaction was found')) {
            addLog('error', '🔍 DIAGNOSTIC: La transaction n\'existe pas dans Flutterwave', {
              cause_possible_1: 'La clé API est en mode TEST mais le compte n\'est pas configuré',
              cause_possible_2: 'La transaction n\'a pas été réellement créée côté Flutterwave',
              cause_possible_3: 'Problème de synchronisation (délai trop court)',
              solution_1: 'Vérifiez que FLUTTERWAVE_SECRET_KEY est une clé valide',
              solution_2: 'Vérifiez votre dashboard Flutterwave: https://dashboard.flutterwave.com/transactions',
              solution_3: 'Assurez-vous que le mode TEST est activé et configuré',
            });
          }
        }
      } else {
        addLog('error', '❌ Erreur lors de la création de la transaction', result);
        
        // Diagnostic des erreurs de création
        if (result.error === 'Configuration Flutterwave manquante') {
          addLog('error', '🔧 SOLUTION: La variable FLUTTERWAVE_SECRET_KEY n\'est pas définie dans Supabase', {
            etape_1: 'Allez sur https://dashboard.flutterwave.com/settings/apis',
            etape_2: 'Copiez votre "Secret Key" (TEST ou LIVE)',
            etape_3: 'Ajoutez-la dans les secrets Supabase avec le nom FLUTTERWAVE_SECRET_KEY',
          });
        } else if (result.details?.message?.includes('Invalid authorization')) {
          addLog('error', '🔧 SOLUTION: La clé API Flutterwave est invalide ou expirée', {
            etape_1: 'Vérifiez que vous utilisez la bonne clé (TEST vs LIVE)',
            etape_2: 'Régénérez une nouvelle clé sur https://dashboard.flutterwave.com/settings/apis',
            etape_3: 'Mettez à jour FLUTTERWAVE_SECRET_KEY dans Supabase',
          });
        }
      }
    } catch (error: any) {
      addLog('error', 'Erreur réseau', {
        message: error.message,
        stack: error.stack,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyLogs = () => {
    const logsText = logs
      .map((log) => {
        let text = `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`;
        if (log.data) {
          text += `\n${JSON.stringify(log.data, null, 2)}`;
        }
        return text;
      })
      .join('\n\n');
    
    navigator.clipboard.writeText(logsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-blue-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl">🔍 Debug Paiement Flutterwave</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Test de création et vérification de transaction
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={testFlutterwaveInit}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Test en cours...' : '🧪 Lancer le Test'}
                </Button>
                
                {logs.length > 0 && (
                  <Button
                    onClick={copyLogs}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copier les logs
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Logs */}
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getLevelColor(log.level)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getLevelIcon(log.level)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500 font-mono">
                              {log.timestamp}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              log.level === 'success' ? 'bg-green-200 text-green-800' :
                              log.level === 'error' ? 'bg-red-200 text-red-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {log.level.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{log.message}</p>
                          {log.data && (
                            <pre className="text-xs bg-white/50 p-3 rounded border overflow-x-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>Aucun log pour le moment.</p>
                  <p className="text-sm mt-2">Cliquez sur "Lancer le Test" pour commencer.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 rounded-b-2xl">
              <div className="text-sm text-gray-600 space-y-1">
                <p>✅ <strong>Succès attendu :</strong> Transaction créée + redirectUrl présent</p>
                <p>❌ <strong>Erreurs possibles :</strong></p>
                <ul className="ml-6 space-y-1 text-xs">
                  <li>• "Configuration Flutterwave manquante" → FLUTTERWAVE_SECRET_KEY non définie</li>
                  <li>• "Invalid authorization key" → Clé API invalide ou expirée</li>
                  <li>• "No transaction was found" → Transaction non créée dans Flutterwave</li>
                </ul>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500">
                    💡 <strong>Rappel :</strong> Assurez-vous que votre clé API Flutterwave est configurée dans Supabase Secrets :
                  </p>
                  <div className="bg-gray-100 rounded px-3 py-2 mt-2 font-mono text-xs">
                    FLUTTERWAVE_SECRET_KEY = votre_clé_production
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    L'application utilise uniquement l'API Flutterwave en mode production.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}