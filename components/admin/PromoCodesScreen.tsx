import { useState } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Tag, Calendar, Users } from '../../lib/admin-icons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { PromoCode } from '../../types';

interface PromoCodesScreenProps {
  onBack?: () => void;
}

export function PromoCodesScreen({ onBack }: PromoCodesScreenProps) {
  const { t } = useTranslation();
  const { promoCodes, addPromoCode, updatePromoCode, setCurrentScreen } = useAppState();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    discount: '',
    type: 'percentage' as 'percentage' | 'fixed',
    description: '',
    validFrom: '',
    validTo: '',
    usageLimit: '',
    minRideAmount: ''
  });

  const resetForm = () => {
    setFormData({
      code: '',
      discount: '',
      type: 'percentage',
      description: '',
      validFrom: '',
      validTo: '',
      usageLimit: '',
      minRideAmount: ''
    });
  };

  const handleCreate = () => {
    if (!formData.code || !formData.discount) return;

    addPromoCode?.({
      code: formData.code.toUpperCase(),
      discount: parseInt(formData.discount),
      type: formData.type,
      description: formData.description,
      validFrom: new Date(formData.validFrom),
      validTo: new Date(formData.validTo),
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
      minRideAmount: formData.minRideAmount ? parseInt(formData.minRideAmount) : undefined,
      isActive: true
    });

    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEdit = (promo: PromoCode) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      discount: promo.discount.toString(),
      type: promo.type,
      description: promo.description,
      validFrom: promo.validFrom.toISOString().split('T')[0],
      validTo: promo.validTo.toISOString().split('T')[0],
      usageLimit: promo.usageLimit?.toString() || '',
      minRideAmount: promo.minRideAmount?.toString() || ''
    });
  };

  const handleUpdate = () => {
    if (!editingPromo || !formData.code || !formData.discount) return;

    updatePromoCode?.(editingPromo.id, {
      code: formData.code.toUpperCase(),
      discount: parseInt(formData.discount),
      type: formData.type,
      description: formData.description,
      validFrom: new Date(formData.validFrom),
      validTo: new Date(formData.validTo),
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
      minRideAmount: formData.minRideAmount ? parseInt(formData.minRideAmount) : undefined
    });

    resetForm();
    setEditingPromo(null);
  };

  const togglePromoStatus = (promo: PromoCode) => {
    updatePromoCode?.(promo.id, { isActive: !promo.isActive });
  };

  const PromoForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">{t('promo_code')}</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="Ex: WELCOME20"
          />
        </div>
        <div>
          <Label htmlFor="type">Type de réduction</Label>
          <Select value={formData.type} onValueChange={(value: 'percentage' | 'fixed') => 
            setFormData(prev => ({ ...prev, type: value }))
          }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Pourcentage</SelectItem>
              <SelectItem value="fixed">Montant fixe</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="discount">
          {formData.type === 'percentage' ? 'Pourcentage (%)' : 'Montant (CDF)'}
        </Label>
        <Input
          id="discount"
          type="number"
          value={formData.discount}
          onChange={(e) => setFormData(prev => ({ ...prev, discount: e.target.value }))}
          placeholder={formData.type === 'percentage' ? '20' : '5000'}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Description du code promo"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="validFrom">{t('valid_from')}</Label>
          <Input
            id="validFrom"
            type="date"
            value={formData.validFrom}
            onChange={(e) => setFormData(prev => ({ ...prev, validFrom: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="validTo">{t('valid_to')}</Label>
          <Input
            id="validTo"
            type="date"
            value={formData.validTo}
            onChange={(e) => setFormData(prev => ({ ...prev, validTo: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="usageLimit">{t('usage_limit')}</Label>
          <Input
            id="usageLimit"
            type="number"
            value={formData.usageLimit}
            onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
            placeholder="1000"
          />
        </div>
        <div>
          <Label htmlFor="minRideAmount">Montant minimum (CDF)</Label>
          <Input
            id="minRideAmount"
            type="number"
            value={formData.minRideAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, minRideAmount: e.target.value }))}
            placeholder="10000"
          />
        </div>
      </div>

      <Button 
        onClick={editingPromo ? handleUpdate : handleCreate}
        className="w-full"
      >
        {editingPromo ? 'Mettre à jour' : t('create_promo')}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h1 className="text-xl font-semibold">{t('promo_codes')}</h1>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingPromo(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                {t('create_promo')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('create_promo')}</DialogTitle>
                <DialogDescription>
                  Créez un nouveau code promotionnel pour offrir des réductions à vos clients.
                </DialogDescription>
              </DialogHeader>
              <PromoForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {promoCodes.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-2">
                <Tag className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">Aucun code promo</h3>
                <p className="text-sm text-gray-500">
                  Créez votre premier code promotionnel pour offrir des réductions à vos clients.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  💡 Si vous voyez ce message après avoir exécuté le script SQL, rechargez la page.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          promoCodes.map((promo) => (
          <Card key={promo.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-green-600" />
                  {promo.code}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={promo.isActive}
                    onCheckedChange={() => togglePromoStatus(promo)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(promo)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">{promo.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Réduction:</span>
                  <span className="ml-2 font-medium">
                    {promo.type === 'percentage' ? `${promo.discount}%` : `${promo.discount} CDF`}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Utilisation:</span>
                  <span className="ml-2 font-medium">
                    {promo.usedCount} / {promo.usageLimit || '∞'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {promo.validFrom.toLocaleDateString()} - {promo.validTo.toLocaleDateString()}
                  </span>
                </div>
                {promo.minRideAmount && (
                  <div>
                    Minimum: {promo.minRideAmount.toLocaleString()} CDF
                  </div>
                )}
              </div>

              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                promo.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {promo.isActive ? 'Actif' : 'Inactif'}
              </div>
            </CardContent>
          </Card>
        )))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPromo} onOpenChange={() => setEditingPromo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le code promo</DialogTitle>
            <DialogDescription>
              Modifiez les paramètres de ce code promotionnel.
            </DialogDescription>
          </DialogHeader>
          <PromoForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}