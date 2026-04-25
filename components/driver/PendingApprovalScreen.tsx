import { useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { useAppState } from '../../hooks/useAppState';
import { safeFormatDate } from '../../utils/dateHelpers';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from '../../lib/toast';

interface PendingApprovalScreenProps {
  driverName: string;
  driverPhone: string;
  registrationDate?: string;
  onLogout?: () => void;
}

export function PendingApprovalScreen({ 
  driverName, 
  driverPhone,
  registrationDate,
  onLogout 
}: PendingApprovalScreenProps) {
  const { setCurrentScreen, state, setCurrentDriver } = useAppState();
  const driverIdRef = useRef<string | null>(state.currentDriver?.id || state.currentUser?.id || null);

  // ─── Polling : détecter l'approbation admin en temps réel ────────────────
  useEffect(() => {
    const driverId = driverIdRef.current;
    if (!driverId) return;

    const checkApproval = async () => {
      try {
        const resp = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        if (!resp.ok) return;
        const data = await resp.json();
        const driver = data.driver || data;
        
        if (driver?.isApproved === true || driver?.status === 'approved' || driver?.is_approved === true) {
          console.log('✅ Compte approuvé par l\'admin !');
          // Mettre à jour le state local
          if (setCurrentDriver) setCurrentDriver({ ...driver });
          toast.success('🎉 Votre compte a été approuvé !', {
            description: 'Vous pouvez maintenant vous mettre en ligne et accepter des courses.'
          });
          // Rediriger vers le dashboard conducteur
          setTimeout(() => setCurrentScreen('driver-dashboard'), 1500);
        }
      } catch (_) {}
    };

    // Vérifier immédiatement puis toutes les 15 secondes
    checkApproval();
    const interval = setInterval(checkApproval, 15_000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    if (onLogout) onLogout();
    setCurrentScreen('driver-welcome');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        
        {/* Icône d'attente */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <Clock className="w-12 h-12 text-yellow-600 animate-pulse" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl text-gray-900 mb-3">
            Compte en attente d'approbation
          </h1>
          
          <p className="text-gray-600 text-lg">
            Bonjour <span className="font-semibold text-gray-900">{driverName}</span> 👋
          </p>
        </div>

        {/* Message principal */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl text-gray-900 mb-3">
                Votre inscription est en cours de vérification
              </h2>
              
              <div className="space-y-2 text-gray-700">
                <p>✅ Votre demande a été reçue avec succès</p>
                <p>⏳ Un administrateur examine actuellement votre dossier</p>
                <p>📞 Vous recevrez une notification par SMS dès validation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informations */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8">
          <h3 className="text-lg text-gray-900 mb-4">
            Vos informations
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <Phone className="w-5 h-5 text-gray-400" />
              <span>{driverPhone}</span>
            </div>
            
            {registrationDate && (
              <div className="flex items-center gap-3 text-gray-700">
                <Clock className="w-5 h-5 text-gray-400" />
                <span>Inscrit le {safeFormatDate(registrationDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Délais d'approbation */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h3 className="text-lg text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Délai d'approbation
          </h3>
          
          <p className="text-gray-700">
            L'approbation de votre compte prend généralement <span className="font-semibold">24 à 48 heures ouvrables</span>. 
            Si vous n'avez pas de nouvelles sous 3 jours ouvrables, veuillez contacter le support.
          </p>
        </div>

        {/* Contact support */}
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h3 className="text-lg text-gray-900 mb-4">
            Besoin d'aide ?
          </h3>
          
          <div className="grid gap-3">
            <a 
              href="tel:+243123456789" 
              className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <Phone className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-semibold text-gray-900">Appelez-nous</div>
                <div className="text-sm text-gray-600">+243 123 456 789</div>
              </div>
            </a>
            
            <a 
              href="mailto:support@smartcabb.app" 
              className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-semibold text-gray-900">Envoyez un email</div>
                <div className="text-sm text-gray-600">support@smartcabb.app</div>
              </div>
            </a>
          </div>
        </div>

        {/* Bouton déconnexion */}
        <div className="text-center">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-12"
          >
            Se déconnecter
          </Button>
        </div>

      </div>
    </div>
  );
}
