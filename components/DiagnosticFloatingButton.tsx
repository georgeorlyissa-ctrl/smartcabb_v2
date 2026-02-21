import { useState } from 'react';
import { motion, AnimatePresence } from '../lib/motion'; // ✅ FIX: Utiliser l'implémentation locale avec AnimatePresence
import { HelpCircle, X, Wrench, Search, Trash2, Home } from '../lib/icons';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

export function DiagnosticFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Masquer le bouton si l'utilisateur l'a fermé
  if (isHidden) return null;

  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow"
        title="Outils de diagnostic"
      >
        <HelpCircle className="w-6 h-6" />
      </motion.button>

      {/* Menu des outils */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Carte des outils */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
            >
              <Card className="shadow-2xl border-2 border-purple-200">
                <CardContent className="p-6">
                  {/* En-tête */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        🛠️ Outils de Diagnostic
                      </h3>
                      <p className="text-sm text-gray-600">
                        Résolvez les problèmes rapidement
                      </p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Liste des outils */}
                  <div className="space-y-3">
                    {/* Outil 1: Diagnostic complet */}
                    <a
                      href="/🔍-DIAGNOSTIC-CONNEXION.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Search className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          Diagnostic Complet
                        </div>
                        <div className="text-xs text-gray-600">
                          Tests automatiques de connexion
                        </div>
                      </div>
                    </a>

                    {/* Outil 2: Désactiver Service Worker */}
                    <a
                      href="/disable-sw.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          Vider Cache & SW
                        </div>
                        <div className="text-xs text-gray-600">
                          Si message "hors ligne"
                        </div>
                      </div>
                    </a>

                    {/* Outil 3: Tous les outils */}
                    <a
                      href="/🚀-OUTILS-DIAGNOSTIC.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">
                          Tous les Outils
                        </div>
                        <div className="text-xs text-gray-600">
                          Centre de dépannage complet
                        </div>
                      </div>
                    </a>
                  </div>

                  {/* Pied de page */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Version 101.0
                      </div>
                      <button
                        onClick={() => {
                          setIsHidden(true);
                          setIsOpen(false);
                          localStorage.setItem('diagnostic-button-hidden', 'true');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Masquer
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}