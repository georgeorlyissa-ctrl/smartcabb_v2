import { Link } from '../lib/simple-router';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

export function SiteNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <nav className="fixed top-0 w-full bg-white/70 backdrop-blur-lg z-50 border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo Premium */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl">
                SC
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight">
                SMART<span className="gradient-text">CABB</span>
              </span>
              <span className="text-xs text-gray-500 -mt-1">{t('footer.tagline')}</span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-8">
            <Link to="/" className="font-semibold text-gray-700 hover:text-cyan-600 transition-all">
              {t('nav.home')}
            </Link>
            <Link to="/services" className="font-semibold text-gray-700 hover:text-cyan-600 transition-all">
              {t('nav.services')}
            </Link>
            <Link to="/about" className="font-semibold text-gray-700 hover:text-cyan-600 transition-all">
              {t('nav.about')}
            </Link>
            <Link to="/drivers" className="font-semibold text-gray-700 hover:text-cyan-600 transition-all">
              {t('nav.drivers')}
            </Link>
            <Link to="/contact" className="font-semibold text-gray-700 hover:text-cyan-600 transition-all">
              {t('nav.contact')}
            </Link>
            
            {/* Language Selector */}
            <LanguageSelector />
            
            <Link 
              to="/app/passenger"
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-full hover:shadow-xl hover:scale-105 transition-all"
            >
              {t('nav.login')}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col gap-3">
              <Link to="/" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.home')}</Link>
              <Link to="/services" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.services')}</Link>
              <Link to="/about" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.about')}</Link>
              <Link to="/drivers" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.drivers')}</Link>
              <Link to="/contact" className="font-semibold text-gray-700 hover:text-cyan-600 py-2">{t('nav.contact')}</Link>
              
              {/* Language Selector Mobile */}
              <div className="py-2">
                <LanguageSelector />
              </div>
              
              <Link to="/app/passenger" className="mt-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-bold rounded-full text-center">
                {t('nav.login')}
              </Link>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .gradient-text {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </nav>
  );
}
