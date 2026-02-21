import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Button } from '../ui/button';
import { Home, Briefcase, Heart, Star, Plus, Trash2, Edit2, MapPin, Save, X, Navigation } from '../../lib/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { motion, AnimatePresence } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { YangoStyleSearch } from './YangoStyleSearch';
import { useAppState } from '../../hooks/useAppState'; // ✅ FIX: Ajouter pour récupérer userId
import { toast } from '../../lib/toast'; // ✅ FIX: Ajouter import toast

interface FavoriteLocation {
  id?: string;
  user_id?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  icon: 'home' | 'work' | 'heart' | 'star';
  created_at?: string;
  isLocalDatabase?: boolean; // 🆕 Indique si le lieu vient de la base locale
}

interface FavoriteLocationsProps {
  onSelectLocation: (location: { address: string; lat: number; lng: number }) => void;
  currentLocation?: { lat: number; lng: number; address: string } | null;
  className?: string;
}

const iconOptions = [
  { value: 'home' as const, icon: Home, label: 'Domicile', color: 'text-blue-600' },
  { value: 'work' as const, icon: Briefcase, label: 'Travail', color: 'text-purple-600' },
  { value: 'heart' as const, icon: Heart, label: 'Favori', color: 'text-red-600' },
  { value: 'star' as const, icon: Star, label: 'Important', color: 'text-yellow-600' },
];

