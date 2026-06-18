import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Button } from '../ui/button';
import { Home, Briefcase, Heart, Star, Plus, Trash2, Edit2, MapPin, Save, X, Navigation } from '../../lib/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { motion, AnimatePresence } from '../../lib/motion';
import { YangoStyleSearch } from './YangoStyleSearch';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { toast } from '../../lib/toast';

interface FavoriteLocation {
  id?: string;
  user_id?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  icon: 'home' | 'work' | 'heart' | 'star';
  created_at?: string;
  isLocalDatabase?: boolean;
}

interface FavoriteLocationsProps {
  onSelectLocation: (location: { address: string; lat: number; lng: number }) => void;
  currentLocation?: { lat: number; lng: number; address: string } | null;
  className?: string;
}

export function FavoriteLocations({ onSelectLocation, currentLocation, className = "" }: FavoriteLocationsProps) {
  const { state } = useAppState();
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState<FavoriteLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);

  const userId = state.currentUser?.id;

  // ✅ TRADUIT — Options d'icônes
  const iconOptions = [
    { value: 'home' as const, icon: Home, labelKey: 'icon_home', color: 'text-blue-600' },
    { value: 'work' as const, icon: Briefcase, labelKey: 'icon_work', color: 'text-purple-600' },
    { value: 'heart' as const, icon: Heart, labelKey: 'icon_heart', color: 'text-red-600' },
    { value: 'star' as const, icon: Star, labelKey: 'icon_star', color: 'text-yellow-600' },
  ];

  const [newFavorite, setNewFavorite] = useState<FavoriteLocation>({
    name: '',
    address: '',
    lat: currentLocation?.lat || -4.3276,
    lng: currentLocation?.lng || 15.3136,
    icon: 'home'
  });

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    if (!userId) {
      console.warn('⚠️ userId manquant, impossible de charger les favoris');
      return;
    }
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${userId}/favorites`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await response.json();
      if (response.ok && data.success && data.favorites) {
        setFavorites(data.favorites);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement favoris:', error);
      setFavorites([]);
    }
  };

  const handleAddFavorite = async () => {
    if (!newFavorite.name.trim() || !newFavorite.address.trim()) {
      // ✅ TRADUIT
      toast.error(t('favorite_fill_fields'));
      return;
    }
    if (!userId) {
      // ✅ TRADUIT
      toast.error(t('favorite_not_logged'));
      return;
    }

    setIsLoading(true);
    try {
      if (editingFavorite?.id) {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${userId}/favorites/${editingFavorite.id}`,
          {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newFavorite.name, address: newFavorite.address, lat: newFavorite.lat, lng: newFavorite.lng, icon: newFavorite.icon })
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur mise à jour');
        // ✅ TRADUIT
        toast.success(t('favorite_updated'));
      } else {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${userId}/favorites`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newFavorite.name, address: newFavorite.address, lat: newFavorite.lat, lng: newFavorite.lng, icon: newFavorite.icon })
          }
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur création');
        // ✅ TRADUIT
        toast.success(t('favorite_saved'));
      }
      await loadFavorites();
      handleCloseDialog();
    } catch (error) {
      console.error('❌ Erreur:', error);
      // ✅ TRADUIT
      toast.error(t('favorite_error_save'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFavorite = async (id: string) => {
    // ✅ TRADUIT
    if (!confirm(t('delete_favorite_confirm'))) return;
    if (!userId) { toast.error(t('favorite_not_logged')); return; }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/passengers/${userId}/favorites/${id}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' } }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur suppression');
      // ✅ TRADUIT
      toast.success(t('favorite_deleted'));
      await loadFavorites();
    } catch (error) {
      console.error('❌ Erreur:', error);
      // ✅ TRADUIT
      toast.error(t('favorite_error_delete'));
    }
  };

  const handleEditFavorite = (favorite: FavoriteLocation) => {
    setEditingFavorite(favorite);
    setNewFavorite({ name: favorite.name, address: favorite.address, lat: favorite.lat, lng: favorite.lng, icon: favorite.icon });
    setShowAddDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingFavorite(null);
    setSelectedPlace(null);
    setNewFavorite({ name: '', address: '', lat: currentLocation?.lat || -4.3276, lng: currentLocation?.lng || 15.3136, icon: 'home' });
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setNewFavorite({ ...newFavorite, lat: currentLocation.lat, lng: currentLocation.lng, address: currentLocation.address || newFavorite.address });
      // ✅ TRADUIT
      toast.success(t('favorite_current_used'));
    } else {
      // ✅ TRADUIT
      toast.error(t('favorite_current_unavailable'));
    }
  };

  const getIconData = (iconType: string) => {
    switch (iconType) {
      case 'home':   return { icon: Home,     labelKey: 'icon_home',  color: 'text-blue-600' };
      case 'work':   return { icon: Briefcase, labelKey: 'icon_work',  color: 'text-purple-600' };
      case 'heart':  return { icon: Heart,     labelKey: 'icon_heart', color: 'text-red-600' };
      case 'star':   return { icon: Star,      labelKey: 'icon_star',  color: 'text-yellow-600' };
      default:       return { icon: Home,     labelKey: 'icon_home',  color: 'text-blue-600' };
    }
  };

  const handleSearchSelect = (result: any) => {
    if (result.coordinates) {
      setSelectedPlace({ name: result.name, address: result.description, lat: result.coordinates.lat, lng: result.coordinates.lng });
      setNewFavorite({ ...newFavorite, name: result.name, address: result.description, lat: result.coordinates.lat, lng: result.coordinates.lng });
      // ✅ TRADUIT
      toast.success(t('favorite_place_found'));
    }
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          {/* ✅ TRADUIT */}
          <h3 className="text-sm text-gray-600">
            {t('favorite_places')} {favorites.length > 0 && `(${favorites.length})`}
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={loadFavorites} className="text-gray-600 hover:text-gray-700" title="Recharger">
              <Navigation className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(true)} className="text-blue-600 hover:text-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              {/* ✅ TRADUIT */}
              {t('add_favorite')}
            </Button>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            {/* ✅ TRADUIT */}
            <p className="text-sm">{t('no_favorite_places')}</p>
            <p className="text-xs mt-1">{t('no_favorite_places_desc')}</p>
          </div>
        ) : (
          <AnimatePresence>
            {favorites.filter(Boolean).map((favorite, index) => {
              if (!favorite) return null;
              const name = favorite.name || 'Sans nom';
              const address = favorite.address || 'Adresse non définie';
              const icon = favorite.icon || 'home';
              const lat = favorite.lat || -4.3276;
              const lng = favorite.lng || 15.3136;

              try {
                const iconData = getIconData(icon);
                const IconComponent = iconData.icon;

                return (
                  <motion.div
                    key={favorite.id || `fav-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    onClick={() => onSelectLocation({ address, lat, lng })}
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
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditFavorite(favorite); }} className="w-8 h-8">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); if (favorite.id) handleDeleteFavorite(favorite.id); }} className="w-8 h-8 text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              } catch (error) {
                return null;
              }
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Dialog ajout/modification — ✅ TOUT TRADUIT */}
      <Dialog open={showAddDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {/* ✅ TRADUIT */}
              {editingFavorite ? t('edit_favorite_place') : t('add_favorite_place')}
            </DialogTitle>
            <DialogDescription>
              {/* ✅ TRADUIT */}
              {t('favorite_search_dialog_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Recherche lieu */}
            {!editingFavorite && (
              <div>
                {/* ✅ TRADUIT */}
                <Label>{t('favorite_search_place')}</Label>
                <div className="mt-2">
                  <YangoStyleSearch
                    placeholder={t('favorite_search_placeholder')}
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

            {/* Nom personnalisé */}
            <div>
              {/* ✅ TRADUIT */}
              <Label htmlFor="name">{t('favorite_custom_name')}</Label>
              <Input
                id="name"
                placeholder={t('favorite_name_placeholder')}
                value={newFavorite.name}
                onChange={(e) => setNewFavorite({ ...newFavorite, name: e.target.value })}
                className="mt-1"
              />
              {/* ✅ TRADUIT */}
              <p className="text-xs text-gray-500 mt-1">{t('favorite_name_hint')}</p>
            </div>

            {/* Adresse */}
            <div>
              <div className="flex items-center justify-between mb-1">
                {/* ✅ TRADUIT */}
                <Label htmlFor="address">{t('favorite_address')}</Label>
                {currentLocation && !selectedPlace && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleUseCurrentLocation} className="text-xs text-blue-600 hover:text-blue-700 h-6">
                    <Navigation className="w-3 h-3 mr-1" />
                    {/* ✅ TRADUIT */}
                    {t('favorite_use_current')}
                  </Button>
                )}
              </div>
              <Input
                id="address"
                placeholder={t('favorite_address_placeholder')}
                value={newFavorite.address}
                onChange={(e) => setNewFavorite({ ...newFavorite, address: e.target.value })}
                className="mt-1"
                disabled={!!selectedPlace}
              />
            </div>

            {/* Icône */}
            <div>
              {/* ✅ TRADUIT */}
              <Label>{t('favorite_icon')}</Label>
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
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className={`w-6 h-6 ${option.color}`} />
                      {/* ✅ TRADUIT */}
                      <span className="text-xs text-gray-600">{t(option.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleCloseDialog} className="flex-1">
                {/* ✅ TRADUIT */}
                {t('cancel')}
              </Button>
              <Button
                onClick={handleAddFavorite}
                disabled={isLoading || !newFavorite.name.trim() || !newFavorite.address.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {/* ✅ TRADUIT */}
                {isLoading ? t('favorite_saving') : editingFavorite ? t('edit') : t('add_favorite')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
