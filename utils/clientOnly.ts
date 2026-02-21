/**
 * Utilitaires pour garantir l'exécution côté client uniquement
 * Évite les erreurs "Illegal constructor" en production
 */

/**
 * Vérifie si on est côté client (navigateur)
 */
export function isClient(): boolean {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' &&
         typeof navigator !== 'undefined' &&
         (window as any).__SMARTCABB_CLIENT_READY__ === true;
}

/**
 * Vérifie si on est côté serveur (SSR/Build)
 */
export function isServer(): boolean {
  return !isClient();
}

/**
 * Exécute une fonction uniquement côté client
 * Retourne une valeur par défaut si côté serveur
 */
export function clientOnly<T>(
  clientFn: () => T,
  serverFallback: T
): T {
  if (isClient()) {
    try {
      return clientFn();
    } catch (error) {
      console.error('❌ Erreur dans clientOnly:', error);
      return serverFallback;
    }
  }
  return serverFallback;
}

/**
 * Exécute une fonction asynchrone uniquement côté client
 */
export async function clientOnlyAsync<T>(
  clientFn: () => Promise<T>,
  serverFallback: T
): Promise<T> {
  if (isClient()) {
    try {
      return await clientFn();
    } catch (error) {
      console.error('❌ Erreur dans clientOnlyAsync:', error);
      return serverFallback;
    }
  }
  return serverFallback;
}

/**
 * Wrapper pour les classes qui nécessitent le DOM
 * Crée une instance lazy (seulement quand on y accède)
 */
export function lazyClientClass<T>(
  ClassConstructor: new () => T,
  fallbackInstance?: Partial<T>
): T {
  let instance: T | null = null;
  
  const proxy = new Proxy({} as T, {
    get(target, prop) {
      // Créer l'instance seulement quand on y accède
      if (!instance && isClient()) {
        try {
          instance = new ClassConstructor();
        } catch (error) {
          console.error('❌ Erreur création instance lazy:', error);
          return fallbackInstance?.[prop as keyof T];
        }
      }
      
      if (instance) {
        return instance[prop as keyof T];
      }
      
      return fallbackInstance?.[prop as keyof T];
    }
  });
  
  return proxy;
}

/**
 * Garantit qu'une fonction ne s'exécute que côté client
 * Sinon, log un warning
 */
export function safeClientExec<T extends (...args: any[]) => any>(
  fn: T,
  fnName: string = 'anonymous'
): T {
  return ((...args: any[]) => {
    if (isServer()) {
      console.warn(`⚠️ ${fnName} appelée côté serveur - ignorée`);
      return;
    }
    
    try {
      return fn(...args);
    } catch (error) {
      console.error(`❌ Erreur dans ${fnName}:`, error);
      throw error;
    }
  }) as T;
}

/**
 * Accès sécurisé au localStorage
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    return clientOnly(() => localStorage.getItem(key), null);
  },
  
  setItem(key: string, value: string): void {
    clientOnly(() => localStorage.setItem(key, value), undefined);
  },
  
  removeItem(key: string): void {
    clientOnly(() => localStorage.removeItem(key), undefined);
  },
  
  clear(): void {
    clientOnly(() => localStorage.clear(), undefined);
  },
  
  key(index: number): string | null {
    return clientOnly(() => localStorage.key(index), null);
  },
  
  get length(): number {
    return clientOnly(() => localStorage.length, 0);
  }
};

/**
 * Accès sécurisé au sessionStorage
 */
export const safeSessionStorage = {
  getItem(key: string): string | null {
    return clientOnly(() => sessionStorage.getItem(key), null);
  },
  
  setItem(key: string, value: string): void {
    clientOnly(() => sessionStorage.setItem(key, value), undefined);
  },
  
  removeItem(key: string): void {
    clientOnly(() => sessionStorage.removeItem(key), undefined);
  },
  
  clear(): void {
    clientOnly(() => sessionStorage.clear(), undefined);
  }
};

/**
 * Wrapper pour window.location
 */
export const safeLocation = {
  get href(): string {
    return clientOnly(() => window.location.href, '');
  },
  
  get pathname(): string {
    return clientOnly(() => window.location.pathname, '/');
  },
  
  get search(): string {
    return clientOnly(() => window.location.search, '');
  },
  
  get hash(): string {
    return clientOnly(() => window.location.hash, '');
  },
  
  reload(): void {
    clientOnly(() => window.location.reload(), undefined);
  },
  
  assign(url: string): void {
    clientOnly(() => window.location.assign(url), undefined);
  }
};

/**
 * Wrapper pour navigator
 */
export const safeNavigator = {
  get userAgent(): string {
    return clientOnly(() => navigator.userAgent, '');
  },
  
  get language(): string {
    return clientOnly(() => navigator.language, 'fr');
  },
  
  get onLine(): boolean {
    return clientOnly(() => navigator.onLine, true);
  }
};