import { useState } from 'react';
import { AlertCircle, Search, CheckCircle, XCircle } from '../../lib/icons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function DriverLoginDiagnostic() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const normalizePhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/[\s\-+()]/g, '');
    
    // 9 chiffres → 243XXXXXXXXX
    if (cleaned.length === 9 && /^\d+$/.test(cleaned)) {
      return `243${cleaned}`;
    }
    
    // 10 chiffres avec 0 → 243XXXXXXXXX
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return `243${cleaned.substring(1)}`;
    }
    
    // 12 chiffres avec 243 → 243XXXXXXXXX
    if (cleaned.length === 12 && cleaned.startsWith('243')) {
      return cleaned;
    }
    
    // 13 chiffres avec 2430 → 243XXXXXXXXX
    if (cleaned.length === 13 && cleaned.startsWith('2430')) {
      return `243${cleaned.substring(4)}`;
    }
    
    return phone;
  };

  const runDiagnostic = async () => {
    if (!phoneNumber.trim()) {
      setResult({
        success: false,
        error: 'Veuillez entrer votre numéro de téléphone'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const normalized = normalizePhoneNumber(phoneNumber);
      
      console.log('🔍 Diagnostic pour:', normalized);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/diagnostic-driver`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ identifier: normalized })
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('📊 Résultat diagnostic:', data);
      
      setResult(data);

    } catch (error) {
      console.error('❌ Erreur diagnostic:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        fallback: true
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">
              Problème de connexion ?
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              Si vous ne parvenez pas à vous connecter, ce diagnostic vous aidera à trouver votre email de connexion.
            </p>

            <div className="space-y-3">
              <div>
                <Label htmlFor="diagnostic-phone" className="text-blue-900">
                  Votre numéro de téléphone
                </Label>
                <Input
                  id="diagnostic-phone"
                  type="tel"
                  placeholder="Ex: 0812345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                  disabled={loading}
                />
              </div>

              <Button
                onClick={runDiagnostic}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>⏳ Recherche en cours...</>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Trouver mon email de connexion
                  </>
                )}
              </Button>
            </div>

            {result && (
              <div className="mt-4">
                {result.success && result.login_info ? (
                  // ✅ COMPTE TROUVÉ
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-green-900 mb-1">Compte trouvé !</h4>
                        <p className="text-sm text-green-800">
                          Utilisez cet email pour vous connecter :
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded border border-green-300 p-3 mb-3">
                      <div className="text-xs text-gray-600 mb-1">Email de connexion :</div>
                      <div className="font-mono font-bold text-green-700 break-all">
                        {result.login_info.email_auth}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Téléphone :</span>
                        <span className="font-medium">{result.login_info.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nom :</span>
                        <span className="font-medium">{result.login_info.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID :</span>
                        <span className="font-mono text-xs">{result.login_info.user_id.substring(0, 8)}...</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded text-sm">
                      <p className="font-semibold text-amber-900 mb-1">📧 Instructions :</p>
                      <ol className="list-decimal list-inside space-y-1 text-amber-800">
                        <li>Copiez l'email ci-dessus</li>
                        <li>Utilisez-le dans le champ "Email ou téléphone"</li>
                        <li>Entrez votre mot de passe habituel</li>
                      </ol>
                    </div>
                  </div>
                ) : result.sql_fix ? (
                  // ⚠️ EMAIL NON CONFIRMÉ
                  <div className="bg-amber-50 border-2 border-amber-500 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-amber-900 mb-1">Email non confirmé</h4>
                        <p className="text-sm text-amber-800 mb-3">
                          Votre compte existe mais l'email n'est pas confirmé.
                        </p>
                        <p className="text-sm text-amber-800 font-semibold">
                          Contactez l'administrateur pour confirmer votre compte.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : result.fallback ? (
                  // ❌ ERREUR DE CONNEXION AU SERVEUR
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-red-900 mb-1">Impossible de se connecter au serveur</h4>
                        <p className="text-sm text-red-800 mb-3">
                          Erreur : {result.error}
                        </p>
                        <div className="bg-white border border-red-300 rounded p-3 text-sm">
                          <p className="font-semibold text-red-900 mb-2">Solutions alternatives :</p>
                          <ol className="list-decimal list-inside space-y-1 text-red-800">
                            <li>Vérifiez votre connexion internet</li>
                            <li>Essayez de vous connecter avec votre numéro : <strong>{normalizePhoneNumber(phoneNumber)}</strong></li>
                            <li>Ou essayez : <strong>{normalizePhoneNumber(phoneNumber)}@smartcabb.app</strong></li>
                            <li>Si rien ne fonctionne, contactez l'administrateur avec votre numéro : <strong>{phoneNumber}</strong></li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // ❌ AUCUN COMPTE TROUVÉ
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-bold text-red-900 mb-1">Aucun compte trouvé</h4>
                        <p className="text-sm text-red-800 mb-3">
                          Aucun compte conducteur n'a été trouvé avec ce numéro.
                        </p>
                        <div className="bg-white border border-red-300 rounded p-3 text-sm">
                          <p className="font-semibold text-red-900 mb-2">Vérifications effectuées :</p>
                          <ul className="list-disc list-inside space-y-1 text-red-800">
                            <li>Format : {normalizePhoneNumber(phoneNumber)}</li>
                            <li>Format alternatif : 0{normalizePhoneNumber(phoneNumber).substring(3)}</li>
                          </ul>
                          <p className="mt-3 font-semibold text-red-900">
                            Essayez avec un autre format de numéro ou contactez l'administrateur.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}