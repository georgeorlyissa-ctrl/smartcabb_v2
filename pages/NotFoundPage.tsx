import { Link } from '../lib/simple-router';
import { SiteNavigation } from '../components/SiteNavigation';
import { ProfessionalFooter } from '../components/ProfessionalFooter';

/** Page 404 explicite (noindex via SeoHead) — évite le duplicate homepage en 200. */
export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SiteNavigation />
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-sm font-semibold tracking-widest text-cyan-600 uppercase">Erreur 404</p>
        <h1 className="mt-3 text-4xl font-bold text-gray-900">Page introuvable</h1>
        <p className="mt-4 max-w-md text-gray-600">
          La page que vous cherchez n'existe pas ou a été déplacée. Retournez à l'accueil
          SmartCabb pour réserver votre taxi à Kinshasa.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center rounded-lg bg-cyan-600 px-5 py-3 text-white font-semibold hover:bg-cyan-700"
          >
            Retour à l'accueil
          </Link>
          <Link
            to="/services"
            className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Voir nos services
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Nous contacter
          </Link>
        </div>
      </main>
      <ProfessionalFooter />
    </div>
  );
}
