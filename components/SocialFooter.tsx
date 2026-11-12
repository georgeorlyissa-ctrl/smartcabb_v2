import { Link } from '../lib/simple-router';
import { SmartCabbLogo } from './SmartCabbLogo';
import { SOCIAL_PROFILES } from '../lib/social-links';

export function SocialFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <SmartCabbLogo plain className="w-10 h-10" />
              <span className="text-xl font-bold">SMARTCABB</span>
            </div>
            <p className="text-gray-400 text-sm">
              La solution de transport moderne en République Démocratique du Congo.
            </p>
          </div>

          <div>
            <h3 className="font-bold mb-4">Liens rapides</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/" className="hover:text-cyan-500 transition">Accueil</Link></li>
              <li><Link to="/services" className="hover:text-cyan-500 transition">Services</Link></li>
              <li><Link to="/drivers" className="hover:text-cyan-500 transition">Chauffeurs</Link></li>
              <li><Link to="/contact" className="hover:text-cyan-500 transition">Contact</Link></li>
              <li><Link to="/about" className="hover:text-cyan-500 transition">À Propos</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Applications</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/app" className="hover:text-cyan-500 transition">App Passagers</Link></li>
              <li><Link to="/driver" className="hover:text-cyan-500 transition">App Conducteurs</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-4">Réseaux sociaux</h3>
            <div className="flex gap-3">
              {SOCIAL_PROFILES.map((profile) => (
                <a
                  key={profile.id}
                  href={profile.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform ${profile.className}`}
                  aria-label={profile.label}
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={profile.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2026 SmartCabb. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}