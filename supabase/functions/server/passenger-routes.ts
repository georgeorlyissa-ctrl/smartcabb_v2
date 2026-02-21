import { Hono } from "npm:hono";
import * as kv from "./kv-wrapper.tsx";
import { isValidUUID } from "./uuid-validator.ts";

const app = new Hono();

// ============================================
// 🌟 GESTION DES LIEUX FAVORIS
// ============================================
// ⚠️ IMPORTANT: Ces routes doivent être AVANT /:id pour éviter les conflits

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

// ============================================
// 📊 RÉCUPÉRER LES STATISTIQUES D'UN PASSAGER
// ============================================
app.get('/:id/stats', async (c) => {
  try {
    const passengerId = c.req.param('id');
    console.log(`📊 Récupération des stats du passager ${passengerId}...`);

    // Récupérer toutes les courses depuis le KV store
    const allRides = await kv.getByPrefix('ride_request_');
    
    if (!allRides || allRides.length === 0) {
      console.log('⚠️ Aucune course trouvée dans le système');
      return c.json({
        success: true,
        stats: {
          totalRides: 0,
          completedRides: 0,
          totalSpent: 0
        }
      });
    }

    // 🔍 v517.91: LOG DÉTAILLÉ pour débogage
    console.log(`🔍 Recherche courses pour passengerId: \"${passengerId}\"`);
    console.log(`🔍 Total courses dans le système: ${allRides.length}`);
    
    // Examiner les passengerIds uniques
    const uniquePassengerIds = [...new Set(allRides.map((r: any) => r.passengerId))];
    console.log(`🔍 PassengerIds uniques trouvés:`, uniquePassengerIds);
    
    // Filtrer les courses du passager qui sont complétées
    const passengerRides = allRides.filter((ride: any) => {
      const matches = ride.passengerId === passengerId && ride.status === 'completed';
      if (ride.passengerId === passengerId) {
        console.log(`🔍 Course ${ride.id}: passengerId match, status=${ride.status}, included=${matches}`);
      }
      return matches;
    });

    // Calculer le total dépensé
    const totalSpent = passengerRides.reduce((sum: number, ride: any) => 
      sum + (ride.finalPrice || 0), 0
    );

    console.log(`✅ Stats calculées:`, {
      passengerId,
      totalRides: passengerRides.length,
      completedRides: passengerRides.length,
      totalSpent,
      coursesExaminées: allRides.length
    });

    return c.json({
      success: true,
      stats: {
        totalRides: passengerRides.length,
        completedRides: passengerRides.length,
        totalSpent: totalSpent
      }
    });

  } catch (error) {
    console.error('❌ Erreur get-stats passager:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error),
      stats: {
        totalRides: 0,
        completedRides: 0,
        totalSpent: 0
      }
    }, 500);
  }
});

/**
 * 🧑 GET /passengers/:id - Récupérer les informations d'un passager
 * Gestion intelligente : Support UUID ET custom ID ET téléphone
 */
