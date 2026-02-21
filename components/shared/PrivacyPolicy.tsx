import { ScrollArea } from '../ui/scroll-area';
import { memo } from 'react';

/**
 * Politique de Confidentialité Unifiée
 * Utilisée de manière identique pour les passagers et les conducteurs
 */
export const PrivacyPolicy = memo(function PrivacyPolicy() {
  return (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-6 p-6 pr-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl mb-2">Politique de Confidentialité</h1>
          <p className="text-sm text-gray-600">SmartCabb SARL</p>
          <p className="text-xs text-gray-500 mt-2">République Démocratique du Congo</p>
          <p className="text-xs text-gray-400 mt-1">Dernière mise à jour : 24 octobre 2025</p>
        </div>

        <section>
          <h2 className="text-lg mb-3">1. Introduction</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            La présente Politique de Confidentialité décrit la manière dont SmartCabb SARL ("nous", "notre" ou "l'entreprise") 
            collecte, utilise, protège et partage les informations personnelles de ses utilisateurs (passagers et conducteurs) 
            via son application mobile et son site web.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            SmartCabb s'engage à protéger la confidentialité, l'intégrité et la sécurité de vos données personnelles conformément 
            aux lois en vigueur en République Démocratique du Congo (RDC).
          </p>
        </section>

        <section>
          <h2 className="text-lg mb-3">2. Données que Nous Collectons</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Nous collectons différentes catégories de données selon votre rôle (passager ou conducteur) :
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-800 mb-2">A. Données Communes (Passagers et Conducteurs)</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div>
                  <p className="font-medium text-gray-800">• Données d'Identité</p>
                  <p className="text-gray-600 ml-4">Nom, prénom, numéro de téléphone, adresse e-mail, photo de profil.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800">• Données de Localisation</p>
                  <p className="text-gray-600 ml-4">Géolocalisation GPS en temps réel pendant les trajets.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800">• Données de Transaction</p>
                  <p className="text-gray-600 ml-4">Historique des courses, montants, modes de paiement.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800">• Données de Communication</p>
                  <p className="text-gray-600 ml-4">Messages, appels, évaluations, signalements.</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-800 mb-2">B. Données Spécifiques aux Conducteurs</h3>
              <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                <div>
                  <p className="font-medium text-gray-800">• Documents Légaux</p>
                  <p className="text-gray-600 ml-4">Permis de conduire, carte d'identité, assurance, certificat médical.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800">• Informations Véhicule</p>
                  <p className="text-gray-600 ml-4">Immatriculation, marque, modèle, année, couleur, catégorie.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800">• Données Financières</p>
                  <p className="text-gray-600 ml-4">Compte bancaire ou mobile money pour les paiements.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800">• Données de Performance</p>
                  <p className="text-gray-600 ml-4">Note moyenne, nombre de courses, taux d'acceptation, annulations.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">3. Comment Nous Utilisons Vos Données</h2>
          <div className="bg-green-50 rounded-lg p-4 space-y-3 text-sm">
            <p className="font-medium text-gray-800">Vos données sont utilisées pour :</p>
            <ul className="space-y-2 text-gray-700 ml-4">
              <li>✓ Faciliter la mise en relation entre passagers et conducteurs</li>
              <li>✓ Traiter les paiements et générer les reçus</li>
              <li>✓ Assurer votre sécurité et celle des autres utilisateurs</li>
              <li>✓ Améliorer la qualité de nos services</li>
              <li>✓ Envoyer des notifications importantes (course, paiement, sécurité)</li>
              <li>✓ Gérer le support client et traiter les réclamations</li>
              <li>✓ Respecter nos obligations légales et réglementaires</li>
              <li>✓ Prévenir la fraude et les activités illégales</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">4. Partage de Vos Données</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Nous ne vendons jamais vos données personnelles. Nous les partageons uniquement dans les cas suivants :
          </p>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>• Entre Utilisateurs :</strong> Nom, photo et note du conducteur visible par le passager et vice-versa pendant la course.</p>
            <p><strong>• Prestataires de Services :</strong> Fournisseurs de paiement (Flutterwave), services SMS, hébergement cloud.</p>
            <p><strong>• Autorités :</strong> En cas de réquisition légale ou pour prévenir un danger imminent.</p>
            <p><strong>• Assureurs :</strong> En cas d'accident ou de litige nécessitant une enquête.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">5. Protection de Vos Données</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles :
          </p>
          <div className="bg-purple-50 rounded-lg p-4 space-y-2 text-sm text-gray-700">
            <p>🔒 Chiffrement des données sensibles (SSL/TLS)</p>
            <p>🔐 Authentification sécurisée des comptes</p>
            <p>🛡️ Contrôles d'accès stricts aux serveurs</p>
            <p>📊 Surveillance continue des systèmes</p>
            <p>🔄 Sauvegardes régulières</p>
            <p>👥 Formation du personnel sur la protection des données</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg mb-3">6. Vos Droits</h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            Conformément à la législation congolaise, vous disposez des droits suivants :
          </p>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>• Droit d'Accès :</strong> Consulter les données que nous détenons sur vous.</p>
            <p><strong>• Droit de Rectification :</strong> Corriger des données inexactes ou incomplètes.</p>
            <p><strong>• Droit à l'Effacement :</strong> Demander la suppression de vos données (sous réserve de nos obligations légales).</p>
            <p><strong>• Droit d'Opposition :</strong> Vous opposer au traitement de vos données à des fins marketing.</p>
            <p><strong>• Droit à la Portabilité :</strong> Recevoir vos données dans un format structuré.</p>
            <p><strong>• Droit de Retrait du Consentement :</strong> Retirer votre consentement à tout moment.</p>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            Pour exercer ces droits, contactez-nous à : <strong>privacy@smartcabb.cd</strong>
          </p>
        </section>

        <section>
          <h2 className="text-lg mb-3">7. Conservation des Données</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Nous conservons vos données personnelles aussi longtemps que nécessaire pour fournir nos services 
            et respecter nos obligations légales :
          </p>
          <div className="mt-3 space-y-2 text-sm text-gray-700">
            <p>• <strong>Données de compte :</strong> Pendant toute la durée d'utilisation du service</p>
            <p>• <strong>Historique des courses :</strong> 5 ans (exigences fiscales et légales)</p>
            <p>• <strong>Documents conducteurs :</strong> 3 ans après la fin de collaboration</p>
            <p>• <strong>Données de transaction :</strong> 10 ans (obligations comptables)</p>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mt-3">
            Après ces délais, vos données sont supprimées ou anonymisées de manière irréversible.
          </p>
        </section>

        <section>
          <h2 className="text-lg mb-3">8. Cookies et Technologies Similaires</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Notre site web utilise des cookies pour améliorer votre expérience. Vous pouvez les désactiver 
            dans les paramètres de votre navigateur, mais cela peut limiter certaines fonctionnalités.
          </p>
        </section>

        <section>
          <h2 className="text-lg mb-3">9. Transfert International de Données</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Vos données sont principalement stockées en RDC. En cas de transfert hors du pays (ex: services cloud), 
            nous veillons à ce que des garanties appropriées soient en place pour protéger vos données.
          </p>
        </section>

        <section>
          <h2 className="text-lg mb-3">10. Mineurs</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Nos services sont réservés aux personnes de 18 ans et plus. Nous ne collectons pas sciemment 
            de données auprès de mineurs. Si vous êtes parent et constatez qu'un mineur a créé un compte, 
            contactez-nous immédiatement.
          </p>
        </section>

        <section>
          <h2 className="text-lg mb-3">11. Modifications de la Politique</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Nous pouvons modifier cette Politique de Confidentialité. Les modifications importantes 
            vous seront notifiées par e-mail ou notification dans l'application. La version à jour 
            sera toujours disponible dans l'application.
          </p>
        </section>

        <section>
          <h2 className="text-lg mb-3">12. Contact</h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <p className="font-medium text-gray-800">Pour toute question concernant cette politique :</p>
            <div className="space-y-1 text-gray-700">
              <p><strong>Email :</strong> privacy@smartcabb.cd</p>
              <p><strong>Téléphone :</strong> +243 990 666 661 ou +243 814 018 048</p>
              <p><strong>Adresse :</strong> Kinshasa, République Démocratique du Congo</p>
            </div>
          </div>
        </section>

        <section className="border-t pt-4 mt-6">
          <p className="text-xs text-gray-500 text-center">
            En utilisant SmartCabb, vous acceptez cette Politique de Confidentialité.<br/>
            © 2026 SmartCabb SARL - Tous droits réservés
          </p>
        </section>
      </div>
    </ScrollArea>
  );
});