import { Button } from '../ui/button';
import { toast } from '../../lib/toast';
import { Share2, Check, Copy, MessageCircle, Mail, Facebook, Twitter } from '../../lib/icons';

interface ShareRideProps {
  rideDetails: {
    pickup_address: string;
    dropoff_address: string;
    estimated_time?: string;
    category?: string;
    driver_name?: string;
    driver_phone?: string;
    ride_id?: string;
  };
  onClose?: () => void;
}

export function ShareRide({ rideDetails, onClose }: ShareRideProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Générer le lien de partage
  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      pickup: rideDetails.pickup_address,
      dropoff: rideDetails.dropoff_address,
      ...(rideDetails.ride_id && { rideId: rideDetails.ride_id })
    });
    return `${baseUrl}/track-ride?${params.toString()}`;
  };

  // Générer le message de partage
  const generateShareMessage = () => {
    let message = `🚕 Suivez ma course SmartCabb en temps réel !\n\n`;
    message += `📍 Départ: ${rideDetails.pickup_address}\n`;
    message += `📍 Arrivée: ${rideDetails.dropoff_address}\n`;
    
    if (rideDetails.estimated_time) {
      message += `⏱️ Durée estimée: ${rideDetails.estimated_time}\n`;
    }
    
    if (rideDetails.driver_name) {
      message += `👤 Conducteur: ${rideDetails.driver_name}\n`;
    }
    
    message += `\n🔗 Lien de suivi: ${generateShareLink()}`;
    
    return message;
  };

  // Copier le lien dans le presse-papier
  const handleCopyLink = async () => {
    const link = generateShareLink();
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Lien copié !');
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      toast.error('Erreur lors de la copie du lien');
    }
  };

  // Partager via Web Share API (mobile)
  const handleNativeShare = async () => {
    if (!navigator.share) {
      toast.error('Le partage n\'est pas disponible sur cet appareil');
      return;
    }

    try {
      await navigator.share({
        title: 'Ma course SmartCabb',
        text: generateShareMessage(),
        url: generateShareLink()
      });
      toast.success('Partagé avec succès');
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Erreur lors du partage:', error);
        toast.error('Erreur lors du partage');
      }
    }
  };

  // Partager par SMS
  const handleShareSMS = () => {
    const message = generateShareMessage();
    const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  };

  // Partager par Email
  const handleShareEmail = () => {
    const subject = 'Suivez ma course SmartCabb';
    const body = generateShareMessage();
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  // Partager sur WhatsApp
  const handleShareWhatsApp = () => {
    const message = generateShareMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Partager sur Facebook
  const handleShareFacebook = () => {
    const link = generateShareLink();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  // Partager sur Twitter
  const handleShareTwitter = () => {
    const message = `🚕 Suivez ma course SmartCabb de ${rideDetails.pickup_address} vers ${rideDetails.dropoff_address}`;
    const link = generateShareLink();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  return (
    <>
      {/* Bouton de partage */}
      <Button
        onClick={() => setShowDialog(true)}
        variant="outline"
        className="gap-2"
      >
        <Share2 className="w-4 h-4" />
        Partager
      </Button>

      {/* Dialog de partage */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Partager ma course
            </DialogTitle>
            <DialogDescription>
              Partagez les détails de votre course avec vos proches
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Détails de la course */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Départ</p>
                  <p className="text-sm text-gray-900">{rideDetails.pickup_address}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Arrivée</p>
                  <p className="text-sm text-gray-900">{rideDetails.dropoff_address}</p>
                </div>
              </div>
            </div>

            {/* Lien de partage */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Lien de suivi</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generateShareLink()}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600"
                />
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className={`flex-shrink-0 ${copied ? 'bg-green-50 border-green-500' : ''}`}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Bouton de partage natif (mobile) */}
            {navigator.share && (
              <Button
                onClick={handleNativeShare}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
            )}

            {/* Options de partage */}
            <div>
              <p className="text-sm text-gray-600 mb-3">Partager via</p>
              <div className="grid grid-cols-2 gap-3">
                {/* WhatsApp */}
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                >
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-900">WhatsApp</span>
                </button>

                {/* SMS */}
                <button
                  onClick={handleShareSMS}
                  className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                >
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-900">SMS</span>
                </button>

                {/* Email */}
                <button
                  onClick={handleShareEmail}
                  className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
                >
                  <Mail className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-900">Email</span>
                </button>

                {/* Facebook */}
                <button
                  onClick={handleShareFacebook}
                  className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                >
                  <Facebook className="w-5 h-5 text-blue-700" />
                  <span className="text-sm text-gray-900">Facebook</span>
                </button>

                {/* Twitter */}
                <button
                  onClick={handleShareTwitter}
                  className="flex items-center gap-3 p-3 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors group"
                >
                  <Twitter className="w-5 h-5 text-sky-500" />
                  <span className="text-sm text-gray-900">Twitter</span>
                </button>

                {/* Plus d'options */}
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <Copy className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-900">Copier lien</span>
                </button>
              </div>
            </div>

            {/* Informations de sécurité */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                ℹ️ Le lien de partage permet à vos proches de suivre votre trajet en temps réel pour votre sécurité.
              </p>
            </div>

            {/* Bouton fermer */}
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              className="w-full"
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}