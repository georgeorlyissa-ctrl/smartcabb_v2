import { useState } from 'react';

/**
 * Logos des opérateurs Mobile Money.
 * Les clés sont celles utilisées par les sélecteurs de l'app
 * (`mpesa`, `orange_money`, `airtel_money`, `afrimoney`) ; les ids
 * numériques Ejpay (9, 10, 17, 19) sont aussi acceptés.
 */
const OPERATOR_LOGOS: Record<string, string> = {
  mpesa: '/logos/mpesa.png',
  vodacom: '/logos/mpesa.png',
  orange_money: '/logos/orange-money.png',
  orange: '/logos/orange-money.png',
  airtel_money: '/logos/airtel-money.jpg',
  airtel: '/logos/airtel-money.jpg',
  afrimoney: '/logos/logo-afrimoney.png',
  africell: '/logos/logo-afrimoney.png',
  '9': '/logos/mpesa.png',
  '10': '/logos/orange-money.png',
  '17': '/logos/airtel-money.jpg',
  '19': '/logos/logo-afrimoney.png',
};

export function operatorLogo(network: string | number | null | undefined): string | null {
  if (network === null || network === undefined) return null;
  const key = String(network).toLowerCase().replace(/[\s-]/g, '_');
  return OPERATOR_LOGOS[key] ?? null;
}

interface OperatorLogoProps {
  network: string | number | null | undefined;
  /** Nom affiché dans l'attribut `alt` (accessibilité). */
  name?: string;
  className?: string;
  /** Taille en pixels de la hauteur du logo. */
  height?: number;
}

/**
 * Logo d'opérateur sur fond blanc (les logos sources ont des fonds
 * hétérogènes : PNG transparent, JPG blanc, etc.).
 * Si le fichier est introuvable, rien n'est rendu : le nom texte reste visible.
 */
export function OperatorLogo({ network, name, className = '', height = 32 }: OperatorLogoProps) {
  const [failed, setFailed] = useState(false);
  const src = operatorLogo(network);

  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={name ? `Logo ${name}` : 'Logo opérateur'}
      height={height}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-contain bg-white rounded-md ${className}`}
      style={{ height }}
    />
  );
}

export default OperatorLogo;
