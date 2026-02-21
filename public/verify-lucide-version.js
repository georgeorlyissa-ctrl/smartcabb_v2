/**
 * 🔍 SCRIPT DE VÉRIFICATION - Version Lucide React
 * 
 * À exécuter dans la console du navigateur pour vérifier
 * quelle version de lucide-react est réellement chargée.
 */

(function() {
  console.log('🔍 Vérification de la version lucide-react...');
  
  // Méthode 1: Vérifier dans les modules chargés
  try {
    const scripts = Array.from(document.querySelectorAll('script[src*="lucide"]'));
    scripts.forEach(script => {
      console.log('📦 Script lucide trouvé:', script.src);
    });
    
    if (scripts.length === 0) {
      console.log('ℹ️ Aucun script lucide trouvé (peut-être bundlé)');
    }
  } catch (e) {
    console.error('❌ Erreur vérification scripts:', e);
  }
  
  // Méthode 2: Vérifier les imports
  try {
    const importMap = document.querySelector('script[type="importmap"]');
    if (importMap) {
      const map = JSON.parse(importMap.textContent);
      console.log('✅ Import Map détecté:');
      console.log(map);
      
      if (map.imports['lucide-react']) {
        const version = map.imports['lucide-react'].match(/@([\d.]+)/);
        if (version) {
          console.log(`✅ Version configurée dans Import Map: ${version[1]}`);
          
          if (version[1] === '0.263.1') {
            console.log('✅✅✅ SUCCÈS ! Version 0.263.1 correctement configurée !');
          } else {
            console.warn(`⚠️ Version incorrecte: ${version[1]} (attendu: 0.263.1)`);
          }
        }
      }
    } else {
      console.warn('⚠️ Aucun Import Map trouvé');
    }
  } catch (e) {
    console.error('❌ Erreur vérification import map:', e);
  }
  
  // Méthode 3: Vérifier package.json (si disponible)
  console.log('ℹ️ Pour vérifier le build Vite, voir les logs de build Vercel');
  
  console.log('✅ Vérification terminée !');
})();
