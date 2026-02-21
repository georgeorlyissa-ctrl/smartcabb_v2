import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { DollarSign, TrendingUp, CreditCard, Smartphone, Globe, Mail, ArrowLeft } from '../../lib/admin-icons';
import { useAppState } from '../../hooks/useAppState';

export function BudgetDashboard() {
  const { setCurrentScreen } = useAppState();
  
  // Simulation des coûts basée sur l'activité
  const monthlyRides = 300; // Peut être dynamique
  const avgRidePrice = 5000; // CDF
  
  const revenue = monthlyRides * avgRidePrice;
  const fixedCosts = 40000; // SMS + Email
  const transactionFees = monthlyRides * 240; // Commission Flutterwave
  const smsCosts = monthlyRides * 2 * 125; // 2 SMS par course
  const totalCosts = fixedCosts + transactionFees + smsCosts;
  const costPercentage = revenue > 0 ? ((totalCosts / revenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => setCurrentScreen('admin-dashboard')}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-white text-2xl">Budget & Coûts SmartCabb</h1>
          <p className="text-white/70 mt-2">État de besoin détaillé - Domaine et API Mobile Money</p>
        </div>
      </div>

      {/* Cartes récapitulatives */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Revenus mensuels</p>
              <p className="text-white text-xl">{revenue.toLocaleString()} FC</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Coûts totaux</p>
              <p className="text-white text-xl">{totalCosts.toLocaleString()} FC</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">% du CA</p>
              <p className="text-white text-xl">{costPercentage}%</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Smartphone className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Courses/mois</p>
              <p className="text-white text-xl">{monthlyRides}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Investissement initial */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h2 className="text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Investissement Initial (Année 1)
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Domaine smartcabb.cd</span>
            <span className="text-white">87 500 FC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Domaine smartcabb.com</span>
            <span className="text-white">30 000 FC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Protection WHOIS</span>
            <span className="text-white">25 000 FC</span>
          </div>
          <div className="h-px bg-white/10 my-3"></div>
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">Sous-total domaine</span>
            <span className="text-white font-medium">142 500 FC</span>
          </div>
          <div className="h-px bg-white/10 my-3"></div>
          <div className="flex justify-between items-center">
            <span className="text-white/70">Email professionnel (optionnel)</span>
            <span className="text-white">180 000 FC</span>
          </div>
          <div className="h-px bg-white/10 my-3"></div>
          <div className="flex justify-between items-center">
            <span className="text-green-400 font-medium text-lg">TOTAL MINIMUM</span>
            <span className="text-green-400 font-medium text-lg">142 500 FC</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-blue-400 font-medium text-lg">TOTAL RECOMMANDÉ</span>
            <span className="text-blue-400 font-medium text-lg">322 500 FC</span>
          </div>
        </div>
      </Card>

      {/* Coûts mensuels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Coûts Fixes Mensuels
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/70">SMS (1000 messages)</span>
              <span className="text-white">25 000 FC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Email professionnel</span>
              <span className="text-white">15 000 FC</span>
            </div>
            <div className="h-px bg-white/10 my-3"></div>
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">TOTAL MENSUEL</span>
              <span className="text-white font-medium">40 000 FC</span>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-white mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Coûts Variables (ce mois)
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-white/70">Commission Flutterwave</span>
              <span className="text-white">{transactionFees.toLocaleString()} FC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">SMS courses (2 par course)</span>
              <span className="text-white">{smsCosts.toLocaleString()} FC</span>
            </div>
            <div className="h-px bg-white/10 my-3"></div>
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">TOTAL VARIABLE</span>
              <span className="text-white font-medium">{(transactionFees + smsCosts).toLocaleString()} FC</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparaison fournisseurs */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h2 className="text-white mb-4">Comparaison API Paiement Mobile Money</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/70 pb-3">Fournisseur</th>
                <th className="text-left text-white/70 pb-3">Commission</th>
                <th className="text-left text-white/70 pb-3">Activation</th>
                <th className="text-left text-white/70 pb-3">Support RDC</th>
                <th className="text-left text-white/70 pb-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr className="bg-green-500/10">
                <td className="py-3 text-white">
                  <span className="flex items-center gap-2">
                    Flutterwave ✅
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Intégré</span>
                  </span>
                </td>
                <td className="py-3 text-white">1.4% + 100 FC</td>
                <td className="py-3 text-green-400">GRATUIT</td>
                <td className="py-3 text-white">Excellent</td>
                <td className="py-3 text-yellow-400">⭐⭐⭐⭐⭐</td>
              </tr>
              <tr>
                <td className="py-3 text-white/70">Paystack</td>
                <td className="py-3 text-white/70">1.5% + 100 FC</td>
                <td className="py-3 text-white/70">Gratuit</td>
                <td className="py-3 text-white/70">Moyen</td>
                <td className="py-3 text-yellow-400/70">⭐⭐⭐⭐</td>
              </tr>
              <tr>
                <td className="py-3 text-white/70">Africa's Talking</td>
                <td className="py-3 text-white/70">2.0%</td>
                <td className="py-3 text-white/70">Gratuit</td>
                <td className="py-3 text-white/70">Bon</td>
                <td className="py-3 text-yellow-400/70">⭐⭐⭐</td>
              </tr>
              <tr>
                <td className="py-3 text-white/70">Intégration directe</td>
                <td className="py-3 text-white/70">0.5-1%</td>
                <td className="py-3 text-orange-400/70">Complexe</td>
                <td className="py-3 text-white/70">Excellent</td>
                <td className="py-3 text-yellow-400/70">⭐⭐⭐</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Simulations scénarios */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h2 className="text-white mb-4">Simulation Coûts selon Volume</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/70 pb-3">Scénario</th>
                <th className="text-left text-white/70 pb-3">Courses/mois</th>
                <th className="text-left text-white/70 pb-3">CA mensuel</th>
                <th className="text-left text-white/70 pb-3">Coûts totaux</th>
                <th className="text-left text-white/70 pb-3">% du CA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              <tr>
                <td className="py-3 text-yellow-400">Démarrage</td>
                <td className="py-3 text-white">100</td>
                <td className="py-3 text-white">500 000 FC</td>
                <td className="py-3 text-white">89 000 FC</td>
                <td className="py-3 text-green-400">17.8%</td>
              </tr>
              <tr className="bg-blue-500/10">
                <td className="py-3 text-blue-400">Croissance (actuel)</td>
                <td className="py-3 text-white">300</td>
                <td className="py-3 text-white">1 500 000 FC</td>
                <td className="py-3 text-white">187 000 FC</td>
                <td className="py-3 text-green-400">12.5%</td>
              </tr>
              <tr>
                <td className="py-3 text-purple-400">Maturité</td>
                <td className="py-3 text-white">1 000</td>
                <td className="py-3 text-white">5 000 000 FC</td>
                <td className="py-3 text-white">530 000 FC</td>
                <td className="py-3 text-green-400">10.6%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-white/60 text-sm mt-4">
          💡 Les coûts d'infrastructure diminuent proportionnellement avec l'augmentation du volume
        </p>
      </Card>

      {/* Checklist déploiement */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h2 className="text-white mb-4">Checklist Déploiement</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-white/90 mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Semaine 1: Domaine
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Acheter smartcabb.cd</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Acheter smartcabb.com</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Configurer Cloudflare</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Activer SSL/HTTPS</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Configurer DNS</span>
              </div>
              <p className="text-green-400 mt-3">Budget: 117 500 FC</p>
            </div>
          </div>

          <div>
            <h3 className="text-white/90 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Semaine 2: API
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Inscription Flutterwave</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Soumettre RCCM + NIF</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Validation compte</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Clés API production</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Tests paiements</span>
              </div>
              <p className="text-green-400 mt-3">Budget: 0 FC (gratuit)</p>
            </div>
          </div>

          <div>
            <h3 className="text-white/90 mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Semaine 3: Finalisation
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Email professionnel</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Mettre à jour app</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Tests complets</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">Formation équipe</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-white/70">🚀 LANCEMENT!</span>
              </div>
              <p className="text-blue-400 mt-3">Budget: 15 000 FC/mois</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Documents requis */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h2 className="text-white mb-4">Documents Requis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-white/90 mb-3">Pour Flutterwave Business:</h3>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                RCCM (Registre du Commerce)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                NIF (Numéro d'Identification Fiscale)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Pièce d'identité du directeur
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Justificatif de domicile entreprise
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-400">⚠</span>
                Relevé bancaire (optionnel)
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white/90 mb-3">Pour Domaine .cd:</h3>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Nom complet du propriétaire
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Adresse en RDC
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Email de contact
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Téléphone de contact
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Contacts */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h2 className="text-white mb-4">Contacts Fournisseurs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="text-white/90 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Congo DRC Registry (.cd)
            </h3>
            <p className="text-white/70 text-sm">Site: https://www.nic.cd</p>
            <p className="text-white/70 text-sm">Email: info@nic.cd</p>
            <p className="text-white/70 text-sm">Prix: 35 USD/an (87 500 FC)</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="text-white/90 mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Flutterwave
            </h3>
            <p className="text-white/70 text-sm">Site: https://flutterwave.com</p>
            <p className="text-white/70 text-sm">Support: support@flutterwave.com</p>
            <p className="text-white/70 text-sm">Frais: 1.4% + 100 FC/transaction</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="text-white/90 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Google Workspace
            </h3>
            <p className="text-white/70 text-sm">Site: https://workspace.google.com</p>
            <p className="text-white/70 text-sm">Prix: 6 USD/mois (15 000 FC)</p>
            <p className="text-white/70 text-sm">Inclus: Gmail, Drive, Meet</p>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="text-white/90 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Cloudflare (DNS/CDN)
            </h3>
            <p className="text-white/70 text-sm">Site: https://cloudflare.com</p>
            <p className="text-white/70 text-sm">Prix: GRATUIT (plan Free)</p>
            <p className="text-white/70 text-sm">Inclus: SSL, DNS, CDN, DDoS</p>
          </div>
        </div>
      </Card>

      {/* ROI */}
      <Card className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border-green-500/30 p-6">
        <h2 className="text-white mb-4">📊 ROI Attendu - Domaine .cd</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-white/70 text-sm">Confiance clients</p>
            <p className="text-green-400 text-2xl">+33%</p>
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm">Conversions</p>
            <p className="text-green-400 text-2xl">+20%</p>
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm">Support qualifié</p>
            <p className="text-green-400 text-2xl">+40%</p>
          </div>
          <div className="text-center">
            <p className="text-white/70 text-sm">SEO/Visibilité</p>
            <p className="text-green-400 text-2xl">+50%</p>
          </div>
        </div>
        <div className="border-t border-white/10 pt-4 text-center">
          <p className="text-white/70 text-sm mb-2">
            Investissement: 142 500 FC | Gains annuels estimés: 600 000 FC
          </p>
          <p className="text-white text-3xl">
            ROI: <span className="text-green-400">421%</span> 🚀
          </p>
        </div>
      </Card>
    </div>
  );
}