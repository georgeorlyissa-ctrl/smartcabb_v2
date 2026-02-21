/**
 * 🔔 SONNER COMPATIBILITY LAYER
 * 
 * Ce fichier réexporte notre implémentation locale de toast
 * pour assurer la compatibilité avec tous les imports existants
 * qui utilisent `import { toast } from 'sonner'`
 * 
 * ⚠️ IMPORTANT: SmartCabb utilise une implémentation standalone
 * sans dépendances externes pour éviter les erreurs de build
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

// Réexporter notre implémentation locale
export { toast } from './toast';

// Export par défaut pour compatibilité complète
import { toast } from './toast';
export default toast;
