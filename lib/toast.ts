/**
 * 🍞 TOAST NOTIFICATION SYSTÈME - STANDALONE
 * 
 * Implémentation 100% locale sans dépendances externes
 * Compatible avec tous les navigateurs et Safari/iOS
 * 
 * @version 2.0.0 - Standalone (sans sonner)
 * @date 2026-01-21
 */

// 🎯 Type de toast
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

// 🎯 Options de toast
export interface ToastOptions {
  id?: number; // ID pour réutiliser/mettre à jour un toast existant
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  closeButton?: boolean;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// 🎨 Icônes emoji par type
const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
  loading: '⏳'
};

// 🎨 Couleurs par type
const TOAST_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  error: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
  info: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
  warning: { bg: '#fefce8', border: '#fde047', text: '#854d0e' },
  loading: { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' }
};

// 🗂️ File d'attente des toasts actifs
let toastCounter = 0;
const activeToasts = new Map<number, HTMLDivElement>();

// 🎯 Position par défaut
let defaultPosition: ToastOptions['position'] = 'top-center';

/**
 * 🏗️ Créer le conteneur de toasts si nécessaire
 */
function getOrCreateContainer(position: ToastOptions['position']): HTMLDivElement {
  const containerId = `toast-container-${position}`;
  let container = document.getElementById(containerId) as HTMLDivElement;
  
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.cssText = `
      position: fixed;
      z-index: 999999;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 420px;
      padding: 16px;
    `;
    
    // Position du conteneur
    if (position.includes('top')) {
      container.style.top = '0';
    } else {
      container.style.bottom = '0';
    }
    
    if (position.includes('left')) {
      container.style.left = '0';
      container.style.alignItems = 'flex-start';
    } else if (position.includes('right')) {
      container.style.right = '0';
      container.style.alignItems = 'flex-end';
    } else {
      container.style.left = '50%';
      container.style.transform = 'translateX(-50%)';
      container.style.alignItems = 'center';
    }
    
    document.body.appendChild(container);
  }
  
  return container;
}

/**
 * 🎨 Créer un élément toast
 */
function createToastElement(
  message: string,
  type: ToastType,
  options: ToastOptions
): HTMLDivElement {
  const toast = document.createElement('div');
  const colors = TOAST_COLORS[type];
  
  toast.style.cssText = `
    background: ${colors.bg};
    color: ${colors.text};
    border: 1px solid ${colors.border};
    border-radius: 12px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 300px;
    max-width: 420px;
    pointer-events: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    animation: slideIn 0.2s ease-out;
  `;
  
  // Icône
  const icon = document.createElement('div');
  icon.textContent = TOAST_ICONS[type];
  icon.style.cssText = `
    font-size: 18px;
    flex-shrink: 0;
  `;
  
  // Contenu
  const content = document.createElement('div');
  content.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;
  
  // Message
  const messageEl = document.createElement('div');
  messageEl.textContent = message;
  messageEl.style.cssText = `
    font-weight: 500;
  `;
  content.appendChild(messageEl);
  
  // Description (optionnel)
  if (options.description) {
    const descEl = document.createElement('div');
    descEl.textContent = options.description;
    descEl.style.cssText = `
      font-size: 12px;
      opacity: 0.8;
    `;
    content.appendChild(descEl);
  }
  
  toast.appendChild(icon);
  toast.appendChild(content);
  
  // Bouton d'action (optionnel)
  if (options.action) {
    const actionBtn = document.createElement('button');
    actionBtn.textContent = options.action.label;
    actionBtn.style.cssText = `
      background: transparent;
      border: 1px solid ${colors.border};
      color: ${colors.text};
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      flex-shrink: 0;
    `;
    actionBtn.onclick = options.action.onClick;
    toast.appendChild(actionBtn);
  }
  
  // Bouton de fermeture (optionnel)
  if (options.closeButton !== false) {
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: ${colors.text};
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      flex-shrink: 0;
    `;
    closeBtn.onmouseover = () => { closeBtn.style.opacity = '1'; };
    closeBtn.onmouseout = () => { closeBtn.style.opacity = '0.5'; };
    toast.appendChild(closeBtn);
  }
  
  return toast;
}

/**
 * 📤 Afficher un toast
 */
function showToast(
  message: string,
  type: ToastType = 'info',
  options: ToastOptions = {}
): number {
  // Si un ID est fourni, réutiliser cet ID et fermer l'ancien toast
  let id: number;
  if (options.id !== undefined) {
    id = options.id;
    // Fermer l'ancien toast avec cet ID s'il existe
    const existingToast = activeToasts.get(id);
    if (existingToast && existingToast.parentNode) {
      existingToast.parentNode.removeChild(existingToast);
      activeToasts.delete(id);
    }
  } else {
    id = ++toastCounter;
  }
  
  const position = options.position || defaultPosition;
  const duration = options.duration ?? (type === 'loading' ? Infinity : 3000);
  
  const container = getOrCreateContainer(position);
  const toast = createToastElement(message, type, options);
  
  // Ajouter l'animation CSS si pas déjà présente
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(-20px);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Ajouter au conteneur
  container.appendChild(toast);
  activeToasts.set(id, toast);
  
  // Fonction de fermeture
  const dismiss = () => {
    if (!activeToasts.has(id)) return;
    
    toast.style.animation = 'slideOut 0.2s ease-out';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      activeToasts.delete(id);
      
      // Supprimer le conteneur s'il est vide
      if (container.children.length === 0 && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, 200);
  };
  
  // Clic sur le bouton de fermeture
  const closeBtn = toast.querySelector('button:last-child');
  if (closeBtn) {
    closeBtn.addEventListener('click', dismiss);
  }
  
  // Auto-dismiss
  if (duration !== Infinity) {
    setTimeout(dismiss, duration);
  }
  
  return id;
}

/**
 * 🎯 API publique du toast
 */
export const toast = Object.assign(
  // Fonction par défaut (appel direct: toast('message'))
  (message: string, options?: ToastOptions) => 
    showToast(message, 'info', options),
  
  // Méthodes
  {
    success: (message: string, options?: ToastOptions) => 
      showToast(message, 'success', options),
    
    error: (message: string, options?: ToastOptions) => 
      showToast(message, 'error', options),
    
    info: (message: string, options?: ToastOptions) => 
      showToast(message, 'info', options),
    
    warning: (message: string, options?: ToastOptions) => 
      showToast(message, 'warning', options),
    
    loading: (message: string, options?: ToastOptions) => 
      showToast(message, 'loading', options),
    
    // Toast générique
    message: (message: string, options?: ToastOptions) => 
      showToast(message, 'info', options),
    
    // Fermer un toast spécifique
    dismiss: (id: number) => {
      const toast = activeToasts.get(id);
      if (toast) {
        toast.style.animation = 'slideOut 0.2s ease-out';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
          activeToasts.delete(id);
        }, 200);
      }
    },
    
    // Fermer tous les toasts
    dismissAll: () => {
      activeToasts.forEach((toast, id) => {
        toast.style.animation = 'slideOut 0.2s ease-out';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
          activeToasts.delete(id);
        }, 200);
      });
    }
  }
);

/**
 * 🎨 Composant Toaster (compatible avec sonner API)
 */
export function Toaster(props?: {
  position?: ToastOptions['position'];
  toastOptions?: Partial<ToastOptions>;
}) {
  if (props?.position) {
    defaultPosition = props.position;
  }
  
  // Ce composant est juste pour la compatibilité API
  // Les toasts sont créés dynamiquement via toast.*()\
  return null;
}

// Export par défaut
export default toast;
