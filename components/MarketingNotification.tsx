import { useState, useEffect } from 'react';
import { motion } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Card } from './ui/card';
import { Button } from './ui/button';
import { X, ExternalLink } from '../lib/icons';
import { useAppState } from '../hooks/useAppState';
import { MarketingCampaign } from '../types';

interface MarketingNotificationProps {
  userType: 'passengers' | 'drivers';
}

export function MarketingNotification({ userType }: MarketingNotificationProps) {
  const { campaigns } = useAppState();
  const [currentCampaign, setCurrentCampaign] = useState<MarketingCampaign | null>(null);
  const [dismissedCampaigns, setDismissedCampaigns] = useState<string[]>([]);

  useEffect(() => {
    // Find active campaigns targeting this user type
    const activeCampaigns = campaigns.filter(campaign => 
      campaign.isActive &&
      (campaign.target === userType || campaign.target === 'both') &&
      new Date() >= campaign.startsAt &&
      new Date() <= campaign.endsAt &&
      !dismissedCampaigns.includes(campaign.id)
    );

    // Show the first active campaign
    if (activeCampaigns.length > 0) {
      setCurrentCampaign(activeCampaigns[0]);
    }
  }, [campaigns, userType, dismissedCampaigns]);

  const handleDismiss = () => {
    if (currentCampaign) {
      setDismissedCampaigns(prev => [...prev, currentCampaign.id]);
      setCurrentCampaign(null);
    }
  };

  const handleAction = () => {
    if (currentCampaign?.actionUrl) {
      window.open(currentCampaign.actionUrl, '_blank');
    }
    handleDismiss();
  };

  if (!currentCampaign) {
    return null;
  }

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-4 left-4 right-4 z-50"
    >
      <Card className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            {currentCampaign.imageUrl && (
              <div className="mb-3">
                <img 
                  src={currentCampaign.imageUrl} 
                  alt={currentCampaign.title}
                  className="w-full h-24 object-cover rounded-lg"
                />
              </div>
            )}
            
            <h3 className="font-semibold text-lg mb-2">
              {currentCampaign.title}
            </h3>
            
            <p className="text-sm text-blue-100 mb-4">
              {currentCampaign.message}
            </p>
            
            <div className="flex gap-2">
              {currentCampaign.actionUrl && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAction}
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Voir plus
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-white hover:bg-white/20"
              >
                Fermer
              </Button>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-white hover:bg-white/20 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}