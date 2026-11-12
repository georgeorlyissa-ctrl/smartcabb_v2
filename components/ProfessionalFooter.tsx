import { Link } from '../lib/simple-router';
import { useLanguage } from '../contexts/LanguageContext';
import { SmartCabbLogo } from './SmartCabbLogo';
import { SOCIAL_PROFILES } from '../lib/social-links';

export function ProfessionalFooter() {
  const { t } = useLanguage();
  
  return (
    <footer className="bg-slate-950 text-white">
      {/* Section principale */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          
          {/* Colonne Logo + Description */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <SmartCabbLogo plain className="w-14 h-14" />
              <span className="text-3xl font-black">
                SMART<span className="text-blue-400">CABB</span>
              </span>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed max-w-sm">
              {t('footer.description')}
            </p>
            
            {/* Réseaux sociaux */}
            <div className="flex gap-3">
              {SOCIAL_PROFILES.map((profile) => (
                <a
                  key={profile.id}
                  href={profile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${
                    profile.id === 'facebook'
                      ? 'bg-slate-800 hover:bg-[#1877F2]'
                      : profile.id === 'instagram'
                        ? 'bg-slate-800 hover:bg-[#E1306C]'
                        : 'bg-slate-800 hover:bg-black'
                  }`}
                  aria-label={profile.label}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={profile.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Liens rapides */}
          <div>
            <h3 className="text-lg font-bold mb-5 text-white">{t('footer.quickLinks')}</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {t('nav.services')}
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
<div>
  <h3 className="text-lg font-bold mb-5 text-white">{t('footer.services')}</h3>
  <ul className="space-y-3">
    <li>
      <a href="/services#standard" className="text-gray-400 hover:text-blue-400 transition-colors">
        Standard
      </a>
    </li>
    <li>
      <a href="/services#confort" className="text-gray-400 hover:text-blue-400 transition-colors">
        Confort
      </a>
    </li>
    <li>
      <a href="/services#business" className="text-gray-400 hover:text-blue-400 transition-colors">
        Business
      </a>
    </li>
    <li>
      <a href="/services#familia" className="text-gray-400 hover:text-blue-400 transition-colors">
        Familia
      </a>
    </li>
  </ul>
</div>

          {/* Légal */}
          <div>
            <h3 className="text-lg font-bold mb-5 text-white">{t('footer.legal')}</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {t('nav.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {t('nav.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/account-deletion" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {t('nav.deleteAccount')}
                </Link>
              </li>
              {/* ❌ DÉSACTIVÉ: Mentions légales pour raisons de sécurité */}
              {/* <li>
                <Link to="/legal" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {t('nav.legal')}
                </Link>
              </li> */}
              <li>
                <Link to="/drivers" className="text-gray-400 hover:text-blue-400 transition-colors">
                  {t('nav.drivers')}
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Barre du bas */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <p className="text-gray-400 text-sm text-center">
              © 2026 SmartCabb. {t('footer.rights')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
