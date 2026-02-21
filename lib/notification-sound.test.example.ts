/**
 * 🧪 EXEMPLES DE TESTS POUR LES NOTIFICATIONS SONORES
 * 
 * Ce fichier montre comment utiliser et tester le système de notifications
 * avec différents cas de figure.
 * 
 * Note: Ce ne sont pas de vrais tests Jest/Vitest, mais des exemples d'utilisation
 */

import { playRideNotification } from './notification-sound';

// ✅ CAS 1: Notification complète avec toutes les informations
export async function testFullNotification() {
  console.log('🧪 Test: Notification complète avec adresses');
  
  await playRideNotification({
    passengerName: 'Jean Mukendi',
    pickup: 'Avenue Kasavubu, Commune de la Gombe, Kinshasa',
    destination: 'Boulevard du 30 Juin, Centre-ville, Kinshasa',
    distance: 3.5,
    estimatedEarnings: 2500
  });
  
  // Devrait lire:
  // "Bonjour, vous avez une nouvelle course SmartCabb. 
  //  Départ : Avenue Kasavubu, Commune de la Gombe, Kinshasa. 
  //  Destination : Boulevard du 30 Juin, Centre-ville, Kinshasa. 
  //  Merci de confirmer rapidement."
}

// ✅ CAS 2: Notification sans destination (course express ou pickup only)
export async function testNotificationNoDestination() {
  console.log('🧪 Test: Notification sans destination');
  
  await playRideNotification({
    passengerName: 'Marie Tshala',
    pickup: 'Gare Centrale de Kinshasa',
    distance: 2.0,
    estimatedEarnings: 1500
  });
  
  // Devrait lire:
  // "Bonjour, vous avez une nouvelle course SmartCabb. 
  //  Départ : Gare Centrale de Kinshasa. 
  //  Merci de confirmer rapidement."
}

// ✅ CAS 3: Notification avec montant élevé (arrondi à la centaine)
export async function testNotificationHighEarnings() {
  console.log('🧪 Test: Notification avec montant arrondi');
  
  await playRideNotification({
    pickup: 'Aéroport de N\'djili',
    destination: 'Hôtel Memling, Gombe',
    distance: 15.3,
    estimatedEarnings: 12750 // Sera arrondi à 12800
  });
  
  // Devrait lire:
  // "Bonjour, vous avez une nouvelle course SmartCabb. 
  //  Départ : Aéroport de N'djili. 
  //  Destination : Hôtel Memling, Gombe. 
  //  Merci de confirmer rapidement."
}

// ✅ CAS 4: Notification minimale (fallback)
export async function testNotificationMinimal() {
  console.log('🧪 Test: Notification sans détails');
  
  await playRideNotification();
  
  // Devrait lire:
  // "Bonjour, vous avez une nouvelle course en attente. Merci de confirmer."
}

// ✅ CAS 5: Notification avec adresses très courtes
export async function testNotificationShortAddresses() {
  console.log('🧪 Test: Adresses courtes');
  
  await playRideNotification({
    pickup: 'Gombe',
    destination: 'Kasa Vubu',
    distance: 1.2,
    estimatedEarnings: 800
  });
  
  // Devrait lire:
  // "Bonjour, vous avez une nouvelle course SmartCabb. 
  //  Départ : Gombe. 
  //  Destination : Kasa Vubu. 
  //  Merci de confirmer rapidement."
}

// ✅ CAS 6: Notification avec adresses très longues (communes + quartiers)
export async function testNotificationLongAddresses() {
  console.log('🧪 Test: Adresses longues et détaillées');
  
  await playRideNotification({
    pickup: 'Complexe Texaf Bilembo, Boulevard du 30 Juin, Commune de la Gombe, Ville de Kinshasa',
    destination: 'Marché Central de Kinshasa, Avenue Huileries, Commune de Kinshasa, Ville de Kinshasa',
    distance: 4.8,
    estimatedEarnings: 3200
  });
  
  // Note: Les adresses très longues peuvent rendre le message très long
  // Envisager un raccourcissement automatique si nécessaire
}

