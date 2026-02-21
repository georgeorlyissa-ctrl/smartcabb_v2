import { useState } from 'react';
import { motion } from '../lib/motion';
import { ChatWidget } from '../components/ChatWidget';
import { ProfessionalFooter } from '../components/ProfessionalFooter';
import { SiteNavigation } from '../components/SiteNavigation';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function ContactPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-2eb02e52/contact`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        const errorData = await response.json();
        console.error('❌ Erreur serveur:', errorData);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 5000);
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', sans-serif !important; }
        
        .gradient-text {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Navigation */}
      <SiteNavigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-4 py-2 bg-cyan-100 rounded-full text-cyan-700 font-semibold text-sm mb-6">
              📧 {t('contact.title')}
            </div>
            <h1 className="text-6xl font-black mb-6">
              {t('contact.title')} <span className="gradient-text">SmartCabb</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('contact.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-black mb-8">{t('contact.title')}</h2>
              
              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-4 p-6 bg-white rounded-2xl shadow-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">
                    📍
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Adresse</h3>
                    <p className="text-gray-600">Avenue de la Libération<br/>Kinshasa, RD Congo</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-2xl shadow-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">
                    📞
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{t('contact.phone')}</h3>
                    <p className="text-gray-600">+243 XX XXX XXXX<br/>24/7</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-2xl shadow-lg">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">
                    📧
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{t('contact.email')}</h3>
                    <p className="text-gray-600">contact@smartcabb.com<br/>support@smartcabb.com</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="p-8 bg-white rounded-3xl shadow-2xl border border-gray-100">
                <h2 className="text-3xl font-black mb-6">{t('contact.message')}</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('contact.name')}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 outline-none transition-colors"
                      placeholder={t('contact.name')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('contact.email')}</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 outline-none transition-colors"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('contact.phone')}</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 outline-none transition-colors"
                      placeholder="+243 XX XXX XXXX"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{t('contact.message')}</label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-cyan-500 outline-none transition-colors resize-none"
                      placeholder={t('contact.message')}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-full hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {status === 'sending' ? t('contact.sending') : t('contact.send')}
                  </button>

                  {status === 'success' && (
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-700 text-center font-semibold">
                      ✅ {t('contact.success')}
                    </div>
                  )}

                  {status === 'error' && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-center font-semibold">
                      ❌ {t('contact.error')}
                    </div>
                  )}
                </form>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <ProfessionalFooter />

      <ChatWidget />
    </div>
  );
}