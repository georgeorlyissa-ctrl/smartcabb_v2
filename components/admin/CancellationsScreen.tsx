"use client";

import { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { motion } from '../../lib/motion';
import { XCircle, User, Clock, DollarSign, MapPin, Calendar, AlertTriangle, RefreshCw, Filter, ArrowLeft } from '../../lib/icons';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';

interface Cancellation {
  id: string;
  rideId: string;
  userId: string;
  userType: 'passenger' | 'driver';
  userName: string;
  userPhone: string;
  reason: string;
  cancelledAt: string;
  pickup: {
    address: string;
  };
  destination: {
    address: string;
  };
  estimatedPrice: number;
  vehicleType: string;
  rideStatus: string;
  penaltyAmount?: number;
  penaltyApplied?: boolean;
}

interface CancellationStats {
  total: number;
  byPassengers: number;
  byDrivers: number;
  withPenalty: number;
  totalPenalties: number;
}

export function CancellationsScreen() {
  const { setCurrentScreen } = useAppState();
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [stats, setStats] = useState<CancellationStats>({
    total: 0,
    byPassengers: 0,
    byDrivers: 0,
    withPenalty: 0,
    totalPenalties: 0
  });
  const [byReason, setByReason] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'passenger' | 'driver'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCancellations();
  }, []);

  const loadCancellations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/admin/cancellations`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('📋 Annulations chargées:', data);
        
        if (data.success) {
          setCancellations(data.cancellations || []);
          setStats(data.stats || {
            total: 0,
            byPassengers: 0,
            byDrivers: 0,
            withPenalty: 0,
            totalPenalties: 0
          });
          setByReason(data.byReason || {});
        }
      } else {
        console.error('❌ Erreur chargement annulations:', await response.text());
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCancellations = cancellations.filter(c => {
    // Filtre par type
    if (filterType !== 'all' && c.userType !== filterType) {
      return false;
    }
    
    // Filtre par recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        c.userName.toLowerCase().includes(search) ||
        c.userPhone.includes(search) ||
        c.reason.toLowerCase().includes(search) ||
        c.rideId.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => setCurrentScreen('admin-dashboard')} 
            variant="outline" 
            size="sm"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Historique des annulations</h1>
            <p className="text-gray-600 mt-1">Toutes les courses annulées avec leurs raisons</p>
          </div>
        </div>
        <Button onClick={loadCancellations} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total annulations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Par passagers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byPassengers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Par conducteurs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byDrivers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avec pénalité</p>
              <p className="text-2xl font-bold text-gray-900">{stats.withPenalty}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pénalités totales</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalPenalties.toLocaleString('fr-FR')} CDF</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Raisons principales */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Raisons d'annulation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(byReason)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([reason, count]) => (
              <div key={reason} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">{reason}</p>
                <p className="text-xl font-bold text-gray-900">{count} fois</p>
              </div>
            ))}
        </div>
      </Card>

      {/* Filtres */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
              size="sm"
            >
              Tous ({cancellations.length})
            </Button>
            <Button
              variant={filterType === 'passenger' ? 'default' : 'outline'}
              onClick={() => setFilterType('passenger')}
              size="sm"
            >
              Passagers ({stats.byPassengers})
            </Button>
            <Button
              variant={filterType === 'driver' ? 'default' : 'outline'}
              onClick={() => setFilterType('driver')}
              size="sm"
            >
              Conducteurs ({stats.byDrivers})
            </Button>
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, raison..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Card>

      {/* Liste des annulations */}
      <div className="space-y-3">
        {filteredCancellations.length === 0 ? (
          <Card className="p-8 text-center">
            <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Aucune annulation trouvée</p>
          </Card>
        ) : (
          filteredCancellations.map((cancellation, index) => (
            <motion.div
              key={cancellation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Utilisateur */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        cancellation.userType === 'passenger' 
                          ? 'bg-blue-100' 
                          : 'bg-purple-100'
                      }`}>
                        <User className={`w-5 h-5 ${
                          cancellation.userType === 'passenger'
                            ? 'text-blue-600'
                            : 'text-purple-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{cancellation.userName}</p>
                        <p className="text-sm text-gray-600">
                          {cancellation.userType === 'passenger' ? 'Passager' : 'Conducteur'} • {cancellation.userPhone}
                        </p>
                      </div>
                    </div>

                    {/* Trajet */}
                    <div className="flex items-start gap-3 pl-11">
                      <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                      <div className="text-sm">
                        <p className="text-gray-600">
                          <span className="font-medium">De:</span> {cancellation.pickup.address}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">À:</span> {cancellation.destination.address}
                        </p>
                      </div>
                    </div>

                    {/* Raison */}
                    <div className="flex items-start gap-3 pl-11">
                      <AlertTriangle className="w-4 h-4 text-orange-500 mt-1" />
                      <div className="text-sm">
                        <p className="text-gray-600">
                          <span className="font-medium">Raison:</span> {cancellation.reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Détails à droite */}
                  <div className="text-right space-y-2">
                    <div className="flex items-center gap-2 justify-end text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(cancellation.cancelledAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {cancellation.vehicleType}
                    </p>
                    <p className="text-sm text-gray-600">
                      {cancellation.estimatedPrice.toLocaleString('fr-FR')} CDF
                    </p>
                    {cancellation.penaltyApplied && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        Pénalité: {cancellation.penaltyAmount?.toLocaleString('fr-FR')} CDF
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      État: {cancellation.rideStatus}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}