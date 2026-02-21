import { useState } from 'react';
import { ArrowLeft, Plus, Edit2, Trash2, Megaphone, Calendar, Users, Eye } from '../../lib/admin-icons';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { useAppState } from '../../hooks/useAppState';
import { useTranslation } from '../../hooks/useTranslation';
import { MarketingCampaign } from '../../types';

interface MarketingCampaignsScreenProps {
  onBack?: () => void;
}

export function MarketingCampaignsScreen({ onBack }: MarketingCampaignsScreenProps) {
  const { t } = useTranslation();
  const { campaigns, addCampaign, updateCampaign, setCurrentScreen } = useAppState();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target: 'both' as 'passengers' | 'drivers' | 'both',
    startsAt: '',
    endsAt: '',
    imageUrl: '',
    actionUrl: ''
  });

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      target: 'both',
      startsAt: '',
      endsAt: '',
      imageUrl: '',
      actionUrl: ''
    });
  };

  const handleCreate = () => {
    if (!formData.title || !formData.message) return;

    addCampaign?.({
      title: formData.title,
      message: formData.message,
      target: formData.target,
      startsAt: new Date(formData.startsAt),
      endsAt: new Date(formData.endsAt),
      imageUrl: formData.imageUrl || undefined,
      actionUrl: formData.actionUrl || undefined,
      isActive: true
    });

    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEdit = (campaign: MarketingCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      title: campaign.title,
      message: campaign.message,
      target: campaign.target,
      startsAt: campaign.startsAt.toISOString().split('T')[0],
      endsAt: campaign.endsAt.toISOString().split('T')[0],
      imageUrl: campaign.imageUrl || '',
      actionUrl: campaign.actionUrl || ''
    });
  };

  const handleUpdate = () => {
    if (!editingCampaign || !formData.title || !formData.message) return;

    updateCampaign?.(editingCampaign.id, {
      title: formData.title,
      message: formData.message,
      target: formData.target,
      startsAt: new Date(formData.startsAt),
      endsAt: new Date(formData.endsAt),
      imageUrl: formData.imageUrl || undefined,
      actionUrl: formData.actionUrl || undefined
    });

    resetForm();
    setEditingCampaign(null);
  };

  const toggleCampaignStatus = (campaign: MarketingCampaign) => {
    updateCampaign?.(campaign.id, { isActive: !campaign.isActive });
  };

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'passengers': return 'Passagers';
      case 'drivers': return 'Conducteurs';
      case 'both': return 'Tous';
      default: return target;
    }
  };

  const CampaignForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">{t('campaign_title')}</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Titre de la campagne"
        />
      </div>

      <div>
        <Label htmlFor="message">{t('campaign_message')}</Label>
        <Textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          placeholder="Message de la campagne"
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="target">{t('target_audience')}</Label>
        <Select value={formData.target} onValueChange={(value: 'passengers' | 'drivers' | 'both') => 
          setFormData(prev => ({ ...prev, target: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="passengers">{t('passengers')}</SelectItem>
            <SelectItem value="drivers">{t('drivers')}</SelectItem>
            <SelectItem value="both">{t('both')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startsAt">Date de début</Label>
          <Input
            id="startsAt"
            type="date"
            value={formData.startsAt}
            onChange={(e) => setFormData(prev => ({ ...prev, startsAt: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="endsAt">Date de fin</Label>
          <Input
            id="endsAt"
            type="date"
            value={formData.endsAt}
            onChange={(e) => setFormData(prev => ({ ...prev, endsAt: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="imageUrl">URL de l'image (optionnel)</Label>
        <Input
          id="imageUrl"
          value={formData.imageUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div>
        <Label htmlFor="actionUrl">URL d'action (optionnel)</Label>
        <Input
          id="actionUrl"
          value={formData.actionUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, actionUrl: e.target.value }))}
          placeholder="https://example.com/action"
        />
      </div>

      <Button 
        onClick={editingCampaign ? handleUpdate : handleCreate}
        className="w-full"
      >
        {editingCampaign ? 'Mettre à jour' : t('create_campaign')}
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
            <h1 className="text-xl font-semibold">{t('marketing_campaigns')}</h1>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingCampaign(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                {t('create_campaign')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('create_campaign')}</DialogTitle>
                <DialogDescription>
                  Créez une nouvelle campagne marketing pour promouvoir SmartCabb auprès de vos utilisateurs.
                </DialogDescription>
              </DialogHeader>
              <CampaignForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-600" />
                  {campaign.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={campaign.isActive}
                    onCheckedChange={() => toggleCampaignStatus(campaign)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(campaign)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">{campaign.message}</p>
              
              {campaign.imageUrl && (
                <div className="relative">
                  <img 
                    src={campaign.imageUrl} 
                    alt={campaign.title}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Public:</span>
                  <span className="ml-2 font-medium">{getTargetLabel(campaign.target)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Statut:</span>
                  <span className={`ml-2 font-medium ${
                    campaign.isActive ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {campaign.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {campaign.startsAt.toLocaleDateString()} - {campaign.endsAt.toLocaleDateString()}
                  </span>
                </div>
              </div>

              {campaign.actionUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Action:</span>
                  <a 
                    href={campaign.actionUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Voir l'action
                  </a>
                </div>
              )}

              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                campaign.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {campaign.isActive ? 'Active' : 'Inactive'}
              </div>
            </CardContent>
          </Card>
        ))}

        {campaigns.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Aucune campagne créée</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer la première campagne
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCampaign} onOpenChange={() => setEditingCampaign(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la campagne</DialogTitle>
            <DialogDescription>
              Modifiez les paramètres de cette campagne marketing.
            </DialogDescription>
          </DialogHeader>
          <CampaignForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}