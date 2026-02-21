/**
 * 🎯 RADIX UI SLOT - IMPLÉMENTATION LOCALE
 * 
 * Alternative standalone à @radix-ui/react-slot
 * pour éviter les dépendances externes et les erreurs de build
 * 
 * ⚠️ IMPORTANT: SmartCabb utilise une implémentation standalone
 * sans dépendances externes pour garantir la stabilité du build
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

import * as React from 'react';

/**
 * Slot component permet de fusionner les props avec l'enfant
 * Utilisé principalement dans le composant Button avec asChild
 */
export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

/**
 * Merge les refs
 */
function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (value: T) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T>).current = value;
      }
    });
  };
}

/**
 * Merge les props de deux éléments
 */
function mergeProps(slotProps: any, childProps: any) {
  const merged = { ...childProps };

  for (const key in slotProps) {
    const slotValue = slotProps[key];
    const childValue = childProps[key];

    // Merger les event handlers
    if (/^on[A-Z]/.test(key)) {
      if (slotValue && childValue) {
        merged[key] = (...args: any[]) => {
          childValue(...args);
          slotValue(...args);
        };
      } else if (slotValue) {
        merged[key] = slotValue;
      }
    }
    // Merger className
    else if (key === 'className') {
      merged[key] = [slotValue, childValue].filter(Boolean).join(' ');
    }
    // Merger style
    else if (key === 'style') {
      merged[key] = { ...slotValue, ...childValue };
    }
    // Pour les autres props, prendre la valeur du slot
    else {
      merged[key] = slotValue !== undefined ? slotValue : childValue;
    }
  }

  return merged;
}

/**
 * Composant Slot
 * 
 * Permet de passer toutes les props au premier enfant React element
 * Utile pour des composants comme Button avec la prop asChild
 */
export const Slot = React.forwardRef<HTMLElement, SlotProps>(
  (props, forwardedRef) => {
    const { children, ...slotProps } = props;

    if (!React.isValidElement(children)) {
      return null;
    }

    // Merger les refs
    const childRef = (children as any).ref;
    const ref = forwardedRef ? mergeRefs(forwardedRef, childRef) : childRef;

    // Merger les props
    const mergedProps = mergeProps(slotProps, children.props);

    // Cloner l'enfant avec les props mergées
    return React.cloneElement(children, {
      ...mergedProps,
      ref,
    } as any);
  }
);

Slot.displayName = 'Slot';

/**
 * Hook pour utiliser Slot de manière conditionnelle
 */
export function useSlot(
  asChild: boolean = false
): [React.ElementType, boolean] {
  return asChild ? [Slot, true] : ['button', false];
}
