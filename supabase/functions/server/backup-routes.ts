import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv-wrapper.ts';

const app = new Hono();

// Créer un client Supabase avec la clé service role
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Liste des backups
app.get('/list', async (c) => {
  try {
    console.log('📋 Liste des backups demandée');

    // Récupérer tous les backups depuis le KV store
    const backupsKeys = await kv.getByPrefix('backup:');
    
    const backups = backupsKeys.map(({ key, value }) => {
      const backupData = value as any;
      return {
        id: key.replace('backup:', ''),
        name: backupData.name || 'Backup sans nom',
        timestamp: backupData.timestamp,
        size: backupData.size || 'Inconnu',
        type: backupData.type || 'manual',
        tables: backupData.tables || [],
        status: backupData.status || 'completed'
      };
    });

    // Trier par date (plus récent en premier)
    backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ 
      success: true, 
      backups,
      count: backups.length
    });
  } catch (error) {
    console.error('❌ Erreur liste backups:', error);
    return c.json({ 
      success: false, 
      message: error.message,
      backups: [] 
    }, 500);
  }
});

// Créer un backup
app.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const { tables = [], type = 'manual' } = body;

    console.log('🔧 Création backup:', { tables, type });

    if (!tables || tables.length === 0) {
      return c.json({ 
        success: false, 
        message: 'Aucune table sélectionnée' 
      }, 400);
    }

    // Créer l'ID du backup
    const backupId = `${type}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Récupérer les données de chaque table
    const backupData: any = {
      metadata: {
        id: backupId,
        name: `Backup ${type === 'auto' ? 'automatique' : 'manuel'} - ${new Date().toLocaleDateString('fr-FR')}`,
        timestamp,
        type,
        tables
      },
      data: {}
    };

    let totalSize = 0;

    for (const tableName of tables) {
      try {
        console.log(`📊 Récupération table: ${tableName}`);
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) {
          console.error(`❌ Erreur table ${tableName}:`, error);
          backupData.data[tableName] = { error: error.message, records: [] };
        } else {
          backupData.data[tableName] = {
            records: data || [],
            count: data?.length || 0
          };
          totalSize += JSON.stringify(data).length;
        }
      } catch (tableError) {
        console.error(`❌ Erreur récupération ${tableName}:`, tableError);
        backupData.data[tableName] = { 
          error: tableError.message, 
          records: [] 
        };
      }
    }

    // Calculer la taille
    const sizeKB = ((totalSize || 0) / 1024).toFixed(2);
    const sizeMB = ((totalSize || 0) / (1024 * 1024)).toFixed(2);
    const sizeFormatted = (totalSize || 0) > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    backupData.metadata.size = sizeFormatted;
    backupData.metadata.status = 'completed';

    // Sauvegarder dans le KV store
    await kv.set(`backup:${backupId}`, backupData);

    console.log('✅ Backup créé:', backupId);

    return c.json({
      success: true,
      message: 'Backup créé avec succès',
      backup: {
        id: backupId,
        name: backupData.metadata.name,
        timestamp,
        size: sizeFormatted,
        type,
        tables,
        status: 'completed'
      }
    });
  } catch (error) {
    console.error('❌ Erreur création backup:', error);
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500);
  }
});

// Télécharger un backup
app.get('/download/:backupId', async (c) => {
  try {
    const backupId = c.req.param('backupId');
    console.log('📥 Téléchargement backup:', backupId);

    const backupData = await kv.get(`backup:${backupId}`);

    if (!backupData) {
      return c.json({ 
        success: false, 
        message: 'Backup non trouvé' 
      }, 404);
    }

    return c.json({
      success: true,
      backup: backupData
    });
  } catch (error) {
    console.error('❌ Erreur téléchargement backup:', error);
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500);
  }
});

// Supprimer un backup
app.delete('/delete/:backupId', async (c) => {
  try {
    const backupId = c.req.param('backupId');
    console.log('🗑️ Suppression backup:', backupId);

    await kv.del(`backup:${backupId}`);

    return c.json({
      success: true,
      message: 'Backup supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur suppression backup:', error);
    return c.json({ 
      success: false, 
      message: error.message 
    }, 500);
  }
});

export default app;
