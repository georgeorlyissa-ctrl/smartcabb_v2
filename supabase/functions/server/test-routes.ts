import { Hono } from 'npm:hono';
import * as kv from './kv-wrapper.tsx';

// ============================================
// TEST ROUTES - Pour déboguer
// ============================================

export const testRoutes = new Hono();

// ✅ Route de test pour dump le KV store
testRoutes.get('/kv-dump', async (c) => {
  try {
    console.log('🔍 Dump du KV store...');
    
    const allProfiles = await kv.getByPrefix('profile:');
    const allUsers = await kv.getByPrefix('user:');
    const allPassengers = await kv.getByPrefix('passenger:');
    const allDrivers = await kv.getByPrefix('driver:');
    
    return c.json({
      success: true,
      data: {
        profiles: allProfiles.map(p => ({ id: p.id, phone: p.phone, email: p.email, name: p.name || p.full_name })),
        users: allUsers.map(u => ({ id: u.id, phone: u.phone, email: u.email, name: u.name || u.full_name })),
        passengers: allPassengers.map(p => ({ id: p.id, phone: p.phone, email: p.email, name: p.name || p.full_name })),
        drivers: allDrivers.map(d => ({ id: d.id, phone: d.phone, email: d.email, name: d.name || d.full_name }))
      },
      counts: {
        profiles: allProfiles.length,
        users: allUsers.length,
        passengers: allPassengers.length,
        drivers: allDrivers.length
      }
    });
  } catch (error) {
    console.error('❌ Erreur dump KV:', error);
    return c.json({
      success: false,
      error: String(error)
    }, 500);
  }
});