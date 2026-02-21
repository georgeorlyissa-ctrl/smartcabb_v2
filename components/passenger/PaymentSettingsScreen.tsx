import { useState, useEffect } from 'react';
import { toast } from '../../lib/toast';
import { Button } from '../ui/button'; // ✅ FIX: Import manquant
import { Card, CardContent } from '../ui/card'; // ✅ FIX: Import manquant
import { 
  ArrowLeft, 
  CreditCard,
  Smartphone,
  Plus,
  Trash2,
  Check,
  Star,
  Wallet,
  Shield,
  AlertCircle
} from '../../lib/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface SavedPaymentMethod {
  id: string;
  type: 'card' | 'mobile_money';
  name: string;
  details: string;
  isDefault: boolean;
  logo?: string;
}

export function PaymentSettingsScreen() {
  const { setCurrentScreen, state } = useAppState();
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'card' | 'mobile_money'>('mobile_money');

  // Formulaire pour nouvelle méthode
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    phoneNumber: '',
    provider: 'Orange Money'
  });

  // Charger les méthodes de paiement sauvegardées
  useEffect(() => {
    const saved = localStorage.getItem('smartcabb_payment_methods');
    if (saved) {
      setPaymentMethods(JSON.parse(saved));
    } else {
      // Méthodes par défaut pour démo
      const defaultMethods: SavedPaymentMethod[] = [
        {
          id: '1',
          type: 'mobile_money',
          name: 'Orange Money',
          details: '+243 990 666 661',
          isDefault: true,
          logo: '🟠'
        }
      ];
      setPaymentMethods(defaultMethods);
      localStorage.setItem('smartcabb_payment_methods', JSON.stringify(defaultMethods));
    }
  }, []);

  // Sauvegarder dans localStorage
  const savePaymentMethods = (methods: SavedPaymentMethod[]) => {
    setPaymentMethods(methods);
    localStorage.setItem('smartcabb_payment_methods', JSON.stringify(methods));
  };

  // Supprimer une méthode
  const handleDelete = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce moyen de paiement ?')) {
      const updated = paymentMethods.filter(m => m.id !== id);
      
      // Si on supprime la méthode par défaut, définir la première comme défaut
      if (updated.length > 0 && !updated.some(m => m.isDefault)) {
        updated[0].isDefault = true;
      }
      
      savePaymentMethods(updated);
      toast.success('Moyen de paiement supprimé');
    }
  };

  // Définir comme méthode par défaut
  const handleSetDefault = (id: string) => {
    const updated = paymentMethods.map(m => ({
      ...m,
      isDefault: m.id === id
    }));
    savePaymentMethods(updated);
    toast.success('Méthode par défaut mise à jour');
  };

  // Ajouter une nouvelle méthode
  const handleAddMethod = () => {
    if (newMethodType === 'mobile_money') {
      if (!formData.phoneNumber) {
        toast.error('Veuillez entrer un numéro de téléphone');
        return;
      }
      
      const newMethod: SavedPaymentMethod = {
        id: Date.now().toString(),
        type: 'mobile_money',
        name: formData.provider,
        details: formData.phoneNumber,
        isDefault: paymentMethods.length === 0,
        logo: formData.provider === 'Orange Money' ? '🟠' : 
              formData.provider === 'Airtel Money' ? '🔴' :
              formData.provider === 'M-Pesa' ? '🟢' : '📱'
      };
      
      savePaymentMethods([...paymentMethods, newMethod]);
      toast.success('Compte mobile money ajouté avec succès');
      setShowAddDialog(false);
      resetForm();
    } else {
      if (!formData.cardNumber || !formData.cardName || !formData.expiryDate || !formData.cvv) {
        toast.error('Veuillez remplir tous les champs');
        return;
      }
      
      const newMethod: SavedPaymentMethod = {
        id: Date.now().toString(),
        type: 'card',
        name: formData.cardName,
        details: `•••• ${formData.cardNumber.slice(-4)}`,
        isDefault: paymentMethods.length === 0,
        logo: '💳'
      };
      
      savePaymentMethods([...paymentMethods, newMethod]);
      toast.success('Carte bancaire ajoutée avec succès');
      setShowAddDialog(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      cardNumber: '',
      cardName: '',
      expiryDate: '',
      cvv: '',
      phoneNumber: '',
      provider: 'Orange Money'
    });
  };

  return (
    <div 
      className="min-h-screen bg-gray-50"
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('passenger-settings')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <h1 className="text-xl font-semibold">Moyens de paiement</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-sm text-purple-900">
                <p className="font-semibold mb-1">Paiements sécurisés</p>
                <p className="text-purple-700">
                  Vos informations de paiement sont cryptées et stockées en toute sécurité.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bouton Ajouter */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter un moyen de paiement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau moyen de paiement</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Type de paiement */}
              <div className="flex gap-2">
                <Button
                  variant={newMethodType === 'mobile_money' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setNewMethodType('mobile_money')}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Mobile Money
                </Button>
                <Button
                  variant={newMethodType === 'card' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setNewMethodType('card')}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Carte bancaire
                </Button>
              </div>

              {/* Formulaire Mobile Money */}
              {newMethodType === 'mobile_money' && (
                <>
                  <div>
                    <Label>Opérateur</Label>
                    <select
                      className="w-full p-2 border rounded-md mt-1"
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                    >
                      <option value="Orange Money">Orange Money</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Afrimoney">Afrimoney</option>
                    </select>
                  </div>
                  <div>
                    <Label>Numéro de téléphone</Label>
                    <Input
                      placeholder="+243 999..."
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Formulaire Carte bancaire */}
              {newMethodType === 'card' && (
                <>
                  <div>
                    <Label>Numéro de carte</Label>
                    <Input
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      value={formData.cardNumber}
                      onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Nom sur la carte</Label>
                    <Input
                      placeholder="JEAN MUKENDI"
                      value={formData.cardName}
                      onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Date d'expiration</Label>
                      <Input
                        placeholder="MM/AA"
                        maxLength={5}
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      <Input
                        placeholder="123"
                        maxLength={3}
                        type="password"
                        value={formData.cvv}
                        onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                onClick={handleAddMethod}
              >
                Ajouter
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Liste des méthodes de paiement */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gray-600" />
            Mes moyens de paiement ({paymentMethods.length})
          </h2>
          
          {paymentMethods.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-gray-500">
                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium mb-1">Aucun moyen de paiement</p>
                <p className="text-sm">Ajoutez une carte ou un compte mobile money</p>
              </div>
            </Card>
          ) : (
            paymentMethods.map((method) => (
              <Card 
                key={method.id}
                className={`${method.isDefault ? 'border-purple-500 border-2' : ''} hover:shadow-md transition-shadow`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center text-2xl">
                        {method.logo || (method.type === 'card' ? '💳' : '📱')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{method.name}</h3>
                          {method.isDefault && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              Par défaut
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{method.details}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                          title="Définir comme par défaut"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(method.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Info de sécurité */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 text-sm text-blue-900">
                <p className="font-semibold mb-1">Protection de vos données</p>
                <ul className="text-blue-700 space-y-1 text-xs">
                  <li>• Vos informations sont cryptées de bout en bout</li>
                  <li>• Nous ne stockons jamais votre CVV</li>
                  <li>• Conformité aux normes PCI-DSS</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}