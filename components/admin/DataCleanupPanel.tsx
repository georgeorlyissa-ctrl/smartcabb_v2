/**
 * 🧹 PANNEAU DE NETTOYAGE DES DONNÉES
 * Interface admin pour nettoyer les données de test avant les tests avec vraies données
 */

import { useState } from 'react';
import { motion, AnimatePresence } from '../../lib/motion';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { 
  Trash2, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  BarChart,
  Users,
  Car,
  MapPin,
  Tag,
  Megaphone,
  Wallet,
  Bell,
  MessageSquare,
  Phone,
  ArrowLeft
} from '../../lib/admin-icons';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';

interface DataStats {
  rides: number;
  passengers: number;
  drivers: number;
  vehicles: number;
  profiles: number;
  promoCodes: number;
  campaigns: number;
  walletTransactions: number;
  notifications: number;
  messages: number;
  sms: number;
  contacts: number;
  backups: number;
}

export function DataCleanupPanel() {
  const { setCurrentScreen } = useAppState();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DataStats | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [cleanupType, setCleanupType] = useState<'all' | 'rides' | 'drivers' | null>(null);

  // Charger les statistiques
  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/reset/database-stats`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      // Convertir le nouveau format vers l'ancien format
      const convertedStats: DataStats = {
        rides: data.tables?.find((t: any) => t.name === 'rides')?.count || 0,
        passengers: data.tables?.find((t: any) => t.name === 'profiles')?.count || 0,
        drivers: data.tables?.find((t: any) => t.name === 'drivers')?.count || 0,
        vehicles: data.tables?.find((t: any) => t.name === 'vehicles')?.count || 0,
        profiles: data.tables?.find((t: any) => t.name === 'profiles')?.count || 0,
        promoCodes: data.tables?.find((t: any) => t.name === 'promo_codes')?.count || 0,
        campaigns: 0, // Pas de table campaigns
        walletTransactions: data.tables?.find((t: any) => t.name === 'transactions')?.count || 0,
        notifications: data.tables?.find((t: any) => t.name === 'notifications')?.count || 0,
        messages: 0, // Pas de table messages
        sms: 0, // Pas de table sms
        contacts: 0, // Pas de table contacts
        backups: 0 // Pas de table backups
      };

      setStats(convertedStats);
      console.log('📊 Statistiques chargées:', convertedStats);
    } catch (error: any) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Nettoyer les données
  const performCleanup = async (type: 'all' | 'rides' | 'drivers') => {
    setLoading(true);
    try {
      // Mapper les types vers les nouveaux endpoints
      const endpointMap = {
        'all': 'reset-users-only', // Supprime users mais garde les settings
        'rides': 'reset-rides-only', // Supprime seulement les rides
        'drivers': 'reset-users-only' // Pour drivers, on utilise users-only aussi
      };
      
      const endpoint = endpointMap[type];
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/reset/${endpoint}`;
      console.log('🧹 Nettoyage en cours...', { type, endpoint, url });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Réponse serveur:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur HTTP:', errorText);
        toast.error(`Erreur HTTP ${response.status}: ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log('📦 Données reçues:', data);

      if (data.success) {
        const message = `✅ Nettoyage réussi ! ${data.summary.totalDeleted} lignes supprimées dans ${data.summary.tablesCleared} tables`;
        toast.success(message, { duration: 5000 });
        
        // Afficher les détails
        console.log('✅ Données supprimées:', data.cleared);
        
        // Recharger les stats
        await loadStats();
      } else {
        console.error('❌ Échec:', data);
        toast.error('Erreur lors du nettoyage');
        
        if (data.errors && data.errors.length > 0) {
          console.error('❌ Erreurs détaillées:', data.errors);
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur réseau:', error);
      toast.error(`Erreur de connexion: ${error.message}`);
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
      setCleanupType(null);
    }
  };

  // Demander confirmation
  const requestCleanup = (type: 'all' | 'rides' | 'drivers') => {
    setCleanupType(type);
    setShowConfirmDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Bouton retour */}
      <Button
        onClick={() => setCurrentScreen('admin-dashboard')}
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground -mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour au tableau de bord
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">🧹 Nettoyage des données</h2>
          <p className="text-muted-foreground mt-1">
            Préparez l'application pour les tests avec vraies données
          </p>
        </div>
        <Button
          onClick={loadStats}
          disabled={loading}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <BarChart className="w-4 h-4 mr-2" />
          )}
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          <StatCard
            icon={MapPin}
            label="Courses"
            value={stats.rides}
            color="blue"
          />
          <StatCard
            icon={Users}
            label="Passagers"
            value={stats.passengers}
            color="purple"
          />
          <StatCard
            icon={Car}
            label="Chauffeurs"
            value={stats.drivers}
            color="green"
          />
          <StatCard
            icon={Tag}
            label="Promos"
            value={stats.promoCodes}
            color="orange"
          />
          <StatCard
            icon={Wallet}
            label="Transactions"
            value={stats.walletTransactions}
            color="pink"
          />
          <StatCard
            icon={Megaphone}
            label="Campagnes"
            value={stats.campaigns}
            color="cyan"
          />
          <StatCard
            icon={Bell}
            label="Notifications"
            value={stats.notifications}
            color="yellow"
          />
          <StatCard
            icon={MessageSquare}
            label="Messages"
            value={stats.messages}
            color="indigo"
          />
          <StatCard
            icon={Phone}
            label="SMS"
            value={stats.sms}
            color="red"
          />
          <StatCard
            icon={Database}
            label="Total"
            value={Object.values(stats).reduce((a, b) => a + b, 0)}
            color="gray"
          />
        </motion.div>
      )}

      {/* Actions de nettoyage */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Nettoyer tout sauf comptes */}
        <Card className="p-6 border-2 border-orange-200 bg-orange-50/50">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">
                Nettoyage complet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supprime toutes les courses, chauffeurs, promos, transactions...
                <span className="block font-semibold text-green-600 mt-1">
                  ✅ Conserve les comptes utilisateurs
                </span>
              </p>
              <Button
                onClick={() => requestCleanup('all')}
                disabled={loading || !stats}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Nettoyer tout
              </Button>
            </div>
          </div>
        </Card>

        {/* Nettoyer courses uniquement */}
        <Card className="p-6 border-2 border-blue-200 bg-blue-50/50">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">
                Courses uniquement
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supprime uniquement l'historique des courses
              </p>
              <Button
                onClick={() => requestCleanup('rides')}
                disabled={loading || !stats || stats.rides === 0}
                variant="outline"
                className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Nettoyer {stats?.rides || 0} courses
              </Button>
            </div>
          </div>
        </Card>

        {/* Nettoyer chauffeurs uniquement */}
        <Card className="p-6 border-2 border-green-200 bg-green-50/50">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">
                Chauffeurs uniquement
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supprime les chauffeurs et leurs véhicules
              </p>
              <Button
                onClick={() => requestCleanup('drivers')}
                disabled={loading || !stats || stats.drivers === 0}
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-50"
              >
                <Car className="w-4 h-4 mr-2" />
                Nettoyer {stats?.drivers || 0} chauffeurs
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Avertissement */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">⚠️ Important</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Cette action est <strong>irréversible</strong></li>
              <li>Faites une sauvegarde avant si nécessaire</li>
              <li>Les comptes utilisateurs (profiles) sont toujours conservés</li>
              <li>Idéal avant de partager l'app pour des tests avec vraies données</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Dialogue de confirmation */}
      <AnimatePresence>
        {showConfirmDialog && cleanupType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-center mb-2">
                Confirmer le nettoyage
              </h3>

              <p className="text-center text-muted-foreground mb-6">
                {cleanupType === 'all' && (
                  <>Voulez-vous vraiment supprimer <strong>toutes les données de simulation</strong> ? Les comptes utilisateurs seront conservés.</>
                )}
                {cleanupType === 'rides' && (
                  <>Voulez-vous vraiment supprimer <strong>toutes les courses</strong> ?</>
                )}
                {cleanupType === 'drivers' && (
                  <>Voulez-vous vraiment supprimer <strong>tous les chauffeurs</strong> ?</>
                )}
              </p>

              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowConfirmDialog(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => performCleanup(cleanupType)}
                  variant="destructive"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Nettoyage...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Confirmer
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Composant StatCard
interface StatCardProps {
  icon: any;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    pink: 'bg-pink-100 text-pink-600',
    cyan: 'bg-cyan-100 text-cyan-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <Card className="p-4">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}