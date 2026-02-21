import { motion } from '../lib/motion';
import { Card } from './ui/card';
import { useAppState } from '../hooks/useAppState';

// Icônes inline (évite import lucide-react)
const MapPinIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const DollarSignIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

interface ActiveRidesListProps {
  onAcceptRide?: (rideId: string) => void;
  showPassengerInfo?: boolean;
}

export function ActiveRidesList({ onAcceptRide, showPassengerInfo = false }: ActiveRidesListProps) {
  const { rides, passengers } = useAppState();

  // Filtrer les courses en attente ou actives
  const activeRides = rides.filter(r => 
    r.status === 'pending' || 
    r.status === 'in_progress' || 
    r.status === 'accepted'
  );

  if (activeRides.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-sm mx-auto">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPinIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune course active
          </h3>
          <p className="text-sm text-gray-600">
            Les nouvelles demandes de course apparaîtront ici
          </p>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">En attente</Badge>;
      case 'accepted':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Acceptée</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-100 text-green-800 border-green-200">En cours</Badge>;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-l-yellow-500';
      case 'accepted':
        return 'border-l-blue-500';
      case 'in_progress':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Courses actives ({activeRides.length})
        </h3>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-3 h-3 bg-green-500 rounded-full"
        />
      </div>

      {activeRides.map((ride, index) => {
        const passenger = passengers.find(p => p.id === ride.passengerId);
        
        return (
          <motion.div
            key={ride.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-4 border-l-4 ${getStatusColor(ride.status)} hover:shadow-lg transition-shadow`}>
              <div className="space-y-3">
                {/* En-tête avec statut */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 font-mono">#{ride.id.slice(-6)}</span>
                    {getStatusBadge(ride.status)}
                  </div>
                  {ride.confirmationCode && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Code</p>
                      <p className="font-mono font-bold text-blue-600">{ride.confirmationCode}</p>
                    </div>
                  )}
                </div>

                {/* Info passager */}
                {showPassengerInfo && passenger && (
                  <div className="flex items-center space-x-2 pb-2 border-b">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{passenger.name}</span>
                  </div>
                )}

                {/* Trajet */}
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <div className="mt-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Départ</p>
                      <p className="text-sm text-gray-900">{ride.pickup.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <div className="mt-1">
                      <MapPinIcon className="w-3 h-3 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Destination</p>
                      <p className="text-sm text-gray-900">{ride.destination.address}</p>
                    </div>
                  </div>
                </div>

                {/* Détails */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <ClockIcon className="w-4 h-4" />
                      <span>{ride.estimatedDuration} min</span>
                    </div>
                    <div className="flex items-center space-x-1 text-green-600 font-semibold">
                      <DollarSignIcon className="w-4 h-4" />
                      <span>{(ride.estimatedPrice || 0).toLocaleString('fr-FR')} CDF</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {ride.status === 'pending' && onAcceptRide && (
                    <Button
                      onClick={() => onAcceptRide(ride.id)}
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      Accepter
                    </Button>
                  )}
                  
                  {ride.status === 'in_progress' && (
                    <Badge className="bg-green-500 text-white">
                      <motion.div
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="flex items-center space-x-1"
                      >
                        <div className="w-2 h-2 bg-white rounded-full" />
                        <span>En cours...</span>
                      </motion.div>
                    </Badge>
                  )}
                </div>

                {/* Heure de création */}
                <div className="text-xs text-gray-400 text-right">
                  Demandée il y a {Math.floor((Date.now() - new Date(ride.createdAt).getTime()) / 60000)} min
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}