export function FavoriteLocations({ onSelectLocation, currentLocation, className = "" }: FavoriteLocationsProps) {
  const { state } = useAppState(); // ✅ FIX: Récupérer state pour userId
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState<FavoriteLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);

  // ✅ FIX: Récupérer userId
  const userId = state.currentUser?.id;

  // 🆕 VERSION 2.0 - Log de version pour vérifier le chargement
  useEffect(() => {
    console.log('🚀 FavoriteLocations v2.2 avec userId fix chargé !');
    console.log('👤 UserID:', userId);
  }, [userId]);

  const [newFavorite, setNewFavorite] = useState<FavoriteLocation>({
    name: '',
    address: '',
    lat: currentLocation?.lat || -4.3276,
    lng: currentLocation?.lng || 15.3136,
    icon: 'home'
  });

  // 🆕 Charger les favoris depuis le backend KV store
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    // ✅ FIX: Vérifier si userId existe
    if (!userId) {
      console.warn('⚠️ userId manquant, impossible de charger les favoris');
      return;
    }

    try {
      console.log('🔍 Chargement des favoris pour userId:', userId);
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${userId}/favorites`;
      console.log('🔍 URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Réponse status:', response.status);
      const data = await response.json();
      console.log('📡 Réponse data:', data);

      if (response.ok) {
        console.log('✅ Favoris chargés:', data);
        
        if (data.success && data.favorites) {
          console.log('✅ Nombre de favoris:', data.favorites.length);
          setFavorites(data.favorites);
        } else {
          console.log('⚠️ Pas de favoris dans la réponse');
          setFavorites([]);
        }
      } else {
        console.error('❌ Erreur chargement favoris:', response.status, data);
        setFavorites([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des favoris:', error);
      setFavorites([]);
    }
  };

  const handleAddFavorite = async () => {
    if (!newFavorite.name.trim() || !newFavorite.address.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // ✅ FIX: Vérifier si userId existe
    if (!userId) {
      toast.error('Utilisateur non connecté');
      return;
    }

    setIsLoading(true);

    try {
      if (editingFavorite?.id) {
        // ✅ FIX: Mise à jour via API avec userId
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${userId}/favorites/${editingFavorite.id}`;
        console.log('📝 Modification favori URL:', url);
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newFavorite.name,
            address: newFavorite.address,
            lat: newFavorite.lat,
            lng: newFavorite.lng,
            icon: newFavorite.icon
          })
        });

        const data = await response.json();
        console.log('📝 Réponse modification:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Erreur mise à jour');
        }
        toast.success('Favori mis à jour');
      } else {
        // ✅ FIX: Création via API avec userId
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${userId}/favorites`;
        console.log('➕ Création favori URL:', url);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: newFavorite.name,
            address: newFavorite.address,
            lat: newFavorite.lat,
            lng: newFavorite.lng,
            icon: newFavorite.icon
          })
        });

        const data = await response.json();
        console.log('➕ Réponse création:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Erreur création');
        }
        toast.success('Favori ajouté avec succès !');
      }

      await loadFavorites();
      handleCloseDialog();
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFavorite = async (id: string) => {
    if (!confirm('Supprimer ce lieu favori ?')) return;

    // ✅ FIX: Vérifier si userId existe
    if (!userId) {
      toast.error('Utilisateur non connecté');
      return;
    }

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${userId}/favorites/${id}`;
      console.log('🗑️ Suppression favori URL:', url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('🗑️ Réponse suppression:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur suppression');
      }

      toast.success('Favori supprimé');
      await loadFavorites();
    } catch (error) {
      console.error('❌ Erreur:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditFavorite = (favorite: FavoriteLocation) => {
    setEditingFavorite(favorite);
    setNewFavorite({
      name: favorite.name,
      address: favorite.address,
      lat: favorite.lat,
      lng: favorite.lng,
      icon: favorite.icon
    });
    setShowAddDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingFavorite(null);
    setSelectedPlace(null);
    setNewFavorite({
      name: '',
      address: '',
      lat: currentLocation?.lat || -4.3276,
      lng: currentLocation?.lng || 15.3136,
      icon: 'home'
    });
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setNewFavorite({
        ...newFavorite,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        address: currentLocation.address || newFavorite.address
      });
      toast.success('Position actuelle utilisée');
    } else {
      toast.error('Position actuelle non disponible');
    }
  };

  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case 'home':
        return { icon: Home, label: 'Domicile', color: 'text-blue-600' };
      case 'work':
        return { icon: Briefcase, label: 'Travail', color: 'text-purple-600' };
      case 'heart':
        return { icon: Heart, label: 'Favori', color: 'text-red-600' };
      case 'star':
        return { icon: Star, label: 'Important', color: 'text-yellow-600' };
      default:
        // Par défaut, utiliser l'icône Home
        return { icon: Home, label: 'Domicile', color: 'text-blue-600' };
    }
  };

  const handleSearchSelect = (result: any) => {
    console.log('🎯 Lieu sélectionné depuis la recherche:', result);
    
    if (result.coordinates) {
      setSelectedPlace({
        name: result.name,
        address: result.description,
        lat: result.coordinates.lat,
        lng: result.coordinates.lng
      });
      
      // Pré-remplir le formulaire avec les informations du lieu
      setNewFavorite({
        ...newFavorite,
        name: result.name,
        address: result.description,
        lat: result.coordinates.lat,
        lng: result.coordinates.lng
      });
      
      toast.success('Lieu trouvé ! Donnez-lui un nom personnalisé');
    }
  };

  return (
    <div className={className}>
      {/* Liste des favoris */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-gray-600">
            Lieux favoris {favorites.length > 0 && `(${favorites.length})`}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadFavorites}
              className="text-gray-600 hover:text-gray-700"
              title="Recharger les favoris"
            >
              <Navigation className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Aucun lieu favori</p>
            <p className="text-xs mt-1">Ajoutez vos lieux fréquents</p>
          </div>
        ) : (
          <AnimatePresence>
            {favorites.filter(Boolean).map((favorite, index) => {
              // Log pour déboguer
              console.log(`🔍 Rendu favori ${index}:`, favorite);
              
              // Protection: s'assurer que favorite existe
              if (!favorite) {
                console.error('❌ Favori undefined/null:', favorite);
                return null;
              }

              // Utiliser des valeurs par défaut si les propriétés manquent
              const name = favorite.name || 'Sans nom';
              const address = favorite.address || 'Adresse non définie';
              const icon = favorite.icon || 'home';
              const lat = favorite.lat || -4.3276;
              const lng = favorite.lng || 15.3136;

              console.log(`✅ Favori ${index} valide:`, { name, address, icon, lat, lng });

              try {
                const iconData = getIconComponent(icon);
                const IconComponent = iconData.icon;

                return (
                  <motion.div
                    key={favorite.id || `fav-${index}-${Math.random()}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    onClick={() => {
                      console.log('🎯 Favori cliqué:', { address, lat, lng });
                      onSelectLocation({
                        address: address,
                        lat: lat,
                        lng: lng
                      });
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className={`p-2 rounded-full bg-gray-100 ${iconData.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm text-gray-900">{name}</p>
                      <p className="text-xs text-gray-500">{address}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditFavorite(favorite);
                        }}
                        className="w-8 h-8"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (favorite.id) handleDeleteFavorite(favorite.id);
                        }}
                        className="w-8 h-8 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              } catch (error) {
                console.error('❌ Erreur lors du rendu du favori:', error, favorite);
                return null;
              }
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Dialog d'ajout/modification */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFavorite ? 'Modifier' : 'Ajouter'} un lieu favori
            </DialogTitle>
            <DialogDescription>
              Recherchez d'abord le lieu, puis personnalisez son nom et son icône
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 🆕 RECHERCHE GOOGLE MAPS */}
            {!editingFavorite && (
              <div>
                <Label>Rechercher le lieu</Label>
                <div className="mt-2">
                  <YangoStyleSearch
                    placeholder="Rechercher une adresse..."
                    onSelect={handleSearchSelect}
                    currentLocation={currentLocation}
                  />
                </div>
                {selectedPlace && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-900">{selectedPlace.name}</p>
                        <p className="text-xs text-green-700 mt-0.5">{selectedPlace.address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nom du lieu (personnalisable) */}
            <div>
              <Label htmlFor="name">Nom personnalisé</Label>
              <Input
                id="name"
                placeholder="Ex: Maison, Bureau, Chez Maman..."
                value={newFavorite.name}
                onChange={(e) => setNewFavorite({ ...newFavorite, name: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Donnez un nom facile à retenir
              </p>
            </div>

            {/* Adresse (pré-remplie depuis la recherche) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="address">Adresse</Label>
                {currentLocation && !selectedPlace && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleUseCurrentLocation}
                    className="text-xs text-blue-600 hover:text-blue-700 h-6"
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    Position actuelle
                  </Button>
                )}
              </div>
              <Input
                id="address"
                placeholder="Ex: Avenue de la Libération, Gombe"
                value={newFavorite.address}
                onChange={(e) => setNewFavorite({ ...newFavorite, address: e.target.value })}
                className="mt-1"
                disabled={!!selectedPlace}
              />
            </div>

            {/* Choix de l'icône */}
            <div>
              <Label>Icône</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {iconOptions.map((option) => {
                  const IconComponent = option.icon;
                  const isSelected = newFavorite.icon === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setNewFavorite({ ...newFavorite, icon: option.value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className={`w-6 h-6 ${option.color}`} />
                      <span className="text-xs text-gray-600">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddFavorite}
                disabled={isLoading || !newFavorite.name.trim() || !newFavorite.address.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Enregistrement...' : editingFavorite ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}