import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Save,
  X,
  ChevronRight,
  Wallet,
  History,
  HelpCircle,
  LogOut,
  MessageCircle,
  Star,
  TrendingUp,
  Award,
  Gift,
  Shield,
  Settings,
  Bell,
  ArrowLeft,
  Calendar,
  Smartphone,
  CreditCard,
  Banknote
} from '../../lib/icons';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { formatCDF, getExchangeRate } from '../../lib/pricing';
import { syncUserProfile } from '../../lib/sync-service';
import { sendSMS } from '../../lib/sms-service';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

export function ProfileScreen() {
  const { setCurrentScreen, state, passengers, setCurrentUser, setCurrentView } = useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: state.currentUser?.name || '',
    email: state.currentUser?.email || '',
    phone: state.currentUser?.phone || '',
    address: ''
  });
  
  // 🆕 États pour les statistiques
  const [rideStats, setRideStats] = useState({
    totalRides: 0,
    loading: true
  });
  
  // 💰 ÉTAT POUR LE SOLDE EN TEMPS RÉEL
  const [walletBalance, setWalletBalance] = useState(state.currentUser?.walletBalance || 0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  
  // 💰 CHARGER LE SOLDE EN TEMPS RÉEL AU CHARGEMENT
  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!state.currentUser?.id) return;
      
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${state.currentUser.id}/balance`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('💰 Solde passager chargé:', data);
          
          if (data.success && data.balance !== undefined) {
            setWalletBalance(data.balance);
            // Mettre à jour aussi dans le state global
            setCurrentUser({
              ...state.currentUser,
              walletBalance: data.balance
            });
          }
        }
      } catch (error) {
        console.error('❌ Erreur chargement solde:', error);
      } finally {
        setLoadingBalance(false);
      }
    };
    
    fetchWalletBalance();
    
    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(fetchWalletBalance, 10000);
    return () => clearInterval(interval);
  }, [state.currentUser?.id]);
  
  // 🆕 CHARGER LES STATISTIQUES DEPUIS LE BACKEND
  useEffect(() => {
    const fetchRideStats = async () => {
      if (!state.currentUser?.id) return;
      
      try {
        // 🆕 v517.91: Utiliser la nouvelle route /passengers/:id/stats
        console.log('📊 🔥 APPEL /passengers/:id/stats avec ID:', state.currentUser.id);
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${state.currentUser.id}/stats`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('📊 🔥 Réponse /passengers/:id/stats:', response.status, response.ok);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📊 v517.91 - Stats passager reçues:', data);
          
          if (data.success && data.stats) {
            setRideStats({
              totalRides: data.stats.totalRides || 0,
              loading: false
            });
            console.log(`✅ v517.91 - ${data.stats.totalRides} courses réalisées par le passager`);
          } else {
            console.warn('⚠️ data.success ou data.stats manquant:', data);
            setRideStats({ totalRides: 0, loading: false });
          }
        } else {
          const errorText = await response.text();
          console.error('❌ v517.91 - Erreur réponse API:', response.status, errorText);
          setRideStats({ totalRides: 0, loading: false });
        }
      } catch (error) {
        console.error('❌ Erreur chargement statistiques:', error);
        setRideStats({ totalRides: 0, loading: false });
      }
    };
    
    fetchRideStats();
  }, [state.currentUser?.id]);

  // Get passenger data - Utiliser useEffect pour mettre à jour quand state.currentUser change
  const passengerData = state.currentUser;
  
  // 🔄 Mettre à jour editData quand state.currentUser change
  useEffect(() => {
    if (state.currentUser) {
      setEditData({
        name: state.currentUser.name || '',
        email: state.currentUser.email || '',
        phone: state.currentUser.phone || '',
        address: state.currentUser.address || ''
      });
    }
  }, [state.currentUser]);
  
  // 🐛 DEBUG: Afficher les données wallet dans la console
  console.log('💰 ProfileScreen - Wallet Debug:', {
    hasUser: !!state.currentUser,
    walletBalance: state.currentUser?.walletBalance,
    walletBalanceFormatted: formatCDF(state.currentUser?.walletBalance || 0),
    transactionCount: state.currentUser?.walletTransactions?.length || 0,
    hasDiscount: (state.currentUser?.walletBalance || 0) >= getExchangeRate() * 20
  });

  const handleLogout = () => {
    console.log('🚪 Déconnexion du passager');
    setCurrentUser(null);
    // Pas besoin de changer currentView, juste l'écran
    setCurrentScreen('landing');
  };

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'mobile_money':
        return <Smartphone className="w-5 h-5 text-green-600" />;
      case 'card':
        return <CreditCard className="w-5 h-5 text-blue-600" />;
      case 'cash':
        return <Banknote className="w-5 h-5 text-orange-600" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'mobile_money':
        return 'Mobile Money (Airtel Money, M-Pesa)';
      case 'card':
        return 'Carte bancaire';
      case 'cash':
        return 'Paiement en espèces';
      default:
        return 'Non défini';
    }
  };

  const handleSave = async () => {
    if (!state.currentUser?.id) {
      toast.error('Erreur: utilisateur non connecté');
      return;
    }

    setIsSaving(true);
    
    // 🔥 DEBUG: Afficher ce qui va être envoyé
    console.log('🔥🔥🔥 ========== SAUVEGARDE PROFIL ==========');
    console.log('📤 Données à envoyer:', {
      name: editData.name,
      email: editData.email,
      phone: editData.phone,
      address: editData.address
    });
    console.log('📊 Utilisateur actuel:', {
      id: state.currentUser.id,
      currentName: state.currentUser.name,
      currentEmail: state.currentUser.email,
      currentPhone: state.currentUser.phone,
      currentAddress: state.currentUser.address
    });
    
    // ✅ OPTIMISTIC UPDATE: Mettre à jour immédiatement l'interface
    const previousUser = { ...state.currentUser };
    const updatedUser = {
      ...state.currentUser,
      name: editData.name,
      email: editData.email,
      phone: editData.phone,
      address: editData.address
    };
    
    // Mettre à jour le state immédiatement pour une réactivité instantanée
    setCurrentUser(updatedUser);
    setIsEditing(false);
    
    try {
      console.log('💾 [PROFILE SAVE] Début de la sauvegarde...', {
        userId: state.currentUser.id,
        currentName: state.currentUser.name,
        newName: editData.name,
        newEmail: editData.email,
        newPhone: editData.phone,
        newAddress: editData.address
      });
      
      // 🔥 NOUVELLE MÉTHODE: Sauvegarder directement dans le backend KV store
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/update/${state.currentUser.id}`;
      console.log('📡 URL:', url);
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editData.name,
          email: editData.email,
          phone: editData.phone,
          address: editData.address
        })
      });

      console.log('📥 Réponse serveur:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur backend:', response.status, errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ [PROFILE SAVE] Backend mis à jour:', result);
      console.log('🔥🔥🔥 ========== FIN SAUVEGARDE (SUCCÈS) ==========');
      
      // 🔄 Mettre à jour localStorage
      const userKey = `smartcabb_user_${state.currentUser.id}`;
      const savedData = localStorage.getItem(userKey);
      
      if (savedData) {
        const existingData = JSON.parse(savedData);
        const updatedData = {
          ...existingData,
          name: editData.name,
          email: editData.email,
          phone: editData.phone,
          address: editData.address
        };
        localStorage.setItem(userKey, JSON.stringify(updatedData));
        console.log('✅ localStorage mis à jour:', updatedData);
      }
      
      toast.success('Profil mis à jour avec succès ✅');

      // 📱 Envoyer SMS de confirmation (sans bloquer si échec)
      if (editData.phone) {
        try {
          await sendSMS({
            to: editData.phone,
            message: `SmartCabb : Votre profil a ete mis a jour avec succes. ${editData.name}`,
            type: 'profile_updated',
          });
          console.log('✅ SMS de mise à jour profil envoyé');
        } catch (error) {
          console.error('❌ Erreur envoi SMS:', error);
        }
      }

    } catch (error: any) {
      console.error('❌ [PROFILE SAVE] Erreur handleSave:', error);
      console.error('❌ [PROFILE SAVE] Détails erreur:', error.message);
      toast.error(`Erreur: ${error.message || 'Erreur lors de la sauvegarde'}`);
      // Rollback en cas d'erreur
      setCurrentUser(previousUser);
      setEditData({
        name: previousUser.name,
        email: previousUser.email,
        phone: previousUser.phone,
        address: previousUser.address || ''
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('map')}
              className="p-2 hover:bg-muted"
            >
              <ArrowLeft className="w-5 h-5 text-primary" />
            </Button>
            <div>
              <h1 className="text-primary">Mon Profil</h1>
              <p className="text-sm text-muted-foreground">Informations personnelles</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className="border-secondary text-secondary hover:bg-secondary/10"
          >
            {isSaving ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                Sauvegarde...
              </>
            ) : isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4 mr-2" />
                Modifier
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Photo de profil et informations principales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 md:p-6 bg-white/60 backdrop-blur-sm border-border shadow-lg">
            <div className="flex items-center space-x-4 mb-6 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-7 md:h-7 bg-secondary rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  <Shield className="w-3 h-3 md:w-4 md:h-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl text-primary truncate">{passengerData?.name}</h2>
                <p className="text-sm text-muted-foreground truncate">Client SmartCabb</p>
                <div className="flex items-center space-x-2 mt-2 overflow-x-auto">
                  <div className="flex items-center px-2 py-1 bg-secondary/10 rounded-full flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-secondary mr-1" />
                    <span className="text-xs text-secondary font-medium">Compte vérifié</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-3 md:p-4 rounded-2xl text-center border border-secondary/20 shadow-sm">
                <p className="text-xl md:text-2xl font-bold text-secondary">
                  {rideStats.loading ? '...' : rideStats.totalRides}
                </p>
                <p className="text-xs md:text-sm text-secondary/80">Courses réalisées</p>
              </div>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 md:p-4 rounded-2xl text-center border border-primary/20 shadow-sm">
                <p className="text-xl md:text-2xl font-bold text-primary">
                  {passengerData?.registeredAt 
                    ? new Date(passengerData.registeredAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                    : new Date(passengerData?.created_at || Date.now()).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
                  }
                </p>
                <p className="text-xs md:text-sm text-primary/80">Membre depuis</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Portefeuille - Wallet Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <button
            onClick={() => setCurrentScreen('wallet')}
            className="w-full"
          >
            <Card className="p-4 md:p-6 bg-gradient-to-br from-secondary/5 to-primary/5 border-secondary/20 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-secondary to-primary rounded-2xl flex items-center justify-center shadow-lg">
                    <Wallet className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">Mon Portefeuille</p>
                    <p className="text-xl md:text-2xl font-bold text-primary">
                      {formatCDF(walletBalance)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ {((walletBalance) / getExchangeRate()).toFixed(2)}$ USD
                    </p>
                    {(walletBalance) >= getExchangeRate() * 20 && (
                      <p className="text-xs text-secondary font-medium mt-1 flex items-center gap-1">
                        🎁 Réduction de 5% active
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </div>
            </Card>
          </button>
        </motion.div>

        {/* Informations personnelles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold mb-4">Informations personnelles</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nom complet</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center space-x-3 mt-1 p-3 bg-gray-50 rounded-lg min-w-0">
                    <User className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{passengerData?.name}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center space-x-3 mt-1 p-3 bg-gray-50 rounded-lg min-w-0">
                    <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{passengerData?.email}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Téléphone</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={editData.phone}
                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    className="mt-1"
                  />
                ) : (
                  <div className="flex items-center space-x-3 mt-1 p-3 bg-gray-50 rounded-lg min-w-0">
                    <Phone className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{passengerData?.phone}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="address">Adresse</Label>
                {isEditing ? (
                  <Input
                    id="address"
                    value={editData.address}
                    onChange={(e) => setEditData({...editData, address: e.target.value})}
                    className="mt-1"
                    placeholder="Votre adresse à Kinshasa"
                  />
                ) : (
                  <div className="flex items-center space-x-3 mt-1 p-3 bg-gray-50 rounded-lg min-w-0">
                    <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{passengerData?.address || 'Non renseignée'}</span>
                  </div>
                )}
              </div>

              <div>
                <Label>Date d'inscription</Label>
                <div className="flex items-center space-x-3 mt-1 p-3 bg-gray-50 rounded-lg min-w-0">
                  <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <span className="truncate">
                    {passengerData?.registeredAt 
                      ? new Date(passengerData.registeredAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      : 'Non disponible'
                    }
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Méthode de paiement préférée */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Méthode de paiement préférée</h3>
            
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              {getPaymentMethodIcon(passengerData?.favoritePaymentMethod)}
              <div className="flex-1">
                <p className="font-medium">{getPaymentMethodLabel(passengerData?.favoritePaymentMethod)}</p>
                <p className="text-sm text-gray-600">
                  {passengerData?.favoritePaymentMethod === 'mobile_money' && 'Paiement rapide et sécurisé'}
                  {passengerData?.favoritePaymentMethod === 'card' && 'Paiement par carte bancaire'}
                  {passengerData?.favoritePaymentMethod === 'cash' && 'Paiement en espèces au chauffeur'}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Modifier
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Actions rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
            
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setCurrentScreen('ride-history')}
              >
                <History className="w-5 h-5 mr-3" />
                Voir l'historique des courses
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setCurrentScreen('support')}
              >
                <HelpCircle className="w-5 h-5 mr-3" />
                Contacter le support
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Se déconnecter
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}