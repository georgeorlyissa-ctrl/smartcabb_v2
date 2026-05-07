import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// ✅ Plugin personnalisé pour résoudre utils/supabase/info
function resolveSupabaseInfo() {
  return {
    name: 'resolve-supabase-info',
    resolveId(source: string) {
      if (source.includes('utils/supabase/info') && !source.endsWith('.ts') && !source.endsWith('.tsx')) {
        return path.resolve(__dirname, './utils/supabase/info.ts');
      }
      if (source.includes('utils/supabase/info') && source.endsWith('.tsx')) {
        return path.resolve(__dirname, './utils/supabase/info.ts');
      }
      if (source.includes('supabase/functions/server/')) {
        console.warn(`⚠️ Ignoré import backend: ${source}`);
        return { id: source, external: true };
      }
      return null;
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 🔍 PLUGIN SEO — Prerendering statique pour les crawlers Google
// ───────────────────────────────────────────────────────────────
// Problème : SmartCabb est une SPA React. Sans prerendering,
// Google ne voit qu'une page vide (<div id="root"></div>).
// Ce plugin injecte le contenu HTML statique dans le build final
// pour que les crawlers indexent correctement le site.
// ═══════════════════════════════════════════════════════════════
function seoPrerender() {
  return {
    name: 'seo-prerender',
    // Hook appelé après la génération du bundle
    async generateBundle() {
      console.log('🔍 SEO Prerender: Injection du contenu statique...');
    },
    // Hook appelé après l'écriture des fichiers sur le disque
    async writeBundle(options: any, bundle: any) {
      const { writeFileSync, readFileSync, existsSync } = await import('fs');
      const { resolve } = await import('path');

      const outDir = options.dir || 'dist';
      const indexPath = resolve(outDir, 'index.html');

      if (!existsSync(indexPath)) {
        console.warn('⚠️ SEO Prerender: index.html non trouvé dans dist/');
        return;
      }

      let html = readFileSync(indexPath, 'utf-8');

      // ── Contenu SEO statique injecté dans le <body> pour les crawlers ──
      // Ce contenu est caché visuellement mais lisible par Google/Bing
      const seoContent = `
  <!-- ═══════════════════════════════════════════════════════
       🔍 CONTENU SEO STATIQUE — Pour les crawlers (Google, Bing)
       Ce bloc est remplacé par React au chargement pour les utilisateurs
       ═══════════════════════════════════════════════════════ -->
  <div id="seo-static-content" aria-hidden="true" style="
    position:absolute;
    width:1px;
    height:1px;
    overflow:hidden;
    clip:rect(0,0,0,0);
    white-space:nowrap;
    border:0;
  ">
    <main>
      <header>
        <h1>SmartCabb — Taxi &amp; VTC à Kinshasa</h1>
        <p>Le service de transport avec chauffeur de référence en République Démocratique du Congo.</p>
      </header>

      <section>
        <h2>Réservez votre chauffeur à Kinshasa</h2>
        <p>SmartCabb vous connecte instantanément avec des chauffeurs professionnels vérifiés à Kinshasa. Disponible 24h/24, 7j/7 dans toute la ville.</p>
        <p>Téléchargez l'application ou réservez sur <a href="https://www.smartcabb.com/">smartcabb.com</a>.</p>
      </section>

      <section>
        <h2>Nos services de transport à Kinshasa</h2>
        <ul>
          <li><strong>SmartCabb Standard</strong> — Véhicule économique et confortable, 4 places, climatisation, GPS</li>
          <li><strong>SmartCabb Confort</strong> — Véhicule premium, Internet, climatisation, 4 places</li>
          <li><strong>SmartCabb Familiale</strong> — Grand espace, 6 à 7 places, idéal pour les familles</li>
          <li><strong>SmartCabb Business</strong> — Service VIP, rafraîchissements, pour vos rendez-vous professionnels</li>
        </ul>
      </section>

      <section>
        <h2>Paiement Mobile Money accepté</h2>
        <p>Payez votre course avec tous les réseaux Mobile Money disponibles en RDC :</p>
        <ul>
          <li>M-Pesa (Vodacom) — *150#</li>
          <li>Orange Money — *144#</li>
          <li>Airtel Money — *501#</li>
          <li>Afrimoney (Africell) — *555#</li>
          <li>Espèces (CDF ou USD)</li>
        </ul>
      </section>

      <section>
        <h2>Pourquoi choisir SmartCabb ?</h2>
        <ul>
          <li>Chauffeurs professionnels vérifiés — permis, assurance, dossier contrôlé</li>
          <li>Véhicules climatisés et en bon état</li>
          <li>Tarifs transparents, calculés à l'avance</li>
          <li>Suivi GPS en temps réel</li>
          <li>Disponible 24h/24, 7j/7 à Kinshasa</li>
          <li>10 minutes d'attente gratuites à votre arrivée</li>
          <li>Support client 24h/24</li>
        </ul>
      </section>

      <section>
        <h2>Comment ça marche ?</h2>
        <ol>
          <li>Téléchargez l'application SmartCabb ou visitez smartcabb.com</li>
          <li>Entrez votre adresse de départ et votre destination à Kinshasa</li>
          <li>Choisissez votre catégorie de véhicule</li>
          <li>Confirmez votre réservation — un chauffeur est envoyé immédiatement</li>
          <li>Suivez votre chauffeur en temps réel sur la carte</li>
          <li>Payez à l'arrivée en espèces ou Mobile Money</li>
        </ol>
      </section>

      <section>
        <h2>SmartCabb à Kinshasa — Zones desservies</h2>
        <p>SmartCabb opère dans toutes les communes de Kinshasa :</p>
        <ul>
          <li>Gombe, Lingwala, Barumbu, Kinshasa</li>
          <li>Kalamu, Lemba, Ngaba, Selembao</li>
          <li>Matete, Kimbanseke, Ndjili, Masina</li>
          <li>Mont-Ngafula, Bumbu, Makala, Ngiri-Ngiri</li>
          <li>Kintambo, Bandalungwa, Kasavubu</li>
          <li>Limete, Kisenso, Nsele</li>
        </ul>
      </section>

      <section>
        <h2>Questions fréquentes sur SmartCabb</h2>
        <dl>
          <dt>Comment réserver un taxi SmartCabb à Kinshasa ?</dt>
          <dd>Visitez smartcabb.com ou utilisez l'application mobile. Entrez votre départ et destination, puis confirmez. Un chauffeur arrive en quelques minutes.</dd>

          <dt>SmartCabb est-il moins cher qu'un taxi classique ?</dt>
          <dd>SmartCabb propose des tarifs compétitifs avec un prix calculé à l'avance, sans surprise. Tarifs à partir de 3 000 CDF selon la distance et la catégorie.</dd>

          <dt>Puis-je réserver SmartCabb pour l'aéroport de Ndjili ?</dt>
          <dd>Oui, SmartCabb dessert l'aéroport international de Ndjili depuis toute la ville de Kinshasa.</dd>

          <dt>SmartCabb est-il disponible la nuit à Kinshasa ?</dt>
          <dd>Oui, SmartCabb est disponible 24h/24. Des tarifs de nuit s'appliquent de 21h00 à 06h00.</dd>
        </dl>
      </section>

      <footer>
        <p>SmartCabb — Service de taxi et VTC à Kinshasa, République Démocratique du Congo</p>
        <p>Contact : <a href="mailto:contact@smartcabb.com">contact@smartcabb.com</a></p>
        <nav>
          <a href="https://www.smartcabb.com/">Accueil</a>
          <a href="https://www.smartcabb.com/services">Nos services</a>
          <a href="https://www.smartcabb.com/drivers">Devenir chauffeur</a>
          <a href="https://www.smartcabb.com/contact">Contact</a>
          <a href="https://www.smartcabb.com/about">À propos</a>
        </nav>
      </footer>
    </main>
  </div>`;

      // Injecter le contenu SEO juste avant </body>
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${seoContent}\n</body>`);
        writeFileSync(indexPath, html);
        console.log('✅ SEO Prerender: Contenu statique injecté dans dist/index.html');
      } else {
        console.warn('⚠️ SEO Prerender: balise </body> non trouvée dans index.html');
      }
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 🗺️ PLUGIN SITEMAP — Génère sitemap.xml automatiquement au build
// ═══════════════════════════════════════════════════════════════
function generateSitemap() {
  return {
    name: 'generate-sitemap',
    async writeBundle(options: any) {
      const { writeFileSync } = await import('fs');
      const { resolve } = await import('path');

      const outDir = options.dir || 'dist';
      const today = new Date().toISOString().split('T')[0];

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Page d'accueil — Priorité maximale -->
  <url>
    <loc>https://www.smartcabb.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="https://www.smartcabb.com/"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://www.smartcabb.com/en/"/>
    <image:image>
      <image:loc>https://www.smartcabb.com/og-image.png</image:loc>
      <image:title>SmartCabb — Taxi et VTC à Kinshasa</image:title>
    </image:image>
  </url>

  <!-- Services -->
  <url>
    <loc>https://www.smartcabb.com/services</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <!-- Devenir chauffeur -->
  <url>
    <loc>https://www.smartcabb.com/drivers</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- À propos -->
  <url>
    <loc>https://www.smartcabb.com/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Contact -->
  <url>
    <loc>https://www.smartcabb.com/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>

  <!-- Mentions légales -->
  <url>
    <loc>https://www.smartcabb.com/legal</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>

  <!-- Politique de confidentialité -->
  <url>
    <loc>https://www.smartcabb.com/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>

  <!-- Conditions d'utilisation -->
  <url>
    <loc>https://www.smartcabb.com/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.4</priority>
  </url>

</urlset>`;

      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemap);
      console.log('✅ Sitemap généré : dist/sitemap.xml');
    }
  };
}

export default defineConfig({
  plugins: [
    react({
      exclude: [
        /supabase\/functions\/server/,
        /supabase\/functions/,
        /\.md$/,
      ],
    }),
    resolveSupabaseInfo(),
    // ✅ SEO : Injecte le contenu statique pour les crawlers Google
    seoPrerender(),
    // ✅ SEO : Génère sitemap.xml automatiquement à chaque build
    generateSitemap(),
  ],

  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      'motion/react': path.resolve(__dirname, './lib/motion.tsx'),
      'sonner': path.resolve(__dirname, './lib/sonner.ts'),
      'class-variance-authority': path.resolve(__dirname, './lib/class-variance-authority.ts'),
      'lucide-react': path.resolve(__dirname, './lib/icons.tsx'),
      '../utils/supabase/info': path.resolve(__dirname, './utils/supabase/info.ts'),
      '../../utils/supabase/info': path.resolve(__dirname, './utils/supabase/info.ts'),
      '@': path.resolve(__dirname, './'),
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
      external: [
        'react-day-picker',
        'framer-motion',
        'npm:hono',
        /^npm:/,
        /^supabase\/functions\/server\//,
        /supabase\/functions\/server\/kv_store\.(tsx|ts)$/,
        /supabase\/functions\/server\/firebase-admin\.(tsx|ts)$/,
        /supabase\/functions\/server\/fcm-routes\.(tsx|ts)$/,
        /supabase\/functions\/server\/admin_users_routes\.(tsx|ts)$/,
        /supabase\/functions\/server\/kv-wrapper\.(tsx|ts)$/,
        /supabase\/functions\/server\/phone-utils\.(tsx|ts)$/,
        /supabase\/functions\/server\/uuid-validator\.(tsx|ts)$/,
        /supabase\/functions\/server\/email-validation\.(tsx|ts)$/,
      ],
    },
  },

  esbuild: {
    loader: 'tsx',
    include: /\.(tsx?|jsx?)$/,
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'leaflet',
      'react-leaflet',
      'react-day-picker',
      'date-fns',
      'date-fns/format',
      'date-fns/locale',
    ],
    exclude: [
      'lucide-react',
      'sonner',
      'class-variance-authority',
      'framer-motion',
      'firebase/app',
      'firebase/messaging',
      'firebase/analytics',
    ]
  },

  server: {
    fs: {
      strict: false
    }
  }
});
