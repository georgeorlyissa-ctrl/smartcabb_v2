/**
 * 🧪 Composant de test pour vérifier les correctifs de superposition
 * Ce composant démontre les bonnes pratiques pour éviter les superpositions
 */

import { useState } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { User, Mail, Phone, MapPin } from '../../lib/icons';

export function TextOverflowTest() {
  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Test des correctifs de superposition</h1>

      {/* ✅ CORRECT - Avec protection overflow */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">✅ Correct (avec protection)</h2>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 min-w-0">
            <User className="w-5 h-5 flex-shrink-0 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="truncate">Jean-Baptiste Mbuyi Kalombo de la République</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 min-w-0">
            <Mail className="w-5 h-5 flex-shrink-0 text-green-500" />
            <div className="flex-1 min-w-0">
              <p className="truncate">jean.baptiste.mbuyi.kalombo@example.com</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 min-w-0">
            <Phone className="w-5 h-5 flex-shrink-0 text-purple-500" />
            <div className="flex-1 min-w-0">
              <p className="truncate">+243 999 999 999 999 999 999</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 min-w-0">
            <MapPin className="w-5 h-5 flex-shrink-0 text-red-500" />
            <div className="flex-1 min-w-0">
              <p className="truncate">
                Avenue de la République, Commune de Gombe, Kinshasa, République Démocratique du Congo
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ❌ INCORRECT - Sans protection (pour démonstration) */}
      <Card className="p-4 border-red-300">
        <h2 className="text-lg font-semibold mb-3 text-red-600">❌ Incorrect (sans protection)</h2>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-blue-500" />
            <div>
              <p>Jean-Baptiste Mbuyi Kalombo de la République</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-green-500" />
            <div>
              <p>jean.baptiste.mbuyi.kalombo@example.com</p>
            </div>
          </div>
        </div>
      </Card>

      {/* 📊 Stats Card Test */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">📊 Stats Card (avec protection)</h2>
        
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">💰</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-600 truncate">Gains d'aujourd'hui</p>
            <p className="text-xl font-bold truncate">145,750 CDF</p>
          </div>
        </div>
      </Card>

      {/* 📝 Résumé des correctifs */}
      <Card className="p-4 bg-green-50">
        <h2 className="text-lg font-semibold mb-2">✅ Correctifs appliqués</h2>
        <ul className="text-sm space-y-1 text-green-800">
          <li>• min-w-0 sur les conteneurs flex</li>
          <li>• flex-shrink-0 sur les icônes</li>
          <li>• truncate sur les textes longs</li>
          <li>• flex-1 pour l'espace flexible</li>
        </ul>
      </Card>
    </div>
  );
}