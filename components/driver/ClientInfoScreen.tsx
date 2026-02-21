import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';
import { GoogleMapView } from '../GoogleMapView';
import { motion } from '../../lib/motion'; // ✅ FIX: Import depuis lib/motion au lieu de motion/react
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useAppState } from '../../hooks/useAppState';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Star,
  MapPin,
  Calendar,
  MessageCircle,
  Shield,
  ChevronDown,
  Play
} from '../../lib/icons';
import { useState, useEffect } from 'react';

export function ClientInfoScreen() {
  const { setCurrentScreen, passengers, state } = useAppState();
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // ✅ CORRECTION: Obtenir le passager depuis la course en cours
  const currentRide = state.currentRide;
  const passengerId = currentRide?.passengerId || currentRide?.userId;

  // ✅ CHARGER LES VRAIES DONNÉES DU PASSAGER DEPUIS LE BACKEND
  useEffect(() => {
    const fetchPassengerData = async () => {
      if (!passengerId) {
        console.error('❌ Pas de passengerId dans la course');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Chargement des données du passager:', passengerId);
        
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${passengerId}`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Données passager reçues:', data);
        
        if (data.success && data.passenger) {
          setClientData({
            id: data.passenger.id,
            name: data.passenger.name || data.passenger.full_name || 'Passager',
            phone: data.passenger.phone || '',
            email: data.passenger.email || '',
            address: data.passenger.address || currentRide?.pickup?.address || '',
            totalRides: data.passenger.total_rides || data.passenger.totalRides || 0,
            registeredAt: data.passenger.created_at || data.passenger.registeredAt || new Date().toISOString(),
            favoritePaymentMethod: data.passenger.favorite_payment_method || data.passenger.favoritePaymentMethod || 'cash'
          });
        } else {
          // Fallback vers les données locales
          const localPassenger = passengers.find((p: any) => p.id === passengerId);
          if (localPassenger) {
            setClientData(localPassenger);
          }
        }
      } catch (error) {
        console.error('❌ Erreur chargement passager:', error);
        // Fallback vers les données locales
        const localPassenger = passengers.find((p: any) => p.id === passengerId);
        if (localPassenger) {
          setClientData(localPassenger);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPassengerData();
  }, [passengerId]);
  
  // ✅ SÉCURITÉ: Si aucun passager trouvé, afficher un écran d'erreur
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Chargement...</h2>
            <p className="text-gray-600">
              Récupération des informations du passager.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold">Passager non trouvé</h2>
            <p className="text-gray-600">
              Impossible de charger les informations du passager.
            </p>
            <Button 
              onClick={() => setCurrentScreen('navigation')}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la navigation
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const handleCallClient = () => {
    // ✅ Appeler via téléphone
    if (clientData.phone) {
      window.open(`tel:${clientData.phone}`, '_self');
    } else {
      alert('Numéro de téléphone non disponible');
    }
  };

  const handleCallClientWhatsApp = () => {
    // ✅ Appeler via WhatsApp
    if (clientData.phone) {
      // Format du numéro pour WhatsApp (enlever les espaces, +, tirets, parenthèses)
      let cleanPhone = clientData.phone.replace(/[\s\-\(\)\+]/g, '');
      
      // Si le numéro commence par 0, remplacer par 243 (indicatif RDC)
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '243' + cleanPhone.substring(1);
      }
      
      // Si le numéro ne commence pas par 243, l'ajouter
      if (!cleanPhone.startsWith('243')) {
        cleanPhone = '243' + cleanPhone;
      }
      
      const whatsappUrl = `https://wa.me/${cleanPhone}`;
      console.log('📞 WhatsApp:', { original: clientData.phone, cleaned: cleanPhone, url: whatsappUrl });
      
      window.open(whatsappUrl, '_blank');
    } else {
      alert('Numéro de téléphone non disponible');
    }
  };

  const handleMessageClient = () => {
    // ✅ Ouvrir le chat interne
    setCurrentScreen('passenger-chat');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('navigation')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Informations du client</h1>
              <p className="text-sm text-gray-600">Course en cours</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profil principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{clientData.name}</h2>
                <p className="text-gray-600">Client SmartCabb</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Compte vérifié</span>
                </div>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex space-x-3">
              <Button 
                onClick={handleCallClient}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <Phone className="w-4 h-4 mr-2" />
                Appeler
              </Button>
              <Button 
                onClick={handleCallClientWhatsApp}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <Phone className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button 
                onClick={handleMessageClient}
                variant="outline"
                className="flex-1"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Informations de trajet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Détails du trajet</h3>
            
            <div className="space-y-4">
              {/* Point de départ */}
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium">Point de départ</p>
                  <p className="font-semibold">{currentRide?.pickup?.address || 'Point de départ non spécifié'}</p>
                </div>
              </div>

              {/* Destination */}
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <MapPin className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium">Destination</p>
                  <p className="font-semibold">{currentRide?.destination?.address || 'Destination non spécifiée'}</p>
                </div>
              </div>

              {/* Informations supplémentaires */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Distance</p>
                  <p className="text-lg font-bold text-blue-600">{(currentRide?.distance || 0).toFixed(1) || 'N/A'} km</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Prix</p>
                  <p className="text-lg font-bold text-green-600">{currentRide?.estimatedPrice?.toLocaleString() || 'N/A'} CDF</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 🗺️ CARTE GOOGLE MAPS - VISIBLE ICI ! */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-0 overflow-hidden">
            <div className="relative h-64 bg-gray-200">
              {currentRide?.pickup?.lat && 
               currentRide?.pickup?.lng && 
               currentRide?.destination?.lat && 
               currentRide?.destination?.lng ? (
                <GoogleMapView
                  pickup={currentRide.pickup}
                  destination={currentRide.destination}
                  height="h-64"
                  showTraffic={true}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-600 font-medium">Chargement de la carte...</p>
                    <p className="text-xs text-gray-500 mt-1">🗺️ Google Maps • Trafic en temps réel</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Informations de contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informations de contact</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Téléphone</p>
                  <p className="font-medium">{clientData.phone}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{clientData.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Adresse</p>
                  <p className="font-medium">{clientData.address || 'Non renseignée'}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Statistiques du client */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Historique du client</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">{clientData.totalRides || 0}</p>
                <p className="text-sm text-blue-600">Courses réalisées</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <p className="text-2xl font-bold text-green-600">4.8</p>
                </div>
                <p className="text-sm text-green-600">Note moyenne</p>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {clientData.registeredAt 
                    ? new Date(clientData.registeredAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                    : 'N/A'
                  }
                </p>
                <p className="text-sm text-purple-600">Membre depuis</p>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {clientData.favoritePaymentMethod === 'mobile_money' ? 'Mobile' :
                   clientData.favoritePaymentMethod === 'card' ? 'Carte' : 'Espèces'}
                </p>
                <p className="text-sm text-orange-600">Paiement préféré</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Notes importantes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Notes importantes</h3>
            
            <div className="space-y-3">
              <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
                <p className="text-sm">
                  <strong>Client régulier</strong> - Excellent historique de paiement
                </p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400">
                <p className="text-sm">
                  <strong>Communication</strong> - Toujours poli et respectueux
                </p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                <p className="text-sm">
                  <strong>Ponctualité</strong> - Généralement ponctuel aux points de rendez-vous
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Conseils de sécurité */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">Conseils de sécurité</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Vérifiez toujours l'identité du passager avant de démarrer</li>
                  <li>• Confirmez la destination avant le départ</li>
                  <li>• En cas de problème, contactez immédiatement le support</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Bouton Démarrer la course */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="sticky bottom-4"
        >
          <Button
            onClick={() => setCurrentScreen('active-ride')}
            className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg font-semibold shadow-lg"
          >
            <Play className="w-6 h-6 mr-2" />
            Démarrer la course
          </Button>
        </motion.div>

        {/* Padding pour éviter que le contenu soit caché */}
        <div className="h-20" />
      </div>
    </div>
  );
}