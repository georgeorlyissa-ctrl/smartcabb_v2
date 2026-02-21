import { motion } from '../lib/motion';
import { Card } from './ui/card';
import { Car, Star } from '../lib/icons';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAppState } from '../hooks/useAppState';
import { getVehicleDisplayName } from '../lib/vehicle-helpers';

export function AvailableDriversMap() {
  const { drivers } = useAppState();
  
  // Filtrer uniquement les conducteurs en ligne et disponibles
  const availableDrivers = drivers.filter(d => d.isOnline && d.documentsVerified);
  
  console.log('🚗 Conducteurs disponibles:', availableDrivers.length);

  // Positions aléatoires mais cohérentes pour les conducteurs sur la carte
  const driverPositions = [
    { top: '35%', left: '45%' },
    { top: '55%', left: '60%' },
    { top: '40%', left: '70%' },
    { top: '65%', left: '40%' },
    { top: '50%', left: '30%' },
    { top: '30%', left: '55%' },
  ];

  return (
    <>
      {availableDrivers.slice(0, 6).map((driver, index) => {
        const position = driverPositions[index] || driverPositions[0];
        
        return (
          <motion.div
            key={driver.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="absolute"
            style={{ top: position.top, left: position.left }}
          >
            {/* Icône de voiture animée */}
            <motion.div
              animate={{ 
                y: [0, -5, 0],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2,
                delay: index * 0.3
              }}
              className="relative"
            >
              {/* Badge avec photo et info */}
              <div className="group cursor-pointer">
                {/* Icône de voiture */}
                <div className="bg-blue-500 p-2 rounded-full shadow-lg border-2 border-white">
                  <Car className="w-4 h-4 text-white" />
                </div>
                
                {/* Tooltip au hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                  <div className="bg-white rounded-lg shadow-xl p-3 min-w-[180px] border border-gray-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <ImageWithFallback
                        src={driver.photo || ''}
                        alt={driver.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {driver.name.split(' ')[0]}
                        </p>
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          <span className="text-xs text-gray-600">{driver.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>{getVehicleDisplayName(driver.vehicleInfo)}</p>
                      <p className="text-gray-500">{driver.vehicleInfo?.plate || driver.vehicleInfo?.license_plate || 'N/A'}</p>
                    </div>
                  </div>
                  {/* Flèche du tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-8 border-transparent border-t-white" />
                  </div>
                </div>
              </div>

              {/* Pulse animation */}
              <motion.div
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 2,
                  delay: index * 0.3
                }}
                className="absolute inset-0 bg-blue-500 rounded-full"
                style={{ zIndex: -1 }}
              />
            </motion.div>
          </motion.div>
        );
      })}
      
      {/* Compteur de conducteurs disponibles */}
      {availableDrivers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20"
        >
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200">
            <div className="flex items-center space-x-2 text-sm">
              <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse" />
              <span className="font-medium text-gray-900">
                {availableDrivers.length} conducteur{availableDrivers.length > 1 ? 's' : ''} disponible{availableDrivers.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