app.get("/:id", async (c) => {
  try {
    const passengerId = c.req.param("id");
    
    if (!passengerId) {
      return c.json({ 
        success: false, 
        error: "ID passager requis" 
      }, 400);
    }

    console.log("🔍 Récupération informations passager:", passengerId);

    // 🔧 FIX: D'abord, essayer de récupérer depuis le KV store par ID
    let passengerFromKV = await kv.get(`passenger:${passengerId}`);
    
    // Si pas trouvé par ID, essayer par téléphone (si le passengerId ressemble à un téléphone)
    if (!passengerFromKV && /^[0-9+\s\-()]+$/.test(passengerId)) {
      console.log("📱 ID ressemble à un téléphone, recherche par téléphone...");
      const allPassengers = await kv.getByPrefix('passenger:');
      passengerFromKV = allPassengers.find((p: any) => p && p.phone === passengerId);
      
      if (passengerFromKV) {
        console.log("✅ Passager trouvé par téléphone:", passengerFromKV.id);
      }
    }
    
    // Si pas trouvé par ID, essayer avec le préfixe user:
    if (!passengerFromKV) {
      passengerFromKV = await kv.get(`user:${passengerId}`);
      if (passengerFromKV) {
        console.log("✅ Passager trouvé avec préfixe user:");
      }
    }
    
    if (passengerFromKV) {
      console.log("✅ Passager trouvé dans KV store:", passengerFromKV);
      return c.json({
        success: true,
        passenger: passengerFromKV
      });
    }

    console.log("⚠️ Passager non trouvé dans KV, tentative Supabase Auth...");

    // 🔧 FIX: Vérifier si l'ID est un UUID valide avant d'appeler getUserById
    if (!isValidUUID(passengerId)) {
      console.error("❌ ID invalide: pas un UUID, pas un téléphone et pas trouvé dans KV store");
      return c.json({ 
        success: false, 
        error: "Passager introuvable" 
      }, 404);
    }

    // 🔍 1. Vérifier si le passager existe dans Supabase Auth (seulement si UUID valide)
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(passengerId);
    
    if (authError || !authUser.user) {
      console.error("❌ Utilisateur introuvable dans Supabase Auth:", authError);
      return c.json({ 
        success: false, 
        error: "Utilisateur introuvable dans le système d'authentification" 
      }, 404);
    }

    console.log("✅ Utilisateur trouvé dans Supabase Auth:", authUser.user.email);

    // 🔍 2. Vérifier si le profil existe dans la table profiles
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', passengerId)
      .single();

    // 🆕 3. Si le profil n'existe pas dans la table profiles, le créer automatiquement
    if (profileError && profileError.code === 'PGRST116') {
      console.log("⚠️ Profil introuvable dans la table profiles, création automatique...");
      
      const newProfile = {
        id: passengerId,
        full_name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'Utilisateur',
        email: authUser.user.email || `user-${passengerId}@smartcabb.local`,
        phone: authUser.user.user_metadata?.phone || authUser.user.phone || '',
        role: 'passenger',
        created_at: new Date().toISOString()
      };

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (createError) {
        console.error("❌ Erreur création profil automatique:", createError);
        return c.json({ 
          success: false, 
          error: "Impossible de créer le profil automatiquement" 
        }, 500);
      }

      console.log("✅ Profil passager créé automatiquement:", createdProfile);
    } else if (profileError) {
      console.error("❌ Erreur récupération profil:", profileError);
      return c.json({ 
        success: false, 
        error: "Erreur lors de la récupération du profil" 
      }, 500);
    } else {
      console.log("✅ Profil trouvé dans la table profiles:", existingProfile);
    }

    // 🔍 4. Récupérer les informations du passager depuis le KV store
    const passenger = await kv.get(`user:${passengerId}`);
    
    if (!passenger) {
      console.warn("⚠️ Passager non trouvé dans le KV store (normal pour un nouveau compte)");
      
      // Créer un profil de base dans le KV store
      const basicProfile = {
        id: passengerId,
        name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'Utilisateur',
        full_name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'Utilisateur',
        email: authUser.user.email || `user-${passengerId}@smartcabb.local`,
        phone: authUser.user.user_metadata?.phone || authUser.user.phone || '',
        role: 'passenger',
        created_at: new Date().toISOString(),
        total_rides: 0,
        balance: 0,
        rating: 5.0,
        favorite_payment_method: 'cash'
      };
      
      await kv.set(`user:${passengerId}`, basicProfile);
      console.log("✅ Profil de base créé dans le KV store");
      
      return c.json({
        success: true,
        passenger: {
          id: passengerId,
          name: basicProfile.name,
          full_name: basicProfile.full_name,
          phone: basicProfile.phone,
          email: basicProfile.email,
          address: "",
          total_rides: 0,
          totalRides: 0,
          created_at: basicProfile.created_at,
          registeredAt: basicProfile.created_at,
          favorite_payment_method: "cash",
          favoritePaymentMethod: "cash",
          balance: 0,
          rating: 5.0
        }
      });
    }

    console.log("✅ Passager trouvé dans le KV store:", passenger);

    return c.json({
      success: true,
      passenger: {
        id: passengerId,
        name: passenger.name || passenger.full_name || "Passager",
        full_name: passenger.full_name || passenger.name || "Passager",
        phone: passenger.phone || "",
        email: passenger.email || "",
        address: passenger.address || "",
        total_rides: passenger.total_rides || passenger.totalRides || 0,
        totalRides: passenger.total_rides || passenger.totalRides || 0,
        created_at: passenger.created_at || passenger.createdAt || new Date().toISOString(),
        registeredAt: passenger.created_at || passenger.createdAt || new Date().toISOString(),
        favorite_payment_method: passenger.favorite_payment_method || passenger.favoritePaymentMethod || "cash",
        favoritePaymentMethod: passenger.favorite_payment_method || passenger.favoritePaymentMethod || "cash",
        balance: passenger.balance || 0,
        rating: passenger.rating || 5.0
      }
    });

  } catch (error) {
    console.error("❌ Erreur récupération passager:", error);
    return c.json({ 
      success: false, 
      error: "Erreur serveur lors de la récupération des données" 
    }, 500);
  }
});

