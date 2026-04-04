/**
 * 🔍 Composant de diagnostic pour l'inscription conducteur
 * Permet de tester chaque étape individuellement
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function DriverSignupDiagnostic() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testUserId, setTestUserId] = useState('');

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  // Test 1: Créer un utilisateur test
  const testCreateUser = async () => {
    addLog('🧪 TEST 1: Création utilisateur...');
    try {
      const testData = {
        full_name: 'Test Driver ' + Date.now(),
        phone: '+243' + Math.floor(Math.random() * 1000000000),
        password: 'TestPass123!',
        vehicleMake: 'Toyota',
        vehicleModel: 'Corolla',
        vehiclePlate: 'TEST-' + Math.floor(Math.random() * 9999),
        vehicleColor: 'Blanc',
        vehicleCategory: 'smart_standard'
      };

      addLog(`📞 Téléphone: ${testData.phone}`);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(testData)
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        addLog(`✅ Utilisateur créé: ${result.user.id}`);
        addLog(`📧 Email: ${result.user.email}`);
        addLog(`👤 Nom: ${result.profile.full_name}`);
        setTestUserId(result.user.id);
        return result.user.id;
      } else {
        addLog(`❌ Erreur: ${result.error}`);
        return null;
      }
    } catch (error) {
      addLog(`❌ Exception: ${error}`);
      return null;
    }
  };

  // Test 2: Vérifier le profil dans le KV store
  const testGetProfile = async (userId?: string) => {
    const id = userId || testUserId;
    if (!id) {
      addLog('❌ Aucun ID utilisateur');
      return;
    }

    addLog(`🧪 TEST 2: Récupération profil ${id}...`);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        addLog(`✅ Profil trouvé: ${result.driver.full_name}`);
        addLog(`📊 Status: ${result.driver.status}`);
        addLog(`🚗 Véhicule: ${result.driver.vehicle?.make} ${result.driver.vehicle?.model}`);
      } else {
        addLog(`❌ Profil non trouvé: ${result.error} (HTTP ${response.status})`);
      }
    } catch (error) {
      addLog(`❌ Exception: ${error}`);
    }
  };

  // Test 0: Test KV Store basique
  const testKVStore = async () => {
    addLog('🧪 TEST 0: Test fonctionnement KV store...');
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/test-kv-save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        addLog(`📊 Résultats du test KV:`);
        addLog(`  ├─ kv.set() → ${result.results.kvSet}`);
        addLog(`  ├─ kv.get() → ${result.results.kvGet}`);
        addLog(`  ├─ Supabase save → ${result.results.supabaseSave}`);
        addLog(`  └─ Supabase get → ${result.results.supabaseGet}`);
        
        if (result.results.kvGet === 'not_found') {
          addLog(`❌ PROBLÈME DÉTECTÉ: kv.set() ne persiste pas les données!`);
        } else {
          addLog(`✅ KV store fonctionne correctement`);
        }
      } else {
        addLog(`❌ Erreur test KV: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Exception: ${error}`);
    }
  };

  // Test 3: Diagnostic KV store
  const testDiagnostic = async (userId?: string) => {
    const id = userId || testUserId;
    if (!id) {
      addLog('❌ Aucun ID utilisateur');
      return;
    }

    addLog(`🧪 TEST 3: Diagnostic KV store pour ${id}...`);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/debug/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        addLog(`🔍 driver:${id} => ${result.found.driver ? '✅ TROUVÉ' : '❌ ABSENT'}`);
        addLog(`🔍 profile:${id} => ${result.found.profile ? '✅ TROUVÉ' : '❌ ABSENT'}`);
        addLog(`📊 Total drivers: ${result.counts.totalDrivers}`);
        addLog(`📊 Total profiles: ${result.counts.totalProfiles}`);
      } else {
        addLog(`❌ Erreur diagnostic: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Exception: ${error}`);
    }
  };

  // Test complet
  const runFullTest = async () => {
    setLogs([]);
    addLog('🚀 DÉBUT DU TEST COMPLET');
    addLog('='.repeat(50));

    // Test 0: Vérifier que le KV store fonctionne
    await testKVStore();
    addLog('');
    
    // Test 1-3: Test d'inscription complète
    const userId = await testCreateUser();
    
    if (userId) {
      addLog('⏳ Attente 2 secondes...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await testGetProfile(userId);
      await testDiagnostic(userId);
    }

    addLog('='.repeat(50));
    addLog('✅ TEST TERMINÉ');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔍 Diagnostic Inscription Conducteur</h1>
      
      <div className="space-y-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={runFullTest}>🚀 Test Complet</Button>
          <Button onClick={testKVStore} variant="outline">0️⃣ Test KV Store</Button>
          <Button onClick={() => testCreateUser()}>1️⃣ Créer Utilisateur</Button>
          <Button onClick={() => testGetProfile()}>2️⃣ Get Profil</Button>
          <Button onClick={() => testDiagnostic()}>3️⃣ Diagnostic KV</Button>
        </div>

        {testUserId && (
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-mono">ID Test: {testUserId}</p>
          </div>
        )}

        <Button 
          variant="outline" 
          onClick={() => setLogs([])}
        >
          🗑️ Clear Logs
        </Button>
      </div>

      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-500">Aucun log. Cliquez sur un bouton de test.</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))
        )}
      </div>
    </div>
  );
}