// ✅ CAS 7: Test de plusieurs notifications successives
export async function testMultipleNotifications() {
  console.log('🧪 Test: Plusieurs notifications rapides');
  
  // Première course
  await playRideNotification({
    pickup: 'Point A',
    destination: 'Point B',
    distance: 2.0,
    estimatedEarnings: 1500
  });
  
  // Attendre 2 secondes
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Deuxième course
  await playRideNotification({
    pickup: 'Point C',
    destination: 'Point D',
    distance: 3.0,
    estimatedEarnings: 2000
  });
  
  // Note: La première notification devrait être annulée par la deuxième
  // grâce à window.speechSynthesis.cancel() dans speakMessage()
}

// ✅ CAS 8: Test avec données du monde réel (Kinshasa)
export async function testRealWorldKinshasa() {
  console.log('🧪 Test: Données réelles de Kinshasa');
  
  const realWorldCases = [
    {
      name: 'Trajet typique centre-ville',
      data: {
        pickup: 'Place de la Gare, Commune de Kinshasa',
        destination: 'Marché de la Liberté, Commune de Kalamu',
        distance: 5.2,
        estimatedEarnings: 3500
      }
    },
    {
      name: 'Course vers l\'aéroport',
      data: {
        pickup: 'Hôtel Pullman, Boulevard du 30 Juin',
        destination: 'Aéroport International de N\'djili',
        distance: 25.0,
        estimatedEarnings: 15000
      }
    },
    {
      name: 'Trajet inter-communes',
      data: {
        pickup: 'Université de Kinshasa (UNIKIN), Commune de Lemba',
        destination: 'Cité de l\'Union Africaine, Commune de Ngaliema',
        distance: 8.5,
        estimatedEarnings: 5500
      }
    }
  ];
  
  for (const testCase of realWorldCases) {
    console.log(`  → ${testCase.name}`);
    await playRideNotification(testCase.data);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Pause entre les tests
  }
}

// ✅ CAS 9: Test de performance (vérifier les temps de lecture)
export async function testPerformance() {
  console.log('🧪 Test: Performance et timing');
  
  const startTime = Date.now();
  
  await playRideNotification({
    pickup: 'Avenue des Aviateurs, Gombe',
    destination: 'Boulevard Lumumba, Limete',
    distance: 6.5,
    estimatedEarnings: 4200
  });
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`  ⏱️ Durée totale: ${duration}ms`);
  console.log(`  ⏱️ Durée en secondes: ${(duration / 1000).toFixed(2)}s`);
  
  // Le message devrait prendre environ 8-12 secondes selon la vitesse de lecture
}

// ✅ CAS 10: Test de gestion d'erreur (adresses undefined/null)
export async function testErrorHandling() {
  console.log('🧪 Test: Gestion des erreurs');
  
  // Test avec adresses vides
  await playRideNotification({
    pickup: '',
    destination: '',
    distance: 0,
    estimatedEarnings: 0
  });
  
  // Test avec valeurs nulles
  await playRideNotification({
    pickup: undefined,
    destination: undefined,
    distance: undefined,
    estimatedEarnings: undefined
  });
  
  // Devrait utiliser le message fallback dans les deux cas
}

/**
 * 🚀 EXÉCUTER TOUS LES TESTS
 * 
 * Pour tester dans la console navigateur:
 * 
 * import * as tests from './lib/notification-sound.test.example';
 * 
 * // Test individuel
 * tests.testFullNotification();
 * 
 * // Ou exécuter une série de tests
 * async function runAllTests() {
 *   await tests.testFullNotification();
 *   await tests.testNotificationNoDestination();
 *   await tests.testNotificationHighEarnings();
 *   await tests.testNotificationMinimal();
 * }
 * 
 * runAllTests();
 */

export async function runQuickTests() {
  console.log('🚀 Exécution des tests rapides...\n');
  
  await testFullNotification();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testNotificationNoDestination();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await testNotificationMinimal();
  
  console.log('\n✅ Tests terminés !');
}