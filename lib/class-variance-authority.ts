/**
 * 🎨 CLASS VARIANCE AUTHORITY (CVA) - IMPLÉMENTATION LOCALE
 * 
 * Alternative standalone à la librairie class-variance-authority
 * pour éviter les dépendances externes et les erreurs de build
 * 
 * ⚠️ IMPORTANT: SmartCabb utilise une implémentation standalone
 * sans dépendances externes pour garantir la stabilité du build
 * 
 * @version 1.0.0
 * @date 2026-01-21
 */

type ClassValue = string | number | boolean | undefined | null;
type ClassArray = ClassValue[];
type ClassDictionary = Record<string, any>;
type ClassProp = ClassValue | ClassArray | ClassDictionary;

/**
 * Fonction utilitaire pour combiner des classes
 */
function clsx(...classes: ClassProp[]): string {
  const result: string[] = [];

  for (const cls of classes) {
    if (!cls) continue;

    if (typeof cls === 'string' || typeof cls === 'number') {
      result.push(String(cls));
    } else if (Array.isArray(cls)) {
      const inner = clsx(...cls);
      if (inner) result.push(inner);
    } else if (typeof cls === 'object') {
      for (const key in cls) {
        if (cls[key]) result.push(key);
      }
    }
  }

  return result.join(' ');
}

/**
 * Type pour les variants
 */
type VariantConfig = Record<string, Record<string, ClassValue>>;

type CVAConfig<V extends VariantConfig> = {
  variants?: V;
  defaultVariants?: Partial<{
    [K in keyof V]: keyof V[K];
  }>;
  compoundVariants?: Array<
    Partial<{
      [K in keyof V]: keyof V[K];
    }> & {
      class?: ClassValue;
      className?: ClassValue;
    }
  >;
};

/**
 * Type pour les props de variants
 */
export type VariantProps<T extends (...args: any) => any> = Partial<
  Omit<Parameters<T>[0], 'class' | 'className'>
>;

/**
 * Fonction principale CVA
 */
export function cva<V extends VariantConfig>(
  base?: ClassValue,
  config?: CVAConfig<V>
) {
  return (props?: {
    [K in keyof V]?: keyof V[K];
  } & {
    class?: ClassValue;
    className?: ClassValue;
  }) => {
    const classes: ClassValue[] = [base];

    if (!config) {
      return clsx(...classes, props?.class, props?.className);
    }

    // Ajouter les variants
    if (config.variants && props) {
      for (const variantKey in config.variants) {
        const variantValue = props[variantKey as keyof typeof props];
        const variantClasses = config.variants[variantKey];

        if (variantValue && variantClasses) {
          classes.push(variantClasses[variantValue as keyof typeof variantClasses]);
        }
      }
    }

    // Ajouter les default variants si pas de props
    if (config.defaultVariants && (!props || Object.keys(props).length === 0)) {
      for (const variantKey in config.defaultVariants) {
        const defaultValue = config.defaultVariants[variantKey];
        const variantClasses = config.variants?.[variantKey];

        if (defaultValue && variantClasses) {
          classes.push(variantClasses[defaultValue as keyof typeof variantClasses]);
        }
      }
    }

    // Ajouter les compound variants
    if (config.compoundVariants && props) {
      for (const compound of config.compoundVariants) {
        let matches = true;

        for (const key in compound) {
          if (key === 'class' || key === 'className') continue;

          if (props[key as keyof typeof props] !== compound[key as keyof typeof compound]) {
            matches = false;
            break;
          }
        }

        if (matches) {
          classes.push(compound.class || compound.className);
        }
      }
    }

    // Ajouter les classes custom
    classes.push(props?.class, props?.className);

    return clsx(...classes);
  };
}

// Export du type pour compatibilité
export type { VariantConfig };
