import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv-wrapper.ts';

const auditRoutes = new Hono();

/**
 * 🔍 AUDIT DES EMAILS - Détecter les problèmes potentiels
 * 
 * Cette route analyse tous les utilisateurs pour identifier :
 * - Emails fictifs (@smartcabb.app) qui pourraient causer des bounces
 * - Emails invalides ou mal formatés
 * - Utilisateurs sans email valide
 * 
 * Endpoint: GET /audit-emails
 * Requires: Admin access
 */
auditRoutes.get('/audit-emails', async (c) => {
  try {
    console.log('🔍 Début de l\'audit des emails...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer tous les utilisateurs de Supabase Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Erreur récupération utilisateurs:', authError);
      return c.json({
        success: false,
        error: 'Erreur lors de la récupération des utilisateurs'
      }, 500);
    }

    // Statistiques
    const stats = {
      total: 0,
      realEmails: 0,
      internalEmails: 0,
      invalidEmails: 0,
      usersWithPhoneAuth: 0,
      riskOfBounce: 0
    };

    // Listes détaillées
    const internalEmailUsers: any[] = [];
    const invalidEmailUsers: any[] = [];
    const realEmailUsers: any[] = [];

    // Fonction de validation email
    const isValidRealEmail = (email: string): boolean => {
      if (!email || !email.includes('@')) return false;
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
      if (!emailRegex.test(email)) return false;
      if (email.includes('@smartcabb.app')) return false;
      return true;
    };

    // Analyser chaque utilisateur
    for (const user of authUsers.users) {
      stats.total++;

      const email = user.email || '';
      const usesPhoneAuth = user.user_metadata?.uses_phone_auth || false;

      // Catégoriser l'utilisateur
      if (email.includes('@smartcabb.app')) {
        stats.internalEmails++;
        stats.usersWithPhoneAuth++;
        
        internalEmailUsers.push({
          id: user.id,
          email: email,
          phone: user.user_metadata?.phone || 'N/A',
          full_name: user.user_metadata?.full_name || 'N/A',
          role: user.user_metadata?.role || 'N/A',
          created_at: user.created_at
        });
        
        // ⚠️ RISQUE : Si uses_phone_auth n'est pas défini, Supabase pourrait tenter d'envoyer des emails
        if (!usesPhoneAuth) {
          stats.riskOfBounce++;
        }
      } else if (isValidRealEmail(email)) {
        stats.realEmails++;
        
        realEmailUsers.push({
          id: user.id,
          email: email,
          phone: user.user_metadata?.phone || 'N/A',
          full_name: user.user_metadata?.full_name || 'N/A',
          role: user.user_metadata?.role || 'N/A'
        });
      } else {
        stats.invalidEmails++;
        
        invalidEmailUsers.push({
          id: user.id,
          email: email,
          phone: user.user_metadata?.phone || 'N/A',
          full_name: user.user_metadata?.full_name || 'N/A',
          role: user.user_metadata?.role || 'N/A',
          issue: 'Format email invalide'
        });
      }
    }

    // Recommandations
    const recommendations: string[] = [];

    if (stats.internalEmails > 0) {
      recommendations.push(
        `⚠️ ${stats.internalEmails} utilisateur(s) avec email @smartcabb.app détecté(s). ` +
        `Ces utilisateurs ne doivent JAMAIS recevoir d'emails. Utilisez SMS à la place.`
      );
    }

    if (stats.riskOfBounce > 0) {
      recommendations.push(
        `🚨 ${stats.riskOfBounce} utilisateur(s) avec email @smartcabb.app SANS flag uses_phone_auth. ` +
        `Supabase pourrait tenter de leur envoyer des emails (risque de bounce).`
      );
    }

    if (stats.invalidEmails > 0) {
      recommendations.push(
        `❌ ${stats.invalidEmails} utilisateur(s) avec email invalide. ` +
        `Ces comptes doivent être corrigés ou supprimés.`
      );
    }

    if (stats.realEmails > 0) {
      recommendations.push(
        `✅ ${stats.realEmails} utilisateur(s) avec email réel valide. ` +
        `Ces utilisateurs peuvent recevoir des emails en toute sécurité.`
      );
    }

    // Actions recommandées
    const actions: string[] = [];

    if (stats.riskOfBounce > 0) {
      actions.push(
        `1. Exécuter POST /audit-emails/fix-metadata pour ajouter le flag uses_phone_auth`
      );
    }

    if (stats.invalidEmails > 0) {
      actions.push(
        `2. Vérifier manuellement les utilisateurs avec emails invalides`
      );
    }

    actions.push(
      `3. Configurer SendGrid SMTP dans Supabase Dashboard (voir CONFIGURATION_SENDGRID_SMTP.md)`
    );

    console.log('✅ Audit terminé');
    console.log('📊 Statistiques:', stats);

    return c.json({
      success: true,
      stats: stats,
      recommendations: recommendations,
      actions: actions,
      details: {
        internalEmailUsers: internalEmailUsers.slice(0, 10), // Limiter à 10 pour la réponse
        invalidEmailUsers: invalidEmailUsers,
        realEmailUsers: realEmailUsers.slice(0, 10), // Limiter à 10 pour la réponse
        totalInternalUsers: internalEmailUsers.length,
        totalRealUsers: realEmailUsers.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur audit emails:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur lors de l\'audit'
    }, 500);
  }
});

