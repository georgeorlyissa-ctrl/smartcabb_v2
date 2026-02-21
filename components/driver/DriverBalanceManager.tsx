import { DollarSign, Save, RefreshCw, Database } from '../../lib/icons';
import { toast } from '../../lib/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface DriverBalanceManagerProps {
  driverId: string;
  currentBalance: number;
  onBalanceUpdate: (newBalance: number) => void;
}

// ✅ v517.78 - Composant pour gérer/restaurer le solde du conducteur
export function DriverBalanceManager({ 
  driverId, 
  currentBalance, 
  onBalanceUpdate 
}: DriverBalanceManagerProps) {
  const [newBalance, setNewBalance] = useState(currentBalance.toString());
  const [isLoading, setIsLoading] = useState(false);

  // Formater en CDF
  const formatCDF = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} CDF`;
  };

  // Synchroniser avec le backend
  const syncWithBackend = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}/balance`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const backendBalance = data.balance || 0;
          onBalanceUpdate(backendBalance);
          setNewBalance(backendBalance.toString());
          
          // Sauvegarder dans localStorage
          localStorage.setItem(`driver_balance_${driverId}`, backendBalance.toString());
          
          toast.success(`✅ Solde synchronisé: ${formatCDF(backendBalance)}`);
          console.log('✅ Solde récupéré du backend:', backendBalance);
        }
      } else {
        toast.error('❌ Impossible de récupérer le solde du backend');
      }
    } catch (error) {
      console.error('Erreur sync backend:', error);
      toast.error('❌ Erreur de synchronisation');
    } finally {
      setIsLoading(false);
    }
  };

  // Mettre à jour le solde (admin only)
  const updateBalance = async () => {
    const balanceValue = parseFloat(newBalance);
    
    if (isNaN(balanceValue) || balanceValue < 0) {
      toast.error('Montant invalide');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/drivers/${driverId}/balance`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            balance: balanceValue,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onBalanceUpdate(balanceValue);
          
          // Sauvegarder dans localStorage
          localStorage.setItem(`driver_balance_${driverId}`, balanceValue.toString());
          
          toast.success(`✅ Solde mis à jour: ${formatCDF(balanceValue)}`);
          console.log('✅ Solde mis à jour dans le backend:', balanceValue);
        }
      } else {
        toast.error('❌ Impossible de mettre à jour le solde');
      }
    } catch (error) {
      console.error('Erreur mise à jour solde:', error);
      toast.error('❌ Erreur de mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier le localStorage
  const checkLocalStorage = () => {
    const savedBalance = localStorage.getItem(`driver_balance_${driverId}`);
    
    if (savedBalance) {
      const balance = parseFloat(savedBalance);
      toast.info(`💾 Solde localStorage: ${formatCDF(balance)}`);
      console.log('💾 Solde dans localStorage:', balance);
    } else {
      toast.warning('⚠️ Aucun solde dans localStorage');
      console.warn('⚠️ Pas de solde dans localStorage pour ce conducteur');
    }
  };

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="flex items-center space-x-2 mb-3">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900">Gestionnaire de Solde</h3>
      </div>

      <div className="space-y-3">
        {/* Affichage solde actuel */}
        <div className="p-3 bg-white rounded-lg border">
          <p className="text-xs text-gray-600 mb-1">Solde actuel</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCDF(currentBalance)}
          </p>
        </div>

        {/* Bouton sync backend */}
        <Button
          onClick={syncWithBackend}
          disabled={isLoading}
          className="w-full"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Synchroniser avec Backend
        </Button>

        {/* Vérifier localStorage */}
        <Button
          onClick={checkLocalStorage}
          className="w-full"
          variant="outline"
        >
          <Database className="w-4 h-4 mr-2" />
          Vérifier localStorage
        </Button>

        {/* Mise à jour manuelle (admin) */}
        <div className="border-t pt-3">
          <Label htmlFor="new-balance" className="text-xs text-gray-600">
            Mettre à jour manuellement (Admin)
          </Label>
          <div className="flex space-x-2 mt-2">
            <Input
              id="new-balance"
              type="number"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              placeholder="Montant en CDF"
              disabled={isLoading}
            />
            <Button
              onClick={updateBalance}
              disabled={isLoading}
              size="sm"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}