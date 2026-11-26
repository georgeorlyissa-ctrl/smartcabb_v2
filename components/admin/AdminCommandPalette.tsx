/**
 * 🔎 RECHERCHE GLOBALE DU PANNEAU ADMIN
 * ---------------------------------------------------------------------------
 * Palette de commandes (style « Ctrl+K ») : on tape « sauvegarde »,
 * « chauffeur », « paiement »… et on arrive directement sur le bon écran.
 *
 * Aucune dépendance : registre statique + filtrage insensible aux accents.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart,
  Bell,
  Calendar,
  Car,
  CreditCard,
  Database,
  FileText,
  Megaphone,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Users,
  Wallet,
} from '../../lib/admin-icons';

type IconType = React.ComponentType<{ className?: string }>;

export interface AdminScreenEntry {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: IconType;
}

export const ADMIN_SCREENS: AdminScreenEntry[] = [
  {
    id: 'admin-dashboard',
    label: 'Tableau de bord',
    description: 'Vue d’ensemble, statistiques et actions rapides',
    keywords: ['accueil', 'dashboard', 'stats', 'resume', 'home'],
    icon: BarChart,
  },
  {
    id: 'admin-drivers',
    label: 'Chauffeurs',
    description: 'Comptes chauffeurs, validation, statuts et soldes',
    keywords: ['chauffeur', 'conducteur', 'driver', 'validation', 'approbation', 'solde'],
    icon: Car,
  },
  {
    id: 'admin-clients',
    label: 'Clients',
    description: 'Passagers, comptes et historique',
    keywords: ['client', 'passager', 'passenger', 'usagers'],
    icon: Users,
  },
  {
    id: 'admin-rides',
    label: 'Courses',
    description: 'Historique et suivi des courses',
    keywords: ['course', 'trajet', 'ride', 'historique'],
    icon: Car,
  },
  {
    id: 'admin-scheduled-rides',
    label: 'Réservations',
    description: 'Réservations programmées (T-15)',
    keywords: ['reservation', 'programmee', 'planifiee', 't15', 'scheduled'],
    icon: Calendar,
  },
  {
    id: 'admin-demand',
    label: 'Demandes en cours',
    description: 'Courses en attente de chauffeur',
    keywords: ['demande', 'attente', 'pending', 'dispatch'],
    icon: Calendar,
  },
  {
    id: 'admin-ejpay',
    label: 'Paiements Ejpay',
    description: 'Mobile Money, transactions et statuts',
    keywords: ['paiement', 'ejpay', 'mobile money', 'mpesa', 'orange', 'airtel', 'transaction'],
    icon: CreditCard,
  },
  {
    id: 'admin-financial-reports',
    label: 'Rapports financiers',
    description: 'Revenus, commissions et exports',
    keywords: ['finance', 'revenu', 'commission', 'rapport', 'chiffre', 'argent'],
    icon: BarChart,
  },
  {
    id: 'admin-refunds',
    label: 'Remboursements',
    description: 'Demandes de remboursement',
    keywords: ['remboursement', 'refund', 'litige'],
    icon: Wallet,
  },
  {
    id: 'admin-pending-recharges',
    label: 'Recharges en attente',
    description: 'Recharges de portefeuille à valider',
    keywords: ['recharge', 'wallet', 'portefeuille', 'solde', 'topup'],
    icon: Wallet,
  },
  {
    id: 'admin-promo-codes',
    label: 'Codes promo',
    description: 'Réductions et campagnes',
    keywords: ['promo', 'code', 'reduction', 'coupon'],
    icon: Megaphone,
  },
  {
    id: 'admin-marketing',
    label: 'Marketing',
    description: 'Campagnes et communication',
    keywords: ['marketing', 'campagne', 'pub', 'communication'],
    icon: Megaphone,
  },
  {
    id: 'admin-broadcast',
    label: 'Diffusion',
    description: 'Notification de masse aux utilisateurs',
    keywords: ['diffusion', 'broadcast', 'notification', 'masse', 'annonce'],
    icon: Bell,
  },
  {
    id: 'admin-notifications',
    label: 'Notifications',
    description: 'Centre de notifications admin',
    keywords: ['notification', 'alerte', 'message'],
    icon: Bell,
  },
  {
    id: 'admin-contact-messages',
    label: 'Messages de contact',
    description: 'Messages reçus depuis le site',
    keywords: ['contact', 'message', 'site', 'formulaire'],
    icon: MessageSquare,
  },
  {
    id: 'admin-customer-support',
    label: 'Support client',
    description: 'Tickets et assistance',
    keywords: ['support', 'assistance', 'ticket', 'sav'],
    icon: MessageSquare,
  },
  {
    id: 'admin-chat-messages',
    label: 'Chat',
    description: 'Conversations du chat intégré',
    keywords: ['chat', 'conversation', 'messagerie', 'discussion'],
    icon: MessageSquare,
  },
  {
    id: 'admin-emergencies',
    label: 'Alertes SOS',
    description: 'Urgences passagers et chauffeurs',
    keywords: ['sos', 'urgence', 'emergency', 'securite', 'alerte'],
    icon: AlertTriangle,
  },
  {
    id: 'admin-blocked-passengers',
    label: 'Passagers bloqués',
    description: 'Comptes suspendus côté passager',
    keywords: ['bloque', 'suspendu', 'ban', 'passager'],
    icon: Shield,
  },
  {
    id: 'admin-audit-logs',
    label: 'Journal d’audit',
    description: 'Traçabilité des actions admin',
    keywords: ['audit', 'journal', 'historique', 'tracabilite', 'logs'],
    icon: FileText,
  },
  {
    id: 'admin-backup',
    label: 'Sauvegardes & restauration',
    description: 'Backups, test de restauration, santé du système et alertes',
    keywords: [
      'sauvegarde',
      'sauvegardes',
      'backup',
      'restauration',
      'restore',
      'sante',
      'alerte',
      'donnees',
      'snapshot',
    ],
    icon: Database,
  },
  {
    id: 'admin-settings',
    label: 'Paramètres',
    description: 'Tarifs, commission, réglages généraux',
    keywords: ['parametre', 'reglage', 'tarif', 'prix', 'commission', 'settings'],
    icon: Settings,
  },
  {
    id: 'admin-global-settings',
    label: 'Paramètres généraux',
    description: 'Configuration globale de l’application',
    keywords: ['parametre', 'global', 'configuration', 'config', 'taux', 'change'],
    icon: Settings,
  },
  {
    id: 'admin-sms-settings',
    label: 'Paramètres SMS',
    description: 'Fournisseur EJ SMS, crédits et modèles',
    keywords: ['sms', 'ej sms', 'ejsarl', 'credit', 'message', 'otp'],
    icon: MessageSquare,
  },
  {
    id: 'admin-email-settings',
    label: 'Paramètres email',
    description: 'SMTP, expéditeur et modèles',
    keywords: ['email', 'mail', 'smtp', 'gmail', 'expediteur'],
    icon: FileText,
  },
  {
    id: 'admin-email-history',
    label: 'Historique des emails',
    description: 'Emails envoyés et erreurs',
    keywords: ['email', 'historique', 'envoi', 'logs'],
    icon: FileText,
  },
  {
    id: 'admin-analytics',
    label: 'Analytique',
    description: 'Statistiques détaillées et tendances',
    keywords: ['analytique', 'analytics', 'statistique', 'kpi', 'graphique'],
    icon: BarChart,
  },
  {
    id: 'admin-budget-dashboard',
    label: 'Budget',
    description: 'Dépenses et budget prévisionnel',
    keywords: ['budget', 'depense', 'prevision', 'cout'],
    icon: BarChart,
  },
  {
    id: 'admin-tools',
    label: 'Outils de maintenance',
    description: 'Nettoyage, réparation des comptes, diagnostics',
    keywords: ['outil', 'maintenance', 'nettoyage', 'reparation', 'diagnostic'],
    icon: Settings,
  },
  {
    id: 'admin-users-management',
    label: 'Utilisateurs admin',
    description: 'Rôles et accès au panneau',
    keywords: ['admin', 'utilisateur', 'role', 'acces', 'permission'],
    icon: Users,
  },
  {
    id: 'admin-account-sync',
    label: 'Synchronisation des comptes',
    description: 'Réparer les comptes auth / profils',
    keywords: ['sync', 'synchronisation', 'compte', 'reparation', 'auth'],
    icon: Users,
  },
  {
    id: 'cancellations',
    label: 'Annulations',
    description: 'Courses annulées et motifs',
    keywords: ['annulation', 'cancel', 'annule'],
    icon: AlertTriangle,
  },
  {
    id: 'data-cleanup',
    label: 'Nettoyage des données',
    description: 'Purger les données obsolètes',
    keywords: ['nettoyage', 'purge', 'cleanup', 'donnees'],
    icon: Database,
  },
];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function scoreEntry(entry: AdminScreenEntry, query: string): number {
  const label = normalize(entry.label);
  const description = normalize(entry.description);
  const keywords = entry.keywords.map(normalize);

  if (label === query) return 100;
  if (label.startsWith(query)) return 80;
  if (label.includes(query)) return 60;
  if (keywords.some((k) => k === query)) return 55;
  if (keywords.some((k) => k.startsWith(query))) return 45;
  if (keywords.some((k) => k.includes(query))) return 35;
  if (description.includes(query)) return 20;
  return 0;
}

export function AdminCommandPalette({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (screenId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(timer);
  }, [open]);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return ADMIN_SCREENS;
    return ADMIN_SCREENS.map((entry) => ({ entry, score: scoreEntry(entry, q) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.entry);
  }, [query]);

  useEffect(() => {
    if (activeIndex > results.length - 1) setActiveIndex(0);
  }, [results.length, activeIndex]);

  if (!open) return null;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) onSelect(selected.id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-900/50 p-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Rechercher un écran administrateur"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher un écran (ex. sauvegarde, chauffeur, paiement…)"
            className="h-8 w-full bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-500 hover:bg-gray-50"
          >
            Échap
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Aucun écran ne correspond à « {query} ».
              <br />
              Essayez : sauvegarde, chauffeur, paiement, réservation…
            </div>
          ) : (
            results.map((entry, index) => {
              const Icon = entry.icon;
              const isActive = index === activeIndex;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onSelect(entry.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">{entry.label}</span>
                    <span className="block truncate text-xs text-gray-500">{entry.description}</span>
                  </span>
                  {isActive && (
                    <span className="shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500">
                      Entrée
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2 text-[10.5px] text-gray-500">
          <span>↑ ↓ pour naviguer · Entrée pour ouvrir</span>
          <span>Ctrl / ⌘ + K</span>
        </div>
      </div>
    </div>
  );
}