/**
 * 🔧 CORRIGER LES MÉTADONNÉES - Ajouter le flag uses_phone_auth
 * 
 * Cette route met à jour tous les utilisateurs avec email @smartcabb.app
 * pour ajouter le flag uses_phone_auth: true dans leurs métadonnées.
 * 
 * Cela empêche Supabase d'essayer de leur envoyer des emails.
 * 
 * Endpoint: POST /audit-emails/fix-metadata
 * Requires: Admin access
 */
auditRoutes.post('/audit-emails/fix-metadata', async (c) => {
  try {
    console.log('🔧 Début de la correction des métadonnées...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer tous les utilisateurs
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Erreur récupération utilisateurs:', authError);
      return c.json({
        success: false,
        error: 'Erreur lors de la récupération des utilisateurs'
      }, 500);
    }

    let updated = 0;
    let errors = 0;
    const updatedUsers: any[] = [];

    // Mettre à jour chaque utilisateur avec email @smartcabb.app
    for (const user of authUsers.users) {
      const email = user.email || '';
      const usesPhoneAuth = user.user_metadata?.uses_phone_auth;

      // Si email @smartcabb.app et pas de flag uses_phone_auth
      if (email.includes('@smartcabb.app') && !usesPhoneAuth) {
        try {
          // Mettre à jour les métadonnées
          const { data, error } = await supabase.auth.admin.updateUserById(
            user.id,
            {
              user_metadata: {
                ...user.user_metadata,
                uses_phone_auth: true
              }
            }
          );

          if (error) {
            console.error(`❌ Erreur mise à jour user ${user.id}:`, error);
            errors++;
          } else {
            console.log(`✅ User ${user.id} mis à jour`);
            updated++;
            updatedUsers.push({
              id: user.id,
              email: email,
              full_name: user.user_metadata?.full_name || 'N/A'
            });
          }
        } catch (updateError) {
          console.error(`❌ Erreur mise à jour user ${user.id}:`, updateError);
          errors++;
        }
      }
    }

    console.log(`✅ Correction terminée: ${updated} utilisateurs mis à jour, ${errors} erreurs`);

    return c.json({
      success: true,
      updated: updated,
      errors: errors,
      updatedUsers: updatedUsers,
      message: `${updated} utilisateur(s) mis à jour avec le flag uses_phone_auth: true`
    });

  } catch (error) {
    console.error('❌ Erreur correction métadonnées:', error);
    return c.json({
      success: false,
      error: 'Erreur serveur lors de la correction'
    }, 500);
  }
});

export default auditRoutes;
