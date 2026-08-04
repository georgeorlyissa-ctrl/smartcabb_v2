import { supabase } from './supabase';

/**
 * Fonction pour créer des données de test dans Supabase
 * Cela créera des profils, conducteurs, véhicules et courses de démonstration
 */
export async function seedDatabase() {
  console.log('🌱 Début du seeding de la base de données...');

  try {
    // 1. Créer des profils de test
    const profiles = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@smartcabb.cd',
        full_name: 'Admin SmartCabb',
        phone: '+243 999 000 001',
        role: 'admin',
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'jean.mukendi@example.cd',
        full_name: 'Jean Mukendi',
        phone: '+243 999 000 002',
        role: 'passenger',
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'marie.nseka@example.cd',
        full_name: 'Marie Nseka',
        phone: '+243 999 000 003',
        role: 'passenger',
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        email: 'paul.kalamba@example.cd',
        full_name: 'Paul Kalamba',
        phone: '+243 999 000 004',
        role: 'driver',
      },
      {
        id: '00000000-0000-0000-0000-000000000005',
        email: 'joseph.mbala@example.cd',
        full_name: 'Joseph Mbala',
        phone: '+243 999 000 005',
        role: 'driver',
      },
      {
        id: '00000000-0000-0000-0000-000000000006',
        email: 'patrick.nkulu@example.cd',
        full_name: 'Patrick Nkulu',
        phone: '+243 999 000 006',
        role: 'driver',
      },
    ];

    console.log('📝 Création des profils...');
    const { error: profilesError } = await supabase
      .from('profiles')
      .insert(profiles);

    if (profilesError) {
      console.error('Erreur lors de la création des profils:', profilesError);
    } else {
      console.log('✅ Profils créés avec succès');
    }

    // 2. Créer des conducteurs
    const drivers = [
      {
        id: '00000000-0000-0000-0000-000000000101',
        user_id: '00000000-0000-0000-0000-000000000004',
        license_number: 'KIN-2024-001',
        license_expiry: '2026-12-31',
        status: 'approved',
        rating: 4.8,
        total_rides: 247,
        is_available: true,
        current_location_lat: -4.3276,
        current_location_lng: 15.3136,
      },
      {
        id: '00000000-0000-0000-0000-000000000102',
        user_id: '00000000-0000-0000-0000-000000000005',
        license_number: 'KIN-2024-002',
        license_expiry: '2027-06-30',
        status: 'approved',
        rating: 4.9,
        total_rides: 312,
        is_available: true,
        current_location_lat: -4.3189,
        current_location_lng: 15.2989,
      },
      {
        id: '00000000-0000-0000-0000-000000000103',
        user_id: '00000000-0000-0000-0000-000000000006',
        license_number: 'KIN-2024-003',
        license_expiry: '2026-09-15',
        status: 'approved',
        rating: 4.7,
        total_rides: 189,
        is_available: false,
        current_location_lat: -4.3312,
        current_location_lng: 15.3221,
      },
    ];

    console.log('🚗 Création des conducteurs...');
    const { error: driversError } = await supabase
      .from('drivers')
      .insert(drivers);

    if (driversError) {
      console.error('Erreur lors de la création des conducteurs:', driversError);
    } else {
      console.log('✅ Conducteurs créés avec succès');
    }

    // 3. Créer des véhicules
    const vehicles = [
      {
        id: '00000000-0000-0000-0000-000000000201',
        driver_id: '00000000-0000-0000-0000-000000000101',
        make: 'Toyota',
        model: 'Corolla',
        year: 2020,
        color: 'Noir',
        license_plate: 'CD-KIN-1234',
        category: 'standard',
        seats: 4,
      },
      {
        id: '00000000-0000-0000-0000-000000000202',
        driver_id: '00000000-0000-0000-0000-000000000102',
        make: 'Mercedes-Benz',
        model: 'E-Class',
        year: 2022,
        color: 'Argent',
        license_plate: 'CD-KIN-5678',
        category: 'comfort',
        seats: 4,
      },
      {
        id: '00000000-0000-0000-0000-000000000203',
        driver_id: '00000000-0000-0000-0000-000000000103',
        make: 'BMW',
        model: 'X5',
        year: 2023,
        color: 'Blanc',
        license_plate: 'CD-KIN-9012',
        category: 'plus',
        seats: 5,
      },
    ];

    console.log('🚙 Création des véhicules...');
    const { error: vehiclesError } = await supabase
      .from('vehicles')
      .insert(vehicles);

    if (vehiclesError) {
      console.error('Erreur lors de la création des véhicules:', vehiclesError);
    } else {
      console.log('✅ Véhicules créés avec succès');
    }

    // 4. Mettre à jour les conducteurs avec leur vehicle_id
    console.log('🔗 Association des véhicules aux conducteurs...');
    await supabase
      .from('drivers')
      .update({ vehicle_id: '00000000-0000-0000-0000-000000000201' })
      .eq('id', '00000000-0000-0000-0000-000000000101');

    await supabase
      .from('drivers')
      .update({ vehicle_id: '00000000-0000-0000-0000-000000000202' })
      .eq('id', '00000000-0000-0000-0000-000000000102');

    await supabase
      .from('drivers')
      .update({ vehicle_id: '00000000-0000-0000-0000-000000000203' })
      .eq('id', '00000000-0000-0000-0000-000000000103');

    console.log('✅ Associations créées avec succès');

    // 5. Créer des courses de démonstration
    const rides = [
      {
        passenger_id: '00000000-0000-0000-0000-000000000002',
        driver_id: '00000000-0000-0000-0000-000000000101',
        pickup_address: 'Gombe, Avenue de la Paix, Kinshasa',
        pickup_lat: -4.3276,
        pickup_lng: 15.3136,
        dropoff_address: 'Ngaliema, Boulevard du 30 Juin, Kinshasa',
        dropoff_lat: -4.3312,
        dropoff_lng: 15.2845,
        category: 'standard',
        confirmation_code: 'SC001',
        status: 'completed',
        hourly_rate: 6,
        base_fare: 16800, // 6 USD * 2800
        duration_minutes: 35,
        total_amount: 19600,
        payment_method: 'cash',
        payment_status: 'paid',
        requested_at: new Date(Date.now() - 3600000).toISOString(),
        accepted_at: new Date(Date.now() - 3500000).toISOString(),
        started_at: new Date(Date.now() - 3400000).toISOString(),
        completed_at: new Date(Date.now() - 3000000).toISOString(),
      },
      {
        passenger_id: '00000000-0000-0000-0000-000000000003',
        driver_id: '00000000-0000-0000-0000-000000000102',
        pickup_address: 'Lemba, Avenue Université, Kinshasa',
        pickup_lat: -4.3889,
        pickup_lng: 15.3678,
        dropoff_address: 'Kalamu, Avenue Kasa-Vubu, Kinshasa',
        dropoff_lat: -4.3512,
        dropoff_lng: 15.3256,
        category: 'comfort',
        confirmation_code: 'SC002',
        status: 'completed',
        hourly_rate: 10,
        base_fare: 28000, // 10 USD * 2800
        duration_minutes: 42,
        total_amount: 25200,
        payment_method: 'mobile_money',
        payment_status: 'paid',
        requested_at: new Date(Date.now() - 7200000).toISOString(),
        accepted_at: new Date(Date.now() - 7100000).toISOString(),
        started_at: new Date(Date.now() - 7000000).toISOString(),
        completed_at: new Date(Date.now() - 6500000).toISOString(),
      },
    ];

    console.log('🚕 Création des courses...');
    const { error: ridesError } = await supabase
      .from('rides')
      .insert(rides);

    if (ridesError) {
      console.error('Erreur lors de la création des courses:', ridesError);
    } else {
      console.log('✅ Courses créées avec succès');
    }

    // 6. Créer des codes promo
    const promoCodes = [
      {
        code: 'BIENVENUE2025',
        description: 'Code de bienvenue pour les nouveaux utilisateurs',
        discount_type: 'percentage',
        discount_value: 15,
        max_uses: 100,
        current_uses: 12,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      },
      {
        code: 'NOEL2024',
        description: 'Promotion de Noël',
        discount_type: 'fixed',
        discount_value: 5000, // 5000 CDF
        max_uses: 50,
        current_uses: 28,
        valid_from: new Date('2024-12-20').toISOString(),
        valid_until: new Date('2024-12-31').toISOString(),
        is_active: false,
      },
    ];

    console.log('🎁 Création des codes promo...');
    const { error: promoError } = await supabase
      .from('promo_codes')
      .insert(promoCodes);

    if (promoError) {
      console.error('Erreur lors de la création des codes promo:', promoError);
    } else {
      console.log('✅ Codes promo créés avec succès');
    }

    console.log('✅ Seeding terminé avec succès !');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    return false;
  }
}

/**
 * Fonction pour nettoyer toutes les données de test
 */
export async function cleanDatabase() {
  console.log('🧹 Nettoyage de la base de données...');

  try {
    // Supprimer dans l'ordre inverse des dépendances
    await supabase.from('notifications').delete().neq('id', '');
    await supabase.from('transactions').delete().neq('id', '');
    await supabase.from('ratings').delete().neq('id', '');
    await supabase.from('rides').delete().neq('id', '');
    await supabase.from('promo_codes').delete().neq('id', '');
    await supabase.from('documents').delete().neq('id', '');
    await supabase.from('vehicles').delete().neq('id', '');
    await supabase.from('drivers').delete().neq('id', '');
    await supabase.from('profiles').delete().neq('id', '');

    console.log('✅ Base de données nettoyée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    return false;
  }
}
