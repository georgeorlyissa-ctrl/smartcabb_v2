// 🔧 SCRIPT DE RESTAURATION DU SOLDE CONDUCTEUR
// v517.78 - 22 décembre 2024

/**
 * Ce script permet de restaurer le solde d'un conducteur
 * Usage: Copier-coller dans la console du navigateur (F12)
 */

(async function restoreDriverBalance() {
  console.log('🔧 SCRIPT DE RESTAURATION DU SOLDE CONDUCTEUR v517.78');
  console.log('─────────────────────────────────────────────────────');
  
  // ✅ Configuration
  const MONTANT_A_RESTAURER = 50000; // ✏️ MODIFIE CE MONTANT
  const projectId = 'xyfxtsvzmegcgwxayhnn';
  const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Znh0c3Z6bWVnY2d3eGF5aG5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE3MDIzNjksImV4cCI6MjA0NzI3ODM2OX0.v5PZP6m1Wiq_9ZsvwAZ5mjPMlPJE94Q0fmS_I8_M-W0';
  
  try {
    // 1️⃣ Récupérer le conducteur actuel
    console.log('1️⃣ Récupération du conducteur...');
    const driverData = localStorage.getItem('smartcab_current_driver');
    
    if (!driverData) {
      console.error('❌ Aucun conducteur connecté !');
      console.log('💡 Connecte-toi d\'abord en tant que conducteur');
      return;
    }
    
    const driver = JSON.parse(driverData);
    console.log(`✅ Conducteur trouvé: ${driver.name} (ID: ${driver.id})`);
    
    // 2️⃣ Vérifier le solde actuel
    console.log('\n2️⃣ Vérification du solde actuel...');
    
    const currentLocalBalance = localStorage.getItem(`driver_balance_${driver.id}`);
    console.log(`💾 localStorage: ${currentLocalBalance || 'null'} CDF`);
    
    const backendResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}/balance`,
      {
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!backendResponse.ok) {
      console.error('❌ Erreur backend:', backendResponse.status);
    } else {
      const backendData = await backendResponse.json();
      console.log(`🗄️ Backend KV: ${backendData.balance} CDF`);
    }
    
    // 3️⃣ Demander confirmation
    console.log(`\n3️⃣ Préparation de la restauration...`);
    console.log(`💰 Montant à restaurer: ${MONTANT_A_RESTAURER.toLocaleString('fr-FR')} CDF`);
    
    // 4️⃣ Mettre à jour le backend
    console.log('\n4️⃣ Mise à jour du backend...');
    const updateResponse = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driver.id}/balance`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          balance: MONTANT_A_RESTAURER
        })
      }
    );
    
    if (!updateResponse.ok) {
      throw new Error(`Erreur backend: ${updateResponse.status}`);
    }
    
    const updateData = await updateResponse.json();
    
    if (!updateData.success) {
      throw new Error('La mise à jour du backend a échoué');
    }
    
    console.log(`✅ Backend mis à jour: ${MONTANT_A_RESTAURER.toLocaleString('fr-FR')} CDF`);
    
    // 5️⃣ Mettre à jour le localStorage
    console.log('\n5️⃣ Mise à jour du localStorage...');
    localStorage.setItem(`driver_balance_${driver.id}`, MONTANT_A_RESTAURER.toString());
    console.log(`✅ localStorage mis à jour: ${MONTANT_A_RESTAURER.toLocaleString('fr-FR')} CDF`);
    
    // 6️⃣ Succès !
    console.log('\n─────────────────────────────────────────────────────');
    console.log('🎉 RESTAURATION RÉUSSIE !');
    console.log(`💰 Nouveau solde: ${MONTANT_A_RESTAURER.toLocaleString('fr-FR')} CDF`);
    console.log('🔄 Actualise la page (F5) pour voir le changement');
    console.log('─────────────────────────────────────────────────────');
    
    // Proposer de recharger
    const reload = confirm('Recharger la page maintenant pour voir le nouveau solde ?');
    if (reload) {
      window.location.reload();
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.log('\n💡 Suggestions:');
    console.log('   1. Vérifie que tu es connecté en tant que conducteur');
    console.log('   2. Vérifie ta connexion internet');
    console.log('   3. Essaie la restauration manuelle (voir RESTAURER_SOLDE_CONDUCTEUR.md)');
  }
})();
