import { ScrollArea } from '../ui/scroll-area';
import { memo } from 'react';

export const PrivacyPolicy = memo(function PrivacyPolicy() {
  return (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-6 p-6 pr-4">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">Politique de Confidentialité de SMART CAB</h1>
          <p className="text-xs text-gray-500 mt-2">Dernière mise à jour : 24 octobre 2025</p>
        </div>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">1. Introduction</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            La présente Politique de Confidentialité décrit la manière dont SMART CAB SARL ("nous", "notre" ou "l'entreprise") collecte, utilise, protège et partage les informations personnelles de ses utilisateurs (passagers) et de ses chauffeurs partenaires ("vous") via son application mobile et son site web.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-2">
            SMART CAB s'engage à protéger la confidentialité, l'intégrité et la sécurité de vos données personnelles conformément aux lois en vigueur en République Démocratique du Congo (RDC).
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">2. Données que Nous Collectons</h2>
          <p className="text-sm text-gray-700 mb-3">Nous collectons deux grandes catégories de données, selon votre rôle (passager ou chauffeur) :</p>

          <h3 className="text-sm font-semibold text-gray-800 mb-2">A. Données collectées auprès des Passagers</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2 font-semibold text-gray-700 border-b">Type de Donnée</th>
                  <th className="text-left p-2 font-semibold text-gray-700 border-b">Détails de la Collection</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b"><td className="p-2 font-medium">Données d'Identité</td><td className="p-2">Nom, prénom, numéro de téléphone, adresse e-mail, photo de profil (facultatif).</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Données de Localisation</td><td className="p-2">Données de géolocalisation pour le point de prise en charge et la destination, suivies en temps réel pendant le trajet.</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Données de Transaction</td><td className="p-2">Historique des courses, mode de paiement choisi, montants payés, reçus.</td></tr>
                <tr><td className="p-2 font-medium">Données de Communication</td><td className="p-2">Enregistrement des communications via l'application (chats, appels masqués) entre le passager et le chauffeur.</td></tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold text-gray-800 mb-2">B. Données collectées auprès des Chauffeurs Partenaires</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2 font-semibold text-gray-700 border-b">Type de Donnée</th>
                  <th className="text-left p-2 font-semibold text-gray-700 border-b">Détails de la Collection</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b"><td className="p-2 font-medium">Données d'Identité Complètes</td><td className="p-2">Nom complet, adresse, date de naissance, Numéro d'Identification Nationale, informations fiscales.</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Données du Véhicule</td><td className="p-2">Marque, modèle, numéro d'immatriculation, documents du véhicule (assurance, contrôle technique).</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Données de Permis et Licences</td><td className="p-2">Permis de conduire, licences de transport professionnel et autres documents légaux.</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Données Financières</td><td className="p-2">Informations de compte bancaire pour le versement des gains.</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Données de Localisation</td><td className="p-2">Suivi GPS du véhicule et de l'activité du chauffeur (connexion, trajet, vitesse) pour le service et la sécurité.</td></tr>
                <tr><td className="p-2 font-medium">Évaluations et Performance</td><td className="p-2">Note moyenne reçue des passagers, taux d'acceptation et d'annulation des courses.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">3. Comment Nous Utilisons Vos Données</h2>
          <p className="text-sm text-gray-700 mb-2">Vos données sont utilisées dans le but de fournir et d'améliorer nos services, notamment pour :</p>
          <ol className="list-decimal ml-5 space-y-1.5 text-sm text-gray-700">
            <li><strong>Exécution du Service :</strong> Localiser le point de prise en charge, mettre en relation les passagers et les chauffeurs, calculer le tarif et gérer le paiement.</li>
            <li><strong>Sécurité et Sûreté :</strong> Vérifier l'identité des chauffeurs, suivre les trajets en temps réel pour des raisons de sécurité, prévenir la fraude et répondre aux incidents.</li>
            <li><strong>Communication :</strong> Envoyer des notifications sur l'état du trajet, des reçus, des informations de service ou des messages marketing (avec consentement).</li>
            <li><strong>Amélioration du Service :</strong> Analyser les données de localisation et d'utilisation pour optimiser l'efficacité de la plateforme (réduction des temps d'attente, amélioration des cartes).</li>
            <li><strong>Conformité Légale :</strong> Respecter les obligations légales et réglementaires en matière fiscale, d'assurance ou de sécurité publique, y compris le partage avec les autorités si la loi l'exige.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">4. Partage et Divulgation des Données</h2>
          <p className="text-sm text-gray-700 mb-2">Nous ne vendons ni ne louons vos données personnelles. Nous les partageons uniquement dans les circonstances suivantes :</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2 font-semibold text-gray-700 border-b">Destinataire</th>
                  <th className="text-left p-2 font-semibold text-gray-700 border-b">Nature des Données Partagées</th>
                  <th className="text-left p-2 font-semibold text-gray-700 border-b">Justification</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b"><td className="p-2 font-medium">Entre le Passager et le Chauffeur</td><td className="p-2">Nom, photo, note, coordonnées (pour le service), position en temps réel (durant le trajet).</td><td className="p-2">Nécessaire à l'exécution du service de mise en relation.</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Partenaires de Paiement</td><td className="p-2">Informations de transaction (sans les détails complets de carte bancaire, gérés par le processeur de paiement).</td><td className="p-2">Gestion des transactions financières et de la facturation.</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Autorités Légales et Gouvernementales</td><td className="p-2">Données requises par la loi (sur présentation d'un mandat ou d'une injonction légale).</td><td className="p-2">Conformité légale et enquêtes de sécurité ou criminelles.</td></tr>
                <tr><td className="p-2 font-medium">Prestataires de Services</td><td className="p-2">Hébergeurs cloud, fournisseurs d'outils d'analyse (sous contrat de confidentialité strict).</td><td className="p-2">Support technique, maintenance de la plateforme et analyse d'amélioration.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">5. Vos Droits</h2>
          <p className="text-sm text-gray-700 mb-2">Conformément à la législation en vigueur, vous disposez des droits suivants concernant vos données personnelles :</p>
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li>• <strong>Droit d'Accès :</strong> Vous pouvez demander une copie des données que nous détenons sur vous.</li>
            <li>• <strong>Droit de Rectification :</strong> Vous pouvez demander la correction de données inexactes ou incomplètes.</li>
            <li>• <strong>Droit à l'Effacement ("Droit à l'Oubli") :</strong> Vous pouvez demander la suppression de vos données personnelles, sous réserve de nos obligations légales de conservation (ex: données fiscales).</li>
            <li>• <strong>Droit d'Opposition :</strong> Vous pouvez vous opposer au traitement de vos données pour des raisons de marketing direct.</li>
          </ul>
          <p className="text-sm text-gray-700 mt-2">Pour exercer ces droits, veuillez contacter notre Responsable de la Protection des Données (RPD) via les coordonnées fournies dans la Section 9.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">6. Sécurité des Données</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            SMART CAB met en œuvre des mesures de sécurité techniques et organisationnelles appropriées, y compris le chiffrement des données en transit (TLS/SSL) et sur nos serveurs, l'authentification forte et des contrôles d'accès stricts, afin de protéger vos données contre l'accès, la modification, la divulgation ou la destruction non autorisés.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">7. Durée de Conservation des Données</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Nous conservons vos données personnelles aussi longtemps que votre compte est actif et aussi longtemps que nécessaire pour atteindre les objectifs décrits dans cette politique, ou pour respecter nos obligations légales et réglementaires (par exemple, les données de transaction sont conservées pour une durée requise par la loi fiscale).
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">8. Modifications de la Politique</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Nous nous réservons le droit de modifier cette Politique de Confidentialité à tout moment. Toute modification sera publiée sur cette page et, en cas de modifications substantielles, vous serez notifié par e-mail ou via l'application.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-gray-900 mb-2">9. Contactez-nous</h2>
          <p className="text-sm text-gray-700 mb-2">Pour toute question ou préoccupation relative à cette Politique de Confidentialité ou au traitement de vos données, veuillez contacter notre Responsable de la Protection des Données :</p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm text-gray-700">
            <p className="font-semibold">SMART CAB SARL</p>
            <p>À l'attention de : Le Responsable de la Protection des Données (RPD)</p>
            <p>Adresse e-mail : <a href="mailto:rssi@smartcab.com" className="text-blue-600 underline">rssi@smartcab.com</a></p>
            <p>Adresse du Siège Social : 5D, Avenue du Tchad, C/ Gombe, Kinshasa, RDC</p>
          </div>
        </section>

        <section className="border-t pt-4 mt-2">
          <p className="text-xs text-gray-500 text-center">En utilisant SmartCabb, vous acceptez cette Politique de Confidentialité.<br />© 2026 SmartCabb SARL - Tous droits réservés</p>
        </section>
      </div>
    </ScrollArea>
  );
});
