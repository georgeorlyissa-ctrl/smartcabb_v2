/**
 * 🔍 DEBUG MODAL - VOIR TOUS LES CONDUCTEURS ET LEURS CATÉGORIES
 * 
 * Affiche tous les conducteurs avec leurs informations détaillées
 * pour diagnostiquer les problèmes de matching
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { X, Search, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: string;
  is_available: boolean;
  account_balance: number;
  rawCategory: string;
  normalizedCategory: string;
}

export function DebugDriversModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/debug/drivers`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setDrivers(data.drivers || []);
        toast.success(`${data.driversCount} conducteur(s) trouvé(s)`);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      console.error('❌ Erreur debug:', error);
      toast.error('Impossible de récupérer les conducteurs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🔍 Debug Conducteurs</h2>
            <p className="text-sm text-gray-600 mt-1">
              Voir toutes les informations des conducteurs pour diagnostiquer le matching
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-3 mb-6">
            <Button
              onClick={fetchDrivers}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Charger les conducteurs
                </>
              )}
            </Button>
          </div>

          {/* Liste des conducteurs */}
          {drivers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Cliquez sur "Charger les conducteurs" pour voir les données</p>
            </div>
          ) : (
            <div className="space-y-4">
              {drivers.map((driver) => (
                <Card key={driver.id} className="p-4 border-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Nom</p>
                      <p className="font-semibold text-gray-900">{driver.name || 'Sans nom'}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Téléphone</p>
                      <p className="text-sm text-gray-700">{driver.phone}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Statut</p>
                      <div className="flex items-center gap-2">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            driver.status === 'approved' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {driver.status}
                        </span>
                        <span 
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            driver.is_available 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {driver.is_available ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Solde</p>
                      <p className="text-sm font-bold text-green-600">
                        {driver.account_balance?.toLocaleString() || 0} CDF
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Catégorie brute</p>
                      <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {driver.rawCategory || 'AUCUNE'}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Catégorie normalisée</p>
                      <p className="text-sm font-mono bg-blue-100 px-2 py-1 rounded font-bold">
                        {driver.normalizedCategory}
                      </p>
                    </div>
                  </div>

                  {/* Diagnostic */}
                  <div className="mt-3 pt-3 border-t">
                    {!driver.is_available && (
                      <p className="text-xs text-red-600">⚠️ Conducteur hors ligne</p>
                    )}
                    {driver.status !== 'approved' && (
                      <p className="text-xs text-yellow-600">⚠️ Conducteur non approuvé</p>
                    )}
                    {driver.account_balance < 19000 && (
                      <p className="text-xs text-orange-600">
                        ⚠️ Solde insuffisant (minimum ~19 950 CDF pour smart_standard)
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <p className="text-sm text-gray-600">
            💡 <strong>Matching requis:</strong> Conducteur = En ligne + Approuvé + Solde suffisant + Catégorie matching
          </p>
        </div>
      </Card>
    </div>
  );
}
