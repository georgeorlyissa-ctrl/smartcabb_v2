// TEST GEOCODING - DEBUG
// Copiez ce code dans la console du navigateur pour tester le geocoding

async function testGeocoding() {
  const lat = -4.403844;
  const lng = 15.285843;
  
  console.log('🧪 Test geocoding...');
  console.log('Coordonnées:', lat, lng);
  
  const projectId = 'lxspgbmftjldgvxumdlp';
  const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/nominatim/reverse?lat=${lat}&lng=${lng}`;
  
  console.log('🌐 URL:', url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    
    const text = await response.text();
    console.log('📄 Response text:', text);
    
    try {
      const data = JSON.parse(text);
      console.log('✅ Response JSON:', data);
      
      if (data.address) {
        console.log('✅ ADRESSE TROUVÉE:', data.address);
      } else {
        console.log('❌ Pas d\'adresse dans la réponse');
      }
    } catch (e) {
      console.error('❌ Erreur parsing JSON:', e);
    }
    
  } catch (error) {
    console.error('❌ Erreur fetch:', error);
  }
}

// Lancer le test
testGeocoding();
