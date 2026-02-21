import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Configuration pour FIGMA MAKE (utilise esm.sh CDN)
export default defineConfig({
  plugins: [
    react({
      exclude: /supabase\/functions\/server/,
    })
  ],
  
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'], // ✅ NOUVEAU: Résolution automatique des extensions
    alias: {
      // Alias pour Motion - Redirige vers notre implémentation locale
      'motion/react': path.resolve(__dirname, './lib/motion.tsx'),
      
      // Alias pour sonner - Utilise notre implémentation locale
      'sonner': path.resolve(__dirname, './lib/sonner.ts'),
      
      // Alias pour class-variance-authority
      'class-variance-authority': path.resolve(__dirname, './lib/class-variance-authority.ts'),
      
      // ✅ NOUVEAU: Alias pour lucide-react - Redirige vers nos icônes locales
      'lucide-react': path.resolve(__dirname, './lib/icons.tsx'),
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
        'react-day-picker', // ✅ Externaliser react-day-picker pour éviter l'erreur path.resolve
        'framer-motion', // ✅ Externaliser framer-motion - n'est plus utilisé
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
      'react-day-picker', // ✅ AJOUTÉ - Pre-bundle react-day-picker
      'date-fns', // ✅ AJOUTÉ - Pre-bundle date-fns avec react-day-picker
      'date-fns/format',
      'date-fns/locale',
    ],
    exclude: [
      'lucide-react', // ✅ NOUVEAU: Exclure lucide-react - utilise notre implémentation locale
      'sonner', // Utilise notre implémentation locale dans /lib/sonner.ts
      'class-variance-authority', // Utilise notre implémentation locale
      'framer-motion', // ✅ N'est plus utilisé
      'firebase/app', // ✅ Exclure Firebase - chargé dynamiquement via esm.sh
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