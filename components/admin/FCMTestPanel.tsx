/**
 * 🧪 PANEL DE TEST FIREBASE CLOUD MESSAGING (FCM)
 * 
 * Panel admin pour tester et configurer Firebase FCM :
 * - Vérifier le statut Firebase
 * - Récupérer son propre token FCM
 * - Envoyer des notifications de test
 * - Tester les notifications de course
 * 
 * @version 1.0.0
 * @date 2026-01-20
 */

import React, { useState, useEffect } from 'react';
import { Bell, Send, CheckCircle, XCircle, AlertCircle, Copy, RefreshCw } from '../../lib/admin-icons';
import { getFCMToken, isFCMSupported, getNotificationPermissionStatus } from '../../lib/fcm-service';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export default function FCMTestPanel() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [firebaseStatus, setFirebaseStatus] = useState<'loading' | 'configured' | 'not-configured'>('loading');
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  
  // État pour l'envoi de notifications de test
  const [testTitle, setTestTitle] = useState('Test SmartCabb');
  const [testMessage, setTestMessage] = useState('Ceci est une notification de test 🔔');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // État pour le test de notification de course
  const [rideTestData, setRideTestData] = useState({
    pickup: 'Avenue Kasavubu, Kinshasa',
    destination: 'Boulevard du 30 Juin, Kinshasa',
    passengerName: 'Jean Mukendi',
    distance: 3.5,
    estimatedEarnings: 2500
  });

  useEffect(() => {
    checkFCMSupport();
    checkFirebaseStatus();
  }, []);

  /**
   * Vérifier si FCM est supporté
   */
  async function checkFCMSupport() {
    const supported = await isFCMSupported();
    setIsSupported(supported);
    
    const perm = getNotificationPermissionStatus();
    setPermission(perm);

    console.log('🔔 FCM supporté :', supported);
    console.log('🔔 Permission :', perm);
  }

  /**
   * Vérifier le statut Firebase côté serveur
   */
  async function checkFirebaseStatus() {
    try {
      console.log('🔍 Appel de /fcm/status...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/fcm/status`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      console.log('📡 Réponse /fcm/status:', response.status, response.statusText);
      
      // Lire la réponse en texte brut d'abord
      const responseText = await response.text();
      console.log('📄 Réponse brute:', responseText);

      // Essayer de parser en JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ JSON parsé:', data);
      } catch (parseError) {
        console.error('❌ Erreur parsing JSON:', parseError);
        console.error('📄 Texte reçu:', responseText.substring(0, 200));
        setFirebaseStatus('not-configured');
        return;
      }

      setFirebaseStatus(data.configured ? 'configured' : 'not-configured');
      console.log('🔥 Firebase Status :', data);
    } catch (error) {
      console.error('❌ Erreur vérification Firebase :', error);
      setFirebaseStatus('not-configured');
    }
  }

  /**
   * Récupérer le token FCM
   */
  async function handleGetToken() {
    console.log('🔑 handleGetToken() - DÉBUT');
    setIsLoadingToken(true);
    try {
      console.log('🔑 Appel de getFCMToken()...');
      const token = await getFCMToken();
      console.log('🔑 Token récupéré :', token ? token.substring(0, 20) + '...' : 'NULL');
      setFcmToken(token);
      
      if (token) {
        // Mettre à jour la permission
        setPermission('granted');
        console.log('✅ Token FCM récupéré avec succès');
        alert('✅ Token FCM récupéré avec succès !');
      } else {
        console.log('ℹ️ Token FCM non disponible (permissions ou configuration manquante)');
        alert('ℹ️ Token FCM non disponible. Vérifiez que vous avez autorisé les notifications et que Firebase est correctement configuré.');
      }
    } catch (error) {
      console.error('❌ Erreur récupération token :', error);
      alert('❌ Erreur : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setIsLoadingToken(false);
      console.log('🔑 handleGetToken() - FIN');
    }
  }

  /**
   * Copier le token dans le presse-papiers
   */
  function copyToken() {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      alert('Token copié !');
    }
  }

  /**
   * Envoyer une notification de test
   */
  async function sendTestNotification() {
    if (!fcmToken) {
      alert('Veuillez d\'abord récupérer votre token FCM');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/fcm/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            fcmToken,
            title: testTitle,
            message: testMessage
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        setSendResult({ success: true, message: 'Notification envoyée avec succès !' });
      } else {
        setSendResult({ success: false, message: data.error || 'Échec de l\'envoi' });
      }
    } catch (error) {
      console.error('❌ Erreur envoi notification :', error);
      setSendResult({ success: false, message: 'Erreur réseau' });
    } finally {
      setIsSending(false);
    }
  }

  /**
   * Envoyer une notification de course de test
   */
  async function sendRideTestNotification() {
    if (!fcmToken) {
      alert('Veuillez d\'abord récupérer votre token FCM');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/fcm/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            fcmToken,
            title: '🚗 SmartCabb - Nouvelle Course',
            message: `De ${rideTestData.pickup} à ${rideTestData.destination}`
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        setSendResult({ success: true, message: 'Notification de course envoyée !' });
      } else {
        setSendResult({ success: false, message: data.error || 'Échec de l\'envoi' });
      }
    } catch (error) {
      console.error('❌ Erreur envoi notification de course :', error);
      setSendResult({ success: false, message: 'Erreur réseau' });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold">Test Firebase Cloud Messaging (FCM)</h1>
      </div>

      {/* Statut Firebase */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">📊 Statut Firebase</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="font-medium">Serveur Firebase configuré :</span>
            {firebaseStatus === 'loading' ? (
              <span className="text-gray-500">Vérification...</span>
            ) : firebaseStatus === 'configured' ? (
              <span className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Oui
              </span>
            ) : (
              <span className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Non
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="font-medium">Navigateur supporte FCM :</span>
            {isSupported ? (
              <span className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Oui
              </span>
            ) : (
              <span className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Non
              </span>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="font-medium">Permission de notification :</span>
            {permission === 'granted' ? (
              <span className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                Accordée
              </span>
            ) : permission === 'denied' ? (
              <span className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Refusée
              </span>
            ) : (
              <span className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-5 h-5" />
                Non demandée
              </span>
            )}
          </div>
        </div>

        {firebaseStatus === 'not-configured' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Firebase non configuré :</strong> Ajoutez les variables d'environnement FIREBASE_PROJECT_ID et FIREBASE_SERVER_KEY dans Supabase.
            </p>
          </div>
        )}
      </div>

      {/* Récupération du token */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">🔑 Votre Token FCM</h2>
        
        {!fcmToken ? (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Cliquez sur le bouton pour récupérer votre token FCM. Ce token permet d'envoyer des notifications à cet appareil.
            </p>
            <button
              onClick={handleGetToken}
              disabled={!isSupported}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Récupérer mon token FCM
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={fcmToken}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded font-mono text-sm bg-gray-50"
              />
              <button
                onClick={copyToken}
                className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copier
              </button>
            </div>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Token récupéré avec succès !
            </p>
          </div>
        )}
      </div>

      {/* Test de notification simple */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">🧪 Test de notification simple</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Titre</label>
            <input
              type="text"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              placeholder="Titre de la notification"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={3}
              placeholder="Message de la notification"
            />
          </div>

          <button
            onClick={sendTestNotification}
            disabled={isSending || !fcmToken}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Envoi...' : 'Envoyer la notification'}
          </button>

          {sendResult && (
            <div className={`p-4 rounded ${sendResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`text-sm ${sendResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {sendResult.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Test de notification de course */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">🚗 Test de notification de course</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Adresse de départ</label>
              <input
                type="text"
                value={rideTestData.pickup}
                onChange={(e) => setRideTestData({ ...rideTestData, pickup: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Destination</label>
              <input
                type="text"
                value={rideTestData.destination}
                onChange={(e) => setRideTestData({ ...rideTestData, destination: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>

          <button
            onClick={sendRideTestNotification}
            disabled={isSending || !fcmToken}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            {isSending ? 'Envoi...' : 'Envoyer notification de course'}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📖 Instructions</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Récupérez d'abord votre token FCM</li>
          <li>Testez l'envoi de notifications simples</li>
          <li>Testez les notifications de course avec adresses</li>
          <li>Les notifications apparaîtront dans votre navigateur</li>
          <li>Si l'app est fermée, vous recevrez quand même la notification (Service Worker)</li>
        </ul>
      </div>
    </div>
  );
}