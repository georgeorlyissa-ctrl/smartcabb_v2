import { useState } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function DebugAccountChecker() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkAccount = async () => {
    if (!phoneNumber) return;

    setLoading(true);
    try {
      console.log('🐛 Vérification du compte pour:', phoneNumber);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/auth/debug-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ phoneNumber })
        }
      );

      const data = await response.json();
      console.log('📥 Résultat:', data);
      setResult(data);
    } catch (error) {
      console.error('❌ Erreur:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border-2 border-blue-500 max-w-md z-50">
      <h3 className="font-bold mb-2">🐛 Debug Account Checker</h3>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Numéro de téléphone"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={checkAccount}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Vérification...' : 'Vérifier'}
        </button>
      </div>
      
      {result && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-96">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
