import { useState, useEffect } from 'react';
import { Clock, Play, Pause } from '../lib/icons';
import { Card } from './ui/card';

// ✅ v517.76 - Protection toLocaleString ajoutée
interface RideTimerProps {
  isActive: boolean;
  startTime?: Date;
  hourlyRate: number;
  onTimeUpdate?: (minutes: number, cost: number) => void;
  showWaitingTime?: boolean;
}

export function RideTimer({ 
  isActive, 
  startTime, 
  hourlyRate, 
  onTimeUpdate,
  showWaitingTime = false 
}: RideTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0); // en secondes
  const [isWaiting, setIsWaiting] = useState(showWaitingTime);
  const [waitingTime, setWaitingTime] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const start = startTime || now;
      const diffInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
      
      if (showWaitingTime && diffInSeconds < 600) { // 10 minutes de waiting
        setIsWaiting(true);
        setWaitingTime(diffInSeconds);
      } else {
        setIsWaiting(false);
        const billingTime = diffInSeconds - (showWaitingTime ? 600 : 0);
        setElapsedTime(Math.max(0, billingTime));
        
        // Calculer le coût
        const minutes = billingTime / 60;
        const cost = Math.ceil(minutes / 60) * hourlyRate; // Facturation par heure entamée
        
        onTimeUpdate?.(minutes, cost);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime, hourlyRate, showWaitingTime]); // Retirer onTimeUpdate des dépendances

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateCost = () => {
    const minutes = elapsedTime / 60;
    const hours = Math.ceil(minutes / 60);
    return hours * hourlyRate;
  };

  if (!isActive) return null;

  return (
    <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-full">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">
                {isWaiting ? 'Temps d\'attente' : 'Temps de course'}
              </span>
              {isActive && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="text-xl font-mono font-bold text-gray-900">
              {formatTime(isWaiting ? waitingTime : elapsedTime)}
            </div>
          </div>
        </div>
        
        {!isWaiting && (
          <div className="text-right">
            <div className="text-sm font-medium text-gray-600">Coût actuel</div>
            <div className="text-lg font-bold text-green-600">
              {(calculateCost() || 0).toLocaleString()} CDF
            </div>
            <div className="text-xs text-gray-500">
              {hourlyRate}$ CDF/heure
            </div>
          </div>
        )}
        
        {isWaiting && (
          <div className="text-right">
            <div className="text-sm font-medium text-amber-600">Attente gratuite</div>
            <div className="text-xs text-gray-500">
              {Math.max(0, 600 - waitingTime)}s restantes
            </div>
          </div>
        )}
      </div>
      
      {isWaiting && waitingTime >= 590 && (
        <div className="mt-3 p-2 bg-amber-100 rounded-lg">
          <p className="text-xs text-amber-800">
            La facturation commencera dans {600 - waitingTime} secondes
          </p>
        </div>
      )}
    </Card>
  );
}