/**
 * Message d'aide pour l'erreur "Invalid login credentials"
 * Affiche un guide dans la console pour créer des utilisateurs de test
 */

export function showLoginHelp() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  ❌ ERREUR "INVALID LOGIN CREDENTIALS" ?                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('💡 CAUSE:');
  console.log('   → Aucun compte n\'existe avec ces identifiants');
  console.log('');
  console.log('✅ SOLUTION EN 1 CLIC:');
  console.log('');
  console.log('   1. Ouvrir cette page:');
  console.log('      → https://smartcabb.com/admin/seed-test-users');
  console.log('      OU http://localhost:5173/admin/seed-test-users');
  console.log('');
  console.log('   2. Cliquer sur "🌱 Créer les utilisateurs de test"');
  console.log('');
  console.log('   3. Se connecter avec:');
  console.log('');
  console.log('      🚗 CONDUCTEUR:');
  console.log('         Téléphone: 0990666661');
  console.log('         Mot de passe: Test1234');
  console.log('         URL: /driver');
  console.log('');
  console.log('      👤 PASSAGER:');
  console.log('         Téléphone: 0990666662');
  console.log('         Mot de passe: Test1234');
  console.log('         URL: /app');
  console.log('');
  console.log('📚 DOCUMENTATION:');
  console.log('   → SOLUTION_RAPIDE.md');
  console.log('   → ERREUR_LOGIN_RESOLU.md');
  console.log('   → GUIDE_CONNEXION.md');
  console.log('');
  console.log('⏱️  TEMPS TOTAL: ~1 minute');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
}

// Afficher automatiquement si détection d'erreur de login
if (typeof window !== 'undefined') {
  // Écouter les erreurs de login
  window.addEventListener('smartcabb:login-error', () => {
    showLoginHelp();
  });
}
