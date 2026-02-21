import { Hono } from 'npm:hono';
import * as kv from './kv-wrapper.tsx';
import { createClient } from 'npm:@supabase/supabase-js@2';

const adminRoutes = new Hono();

// ============================================
// 📊 STATISTIQUES GLOBALES
// ============================================
adminRoutes.get('/stats/overview', async (c) => {
  try {
    console.log('📊 Récupération des statistiques globales COMPLÈTES...');

    // ✅ 1. RÉCUPÉRER TOUS LES PASSAGERS
    const allPassengers = await kv.getByPrefix('passenger:');
    const passengers = allPassengers.filter(p => p && p.id);
    console.log(`👥 ${passengers.length} passagers trouvés`);

    // ✅ 2. RÉCUPÉRER TOUS LES CONDUCTEURS
    const allDrivers = await kv.getByPrefix('driver:');
    const drivers = allDrivers.filter(d => d && d.id);
    const onlineDrivers = drivers.filter(d => d.is_available === true);
    console.log(`🚗 ${drivers.length} conducteurs trouvés (${onlineDrivers.length} en ligne)`);

    // ✅ 3. RÉCUPÉRER TOUTES LES COURSES COMPLÉTÉES
    const allCompletedRides = await kv.getByPrefix('ride_completed_');
    console.log(`🏁 ${allCompletedRides.length} courses complétées trouvées`);

    // ✅ 4. RÉCUPÉRER LES COURSES ACTIVES
    const allActiveRides = await kv.getByPrefix('ride_active_');
    const activeRides = allActiveRides.filter(r => r && r.id);
    console.log(`🚕 ${activeRides.length} courses actives`);

    // ✅ 5. CALCULER LES STATISTIQUES RÉELLES
    let totalRevenue = 0;
    let totalCommissions = 0;
    let totalDriverEarnings = 0;
    const ratingsList: number[] = [];
    const ridesByCategory: Record<string, number> = {
      smart_standard: 0,
      smart_confort: 0,
      smart_plus: 0,
      smart_business: 0
    };

    // Parcourir toutes les courses complétées pour calculer les stats
    for (const ride of allCompletedRides) {
      if (ride && ride.finalPrice) {
        totalRevenue += ride.finalPrice;
        totalCommissions += ride.commission || 0;
        totalDriverEarnings += ride.driverEarnings || 0;
        
        // Compter par catégorie
        const category = ride.vehicleType || ride.vehicle_category;
        if (category && ridesByCategory[category] !== undefined) {
          ridesByCategory[category] += 1;
        }
        
        // Collecter les notes
        if (ride.rating && typeof ride.rating === 'number') {
          ratingsList.push(ride.rating);
        }
      }
    }

    const averageRating = ratingsList.length > 0
      ? ratingsList.reduce((a, b) => a + b, 0) / ratingsList.length
      : 0;

    console.log(`💰 Revenus totaux: ${totalRevenue} CDF`);
    console.log(`⭐ Note moyenne: ${averageRating.toFixed(2)}`);

    // ✅ 6. STATISTIQUES DU JOUR (pour compatibilité)
    const today = new Date().toISOString().split('T')[0];
    const todayCompletedRides = allCompletedRides.filter(r => {
      if (!r.completedAt && !r.completed_at && !r.createdAt) return false;
      const rideDate = new Date(r.completedAt || r.completed_at || r.createdAt).toISOString().split('T')[0];
      return rideDate === today;
    });

    let todayRevenue = 0;
    let todayCommissions = 0;
    let todayDriverEarnings = 0;

    for (const ride of todayCompletedRides) {
      if (ride && ride.finalPrice) {
        todayRevenue += ride.finalPrice;
        todayCommissions += ride.commission || 0;
        todayDriverEarnings += ride.driverEarnings || 0;
      }
    }

    console.log(`📅 Aujourd'hui: ${todayCompletedRides.length} courses, ${todayRevenue} CDF`);

    // ✅ 7. RETOURNER TOUTES LES STATISTIQUES
    return c.json({
      success: true,
      stats: {
        today: {
          rides: todayCompletedRides.length,
          revenue: todayRevenue,
          commissions: todayCommissions,
          driverEarnings: todayDriverEarnings,
          activeDrivers: onlineDrivers.length,
          activePassengers: passengers.length, // Tous les passagers sont considérés actifs
          ridesByCategory: ridesByCategory
        },
        allTime: {
          totalRides: allCompletedRides.length,
          totalRevenue: totalRevenue,
          totalCommissions: totalCommissions,
          totalDriverEarnings: totalDriverEarnings,
          averageRating: averageRating,
          totalDrivers: drivers.length,
          totalPassengers: passengers.length,
          onlineDrivers: onlineDrivers.length,
          activeRides: activeRides.length,
          completedRides: allCompletedRides.length,
          ridesByCategory: ridesByCategory
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 📊 STATISTIQUES PAR PÉRIODE
// ============================================
adminRoutes.get('/stats/period/:days', async (c) => {
  try {
    const days = parseInt(c.req.param('days')) || 7;
    console.log(`📊 Récupération statistiques ${days} derniers jours...`);

    // Récupérer toutes les courses complétées
    const allCompletedRides = await kv.getByPrefix('ride_completed_');
    const allDrivers = await kv.getByPrefix('driver:');
    const allPassengers = await kv.getByPrefix('passenger:');

    // Créer un tableau de dates pour la période
    const now = new Date();
    const periodData: any[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Filtrer les courses de cette journée
      const dayRides = allCompletedRides.filter(ride => {
        if (!ride.completedAt && !ride.completed_at) return false;
        const rideDate = new Date(ride.completedAt || ride.completed_at).toISOString().split('T')[0];
        return rideDate === dateStr;
      });

      // Calculer les stats du jour
      const dayRevenue = dayRides.reduce((sum, ride) => sum + (ride.finalPrice || 0), 0);
      const dayCommissions = dayRides.reduce((sum, ride) => sum + (ride.commission || 0), 0);

      // Conducteurs actifs ce jour
      const activeDriversIds = new Set(dayRides.map(r => r.driverId).filter(Boolean));
      const activePassengersIds = new Set(dayRides.map(r => r.passengerId).filter(Boolean));

      periodData.push({
        date: dateStr,
        rides: dayRides.length,
        revenue: dayRevenue,
        commissions: dayCommissions,
        activeDrivers: activeDriversIds.size,
        activePassengers: activePassengersIds.size
      });
    }

    console.log(`✅ ${periodData.length} jours de données calculés`);

    return c.json({
      success: true,
      period: days,
      data: periodData
    });

  } catch (error) {
    console.error('❌ Erreur statistiques période:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 📊 STATISTIQUES PAR CATÉGORIE
// ============================================
adminRoutes.get('/stats/categories', async (c) => {
  try {
    console.log('📊 Récupération statistiques par catégorie...');

    // Récupérer toutes les courses complétées
    const allCompletedRides = await kv.getByPrefix('ride_completed_');

    // Grouper par catégorie
    const categories: Record<string, { rides: number; revenue: number }> = {
      smart_standard: { rides: 0, revenue: 0 },
      smart_confort: { rides: 0, revenue: 0 },
      smart_plus: { rides: 0, revenue: 0 },
      smart_business: { rides: 0, revenue: 0 }
    };

    for (const ride of allCompletedRides) {
      if (!ride || !ride.vehicleType) continue;

      // Normaliser le nom de la catégorie
      let category = ride.vehicleType.toLowerCase().replace(/\s+/g, '_');
      
      // Mapping des différents noms possibles
      if (category.includes('standard')) {
        category = 'smart_standard';
      } else if (category.includes('confort') || category.includes('comfort')) {
        category = 'smart_confort';
      } else if (category.includes('plus')) {
        category = 'smart_plus';
      } else if (category.includes('business')) {
        category = 'smart_business';
      }

      if (categories[category]) {
        categories[category].rides += 1;
        categories[category].revenue += ride.finalPrice || 0;
      }
    }

    console.log('✅ Statistiques par catégorie calculées:', categories);

    return c.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('❌ Erreur statistiques catégories:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🏆 LEADERBOARD DES CONDUCTEURS
// ============================================
adminRoutes.get('/drivers/leaderboard', async (c) => {
  try {
    console.log('🏆 Récupération leaderboard conducteurs...');

    // Récupérer tous les conducteurs
    const allDrivers = await kv.getByPrefix('driver:');
    const drivers = allDrivers.filter(d => d && d.id);

    // Récupérer toutes les courses complétées
    const allCompletedRides = await kv.getByPrefix('ride_completed_');

    // Calculer les statistiques de chaque conducteur
    const driverStats = drivers.map(driver => {
      const driverRides = allCompletedRides.filter(r => r.driverId === driver.id);
      
      const totalRides = driverRides.length;
      const totalEarnings = driverRides.reduce((sum, r) => sum + ((r.finalPrice || 0) - (r.commission || 0)), 0);
      const totalCommissions = driverRides.reduce((sum, r) => sum + (r.commission || 0), 0);
      
      const ratings = driverRides
        .filter(r => r.rating && typeof r.rating === 'number')
        .map(r => r.rating);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
        : 0;

      return {
        driverId: driver.id,
        driverName: driver.full_name || driver.name || 'Conducteur inconnu',
        driverPhone: driver.phone || 'N/A',
        totalRides,
        totalEarnings,
        totalCommissions,
        averageRating
      };
    });

    // Trier par nombre de courses (décroissant)
    const leaderboard = driverStats
      .filter(d => d.totalRides > 0) // Seulement les conducteurs avec des courses
      .sort((a, b) => b.totalRides - a.totalRides);

    console.log(`✅ Leaderboard calculé: ${leaderboard.length} conducteurs`);

    return c.json({
      success: true,
      total: leaderboard.length,
      leaderboard
    });

  } catch (error) {
    console.error('❌ Erreur leaderboard:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 💰 HISTORIQUE DES TRANSACTIONS
// ============================================
adminRoutes.get('/transactions', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '100');
    console.log(`💰 Récupération des ${limit} dernières transactions...`);

    const allTransactions = await kv.getByPrefix('transaction:');
    
    // Trier par date décroissante
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return dateB - dateA;
    });

    const transactions = allTransactions.slice(0, limit);

    return c.json({
      success: true,
      count: transactions.length,
      total: allTransactions.length,
      transactions: transactions
    });

  } catch (error) {
    console.error('❌ Erreur récupération transactions:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🚗 LISTE DES COURSES
// ============================================
adminRoutes.get('/rides', async (c) => {
  try {
    const status = c.req.query('status'); // pending, accepted, completed
    const limit = parseInt(c.req.query('limit') || '100');
    
    console.log(`🚗 Récupération des courses (status: ${status || 'all'}, limit: ${limit})...`);

    let rides = [];

    if (status === 'completed') {
      rides = await kv.getByPrefix('ride_completed_');
    } else if (status === 'active') {
      rides = await kv.getByPrefix('ride_active_');
    } else if (status === 'pending') {
      rides = await kv.getByPrefix('ride_pending_');
    } else {
      // Toutes les courses
      rides = await kv.getByPrefix('ride_request_');
    }

    // Trier par date décroissante
    rides.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const limitedRides = rides.slice(0, limit);

    return c.json({
      success: true,
      count: limitedRides.length,
      total: rides.length,
      rides: limitedRides
    });

  } catch (error) {
    console.error('❌ Erreur récupération courses:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 📱 STATISTIQUES D'UN CONDUCTEUR SPÉCIFIQUE
// ============================================
adminRoutes.get('/driver/:driverId/stats', async (c) => {
  try {
    const driverId = c.req.param('driverId');
    console.log(`📱 Récupération des stats du conducteur ${driverId}...`);

    // Récupérer les stats du conducteur
    const statsKey = `driver:${driverId}:stats`;
    const stats = await kv.get(statsKey) || {
      totalRides: 0,
      totalEarnings: 0,
      totalCommissions: 0,
      averageRating: 0,
      ratings: []
    };

    // Récupérer le solde
    const balanceKey = `driver:${driverId}:balance`;
    const balanceData = await kv.get(balanceKey) || { balance: 0 };
    const balance = typeof balanceData === 'number' ? balanceData : balanceData.balance;

    // Récupérer l'historique des transactions
    const allTransactions = await kv.getByPrefix('transaction:');
    const driverTransactions = allTransactions.filter(t => t && t.driverId === driverId);

    return c.json({
      success: true,
      driverId: driverId,
      stats: {
        ...stats,
        currentBalance: balance,
        transactionCount: driverTransactions.length
      },
      recentTransactions: driverTransactions.slice(0, 10)
    });

  } catch (error) {
    console.error('❌ Erreur récupération stats conducteur:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 💾 SAUVEGARDER LES PARAMÈTRES ADMIN (Commission, Taux, Codes promo, etc.)
// ============================================
adminRoutes.post('/settings/save', async (c) => {
  try {
    console.log('💾 Sauvegarde des paramètres admin...');
    
    const settings = await c.req.json();
    
    // Sauvegarder dans le KV store avec la clé 'admin_settings'
    await kv.set('admin_settings', settings);
    
    console.log('✅ Paramètres admin sauvegardés:', settings);
    
    return c.json({
      success: true,
      message: 'Paramètres enregistrés avec succès',
      settings: settings
    });
  } catch (error) {
    console.error('❌ Erreur sauvegarde paramètres admin:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 📖 CHARGER LES PARAMÈTRES ADMIN
// ============================================
adminRoutes.get('/settings/load', async (c) => {
  try {
    console.log('📖 Chargement des paramètres admin...');
    
    // Charger depuis le KV store
    const settings = await kv.get('admin_settings') || {
      commissionEnabled: true,
      commissionRate: 15,
      minimumCommission: 500,
      paymentFrequency: 'immediate',
      autoDeduction: true,
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ Paramètres admin chargés:', settings);
    
    return c.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    console.error('❌ Erreur chargement paramètres admin:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🎟️ SAUVEGARDER UN CODE PROMO
// ============================================
adminRoutes.post('/promo/save', async (c) => {
  try {
    console.log('🎟️ Sauvegarde du code promo...');
    
    const promo = await c.req.json();
    const promoCode = promo.code.toUpperCase();
    
    // Sauvegarder avec la clé 'promo:CODE'
    await kv.set(`promo:${promoCode}`, promo);
    
    console.log(`✅ Code promo ${promoCode} sauvegardé:`, promo);
    
    return c.json({
      success: true,
      message: `Code promo ${promoCode} créé avec succès`,
      promo: promo
    });
  } catch (error) {
    console.error('❌ Erreur sauvegarde code promo:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🎟️ RÉCUPÉRER TOUS LES CODES PROMOS
// ============================================
adminRoutes.get('/promo/list', async (c) => {
  try {
    console.log('🎟️ Récupération de tous les codes promos...');
    
    // Récupérer tous les promos
    const allPromos = await kv.getByPrefix('promo:');
    
    console.log(`✅ ${allPromos.length} codes promos trouvés`);
    
    return c.json({
      success: true,
      promos: allPromos
    });
  } catch (error) {
    console.error('❌ Erreur récupération codes promos:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🎟️ VÉRIFIER UN CODE PROMO (pour les passagers)
// ============================================
adminRoutes.post('/promo/check', async (c) => {
  try {
    const { code } = await c.req.json();
    const promoCode = code.toUpperCase();
    
    console.log(`🎟️ Vérification du code promo: ${promoCode}`);
    
    // Récupérer le promo
    const promo = await kv.get(`promo:${promoCode}`);
    
    if (!promo) {
      return c.json({
        success: false,
        error: 'Code promo invalide'
      }, 404);
    }
    
    // Vérifier si le promo est actif
    if (!promo.active) {
      return c.json({
        success: false,
        error: 'Ce code promo est désactivé'
      }, 400);
    }
    
    // Vérifier la date d'expiration
    if (promo.expirationDate) {
      const now = new Date();
      const expiration = new Date(promo.expirationDate);
      
      if (now > expiration) {
        return c.json({
          success: false,
          error: 'Ce code promo a expiré'
        }, 400);
      }
    }
    
    // Vérifier le nombre d'utilisations
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return c.json({
        success: false,
        error: 'Ce code promo a atteint sa limite d\'utilisation'
      }, 400);
    }
    
    console.log(`✅ Code promo ${promoCode} valide:`, promo);
    
    return c.json({
      success: true,
      promo: promo
    });
  } catch (error) {
    console.error('❌ Erreur vérification code promo:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🎟️ INCRÉMENTER L'UTILISATION D'UN CODE PROMO
// ============================================
adminRoutes.post('/promo/use', async (c) => {
  try {
    const { code } = await c.req.json();
    const promoCode = code.toUpperCase();
    
    console.log(`🎟️ Incrémentation utilisation du code promo: ${promoCode}`);
    
    // Récupérer le promo
    const promo = await kv.get(`promo:${promoCode}`);
    
    if (!promo) {
      return c.json({
        success: false,
        error: 'Code promo invalide'
      }, 404);
    }
    
    // Incrémenter le compteur
    promo.usedCount = (promo.usedCount || 0) + 1;
    
    // Sauvegarder
    await kv.set(`promo:${promoCode}`, promo);
    
    console.log(`✅ Code promo ${promoCode} utilisé (${promo.usedCount}/${promo.maxUses || '∞'})`);
    
    return c.json({
      success: true,
      promo: promo
    });
  } catch (error) {
    console.error('❌ Erreur incrémentation code promo:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🗑️ SUPPRIMER UN CODE PROMO
// ============================================
adminRoutes.delete('/promo/delete/:code', async (c) => {
  try {
    const promoCode = c.req.param('code').toUpperCase();
    
    console.log(`🗑️ Suppression du code promo: ${promoCode}`);
    
    // Supprimer du KV store
    await kv.del(`promo:${promoCode}`);
    
    console.log(`✅ Code promo ${promoCode} supprimé`);
    
    return c.json({
      success: true,
      message: `Code promo ${promoCode} supprimé avec succès`
    });
  } catch (error) {
    console.error('❌ Erreur suppression code promo:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 📱 STATISTIQUES SMS (AFRICA'S TALKING)
// ============================================
adminRoutes.get('/sms/balance', async (c) => {
  try {
    console.log('📱 Récupération de la balance SMS Africa\'s Talking...');

    const username = Deno.env.get('AFRICAS_TALKING_USERNAME') ?? '';
    const apiKey = Deno.env.get('AFRICAS_TALKING_API_KEY') ?? '';

    if (!username || !apiKey) {
      return c.json({
        success: false,
        error: 'Configuration Africa\'s Talking manquante'
      }, 500);
    }

    // Récupérer la balance depuis Africa's Talking
    try {
      const balanceResponse = await fetch('https://api.africastalking.com/version1/user', {
        method: 'GET',
        headers: {
          'apiKey': apiKey,
          'Accept': 'application/json'
        }
      });

      const balanceData = await balanceResponse.json();
      console.log('💰 Données balance AT:', balanceData);

      // Récupérer les statistiques de SMS envoyés depuis notre KV store
      const smsStats = await kv.get('sms_stats') || {
        totalSent: 0,
        totalFailed: 0,
        lastUpdated: new Date().toISOString()
      };

      // Compter les SMS dans les logs
      const allSmsLogs = await kv.getByPrefix('sms_log:');
      const successfulSms = allSmsLogs.filter((log: any) => log.status === 'Success' || log.status === 'Sent');
      const failedSms = allSmsLogs.filter((log: any) => log.status !== 'Success' && log.status !== 'Sent');

      // Calculer les stats par type
      const smsByType = {
        otp_code: 0,
        reset_password_otp: 0,
        ride_notification: 0,
        other: 0
      };

      for (const log of allSmsLogs) {
        const type = log.type || 'other';
        smsByType[type] = (smsByType[type] || 0) + 1;
      }

      // Estimation du coût par SMS en RDC (Africa's Talking)
      const costPerSms = 0.0084; // USD par SMS
      const balance = parseFloat(balanceData.UserData?.balance || '0');
      const currency = balanceData.UserData?.currency || 'USD';
      
      // Calculer le nombre de SMS restants
      const remainingSms = balance > 0 ? Math.floor(balance / costPerSms) : 0;

      return c.json({
        success: true,
        balance: {
          amount: balance,
          currency: currency,
          formattedBalance: `${(balance || 0).toFixed(2)} ${currency}`
        },
        estimation: {
          costPerSms: costPerSms,
          remainingSms: remainingSms,
          estimatedCost: {
            perSms: `${costPerSms} USD`,
            per100Sms: `${((costPerSms || 0) * 100).toFixed(2)} USD`,
            per1000Sms: `${((costPerSms || 0) * 1000).toFixed(2)} USD`
          }
        },
        usage: {
          totalSent: successfulSms.length,
          totalFailed: failedSms.length,
          totalAttempted: allSmsLogs.length,
          successRate: allSmsLogs.length > 0 
            ? (((successfulSms.length / allSmsLogs.length) * 100) || 0).toFixed(2) + '%'
            : '0%',
          byType: smsByType
        },
        lastUpdated: new Date().toISOString()
      });

    } catch (apiError) {
      console.error('❌ Erreur appel API Africa\'s Talking:', apiError);
      
      // En cas d'erreur API, retourner au moins les stats locales
      const allSmsLogs = await kv.getByPrefix('sms_log:');
      const successfulSms = allSmsLogs.filter((log: any) => log.status === 'Success' || log.status === 'Sent');
      const failedSms = allSmsLogs.filter((log: any) => log.status !== 'Success' && log.status !== 'Sent');

      return c.json({
        success: true,
        balance: {
          amount: 0,
          currency: 'USD',
          error: 'Impossible de récupérer la balance depuis Africa\'s Talking'
        },
        estimation: {
          costPerSms: 0.0084,
          remainingSms: 0,
          estimatedCost: {
            perSms: '0.0084 USD',
            per100Sms: '0.84 USD',
            per1000Sms: '8.40 USD'
          }
        },
        usage: {
          totalSent: successfulSms.length,
          totalFailed: failedSms.length,
          totalAttempted: allSmsLogs.length,
          successRate: allSmsLogs.length > 0 
            ? (((successfulSms.length / allSmsLogs.length) * 100) || 0).toFixed(2) + '%'
            : '0%'
        },
        lastUpdated: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Erreur récupération balance SMS:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 👥 RÉCUPÉRER TOUS LES UTILISATEURS (avec mots de passe)
// ============================================
adminRoutes.get('/users/all', async (c) => {
  try {
    console.log('👥 Récupération de tous les utilisateurs...');

    // Créer le client Supabase pour récupérer aussi depuis la table profiles
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ============= RÉCUPÉRATION DES PASSAGERS =============
    
    // 1️⃣ Récupérer depuis le KV store
    const kvPassengers = await kv.getByPrefix('passenger:');
    console.log(`📥 ${kvPassengers.length} passagers trouvés dans le KV store`);
    
    // 2️⃣ Récupérer depuis la table Supabase profiles (pour les anciens utilisateurs)
    const { data: supabasePassengers, error: passengersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'passenger');
    
    if (passengersError) {
      console.error('⚠️ Erreur récupération passagers depuis Supabase:', passengersError);
    }
    
    console.log(`📥 ${supabasePassengers?.length || 0} passagers trouvés dans Supabase`);
    
    // Fusionner les passagers (éviter les doublons)
    const passengersMap = new Map();
    
    // Ajouter les passagers du KV store
    kvPassengers
      .filter(p => p && p.id)
      .forEach(passenger => {
        passengersMap.set(passenger.id, {
          id: passenger.id,
          role: 'Passager',
          name: passenger.name || passenger.full_name || 'N/A',
          phone: passenger.phone || 'N/A',
          email: passenger.email || 'N/A',
          password: passenger.password || '******',
          balance: passenger.balance || 0,
          accountType: passenger.account_type || 'prepaid',
          createdAt: passenger.created_at || new Date().toISOString(),
          lastLoginAt: passenger.last_login_at,
          status: 'active',
          source: 'KV'
        });
      });
    
    // Ajouter les passagers de Supabase (sans écraser ceux du KV)
    if (supabasePassengers && supabasePassengers.length > 0) {
      supabasePassengers.forEach(passenger => {
        if (!passengersMap.has(passenger.id)) {
          passengersMap.set(passenger.id, {
            id: passenger.id,
            role: 'Passager',
            name: passenger.full_name || passenger.name || 'N/A',
            phone: passenger.phone || 'N/A',
            email: passenger.email || 'N/A',
            password: '******', // Pas de mot de passe dans Supabase profiles
            balance: passenger.balance || 0,
            accountType: passenger.account_type || 'prepaid',
            createdAt: passenger.created_at || new Date().toISOString(),
            lastLoginAt: passenger.last_login_at,
            status: 'active',
            source: 'Supabase'
          });
        }
      });
    }
    
    const passengers = Array.from(passengersMap.values());

    // ============= RÉCUPÉRATION DES CONDUCTEURS =============
    
    // Récupérer tous les conducteurs
    const allDrivers = await kv.getByPrefix('driver:');
    console.log(`📥 ${allDrivers.length} conducteurs trouvés`);
    
    const drivers = allDrivers
      .filter(d => d && d.id) // Filtrer les entrées invalides
      .map(driver => {
        // ✅ CORRECTION : Extraire les données du véhicule depuis l'objet imbriqué 'vehicle'
        const vehicle = driver.vehicle || {};
        
        return {
          id: driver.id,
          role: 'Conducteur',
          name: driver.name || driver.full_name || 'N/A',
          phone: driver.phone || 'N/A',
          email: driver.email || 'N/A',
          password: driver.password || '******',
          balance: driver.balance || 0,
          // ✅ Extraire depuis driver.vehicle
          vehicleCategory: vehicle.category || driver.vehicle_category || driver.vehicleCategory || 'N/A',
          vehiclePlate: vehicle.license_plate || driver.vehicle_plate || driver.vehiclePlate || 'N/A',
          vehicleModel: `${vehicle.make || driver.vehicle_make || ''} ${vehicle.model || driver.vehicle_model || ''}`.trim() || 'N/A',
          vehicleColor: vehicle.color || driver.vehicle_color || driver.vehicleColor || 'N/A',
          status: driver.status || 'offline',
          rating: driver.rating || 0,
          totalTrips: driver.total_trips || driver.totalTrips || 0,
          createdAt: driver.created_at || new Date().toISOString(),
          lastLoginAt: driver.last_login_at,
          // Infos supplémentaires
          isAvailable: driver.is_available || false,
          licenseNumber: driver.license_number || 'N/A',
          source: 'KV'
        };
      });

    // ============= RÉCUPÉRATION DES ADMINS =============
    
    // Récupérer tous les admins
    const allAdmins = await kv.getByPrefix('admin:');
    console.log(`📥 ${allAdmins.length} admins trouvés`);
    
    const admins = allAdmins
      .filter(a => a && a.id) // Filtrer les entrées invalides
      .map(admin => ({
        id: admin.id,
        role: 'Administrateur',
        name: admin.name || admin.full_name || 'N/A',
        phone: admin.phone || 'N/A',
        email: admin.email || 'N/A',
        password: admin.password || '******',
        createdAt: admin.created_at || new Date().toISOString(),
        lastLoginAt: admin.last_login_at,
        status: 'active',
        source: 'KV'
      }));

    // Combiner tous les utilisateurs
    const allUsers = [...passengers, ...drivers, ...admins];

    // Trier par date de création (plus récent en premier)
    allUsers.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    console.log(`✅ ${allUsers.length} utilisateurs récupérés (${passengers.length} passagers, ${drivers.length} conducteurs, ${admins.length} admins)`);
    console.log(`📊 Sources: KV=${kvPassengers.length} passagers KV, Supabase=${supabasePassengers?.length || 0} passagers Supabase`);

    return c.json({
      success: true,
      total: allUsers.length,
      stats: {
        passengers: passengers.length,
        drivers: drivers.length,
        admins: admins.length
      },
      users: allUsers
    });

  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 📋 HISTORIQUE DES ANNULATIONS
// ============================================
adminRoutes.get('/cancellations', async (c) => {
  try {
    console.log('📋 Récupération de l\'historique des annulations...');

    // Récupérer toutes les annulations des passagers
    const passengerCancellations = await kv.getByPrefix('passenger_cancellation:');
    console.log(`🚫 ${passengerCancellations.length} annulations passagers trouvées`);

    // Récupérer toutes les annulations des conducteurs
    const driverCancellations = await kv.getByPrefix('driver_cancellation:');
    console.log(`🚫 ${driverCancellations.length} annulations conducteurs trouvées`);

    // Enrichir avec les infos utilisateurs
    const enrichedPassengerCancellations = await Promise.all(
      passengerCancellations.map(async (cancellation) => {
        const passenger = await kv.get(`passenger:${cancellation.userId}`);
        return {
          ...cancellation,
          userName: passenger?.full_name || passenger?.name || 'Passager inconnu',
          userPhone: passenger?.phone || 'N/A'
        };
      })
    );

    const enrichedDriverCancellations = await Promise.all(
      driverCancellations.map(async (cancellation) => {
        const driver = await kv.get(`driver:${cancellation.userId}`);
        return {
          ...cancellation,
          userName: driver?.full_name || driver?.name || 'Conducteur inconnu',
          userPhone: driver?.phone || 'N/A'
        };
      })
    );

    // Combiner et trier par date (plus récent en premier)
    const allCancellations = [
      ...enrichedPassengerCancellations,
      ...enrichedDriverCancellations
    ].sort((a, b) => {
      const dateA = new Date(a.cancelledAt || 0).getTime();
      const dateB = new Date(b.cancelledAt || 0).getTime();
      return dateB - dateA;
    });

    // Calculer les statistiques
    const stats = {
      total: allCancellations.length,
      byPassengers: passengerCancellations.length,
      byDrivers: driverCancellations.length,
      withPenalty: allCancellations.filter(c => c.penaltyApplied).length,
      totalPenalties: allCancellations.reduce((sum, c) => sum + (c.penaltyAmount || 0), 0)
    };

    // Grouper par raison
    const byReason: Record<string, number> = {};
    allCancellations.forEach(c => {
      const reason = c.reason || 'Non spécifiée';
      byReason[reason] = (byReason[reason] || 0) + 1;
    });

    console.log(`✅ ${allCancellations.length} annulations récupérées`);
    console.log(`📊 Statistiques:`, stats);

    return c.json({
      success: true,
      total: allCancellations.length,
      stats,
      byReason,
      cancellations: allCancellations
    });

  } catch (error) {
    console.error('❌ Erreur récupération annulations:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 📋 ANNULATIONS D'UN UTILISATEUR SPÉCIFIQUE
// ============================================
adminRoutes.get('/cancellations/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    console.log(`📋 Récupération des annulations de l'utilisateur: ${userId}`);

    // Récupérer les annulations du passager
    const passengerCancellations = await kv.getByPrefix(`passenger_cancellation:${userId}:`);
    
    // Récupérer les annulations du conducteur
    const driverCancellations = await kv.getByPrefix(`driver_cancellation:${userId}:`);

    const allUserCancellations = [...passengerCancellations, ...driverCancellations]
      .sort((a, b) => {
        const dateA = new Date(a.cancelledAt || 0).getTime();
        const dateB = new Date(b.cancelledAt || 0).getTime();
        return dateB - dateA;
      });

    console.log(`✅ ${allUserCancellations.length} annulations trouvées pour ${userId}`);

    return c.json({
      success: true,
      total: allUserCancellations.length,
      cancellations: allUserCancellations
    });

  } catch (error) {
    console.error('❌ Erreur récupération annulations utilisateur:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🔍 DIAGNOSTIC DES UTILISATEURS (KV vs Supabase Auth)
// ============================================
adminRoutes.get('/users/diagnostic', async (c) => {
  try {
    console.log('🔍 Diagnostic des utilisateurs - Comparaison KV Store vs Supabase Auth...');

    // Créer le client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // ============= KV STORE =============
    const kvPassengers = await kv.getByPrefix('passenger:');
    const kvDrivers = await kv.getByPrefix('driver:');
    const kvAdmins = await kv.getByPrefix('admin:');

    console.log(`📦 KV Store: ${kvPassengers.length} passagers, ${kvDrivers.length} conducteurs, ${kvAdmins.length} admins`);

    // ============= SUPABASE AUTH =============
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erreur récupération Supabase Auth:', authError);
    }

    const realAuthUsers = authUsers?.users || [];
    console.log(`🔐 Supabase Auth: ${realAuthUsers.length} utilisateurs réels`);

    // ============= SUPABASE PROFILES TABLE =============
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('⚠️ Erreur récupération profiles:', profilesError);
    }

    const profilesUsers = profilesData || [];
    console.log(`👤 Table Profiles: ${profilesUsers.length} profils`);

    // ============= ANALYSE =============
    const kvUserIds = new Set([
      ...kvPassengers.map(p => p.id),
      ...kvDrivers.map(d => d.id),
      ...kvAdmins.map(a => a.id)
    ]);

    const authUserIds = new Set(realAuthUsers.map(u => u.id));
    const profileUserIds = new Set(profilesUsers.map(p => p.id));

    // Utilisateurs dans KV mais pas dans Auth (données de test/mockées)
    const orphanedKvUsers = Array.from(kvUserIds).filter(id => !authUserIds.has(id));
    
    // Utilisateurs dans Auth mais pas dans KV (manquants dans KV)
    const missingInKv = Array.from(authUserIds).filter(id => !kvUserIds.has(id));

    console.log(`⚠️ ${orphanedKvUsers.length} utilisateurs orphelins dans KV (données de test)`);
    console.log(`📝 ${missingInKv.length} utilisateurs Auth manquants dans KV`);

    // Détails des utilisateurs orphelins
    const orphanedDetails = [];
    for (const id of orphanedKvUsers) {
      const passenger = kvPassengers.find(p => p.id === id);
      const driver = kvDrivers.find(d => d.id === id);
      const admin = kvAdmins.find(a => a.id === id);
      
      const user = passenger || driver || admin;
      if (user) {
        orphanedDetails.push({
          id: user.id,
          name: user.name || user.full_name || 'N/A',
          phone: user.phone || 'N/A',
          email: user.email || 'N/A',
          role: passenger ? 'Passager' : (driver ? 'Conducteur' : 'Admin'),
          createdAt: user.created_at,
          source: 'KV Store (orphelin)'
        });
      }
    }

    // Détails des vrais utilisateurs Auth
    const authUsersDetails = realAuthUsers.map(u => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
      inKV: kvUserIds.has(u.id),
      inProfiles: profileUserIds.has(u.id)
    }));

    return c.json({
      success: true,
      diagnostic: {
        kvStore: {
          total: kvUserIds.size,
          passengers: kvPassengers.length,
          drivers: kvDrivers.length,
          admins: kvAdmins.length,
          orphaned: orphanedKvUsers.length
        },
        supabaseAuth: {
          total: realAuthUsers.length,
          missingInKv: missingInKv.length
        },
        profiles: {
          total: profilesUsers.length
        }
      },
      orphanedUsers: orphanedDetails,
      authUsers: authUsersDetails,
      recommendations: {
        shouldCleanup: orphanedKvUsers.length > 0,
        shouldSync: missingInKv.length > 0,
        message: orphanedKvUsers.length > 0
          ? `🧹 Vous avez ${orphanedKvUsers.length} utilisateurs de test dans le KV Store. Il est recommandé de les nettoyer.`
          : '✅ Votre KV Store est propre !'
      }
    });

  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🧹 NETTOYER LES DONNÉES DE TEST DU KV STORE
// ============================================
adminRoutes.post('/users/cleanup', async (c) => {
  try {
    console.log('🧹 Nettoyage des données de test du KV Store...');

    // Créer le client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les vrais utilisateurs Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Erreur Supabase Auth: ${authError.message}`);
    }

    const realAuthUserIds = new Set((authUsers?.users || []).map(u => u.id));
    console.log(`🔐 ${realAuthUserIds.size} utilisateurs réels dans Supabase Auth`);

    // Récupérer tous les utilisateurs du KV Store
    const kvPassengers = await kv.getByPrefix('passenger:');
    const kvDrivers = await kv.getByPrefix('driver:');
    const kvAdmins = await kv.getByPrefix('admin:');

    console.log(`📦 KV Store avant nettoyage: ${kvPassengers.length} passagers, ${kvDrivers.length} conducteurs, ${kvAdmins.length} admins`);

    // Supprimer les utilisateurs orphelins (données de test)
    let deletedCount = 0;
    const deletedUsers = [];

    for (const passenger of kvPassengers) {
      if (passenger.id && !realAuthUserIds.has(passenger.id)) {
        await kv.del(`passenger:${passenger.id}`);
        deletedCount++;
        deletedUsers.push({
          id: passenger.id,
          name: passenger.name || passenger.full_name,
          role: 'Passager'
        });
        console.log(`🗑️ Supprimé passager: ${passenger.name} (${passenger.id})`);
      }
    }

    for (const driver of kvDrivers) {
      if (driver.id && !realAuthUserIds.has(driver.id)) {
        await kv.del(`driver:${driver.id}`);
        deletedCount++;
        deletedUsers.push({
          id: driver.id,
          name: driver.name || driver.full_name,
          role: 'Conducteur'
        });
        console.log(`🗑️ Supprimé conducteur: ${driver.name} (${driver.id})`);
      }
    }

    for (const admin of kvAdmins) {
      if (admin.id && !realAuthUserIds.has(admin.id)) {
        await kv.del(`admin:${admin.id}`);
        deletedCount++;
        deletedUsers.push({
          id: admin.id,
          name: admin.name || admin.full_name,
          role: 'Admin'
        });
        console.log(`🗑️ Supprimé admin: ${admin.name} (${admin.id})`);
      }
    }

    console.log(`✅ Nettoyage terminé: ${deletedCount} utilisateurs de test supprimés`);

    return c.json({
      success: true,
      deleted: deletedCount,
      deletedUsers: deletedUsers,
      message: `🧹 ${deletedCount} utilisateurs de test ont été supprimés du KV Store`
    });

  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// 🔄 SYNCHRONISER DEPUIS SUPABASE AUTH
// ============================================
adminRoutes.post('/users/sync-from-auth', async (c) => {
  try {
    console.log('🔄 Synchronisation depuis Supabase Auth...');

    // Créer le client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les vrais utilisateurs Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Erreur Supabase Auth: ${authError.message}`);
    }

    const realAuthUsers = authUsers?.users || [];
    console.log(`🔐 ${realAuthUsers.length} utilisateurs trouvés dans Supabase Auth`);

    // Récupérer les profils pour enrichir les données
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*');

    const profilesMap = new Map();
    (profilesData || []).forEach(p => profilesMap.set(p.id, p));

    let syncedCount = 0;
    const syncedUsers = [];

    // Synchroniser chaque utilisateur Auth dans le KV Store
    for (const user of realAuthUsers) {
      const profile = profilesMap.get(user.id);
      const role = profile?.role || 'passenger'; // Par défaut passager

      let kvKey = '';
      let userData: any = {
        id: user.id,
        email: user.email || '',
        phone: user.phone || profile?.phone || '',
        name: profile?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Utilisateur',
        full_name: profile?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Utilisateur',
        created_at: user.created_at,
        last_login_at: user.last_sign_in_at,
        balance: profile?.balance || 0
      };

      if (role === 'passenger') {
        kvKey = `passenger:${user.id}`;
        userData.account_type = profile?.account_type || 'prepaid';
      } else if (role === 'driver') {
        kvKey = `driver:${user.id}`;
        userData.vehicle = profile?.vehicle || {};
        userData.license_number = profile?.license_number || '';
        userData.is_available = false;
        userData.status = 'offline';
        userData.rating = profile?.rating || 0;
        userData.total_trips = profile?.total_trips || 0;
      } else if (role === 'admin') {
        kvKey = `admin:${user.id}`;
      }

      // Vérifier si l'utilisateur existe déjà dans KV
      const existingUser = await kv.get(kvKey);
      
      if (existingUser) {
        // Fusionner avec les données existantes
        userData = { ...existingUser, ...userData };
        console.log(`🔄 Mis à jour: ${userData.name} (${role})`);
      } else {
        console.log(`➕ Ajouté: ${userData.name} (${role})`);
      }

      await kv.set(kvKey, userData);
      syncedCount++;
      syncedUsers.push({
        id: user.id,
        name: userData.name,
        role: role,
        action: existingUser ? 'updated' : 'created'
      });
    }

    console.log(`✅ Synchronisation terminée: ${syncedCount} utilisateurs synchronisés`);

    return c.json({
      success: true,
      synced: syncedCount,
      syncedUsers: syncedUsers,
      message: `🔄 ${syncedCount} utilisateurs ont été synchronisés depuis Supabase Auth`
    });

  } catch (error) {
    console.error('❌ Erreur synchronisation:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

// ============================================
// ✅ METTRE À JOUR LE STATUS DANS AUTH METADATA
// ============================================
adminRoutes.post('/update-driver-auth-metadata', async (c) => {
  try {
    const { driverId, status } = await c.req.json();
    
    console.log('🔄 Synchronisation statut conducteur dans Auth:', { driverId, status });
    
    if (!driverId || !status) {
      return c.json({
        success: false,
        error: 'driverId et status requis'
      }, 400);
    }
    
    // Créer le client Supabase avec SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Mettre à jour le user_metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      driverId,
      {
        user_metadata: {
          status: status,
          driver_status: status
        }
      }
    );
    
    if (updateError) {
      console.error('❌ Erreur mise à jour Auth metadata:', updateError);
      return c.json({
        success: false,
        error: updateError.message
      }, 500);
    }
    
    console.log('✅ Statut synchronisé dans Auth user_metadata');
    
    return c.json({
      success: true,
      message: 'Statut synchronisé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur update-driver-auth-metadata:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});


// ============================================
// 🗑️ SUPPRIMER TOUS LES PASSAGERS
// ============================================
adminRoutes.post('/passengers/delete-all', async (c) => {
  try {
    console.log('🗑️🗑️🗑️ SUPPRESSION DE TOUS LES PASSAGERS...');

    // Créer le client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Récupérer d'abord TOUS les utilisateurs de Supabase Auth
    const { data: authUsersData, error: authListError } = await supabase.auth.admin.listUsers();
    
    if (authListError) {
      console.error('❌ Erreur récupération users Auth:', authListError);
      return c.json({
        success: false,
        error: 'Erreur lors de la récupération des utilisateurs Auth: ' + authListError.message
      }, 500);
    }

    const authUsers = authUsersData?.users || [];
    console.log(`🔐 ${authUsers.length} utilisateurs trouvés dans Supabase Auth`);

    // 2. Récupérer tous les passagers du KV Store
    const allPassengers = await kv.getByPrefix('passenger:');
    const allUserProfiles = await kv.getByPrefix('user:');
    const allProfiles = await kv.getByPrefix('profile:');
    
    console.log(`📦 KV Store: ${allPassengers.length} passagers trouvés`);

    const deletedPassengers = [];
    let deletedFromAuth = 0;
    let deletedFromKV = 0;
    let errors = [];

    // Combiner tous les passagers (from different prefixes)
    const allPassengerData = [
      ...allPassengers,
      ...allUserProfiles.filter(u => u.role === 'passenger'),
      ...allProfiles.filter(p => p.role === 'passenger')
    ];

    // Dédupliquer par ID
    const uniquePassengerIds = new Set<string>();
    const uniquePassengers = [];
    for (const p of allPassengerData) {
      if (p && p.id && !uniquePassengerIds.has(p.id)) {
        uniquePassengerIds.add(p.id);
        uniquePassengers.push(p);
      }
    }

    console.log(`🔍 ${uniquePassengers.length} passagers uniques trouvés dans KV Store`);

    // Créer un Set des IDs Auth pour vérification rapide
    const authUserIds = new Set(authUsers.map(u => u.id));

    // Récupérer aussi les passagers de la table profiles
    const { data: profilePassengers } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('role', 'passenger');
    
    console.log(`📊 ${profilePassengers?.length || 0} passagers trouvés dans table profiles`);

    // Ajouter les passagers de la table profiles
    if (profilePassengers && profilePassengers.length > 0) {
      for (const p of profilePassengers) {
        if (p.id && !uniquePassengerIds.has(p.id)) {
          uniquePassengerIds.add(p.id);
          uniquePassengers.push({
            id: p.id,
            name: p.full_name,
            email: p.email,
            phone: p.phone,
            source: 'profiles'
          });
        }
      }
    }

    console.log(`🔍 ${uniquePassengers.length} passagers TOTAL à supprimer (KV + profiles)`);

    // 3. Supprimer chaque passager
    for (const passenger of uniquePassengers) {
      try {
        const passengerId = passenger.id;
        const passengerName = passenger.name || passenger.full_name || passenger.email || 'Inconnu';
        
        console.log(`🗑️ Suppression du passager: ${passengerName} (${passengerId})...`);

        // A. Vérifier si l'utilisateur existe dans Supabase Auth
        const existsInAuth = authUserIds.has(passengerId);
        
        if (existsInAuth) {
          // Supprimer de Supabase Auth
          try {
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(passengerId);
            
            if (authDeleteError) {
              console.warn(`⚠️ Erreur suppression Auth pour ${passengerId}:`, authDeleteError.message);
              errors.push({
                id: passengerId,
                name: passengerName,
                error: `Auth: ${authDeleteError.message}`
              });
            } else {
              deletedFromAuth++;
              console.log(`  ✅ Supprimé de Supabase Auth`);
            }
          } catch (authError) {
            console.warn(`⚠️ Exception suppression Auth:`, authError);
            errors.push({
              id: passengerId,
              name: passengerName,
              error: `Auth exception: ${authError}`
            });
          }
        } else {
          console.log(`  ℹ️ N'existe pas dans Auth, suppression KV uniquement`);
        }

        // B. Supprimer de la table profiles Supabase
        try {
          const { error: profileDeleteError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', passengerId);
          
          if (profileDeleteError) {
            console.warn(`  ⚠️ Erreur suppression profiles: ${profileDeleteError.message}`);
          } else {
            console.log(`  ✅ Supprimé de table profiles`);
          }
        } catch (profileError) {
          console.warn(`  ⚠️ Exception suppression profiles:`, profileError);
        }

        // C. Supprimer toutes les données du KV Store
        const keysToDelete = [
          `passenger:${passengerId}`,
          `user:${passengerId}`,
          `profile:${passengerId}`,
          `favorites:${passengerId}`,
          `wallet:${passengerId}`,
          `payment_methods:${passengerId}`,
        ];

        for (const key of keysToDelete) {
          try {
            await kv.del(key);
            console.log(`  ✅ Supprimé clé: ${key}`);
          } catch (kvError) {
            console.warn(`  ⚠️ Erreur suppression ${key}:`, kvError);
          }
        }
        
        deletedFromKV++;

        deletedPassengers.push({
          id: passengerId,
          name: passengerName,
          email: passenger.email || 'N/A',
          phone: passenger.phone || 'N/A',
          existedInAuth: existsInAuth
        });

      } catch (error) {
        console.error(`❌ Erreur suppression passager ${passenger.id}:`, error);
        errors.push({
          id: passenger.id,
          name: passenger.name || passenger.full_name || 'Inconnu',
          error: String(error)
        });
      }
    }

    // 4. Nettoyer les courses associées aux passagers supprimés
    console.log('🧹 Nettoyage des courses associées...');
    const allRides = await kv.getByPrefix('ride_');
    const deletedPassengerIds = new Set(deletedPassengers.map(p => p.id));
    let deletedRides = 0;

    for (const ride of allRides) {
      if (ride && ride.passengerId && deletedPassengerIds.has(ride.passengerId)) {
        try {
          // Extraire la clé depuis l'objet ride
          // Les clés possibles: ride_request_*, ride_active_*, ride_completed_*
          const possibleKeys = [
            `ride_request_${ride.id}`,
            `ride_active_${ride.id}`,
            `ride_completed_${ride.id}`
          ];
          
          for (const key of possibleKeys) {
            try {
              await kv.del(key);
            } catch (err) {
              // Ignorer les erreurs si la clé n'existe pas
            }
          }
          deletedRides++;
        } catch (err) {
          console.warn(`⚠️ Erreur suppression course ${ride.id}:`, err);
        }
      }
    }

    console.log(`✅ ${deletedRides} courses supprimées`);

    console.log('🗑️🗑️🗑️ SUPPRESSION TERMINÉE');
    console.log(`   - ${deletedFromAuth} passagers supprimés de Supabase Auth`);
    console.log(`   - ${deletedFromKV} passagers supprimés du KV Store`);
    console.log(`   - ${deletedRides} courses supprimées`);
    console.log(`   - ${errors.length} erreurs rencontrées`);

    return c.json({
      success: true,
      deleted: {
        fromAuth: deletedFromAuth,
        fromKV: deletedFromKV,
        rides: deletedRides
      },
      deletedPassengers: deletedPassengers,
      errors: errors,
      message: `🗑️ ${deletedFromKV} passagers supprimés du KV (dont ${deletedFromAuth} de Auth) - ${errors.length} erreurs`
    });

  } catch (error) {
    console.error('❌ Erreur suppression passagers:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur: ' + String(error)
    }, 500);
  }
});

export default adminRoutes;



