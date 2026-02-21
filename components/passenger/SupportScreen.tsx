import { motion } from '../../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useAppState } from '../../hooks/useAppState';
import { 
  ArrowLeft, 
  Phone, 
  MessageCircle, 
  Mail,
  Clock,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Send
} from '../../lib/icons';
import { useState } from 'react';

export function SupportScreen() {
  const { setCurrentScreen } = useAppState();
  const [activeTab, setActiveTab] = useState<'contact' | 'faq' | 'report'>('contact');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');

  const contactMethods = [
    {
      icon: Phone,
      title: 'Appel téléphonique',
      description: 'Contactez-nous directement',
      value: '+243 990 666 661',
      action: 'Appeler maintenant',
      available: '24h/7j',
      color: 'bg-green-500',
      link: 'tel:+243990666661'
    },
    {
      icon: Phone,
      title: 'Ligne alternative',
      description: 'Numéro de secours',
      value: '+243 814 018 048',
      action: 'Appeler maintenant',
      available: '24h/7j',
      color: 'bg-green-600',
      link: 'tel:+243814018048'
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      description: 'Chat instantané',
      value: '+243 990 666 661',
      action: 'Ouvrir WhatsApp',
      available: 'En ligne',
      color: 'bg-blue-600',
      link: 'https://wa.me/243990666661?text='
    },
    {
      icon: Mail,
      title: 'Email',
      description: 'Support par email',
      value: 'support@smartcabb.cd',
      action: 'Envoyer un email',
      available: 'Réponse sous 24h',
      color: 'bg-blue-500',
      link: 'mailto:support@smartcabb.cd'
    }
  ];

  const faqItems = [
    {
      question: 'Comment annuler une course ?',
      answer: 'Vous pouvez annuler une course avant qu\'un chauffeur l\'accepte directement depuis l\'application. Après acceptation, contactez le support.'
    },
    {
      question: 'Comment modifier ma méthode de paiement ?',
      answer: 'Allez dans votre profil > Méthode de paiement préférée, puis sélectionnez votre nouvelle méthode (Mobile Money, carte bancaire ou espèces).'
    },
    {
      question: 'Que faire si j\'ai oublié des affaires dans la voiture ?',
      answer: 'Contactez immédiatement le support avec le numéro de course. Nous vous mettrons en relation avec le chauffeur.'
    },
    {
      question: 'Comment noter un chauffeur ?',
      answer: 'À la fin de chaque course, vous serez invité à noter votre chauffeur sur 5 étoiles et laisser un commentaire.'
    },
    {
      question: 'Les tarifs sont-ils fixes ?',
      answer: 'Les tarifs sont calculés selon la distance et le temps estimé. Ils peuvent varier selon les conditions de trafic à Kinshasa.'
    }
  ];

  const handleSendMessage = () => {
    if (subject && message) {
      // In a real app, this would send the message to support
      alert('Message envoyé avec succès! Notre équipe vous répondra rapidement.');
      setSubject('');
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentScreen('profile')}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl">Support & Aide</h1>
              <p className="text-sm text-gray-600">Nous sommes là pour vous aider</p>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-t">
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'contact' 
                ? 'border-green-500 text-green-600' 
                : 'border-transparent text-gray-500'
            }`}
          >
            Contact
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'faq' 
                ? 'border-green-500 text-green-600' 
                : 'border-transparent text-gray-500'
            }`}
          >
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'report' 
                ? 'border-green-500 text-green-600' 
                : 'border-transparent text-gray-500'
            }`}
          >
            Signaler
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Emergency Notice */}
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Urgence ?</p>
                  <p className="text-sm text-red-700">
                    En cas d'urgence, appelez directement le 115 (Police) ou le 998 (Urgences médicales)
                  </p>
                </div>
              </div>
            </Card>

            {/* Contact Methods */}
            {contactMethods.map((method, index) => {
              const Icon = method.icon;
              return (
                <motion.div
                  key={method.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 ${method.color} rounded-full flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{method.title}</h3>
                        <p className="text-sm text-gray-600">{method.description}</p>
                        <p className="text-sm font-medium">{method.value}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <Clock className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-600">{method.available}</span>
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <a 
                          href={method.link}
                          target={method.link.startsWith('http') ? '_blank' : undefined}
                          rel={method.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                        >
                          {method.action}
                        </a>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Questions fréquentes</p>
                  <p className="text-sm text-blue-700">
                    Trouvez rapidement des réponses aux questions les plus courantes
                  </p>
                </div>
              </div>
            </Card>

            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-600">Q</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{item.question}</h3>
                      <p className="text-sm text-gray-700">{item.answer}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="p-4 bg-orange-50 border-orange-200">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">Signaler un problème</p>
                  <p className="text-sm text-orange-700">
                    Décrivez votre problème en détail pour que notre équipe puisse vous aider
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject">Sujet du problème</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Problème avec ma course #1234"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="message">Description détaillée</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez votre problème en détail..."
                    rows={5}
                    className="mt-1"
                  />
                </div>

                <Button 
                  onClick={handleSendMessage}
                  className="w-full"
                  disabled={!subject || !message}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer le signalement
                </Button>
              </div>
            </Card>

            {/* Quick Report Options */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Problèmes courants</h3>
              <div className="space-y-2">
                {[
                  'Chauffeur non professionnel',
                  'Véhicule en mauvais état',
                  'Problème de paiement',
                  'Course annulée sans raison',
                  'Tarif incorrect'
                ].map((issue, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setSubject(issue)}
                  >
                    {issue}
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}