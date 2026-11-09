/**
 * SIMPLE ROUTER v517.12 - FIX ROUTES IMBRIQUÉES
 * Router minimal sans dépendances pour contourner les bugs de react-router
 * Basé sur window.location et Context API
 * 🔥 FIX: Support correct des routes imbriquées avec wildcard
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface RouterContextType {
  pathname: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  params: Record<string, string>;
  basePath?: string; // Nouveau: pour gérer les routes imbriquées
}

const RouterContext = createContext<RouterContextType | null>(null);

export function Router({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [params, setParams] = useState<Record<string, string>>({});

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    // ⚠️ Le chemin d'état sert au matching des routes : il ne doit jamais
    // contenir la query string (?screen=...) ni le hash, sinon `/app/passenger?screen=map`
    // ne matcherait pas `/app/passenger/*` et retomberait sur `/app/*`.
    // L'URL complète reste disponible via window.location.search.
    setPathname(path.split('#')[0].split('?')[0]);
  };

  return (
    <RouterContext.Provider value={{ pathname, navigate, params }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a Router');
  }
  return context;
}

export function useNavigate() {
  const { navigate } = useRouter();
  return navigate;
}

export function useLocation() {
  const { pathname } = useRouter();
  return { pathname };
}

export function useParams() {
  const { params } = useRouter();
  return params;
}

interface RouteProps {
  path: string;
  element: ReactNode;
}

export function Route({ path, element }: RouteProps) {
  const { pathname, basePath } = useRouter();
  
  // Utiliser le basePath si disponible (pour routes imbriquées)
  const effectiveBasePath = basePath || '';
  const fullPath = effectiveBasePath + path;
  
  // Exact match
  if (fullPath === pathname) {
    return <>{element}</>;
  }
  
  // Wildcard match (path/*)
  if (fullPath.endsWith('/*')) {
    const basePathToMatch = fullPath.slice(0, -2);
    if (pathname === basePathToMatch || pathname.startsWith(basePathToMatch + '/')) {
      return <>{element}</>;
    }
  }
  
  return null;
}

export function Routes({ children }: { children: ReactNode }) {
  const { pathname, basePath } = useRouter();
  
  // Trouver la première route qui match
  const childrenArray = React.Children.toArray(children);
  
  for (const child of childrenArray) {
    if (!React.isValidElement(child)) continue;
    
    const { path } = child.props;
    
    // Utiliser le basePath si disponible
    const effectiveBasePath = basePath || '';
    const fullPath = effectiveBasePath + path;
    
    // Exact match
    if (fullPath === pathname) {
      return <>{child}</>;
    }
    
    // Wildcard match
    if (path && fullPath.endsWith('/*')) {
      const basePathToMatch = fullPath.slice(0, -2);
      if (pathname === basePathToMatch || pathname.startsWith(basePathToMatch + '/')) {
        return <>{child}</>;
      }
    }
  }
  
  return null;
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const { navigate, pathname } = useRouter();
  
  useEffect(() => {
    // Éviter les redirections en boucle
    if (pathname === to) {
      return;
    }
    
    console.log(`🔀 Navigate: ${pathname} → ${to} (replace: ${replace})`);
    
    // Utiliser setTimeout pour éviter les problèmes de synchronisation
    const timer = setTimeout(() => {
      if (replace) {
        window.history.replaceState({}, '', to);
        // Forcer la mise à jour du pathname
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        navigate(to);
      }
    }, 0);
    
    return () => clearTimeout(timer);
  }, [to, replace, navigate, pathname]);
  
  return null;
}

/**
 * Link — navigation interne.
 * ⚠️ Toutes les props natives d'ancre (style, title, aria-*, target…) sont
 * transmises à <a>. Auparavant seul `className` l'était : les styles inline
 * (alignement du logo, tailles de boutons) étaient silencieusement perdus.
 */
interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, className, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick?.(e);
    navigate(to);
  };
  
  return (
    <a href={to} onClick={handleClick} className={className} {...rest}>
      {children}
    </a>
  );
}