/**
 * 🗑️ SCRIPT DE RÉINITIALISATION DE LA BASE DE DONNÉES
 * 
 * Script Node.js pour vider la base de données SmartCabb
 * 
 * Usage:
 *   node scripts/reset-database.js --all          # Tout réinitialiser
 *   node scripts/reset-database.js --users        # Utilisateurs uniquement
 *   node scripts/reset-database.js --rides        # Courses uniquement
 *   node scripts/reset-database.js --stats        # Afficher les statistiques
 * 
 * @version 1.0.0
 * @date 2026-02-05
 */

// ⚠️ Configuration - À adapter selon votre environnement
const CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://zaerjqchzqmcxqblkfkg.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphZXJqcWNoenFtY3hxYmxrZmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNDMyOTgsImV4cCI6MjA3NTcxOTI5OH0.qwFRKsi9Gw4VVYoEGBBCIj0-lAZOxtqlGQ0eT6cPhik'
};

const API_BASE = `${CONFIG.SUPABASE_URL}/functions/v1/make-server-2eb02e52/reset`;

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Afficher les statistiques
async function showStats() {
  try {
    log('\n📊 Chargement des statistiques...', 'cyan');
    
    const response = await fetch(`${API_BASE}/database-stats`, {
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const stats = await response.json();
    
    log('\n═══════════════════════════════════════', 'bright');
    log('  📊 STATISTIQUES DE LA BASE DE DONNÉES', 'bright');
    log('═══════════════════════════════════════', 'bright');
    
    log(`\n  Total d'enregistrements: ${stats.totalRecords}`, 'yellow');
    log(`  Clés KV Store: ${stats.kvKeys}`, 'yellow');
    
    log('\n  Détail par table:', 'cyan');
    stats.tables.forEach(table => {
      const count = table.count.toString().padStart(6, ' ');
      const name = table.name.padEnd(20, ' ');
      const color = table.count > 0 ? 'green' : 'reset';
      log(`    ${name} ${count}`, color);
    });
    
    log('\n═══════════════════════════════════════\n', 'bright');
    
  } catch (error) {
    log(`\n❌ Erreur: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

// Demander confirmation
async function askConfirmation(message) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question(`${colors.yellow}${message} (oui/non): ${colors.reset}`, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'yes');
    });
  });
}

// Réinitialiser la base de données
async function resetDatabase(type) {
  try {
    const endpoints = {
      'all': 'reset-all',
      'users': 'reset-users-only',
      'rides': 'reset-rides-only'
    };

    const endpoint = endpoints[type];
    if (!endpoint) {
      throw new Error(`Type invalide: ${type}`);
    }

    const messages = {
      'all': '🗑️ TOUT RÉINITIALISER (users, courses, paramètres, KV store)',
      'users': '🗑️ SUPPRIMER TOUS LES UTILISATEURS (garde les paramètres)',
      'rides': '🗑️ SUPPRIMER TOUTES LES COURSES (garde users et paramètres)'
    };

    log('\n═══════════════════════════════════════', 'bright');
    log(`  ${messages[type]}`, 'red');
    log('═══════════════════════════════════════', 'bright');
    log('\n⚠️  ATTENTION: Cette action est IRRÉVERSIBLE !', 'yellow');
    
    const confirmed = await askConfirmation('\nÊtes-vous absolument sûr ?');
    
    if (!confirmed) {
      log('\n✋ Opération annulée.\n', 'yellow');
      return;
    }

    log('\n🚀 Réinitialisation en cours...', 'cyan');
    
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      log('\n✅ RÉINITIALISATION RÉUSSIE !\n', 'green');
      log(`   Tables vidées: ${result.summary.tablesCleared}`, 'green');
      log(`   Lignes supprimées: ${result.summary.totalDeleted}`, 'green');
      if (result.summary.kvKeysDeleted) {
        log(`   Clés KV supprimées: ${result.summary.kvKeysDeleted}`, 'green');
      }
      
      if (result.cleared && result.cleared.length > 0) {
        log('\n   Détail:', 'cyan');
        result.cleared.forEach(item => {
          log(`     - ${item.table}: ${item.deletedRows} lignes`, 'cyan');
        });
      }
      
      if (result.errors && result.errors.length > 0) {
        log('\n   ⚠️  Erreurs:', 'yellow');
        result.errors.forEach(err => {
          log(`     - ${err.table}: ${err.error}`, 'yellow');
        });
      }
      
      log('');
    } else {
      log('\n❌ ÉCHEC DE LA RÉINITIALISATION\n', 'red');
      if (result.errors) {
        result.errors.forEach(err => {
          log(`   - ${err.table}: ${err.error}`, 'red');
        });
      }
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ Erreur: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

// Afficher l'aide
function showHelp() {
  log('\n═══════════════════════════════════════', 'bright');
  log('  🗑️  SCRIPT DE RÉINITIALISATION DB', 'bright');
  log('═══════════════════════════════════════', 'bright');
  log('\nUsage:', 'cyan');
  log('  node scripts/reset-database.js [option]\n');
  log('Options:', 'cyan');
  log('  --all      Réinitialiser TOUT (users, courses, paramètres, KV)');
  log('  --users    Supprimer tous les utilisateurs (garde paramètres)');
  log('  --rides    Supprimer toutes les courses (garde users et paramètres)');
  log('  --stats    Afficher les statistiques de la base de données');
  log('  --help     Afficher cette aide\n');
  log('Exemples:', 'cyan');
  log('  node scripts/reset-database.js --stats');
  log('  node scripts/reset-database.js --rides');
  log('  node scripts/reset-database.js --all\n');
}

// Point d'entrée principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--stats')) {
    await showStats();
    return;
  }

  if (args.includes('--all')) {
    await resetDatabase('all');
    return;
  }

  if (args.includes('--users')) {
    await resetDatabase('users');
    return;
  }

  if (args.includes('--rides')) {
    await resetDatabase('rides');
    return;
  }

  log('\n❌ Option invalide. Utilisez --help pour voir les options disponibles.\n', 'red');
}

// Exécuter
main().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}\n`, 'red');
  process.exit(1);
});
