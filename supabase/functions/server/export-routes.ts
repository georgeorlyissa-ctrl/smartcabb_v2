import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

// Créer un client Supabase avec la clé service role
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Export de données (JSON direct)
app.post('/data', async (c) => {
  try {
    const body = await c.req.json();
    const { tables = [], format = 'json' } = body;

    console.log('📤 Export données:', { tables, format });

    if (!tables || tables.length === 0) {
      return c.json({ 
        success: false, 
        message: 'Aucune table sélectionnée' 
      }, 400);
    }

    // Créer l'export
    const exportData: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportedBy: 'admin',
        tables,
        format,
        version: '1.0'
      },
      data: {}
    };

    // Récupérer les données de chaque table
    for (const tableName of tables) {
      try {
        console.log(`📊 Export table: ${tableName}`);
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) {
          console.error(`❌ Erreur table ${tableName}:`, error);
          exportData.data[tableName] = { 
            error: error.message, 
            records: [] 
          };
        } else {
          exportData.data[tableName] = {
            records: data || [],
            count: data?.length || 0
          };
        }
      } catch (tableError) {
        console.error(`❌ Erreur export ${tableName}:`, tableError);
        exportData.data[tableName] = { 
          error: tableError.message, 
          records: [] 
        };
      }
    }

    console.log('✅ Export terminé');

    return c.json({
      success: true,
      export: exportData
    });
  } catch (error) {
    console.error('❌ Erreur export données:', error);
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500);
  }
});

// Export utilisateurs spécifique (avec statistiques)
app.get('/users', async (c) => {
  try {
    console.log('👥 Export utilisateurs avec stats');

    // Récupérer les profils
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      throw profilesError;
    }

    // Récupérer les conducteurs
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('*');

    if (driversError) {
      throw driversError;
    }

    // Récupérer les courses
    const { data: rides, error: ridesError } = await supabase
      .from('rides')
      .select('*');

    if (ridesError) {
      throw ridesError;
    }

    // Calculer les statistiques
    const stats = {
      totalUsers: profiles?.length || 0,
      totalDrivers: drivers?.length || 0,
      totalRides: rides?.length || 0,
      activeDrivers: drivers?.filter(d => d.is_online).length || 0,
      completedRides: rides?.filter(r => r.status === 'completed').length || 0,
      totalRevenue: rides
        ?.filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (r.actual_price || r.estimated_price || 0), 0) || 0
    };

    return c.json({
      success: true,
      export: {
        metadata: {
          exportDate: new Date().toISOString(),
          type: 'users',
          version: '1.0'
        },
        statistics: stats,
        data: {
          profiles: profiles || [],
          drivers: drivers || [],
          rides: rides || []
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur export utilisateurs:', error);
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500);
  }
});

// Export courses spécifique (avec détails)
app.get('/rides', async (c) => {
  try {
    console.log('🚗 Export courses avec détails');

    const { data: rides, error } = await supabase
      .from('rides')
      .select(`
        *,
        passenger:profiles!rides_passenger_id_fkey(id, name, email, phone),
        driver:drivers!rides_driver_id_fkey(id, name, email, phone, vehicle_info)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Statistiques par statut
    const statsByStatus = rides?.reduce((acc: any, ride) => {
      const status = ride.status || 'unknown';
      if (!acc[status]) {
        acc[status] = { count: 0, totalAmount: 0 };
      }
      acc[status].count++;
      acc[status].totalAmount += ride.actual_price || ride.estimated_price || 0;
      return acc;
    }, {}) || {};

    return c.json({
      success: true,
      export: {
        metadata: {
          exportDate: new Date().toISOString(),
          type: 'rides',
          version: '1.0'
        },
        statistics: {
          total: rides?.length || 0,
          byStatus: statsByStatus
        },
        data: {
          rides: rides || []
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur export courses:', error);
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500);
  }
});

// Export financier (rapports détaillés)
app.get('/financial', async (c) => {
  try {
    console.log('💰 Export financier');

    const { data: rides, error } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'completed');

    if (error) {
      throw error;
    }

    // Calculer les statistiques financières
    const totalRevenue = rides?.reduce((sum, r) => sum + (r.actual_price || r.estimated_price || 0), 0) || 0;
    const totalCommission = rides?.reduce((sum, r) => sum + (r.commission || 0), 0) || 0;
    const netDriverAmount = rides?.reduce((sum, r) => sum + (r.net_driver_amount || 0), 0) || 0;

    // Grouper par date
    const revenueByDate = rides?.reduce((acc: any, ride) => {
      const date = new Date(ride.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { 
          date,
          rides: 0,
          revenue: 0,
          commission: 0,
          netDriver: 0
        };
      }
      acc[date].rides++;
      acc[date].revenue += ride.actual_price || ride.estimated_price || 0;
      acc[date].commission += ride.commission || 0;
      acc[date].netDriver += ride.net_driver_amount || 0;
      return acc;
    }, {}) || {};

    return c.json({
      success: true,
      export: {
        metadata: {
          exportDate: new Date().toISOString(),
          type: 'financial',
          version: '1.0'
        },
        summary: {
          totalRides: rides?.length || 0,
          totalRevenue,
          totalCommission,
          netDriverAmount,
          averageRideValue: rides?.length ? totalRevenue / rides.length : 0,
          commissionRate: totalRevenue ? (totalCommission / totalRevenue) * 100 : 0
        },
        revenueByDate: Object.values(revenueByDate),
        data: {
          rides: rides || []
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur export financier:', error);
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500);
  }
});

export default app;
