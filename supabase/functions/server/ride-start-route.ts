import { Hono } from "npm:hono@4";
import * as kv from "./kv-wrapper.tsx";

const app = new Hono();

// ============================================
// DÉMARRER UNE COURSE (CONDUCTEUR - après vérification code)
// ============================================
app.post('/start', async (c) => {
  try {
    const body = await c.req.json();
    const { rideId, driverId, confirmationCode } = body;

    console.log('🚀 Démarrage de course:', { rideId, driverId, confirmationCode });

    // Validation
    if (!rideId || !driverId || !confirmationCode) {
      return c.json({ 
        success: false, 
        error: 'Données manquantes (rideId, driverId, confirmationCode requis)' 
      }, 400);
    }

    // Récupérer la course
    const ride = await kv.get(`ride_request_${rideId}`);
    
    if (!ride) {
      console.error('❌ Course introuvable:', rideId);
      return c.json({ 
        success: false, 
        error: 'Course introuvable' 
      }, 404);
    }

    // Vérifier que la course est bien acceptée
    if (ride.status !== 'accepted') {
      return c.json({ 
        success: false, 
        error: `Statut invalide: ${ride.status}. La course doit être acceptée avant de démarrer.` 
      }, 400);
    }

    // Vérifier que le conducteur correspond
    if (ride.driverId !== driverId) {
      return c.json({ 
        success: false, 
        error: 'Vous n\'êtes pas le conducteur assigné à cette course' 
      }, 403);
    }

    // Vérifier le code de confirmation
    if (ride.confirmationCode !== confirmationCode) {
      console.error('❌ Code incorrect:', { expected: ride.confirmationCode, received: confirmationCode });
      return c.json({ 
        success: false, 
        error: 'Code de confirmation incorrect' 
      }, 400);
    }

    // Mettre à jour le statut de la course
    const startedRide = {
      ...ride,
      status: 'in_progress',
      startedAt: new Date().toISOString()
    };

    await kv.set(`ride_request_${rideId}`, startedRide);

    console.log('✅ Course démarrée avec succès:', rideId);

    return c.json({
      success: true,
      ride: startedRide,
      message: 'Course démarrée avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur démarrage course:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur serveur' 
    }, 500);
  }
});

export default app;