/**
 * 🔥 PUT /passengers/update/:id - Mettre à jour les informations d'un passager
 */
app.put("/update/:id", async (c) => {
  try {
    const passengerId = c.req.param("id");
    const body = await c.req.json();
    
    console.log("🔥🔥🔥 ========== DÉBUT UPDATE PASSAGER ==========");
    console.log("💾 ID:", passengerId);
    console.log("💾 Nouvelles données:", JSON.stringify(body, null, 2));

    if (!passengerId) {
      return c.json({ 
        success: false, 
        error: "ID passager requis" 
      }, 400);
    }

    // 🔥 NORMALISER LE TÉLÉPHONE avant de sauvegarder
    let normalizedPhone = body.phone;
    if (body.phone) {
      // Fonction de normalisation (même logique que le frontend)
      const normalizePhone = (phone: string): string => {
        const cleaned = phone.replace(/[\s\-+]/g, '');
        
        // Cas 1: 9 chiffres → 243XXXXXXXXX
        if (cleaned.length === 9) {
          return `243${cleaned}`;
        }
        
        // Cas 2: 10 chiffres avec 0 → 243XXXXXXXXX (enlever le 0)
        if (cleaned.length === 10 && cleaned.startsWith('0')) {
          return `243${cleaned.substring(1)}`;
        }
        
        // Cas 3: 12 chiffres avec 243 → 243XXXXXXXXX
        if (cleaned.length === 12 && cleaned.startsWith('243')) {
          return cleaned;
        }
        
        // Cas 4: 13 chiffres avec 2430 → 243XXXXXXXXX (enlever le 0 après 243)
        if (cleaned.length === 13 && cleaned.startsWith('2430')) {
          return `243${cleaned.substring(4)}`;
        }
        
        // Si aucun cas ne correspond, retourner tel quel
        return phone;
      };
      
      normalizedPhone = normalizePhone(body.phone);
      console.log(`📱 Téléphone normalisé: ${body.phone} → ${normalizedPhone}`);
    }

    // Récupérer les données existantes depuis TOUTES les clés possibles
    let existingPassenger = await kv.get(`user:${passengerId}`);
    const existingProfile = await kv.get(`profile:${passengerId}`);
    const existingPassengerKey = await kv.get(`passenger:${passengerId}`);
    
    console.log("📖 Données existantes:");
    console.log("  - user:", existingPassenger ? "✅" : "❌");
    console.log("  - profile:", existingProfile ? "✅" : "❌");
    console.log("  - passenger:", existingPassengerKey ? "✅" : "❌");
    
    // 🔥 Si l'utilisateur n'existe pas, le créer
    if (!existingPassenger) {
      console.log("⚠️ Passager non trouvé, création d'un nouveau profil...");
      existingPassenger = {
        id: passengerId,
        name: body.name || "Utilisateur",
        full_name: body.name || "Utilisateur",
        email: body.email || "",
        phone: normalizedPhone || "",
        address: body.address || "",
        role: "passenger",
        created_at: new Date().toISOString(),
        total_rides: 0,
        balance: 0,
        rating: 5.0,
        favorite_payment_method: "cash"
      };
    }

    // Mettre à jour les champs
    const updatedPassenger = {
      ...existingPassenger,
      name: body.name || existingPassenger.name,
      full_name: body.name || existingPassenger.full_name,
      email: body.email || existingPassenger.email,
      phone: normalizedPhone || existingPassenger.phone,
      address: body.address !== undefined ? body.address : existingPassenger.address,
      updated_at: new Date().toISOString()
    };

    console.log("🔄 Passager mis à jour:", JSON.stringify(updatedPassenger, null, 2));

    // 🔥 MISE À JOUR DANS TOUTES LES CLÉS DU KV STORE
    // 1. Sauvegarder dans user:
    await kv.set(`user:${passengerId}`, updatedPassenger);
    console.log("✅ 1/5 - user: mis à jour");
    
    // 2. Sauvegarder dans profile: (si existe)
    if (existingProfile) {
      const updatedProfile = {
        ...existingProfile,
        full_name: body.name || existingProfile.full_name,
        email: body.email || existingProfile.email,
        phone: normalizedPhone || existingProfile.phone,
        address: body.address !== undefined ? body.address : existingProfile.address,
        updated_at: new Date().toISOString()
      };
      await kv.set(`profile:${passengerId}`, updatedProfile);
      console.log("✅ 2/5 - profile: mis à jour");
    } else {
      console.log("⏭️ 2/5 - profile: n'existe pas, ignoré");
    }
    
    // 3. Sauvegarder dans passenger: (si existe)
    if (existingPassengerKey) {
      const updatedPassengerKey = {
        ...existingPassengerKey,
        name: body.name || existingPassengerKey.name,
        full_name: body.name || existingPassengerKey.full_name,
        email: body.email || existingPassengerKey.email,
        phone: normalizedPhone || existingPassengerKey.phone,
        address: body.address !== undefined ? body.address : existingPassengerKey.address,
        updated_at: new Date().toISOString()
      };
      await kv.set(`passenger:${passengerId}`, updatedPassengerKey);
      console.log("✅ 3/5 - passenger: mis à jour");
    } else {
      console.log("⏭️ 3/5 - passenger: n'existe pas, ignoré");
    }

    // 4. 🔥 METTRE À JOUR SUPABASE AUTH si l'email a changé OU si le téléphone a changé
    console.log("🔥 4/5 - Mise à jour Supabase Auth...");
    try {
      const { createClient } = await import('npm:@supabase/supabase-js@2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      let authUpdated = false;
      
      // 🔥 CAS 1: L'email a changé (email réel, pas généré)
      if (body.email && existingPassenger.email !== body.email) {
        console.log(`📧 Email changé: ${existingPassenger.email} → ${body.email}`);
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          passengerId,
          { email: body.email }
        );
        
        if (updateError) {
          console.error("⚠️ Erreur mise à jour email Supabase Auth:", updateError);
        } else {
          console.log("✅ Supabase Auth: email mis à jour");
          authUpdated = true;
        }
      }
      
      // 🔥 CAS 2: Le téléphone a changé
      // ⚠️ CORRECTION CRITIQUE : NE PAS MODIFIER L'EMAIL DANS SUPABASE AUTH
      // L'email dans Auth sert uniquement pour l'authentification et doit rester stable
      // On met seulement à jour les user_metadata pour garder la trace du nouveau téléphone
      if (normalizedPhone && existingPassenger.phone !== normalizedPhone) {
        console.log(`📱 Téléphone changé: ${existingPassenger.phone} → ${normalizedPhone}`);
        console.log(`🔄 Mise à jour des user_metadata uniquement (sans changer l'email Auth)...`);
        
        const { error: updatePhoneError } = await supabase.auth.admin.updateUserById(
          passengerId,
          { 
            user_metadata: {
              phone: normalizedPhone
            }
          }
        );
        
        if (updatePhoneError) {
          console.error("⚠️ Erreur mise à jour téléphone dans Supabase Auth:", updatePhoneError);
        } else {
          console.log("✅ Supabase Auth: user_metadata.phone mis à jour (email Auth inchangé)");
          authUpdated = true;
        }
      }
      
      if (!authUpdated) {
        console.log("⏭️ 4/5 - Supabase Auth: aucun changement, ignoré");
      } else {
        console.log("✅ 4/5 - Supabase Auth: mis à jour avec succès!");
      }
    } catch (error) {
      console.error("⚠️ Erreur Supabase Auth:", error);
    }

    // 5. 🔥🔥🔥 METTRE À JOUR LA TABLE PROFILES (CRITIQUE POUR LA CONNEXION)
    console.log("🔥 5/5 - Mise à jour table profiles...");
    try {
      const { createClient } = await import('npm:@supabase/supabase-js@2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // 📖 D'abord, lire les données actuelles
      const { data: currentProfileData, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', passengerId)
        .single();
      
      if (selectError) {
        console.error("❌ Erreur lecture table profiles:", selectError);
        console.error("   Code:", selectError.code);
        console.error("   Message:", selectError.message);
        console.error("   Details:", selectError.details);
        console.log("⏭️ 5/5 - Table profiles: erreur de lecture, mise à jour ignorée pour éviter les conflits");
        // ⚠️ NE PAS continuer si on ne peut pas lire les données actuelles
      } else if (!currentProfileData) {
        console.error("❌ currentProfileData est null/undefined");
        console.log("⏭️ 5/5 - Table profiles: données actuelles introuvables, mise à jour ignorée");
      } else {
        console.log("📖 Données actuelles dans profiles:", JSON.stringify(currentProfileData, null, 2));
        
        const updateData: any = {};
        
        // ✅ Ne mettre à jour QUE les champs qui ont changé
        if (body.name && body.name !== currentProfileData.full_name) {
          updateData.full_name = body.name;
          console.log(`   → full_name: "${currentProfileData.full_name}" → "${body.name}"`);
        }
        
        if (body.email && body.email !== currentProfileData.email) {
          updateData.email = body.email;
          console.log(`   → email: "${currentProfileData.email}" → "${body.email}"`);
        }
        
        if (normalizedPhone && normalizedPhone !== currentProfileData.phone) {
          updateData.phone = normalizedPhone;
          console.log(`   → phone: "${currentProfileData.phone}" → "${normalizedPhone}"`);
        }
        
        // ✅ Seulement si on a des changements
        if (Object.keys(updateData).length === 0) {
          console.log("⏭️ 5/5 - Table profiles: aucun changement détecté, ignoré");
        } else {
          console.log("🔄 updateData à envoyer:", JSON.stringify(updateData, null, 2));
          
          const { data: updatedData, error: profileError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', passengerId)
            .select();
          
          if (profileError) {
            console.error("❌ Erreur mise à jour table profiles:", profileError);
            console.error("   Code:", profileError.code);
            console.error("   Message:", profileError.message);
            console.error("   Details:", profileError.details);
          } else {
            console.log("✅ 5/5 - Table profiles mise à jour avec succès !");
            console.log("✅ Nouvelles données:", JSON.stringify(updatedData, null, 2));
          }
        }
      }
    } catch (error) {
      console.error("❌ Exception table profiles:", error);
      console.error("   Stack:", error instanceof Error ? error.stack : 'N/A');
    }

    console.log("🔥🔥🔥 ========== FIN UPDATE PASSAGER (SUCCÈS) ==========");

    return c.json({
      success: true,
      passenger: updatedPassenger
    });

  } catch (error) {
    console.error("🔥🔥🔥 ========== FIN UPDATE PASSAGER (ERREUR) ==========");
    console.error("❌ Erreur mise à jour passager:", error);
    console.error("❌ Stack:", error instanceof Error ? error.stack : 'N/A');
    return c.json({ 
      success: false, 
      error: "Erreur serveur lors de la mise à jour: " + String(error)
    }, 500);
  }
});

export default app;