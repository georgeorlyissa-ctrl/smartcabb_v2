import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Car, Users, DollarSign, TrendingUp, MapPin, Clock, RefreshCw, Star } from '../lib/icons';
import { Card } from './ui/card';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';

export function LiveStatsPanel() {
  const [stats, setStats] = useState({
    onlineDrivers: 0,
    totalDrivers: 0,
    activeRides: 0,
    completedToday: 0,
    totalRevenue: 0,
    totalPassengers: 0,
    totalRides: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ Charger les vraies données depuis le backend UNE SEULE FOIS
  useEffect(() => {
    loadStats();
    // ❌ PAS de rechargement automatique
  }, []);

  const loadStats = async () => {
    try {
      // Charger les stats d'overview depuis le backend
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/stats/overview`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Stats chargées depuis le backend:', data);

        if (data.success && data.stats) {
          setStats({
            onlineDrivers: data.stats.allTime?.onlineDrivers || 0,
            totalDrivers: data.stats.allTime?.totalDrivers || 0,
            activeRides: data.stats.allTime?.activeRides || 0,
            completedToday: data.stats.today?.rides || 0,
            totalRevenue: data.stats.allTime?.totalRevenue || 0,
            totalPassengers: data.stats.allTime?.totalPassengers || 0,
            totalRides: data.stats.allTime?.totalRides || 0,
            averageRating: data.stats.allTime?.averageRating || 0
          });
        }
      } else {
        console.error('❌ Erreur chargement stats:', await response.text());
      }
    } catch (error) {
      console.error('❌ Erreur réseau stats:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // ✅ Fonction pour actualiser manuellement
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadStats();
  };

  const statsCards = [
    {
      label: 'Conducteurs en ligne',
      value: `${stats.onlineDrivers}/${stats.totalDrivers}`,
      icon: Car,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: stats.onlineDrivers > 0 ? '+live' : null
    },
    {
      label: 'Courses actives',
      value: stats.activeRides,
      icon: MapPin,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: stats.activeRides > 0 ? 'en cours' : null
    },
    {
      label: 'Courses complétées',
      value: stats.completedToday,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: 'aujourd\'hui'
    },
    {
      label: 'Revenus totaux',
      value: `${(stats.totalRevenue || 0).toLocaleString('fr-FR')} CDF`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: stats.completedToday > 0 ? `+${stats.completedToday} aujourd'hui` : null
    },
    {
      label: 'Passagers actifs',
      value: stats.totalPassengers,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      trend: null
    },
    {
      label: 'Courses totales',
      value: stats.totalRides,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: `${stats.completedToday} complétées`
    },
    {
      label: 'Note moyenne',
      value: stats.averageRating.toFixed(1),
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      trend: null
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ✅ Bouton Actualiser */}
      <div className="flex justify-end">
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    {stat.trend && (
                      <p className="text-xs text-gray-500 mt-1">
                        {stat.trend}
                      </p>
                    )}
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                
                {/* Barre de progression pour conducteurs en ligne */}
                {stat.label === 'Conducteurs en ligne' && stats.totalDrivers > 0 && (
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(stats.onlineDrivers / stats.totalDrivers) * 100}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className="h-full bg-blue-500"
                      />
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}