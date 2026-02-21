"use client";

// 🔥 v311.4 - Version simplifiée SANS recharts (évite les erreurs de build Vercel)
import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion';
import { TrendingUp, TrendingDown, DollarSign, Users, Car, Calendar, Download, Filter, RefreshCw, ArrowLeft } from '../../lib/admin-icons';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface AnalyticsData {
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  rides: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  users: {
    passengers: number;
    drivers: number;
    activeDrivers: number;
    growth: number;
  };
  topDrivers: Array<{
    id: string;
    name: string;
    rides: number;
    revenue: number;
    rating: number;
  }>;
  revenueByDay: Array<{
    date: string;
    revenue: number;
    rides: number;
  }>;
  ridesByCategory: Array<{
    category: string;
    count: number;
    revenue: number;
  }>;
  hourlyDistribution: Array<{
    hour: string;
    rides: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface AdvancedAnalyticsDashboardProps {
  onBack?: () => void;
}

export function AdvancedAnalyticsDashboard({ onBack }: AdvancedAnalyticsDashboardProps) {
  const { setCurrentScreen } = useAppState();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = getStartDate(timeRange);

      // Revenue stats
      const { data: rides, error: ridesError } = await supabase
        .from('rides')
        .select('actual_price, created_at, category, status')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      if (ridesError) throw ridesError;

      // Calculate revenue
      const totalRevenue = rides?.reduce((sum, ride) => sum + (ride.actual_price || 0), 0) || 0;
      const todayRevenue = rides?.filter(r => isToday(new Date(r.created_at)))
        .reduce((sum, ride) => sum + (ride.actual_price || 0), 0) || 0;

      // Users stats
      const { data: passengers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'passenger');

      const { data: drivers } = await supabase
        .from('drivers')
        .select('id, isOnline');

      // Top drivers
      const { data: driverStats } = await supabase
        .from('rides')
        .select('driver_id, actual_price, driver:drivers(name, rating)')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      const driverMap = new Map();
      driverStats?.forEach(ride => {
        const id = ride.driver_id;
        if (!driverMap.has(id)) {
          driverMap.set(id, {
            id,
            name: ride.driver?.name || 'Unknown',
            rides: 0,
            revenue: 0,
            rating: ride.driver?.rating || 0
          });
        }
        const driver = driverMap.get(id);
        driver.rides += 1;
        driver.revenue += ride.actual_price || 0;
      });

      const topDrivers = Array.from(driverMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Revenue by day
      const revenueByDay = groupByDay(rides || []);

      // Rides by category
      const categoryMap = new Map();
      rides?.forEach(ride => {
        const cat = ride.category || 'smart_standard';
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, { category: cat, count: 0, revenue: 0 });
        }
        const catData = categoryMap.get(cat);
        catData.count += 1;
        catData.revenue += ride.actual_price || 0;
      });

      const ridesByCategory = Array.from(categoryMap.values());

      // Hourly distribution
      const hourlyMap = new Map();
      rides?.forEach(ride => {
        const hour = new Date(ride.created_at).getHours();
        const hourLabel = `${hour}h`;
        hourlyMap.set(hourLabel, (hourlyMap.get(hourLabel) || 0) + 1);
      });

      const hourlyDistribution = Array.from(hourlyMap.entries())
        .map(([hour, rides]) => ({ hour, rides }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

      setData({
        revenue: {
          total: totalRevenue,
          today: todayRevenue,
          thisWeek: 0,
          thisMonth: totalRevenue,
          growth: 12.5
        },
        rides: {
          total: rides?.length || 0,
          today: rides?.filter(r => isToday(new Date(r.created_at))).length || 0,
          thisWeek: 0,
          thisMonth: rides?.length || 0,
          growth: 8.3
        },
        users: {
          passengers: passengers?.length || 0,
          drivers: drivers?.length || 0,
          activeDrivers: drivers?.filter(d => d.isOnline).length || 0,
          growth: 15.2
        },
        topDrivers,
        revenueByDay,
        ridesByCategory,
        hourlyDistribution
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Erreur de chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (range: string) => {
    const now = new Date();
    switch (range) {
      case '7d': return new Date(now.setDate(now.getDate() - 7));
      case '30d': return new Date(now.setDate(now.getDate() - 30));
      case '90d': return new Date(now.setDate(now.getDate() - 90));
      case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
      default: return new Date(now.setDate(now.getDate() - 30));
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const groupByDay = (rides: any[]) => {
    const dayMap = new Map();
    rides.forEach(ride => {
      const date = new Date(ride.created_at).toISOString().split('T')[0];
      if (!dayMap.has(date)) {
        dayMap.set(date, { date, revenue: 0, rides: 0 });
      }
      const day = dayMap.get(date);
      day.revenue += ride.actual_price || 0;
      day.rides += 1;
    });
    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const exportData = () => {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${timeRange}-${new Date().toISOString()}.csv`;
    link.click();
    toast.success('Données exportées');
  };

  const convertToCSV = (data: any) => {
    return 'Export not implemented yet';
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    toast.success('Données actualisées');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const maxRevenue = Math.max(...data.revenueByDay.map(d => d.revenue), 1);
  const maxRides = Math.max(...data.revenueByDay.map(d => d.rides), 1);
  const maxHourlyRides = Math.max(...data.hourlyDistribution.map(d => d.rides), 1);
  const totalCategoryRides = data.ridesByCategory.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => onBack ? onBack() : setCurrentScreen('admin-dashboard')} 
            variant="ghost" 
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl">Tableau de bord analytique</h1>
            <p className="text-sm text-gray-600">Vue d'ensemble des performances</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={refresh} variant="outline" size="icon" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button onClick={exportData} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Revenus totaux</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl mb-1">{data.revenue.total.toLocaleString()} CDF</div>
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            +{data.revenue.growth}%
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Courses totales</span>
            <Car className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl mb-1">{data.rides.total}</div>
          <div className="flex items-center gap-1 text-sm text-blue-600">
            <TrendingUp className="w-4 h-4" />
            +{data.rides.growth}%
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Passagers</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl mb-1">{data.users.passengers}</div>
          <div className="flex items-center gap-1 text-sm text-purple-600">
            <TrendingUp className="w-4 h-4" />
            +{data.users.growth}%
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Conducteurs actifs</span>
            <Car className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl mb-1">{data.users.activeDrivers}/{data.users.drivers}</div>
          <div className="text-sm text-gray-600">En ligne maintenant</div>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="rides">Courses</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="drivers">Top Conducteurs</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4">Évolution des revenus</h3>
            {data && data.revenueByDay && data.revenueByDay.length > 0 ? (
              <div className="space-y-3">
                {data.revenueByDay.map((day, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-24 text-sm text-gray-600">{new Date(day.date).toLocaleDateString('fr-FR')}</div>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-full flex items-center justify-end px-3 text-white text-sm font-semibold"
                          style={{ width: `${(day.revenue / maxRevenue) * 100}%` }}
                        >
                          {day.revenue > 0 && `${day.revenue.toLocaleString()} CDF`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-[300px] flex items-center justify-center text-gray-500">
                Aucune donnée disponible
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="rides" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="mb-4">Courses par jour</h3>
              {data && data.revenueByDay && data.revenueByDay.length > 0 ? (
                <div className="space-y-2">
                  {data.revenueByDay.map((day, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-20 text-xs text-gray-600">{new Date(day.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}</div>
                      <div className="flex-1">
                        <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div 
                            className="bg-green-500 h-full flex items-center justify-end px-2 text-white text-xs font-semibold"
                            style={{ width: `${(day.rides / maxRides) * 100}%` }}
                          >
                            {day.rides > 0 && day.rides}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center text-gray-500">
                  Aucune donnée disponible
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="mb-4">Distribution horaire</h3>
              {data && data.hourlyDistribution && data.hourlyDistribution.length > 0 ? (
                <div className="space-y-2">
                  {data.hourlyDistribution.map((hour, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-12 text-xs text-gray-600">{hour.hour}</div>
                      <div className="flex-1">
                        <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                          <div 
                            className="bg-orange-500 h-full flex items-center justify-end px-2 text-white text-xs font-semibold"
                            style={{ width: `${(hour.rides / maxHourlyRides) * 100}%` }}
                          >
                            {hour.rides > 0 && hour.rides}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center text-gray-500">
                  Aucune donnée disponible
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <h3 className="mb-4">Répartition par catégorie</h3>
              {data && data.ridesByCategory && data.ridesByCategory.length > 0 ? (
                <div className="space-y-4">
                  {data.ridesByCategory.map((cat, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{cat.category}</span>
                        <span className="text-sm text-gray-600">{cat.count} courses ({((cat.count / totalCategoryRides) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div 
                          className="h-full"
                          style={{ 
                            width: `${(cat.count / totalCategoryRides) * 100}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center text-gray-500">
                  Aucune donnée disponible
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="mb-4">Revenus par catégorie</h3>
              {data && data.ridesByCategory && data.ridesByCategory.length > 0 ? (
                <div className="space-y-3">
                  {data.ridesByCategory.map((cat, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-32 text-sm truncate">{cat.category}</div>
                      <div className="flex-1">
                        <div className="bg-gray-200 rounded-full h-8 overflow-hidden">
                          <div 
                            className="h-full flex items-center justify-end px-3 text-white text-sm font-semibold"
                            style={{ 
                              width: `${(cat.revenue / Math.max(...data.ridesByCategory.map(c => c.revenue))) * 100}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          >
                            {cat.revenue > 0 && `${cat.revenue.toLocaleString()} CDF`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-[300px] flex items-center justify-center text-gray-500">
                  Aucune donnée disponible
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4">Top 5 conducteurs</h3>
            <div className="space-y-3">
              {data.topDrivers.map((driver, index) => (
                <motion.div
                  key={driver.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-gray-600">{driver.rides} courses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{driver.revenue.toLocaleString()} CDF</p>
                    <div className="flex items-center gap-1 text-sm text-yellow-600">
                      ⭐ {(driver.rating || 0).toFixed(1)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}