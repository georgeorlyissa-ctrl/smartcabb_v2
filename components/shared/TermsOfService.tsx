import { ScrollArea } from '../ui/scroll-area';
import { memo } from 'react';

/**
 * Conditions Générales d'Utilisation Unifiées
 * Utilisées de manière identique pour les passagers et les conducteurs
 */
export const TermsOfService = memo(function TermsOfService() {
  return (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-6 p-6 pr-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl mb-2">Conditions Générales d'Utilisation</h1>
          <p className="text-sm text-gray-600">des Services SmartCabb</p>
          <p className="text-xs text-gray-500 mt-2">République Démocratique du Congo</p>
          <p className="text-xs text-gray-400 mt-1">Dernière mise à jour : 24 octobre 2025</p>
        </div>

        <section>
          <h2 className="text-lg mb-3">1. Introduction</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Les présentes Conditions Générales d'Utilisation ("CGU") régissent l'accès et l'utilisation de la 
            plateforme SmartCabb, une application mobile et un site web permettant aux utilisateurs de commander 
            des services de transport à la demande fournis par des chauffeurs indépendants.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            En accédant ou en utilisant la plateforme, vous acceptez d'être lié par ces CGU. Si vous n'acceptez 
            pas ces termes, veuillez ne pas utiliser nos services.
          </p>
        </section>

        <section>
          <h2 className="text-lg mb-3">2. Services de la Plateforme</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            SmartCabb est une plateforme technologique qui met en relation des passagers et des chauffeurs. 
            Nous ne fournissons pas de services de transport. Les services de transport sont fournis par des 
            chauffeurs indépendants qui ont signé un contrat avec nous.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              <strong>Important :</strong> SmartCabb n'est pas responsable des actes ou omissions des chauffeurs. 
              Les chauffeurs sont des partenaires indépendants et non des employés de SmartCabb.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">3. Utilisation de la Plateforme</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-800 mb-2">3.1. Création de Compte</h3>
              <p className="text-sm text-gray-700 leading-relaxed ml-4">
                Vous devez créer un compte pour utiliser la plateforme. Vous devez fournir des informations 
                exactes et à jour, y compris votre nom, numéro de téléphone et adresse e-mail. Vous êtes 
                responsable de la confidentialité de votre mot de passe et de toutes les activités qui se 
                déroulent sur votre compte.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-800 mb-2">3.2. Réservations</h3>
              <div className="text-sm text-gray-700 ml-4 space-y-2">
                <p>Vous pouvez commander un trajet via l'application mobile. Vous recevrez :</p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Une confirmation de réservation</li>
                  <li>Le nom du chauffeur</li>
                  <li>La photo du chauffeur</li>
                  <li>La marque du véhicule</li>
                  <li>Le numéro d'immatriculation du véhicule</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-800 mb-2">3.3. Annulations</h3>
              <div className="bg-orange-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                <p>Vous pouvez annuler une réservation à tout moment.</p>
                <p className="font-medium text-orange-900">
                  ⚠️ Des frais d'annulation peuvent s'appliquer si vous annulez après un certain délai 
                  ou si le chauffeur est déjà en route.
                </p>
                <div className="ml-4 space-y-1 text-sm">
                  <p>• Gratuite dans les 2 premières minutes</p>
                  <p>• 2,000 CDF après acceptation du conducteur</p>
                  <p>• 5,000 CDF si le conducteur est en route</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-800 mb-2">3.4. Conduite et Comportement</h3>
              <div className="text-sm text-gray-700 ml-4 space-y-2">
                <p>Vous devez vous comporter de manière respectueuse envers les chauffeurs et les autres passagers.</p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                  <p className="font-semibold text-red-900 mb-2">❌ Comportements Strictement Interdits :</p>
                  <ul className="space-y-1 text-red-800">
                    <li>• Violence physique ou verbale</li>
                    <li>• Harcèlement de quelque nature que ce soit</li>
                    <li>• Consommation de drogues illégales</li>
                    <li>• Comportement inapproprié ou discriminatoire</li>
                  </ul>
                  <p className="mt-2 font-medium">
                    ⚠️ Ces comportements entraîneront la suspension ou la suppression immédiate de votre compte.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">4. Paiement</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-800 mb-2">4.1. Tarification</h3>
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                <p>
                  Les tarifs sont basés sur la distance parcourue, le temps de trajet et la demande. 
                  Une estimation du coût sera affichée dans l'application avant de confirmer la commande.
                </p>
                <p className="font-medium text-blue-900">
                  ℹ️ Le tarif final peut être ajusté en cas de modification de l'itinéraire ou de temps 
                  d'attente excessif (au-delà de 10 minutes gratuites).
                </p>
                
                <div className="mt-3 border-t border-blue-200 pt-3">
                  <p className="font-semibold text-blue-900 mb-2">Grille Tarifaire SmartCabb (Officielle 2025) :</p>
                  <div className="space-y-2">
                    <div>
                      <p><strong>🚗 SmartCabb Standard</strong> (3 places, Climatisé)</p>
                      <p className="ml-4 text-sm">• Course : 7$/h (jour 06h-20h59) | 10$/h (nuit 21h-05h59)</p>
                      <p className="ml-4 text-sm">• Location : 60$/jour | Aéroport : 35$ (AR) / 70$ (A+R)</p>
                    </div>
                    <div>
                      <p><strong>🚙 SmartCabb Confort</strong> (3 places, Climatisé, Data)</p>
                      <p className="ml-4 text-sm">• Course : 15$/h (jour) | 17$/h (nuit)</p>
                      <p className="ml-4 text-sm">• Location : 80$/jour | Aéroport : 50$ (AR) / 90$ (A+R)</p>
                    </div>
                    <div>
                      <p><strong>🚐 SmartCabb Plus</strong> (4 places, Climatisé, Data)</p>
                      <p className="ml-4 text-sm">• Course : 15$/h (jour) | 20$/h (nuit)</p>
                      <p className="ml-4 text-sm">• Location : 100$/jour | Aéroport : 60$ (AR) / 110$ (A+R)</p>
                    </div>
                    <div>
                      <p><strong>🚗 SmartCabb Business</strong> (4 places VIP, Rafraîchissement)</p>
                      <p className="ml-4 text-sm">• Location uniquement : 160$/jour</p>
                      <p className="ml-4 text-sm">• Aéroport : 100$ (AR) / 200$ (A+R)</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">
                    Zone lointaine : doublement 1ère heure | Tolérance : 10 min | 
                    Location : carburant à charge du client | Aéroport : parking à charge
                  </p>
                  <p className="mt-2 text-xs">
                    <strong>Zones lointaines :</strong> Tarif × 2 pour la 1ère heure
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-800 mb-2">4.2. Modes de Paiement</h3>
              <div className="bg-green-50 rounded-lg p-4 text-sm text-gray-700">
                <p className="font-medium mb-2">Les paiements peuvent être effectués par :</p>
                <ul className="space-y-1 ml-4">
                  <li>💵 <strong>Espèces</strong> (à remettre au chauffeur)</li>
                  <li>💳 <strong>Carte de crédit</strong> (via Flutterwave)</li>
                  <li>📱 <strong>Mobile Money</strong> disponibles en RDC :
                    <ul className="ml-6 mt-1 text-xs space-y-1">
                      <li>- Airtel Money</li>
                      <li>- Orange Money</li>
                      <li>- M-Pesa</li>
                      <li>- Vodacom M-Pesa</li>
                    </ul>
                  </li>
                  <li>📋 <strong>Post-paiement</strong> (sous réserve d'approbation, frais de 5,000 CDF)</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-800 mb-2">4.3. Facturation</h3>
              <p className="text-sm text-gray-700 ml-4">
                Une fois le trajet terminé, une facture détaillée sera envoyée à l'adresse e-mail 
                associée à votre compte. La facture comprendra tous les détails de la course, y compris 
                la distance, la durée, et les frais applicables.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">5. Responsabilité et Limitation de Responsabilité</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p>
                SmartCabb s'efforce de garantir la fiabilité et la sécurité de sa plateforme. Toutefois, 
                nous ne garantissons pas que les services seront ininterrompus, sécurisés ou exempts d'erreurs.
              </p>
            </div>

            <div className="border-l-4 border-orange-400 pl-4 space-y-2">
              <p className="font-medium">Limitations de responsabilité :</p>
              <ul className="space-y-1 ml-4">
                <li>
                  • SmartCabb ne sera pas responsable des dommages directs, indirects ou consécutifs 
                  résultant de l'utilisation de la plateforme ou des services de transport, sauf en cas 
                  de faute grave de notre part.
                </li>
                <li>
                  • Nous ne sommes pas responsables des objets perdus ou endommagés lors d'un trajet. 
                  Vous êtes responsable de vos biens personnels.
                </li>
                <li>
                  • SmartCabb n'est pas responsable des actes, erreurs ou omissions des chauffeurs 
                  partenaires indépendants.
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="font-medium text-blue-900 mb-2">🛡️ Mesures de Sécurité :</p>
              <ul className="space-y-1 text-blue-800">
                <li>• Vérification des chauffeurs avant activation</li>
                <li>• Suivi GPS en temps réel de toutes les courses</li>
                <li>• Bouton SOS d'urgence dans l'application</li>
                <li>• Système de notation et d'évaluation</li>
                <li>• Support client disponible 24h/24, 7j/7</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">6. Propriété Intellectuelle</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            L'ensemble du contenu de l'application SmartCabb, y compris les textes, graphiques, logos, 
            et logiciels, est la propriété exclusive de SmartCabb SARL et est protégé par les lois sur 
            la propriété intellectuelle de la République Démocratique du Congo et les conventions internationales.
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-3">
            <p className="text-sm text-purple-900">
              <strong>⚠️ Important :</strong> Vous ne pouvez pas copier, modifier, distribuer, transmettre, 
              afficher, reproduire, publier ou créer des œuvres dérivées de ce contenu sans notre autorisation 
              écrite explicite.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">7. Modifications des CGU</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            SmartCabb se réserve le droit de modifier les présentes CGU à tout moment. Les modifications 
            prendront effet dès leur publication sur la plateforme.
          </p>
          <div className="bg-yellow-50 rounded-lg p-4 mt-3 text-sm">
            <p className="text-yellow-900">
              <strong>📢 Notification :</strong> Les modifications importantes vous seront notifiées par e-mail 
              ou notification dans l'application. En continuant d'utiliser nos services après la publication 
              des modifications, vous acceptez d'être lié par les nouvelles conditions.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">8. Loi Applicable et Juridiction</h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
            <p>
              Les présentes CGU sont régies par les lois de la <strong>République Démocratique du Congo</strong>.
            </p>
            <p>
              Tout litige découlant de l'utilisation de la plateforme sera soumis à la juridiction exclusive 
              des tribunaux de <strong>Kinshasa, RDC</strong>.
            </p>
            <p className="text-xs text-gray-600 mt-2">
              En cas de traduction de ces CGU dans d'autres langues, la version française prévaudra en cas 
              de divergence d'interprétation.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">9. Contactez-nous</h2>
          <div className="bg-green-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-800">
              Pour toute question concernant ces CGU, veuillez nous contacter :
            </p>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>📧 Email :</strong> support@smartcabb.cd</p>
              <p><strong>📞 Téléphone :</strong> +243 990 666 661 ou +243 814 018 048</p>
              <p><strong>📍 Adresse :</strong> Kinshasa, République Démocratique du Congo</p>
              <p><strong>🕐 Support :</strong> Disponible 24h/24, 7j/7</p>
            </div>
          </div>
        </section>

        <section className="border-t pt-4 mt-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 text-center mb-2">
              En utilisant les services SmartCabb, vous reconnaissez avoir lu, compris et accepté 
              ces Conditions Générales d'Utilisation dans leur intégralité.
            </p>
            <p className="text-xs text-gray-500 text-center">
              © 2026 SmartCabb SARL - Tous droits réservés<br/>
              Entreprise enregistrée en République Démocratique du Congo
            </p>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
});