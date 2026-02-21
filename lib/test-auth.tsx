/**
 * 🧪 TEST DES SERVICES D'AUTHENTIFICATION
 * 
 * Script de test pour vérifier que les services auth fonctionnent
 */

console.log('🧪 Test des services d\'authentification...\n');

// Test 1: Import du service
try {
  console.log('1️⃣ Test import authService...');
  const authServiceModule = await import('./auth-service.tsx');
  const authService = authServiceModule.default || authServiceModule.authService;
  
  console.log('✅ authService importé:', !!authService);
  console.log('✅ signIn disponible:', typeof authService.signIn === 'function');
  console.log('✅ signUp disponible:', typeof authService.signUp === 'function');
  console.log('✅ createAdminUser disponible:', typeof authService.createAdminUser === 'function');
  console.log('✅ getSession disponible:', typeof authService.getSession === 'function');
  console.log('✅ signOut disponible:', typeof authService.signOut === 'function');
} catch (error) {
  console.error('❌ Erreur import authService:', error);
}

// Test 2: Import du service driver signup
try {
  console.log('\n2️⃣ Test import signUpDriver...');
  const driverModule = await import('./auth-service-driver-signup.tsx');
  const signUpDriver = driverModule.default || driverModule.signUpDriver;
  
  console.log('✅ signUpDriver importé:', typeof signUpDriver === 'function');
} catch (error) {
  console.error('❌ Erreur import signUpDriver:', error);
}

// Test 3: Import du client Supabase
try {
  console.log('\n3️⃣ Test import supabase client...');
  const supabaseModule = await import('./supabase.tsx');
  const supabase = supabaseModule.default || supabaseModule.supabase;
  
  console.log('✅ supabase client importé:', !!supabase);
  console.log('✅ supabase.auth disponible:', !!supabase?.auth);
  console.log('✅ supabase.auth.signIn disponible:', typeof supabase?.auth?.signInWithPassword === 'function');
} catch (error) {
  console.error('❌ Erreur import supabase:', error);
}

console.log('\n✅ Tests terminés !');
