import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.ts";

const app = new Hono();

/**
 * ✅ GET /passengers/:userId/favorites - Récupérer les lieux favoris d'un passager
 */
app.get("/:userId/favorites", async (c) => {
  try {
    const userId = c.req.param("userId");
    
    console.log(`🌟 Récupération des favoris pour le passager ${userId}...`);

    // Récupérer les favoris depuis le KV store
    const favorites = await kv.get(`favorites:${userId}`);
    
    if (!favorites || !Array.isArray(favorites)) {
      console.log(`⚠️ Aucun favori trouvé pour ${userId}`);
      return c.json({
        success: true,
        favorites: []
      });
    }

    console.log(`✅ ${favorites.length} favoris trouvés pour ${userId}`);

    return c.json({
      success: true,
      favorites: favorites
    });

  } catch (error) {
    console.error("❌ Erreur récupération favoris:", error);
    return c.json({ 
      success: false, 
      error: "Erreur serveur lors de la récupération des favoris",
      favorites: []
    }, 500);
  }
});

/**
 * ✅ POST /passengers/:userId/favorites - Ajouter un lieu favori
 */
app.post("/:userId/favorites", async (c) => {
  try {
    const userId = c.req.param("userId");
    const body = await c.req.json();
    
    console.log(`🌟 Ajout d'un favori pour le passager ${userId}:`, body);

    // Validation
    if (!body.name || !body.address) {
      return c.json({
        success: false,
        error: "Nom et adresse requis"
      }, 400);
    }

    // Récupérer les favoris existants
    let favorites = await kv.get(`favorites:${userId}`) || [];
    if (!Array.isArray(favorites)) {
      favorites = [];
    }

    // Créer le nouveau favori
    const newFavorite = {
      id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      name: body.name,
      address: body.address,
      lat: body.lat || -4.3276,
      lng: body.lng || 15.3136,
      icon: body.icon || 'home',
      created_at: new Date().toISOString()
    };

    // Ajouter au début de la liste
    favorites.unshift(newFavorite);

    // Sauvegarder dans le KV store
    await kv.set(`favorites:${userId}`, favorites);

    console.log(`✅ Favori ajouté avec succès:`, newFavorite.id);

    return c.json({
      success: true,
      favorite: newFavorite
    });

  } catch (error) {
    console.error("❌ Erreur ajout favori:", error);
    return c.json({ 
      success: false, 
      error: "Erreur serveur lors de l'ajout du favori" 
    }, 500);
  }
});

/**
 * ✅ PUT /passengers/:userId/favorites/:favoriteId - Modifier un lieu favori
 */
app.put("/:userId/favorites/:favoriteId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const favoriteId = c.req.param("favoriteId");
    const body = await c.req.json();
    
    console.log(`🌟 Modification du favori ${favoriteId} pour ${userId}:`, body);

    // Récupérer les favoris existants
    let favorites = await kv.get(`favorites:${userId}`) || [];
    if (!Array.isArray(favorites)) {
      return c.json({
        success: false,
        error: "Aucun favori trouvé"
      }, 404);
    }

    // Trouver et mettre à jour le favori
    const index = favorites.findIndex(f => f.id === favoriteId);
    if (index === -1) {
      return c.json({
        success: false,
        error: "Favori introuvable"
      }, 404);
    }

    favorites[index] = {
      ...favorites[index],
      name: body.name || favorites[index].name,
      address: body.address || favorites[index].address,
      lat: body.lat || favorites[index].lat,
      lng: body.lng || favorites[index].lng,
      icon: body.icon || favorites[index].icon
    };

    // Sauvegarder
    await kv.set(`favorites:${userId}`, favorites);

    console.log(`✅ Favori ${favoriteId} mis à jour avec succès`);

    return c.json({
      success: true,
      favorite: favorites[index]
    });

  } catch (error) {
    console.error("❌ Erreur modification favori:", error);
    return c.json({ 
      success: false, 
      error: "Erreur serveur lors de la modification du favori" 
    }, 500);
  }
});

/**
 * ✅ DELETE /passengers/:userId/favorites/:favoriteId - Supprimer un lieu favori
 */
app.delete("/:userId/favorites/:favoriteId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const favoriteId = c.req.param("favoriteId");
    
    console.log(`🌟 Suppression du favori ${favoriteId} pour ${userId}`);

    // Récupérer les favoris existants
    let favorites = await kv.get(`favorites:${userId}`) || [];
    if (!Array.isArray(favorites)) {
      return c.json({
        success: false,
        error: "Aucun favori trouvé"
      }, 404);
    }

    // Filtrer pour retirer le favori
    const newFavorites = favorites.filter(f => f.id !== favoriteId);

    if (newFavorites.length === favorites.length) {
      return c.json({
        success: false,
        error: "Favori introuvable"
      }, 404);
    }

    // Sauvegarder
    await kv.set(`favorites:${userId}`, newFavorites);

    console.log(`✅ Favori ${favoriteId} supprimé avec succès`);

    return c.json({
      success: true
    });

  } catch (error) {
    console.error("❌ Erreur suppression favori:", error);
    return c.json({ 
      success: false, 
      error: "Erreur serveur lors de la suppression du favori" 
    }, 500);
  }
});

export default app;
