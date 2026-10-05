import { useState, useEffect } from 'react';
import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Save,
  ChevronRight,
  Wallet,
  History,
  HelpCircle,
  LogOut,
  Shield,
  Settings,
  ArrowLeft,
  Calendar,
  Smartphone,
  CreditCard,
  Banknote,
  Gift,
  Info,
} from '../../lib/icons';
import { toast } from '../../lib/toast';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { formatCDF, getExchangeRate } from '../../lib/pricing';
import { syncUserProfile } from '../../lib/sync-service';
import { sendSMS } from '../../lib/sms-service';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAppState } from '../../hooks/useAppState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { FavoriteLocations } from './FavoriteLocations';

export function ProfileScreen() {
  const { setCurrentScreen, state, passengers, setCurrentUser, setCurrentView } = useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddresses, setShowAddresses] = useState(false);
  const [editData, setEditData] = useState({
    name: state.currentUser?.name || '',
    email: state.currentUser?.email || '',
    phone: state.currentUser?.phone || '',
    address: ''
  });

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // 🆕 États pour les statistiques
  const [rideStats, setRideStats] = useState({
    totalRides: 0,
    loading: true
  });

  // 💰 ÉTAT POUR LE SOLDE EN TEMPS RÉEL
  const [walletBalance, setWalletBalance] = useState(state.currentUser?.walletBalance || 0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // ⭐ Annulations + points fidélité
  const [cancelCount, setCancelCount] = useState(0);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);

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

  // 🆕 Annulations + points fidélité
  useEffect(() => {
    const fetchExtras = async () => {
      if (!state.currentUser?.id) return;
      try {
        const h = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/rides/history/${state.currentUser.id}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        if (h.ok) {
          const data = await h.json();
          const rides = data.rides || [];
          setCancelCount(rides.filter((r: any) => r.status === 'cancelled' && (r.cancelledBy === 'passenger' || !r.cancelledBy)).length);
        }
      } catch {}
      try {
        const l = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/loyalty/${state.currentUser.id}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        if (l.ok) {
          const data = await l.json();
          if (data.success) setLoyaltyBalance(data.loyalty?.balance || 0);
        }
      } catch {}
    };
    fetchExtras();
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

  const quickActions = [
    { icon: History, label: 'Historique', screen: 'ride-history' },
    { icon: HelpCircle, label: 'Assistance', screen: 'support' },
    { icon: Wallet, label: 'Portefeuille', screen: 'wallet' },
    { icon: Settings, label: 'Paramètres', screen: 'settings' },
  ];

  const menuRows = [
    {
      icon: Gift,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: 'Smart Rewards',
      subtitle: loyaltyBalance > 0 ? `${loyaltyBalance.toLocaleString('fr-FR')} points` : 'Mes points et récompenses',
      screen: 'loyalty',
    },
    {
      icon: Banknote,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      title: 'Réductions',
      subtitle: 'Saisir un code promotionnel',
      screen: 'promo-code',
    },
    {
      icon: CreditCard,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: 'Modes de paiement',
      subtitle: getPaymentMethodLabel(passengerData?.favoritePaymentMethod),
      screen: 'payment-method',
    },
    {
      icon: Shield,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: 'Sécurité',
      subtitle: 'Confidentialité et protection',
      screen: 'privacy-settings',
    },
    {
      icon: Info,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      title: 'Informations',
      subtitle: 'Aide et contact SmartCabb',
      screen: 'support',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentScreen('map')}
            className="p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-base font-bold text-gray-900">Mon Profil</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
            className="border-amber-300 text-amber-600 hover:bg-amber-50 text-xs"
          >
            {isSaving ? 'Sauvegarde...' : isEditing ? 'Sauver' : 'Modifier'}
          </Button>
        </div>

        {/* Identité */}
        <div className="flex flex-col items-center pb-5 px-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg mb-2">
            <span className="text-white text-2xl font-bold">
              {(passengerData?.name || 'S').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
            {passengerData?.name || 'Passager'}
            <Shield className="w-4 h-4 text-cyan-600" />
          </h2>
          <p className="text-sm text-gray-500">{passengerData?.phone || ''}</p>

          {/* Actions rapides */}
          <div className="grid grid-cols-4 gap-2 w-full mt-4">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={() => setCurrentScreen(a.screen)}
                className="flex flex-col items-center gap-1.5 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <span className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                  <a.icon className="w-5 h-5 text-gray-700" />
                </span>
                <span className="text-[11px] text-gray-700 font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Statistiques */}
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900">
                {rideStats.loading ? '...' : rideStats.totalRides}
              </p>
              <p className="text-[11px] text-gray-500">Courses</p>
            </div>
            <div>
              <p className={`text-xl font-bold ${cancelCount >= 2 ? 'text-orange-600' : 'text-gray-900'}`}>
                {cancelCount}
              </p>
              <p className="text-[11px] text-gray-500">Annulations</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600">
                {loyaltyBalance.toLocaleString('fr-FR')}
              </p>
              <p className="text-[11px] text-gray-500">Points</p>
            </div>
          </div>
          {cancelCount > 0 && (
            <p className="text-[11px] text-orange-600 text-center mt-2">
              3 annulations successives = compte bloqué 24h
            </p>
          )}
        </Card>

        {/* Menu façon Yango */}
        <Card className="p-2">
          {menuRows.map((row, i) => (
            <button
              key={row.title}
              onClick={() => setCurrentScreen(row.screen)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left ${i < menuRows.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <span className={`w-9 h-9 rounded-full ${row.iconBg} flex items-center justify-center flex-shrink-0`}>
                <row.icon className={`w-4 h-4 ${row.iconColor}`} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block row-title">{row.title}</span>
                <span className="block row-subtitle truncate">{row.subtitle}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
          ))}

          {/* Adresses */}
          <div className="border-b border-gray-50">
            <button
              onClick={() => setShowAddresses((v) => !v)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <span className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-cyan-600" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block row-title">Mes adresses</span>
                <span className="block row-subtitle truncate">Domicile, travail, favoris</span>
              </span>
              <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${showAddresses ? 'rotate-90' : ''}`} />
            </button>
            {showAddresses && (
              <div className="px-3 pb-3">
                <FavoriteLocations
                  onSelectLocation={() => {}}
                  currentLocation={null}
                  className=""
                />
              </div>
            )}
          </div>

          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-left"
          >
            <span className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-4 h-4 text-red-600" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-red-600">Se déconnecter</span>
            </span>
          </button>
        </Card>

        {/* Portefeuille */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => setCurrentScreen('wallet')}
            className="w-full"
          >
            <Card className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-100 hover:shadow-lg transition-all cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-gray-500 mb-1">Mon Portefeuille</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCDF(walletBalance)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ≈ {((walletBalance) / getExchangeRate()).toFixed(2)}$ USD
                    </p>
                    {(walletBalance) >= getExchangeRate() * 20 && (
                      <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                        🎁 Réduction de 5% active
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
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
              <Button variant="outline" size="sm" onClick={() => setShowPaymentDialog(true)}>
                Modifier
              </Button>
            </div>
          </Card>
        </motion.div>

        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Methode de paiement preferee</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {[
                { id: 'mobile_money', icon: Smartphone, label: 'Mobile Money (Airtel Money, M-Pesa)', desc: 'Paiement rapide et securise' },
                { id: 'card', icon: CreditCard, label: 'Carte bancaire', desc: 'Paiement par carte bancaire' },
                { id: 'cash', icon: Banknote, label: 'Paiement en especes', desc: 'Paiement en especes au chauffeur' }
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => {
                    setCurrentUser({ ...state.currentUser, favoritePaymentMethod: method.id });
                    localStorage.setItem('smartcabb_preferred_payment', method.id);
                    setShowPaymentDialog(false);
                    toast.success(`Mode de paiement mis a jour`);
                  }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    passengerData?.favoritePaymentMethod === method.id
                      ? 'border-secondary bg-secondary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <method.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-sm">{method.label}</p>
                    <p className="text-xs text-gray-500">{method.desc}</p>
                  </div>
                  {passengerData?.favoritePaymentMethod === method.id && (
                    <span className="text-xs text-secondary font-medium">Actif</span>
                  )}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
